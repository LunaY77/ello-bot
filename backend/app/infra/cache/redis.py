"""Redis integration for access-session snapshots."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import redis.asyncio as aioredis

from app.core import dump_json, load_json
from app.domain.session.entities import AccessSessionSnapshot


@dataclass(frozen=True, slots=True)
class RedisKeyDef:
    """Definition of a Redis key pattern used by the backend."""

    pattern: str
    expire_seconds: int | None = None
    description: str = ""

    def key(self, *parts: object) -> str:
        """Render a concrete Redis key from the pattern and dynamic parts.

        Args:
            parts: Dynamic values interpolated into the key pattern.

        Returns:
            Concrete Redis key string.
        """
        return self.pattern.format(*parts)


class SessionRedisKeys:
    """Centralized Redis keys used by auth/session flows."""

    ACCESS_SESSION = RedisKeyDef(
        "ello:user:session:access:{}",
        description="Redis snapshot keyed by hashed access token.",
    )


def create_redis_client(url: str) -> aioredis.Redis:
    """Create the shared async Redis client.

    Args:
        url: Redis connection URL.

    Returns:
        Async Redis client configured for string responses.
    """
    return aioredis.from_url(url, decode_responses=True)


class AccessSessionSnapshotStore:
    """Store and retrieve access-session snapshots in Redis."""

    def __init__(self, redis: aioredis.Redis) -> None:
        """Bind the Redis client used for snapshot operations.

        Args:
            redis: Async Redis client owned by the runtime.
        """
        self._redis = redis

    async def put(
        self,
        *,
        token_hash: str,
        snapshot: AccessSessionSnapshot,
        ttl_seconds: int,
    ) -> None:
        """Persist an access-session snapshot with a TTL.

        Args:
            token_hash: Hashed access token used as the lookup key.
            snapshot: Snapshot payload to cache.
            ttl_seconds: Expiration time for the Redis entry.
        """
        await self._redis.set(
            SessionRedisKeys.ACCESS_SESSION.key(token_hash),
            dump_json(asdict(snapshot)),
            ex=ttl_seconds,
        )

    async def get(self, *, token_hash: str) -> AccessSessionSnapshot | None:
        """Load an access-session snapshot from Redis.

        Args:
            token_hash: Hashed access token used as the lookup key.

        Returns:
            Access-session snapshot when present, otherwise None.
        """
        raw = await self._redis.get(SessionRedisKeys.ACCESS_SESSION.key(token_hash))
        if raw is None:
            return None
        payload = load_json(raw)
        if not isinstance(payload, dict):
            return None
        return AccessSessionSnapshot(**payload)

    async def delete(self, *, token_hash: str) -> None:
        """Remove a cached access-session snapshot from Redis.

        Args:
            token_hash: Hashed access token used as the lookup key.
        """
        await self._redis.delete(SessionRedisKeys.ACCESS_SESSION.key(token_hash))
