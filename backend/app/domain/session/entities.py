"""Domain entities for auth sessions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.domain.user.entities import User, UserSettings


@dataclass(slots=True)
class AuthSession:
    """Domain entity describing an authenticated session record."""

    id: int
    user_id: int
    access_token_hash: str
    refresh_token_hash: str
    user_agent: str
    ip_address: str
    expires_at: datetime
    revoked_at: datetime | None = None
    last_seen_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(slots=True)
class SessionTokens:
    """Pair of opaque access and refresh tokens."""

    access_token: str
    refresh_token: str


@dataclass(slots=True)
class AccessSessionSnapshot:
    """Redis-backed snapshot used to authenticate access tokens."""

    session_id: int
    user_id: int
    username: str
    display_name: str
    session_version: int


@dataclass(slots=True)
class AuthenticatedSessionState:
    """Application-layer auth result combining user, settings, and tokens."""

    user: User
    settings: UserSettings
    tokens: SessionTokens
