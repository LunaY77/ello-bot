"""API dependency helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request

from app.core import AuthException, CommonErrorCode, hash_token
from app.runtime import AppRuntime


@dataclass(slots=True)
class AuthContext:
    """Authenticated request context rebuilt from the access-token snapshot."""

    session_id: int
    user_id: int
    username: str
    display_name: str
    session_version: int
    access_token: str


def get_runtime(request: Request) -> AppRuntime:
    """Return the started application runtime stored on FastAPI state.

    Args:
        request: Incoming request carrying the application state.

    Returns:
        The application runtime initialized during lifespan startup.
    """
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        raise RuntimeError("Application runtime is not available")
    return runtime


def get_user_service(runtime: Annotated[AppRuntime, Depends(get_runtime)]):
    """Resolve the user application service from the runtime container.

    Args:
        runtime: Started application runtime for the current process.

    Returns:
        The user application service instance.
    """
    return runtime.services.user


def get_session_service(runtime: Annotated[AppRuntime, Depends(get_runtime)]):
    """Resolve the session application service from the runtime container.

    Args:
        runtime: Started application runtime for the current process.

    Returns:
        The session application service instance.
    """
    return runtime.services.session


def _extract_access_token(request: Request) -> str:
    """Extract the bearer token from the incoming request.

    Args:
        request: Incoming request carrying the authorization header.

    Returns:
        The opaque access token provided by the client.
    """
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth:
        raise AuthException(CommonErrorCode.UNAUTHORIZED)
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AuthException(CommonErrorCode.TOKEN_INVALID)
    return token


async def require_auth(
    request: Request,
    runtime: Annotated[AppRuntime, Depends(get_runtime)],
) -> AuthContext:
    """Resolve the authenticated user context from the Redis access snapshot.

    Args:
        request: Incoming request carrying the bearer token.
        runtime: Started application runtime for the current process.

    Returns:
        The authenticated request context reconstructed from Redis.
    """
    token = _extract_access_token(request)
    # Access tokens are validated against Redis snapshots so protected routes avoid a DB lookup.
    snapshot = await runtime.resources.access_session_store.get(token_hash=hash_token(token))
    if snapshot is None:
        raise AuthException(CommonErrorCode.TOKEN_INVALID)
    return AuthContext(
        session_id=snapshot.session_id,
        user_id=snapshot.user_id,
        username=snapshot.username,
        display_name=snapshot.display_name,
        session_version=snapshot.session_version,
        access_token=token,
    )


RuntimeDep = Annotated[AppRuntime, Depends(get_runtime)]
UserServiceDep = Annotated[object, Depends(get_user_service)]
SessionServiceDep = Annotated[object, Depends(get_session_service)]
CurrentAuthDep = Annotated[AuthContext, Depends(require_auth)]
