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
from app.core.schema import Result


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
    """Common Error Code Enum"""

    SYSTEM_ERROR = ("A0001", "System error")
    PARAM_ERROR = ("A0002", "Parameter validation failed")
    MISSING_PARAMETER = ("A0003", "Missing required parameter")
    INVALID_PARAMETER = ("A0004", "Invalid parameter format")
    UNAUTHORIZED = ("A0005", "Unauthorized access")
    FORBIDDEN = ("A0006", "Forbidden access")
    NOT_FOUND = ("A0007", "Resource not found")
    TOKEN_EXPIRED = ("A0008", "Token expired")
    TOKEN_INVALID = ("A0009", "Invalid Token")

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
        content=Result.fail(code=exc.error_code, message=exc.error_msg).model_dump(by_alias=True),
    )


def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    log.warning(f"Validation error: {errors} - {request.url.path}")

    if errors:
        field = _field_from_loc(errors[0].get("loc", ()))
        msg = errors[0].get("msg", CommonErrorCode.PARAM_ERROR.error_msg)
        message = f"{field}: {msg}" if field else msg
    else:
        message = CommonErrorCode.PARAM_ERROR.error_msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=Result.fail(
            code=CommonErrorCode.PARAM_ERROR.error_code, message=message
        ).model_dump(by_alias=True),
    )


def _field_from_loc(loc: tuple) -> str:
    """Extract field name from error location

    Args:
        loc: Error location tuple from Pydantic validation error

    Returns:
        str: Extracted field name for error reporting
    """
    if not loc:
        return ""
    prefix = loc[0]
    if prefix in ("body", "query", "path", "header", "cookie"):
        return ".".join(str(x) for x in loc[1:])
    else:
        return ".".join(str(x) for x in loc)


def general_exception_handler(request: Request, exc: Exception):
    log.error(f"Unhandled exception: {exc} - {request.url.path}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=Result.fail(
            code=CommonErrorCode.SYSTEM_ERROR.error_code,
            message=CommonErrorCode.SYSTEM_ERROR.error_msg,
        ).model_dump(by_alias=True),
    )
