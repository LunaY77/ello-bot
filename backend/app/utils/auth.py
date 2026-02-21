"""
Auth utility functions for password hashing and JWT token operations.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from fastapi import Request

from app.core.config import settings
from app.core.exception import CommonErrorCode


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update(
        {
            "exp": expire,
            "jti": str(uuid.uuid4()),
            "iat": now,
            "nbf": now,
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token. Raises RuntimeError on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
            options={"require": ["exp", "sub", "jti", "iat", "token_type"]},
        )
        if payload.get("token_type") != "access":
            raise RuntimeError(CommonErrorCode.TOKEN_INVALID)
        return payload
    except jwt.ExpiredSignatureError as err:
        raise RuntimeError(CommonErrorCode.TOKEN_EXPIRED) from err
    except jwt.InvalidTokenError as err:
        raise RuntimeError(CommonErrorCode.TOKEN_INVALID) from err


def extract_token(request: Request) -> str:
    """Extract Bearer token from Authorization header. Raises RuntimeError on failure."""
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth:
        raise RuntimeError(CommonErrorCode.UNAUTHORIZED)
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise RuntimeError(CommonErrorCode.TOKEN_INVALID)
    return token
