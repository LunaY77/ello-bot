"""Runtime container groupings."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class RuntimeResources:
    """Long-lived infrastructure objects owned by the runtime."""

    db_engine: Any | None = None
    session_factory: Any | None = None
    redis: Any | None = None
    access_session_store: Any | None = None


@dataclass(slots=True)
class RuntimeGateways:
    """Reserved container for external gateways introduced by future changes."""

    items: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RuntimeRegistries:
    """Reserved container for runtime-owned registries."""

    items: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class RuntimeServices:
    """Application services exposed to routes and tests through the runtime."""

    user: Any | None = None
    session: Any | None = None
