"""Auth/session routes."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import CurrentAuthDep, SessionServiceDep
from app.api.schemas.common import Result
from app.api.schemas.session import (
    AuthTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SessionInfoResponse,
)
from app.core.constants import API_PREFIX

router = APIRouter(prefix=f"{API_PREFIX}/sessions", tags=["Sessions"])


def _client_ip(request: Request) -> str:
    """Return the best-effort client IP string from the request.

    Args:
        request: Incoming HTTP request.

    Returns:
        The client host string when FastAPI exposes it, otherwise an empty string.
    """
    return request.client.host if request.client is not None else ""


@router.post("/register", response_model=Result[AuthTokenResponse])
async def register(payload: RegisterRequest, request: Request, service: SessionServiceDep):
    """Register a user account and immediately issue session tokens.

    Args:
        payload: Registration payload validated by the schema layer.
        request: Incoming HTTP request used for metadata extraction.
        service: Session application service.

    Returns:
        Shared response envelope containing the new auth tokens.
    """
    state = await service.register(
        username=payload.username,
        password=payload.password,
        display_name=payload.display_name,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=_client_ip(request),
    )
    return Result.ok(data=AuthTokenResponse.from_state(state))


@router.post("/login", response_model=Result[AuthTokenResponse])
async def login(payload: LoginRequest, request: Request, service: SessionServiceDep):
    """Authenticate a user and issue a new pair of opaque tokens.

    Args:
        payload: Login payload validated by the schema layer.
        request: Incoming HTTP request used for metadata extraction.
        service: Session application service.

    Returns:
        Shared response envelope containing the authenticated session state.
    """
    state = await service.login(
        username=payload.username,
        password=payload.password,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=_client_ip(request),
    )
    return Result.ok(data=AuthTokenResponse.from_state(state))


@router.post("/refresh", response_model=Result[AuthTokenResponse])
async def refresh(payload: RefreshRequest, request: Request, service: SessionServiceDep):
    """Rotate an existing auth session using the supplied refresh token.

    Args:
        payload: Refresh payload validated by the schema layer.
        request: Incoming HTTP request used for metadata extraction.
        service: Session application service.

    Returns:
        Shared response envelope containing the rotated auth tokens.
    """
    state = await service.refresh(
        refresh_token=payload.refresh_token,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=_client_ip(request),
    )
    return Result.ok(data=AuthTokenResponse.from_state(state))


@router.post("/logout", response_model=Result[None])
async def logout(auth: CurrentAuthDep, service: SessionServiceDep):
    """Revoke the current access token and remove its cached snapshot.

    Args:
        auth: Authenticated request context.
        service: Session application service.

    Returns:
        Shared success envelope without payload data.
    """
    await service.logout(access_token=auth.access_token)
    return Result.ok()


@router.post("/logout-all", response_model=Result[None])
async def logout_all(auth: CurrentAuthDep, service: SessionServiceDep):
    """Revoke all active sessions for the authenticated user.

    Args:
        auth: Authenticated request context.
        service: Session application service.

    Returns:
        Shared success envelope without payload data.
    """
    await service.logout_all(user_id=auth.user_id)
    return Result.ok()


@router.get("/list", response_model=Result[list[SessionInfoResponse]])
async def list_sessions(auth: CurrentAuthDep, service: SessionServiceDep):
    """List active auth sessions for the authenticated user.

    Args:
        auth: Authenticated request context.
        service: Session application service.

    Returns:
        Shared response envelope containing active session summaries.
    """
    sessions = await service.list_sessions(user_id=auth.user_id)
    return Result.ok(data=[SessionInfoResponse.from_domain(item) for item in sessions])
