from typing import Annotated

from fastapi import Depends
from sqlalchemy import select

from app.core import BusinessException, DbSession, log
from app.modules.users import User, UserErrorCode, UserInfoResponse
from app.utils import create_access_token, hash_password, verify_password

from .schemas import AuthResponse


class AuthCommands:
    def __init__(self, db: DbSession):
        self.db = db

    def login(self, username: str, password: str) -> AuthResponse:
        """Login a user with username and password.

        Args:
            username: Username
            password: Password

        Returns:
            AuthResponse: User information and access token
        """
        log.debug(f"Attempting login for username: {username}")

        # Get user
        user = self.db.scalar(select(User).where(User.username == username, User.is_active))
        if not user:
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

        user_response = UserInfoResponse.model_validate(user)
        return AuthResponse(user=user_response, token=access_token)

    def register(self, username: str, password: str) -> AuthResponse:
        """Register a new user

        Args:
            username: Desired username
            password: Desired password

        Returns:
            AuthResponse: Registered user information and access token
        """
        log.debug(f"Attempting to register username: {username}")

        # Check if username already exists
        user = self.db.scalar(select(User).where(User.username == username))
        if not user:
            raise BusinessException(UserErrorCode.INVALID_PASSWORD)

        # Create User
        hashed_password = hash_password(password)

        new_user = User(username=username, password=hashed_password, role="user", is_active=True)
        self.db.add(new_user)
        self.db.flush()  # Flush to get the new user's ID

        log.info(f"User registered successfully: {username} (ID: {new_user.id})")
        return self.login(username, password)


def get_auth_commands(db: DbSession) -> AuthCommands:
    """FastAPI dependency: construct commands with request-scoped session."""
    return AuthCommands(db)


AuthCommandsDep = Annotated[AuthCommands, Depends(get_auth_commands)]
