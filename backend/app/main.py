from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
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
from app.modules import auth_router, user_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifecycle management

    - startup: log info
    - shutdown: close Redis connection, dispose DB engine
    """
    # ===== Startup =====
    log.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    log.info(f"Debug mode: {settings.DEBUG}")

    yield

    # ===== Shutdown =====
    log.info("Shutting down application...")
    await close_redis()
    await engine.dispose()
    log.info("Application shut down")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Ello Bot Backend API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ============ OpenTelemetry ============

init_observability(app, engine.sync_engine)

# ============= Configure Middleware =============

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= Routes =============


@app.get("/health", response_model=Result)
async def health_check():
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


# =============== Exception Handlers ===============

app.add_exception_handler(BusinessException, business_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(AuthException, auth_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, general_exception_handler)

# =============== Include Routers ===============

app.include_router(auth_router)
app.include_router(user_router)

# =============== Main Entry Point ===============


def main():
    uvicorn.run(
        "app.main:app",
        host=settings.server.HOST,
        port=settings.server.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    main()
