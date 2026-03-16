"""Auth/session request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import Field, StringConstraints

from app.api.schemas.common import ApiModel
from app.api.schemas.user import UserSettingsResponse, UserSummaryResponse
from app.domain.session.entities import AuthenticatedSessionState, AuthSession

UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=32)]
Password = Annotated[str, StringConstraints(min_length=6, max_length=100)]
OptionalDisplayName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=128),
]


class RegisterRequest(ApiModel):
    """Request body for user self-registration."""

    username: UserName
    password: Password
    display_name: OptionalDisplayName | None = Field(default=None)


class LoginRequest(ApiModel):
    """Request body for username/password login."""

    username: UserName
    password: Password


class RefreshRequest(ApiModel):
    """Request body for refresh-token rotation."""

    refresh_token: str = Field(..., description="Opaque refresh token")


class SessionInfoResponse(ApiModel):
    """Serialized view of an active auth session."""

    id: int
    user_agent: str
    ip_address: str
    expires_at: datetime
    last_seen_at: datetime | None = None
    created_at: datetime

    @classmethod
    def from_domain(cls, session: AuthSession) -> SessionInfoResponse:
        """Build a session response model from a domain entity.

        Args:
            session: Domain auth session to serialize.

        Returns:
            Session response model for the API layer.
        """
        return cls(
            id=session.id,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            expires_at=session.expires_at,
            last_seen_at=session.last_seen_at,
            created_at=session.created_at,
        )


class AuthTokenResponse(ApiModel):
    """Response body containing user info plus opaque auth tokens."""

    user: UserSummaryResponse
    settings: UserSettingsResponse
    access_token: str = Field(..., description="Opaque access token")
    refresh_token: str = Field(..., description="Opaque refresh token")

    @classmethod
    def from_state(cls, state: AuthenticatedSessionState) -> AuthTokenResponse:
        """Build an auth-token response from authenticated session state.

        Args:
            state: Authenticated session aggregate returned by the application layer.

        Returns:
            API response model containing the user, settings, and issued tokens.
        """
        return cls(
            user=UserSummaryResponse.from_domain(state.user),
            settings=UserSettingsResponse.from_domain(state.settings),
            access_token=state.tokens.access_token,
            refresh_token=state.tokens.refresh_token,
        )
