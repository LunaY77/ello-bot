"""
Redis Client & Key Definition Framework

Provides:
- RedisKeyDef: Immutable key definition with pattern and optional TTL
- redis_client: Global Redis connection instance
- RedisDep: FastAPI dependency type alias for DI
- close_redis: Shutdown cleanup
"""

from dataclasses import dataclass
from typing import Annotated

import redis as _redis
from fastapi import Depends

from .config import settings


@dataclass(frozen=True, slots=True)
class RedisKeyDef:
    """Immutable Redis key definition with pattern and optional TTL.

    Key structure convention: ello:{module}:{pattern}
    Use str.format() placeholders ({}, {0}, {name}) in the pattern.

    Example:
        >>> kd = RedisKeyDef("ello:auth:token:blacklist:{}", 86400, "JWT blacklist")
        >>> kd.key("abc123")
        'ello:auth:token:blacklist:abc123'
        >>> kd.expire_seconds
        86400
    """

    pattern: str
    expire_seconds: int | None = None
    description: str = ""

    def key(self, *args: object) -> str:
        """Build the full Redis key by formatting the pattern with args."""
        return self.pattern.format(*args)


redis_client: _redis.Redis = _redis.from_url(
    settings.cache.URL,
    decode_responses=True,
)


def get_redis() -> _redis.Redis:
    """Factory function for FastAPI DI."""
    return redis_client


def close_redis() -> None:
    """Close the Redis connection (call during app shutdown)."""
    redis_client.close()


RedisDep = Annotated[_redis.Redis, Depends(get_redis)]
