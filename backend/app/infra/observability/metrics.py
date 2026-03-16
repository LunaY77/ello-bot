"""Metrics helpers for optional OpenTelemetry setup."""

from __future__ import annotations


def metrics_enabled(enabled: bool) -> bool:
    """Return whether metrics should be considered enabled.

    Args:
        enabled: Raw metrics-enabled flag.

    Returns:
        Boolean flag passed through unchanged.
    """
    return enabled
