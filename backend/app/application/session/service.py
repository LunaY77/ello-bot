"""Session application service."""

from __future__ import annotations

from datetime import timedelta

from app.core import (
    AuthException,
    BusinessException,
    CommonErrorCode,
    generate_opaque_token,
    hash_password,
    hash_token,
    settings,
    utc_now,
    verify_password,
)
from app.domain.session import (
    AccessSessionSnapshot,
    AuthenticatedSessionState,
    SessionErrorCode,
    SessionTokens,
)
from app.domain.user import UserErrorCode
from app.infra.cache.redis import AccessSessionSnapshotStore
from app.infra.db.uow import SqlAlchemyUnitOfWorkFactory


class SessionService:
    """Coordinate registration, login, token rotation, and logout flows."""

    def __init__(
        self,
        *,
        settings=settings,
        uow_factory: SqlAlchemyUnitOfWorkFactory,
        access_session_store: AccessSessionSnapshotStore,
    ) -> None:
        """Store infrastructure dependencies required for session use cases.

        Args:
            settings: Process-wide application settings.
            uow_factory: Factory creating per-use-case units of work.
            access_session_store: Redis-backed access-session snapshot store.
        """
        self._settings = settings
        self._uow_factory = uow_factory
        self._access_session_store = access_session_store

    async def register(
        self,
        *,
        username: str,
        password: str,
        display_name: str | None,
        user_agent: str,
        ip_address: str,
    ) -> AuthenticatedSessionState:
        """Register a new user and issue the initial auth session.

        Args:
            username: Requested username.
            password: Plaintext password supplied by the client.
            display_name: Optional display name override.
            user_agent: User agent captured from the HTTP request.
            ip_address: Client IP captured from the HTTP request.

        Returns:
            Authenticated session state for the newly created user.
        """
        if not self._settings.auth.REGISTRATION_ENABLED:
            raise BusinessException(UserErrorCode.REGISTRATION_DISABLED)

        async with self._uow_factory() as uow:
            assert uow.users is not None
            assert uow.sessions is not None
            existing = await uow.users.get_by_username(username)
            if existing is not None:
                raise BusinessException(UserErrorCode.USERNAME_EXISTS)

            user = await uow.users.create(
                username=username,
                password_hash=hash_password(password),
                display_name=display_name or username,
            )
            settings_state = await uow.users.ensure_settings(user.id)
            user.attach_settings(settings_state)
            state = await self._issue_session(
                uow=uow,
                user=user,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            await uow.commit()
            return state

    async def login(
        self,
        *,
        username: str,
        password: str,
        user_agent: str,
        ip_address: str,
    ) -> AuthenticatedSessionState:
        """Authenticate an existing user and issue a fresh auth session.

        Args:
            username: Username supplied by the client.
            password: Plaintext password supplied by the client.
            user_agent: User agent captured from the HTTP request.
            ip_address: Client IP captured from the HTTP request.

        Returns:
            Authenticated session state for the logged-in user.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_username(username)
            if (
                user is None
                or not user.is_active
                or not verify_password(password, user.password_hash)
            ):
                raise AuthException(SessionErrorCode.INVALID_CREDENTIALS)
            settings_state = await uow.users.ensure_settings(user.id)
            user.attach_settings(settings_state)
            state = await self._issue_session(
                uow=uow,
                user=user,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            await uow.commit()
            return state

    async def refresh(
        self,
        *,
        refresh_token: str,
        user_agent: str,
        ip_address: str,
    ) -> AuthenticatedSessionState:
        """Rotate session tokens using a valid refresh token.

        Args:
            refresh_token: Opaque refresh token supplied by the client.
            user_agent: User agent captured from the HTTP request.
            ip_address: Client IP captured from the HTTP request.

        Returns:
            Authenticated session state containing rotated tokens.
        """
        refresh_hash = hash_token(refresh_token)
        async with self._uow_factory() as uow:
            assert uow.sessions is not None
            state = await uow.sessions.get_with_user_by_refresh_token_hash(refresh_hash)
            if state is None:
                raise AuthException(CommonErrorCode.TOKEN_INVALID)
            session, user = state
            if session.revoked_at is not None:
                raise AuthException(CommonErrorCode.TOKEN_INVALID)
            if session.expires_at <= utc_now():
                raise AuthException(CommonErrorCode.TOKEN_EXPIRED)

            tokens = SessionTokens(
                access_token=generate_opaque_token(),
                refresh_token=generate_opaque_token(),
            )
            # Remove the old access snapshot before rotating so stale tokens stop authenticating immediately.
            await self._access_session_store.delete(token_hash=session.access_token_hash)
            rotated = await uow.sessions.rotate_tokens(
                session_id=session.id,
                access_token_hash=hash_token(tokens.access_token),
                refresh_token_hash=hash_token(tokens.refresh_token),
                expires_at=utc_now() + timedelta(days=self._settings.auth.REFRESH_TOKEN_TTL_DAYS),
                last_seen_at=utc_now(),
            )
            await self._access_session_store.put(
                token_hash=rotated.access_token_hash,
                snapshot=AccessSessionSnapshot(
                    session_id=rotated.id,
                    user_id=user.id,
                    username=user.username,
                    display_name=user.display_name,
                    session_version=user.session_version,
                ),
                ttl_seconds=self._settings.auth.ACCESS_TOKEN_TTL_SECONDS,
            )
            await uow.commit()
            return AuthenticatedSessionState(
                user=user,
                settings=user.settings,
                tokens=tokens,
            )

    async def logout(self, *, access_token: str) -> None:
        """Revoke a single access token and clear its Redis snapshot.

        Args:
            access_token: Opaque access token to revoke.
        """
        access_hash = hash_token(access_token)
        async with self._uow_factory() as uow:
            assert uow.sessions is not None
            session = await uow.sessions.get_by_access_token_hash(access_hash)
            if session is not None:
                await uow.sessions.revoke(session_id=session.id, revoked_at=utc_now())
            await self._access_session_store.delete(token_hash=access_hash)
            await uow.commit()

    async def logout_all(self, *, user_id: int) -> None:
        """Revoke every active session for a user and invalidate snapshots.

        Args:
            user_id: Identifier of the user whose sessions should be revoked.
        """
        async with self._uow_factory() as uow:
            assert uow.sessions is not None
            assert uow.users is not None
            revoked_hashes = await uow.sessions.revoke_all_for_user(
                user_id=user_id,
                revoked_at=utc_now(),
            )
            user = await uow.users.get_by_id(user_id)
            if user is not None:
                user.session_version += 1
                await uow.users.update(user)
            for access_hash in revoked_hashes:
                await self._access_session_store.delete(token_hash=access_hash)
            await uow.commit()

    async def list_sessions(self, *, user_id: int):
        """Return active sessions for a user.

        Args:
            user_id: Identifier of the user whose sessions should be listed.

        Returns:
            Active auth sessions for the user.
        """
        async with self._uow_factory() as uow:
            assert uow.sessions is not None
            return await uow.sessions.list_active_for_user(user_id=user_id)

    async def _issue_session(
        self,
        *,
        uow,
        user,
        user_agent: str,
        ip_address: str,
    ) -> AuthenticatedSessionState:
        """Persist a new session and cache its access-token snapshot.

        Args:
            uow: Active unit of work coordinating repository writes.
            user: User receiving the new session.
            user_agent: User agent captured from the HTTP request.
            ip_address: Client IP captured from the HTTP request.

        Returns:
            Authenticated session state containing the newly issued tokens.
        """
        assert uow.sessions is not None
        tokens = SessionTokens(
            access_token=generate_opaque_token(),
            refresh_token=generate_opaque_token(),
        )
        session = await uow.sessions.create(
            user_id=user.id,
            access_token_hash=hash_token(tokens.access_token),
            refresh_token_hash=hash_token(tokens.refresh_token),
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=utc_now() + timedelta(days=self._settings.auth.REFRESH_TOKEN_TTL_DAYS),
            last_seen_at=utc_now(),
        )
        # The access-token snapshot lets protected routes rebuild auth context without reloading the user.
        await self._access_session_store.put(
            token_hash=session.access_token_hash,
            snapshot=AccessSessionSnapshot(
                session_id=session.id,
                user_id=user.id,
                username=user.username,
                display_name=user.display_name,
                session_version=user.session_version,
            ),
            ttl_seconds=self._settings.auth.ACCESS_TOKEN_TTL_SECONDS,
        )
        return AuthenticatedSessionState(
            user=user,
            settings=user.settings,
            tokens=tokens,
        )
