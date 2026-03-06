from typing import Annotated

from fastapi import Depends
from sqlalchemy import select

from app.core import BusinessException, DbSession, log
from app.utils import hash_password

from .errors import UserErrorCode
from .model import User


class UserCommands:
    """User Commands"""

    def __init__(self, db: DbSession) -> None:
        """Store the request-scoped SQLAlchemy session."""
        self.db = db

    def reset_password(self, user_id: int, password: str) -> None:
        """Reset user password

        Args:
            user_id: User ID
            password: New password
        """
        log.debug(f"Attempting to reset password for user ID: {user_id}")

        # Check if user exists
        user = self.db.scalar(select(User).where(User.id == user_id, User.is_active))
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        user.password = hash_password(password)
        self.db.flush()

    def upload_avatar(self, user_id: int, avatar_url: str) -> None:
        """Upload user avatar

        Args:
            user_id: User ID
            avatar_url: Avatar URL
        """
        log.debug(f"Uploading avatar for user ID: {user_id}")

        # Check if user exists
        user = self.db.scalar(select(User).where(User.id == user_id, User.is_active))
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        user.avatar = avatar_url
        self.db.flush()


def get_user_commands(db: DbSession) -> UserCommands:
    """FastAPI dependency: construct commands with request-scoped session."""
    return UserCommands(db)


UserCommandsDep = Annotated[UserCommands, Depends(get_user_commands)]
