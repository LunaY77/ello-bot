"""
Custom Exception Module

- ErrorCode Protocol: Error code interface
- CommonErrorCode: Common error code enum
- BusinessException: Generic business exception carrier
- Global exception handler with unified return format

Exception format:
{
    "code": "ERROR_CODE",
    "message": "Error message",
    "detail": {}
}
"""

from enum import Enum, unique
from typing import Protocol

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logger import log
from app.core.result import Result


class ErrorCode(Protocol):
    """Error Code Interface

    Defines the properties that error codes must implement for unified error code standards.

    Attributes:
        error_code: Error code string (e.g., "A0001")
        error_msg: Error message (e.g., "Parameter validation failed")
    """

    @property
    def error_code(self) -> str: ...

    @property
    def error_msg(self) -> str: ...


@unique
class CommonErrorCode(Enum):
    """Common Error Code Enum

    Error code rules:
    - Axxxx: Parameter validation errors
    - Bxxxx: Business logic errors
    - Cxxxx: System exceptions
    """

    PARAM_ERROR = ("A0001", "Parameter validation failed")
    MISSING_PARAMETER = ("A0002", "Missing required parameter")
    INVALID_PARAMETER = ("A0003", "Invalid parameter format")

    UNAUTHORIZED = ("B0001", "Unauthorized access")
    FORBIDDEN = ("B0002", "Forbidden access")
    NOT_FOUND = ("B0003", "Resource not found")
    TOKEN_EXPIRED = ("B0004", "Token expired")
    TOKEN_INVALID = ("B0005", "Invalid Token")

    SYSTEM_ERROR = ("C0001", "System exception")
    DATABASE_ERROR = ("C0002", "Database exception")
    CACHE_ERROR = ("C0003", "Cache exception")

    def __init__(self, error_code: str, error_msg: str) -> None:
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        return self._error_code

    @property
    def error_msg(self) -> str:
        return self._error_msg


class BusinessException(Exception):
    """Generic Business Exception Class

    This is a generic exception carrier class that does not contain any business-related content.
    Specific business exceptions should be defined by each business module.

    Usage:
        - Define specific error code enums in business modules
        - Pass business-specific error codes and messages when throwing BusinessException

    Attributes:
        code: Error code
    """

    def __init__(
        self,
        code: ErrorCode,
    ) -> None:
        self.error_code = code.error_code
        self.error_msg = code.error_msg
        super().__init__(code.error_msg)

    def to_dict(self) -> dict:
        """Convert to dictionary format

        Returns:
            dict: Exception information dictionary
        """
        return {
            "code": self.error_code,
            "message": self.error_msg,
        }


def business_exception_handler(request: Request, exc: BusinessException):
    log.warning(f"Business exception: {exc.error_code} - {exc.error_msg} - {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=Result.fail(code=exc.error_code, message=exc.error_msg).model_dump(),
    )


def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    log.warning(f"Validation error: {errors} - {request.url.path}")

    raw_msg = (
        errors[0].get("msg", CommonErrorCode.PARAM_ERROR.error_msg)
        if errors
        else CommonErrorCode.PARAM_ERROR.error_msg
    )
    message = raw_msg.removeprefix("Value error, ")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=Result.fail(
            code=CommonErrorCode.PARAM_ERROR.error_code, message=message
        ).model_dump(),
    )


def general_exception_handler(request: Request, exc: Exception):
    log.error(f"Unhandled exception: {exc} - {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=Result.fail(
            code=CommonErrorCode.SYSTEM_ERROR.error_code,
            message=CommonErrorCode.SYSTEM_ERROR.error_msg,
        ).model_dump(),
    )
