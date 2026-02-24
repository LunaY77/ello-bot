"""
User Service Layer

Encapsulates user-related business logic, including:
- Get user information
- Update user information
- Verify password
- User error code definitions
"""

from enum import Enum, unique
from typing import Annotated

from fastapi import Depends

from app.core import (
    BusinessException,
    log,
)
from app.repository import UserRepositoryDep
from app.schema import UserResponse, UserWithToken
from app.utils import create_access_token, hash_password, verify_password


@unique
class UserErrorCode(Enum):
    """User business error code enum"""

    USER_NOT_FOUND = ("B0101", "User not found")
    INVALID_PASSWORD = ("B0102", "Invalid password")
    USERNAME_EXISTS = ("B0103", "Username already exists")

    def __init__(self, error_code: str, error_msg: str) -> None:
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        return self._error_code

    @property
    def error_msg(self) -> str:
        return self._error_msg


class UserService:
    """User service class

    Handles core business logic related to users.

    Attributes:
        user_repo: User repository instance
    """

    def __init__(self, user_repo: UserRepositoryDep):
        """Initialize user service

        Args:
            user_repo: User repository dependency
        """
        self.user_repo = user_repo

    def login(self, username: str, password: str) -> UserWithToken:
        log.debug(f"Attempting login for username: {username}")

        # Get user
        user = self.user_repo.get_by_username(username)
        if not user or not user.is_active:
            raise BusinessException(UserErrorCode.INVALID_PASSWORD)

        # Verify password
        if not verify_password(password, user.password):
            raise BusinessException(UserErrorCode.INVALID_PASSWORD)

        # Generate token
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "token_type": "access",
            }
        )

        log.info(f"Login successful for username: {username}")

        user_response = UserResponse.model_validate(user)
        return UserWithToken(
            **user_response.model_dump(), access_token=access_token, token_type="bearer"
        )

    def register(self, username: str, password: str) -> UserResponse:
        """Register a new user

        Args:
            username: Desired username
            password: Desired password

        Returns:
            UserResponse: Registered user information
        """
        log.debug(f"Attempting to register username: {username}")

        # Check if username already exists
        if self.user_repo.get_by_username(username):
            raise BusinessException(UserErrorCode.USERNAME_EXISTS)

        # Create User
        hashed_password = hash_password(password)

        new_user = self.user_repo.create(username=username, password=hashed_password)

        log.info(f"User registered successfully: {username} (ID: {new_user.id})")
        return UserResponse.model_validate(new_user)

    def reset_password(self, user_id: int, password: str) -> None:
        """Reset user password

        Args:
            user_id: User ID
            password: New password
        """
        log.debug(f"Attempting to reset password for user ID: {user_id}")

        # Check if user exists
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        hashed_password = hash_password(password)
        user.password = hashed_password
        self.user_repo.refresh(user)

    def get_user_info(self, user_id: int) -> UserResponse:
        """Get user information

        Args:
            user_id: User ID

        Returns:
            UserResponse: User information
        """
        log.debug(f"Fetching user info for user ID: {user_id}")

        # Check if user exists
        user = self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        return UserResponse.model_validate(user)

    def upload_avatar(self, user_id: int, avatar_url: str) -> None:
        """Upload user avatar

        Args:
            user_id: User ID
            avatar_url: Avatar URL
        """
        log.debug(f"Uploading avatar for user ID: {user_id}")

        # Check if user exists
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        user.avatar = avatar_url
        self.user_repo.refresh(user)


def get_user_service(user_repo: UserRepositoryDep) -> UserService:
    """FastAPI dependency: construct service with repository dependency."""
    return UserService(user_repo)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
