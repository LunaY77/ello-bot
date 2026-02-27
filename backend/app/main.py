import uuid as _uuid
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware

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
from app.router import auth_router, user_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifecycle management

    Contains startup and shutdown events:
    - startup: Print startup info, initialize resources
    - shutdown: Clean up resources, save state

    Args:
        app: FastAPI application instance
    """
    # ===== Startup =====
    log.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    log.info(f"Debug mode: {settings.DEBUG}")

    yield

    # ===== Shutdown =====
    log.info("Shutting down application...")
    log.info("Application shut down")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Ello Bot Backend API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ============ Middleware ============


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Injects a unique X-Request-ID header into every response for tracing."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(_uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ============= Configure Middleware =============

app.add_middleware(RequestIDMiddleware)
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
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return Result.ok(data={"db": db_ok})


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
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    main()
