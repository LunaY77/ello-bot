"""IAM router: auth, accounts, tenants, RBAC and ACL management."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.core import AuthException, CommonErrorCode, CurrentAuthDep, Result
from app.utils import extract_token, hash_token

from .commands import IamCommandsDep
from .consts import PermissionCode
from .queries import IamQueriesDep
from .schemas import (
    AclEntryResponse,
    AgentAccountResponse,
    AuthMeResponse,
    AuthTokenResponse,
    ChangeAgentOwnerRequest,
    CreateAclEntryRequest,
    CreateAgentRequest,
    CreateMembershipRequest,
    CreatePermissionRequest,
    CreateRoleRequest,
    CreateTenantRequest,
    LoginRequest,
    MembershipResponse,
    PermissionResponse,
    PrincipalMembershipResponse,
    PrincipalPermissionSnapshotResponse,
    PrincipalResponse,
    PrincipalRoleAssignmentResponse,
    RefreshRequest,
    RegisterRequest,
    ReplaceRolePermissionsRequest,
    ResetPasswordRequest,
    RoleResponse,
    SessionInfoResponse,
    SetActiveRequest,
    SwitchTenantRequest,
    TenantSummaryResponse,
    UpdateAclEntryRequest,
    UpdateAgentRequest,
    UpdateAvatarRequest,
    UpdateMembershipRequest,
    UpdatePermissionRequest,
    UpdateRoleRequest,
    UpdateTenantRequest,
    UpdateUserProfileRequest,
    UserAccountResponse,
)
from .workflow import IamWorkflowDep

router = APIRouter(prefix="/api/iam", tags=["IAM"])


# ── Helpers ───────────────────────────────────────────────────────────────────


def _permission_response(permission) -> PermissionResponse:
    """Convert a permission ORM object into its response model.

    Args:
        permission: The permission ORM object being processed.

    Returns:
        The `PermissionResponse` result for the operation.
    """
    return PermissionResponse.model_validate(permission)


def _role_response(role) -> RoleResponse:
    """Convert a role ORM object and its permission graph into its response model.

    Args:
        role: The role ORM object being processed.

    Returns:
        The `RoleResponse` result for the operation.
    """
    permissions = []
    for link in getattr(role, "permission_links", []):
        if link.permission is not None:
            permissions.append(_permission_response(link.permission))
    return RoleResponse(
        id=role.id,
        tenant_id=role.tenant_id,
        code=role.code,
        name=role.name,
        description=role.description,
        is_builtin=role.is_builtin,
        created_at=role.created_at,
        updated_at=role.updated_at,
        permissions=permissions,
    )


async def _ensure_scope_permission(
    auth,
    queries,
    permission_code: str,
    tenant_id: int | None = None,
) -> None:
    """Require a permission code inside the current tenant scope.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        permission_code: The permission code required by the operation.
        tenant_id: The tenant identifier for the current operation.

    Returns:
        None
    """
    scoped_tenant_id = tenant_id if tenant_id is not None else auth.tenant_id
    # The current access token may not be reused to manage a different tenant implicitly.
    if scoped_tenant_id != auth.tenant_id:
        raise AuthException(CommonErrorCode.FORBIDDEN)
    codes = await queries.get_permission_codes(
        auth.tenant_id,
        auth.principal_id,
        auth.authz_version,
    )
    if permission_code not in codes:
        raise AuthException(CommonErrorCode.FORBIDDEN)


async def _ensure_visible_tenant(auth, queries, tenant_id: int) -> None:
    """Require that the authenticated principal can see the tenant.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        tenant_id: The tenant identifier for the current operation.

    Returns:
        None
    """
    if tenant_id == auth.tenant_id:
        return
    membership = await queries.get_membership(tenant_id, auth.principal_id)
    if membership is None:
        raise AuthException(CommonErrorCode.FORBIDDEN)


# ── Auth / sessions ───────────────────────────────────────────────────────────


@router.post("/auth/register", response_model=Result[AuthTokenResponse])
async def register(request: RegisterRequest, workflow: IamWorkflowDep):
    """Register a human user and return the initial auth session.

    Args:
        request: The incoming request payload or FastAPI request object.
        workflow: The IAM workflow service for cross-domain orchestration.

    Returns:
        None
    """
    return Result.ok(
        data=await workflow.register(request.username, request.password, request.display_name)
    )


@router.post("/auth/login", response_model=Result[AuthTokenResponse])
async def login(request: LoginRequest, workflow: IamWorkflowDep):
    """Authenticate a human user and return an auth session.

    Args:
        request: The incoming request payload or FastAPI request object.
        workflow: The IAM workflow service for cross-domain orchestration.

    Returns:
        None
    """
    return Result.ok(data=await workflow.login(request.username, request.password))


@router.post("/auth/refresh", response_model=Result[AuthTokenResponse])
async def refresh(body: RefreshRequest, workflow: IamWorkflowDep):
    """Refresh an auth session from a refresh token.

    Args:
        body: The validated request body.
        workflow: The IAM workflow service for cross-domain orchestration.

    Returns:
        None
    """
    return Result.ok(data=await workflow.refresh(body.refresh_token))


@router.post("/auth/logout", response_model=Result[None])
async def logout(request: Request, iam: IamCommandsDep, _: CurrentAuthDep):
    """Revoke the current access session.

    Args:
        request: The incoming request payload or FastAPI request object.
        iam: The IAM command service for write operations.
        _: Unused authenticated context required by dependency injection.

    Returns:
        None
    """
    token_hash = hash_token(extract_token(request))
    await iam.revoke_session_by_access_token_hash(token_hash)
    return Result.ok()


@router.post("/auth/logout-all", response_model=Result[None])
async def logout_all(auth: CurrentAuthDep, iam: IamCommandsDep):
    """Revoke every active session for the current principal.

    Args:
        auth: The authenticated request context.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await iam.revoke_all_sessions(auth.principal_id)
    return Result.ok()


