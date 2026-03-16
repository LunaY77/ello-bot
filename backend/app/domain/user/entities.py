"""Domain entities for the user bounded context."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.core.constants import (
    DEFAULT_USER_AVATAR_URL,
    DEFAULT_USER_LOCALE,
    DEFAULT_USER_MODEL,
    DEFAULT_USER_SYSTEM_PROMPT,
    DEFAULT_USER_THEME,
)


@dataclass(slots=True)
class UserSettings:
    """Domain value object holding per-user preference settings."""

    locale: str = DEFAULT_USER_LOCALE
    theme: str = DEFAULT_USER_THEME
    system_prompt: str = DEFAULT_USER_SYSTEM_PROMPT
    default_model: str = DEFAULT_USER_MODEL


@dataclass(slots=True)
class User:
    """Domain entity describing a single application user."""

    username: str
    password_hash: str
    display_name: str
    id: int | None = None
    avatar_url: str = DEFAULT_USER_AVATAR_URL
    bio: str = ""
    timezone: str | None = None
    is_active: bool = True
    session_version: int = 1
    created_at: datetime | None = None
    updated_at: datetime | None = None
    settings: UserSettings | None = None

    def update_profile(
        self,
        *,
        display_name: str | None = None,
        bio: str | None = None,
        timezone: str | None = None,
    ) -> None:
        """Apply partial profile updates to the user entity.

        Args:
            display_name: Optional replacement display name.
            bio: Optional replacement profile bio.
            timezone: Optional replacement timezone.
        """
        if display_name is not None:
            self.display_name = display_name
        if bio is not None:
            self.bio = bio
        if timezone is not None:
            self.timezone = timezone

    def attach_settings(self, settings: UserSettings) -> None:
        """Attach the current settings object to the user entity.

        Args:
            settings: User settings associated with the user.
        """
        self.settings = settings


@dataclass(slots=True)
class CurrentUserState:
    """Current authenticated user plus resolved settings."""

    user: User
    settings: UserSettings


@dataclass(slots=True)
class BootstrapAdminState:
    """Result of ensuring the bootstrap admin account exists."""

    initialized: bool
    user: User
    settings: UserSettings
