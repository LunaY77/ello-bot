"""Session repository implementation."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.session.entities import AuthSession
from app.domain.user.entities import User
from app.infra.db.models.session import AuthSessionModel
from app.infra.db.models.user import UserModel
from app.infra.db.repositories.user_repo import _to_user


def _to_session(model: AuthSessionModel) -> AuthSession:
    """Map a SQLAlchemy auth-session model to the domain entity.

    Args:
        model: SQLAlchemy auth-session model.

    Returns:
        Domain auth-session entity.
    """
    return AuthSession(
        id=model.id,
        user_id=model.user_id,
        access_token_hash=model.access_token_hash,
        refresh_token_hash=model.refresh_token_hash,
        user_agent=model.user_agent,
        ip_address=model.ip_address,
        expires_at=model.expires_at,
        revoked_at=model.revoked_at,
        last_seen_at=model.last_seen_at,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class SqlAlchemySessionRepository:
    """Repository that persists auth sessions with SQLAlchemy."""

    def __init__(self, session: AsyncSession) -> None:
        """Bind the SQLAlchemy session used by the repository.

        Args:
            session: SQLAlchemy async session scoped to the current unit of work.
        """
        self._session = session

    async def create(
        self,
        *,
        user_id: int,
        access_token_hash: str,
        refresh_token_hash: str,
        user_agent: str,
        ip_address: str,
        expires_at: datetime,
        last_seen_at: datetime,
    ) -> AuthSession:
        """Create and persist a new auth session.

        Args:
            user_id: Owning user identifier.
            access_token_hash: Hashed access token.
            refresh_token_hash: Hashed refresh token.
            user_agent: User agent captured from the client.
            ip_address: Client IP captured from the request.
            expires_at: Refresh-token expiration timestamp.
            last_seen_at: Last-seen timestamp for the new session.

        Returns:
            Persisted auth-session entity.
        """
        model = AuthSessionModel(
            user_id=user_id,
            access_token_hash=access_token_hash,
            refresh_token_hash=refresh_token_hash,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=expires_at,
            last_seen_at=last_seen_at,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _to_session(model)

    async def get_by_access_token_hash(self, token_hash: str) -> AuthSession | None:
        """Load a session by its hashed access token.

        Args:
            token_hash: Hashed access token.

        Returns:
            Matching auth-session entity when present, otherwise None.
        """
        stmt = select(AuthSessionModel).where(AuthSessionModel.access_token_hash == token_hash)
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_session(model) if model is not None else None

    async def get_with_user_by_refresh_token_hash(
        self,
        token_hash: str,
    ) -> tuple[AuthSession, User] | None:
        """Load a session and its user by hashed refresh token.

        Args:
            token_hash: Hashed refresh token.

        Returns:
            Session and user pair when present, otherwise None.
        """
        stmt = (
            select(AuthSessionModel)
            .options(selectinload(AuthSessionModel.user).selectinload(UserModel.settings))
            .where(AuthSessionModel.refresh_token_hash == token_hash)
        )
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        if model is None:
            return None
        return _to_session(model), _to_user(model.user)

    async def rotate_tokens(
        self,
        *,
        session_id: int,
        access_token_hash: str,
        refresh_token_hash: str,
        expires_at: datetime,
        last_seen_at: datetime,
    ) -> AuthSession:
        """Replace the token hashes and timing fields for an existing session.

        Args:
            session_id: Identifier of the session to rotate.
            access_token_hash: New hashed access token.
            refresh_token_hash: New hashed refresh token.
            expires_at: New refresh-token expiration timestamp.
            last_seen_at: Timestamp recorded for the rotation event.

        Returns:
            Updated auth-session entity.
        """
        stmt = select(AuthSessionModel).where(AuthSessionModel.id == session_id)
        model = (await self._session.execute(stmt)).scalar_one()
        model.access_token_hash = access_token_hash
        model.refresh_token_hash = refresh_token_hash
        model.expires_at = expires_at
        model.last_seen_at = last_seen_at
        await self._session.flush()
        return _to_session(model)

    async def revoke(self, *, session_id: int, revoked_at: datetime) -> None:
        """Revoke a single session when it still exists.

        Args:
            session_id: Identifier of the session to revoke.
            revoked_at: Timestamp recorded for the revocation.
        """
        stmt = select(AuthSessionModel).where(AuthSessionModel.id == session_id)
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        if model is None:
            return
        model.revoked_at = revoked_at
        await self._session.flush()

    async def revoke_all_for_user(self, *, user_id: int, revoked_at: datetime) -> list[str]:
        """Revoke every active session for a user.

        Args:
            user_id: Identifier of the user whose sessions should be revoked.
            revoked_at: Timestamp recorded for the revocation.

        Returns:
            Access-token hashes that were revoked.
        """
        stmt = select(AuthSessionModel).where(
            AuthSessionModel.user_id == user_id,
            AuthSessionModel.revoked_at.is_(None),
        )
        models = (await self._session.execute(stmt)).scalars().all()
        hashes: list[str] = []
        for model in models:
            model.revoked_at = revoked_at
            hashes.append(model.access_token_hash)
        await self._session.flush()
        return hashes

    async def list_active_for_user(self, *, user_id: int) -> list[AuthSession]:
        """List non-revoked sessions for a user ordered by newest first.

        Args:
            user_id: Identifier of the user whose sessions should be listed.

        Returns:
            Active auth-session entities for the user.
        """
        stmt = (
            select(AuthSessionModel)
            .where(
                AuthSessionModel.user_id == user_id,
                AuthSessionModel.revoked_at.is_(None),
            )
            .order_by(AuthSessionModel.created_at.desc())
        )
        models = (await self._session.execute(stmt)).scalars().all()
        return [_to_session(model) for model in models]
