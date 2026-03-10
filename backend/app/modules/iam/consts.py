"""IAM module constants: default tenant, avatars, role codes, permission codes, Redis key defs."""

from app.core import RedisKeyDef

# ── Default tenant ─────────────────────────────────────────────────────────────

DEFAULT_TENANT_SLUG = "personal"
DEFAULT_TENANT_NAME = "Personal"

# ── Default avatars ────────────────────────────────────────────────────────────

DEFAULT_USER_AVATAR_URL = "/static/avatars/default-user.jpeg"
DEFAULT_AGENT_AVATAR_URL = "/static/avatars/default-agent.png"

# ── Principal types ────────────────────────────────────────────────────────────


class PrincipalType:
    USER = "user"
    AGENT = "agent"
    SERVICE_ACCOUNT = "service_account"


# ── Membership status ──────────────────────────────────────────────────────────


class MembershipStatus:
    ACTIVE = "active"
    INVITED = "invited"
    DISABLED = "disabled"


# ── ACL effect ─────────────────────────────────────────────────────────────────


class AclEffect:
    ALLOW = "allow"
    DENY = "deny"


# ── Built-in role codes ────────────────────────────────────────────────────────


class RoleCode:
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    AGENT_RUNNER = "agent_runner"


# ── Built-in permission codes ──────────────────────────────────────────────────


class PermissionCode:
    USER_READ = "user.read"
    USER_UPDATE_SELF = "user.update_self"
    AGENT_READ = "agent.read"
    AGENT_MANAGE = "agent.manage"
    TOOL_READ = "tool.read"
    TOOL_INVOKE = "tool.invoke"
    TOOL_MANAGE = "tool.manage"
    WORKFLOW_READ = "workflow.read"
    WORKFLOW_EXECUTE = "workflow.execute"
    WORKFLOW_MANAGE = "workflow.manage"
    TENANT_MANAGE = "tenant.manage"


BUILTIN_PERMISSIONS: list[tuple[str, str, str, str]] = [
    (PermissionCode.USER_READ, "user", "read", "Read user profiles"),
    (PermissionCode.USER_UPDATE_SELF, "user", "update_self", "Update own profile"),
    (PermissionCode.AGENT_READ, "agent", "read", "Read agent profiles"),
    (PermissionCode.AGENT_MANAGE, "agent", "manage", "Create/update/delete agents"),
    (PermissionCode.TOOL_READ, "tool", "read", "Read tools"),
    (PermissionCode.TOOL_INVOKE, "tool", "invoke", "Invoke tools"),
    (PermissionCode.TOOL_MANAGE, "tool", "manage", "Create/update/delete tools"),
    (PermissionCode.WORKFLOW_READ, "workflow", "read", "Read workflows"),
    (PermissionCode.WORKFLOW_EXECUTE, "workflow", "execute", "Execute workflows"),
    (
        PermissionCode.WORKFLOW_MANAGE,
        "workflow",
        "manage",
        "Create/update/delete workflows",
    ),
    (PermissionCode.TENANT_MANAGE, "tenant", "manage", "Manage tenant settings and members"),
]

BUILTIN_ROLES: list[tuple[str, str, str, bool]] = [
    (RoleCode.OWNER, "Owner", "Tenant owner with full access", True),
    (RoleCode.ADMIN, "Admin", "Administrator with broad access", True),
    (RoleCode.MEMBER, "Member", "Regular tenant member", True),
    (RoleCode.AGENT_RUNNER, "Agent Runner", "Can read and invoke tools/workflows", True),
]

BUILTIN_ROLE_PERMISSIONS: dict[str, list[str]] = {
    RoleCode.OWNER: [
        PermissionCode.USER_READ,
        PermissionCode.USER_UPDATE_SELF,
        PermissionCode.AGENT_READ,
        PermissionCode.AGENT_MANAGE,
        PermissionCode.TOOL_READ,
        PermissionCode.TOOL_INVOKE,
        PermissionCode.TOOL_MANAGE,
        PermissionCode.WORKFLOW_READ,
        PermissionCode.WORKFLOW_EXECUTE,
        PermissionCode.WORKFLOW_MANAGE,
        PermissionCode.TENANT_MANAGE,
    ],
    RoleCode.ADMIN: [
        PermissionCode.USER_READ,
        PermissionCode.USER_UPDATE_SELF,
        PermissionCode.AGENT_READ,
        PermissionCode.AGENT_MANAGE,
        PermissionCode.TOOL_READ,
        PermissionCode.TOOL_INVOKE,
        PermissionCode.TOOL_MANAGE,
        PermissionCode.WORKFLOW_READ,
        PermissionCode.WORKFLOW_EXECUTE,
        PermissionCode.WORKFLOW_MANAGE,
    ],
    RoleCode.MEMBER: [
        PermissionCode.USER_READ,
        PermissionCode.USER_UPDATE_SELF,
        PermissionCode.AGENT_READ,
        PermissionCode.TOOL_READ,
        PermissionCode.TOOL_INVOKE,
        PermissionCode.WORKFLOW_READ,
        PermissionCode.WORKFLOW_EXECUTE,
    ],
    RoleCode.AGENT_RUNNER: [
        PermissionCode.TOOL_READ,
        PermissionCode.TOOL_INVOKE,
        PermissionCode.WORKFLOW_READ,
        PermissionCode.WORKFLOW_EXECUTE,
    ],
}

# ── Access token TTL ───────────────────────────────────────────────────────────

ACCESS_TOKEN_TTL_SECONDS = 30 * 60
REFRESH_TOKEN_TTL_DAYS = 30


class IamRedisKey:
    """ello:session:* and ello:authz:* key namespace."""

    ACCESS_SESSION = RedisKeyDef(
        "ello:session:access:{}",
        expire_seconds=ACCESS_TOKEN_TTL_SECONDS,
        description="Access token session snapshot (key: sha256 hex of raw access token)",
    )

    AUTHZ_SNAPSHOT = RedisKeyDef(
        "ello:authz:snapshot:{}:{}:v{}",
        expire_seconds=10 * 60,
        description=(
            "RBAC permission snapshot. "
            "Args: tenant_id, principal_id, authz_version. "
            "Value: JSON-encoded list of permission codes."
        ),
    )
