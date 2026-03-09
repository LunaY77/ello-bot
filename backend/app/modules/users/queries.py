from typing import Annotated

from fastapi import Depends
from sqlalchemy import select

from app.core import BusinessException, DbSession

from .consts import UserErrorCode
from .model import User
from .schemas import UserInfoResponse


class UserQueries:
    """User Queries"""

    def __init__(self, db: DbSession) -> None:
        """Store the request-scoped SQLAlchemy session."""
        self.db = db

    def get_user_info(self, user_id: int) -> UserInfoResponse:
        """Get user information by user ID.

        Args:
            user_id: User unique identifier

        Returns:
            UserInfoResponse: Sanitized user information
        """
        user = self.db.scalar(select(User).where(User.id == user_id, User.is_active))
        # check if user exists and is active
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        return UserInfoResponse.model_validate(user)


def get_user_queries(db: DbSession) -> UserQueries:
    """FastAPI dependency: construct queries with request-scoped session."""
    return UserQueries(db)


UserQueriesDep = Annotated[UserQueries, Depends(get_user_queries)]
