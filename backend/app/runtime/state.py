"""Runtime state definitions."""

from __future__ import annotations

from enum import StrEnum


class RuntimeState(StrEnum):
    """Lifecycle states tracked by the application runtime."""

    CREATED = "created"
    STARTING = "starting"
    STARTED = "started"
    STOPPING = "stopping"
    STOPPED = "stopped"
