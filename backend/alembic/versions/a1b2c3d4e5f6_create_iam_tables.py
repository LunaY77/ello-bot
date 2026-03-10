"""create iam tables

Revision ID: a1b2c3d4e5f6
Revises: 10831e8e5fc8
Create Date: 2026-03-10 09:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "10831e8e5fc8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── tenants ───────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tenants")),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
    )

    # ── principals ────────────────────────────────────────────────────────────
    op.create_table(
        "principals",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("principal_type", sa.String(32), nullable=False),
        sa.Column("display_name", sa.String(128), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("authz_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_principals")),
    )
    op.create_index("ix_principals_type_active", "principals", ["principal_type", "is_active"])

    # ── user_accounts ─────────────────────────────────────────────────────────
    op.create_table(
        "user_accounts",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("principal_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "avatar_url",
            sa.String(512),
            nullable=False,
            server_default="/static/avatars/default-user.jpeg",
        ),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("gender", sa.String(32), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("timezone", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_user_accounts_principal_id_principals"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_accounts")),
        sa.UniqueConstraint("principal_id", name="uq_user_accounts_principal_id"),
        sa.UniqueConstraint("username", name="uq_user_accounts_username"),
    )
    op.create_index("ix_user_accounts_username_lookup", "user_accounts", ["username"])

    # ── agent_accounts ────────────────────────────────────────────────────────
    op.create_table(
        "agent_accounts",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("principal_id", sa.BigInteger(), nullable=False),
        sa.Column("owner_principal_id", sa.BigInteger(), nullable=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column(
            "avatar_url",
            sa.String(512),
            nullable=False,
            server_default="/static/avatars/default-agent.png",
        ),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_agent_accounts_principal_id_principals"),
        ),
        sa.ForeignKeyConstraint(
            ["owner_principal_id"],
            ["principals.id"],
            ondelete="SET NULL",
            name=op.f("fk_agent_accounts_owner_principal_id_principals"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_agent_accounts")),
        sa.UniqueConstraint("principal_id", name="uq_agent_accounts_principal_id"),
        sa.UniqueConstraint("code", name="uq_agent_accounts_code"),
    )
    op.create_index(
        "ix_agent_accounts_owner_principal_id",
        "agent_accounts",
        ["owner_principal_id"],
    )

    # ── tenant_memberships ────────────────────────────────────────────────────
    op.create_table(
        "tenant_memberships",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("principal_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
            name=op.f("fk_tenant_memberships_tenant_id_tenants"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_tenant_memberships_principal_id_principals"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tenant_memberships")),
        sa.UniqueConstraint(
            "tenant_id",
            "principal_id",
            name="uq_tenant_memberships_tenant_principal",
        ),
    )
    op.create_index(
        "ix_tenant_memberships_principal_tenant",
        "tenant_memberships",
        ["principal_id", "tenant_id"],
    )

    # ── permissions ───────────────────────────────────────────────────────────
    op.create_table(
        "permissions",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("code", sa.String(128), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_permissions")),
        sa.UniqueConstraint("code", name="uq_permissions_code"),
        sa.UniqueConstraint("resource_type", "action", name="uq_permissions_resource_action"),
    )

    # ── roles ─────────────────────────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("is_builtin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
            name=op.f("fk_roles_tenant_id_tenants"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
        sa.UniqueConstraint("tenant_id", "code", name="uq_roles_tenant_code"),
    )
    op.create_index("ix_roles_tenant_id_name", "roles", ["tenant_id", "name"])

    # ── role_permissions ──────────────────────────────────────────────────────
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column("permission_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            ondelete="CASCADE",
            name=op.f("fk_role_permissions_role_id_roles"),
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            ondelete="CASCADE",
            name=op.f("fk_role_permissions_permission_id_permissions"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_role_permissions")),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )
    op.create_index("ix_role_permissions_permission_id", "role_permissions", ["permission_id"])

    # ── principal_role_bindings ───────────────────────────────────────────────
    op.create_table(
        "principal_role_bindings",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("principal_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
            name=op.f("fk_principal_role_bindings_tenant_id_tenants"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_principal_role_bindings_principal_id_principals"),
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            ondelete="CASCADE",
            name=op.f("fk_principal_role_bindings_role_id_roles"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_principal_role_bindings")),
        sa.UniqueConstraint(
            "tenant_id",
            "principal_id",
            "role_id",
            name="uq_principal_role_bindings_tenant_principal_role",
        ),
    )
    op.create_index(
        "ix_principal_role_bindings_tenant_principal",
        "principal_role_bindings",
        ["tenant_id", "principal_id"],
    )
    op.create_index(
        "ix_principal_role_bindings_role_id",
        "principal_role_bindings",
        ["role_id"],
    )

    # ── acl_entries ───────────────────────────────────────────────────────────
    op.create_table(
        "acl_entries",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("resource_type", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.BigInteger(), nullable=False),
        sa.Column("permission_id", sa.BigInteger(), nullable=False),
        sa.Column("subject_principal_id", sa.BigInteger(), nullable=True),
        sa.Column("subject_role_id", sa.BigInteger(), nullable=True),
        sa.Column("effect", sa.String(16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
            name=op.f("fk_acl_entries_tenant_id_tenants"),
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            ondelete="CASCADE",
            name=op.f("fk_acl_entries_permission_id_permissions"),
        ),
        sa.ForeignKeyConstraint(
            ["subject_principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_acl_entries_subject_principal_id_principals"),
        ),
        sa.ForeignKeyConstraint(
            ["subject_role_id"],
            ["roles.id"],
            ondelete="CASCADE",
            name=op.f("fk_acl_entries_subject_role_id_roles"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_acl_entries")),
        sa.CheckConstraint(
            """
            (subject_principal_id IS NOT NULL AND subject_role_id IS NULL)
            OR
            (subject_principal_id IS NULL AND subject_role_id IS NOT NULL)
            """,
            name="ck_acl_entries_subject_xor",
        ),
        sa.CheckConstraint(
            "effect IN ('allow', 'deny')",
            name="ck_acl_entries_effect",
        ),
    )
    op.create_index(
        "ix_acl_entries_resource_lookup",
        "acl_entries",
        ["tenant_id", "resource_type", "resource_id", "permission_id"],
    )
    op.create_index(
        "ix_acl_entries_principal_lookup",
        "acl_entries",
        [
            "tenant_id",
            "subject_principal_id",
            "permission_id",
            "resource_type",
            "resource_id",
        ],
    )
    op.create_index(
        "ix_acl_entries_role_lookup",
        "acl_entries",
        [
            "tenant_id",
            "subject_role_id",
            "permission_id",
            "resource_type",
            "resource_id",
        ],
    )

    # ── auth_sessions ─────────────────────────────────────────────────────────
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("principal_id", sa.BigInteger(), nullable=False),
        sa.Column("tenant_id", sa.BigInteger(), nullable=False),
        sa.Column("access_token_hash", sa.String(64), nullable=False),
        sa.Column("refresh_token_hash", sa.String(64), nullable=False),
        sa.Column("user_agent", sa.String(512), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(64), nullable=False, server_default=""),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["principal_id"],
            ["principals.id"],
            ondelete="CASCADE",
            name=op.f("fk_auth_sessions_principal_id_principals"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
            name=op.f("fk_auth_sessions_tenant_id_tenants"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("access_token_hash", name="uq_auth_sessions_access_token_hash"),
        sa.UniqueConstraint("refresh_token_hash", name="uq_auth_sessions_refresh_token_hash"),
    )
    op.create_index(
        "ix_auth_sessions_principal_tenant",
        "auth_sessions",
        ["principal_id", "tenant_id"],
    )
    op.create_index(
        "ix_auth_sessions_principal_revoked_at",
        "auth_sessions",
        ["principal_id", "revoked_at"],
    )
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])


def downgrade() -> None:
    op.drop_table("auth_sessions")
    op.drop_table("acl_entries")
    op.drop_table("principal_role_bindings")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("permissions")
    op.drop_table("tenant_memberships")
    op.drop_table("agent_accounts")
    op.drop_table("user_accounts")
    op.drop_table("principals")
    op.drop_table("tenants")
