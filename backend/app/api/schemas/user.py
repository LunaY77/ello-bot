"""User-facing request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.api.schemas.common import ApiModel
from app.domain.user.entities import BootstrapAdminState, CurrentUserState, User, UserSettings

DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]
OptionalDisplayName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=128),
]
OptionalTimeZone = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=64),
]


class UpdateUserProfileRequest(ApiModel):
    """Request body for profile updates."""

    display_name: OptionalDisplayName | None = Field(default=None)
    bio: str | None = Field(default=None, max_length=2000)
    timezone: OptionalTimeZone | None = Field(default=None)


class UpdateUserSettingsRequest(ApiModel):
    """Request body for user-settings updates."""

    locale: str | None = Field(default=None, min_length=2, max_length=32)
    theme: str | None = Field(default=None, min_length=2, max_length=32)
    system_prompt: str | None = Field(default=None, max_length=4000)
    default_model: str | None = Field(default=None, min_length=1, max_length=128)


class UserSummaryResponse(ApiModel):
    """Serialized view of a user profile."""

    id: int
    username: str
    display_name: str
    avatar_url: str
    bio: str
    timezone: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, user: User) -> UserSummaryResponse:
        """Build a user summary response from the user domain entity.

        Args:
            user: Domain user to serialize.

        Returns:
            User summary response model for the API layer.
        """
        return cls(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            bio=user.bio,
            timezone=user.timezone,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )


class UserSettingsResponse(ApiModel):
    """Serialized view of user preference settings."""

    locale: str
    theme: str
    system_prompt: str
    default_model: str

    @classmethod
    def from_domain(cls, settings: UserSettings) -> UserSettingsResponse:
        """Build a user-settings response from the domain settings object.

        Args:
            settings: Domain settings object to serialize.

        Returns:
            User settings response model for the API layer.
        """
        return cls(
            locale=settings.locale,
            theme=settings.theme,
            system_prompt=settings.system_prompt,
            default_model=settings.default_model,
        )


class CurrentUserResponse(ApiModel):
    """Response body for the authenticated user's combined state."""

    user: UserSummaryResponse
    settings: UserSettingsResponse

    @classmethod
    def from_state(cls, state: CurrentUserState) -> CurrentUserResponse:
        """Build a current-user response from the application-layer state.

        Args:
            state: Current-user state returned by the application layer.

        Returns:
            API response model containing user and settings data.
        """
        return cls(
            user=UserSummaryResponse.from_domain(state.user),
            settings=UserSettingsResponse.from_domain(state.settings),
        )


class BootstrapAdminResponse(ApiModel):
    """Response body for bootstrap-admin initialization."""

    initialized: bool
    user: UserSummaryResponse
    settings: UserSettingsResponse

    @classmethod
    def from_state(cls, state: BootstrapAdminState) -> BootstrapAdminResponse:
        """Build a bootstrap-admin response from the application-layer state.

        Args:
            state: Bootstrap-admin state returned by the application layer.

        Returns:
            API response model containing bootstrap status and user data.
        """
        return cls(
            initialized=state.initialized,
            user=UserSummaryResponse.from_domain(state.user),
            settings=UserSettingsResponse.from_domain(state.settings),
        )
