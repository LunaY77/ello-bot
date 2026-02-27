"""Core Module"""

from app.core.auth import (
    CurrentUserDep,
    require_auth,
)
from app.core.config import settings
from app.core.database import (
    Base,
    DbSession,
    SessionLocal,
)
from app.core.exception import (
    AuthException,
    BusinessException,
    CommonErrorCode,
    ErrorCode,
    auth_exception_handler,
    business_exception_handler,
    general_exception_handler,
    validation_exception_handler,
)
from app.core.logger import log
from app.core.schema import ApiModel, Result

__all__ = [
    "settings",
    "log",
    "ErrorCode",
    "CommonErrorCode",
    "BusinessException",
    "AuthException",
    "business_exception_handler",
    "auth_exception_handler",
    "validation_exception_handler",
    "general_exception_handler",
    "DbSession",
    "SessionLocal",
    "Base",
    "Result",
    "ApiModel",
    "require_auth",
    "CurrentUserDep",
]
