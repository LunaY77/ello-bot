"""seed iam default data

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-03-10 09:41:00.000000

Inserts:
- 1 default tenant: personal
- 11 built-in permissions
- 4 built-in roles: owner / admin / member / agent_runner
- role_permissions mappings
"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a1"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# ── Seed data ─────────────────────────────────────────────────────────────────

_TENANT_SLUG = "personal"
_TENANT_NAME = "Personal"

_PERMISSIONS = [
    ("user.read", "user", "read", "Read user profiles"),
    ("user.update_self", "user", "update_self", "Update own profile"),
    ("agent.read", "agent", "read", "Read agent profiles"),
    ("agent.manage", "agent", "manage", "Create/update/delete agents"),
    ("tool.read", "tool", "read", "Read tools"),
    ("tool.invoke", "tool", "invoke", "Invoke tools"),
    ("tool.manage", "tool", "manage", "Create/update/delete tools"),
    ("workflow.read", "workflow", "read", "Read workflows"),
    ("workflow.execute", "workflow", "execute", "Execute workflows"),
    ("workflow.manage", "workflow", "manage", "Create/update/delete workflows"),
    ("tenant.manage", "tenant", "manage", "Manage tenant settings and members"),
]

_ROLES = [
    ("owner", "Owner", "Tenant owner with full access", True),
    ("admin", "Admin", "Administrator with broad access", True),
    ("member", "Member", "Regular tenant member", True),
    ("agent_runner", "Agent Runner", "Can read and invoke tools/workflows", True),
]

# role_code → list of permission codes
_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": [
        "user.read",
        "user.update_self",
        "agent.read",
        "agent.manage",
        "tool.read",
        "tool.invoke",
        "tool.manage",
        "workflow.read",
        "workflow.execute",
        "workflow.manage",
        "tenant.manage",
    ],
    "admin": [
        "user.read",
        "user.update_self",
        "agent.read",
        "agent.manage",
        "tool.read",
        "tool.invoke",
        "tool.manage",
        "workflow.read",
        "workflow.execute",
        "workflow.manage",
    ],
    "member": [
        "user.read",
        "user.update_self",
        "agent.read",
        "tool.read",
        "tool.invoke",
        "workflow.read",
        "workflow.execute",
    ],
    "agent_runner": [
        "tool.read",
        "tool.invoke",
        "workflow.read",
        "workflow.execute",
    ],
}


def upgrade() -> None:
    conn = op.get_bind()

    # ── Insert default tenant ──────────────────────────────────────────────────
    result = conn.execute(
        text(
            "INSERT INTO tenants (slug, name, is_active) "
            "VALUES (:slug, :name, true) "
            "ON CONFLICT (slug) DO NOTHING "
            "RETURNING id"
        ),
        {"slug": _TENANT_SLUG, "name": _TENANT_NAME},
    )
    row = result.fetchone()
    if row:
        tenant_id: int = row[0]
    else:
        tenant_id = conn.execute(
            text("SELECT id FROM tenants WHERE slug = :slug"), {"slug": _TENANT_SLUG}
        ).scalar_one()

    # ── Insert permissions ─────────────────────────────────────────────────────
    perm_id_by_code: dict[str, int] = {}
    for code, resource_type, action, description in _PERMISSIONS:
        result = conn.execute(
            text(
                "INSERT INTO permissions (code, resource_type, action, description) "
                "VALUES (:code, :resource_type, :action, :description) "
                "ON CONFLICT (code) DO NOTHING "
                "RETURNING id"
            ),
            {
                "code": code,
                "resource_type": resource_type,
                "action": action,
                "description": description,
            },
        )
        row = result.fetchone()
        if row:
            perm_id_by_code[code] = row[0]
        else:
            perm_id_by_code[code] = conn.execute(
                text("SELECT id FROM permissions WHERE code = :code"), {"code": code}
            ).scalar_one()

    # ── Insert roles ───────────────────────────────────────────────────────────
    role_id_by_code: dict[str, int] = {}
    for role_code, role_name, description, is_builtin in _ROLES:
        result = conn.execute(
            text(
                "INSERT INTO roles (tenant_id, code, name, description, is_builtin) "
                "VALUES (:tenant_id, :code, :name, :description, :is_builtin) "
                "ON CONFLICT (tenant_id, code) DO NOTHING "
                "RETURNING id"
            ),
            {
                "tenant_id": tenant_id,
                "code": role_code,
                "name": role_name,
                "description": description,
                "is_builtin": is_builtin,
            },
        )
        row = result.fetchone()
        if row:
            role_id_by_code[role_code] = row[0]
        else:
            role_id_by_code[role_code] = conn.execute(
                text("SELECT id FROM roles WHERE tenant_id = :tenant_id AND code = :code"),
                {"tenant_id": tenant_id, "code": role_code},
            ).scalar_one()

    # ── Insert role_permissions ────────────────────────────────────────────────
    for role_code, perm_codes in _ROLE_PERMISSIONS.items():
        role_id = role_id_by_code[role_code]
        for perm_code in perm_codes:
            perm_id = perm_id_by_code[perm_code]
            conn.execute(
                text(
                    "INSERT INTO role_permissions (role_id, permission_id) "
                    "VALUES (:role_id, :permission_id) "
                    "ON CONFLICT (role_id, permission_id) DO NOTHING"
                ),
                {"role_id": role_id, "permission_id": perm_id},
            )


def downgrade() -> None:
    conn = op.get_bind()
    # Remove only the seed data we inserted (by known slugs/codes)
    conn.execute(text("DELETE FROM role_permissions"))
    conn.execute(
        text("DELETE FROM roles WHERE code IN ('owner', 'admin', 'member', 'agent_runner')")
    )
    conn.execute(
        text(
            "DELETE FROM permissions WHERE code IN ("
            "'user.read','user.update_self','agent.read','agent.manage',"
            "'tool.read','tool.invoke','tool.manage',"
            "'workflow.read','workflow.execute','workflow.manage','tenant.manage')"
        )
    )
    conn.execute(text("DELETE FROM tenants WHERE slug = 'personal'"))
