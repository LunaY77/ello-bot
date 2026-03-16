"""Health routes."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import RuntimeDep
from app.api.schemas.common import HealthResponse, Result

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=Result[HealthResponse])
async def health(runtime: RuntimeDep):
    """Report database and Redis readiness for the running process.

    Args:
        runtime: Started application runtime.

    Returns:
        Shared response envelope containing health booleans.
    """
    db_ok = False
    try:
        async with runtime.resources.session_factory() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_ok = False
    try:
        redis_ok = bool(await runtime.resources.redis.ping())
    except Exception:
        redis_ok = False

    return Result.ok(data=HealthResponse(db=db_ok, redis=redis_ok))
