"""backfill users to principals

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-03-10 09:42:00.000000

For each existing row in `users`:
- Insert into principals (type=user)
- Insert into user_accounts
- Insert into tenant_memberships (personal tenant)
- Insert into principal_role_bindings (old role → new role mapping)

Old role mapping:
    "admin" → owner role
    "user"  → member role
    anything else → member role
"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a1b2"
down_revision: str | None = "b2c3d4e5f6a1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ROLE_MAPPING = {
    "admin": "owner",
    "user": "member",
}
_DEFAULT_ROLE = "member"
_PERSONAL_TENANT_SLUG = "personal"
_DEFAULT_USER_AVATAR_URL = "/static/avatars/default-user.jpeg"


def upgrade() -> None:
    conn = op.get_bind()

    # Get personal tenant
    tenant_id: int = conn.execute(
        text("SELECT id FROM tenants WHERE slug = :slug"),
        {"slug": _PERSONAL_TENANT_SLUG},
    ).scalar_one()

    # Get role id map
    rows = conn.execute(
        text("SELECT code, id FROM roles WHERE tenant_id = :tid"),
        {"tid": tenant_id},
    ).fetchall()
    role_id_by_code: dict[str, int] = {r[0]: r[1] for r in rows}

    # Fetch all existing users
    users = conn.execute(
        text("SELECT id, username, password, avatar, role, is_active FROM users")
    ).fetchall()

    for _user_id, username, password_hash, avatar, old_role, is_active in users:
        # Insert principal
        principal_id: int = conn.execute(
            text(
                "INSERT INTO principals (principal_type, display_name, is_active) "
                "VALUES ('user', :display_name, :is_active) "
                "RETURNING id"
            ),
            {"display_name": username, "is_active": is_active},
        ).scalar_one()

        # Insert user_account
        conn.execute(
            text(
                "INSERT INTO user_accounts ("
                "principal_id, username, password_hash, avatar_url, bio, gender, date_of_birth, timezone"
                ") "
                "VALUES ("
                ":principal_id, :username, :password_hash, :avatar_url, '', NULL, NULL, NULL"
                ") "
                "ON CONFLICT (username) DO NOTHING"
            ),
            {
                "principal_id": principal_id,
                "username": username,
                "password_hash": password_hash,
                "avatar_url": avatar or _DEFAULT_USER_AVATAR_URL,
            },
        )

        # Insert tenant membership
        conn.execute(
            text(
                "INSERT INTO tenant_memberships (tenant_id, principal_id, status) "
                "VALUES (:tenant_id, :principal_id, 'active') "
                "ON CONFLICT (tenant_id, principal_id) DO NOTHING"
            ),
            {"tenant_id": tenant_id, "principal_id": principal_id},
        )

        # Insert role binding
        new_role_code = _ROLE_MAPPING.get(old_role, _DEFAULT_ROLE)
        role_id = role_id_by_code.get(new_role_code)
        if role_id:
            conn.execute(
                text(
                    "INSERT INTO principal_role_bindings (tenant_id, principal_id, role_id) "
                    "VALUES (:tenant_id, :principal_id, :role_id) "
                    "ON CONFLICT (tenant_id, principal_id, role_id) DO NOTHING"
                ),
                {
                    "tenant_id": tenant_id,
                    "principal_id": principal_id,
                    "role_id": role_id,
                },
            )


def downgrade() -> None:
    # Remove all backfilled data.
    # Safe because auth_sessions → principals cascade will clean up sessions.
    conn = op.get_bind()
    conn.execute(
        text("DELETE FROM principals WHERE id IN (  SELECT principal_id FROM user_accounts)")
    )