@router.get("/auth/sessions", response_model=Result[list[SessionInfoResponse]])
async def list_sessions(auth: CurrentAuthDep, queries: IamQueriesDep):
    """List active sessions for the current principal.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    sessions = await queries.get_session_list(auth.principal_id)
    data = [
        SessionInfoResponse(
            id=s.id,
            tenant_id=s.tenant_id,
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            expires_at=s.expires_at.isoformat(),
            last_seen_at=s.last_seen_at.isoformat() if s.last_seen_at else None,
        )
        for s in sessions
    ]
    return Result.ok(data=data)


@router.delete("/auth/sessions/{session_id}", response_model=Result[None])
async def revoke_session(session_id: int, auth: CurrentAuthDep, iam: IamCommandsDep):
    """Revoke one active session owned by the current principal.

    Args:
        session_id: The auth session identifier.
        auth: The authenticated request context.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await iam.revoke_session_by_id(session_id, auth.principal_id)
    return Result.ok()


@router.post("/auth/switch-tenant", response_model=Result[AuthTokenResponse])
async def switch_tenant(
    body: SwitchTenantRequest,
    request: Request,
    auth: CurrentAuthDep,
    iam: IamCommandsDep,
):
    """Switch the current session into another tenant membership scope.

    Args:
        body: The validated request body.
        request: The incoming request payload or FastAPI request object.
        auth: The authenticated request context.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    token_hash = hash_token(extract_token(request))
    data = await iam.switch_tenant(
        principal_id=auth.principal_id,
        access_token_hash=token_hash,
        target_tenant_id=body.tenant_id,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "",
    )
    return Result.ok(data=data)


@router.get("/auth/me", response_model=Result[AuthMeResponse])
async def auth_me(auth: CurrentAuthDep, workflow: IamWorkflowDep):
    """Return the authenticated principal profile payload.

    Args:
        auth: The authenticated request context.
        workflow: The IAM workflow service for cross-domain orchestration.

    Returns:
        None
    """
    return Result.ok(data=await workflow.get_auth_me(auth.principal_id, auth.tenant_id))


@router.post("/auth/password/reset", response_model=Result[None])
async def reset_password(
    request: ResetPasswordRequest,
    auth: CurrentAuthDep,
    iam: IamCommandsDep,
):
    """Reset the current user password.

    Args:
        request: The incoming request payload or FastAPI request object.
        auth: The authenticated request context.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await iam.reset_password(auth.principal_id, request.new_password)
    return Result.ok()


