from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core import (
    AuthException,
    BusinessException,
    Result,
    SessionLocal,
    auth_exception_handler,
    business_exception_handler,
    general_exception_handler,
    log,
    settings,
    validation_exception_handler,
)
from app.core.database import engine
from app.core.observability import init_observability
from app.core.redis import close_redis, redis_client
from app.infra.ai import close_ai_client
from app.modules import iam_router

STATIC_DIR = Path(__file__).resolve().parent / "static"


async def _bootstrap_iam_state() -> None:
    """Initialize the default tenant, built-in IAM data, and bootstrap admin account.

    Args:
        None

    Returns:
        None
    """
    if not settings.bootstrap.ENABLED:
        log.info("IAM bootstrap is disabled; skipping startup bootstrap")
        return

    from app.modules.iam.commands import IamCommands

    async with SessionLocal() as db:
        iam = IamCommands(db, redis_client)
        try:
            # Startup bootstrap is idempotent and keeps the initial tenant/admin recoverable.
            # The command layer owns the actual data repair logic so startup stays thin.
            await iam.bootstrap_application(
                tenant_slug=settings.bootstrap.TENANT_SLUG,
                tenant_name=settings.bootstrap.TENANT_NAME,
                admin_username=settings.bootstrap.ADMIN_USERNAME,
                admin_password=settings.bootstrap.resolved_admin_password(debug=settings.DEBUG),
                admin_display_name=settings.bootstrap.ADMIN_DISPLAY_NAME,
            )
            await db.commit()
        except Exception:
            await db.rollback()
            raise


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Manage application startup and shutdown resources.

    Args:
        _app: The FastAPI application instance provided by the lifespan protocol.

    Returns:
        An async context manager that wraps application startup and shutdown.
    """
    log.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    log.info(f"Debug mode: {settings.DEBUG}")
    await _bootstrap_iam_state()
    yield
    log.info("Shutting down application...")
    await close_ai_client()
    await close_redis()
    await engine.dispose()
    log.info("Application shut down")


app = FastAPI(
    title=settings.APP_NAME,
    description="Ello Bot Backend API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

init_observability(app, engine.sync_engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/health", response_model=Result)
async def health_check():
    """Report basic database and Redis health information.

    Args:
        None

    Returns:
        A result payload that reports whether PostgreSQL and Redis are reachable.
    """
    db_ok = False
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    redis_ok = False
    try:
        redis_ok = await redis_client.ping()  # type: ignore[misc]
    except Exception:
        pass

    return Result.ok(data={"db": db_ok, "redis": redis_ok})


app.add_exception_handler(BusinessException, business_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(AuthException, auth_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, general_exception_handler)

app.include_router(iam_router)


def main():
    """Run the FastAPI application with Uvicorn.

    Args:
        None

    Returns:
        None
    """
    uvicorn.run(
        "app.main:app",
        host=settings.server.HOST,
        port=settings.server.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    main()
