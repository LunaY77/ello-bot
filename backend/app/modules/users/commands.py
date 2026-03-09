from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy import select

from app.core import BusinessException, DbSession, RedisDep, log
from app.modules.auth.consts import AuthRedisKey
from app.utils import hash_password

from .consts import UserErrorCode
from .model import User


class UserCommands:
    """User Commands"""

    def __init__(self, db: DbSession, redis: aioredis.Redis) -> None:
        self.db = db
        self.redis = redis

    async def reset_password(self, user_id: int, password: str) -> None:
        """Reset user password

        Args:
            user_id: User ID
            password: New password
        """
        log.debug(f"Attempting to reset password for user ID: {user_id}")

        # Check if user exists
        user = await self.db.scalar(select(User).where(User.id == user_id, User.is_active))
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        user.password = hash_password(password)
        await self.db.flush()

    async def upload_avatar(self, user_id: int, avatar_url: str) -> None:
        """Upload user avatar

        Args:
            user_id: User ID
            avatar_url: Avatar URL
        """
        log.debug(f"Uploading avatar for user ID: {user_id}")

        # Check if user exists
        user = await self.db.scalar(select(User).where(User.id == user_id, User.is_active))
        if not user:
            raise BusinessException(UserErrorCode.USER_NOT_FOUND)

        user.avatar = avatar_url
        await self.db.flush()

    async def logout(self, jti: str) -> None:
        """Logout by removing the token from the active whitelist.

        Args:
            jti: JWT token ID
        """
        key = AuthRedisKey.ACTIVE_TOKEN.key(jti)
        await self.redis.delete(key)
        log.info(f"Token removed from whitelist: jti={jti}")


def get_user_commands(db: DbSession, redis: RedisDep) -> UserCommands:
    """FastAPI dependency: construct commands with request-scoped session."""
    return UserCommands(db, redis)


UserCommandsDep = Annotated[UserCommands, Depends(get_user_commands)]
