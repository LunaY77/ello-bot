"""Technical retry helpers for the internal AI SDK."""

from __future__ import annotations

from .exceptions import (
    AIAuthError,
    AIConfigError,
    AIError,
    AIPolicyDeniedError,
    AIUnsupportedCapabilityError,
    AIValidationError,
)


def should_retry(error: AIError) -> bool:
    """Return whether the error is eligible for an in-place retry.

    Args:
        error: Normalized SDK exception raised by one provider attempt.

    Returns:
        ``True`` when the request should be retried against the same route.
    """
    # SDK-level technical retry must avoid masking deterministic caller errors.
    if isinstance(
        error,
        AIAuthError
        | AIConfigError
        | AIPolicyDeniedError
        | AIUnsupportedCapabilityError
        | AIValidationError,
    ):
        return False

    return error.retryable


def compute_backoff_seconds(base_ms: int, retry_index: int) -> float:
    """Compute exponential backoff for technical retries.

    Args:
        base_ms: Base delay in milliseconds configured for the provider.
        retry_index: Zero-based retry attempt index.

    Returns:
        The sleep duration in seconds.
    """
    return (base_ms * (2**retry_index)) / 1000
