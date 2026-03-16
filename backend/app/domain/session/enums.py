"""Enums for session state."""

from enum import StrEnum


class SessionStatus(StrEnum):
    """Supported lifecycle states for auth sessions."""

    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
