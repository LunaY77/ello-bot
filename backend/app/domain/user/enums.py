"""Enums for user domain state."""

from enum import StrEnum


class UserStatus(StrEnum):
    """Supported lifecycle states for users."""

    ACTIVE = "active"
    INACTIVE = "inactive"
