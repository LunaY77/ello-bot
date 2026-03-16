"""Tracing helpers for optional OpenTelemetry setup."""

from __future__ import annotations


def tracing_enabled(enabled: bool) -> bool:
    """Return whether tracing should be considered enabled.

    Args:
        enabled: Raw tracing-enabled flag.

    Returns:
        Boolean flag passed through unchanged.
    """
    return enabled
