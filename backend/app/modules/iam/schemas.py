"""IAM module Pydantic schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated

from pydantic import AnyUrl, BeforeValidator, ConfigDict, Field, StringConstraints

from app.core import ApiModel

# ── Common constrained types ───────────────────────────────────────────────────

UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=20)]
Password = Annotated[str, StringConstraints(min_length=6, max_length=100)]
TenantSlug = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=64)]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]
OptionalDisplayName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)
]
CodeName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=64)]
TimeZoneName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


def _parse_url(v: object) -> str:
    from pydantic import TypeAdapter

    return str(TypeAdapter(AnyUrl).validate_python(v))


AvatarUrl = Annotated[str, BeforeValidator(_parse_url)]

# ── Redis access session payload ───────────────────────────────────────────────


class AccessSessionPayload(ApiModel):
    """Value stored in Redis under ello:session:access:{token_hash}."""

    session_id: int
    principal_id: int
    tenant_id: int
    principal_type: str
    session_version: int
    authz_version: int


# ── Auth requests / responses ─────────────────────────────────────────────────


class RegisterRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])
    display_name: OptionalDisplayName | None = Field(default=None, description="Display name")


class LoginRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])


class RefreshRequest(ApiModel):
    refresh_token: str = Field(..., description="Opaque refresh token")


class SwitchTenantRequest(ApiModel):
    tenant_id: int = Field(..., description="Target tenant id")


class ResetPasswordRequest(ApiModel):
    new_password: Password = Field(..., description="New password", examples=["newpassword123"])


# ── Shared responses ───────────────────────────────────────────────────────────


class TenantSummaryResponse(ApiModel):
    id: int
    slug: str
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PrincipalResponse(ApiModel):
    id: int
    principal_type: str
    display_name: str
    is_active: bool
    session_version: int
    authz_version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserAccountResponse(ApiModel):
    principal_id: int
    username: str
    avatar_url: str = ""
    bio: str = ""
    gender: str | None = None
    date_of_birth: date | None = None
    timezone: str | None = None
    display_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AgentAccountResponse(ApiModel):
    principal_id: int
    owner_principal_id: int | None = None
    code: str
    avatar_url: str = ""
    description: str = ""
    display_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AuthMeResponse(ApiModel):
    principal: PrincipalResponse
    tenant: TenantSummaryResponse
    user: UserAccountResponse | None = None
    agent: AgentAccountResponse | None = None


class AuthTokenResponse(ApiModel):
    user: UserAccountResponse | None = Field(default=None, description="Authenticated user account")
    agent: AgentAccountResponse | None = Field(
        default=None, description="Authenticated agent account"
    )
    tenant: TenantSummaryResponse = Field(..., description="Active tenant")
    access_token: str = Field(..., description="Opaque access token")
    refresh_token: str = Field(..., description="Opaque refresh token")


class SessionInfoResponse(ApiModel):
    id: int = Field(..., description="Session id")
    tenant_id: int = Field(..., description="Tenant id")
    user_agent: str = Field(default="", description="Client User-Agent")
    ip_address: str = Field(default="", description="Client IP address")
    expires_at: str = Field(..., description="Session expiration time (ISO 8601)")
    last_seen_at: str | None = Field(None, description="Last request time (ISO 8601)")

    model_config = ConfigDict(from_attributes=True)


# ── User account schemas ───────────────────────────────────────────────────────


class UpdateUserProfileRequest(ApiModel):
    display_name: OptionalDisplayName | None = Field(default=None)
    bio: str | None = Field(default=None, max_length=2000)
    gender: str | None = Field(default=None, max_length=32)
    date_of_birth: date | None = Field(default=None)
    timezone: TimeZoneName | None = Field(default=None)


class UpdateAvatarRequest(ApiModel):
    avatar_url: AvatarUrl = Field(..., description="Avatar URL")


class SetActiveRequest(ApiModel):
    is_active: bool = Field(..., description="Whether the principal is active")


# ── Agent schemas ──────────────────────────────────────────────────────────────


class CreateAgentRequest(ApiModel):
    code: CodeName = Field(..., description="Stable unique agent code")
    display_name: DisplayName = Field(..., description="Display name")
    description: str = Field(default="", max_length=4000)
    avatar_url: AvatarUrl | None = Field(default=None)
    owner_principal_id: int | None = Field(default=None)


class UpdateAgentRequest(ApiModel):
    display_name: OptionalDisplayName | None = Field(default=None)
    description: str | None = Field(default=None, max_length=4000)
    avatar_url: AvatarUrl | None = Field(default=None)


class ChangeAgentOwnerRequest(ApiModel):
    owner_principal_id: int | None = Field(default=None)


# ── Tenant schemas ─────────────────────────────────────────────────────────────


class CreateTenantRequest(ApiModel):
    slug: TenantSlug = Field(..., description="Tenant slug")
    name: str = Field(..., min_length=1, max_length=128)


class UpdateTenantRequest(ApiModel):
    slug: TenantSlug | None = Field(default=None)
    name: str | None = Field(default=None, min_length=1, max_length=128)
    is_active: bool | None = Field(default=None)


class MembershipResponse(ApiModel):
    id: int
    tenant_id: int
    principal_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateMembershipRequest(ApiModel):
    principal_id: int
    status: str = Field(default="active", min_length=1, max_length=32)


class UpdateMembershipRequest(ApiModel):
    status: str = Field(..., min_length=1, max_length=32)


# ── Role / permission schemas ─────────────────────────────────────────────────


class PermissionResponse(ApiModel):
    id: int
    code: str
    resource_type: str
    action: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(ApiModel):
    id: int
    tenant_id: int
    code: str
    name: str
    description: str
    is_builtin: bool
    created_at: datetime
    updated_at: datetime
    permissions: list[PermissionResponse] = Field(default_factory=list)


class CreateRoleRequest(ApiModel):
    code: CodeName
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(default="", max_length=255)


class UpdateRoleRequest(ApiModel):
    code: CodeName | None = None
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = Field(default=None, max_length=255)


class ReplaceRolePermissionsRequest(ApiModel):
    permission_ids: list[int] = Field(default_factory=list)


class CreatePermissionRequest(ApiModel):
    code: str = Field(..., min_length=3, max_length=128)
    resource_type: str = Field(..., min_length=1, max_length=64)
    action: str = Field(..., min_length=1, max_length=64)
    description: str = Field(default="", max_length=255)


class UpdatePermissionRequest(ApiModel):
    code: str | None = Field(default=None, min_length=3, max_length=128)
    resource_type: str | None = Field(default=None, min_length=1, max_length=64)
    action: str | None = Field(default=None, min_length=1, max_length=64)
    description: str | None = Field(default=None, max_length=255)


# ── ACL schemas ────────────────────────────────────────────────────────────────


class AclEntryResponse(ApiModel):
    id: int
    tenant_id: int
    resource_type: str
    resource_id: int
    permission_id: int
    subject_principal_id: int | None = None
    subject_role_id: int | None = None
    effect: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateAclEntryRequest(ApiModel):
    resource_type: str = Field(..., min_length=1, max_length=64)
    resource_id: int
    permission_id: int
    subject_principal_id: int | None = None
    subject_role_id: int | None = None
    effect: str = Field(..., min_length=1, max_length=16)


class UpdateAclEntryRequest(ApiModel):
    permission_id: int | None = None
    subject_principal_id: int | None = None
    subject_role_id: int | None = None
    effect: str | None = Field(default=None, min_length=1, max_length=16)


# ── Principal inspection responses ─────────────────────────────────────────────


class PrincipalMembershipResponse(ApiModel):
    membership: MembershipResponse
    tenant: TenantSummaryResponse


class PrincipalRoleAssignmentResponse(ApiModel):
    role: RoleResponse


class PrincipalPermissionSnapshotResponse(ApiModel):
    tenant_id: int
    principal_id: int
    permission_codes: list[str]
