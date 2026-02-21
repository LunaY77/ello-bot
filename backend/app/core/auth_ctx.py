"""Authentication context management using contextvars."""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.model.user import User

current_user_var: ContextVar[User | None] = ContextVar("current_user", default=None)


def get_current_user() -> User:
    """Get the current user from the context variable."""
    user = current_user_var.get()
    if user is None:
        raise RuntimeError("Current user not set in context")
    return user


def set_current_user(user: User) -> Token[User | None]:
    """Set the current user in the context variable."""
    return current_user_var.set(user)


def reset_current_user(token: Token[User | None]) -> None:
    """Reset the current user in the context variable."""
    current_user_var.reset(token)
