"""User application service."""

from __future__ import annotations

from app.core import BusinessException, hash_password, settings
from app.domain.user import BootstrapAdminState, CurrentUserState, UserErrorCode
from app.infra.db.uow import SqlAlchemyUnitOfWorkFactory


class UserService:
    """Coordinate bootstrap-admin and personal user/profile use cases."""

    def __init__(
        self,
        *,
        settings=settings,
        uow_factory: SqlAlchemyUnitOfWorkFactory,
        access_session_store=None,
    ) -> None:
        """Store infrastructure dependencies required for user use cases.

        Args:
            settings: Process-wide application settings.
            uow_factory: Factory creating per-use-case units of work.
            access_session_store: Reserved access-session store dependency for future user flows.
        """
        self._settings = settings
        self._uow_factory = uow_factory
        self._access_session_store = access_session_store

    async def ensure_bootstrap_admin(self) -> BootstrapAdminState:
        """Create or repair the bootstrap admin account from configuration.

        Returns:
            Bootstrap-admin state describing whether the account was newly created.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_username(self._settings.bootstrap.ADMIN_USERNAME)
            created = user is None
            password_hash = hash_password(
                self._settings.bootstrap.resolved_admin_password(debug=self._settings.DEBUG)
            )

            if user is None:
                user = await uow.users.create(
                    username=self._settings.bootstrap.ADMIN_USERNAME,
                    password_hash=password_hash,
                    display_name=self._settings.bootstrap.ADMIN_DISPLAY_NAME,
                )
            else:
                # Startup repairs the bootstrap account so credentials and profile stay aligned with config.
                user.password_hash = password_hash
                user.display_name = self._settings.bootstrap.ADMIN_DISPLAY_NAME
                user.is_active = True
                user = await uow.users.update(user)

            settings_state = await uow.users.ensure_settings(user.id)
            user.attach_settings(settings_state)
            await uow.commit()
            return BootstrapAdminState(
                initialized=created,
                user=user,
                settings=settings_state,
            )

    async def get_current_user(self, *, user_id: int) -> CurrentUserState:
        """Load the current user together with their settings.

        Args:
            user_id: Identifier of the user to load.

        Returns:
            Current-user state containing the user and settings objects.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_id(user_id)
            if user is None:
                raise BusinessException(UserErrorCode.USER_NOT_FOUND)
            settings_state = await uow.users.ensure_settings(user_id)
            user.attach_settings(settings_state)
            return CurrentUserState(user=user, settings=settings_state)

    async def get_profile(self, *, user_id: int):
        """Load just the profile portion of the current user state.

        Args:
            user_id: Identifier of the user to load.

        Returns:
            User entity for the requested profile.
        """
        return (await self.get_current_user(user_id=user_id)).user

    async def update_profile(
        self,
        *,
        user_id: int,
        display_name: str | None,
        bio: str | None,
        timezone: str | None,
    ):
        """Update mutable profile fields for the user.

        Args:
            user_id: Identifier of the user to update.
            display_name: Optional replacement display name.
            bio: Optional replacement profile bio.
            timezone: Optional replacement timezone.

        Returns:
            Updated user entity.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_id(user_id)
            if user is None:
                raise BusinessException(UserErrorCode.USER_NOT_FOUND)
            user.update_profile(display_name=display_name, bio=bio, timezone=timezone)
            user = await uow.users.update(user)
            await uow.commit()
            return user

    async def get_settings(self, *, user_id: int):
        """Load the persisted settings for a user.

        Args:
            user_id: Identifier of the user whose settings should be loaded.

        Returns:
            User settings object.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_id(user_id)
            if user is None:
                raise BusinessException(UserErrorCode.USER_NOT_FOUND)
            return await uow.users.ensure_settings(user_id)

    async def update_settings(
        self,
        *,
        user_id: int,
        locale: str | None,
        theme: str | None,
        system_prompt: str | None,
        default_model: str | None,
    ):
        """Update persisted user settings.

        Args:
            user_id: Identifier of the user to update.
            locale: Optional locale override.
            theme: Optional theme override.
            system_prompt: Optional system prompt override.
            default_model: Optional default model override.

        Returns:
            Updated user settings object.
        """
        async with self._uow_factory() as uow:
            assert uow.users is not None
            user = await uow.users.get_by_id(user_id)
            if user is None:
                raise BusinessException(UserErrorCode.USER_NOT_FOUND)
            settings_state = await uow.users.update_settings(
                user_id=user_id,
                locale=locale,
                theme=theme,
                system_prompt=system_prompt,
                default_model=default_model,
            )
            await uow.commit()
            return settings_state
