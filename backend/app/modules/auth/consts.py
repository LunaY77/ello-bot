from app.core import RedisKeyDef, settings


class AuthRedisKey:
    """ello:auth:* key namespace."""

    ACTIVE_TOKEN = RedisKeyDef(
        "ello:auth:token:active:{}",
        expire_seconds=settings.jwt.EXPIRE_MINUTES * 60,
        description="Active JWT token whitelist (synced with JWT TTL)",
    )
