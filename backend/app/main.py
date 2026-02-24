import uuid as _uuid
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core import (
    BusinessException,
    CommonErrorCode,
    business_exception_handler,
    general_exception_handler,
    log,
    reset_current_user,
    set_current_user,
    settings,
    validation_exception_handler,
)
from app.core.database import SessionLocal
from app.core.result import Result
from app.model.user import User
from app.router import auth_router, user_router
from app.utils import decode_access_token, extract_token


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

PUBLIC_PATHS = ["/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico", "/api/auth/"]


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Injects a unique X-Request-ID header into every response for tracing."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(_uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class AuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware to validate JWT tokens

    This middleware extracts the Bearer token from the Authorization header,
    decodes and validates it, and attaches the current user information to the request state.

    It raises RuntimeError with appropriate error codes for unauthorized access or invalid tokens.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        try:
            token = extract_token(request)
            payload = decode_access_token(token)

            user_id = int(payload["sub"])
            with SessionLocal() as db:
                user = db.scalar(select(User).where(User.id == user_id))

            if not user or not user.is_active:
                return JSONResponse(
                    status_code=HTTPStatus.UNAUTHORIZED,
                    content=Result.fail(
                        code=CommonErrorCode.UNAUTHORIZED.error_code,
                        message=CommonErrorCode.UNAUTHORIZED.error_msg,
                    ).model_dump(),
                )

            ctx_token = set_current_user(user)
            try:
                return await call_next(request)
            finally:
                reset_current_user(ctx_token)

        except RuntimeError as exc:
            error_code = exc.args[0] if exc.args else CommonErrorCode.UNAUTHORIZED
            return JSONResponse(
                status_code=HTTPStatus.UNAUTHORIZED,
                content=Result.fail(
                    code=error_code.error_code,
                    message=error_code.error_msg,
                ).model_dump(),
            )


# ============= Configure Middleware =============

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthMiddleware)
app.add_middleware(RequestIDMiddleware)


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
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, general_exception_handler)

# =============== Include Routers ===============

app.include_router(auth_router)
app.include_router(user_router)
