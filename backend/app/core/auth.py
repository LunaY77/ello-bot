"""Authentication context management using contextvars."""

from __future__ import annotations

from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, Request
from sqlalchemy import select

from app.utils import decode_access_token, extract_token

from .database import DbSession
from .exception import AuthException, CommonErrorCode, ErrorCode

if TYPE_CHECKING:
    from app.modules.users import User


def require_auth(request: Request, db: DbSession) -> User:
    """Route dependency that validates access token and returns current user."""
    from app.modules.users import User

    try:
        token = extract_token(request)
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except RuntimeError as exc:
        code: ErrorCode = exc.args[0] if exc.args else CommonErrorCode.UNAUTHORIZED
        raise AuthException(code) from exc
    except (ValueError, TypeError, KeyError) as exc:
        raise AuthException(CommonErrorCode.TOKEN_INVALID) from exc

    user = db.scalar(select(User).where(User.id == user_id))

    if not user or not user.is_active:
        raise AuthException(CommonErrorCode.UNAUTHORIZED)

    return user


CurrentUserDep = Annotated["User", Depends(require_auth)]
