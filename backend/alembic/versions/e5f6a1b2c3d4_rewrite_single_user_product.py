"""rewrite single-user user/session schema

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-03-15 08:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a1b2c3d4"
down_revision: str | None = "d4e5f6a1b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table_name in (
        "acl_entries",
        "principal_role_bindings",
        "role_permissions",
        "roles",
        "permissions",
        "tenant_memberships",
        "agent_accounts",
        "user_accounts",
        "principals",
        "tenants",
        "users",
        "auth_sessions",
        "user_settings",
        "conversations",
        "messages",
        "runs",
        "tools",
    ):
        op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column(
            "avatar_url",
            sa.String(length=512),
            nullable=False,
            server_default="/static/avatars/default-user.jpeg",
        ),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="1"),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name=op.f("uq_users_username")),
    )
    op.create_index("ix_users_username_lookup", "users", ["username"], unique=False)

    op.create_table(
        "user_settings",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("locale", sa.String(length=32), nullable=False, server_default="en-US"),
        sa.Column("theme", sa.String(length=32), nullable=False, server_default="system"),
        sa.Column("system_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("default_model", sa.String(length=128), nullable=False, server_default="gpt-5"),
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
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_user_settings_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_settings")),
        sa.UniqueConstraint("user_id", name=op.f("uq_user_settings_user_id")),
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.BigInteger(), sa.Identity(start=1), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("access_token_hash", sa.String(length=64), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_agent", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(length=128), nullable=False, server_default=""),
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
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_auth_sessions_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("access_token_hash", name=op.f("uq_auth_sessions_access_token_hash")),
        sa.UniqueConstraint("refresh_token_hash", name=op.f("uq_auth_sessions_refresh_token_hash")),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"], unique=False)
    op.create_index(
        "ix_auth_sessions_expires_at",
        "auth_sessions",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("user_settings")
    op.drop_index("ix_users_username_lookup", table_name="users")
    op.drop_table("users")