# ── Users ─────────────────────────────────────────────────────────────────────


@router.get("/users/me", response_model=Result[UserAccountResponse])
async def get_me(auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return the current user-account profile.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    user = await queries.get_user_by_principal_id(auth.principal_id)
    if user is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=iam_user_response(user))


@router.patch("/users/me", response_model=Result[UserAccountResponse])
async def update_me(
    body: UpdateUserProfileRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update the current user-account profile.

    Args:
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.USER_UPDATE_SELF)
    user = await iam.update_user_profile(
        principal_id=auth.principal_id,
        display_name=body.display_name,
        bio=body.bio,
        gender=body.gender,
        date_of_birth=body.date_of_birth,
        timezone=body.timezone,
    )
    return Result.ok(data=iam_user_response(user))


@router.put("/users/me/avatar", response_model=Result[UserAccountResponse])
async def update_my_avatar(
    body: UpdateAvatarRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update the current user avatar URL.

    Args:
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.USER_UPDATE_SELF)
    user = await iam.update_user_avatar(auth.principal_id, body.avatar_url)
    return Result.ok(data=iam_user_response(user))


@router.get("/users", response_model=Result[list[UserAccountResponse]])
async def list_users(
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    tenant_id: int | None = Query(default=None),
):
    """List user accounts visible in the requested tenant scope.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        tenant_id: The tenant identifier for the current operation.

    Returns:
        None
    """
    scoped_tenant_id = tenant_id or auth.tenant_id
    await _ensure_scope_permission(auth, queries, PermissionCode.USER_READ, scoped_tenant_id)
    users = await queries.list_users(scoped_tenant_id)
    return Result.ok(data=[iam_user_response(user) for user in users])


@router.get("/users/{principal_id}", response_model=Result[UserAccountResponse])
async def get_user(principal_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one user account by principal id.

    Args:
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.USER_READ)
    user = await queries.get_user_by_principal_id(principal_id)
    if user is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=iam_user_response(user))


@router.patch("/users/{principal_id}/active", response_model=Result[PrincipalResponse])
async def set_user_active(
    principal_id: int,
    body: SetActiveRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Activate or deactivate a user principal.

    Args:
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    principal = await iam.set_principal_active(principal_id, body.is_active)
    return Result.ok(data=PrincipalResponse.model_validate(principal))


# ── Agents ────────────────────────────────────────────────────────────────────


@router.post("/agents", response_model=Result[AgentAccountResponse])
async def create_agent(
    body: CreateAgentRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Create an agent account in the current tenant.

    Args:
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    principal, agent = await iam.create_agent_account(
        tenant_id=auth.tenant_id,
        code=body.code,
        display_name=body.display_name,
        description=body.description,
        avatar_url=body.avatar_url,
        owner_principal_id=body.owner_principal_id,
    )
    return Result.ok(data=iam_agent_response(agent, principal=principal))


@router.get("/agents", response_model=Result[list[AgentAccountResponse]])
async def list_agents(
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    tenant_id: int | None = Query(default=None),
):
    """List agent accounts visible in the requested tenant scope.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        tenant_id: The tenant identifier for the current operation.

    Returns:
        None
    """
    scoped_tenant_id = tenant_id or auth.tenant_id
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_READ, scoped_tenant_id)
    agents = await queries.list_agents(scoped_tenant_id)
    return Result.ok(data=[iam_agent_response(agent) for agent in agents])


@router.get("/agents/{principal_id}", response_model=Result[AgentAccountResponse])
async def get_agent(principal_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one agent account by principal id.

    Args:
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_READ)
    agent = await queries.get_agent_by_principal_id(principal_id)
    if agent is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=iam_agent_response(agent))


