"""Unified streaming event models and helper utilities."""

from __future__ import annotations

from time import time

from pydantic import Field

from app.core import ApiModel

from .exceptions import AIError, AIErrorPayload
from .types import AIFinishReason, AIUsage


def _timestamp_ms() -> int:
    """Return the current epoch timestamp in milliseconds.

    Args:
        None.

    Returns:
        The current timestamp in milliseconds.
    """
    return int(time() * 1000)


class AIStreamEvent(ApiModel):
    """Define fields shared by all stream events."""

    event: str
    request_id: str
    provider: str
    model: str
    attempt: int
    provider_request_id: str | None = None
    timestamp_ms: int = Field(default_factory=_timestamp_ms)


class AIStartEvent(AIStreamEvent):
    """Mark the beginning of a streaming attempt."""

    event: str = "start"


class AITextStartEvent(AIStreamEvent):
    """Mark the beginning of textual output within a stream."""

    event: str = "text_start"


class AITextDeltaEvent(AIStreamEvent):
    """Emit an incremental text delta from the provider stream."""

    event: str = "text_delta"
    delta: str
    text: str


class AITextEndEvent(AIStreamEvent):
    """Emit the fully accumulated text for the current attempt."""

    event: str = "text_end"
    text: str


class AIUsageEvent(AIStreamEvent):
    """Emit token usage information when the provider exposes it."""

    event: str = "usage"
    usage: AIUsage


class AIDoneEvent(AIStreamEvent):
    """Mark successful completion of the stream."""

    event: str = "done"
    text: str
    finish_reason: AIFinishReason
    usage: AIUsage = Field(default_factory=AIUsage)


class AIErrorEvent(AIStreamEvent):
    """Mark terminal failure of the stream with partial output preserved."""

    event: str = "error"
    error: AIErrorPayload
    partial_text: str | None = None


AnyAIStreamEvent = (
    AIStartEvent
    | AITextStartEvent
    | AITextDeltaEvent
    | AITextEndEvent
    | AIUsageEvent
    | AIDoneEvent
    | AIErrorEvent
)


def set_event_attempt(
    event: AnyAIStreamEvent,
    *,
    attempt: int,
) -> AnyAIStreamEvent:
    """Return a copy of an event annotated with final attempt metadata.

    Args:
        event: Original stream event emitted by one provider adapter.
        attempt: One-based execution attempt index.

    Returns:
        A copied event updated with final attempt metadata.
    """
    return event.model_copy(update={"attempt": attempt})


def build_error_event(
    *,
    error: AIError,
    request_id: str,
    provider: str,
    model: str,
    attempt: int,
    provider_request_id: str | None = None,
) -> AIErrorEvent:
    """Create a normalized terminal stream error event from an exception.

    Args:
        error: Normalized SDK exception raised by the provider or client.
        request_id: Stable SDK request id.
        provider: Provider name associated with the failure.
        model: Model id associated with the failure.
        attempt: One-based execution attempt index.
        provider_request_id: Optional provider-native request id.

    Returns:
        A normalized terminal error stream event.
    """
    return AIErrorEvent(
        request_id=request_id,
        provider=provider,
        model=model,
        attempt=attempt,
        provider_request_id=provider_request_id,
        error=error.to_payload(),
        partial_text=error.partial_text,
    )
