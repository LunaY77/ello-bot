"""Auth utility functions for password hashing and token extraction."""

import bcrypt
from fastapi import Request

from app.core.exception import CommonErrorCode


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def extract_token(request: Request) -> str:
    """Extract Bearer token from Authorization header. Raises RuntimeError on failure."""
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth:
        raise RuntimeError(CommonErrorCode.UNAUTHORIZED)
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise RuntimeError(CommonErrorCode.TOKEN_INVALID)
    return token
