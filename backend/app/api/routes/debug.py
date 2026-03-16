"""Debug routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import RuntimeDep
from app.api.schemas.common import Result, RuntimeDebugResponse
from app.core.constants import API_PREFIX

router = APIRouter(prefix=f"{API_PREFIX}/debug", tags=["Debug"])


@router.get("/runtime", response_model=Result[RuntimeDebugResponse])
async def runtime_status(runtime: RuntimeDep):
    """Return a lightweight snapshot of runtime state for debugging.

    Args:
        runtime: Started application runtime.

    Returns:
        Shared response envelope containing runtime debug fields.
    """
    return Result.ok(
        data=RuntimeDebugResponse(
            state=runtime.state.value,
            debug=runtime.config.DEBUG,
            bootstrap_enabled=runtime.config.bootstrap.ENABLED,
            db_ready=runtime.resources.db_engine is not None,
            redis_ready=runtime.resources.redis is not None,
        )
    )
