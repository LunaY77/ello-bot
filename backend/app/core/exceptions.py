"""Shared exception primitives for the rewritten backend."""

from __future__ import annotations

from enum import Enum, unique
from typing import Protocol


class ErrorCode(Protocol):
    """Protocol implemented by structured backend error codes."""

    @property
    def error_code(self) -> str:
        """Return the machine-readable error code.

        Returns:
            Structured error code string.
        """
        ...

    @property
    def error_msg(self) -> str:
        """Return the human-readable error message.

        Returns:
            Error message string.
        """
        ...


@unique
class CommonErrorCode(Enum):
    """Shared error codes reused across backend layers."""

    SYSTEM_ERROR = ("A0001", "System error")
    PARAM_ERROR = ("A0002", "Parameter validation failed")
    MISSING_PARAMETER = ("A0003", "Missing required parameter")
    INVALID_PARAMETER = ("A0004", "Invalid parameter format")
    UNAUTHORIZED = ("A0005", "Unauthorized access")
    FORBIDDEN = ("A0006", "Forbidden access")
    NOT_FOUND = ("A0007", "Resource not found")
    TOKEN_EXPIRED = ("A0008", "Token expired")
    TOKEN_INVALID = ("A0009", "Invalid token")

    def __init__(self, error_code: str, error_msg: str) -> None:
        """Store the code and message for the enum member.

        Args:
            error_code: Machine-readable error code.
            error_msg: Human-readable error message.
        """
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        """Expose the machine-readable error code.

        Returns:
            Structured error code string.
        """
        return self._error_code

    @property
    def error_msg(self) -> str:
        """Expose the human-readable error message.

        Returns:
            Error message string.
        """
        return self._error_msg


class BusinessException(Exception):
    """Exception raised for business-rule failures mapped to HTTP 400."""

    def __init__(self, code: ErrorCode) -> None:
        """Create a business exception from a structured error code.

        Args:
            code: Error-code object describing the failure.
        """
        self.error_code = code.error_code
        self.error_msg = code.error_msg
        super().__init__(code.error_msg)


class AuthException(Exception):
    """Exception raised for auth failures mapped to HTTP 401."""

    def __init__(self, code: ErrorCode) -> None:
        """Create an auth exception from a structured error code.

        Args:
            code: Error-code object describing the auth failure.
        """
        self.error_code = code.error_code
        self.error_msg = code.error_msg
        super().__init__(code.error_msg)
