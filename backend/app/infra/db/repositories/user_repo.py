"""User repository implementation."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import DEFAULT_USER_AVATAR_URL
from app.domain.user.entities import User, UserSettings
from app.infra.db.models.user import UserModel, UserSettingsModel


def _to_settings(model: UserSettingsModel) -> UserSettings:
    """Map a SQLAlchemy user-settings model to the domain object.

    Args:
        model: SQLAlchemy user-settings model.

    Returns:
        Domain user-settings object.
    """
    return UserSettings(
        locale=model.locale,
        theme=model.theme,
        system_prompt=model.system_prompt,
        default_model=model.default_model,
    )


def _to_user(model: UserModel) -> User:
    """Map a SQLAlchemy user model to the domain entity.

    Args:
        model: SQLAlchemy user model.

    Returns:
        Domain user entity.
    """
    settings_model = model.__dict__.get("settings")
    settings = _to_settings(settings_model) if settings_model is not None else None
    return User(
        id=model.id,
        username=model.username,
        password_hash=model.password_hash,
        display_name=model.display_name,
        avatar_url=model.avatar_url,
        bio=model.bio,
        timezone=model.timezone,
        is_active=model.is_active,
        session_version=model.session_version,
        created_at=model.created_at,
        updated_at=model.updated_at,
        settings=settings,
    )


class SqlAlchemyUserRepository:
    """Repository that persists users and user settings with SQLAlchemy."""

    def __init__(self, session: AsyncSession) -> None:
        """Bind the SQLAlchemy session used by the repository.

        Args:
            session: SQLAlchemy async session scoped to the current unit of work.
        """
        self._session = session

    async def get_by_id(self, user_id: int) -> User | None:
        """Load a user by identifier with settings eager-loaded.

        Args:
            user_id: Identifier of the user to load.

        Returns:
            Matching user entity when present, otherwise None.
        """
        stmt = (
            select(UserModel)
            .options(selectinload(UserModel.settings))
            .where(UserModel.id == user_id)
        )
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_user(model) if model is not None else None

    async def get_by_username(self, username: str) -> User | None:
        """Load a user by username with settings eager-loaded.

        Args:
            username: Username to load.

        Returns:
            Matching user entity when present, otherwise None.
        """
        stmt = (
            select(UserModel)
            .options(selectinload(UserModel.settings))
            .where(UserModel.username == username)
        )
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        return _to_user(model) if model is not None else None

    async def create(
        self,
        *,
        username: str,
        password_hash: str,
        display_name: str,
    ) -> User:
        """Create and persist a new user account.

        Args:
            username: Username for the new account.
            password_hash: Stored password hash.
            display_name: Initial display name.

        Returns:
            Persisted user entity.
        """
        model = UserModel(
            username=username,
            password_hash=password_hash,
            display_name=display_name,
            avatar_url=DEFAULT_USER_AVATAR_URL,
            is_active=True,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return _to_user(model)

    async def update(self, user: User) -> User:
        """Persist mutable user fields back to the database.

        Args:
            user: Domain user carrying the desired field values.

        Returns:
            Updated user entity.
        """
        stmt = (
            select(UserModel)
            .options(selectinload(UserModel.settings))
            .where(UserModel.id == user.id)
        )
        model = (await self._session.execute(stmt)).scalar_one()
        model.password_hash = user.password_hash
        model.display_name = user.display_name
        model.avatar_url = user.avatar_url
        model.bio = user.bio
        model.timezone = user.timezone
        model.is_active = user.is_active
        model.session_version = user.session_version
        await self._session.flush()
        return _to_user(model)

    async def ensure_settings(self, user_id: int) -> UserSettings:
        """Load user settings, creating the row lazily when missing.

        Args:
            user_id: Identifier of the user whose settings should exist.

        Returns:
            Persisted user-settings object.
        """
        stmt = select(UserSettingsModel).where(UserSettingsModel.user_id == user_id)
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        if model is None:
            # Settings rows are created on demand so bootstrap and login flows need no separate initialization step.
            model = UserSettingsModel(user_id=user_id)
            self._session.add(model)
            await self._session.flush()
            await self._session.refresh(model)
        return _to_settings(model)

    async def update_settings(
        self,
        *,
        user_id: int,
        locale: str | None = None,
        theme: str | None = None,
        system_prompt: str | None = None,
        default_model: str | None = None,
    ) -> UserSettings:
        """Persist partial updates to user settings.

        Args:
            user_id: Identifier of the user whose settings should be updated.
            locale: Optional locale override.
            theme: Optional theme override.
            system_prompt: Optional system prompt override.
            default_model: Optional default model override.

        Returns:
            Updated user-settings object.
        """
        stmt = select(UserSettingsModel).where(UserSettingsModel.user_id == user_id)
        model = (await self._session.execute(stmt)).scalar_one_or_none()
        if model is None:
            model = UserSettingsModel(user_id=user_id)
            self._session.add(model)
            await self._session.flush()
        if locale is not None:
            model.locale = locale
        if theme is not None:
            model.theme = theme
        if system_prompt is not None:
            model.system_prompt = system_prompt
        if default_model is not None:
            model.default_model = default_model
        await self._session.flush()
        await self._session.refresh(model)
        return _to_settings(model)
