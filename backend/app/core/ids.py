"""ID, token, and credential helpers."""

from __future__ import annotations

import hashlib
import os

import bcrypt


def generate_opaque_token() -> str:
    """Generate a random opaque token for session credentials.

    Returns:
        Hex-encoded opaque token string.
    """
    return os.urandom(32).hex()


def hash_token(token: str) -> str:
    """Hash an opaque token for storage and lookup.

    Args:
        token: Opaque token value.

    Returns:
        SHA-256 hash of the token.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt.

    Args:
        password: Plaintext password to hash.

    Returns:
        Bcrypt password hash.
    """
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Args:
        plain_password: Plaintext password supplied by the user.
        hashed_password: Stored bcrypt password hash.

    Returns:
        True when the password matches, otherwise False.
    """
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
