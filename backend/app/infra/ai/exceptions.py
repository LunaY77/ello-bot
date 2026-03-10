"""Unified exception hierarchy for the internal AI SDK."""

from __future__ import annotations

from typing import Any

from app.core import ApiModel


def _current_trace_id() -> str | None:
    """Read the active trace id from the current OpenTelemetry span when available.

    Args:
        None.

    Returns:
        The current trace id, or ``None`` when no span is active.
    """
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        span_context = span.get_span_context()
        if span_context and span_context.trace_id:
            return format(span_context.trace_id, "032x")
    except Exception:
        return None
    return None


class AIErrorPayload(ApiModel):
    """Serialize AI exceptions for stream events and external consumers."""

    error_code: str
    message: str
    provider: str | None = None
    model: str | None = None
    retryable: bool = False
    http_status: int | None = None
    trace_id: str | None = None
    error_type: str
    partial_text: str | None = None


class AIError(Exception):
    """Base class for all provider-neutral SDK errors."""

    default_code = "AI_ERROR"
    default_retryable = False

    def __init__(
        self,
        message: str,
        *,
        error_code: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        retryable: bool | None = None,
        http_status: int | None = None,
        trace_id: str | None = None,
        raw_error: Any | None = None,
        partial_text: str | None = None,
    ) -> None:
        """Initialize a normalized AI error instance.

        Args:
            message: Human-readable error message.
            error_code: Optional stable SDK error code override.
            provider: Optional provider name associated with the failure.
            model: Optional model id associated with the failure.
            retryable: Optional retryability override.
            http_status: Optional upstream HTTP status code.
            trace_id: Optional trace id override.
            raw_error: Optional original exception object kept for internal use.
            partial_text: Optional partial stream output collected before failure.

        Returns:
            None.
        """
        super().__init__(message)
        self.error_code = error_code or self.default_code
        self.message = message
        self.provider = provider
        self.model = model
        self.retryable = self.default_retryable if retryable is None else retryable
        self.http_status = http_status
        self.trace_id = trace_id or _current_trace_id()
        self.raw_error = raw_error
        self.partial_text = partial_text

    def to_payload(self) -> AIErrorPayload:
        """Convert the exception to a transport-safe payload.

        Args:
            None.

        Returns:
            A serializable payload suitable for API responses and stream events.
        """
        return AIErrorPayload(
            error_code=self.error_code,
            message=self.message,
            provider=self.provider,
            model=self.model,
            retryable=self.retryable,
            http_status=self.http_status,
            trace_id=self.trace_id,
            error_type=self.__class__.__name__,
            partial_text=self.partial_text,
        )


class AIConfigError(AIError):
    """Raise when SDK or provider configuration is invalid."""

    default_code = "AI_CONFIG_ERROR"


class AIValidationError(AIError):
    """Raise when request payloads fail validation at SDK boundaries."""

    default_code = "AI_VALIDATION_ERROR"


class AIAuthError(AIError):
    """Raise when a provider rejects credentials or authorization."""

    default_code = "AI_AUTH_ERROR"


class AITimeoutError(AIError):
    """Raise when a provider request exceeds the configured timeout."""

    default_code = "AI_TIMEOUT_ERROR"
    default_retryable = True


class AIRateLimitError(AIError):
    """Raise when a provider applies rate limiting."""

    default_code = "AI_RATE_LIMIT_ERROR"
    default_retryable = True


class AIProviderUnavailableError(AIError):
    """Raise when the upstream provider is temporarily unavailable."""

    default_code = "AI_PROVIDER_UNAVAILABLE_ERROR"
    default_retryable = True


class AIUnsupportedCapabilityError(AIError):
    """Raise when the selected model or provider lacks a requested capability."""

    default_code = "AI_UNSUPPORTED_CAPABILITY_ERROR"


class AIPolicyDeniedError(AIError):
    """Raise when a provider blocks a request due to policy or safety checks."""

    default_code = "AI_POLICY_DENIED_ERROR"


class AITransportError(AIError):
    """Raise when network transport or protocol handling fails."""

    default_code = "AI_TRANSPORT_ERROR"
    default_retryable = True


class AIRequestCancelledError(AIError):
    """Raise when request execution is cancelled by the caller."""

    default_code = "AI_REQUEST_CANCELLED"
