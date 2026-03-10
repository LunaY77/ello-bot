"""Authentication dependency: opaque token → Redis session → AuthContext."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from pydantic import Field

from app.core.schema import ApiModel
from app.utils import extract_token, hash_token

from .exception import AuthException, CommonErrorCode, ErrorCode
from .redis import redis_client

# ── Auth context (decoded from Redis access session) ───────────────────────────


class AuthContext(ApiModel):
    """Lightweight auth context populated from the Redis access session.

    This is what every protected route receives — no DB lookup required.
    """

    session_id: int = Field(..., description="auth_sessions.id")
    principal_id: int = Field(..., description="principals.id")
    tenant_id: int = Field(..., description="Active tenant id")
    principal_type: str = Field(..., description="user / agent / service_account")
    session_version: int = Field(..., description="principals.session_version at login time")
    authz_version: int = Field(..., description="principals.authz_version at login time")


# ── Auth dependency ────────────────────────────────────────────────────────────


def _access_session_key(token_hash: str) -> str:
    from app.modules.iam.consts import IamRedisKey

    return IamRedisKey.ACCESS_SESSION.key(token_hash)


async def require_auth(request: Request) -> AuthContext:
    """Route dependency: validate opaque access token, return AuthContext.

    Flow:
        1. Extract Bearer token from Authorization header
        2. SHA-256 hash → Redis lookup
        3. Parse AccessSessionPayload → AuthContext
        4. 401 on any failure
    """
    from app.modules.iam.schemas import AccessSessionPayload

    try:
        token = extract_token(request)
    except RuntimeError as exc:
        code: ErrorCode = exc.args[0] if exc.args else CommonErrorCode.UNAUTHORIZED
        raise AuthException(code) from exc

    token_hash = hash_token(token)
    raw = await redis_client.get(_access_session_key(token_hash))
    if not raw:
        raise AuthException(CommonErrorCode.TOKEN_INVALID)

    try:
        payload: AccessSessionPayload = AccessSessionPayload.model_validate_json(raw)
    except Exception as exc:
        raise AuthException(CommonErrorCode.TOKEN_INVALID) from exc

    return AuthContext(
        session_id=payload.session_id,
        principal_id=payload.principal_id,
        tenant_id=payload.tenant_id,
        principal_type=payload.principal_type,
        session_version=payload.session_version,
        authz_version=payload.authz_version,
    )


CurrentAuthDep = Annotated[AuthContext, Depends(require_auth)]