@router.patch("/agents/{principal_id}", response_model=Result[AgentAccountResponse])
async def update_agent(
    principal_id: int,
    body: UpdateAgentRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update an agent account profile.

    Args:
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    agent = await iam.update_agent(
        principal_id=principal_id,
        display_name=body.display_name,
        description=body.description,
        avatar_url=body.avatar_url,
    )
    return Result.ok(data=iam_agent_response(agent))


@router.put("/agents/{principal_id}/avatar", response_model=Result[AgentAccountResponse])
async def update_agent_avatar(
    principal_id: int,
    body: UpdateAvatarRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update an agent avatar URL.

    Args:
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    agent = await iam.update_agent(principal_id=principal_id, avatar_url=body.avatar_url)
    return Result.ok(data=iam_agent_response(agent))


@router.patch("/agents/{principal_id}/owner", response_model=Result[AgentAccountResponse])
async def change_agent_owner(
    principal_id: int,
    body: ChangeAgentOwnerRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Change the human owner of an agent account.

    Args:
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    agent = await iam.set_agent_owner(principal_id, body.owner_principal_id)
    return Result.ok(data=iam_agent_response(agent))


@router.patch("/agents/{principal_id}/active", response_model=Result[PrincipalResponse])
async def set_agent_active(
    principal_id: int,
    body: SetActiveRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Activate or deactivate an agent principal.

    Args:
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    principal = await iam.set_principal_active(principal_id, body.is_active)
    return Result.ok(data=PrincipalResponse.model_validate(principal))


@router.delete("/agents/{principal_id}", response_model=Result[None])
async def delete_agent(
    principal_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Delete an agent account.

    Args:
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.AGENT_MANAGE)
    await iam.delete_agent(principal_id)
    return Result.ok()


# ── Tenants ───────────────────────────────────────────────────────────────────


@router.post("/tenants", response_model=Result[TenantSummaryResponse])
async def create_tenant(request: CreateTenantRequest, auth: CurrentAuthDep, iam: IamCommandsDep):
    """Create a new tenant owned by the current principal.

    Args:
        request: The incoming request payload or FastAPI request object.
        auth: The authenticated request context.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    tenant = await iam.create_tenant(request.slug, request.name, auth.principal_id)
    return Result.ok(data=TenantSummaryResponse.model_validate(tenant))


@router.get("/tenants", response_model=Result[list[TenantSummaryResponse]])
async def list_tenants(auth: CurrentAuthDep, queries: IamQueriesDep):
    """List tenants visible to the current principal.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    tenants = await queries.list_visible_tenants(auth.principal_id)
    return Result.ok(data=[TenantSummaryResponse.model_validate(tenant) for tenant in tenants])


@router.get("/tenants/{tenant_id}", response_model=Result[TenantSummaryResponse])
async def get_tenant(tenant_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one visible tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_visible_tenant(auth, queries, tenant_id)
    tenant = await queries.get_tenant(tenant_id)
    if tenant is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=TenantSummaryResponse.model_validate(tenant))


@router.patch("/tenants/{tenant_id}", response_model=Result[TenantSummaryResponse])
async def update_tenant(
    tenant_id: int,
    body: UpdateTenantRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update tenant metadata.

    Args:
        tenant_id: The tenant identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    tenant = await iam.update_tenant(tenant_id, body.slug, body.name, body.is_active)
    return Result.ok(data=TenantSummaryResponse.model_validate(tenant))


@router.delete("/tenants/{tenant_id}", response_model=Result[None])
async def delete_tenant(
    tenant_id: int, auth: CurrentAuthDep, queries: IamQueriesDep, iam: IamCommandsDep
):
    """Delete a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.delete_tenant(tenant_id)
    return Result.ok()


# ── Memberships ───────────────────────────────────────────────────────────────


@router.get("/tenants/{tenant_id}/members", response_model=Result[list[MembershipResponse]])
async def list_members(tenant_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """List tenant memberships.

    Args:
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    memberships = await queries.list_memberships_for_tenant(tenant_id)
    return Result.ok(
        data=[MembershipResponse.model_validate(membership) for membership in memberships]
    )


@router.post("/tenants/{tenant_id}/members", response_model=Result[MembershipResponse])
async def add_member(
    tenant_id: int,
    body: CreateMembershipRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Add a principal to a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    membership = await iam.add_membership(tenant_id, body.principal_id, body.status)
    return Result.ok(data=MembershipResponse.model_validate(membership))


@router.patch(
    "/tenants/{tenant_id}/members/{principal_id}", response_model=Result[MembershipResponse]
)
async def update_member(
    tenant_id: int,
    principal_id: int,
    body: UpdateMembershipRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update a tenant membership record.

    Args:
        tenant_id: The tenant identifier for the current operation.
        principal_id: The principal identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    membership = await iam.update_membership(tenant_id, principal_id, body.status)
    return Result.ok(data=MembershipResponse.model_validate(membership))


@router.delete("/tenants/{tenant_id}/members/{principal_id}", response_model=Result[None])
async def delete_member(
    tenant_id: int,
    principal_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Remove a principal from a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.remove_membership(tenant_id, principal_id)
    return Result.ok()


@router.post(
    "/tenants/{tenant_id}/members/{principal_id}/roles/{role_id}",
    response_model=Result[None],
)
async def grant_role(
    tenant_id: int,
    principal_id: int,
    role_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Grant a tenant role to a principal.

    Args:
        tenant_id: The tenant identifier for the current operation.
        principal_id: The principal identifier for the current operation.
        role_id: The role identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.grant_role(tenant_id, principal_id, role_id)
    return Result.ok()


@router.delete(
    "/tenants/{tenant_id}/members/{principal_id}/roles/{role_id}",
    response_model=Result[None],
)
async def revoke_role(
    tenant_id: int,
    principal_id: int,
    role_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Revoke a tenant role from a principal.

    Args:
        tenant_id: The tenant identifier for the current operation.
        principal_id: The principal identifier for the current operation.
        role_id: The role identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.revoke_role(tenant_id, principal_id, role_id)
    return Result.ok()


# ── Roles ─────────────────────────────────────────────────────────────────────


@router.get("/tenants/{tenant_id}/roles", response_model=Result[list[RoleResponse]])
async def list_roles(tenant_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """List roles defined in a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    roles = await queries.list_roles(tenant_id)
    return Result.ok(data=[_role_response(role) for role in roles])


@router.post("/tenants/{tenant_id}/roles", response_model=Result[RoleResponse])
async def create_role(
    tenant_id: int,
    body: CreateRoleRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Create a custom role in a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    role = await iam.create_role(tenant_id, body.code, body.name, body.description)
    role = await queries.get_role(role.id)
    assert role is not None
    return Result.ok(data=_role_response(role))


@router.get("/tenants/{tenant_id}/roles/{role_id}", response_model=Result[RoleResponse])
async def get_role(tenant_id: int, role_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one tenant role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    role = await queries.get_role(role_id)
    if role is None or role.tenant_id != tenant_id:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=_role_response(role))


@router.patch("/tenants/{tenant_id}/roles/{role_id}", response_model=Result[RoleResponse])
async def update_role(
    tenant_id: int,
    role_id: int,
    body: UpdateRoleRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update a tenant role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    role = await iam.update_role(tenant_id, role_id, body.code, body.name, body.description)
    role = await queries.get_role(role.id)
    assert role is not None
    return Result.ok(data=_role_response(role))


@router.delete("/tenants/{tenant_id}/roles/{role_id}", response_model=Result[None])
async def delete_role(
    tenant_id: int,
    role_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Delete a tenant role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.delete_role(tenant_id, role_id)
    return Result.ok()


@router.put("/tenants/{tenant_id}/roles/{role_id}/permissions", response_model=Result[RoleResponse])
async def replace_role_permissions(
    tenant_id: int,
    role_id: int,
    body: ReplaceRolePermissionsRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Replace the permission set of a role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.replace_role_permissions(tenant_id, role_id, body.permission_ids)
    role = await queries.get_role(role_id)
    assert role is not None
    return Result.ok(data=_role_response(role))


@router.post(
    "/tenants/{tenant_id}/roles/{role_id}/permissions/{permission_id}",
    response_model=Result[None],
)
async def add_role_permission(
    tenant_id: int,
    role_id: int,
    permission_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Attach a permission to a role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        permission_id: The permission identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.add_permission_to_role(tenant_id, role_id, permission_id)
    return Result.ok()


@router.delete(
    "/tenants/{tenant_id}/roles/{role_id}/permissions/{permission_id}",
    response_model=Result[None],
)
async def delete_role_permission(
    tenant_id: int,
    role_id: int,
    permission_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Remove a permission from a role.

    Args:
        tenant_id: The tenant identifier for the current operation.
        role_id: The role identifier for the current operation.
        permission_id: The permission identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.remove_permission_from_role(tenant_id, role_id, permission_id)
    return Result.ok()


# ── Permissions ───────────────────────────────────────────────────────────────


@router.get("/permissions", response_model=Result[list[PermissionResponse]])
async def list_permissions(auth: CurrentAuthDep, queries: IamQueriesDep):
    """List every permission definition.

    Args:
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    permissions = await queries.list_permissions()
    return Result.ok(data=[_permission_response(permission) for permission in permissions])


@router.post("/permissions", response_model=Result[PermissionResponse])
async def create_permission(
    body: CreatePermissionRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Create a new permission definition.

    Args:
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    permission = await iam.create_permission(
        body.code, body.resource_type, body.action, body.description
    )
    return Result.ok(data=_permission_response(permission))


@router.get("/permissions/{permission_id}", response_model=Result[PermissionResponse])
async def get_permission(permission_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one permission definition.

    Args:
        permission_id: The permission identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    permission = await queries.get_permission_by_id(permission_id)
    if permission is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=_permission_response(permission))


@router.patch("/permissions/{permission_id}", response_model=Result[PermissionResponse])
async def update_permission(
    permission_id: int,
    body: UpdatePermissionRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update a permission definition.

    Args:
        permission_id: The permission identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    permission = await iam.update_permission(
        permission_id,
        body.code,
        body.resource_type,
        body.action,
        body.description,
    )
    return Result.ok(data=_permission_response(permission))


@router.delete("/permissions/{permission_id}", response_model=Result[None])
async def delete_permission(
    permission_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Delete a permission definition.

    Args:
        permission_id: The permission identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    await iam.delete_permission(permission_id)
    return Result.ok()


# ── ACL ───────────────────────────────────────────────────────────────────────


@router.get("/tenants/{tenant_id}/acl", response_model=Result[list[AclEntryResponse]])
async def list_acl_entries(
    tenant_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    resource_type: str | None = Query(default=None),
    resource_id: int | None = Query(default=None),
    permission_id: int | None = Query(default=None),
):
    """List ACL entries for a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        resource_type: The resource type involved in the operation.
        resource_id: The resource identifier involved in the operation.
        permission_id: The permission identifier for the current operation.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    acl_entries = await queries.list_acl_entries(
        tenant_id, resource_type, resource_id, permission_id
    )
    return Result.ok(data=[AclEntryResponse.model_validate(entry) for entry in acl_entries])


@router.post("/tenants/{tenant_id}/acl", response_model=Result[AclEntryResponse])
async def create_acl_entry(
    tenant_id: int,
    body: CreateAclEntryRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Create an ACL entry inside a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    entry = await iam.create_acl_entry(
        tenant_id=tenant_id,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        permission_id=body.permission_id,
        subject_principal_id=body.subject_principal_id,
        subject_role_id=body.subject_role_id,
        effect=body.effect,
    )
    return Result.ok(data=AclEntryResponse.model_validate(entry))


@router.get("/tenants/{tenant_id}/acl/{acl_id}", response_model=Result[AclEntryResponse])
async def get_acl_entry(tenant_id: int, acl_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one ACL entry inside a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        acl_id: The ACL entry identifier.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    entry = await queries.get_acl_entry(tenant_id, acl_id)
    if entry is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=AclEntryResponse.model_validate(entry))


@router.patch("/tenants/{tenant_id}/acl/{acl_id}", response_model=Result[AclEntryResponse])
async def update_acl_entry(
    tenant_id: int,
    acl_id: int,
    body: UpdateAclEntryRequest,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Update an ACL entry inside a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        acl_id: The ACL entry identifier.
        body: The validated request body.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    entry = await iam.update_acl_entry(
        tenant_id=tenant_id,
        acl_id=acl_id,
        permission_id=body.permission_id,
        subject_principal_id=body.subject_principal_id,
        subject_role_id=body.subject_role_id,
        effect=body.effect,
    )
    return Result.ok(data=AclEntryResponse.model_validate(entry))


@router.delete("/tenants/{tenant_id}/acl/{acl_id}", response_model=Result[None])
async def delete_acl_entry(
    tenant_id: int,
    acl_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
    iam: IamCommandsDep,
):
    """Delete an ACL entry inside a tenant.

    Args:
        tenant_id: The tenant identifier for the current operation.
        acl_id: The ACL entry identifier.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.
        iam: The IAM command service for write operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    await iam.delete_acl_entry(tenant_id, acl_id)
    return Result.ok()


# ── Principal inspection ──────────────────────────────────────────────────────


@router.get("/principals/{principal_id}", response_model=Result[PrincipalResponse])
async def get_principal(principal_id: int, auth: CurrentAuthDep, queries: IamQueriesDep):
    """Return one principal record.

    Args:
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    principal = await queries.get_principal(principal_id)
    if principal is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    return Result.ok(data=PrincipalResponse.model_validate(principal))


@router.get(
    "/principals/{principal_id}/memberships",
    response_model=Result[list[PrincipalMembershipResponse]],
)
async def get_principal_memberships(
    principal_id: int, auth: CurrentAuthDep, queries: IamQueriesDep
):
    """List memberships held by a principal.

    Args:
        principal_id: The principal identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE)
    memberships = await queries.list_memberships_for_principal(principal_id)
    data = [
        PrincipalMembershipResponse(
            membership=MembershipResponse.model_validate(membership),
            tenant=TenantSummaryResponse.model_validate(membership.tenant),
        )
        for membership in memberships
    ]
    return Result.ok(data=data)


@router.get(
    "/principals/{principal_id}/roles",
    response_model=Result[list[PrincipalRoleAssignmentResponse]],
)
async def get_principal_roles(
    principal_id: int,
    tenant_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
):
    """List roles granted to a principal inside a tenant.

    Args:
        principal_id: The principal identifier for the current operation.
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    roles = await queries.get_principal_roles(tenant_id, principal_id)
    return Result.ok(
        data=[PrincipalRoleAssignmentResponse(role=_role_response(role)) for role in roles]
    )


@router.get(
    "/principals/{principal_id}/permissions",
    response_model=Result[PrincipalPermissionSnapshotResponse],
)
async def get_principal_permissions(
    principal_id: int,
    tenant_id: int,
    auth: CurrentAuthDep,
    queries: IamQueriesDep,
):
    """Return the effective permission snapshot for a principal.

    Args:
        principal_id: The principal identifier for the current operation.
        tenant_id: The tenant identifier for the current operation.
        auth: The authenticated request context.
        queries: The IAM query service for read operations.

    Returns:
        None
    """
    await _ensure_scope_permission(auth, queries, PermissionCode.TENANT_MANAGE, tenant_id)
    principal = await queries.get_principal(principal_id)
    if principal is None:
        raise AuthException(CommonErrorCode.NOT_FOUND)
    permission_codes = sorted(
        await queries.get_permission_codes(tenant_id, principal_id, principal.authz_version)
    )
    return Result.ok(
        data=PrincipalPermissionSnapshotResponse(
            tenant_id=tenant_id,
            principal_id=principal_id,
            permission_codes=permission_codes,
        )
    )


# ── Response mappers ──────────────────────────────────────────────────────────


def iam_user_response(user, *, principal=None) -> UserAccountResponse:
    """Convert a user-account ORM object into its response model.

    Args:
        user: The `user` value.
        principal: The principal ORM object being processed.

    Returns:
        The serialized user-account response model.
    """
    from .commands import IamCommands

    return IamCommands._to_user_response(user, principal=principal)


def iam_agent_response(agent, *, principal=None) -> AgentAccountResponse:
    """Convert an agent-account ORM object into its response model.

    Args:
        agent: The `agent` value.
        principal: The principal ORM object being processed.

    Returns:
        The serialized agent-account response model.
    """
    from .commands import IamCommands

    return IamCommands._to_agent_response(agent, principal=principal)
