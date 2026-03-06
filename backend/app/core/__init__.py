"""Core Module"""

from .auth import (
    CurrentUserDep,
    require_auth,
)
from .config import settings
from .database import (
    Base,
    DbSession,
    SessionLocal,
)
from .exception import (
    AuthException,
    BusinessException,
    CommonErrorCode,
    ErrorCode,
    auth_exception_handler,
    business_exception_handler,
    general_exception_handler,
    validation_exception_handler,
)
from .logger import log
from .schema import ApiModel, Result

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
