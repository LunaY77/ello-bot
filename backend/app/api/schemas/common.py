"""Shared API schema primitives."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base Pydantic model that enforces the API serialization rules."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class Result[T](ApiModel):
    """Generic response envelope shared across backend endpoints."""

    code: str = "0"
    message: str = "Success"
    data: T | None = None
    success: bool = True

    @classmethod
    def ok(cls, data: T | None = None, message: str = "Success") -> Result[T]:
        """Build a successful response envelope.

        Args:
            data: Optional payload returned to the client.
            message: Human-readable success message.

        Returns:
            A success response envelope.
        """
        return cls(code="0", message=message, data=data, success=True)

    @classmethod
    def fail(cls, *, code: str, message: str) -> Result[None]:
        """Build a failed response envelope.

        Args:
            code: Structured application error code.
            message: Human-readable failure message.

        Returns:
            A failure response envelope without payload data.
        """
        return cls(code=code, message=message, data=None, success=False)


class HealthResponse(ApiModel):
    """Readiness details for the health endpoint."""

    db: bool
    redis: bool


class RuntimeDebugResponse(ApiModel):
    """Runtime state snapshot returned by the debug endpoint."""

    state: str
    debug: bool
    bootstrap_enabled: bool
    db_ready: bool
    redis_ready: bool
