"""Security utilities: opaque token generation and hashing."""

from __future__ import annotations

import hashlib
import os


def generate_opaque_token() -> str:
    """Generate a cryptographically random 256-bit opaque token (hex-encoded)."""
    return os.urandom(32).hex()


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of a token.

    Used to store/compare tokens without keeping the raw value.
    """
    return hashlib.sha256(token.encode()).hexdigest()
