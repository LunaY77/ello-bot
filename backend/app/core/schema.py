"""Result wrapper for service layer operations"""

from typing import TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class ApiModel(BaseModel):
    """Base model for API schemas with camelCase aliasing and extra fields forbidden."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class Result[T](ApiModel):
    """Result wrapper for service layer operations

    Encapsulates success/failure of an operation along with data or error information.

    Attributes:
        success: Indicates if the operation was successful
        data: The result data if successful, otherwise None
        code: Error code if failed, "0" if successful
        message: Error message if failed, "Success" if successful
    """

    code: str = "0"
    message: str = "Success"
    data: T | None = None
    success: bool = True

    @classmethod
    def ok(cls, data: T | None = None, message: str = "Success") -> "Result[T]":
        """Create a successful Result with the given data."""
        return cls(code="0", message=message, data=data, success=True)

    @classmethod
    def fail(cls, code: str, message: str) -> "Result":
        """Create a failed Result with the given error code and message."""
        return cls(code=code, message=message, data=None, success=False)
