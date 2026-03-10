"""
RBAC + ACL core models for FastAPI + SQLAlchemy 2.x + PostgreSQL.

Design goals:
1. Internal primary keys use BIGINT IDENTITY, not UUID primary keys.
2. Support human users and agents with a unified "principal" abstraction.
3. Support multi-tenant authorization boundaries.
4. RBAC handles coarse-grained permissions.
5. ACL handles resource-instance exceptions.
6. Relationship mappings are explicitly declared for ORM navigation.
7. Lazy loading is forbidden; all required relation graphs must be preloaded explicitly.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BIGINT,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base
from app.modules.iam.consts import (
    DEFAULT_AGENT_AVATAR_URL,
    DEFAULT_USER_AVATAR_URL,
    AclEffect,
    MembershipStatus,
)


class _IdMixin:
    id: Mapped[int] = mapped_column(
        BIGINT,
        Identity(start=1),
        primary_key=True,
        comment="Surrogate primary key. Internal only.",
    )


class _TimestampMixin:
    __mapper_args__ = {"eager_defaults": True}

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation time.",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last update time.",
    )


class Tenant(Base, _IdMixin, _TimestampMixin):
    """Logical tenant boundary."""

    __tablename__ = "tenants"

    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    memberships: Mapped[list[TenantMembership]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    roles: Mapped[list[Role]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    principal_role_bindings: Mapped[list[PrincipalRoleBinding]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    acl_entries: Mapped[list[AclEntry]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    auth_sessions: Mapped[list[AuthSession]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )


class Principal(Base, _IdMixin, _TimestampMixin):
    """Unified authorization subject (user, agent, service_account)."""

    __tablename__ = "principals"

    principal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    session_version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    authz_version: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")

    user_account: Mapped[UserAccount | None] = relationship(
        back_populates="principal",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    agent_account: Mapped[AgentAccount | None] = relationship(
        back_populates="principal",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="AgentAccount.principal_id",
        lazy="raise",
    )
    owned_agents: Mapped[list[AgentAccount]] = relationship(
        back_populates="owner_principal",
        foreign_keys="AgentAccount.owner_principal_id",
        lazy="raise",
    )
    memberships: Mapped[list[TenantMembership]] = relationship(
        back_populates="principal",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    role_bindings: Mapped[list[PrincipalRoleBinding]] = relationship(
        back_populates="principal",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="PrincipalRoleBinding.principal_id",
        lazy="raise",
    )
    direct_acl_entries: Mapped[list[AclEntry]] = relationship(
        back_populates="subject_principal",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="AclEntry.subject_principal_id",
        lazy="raise",
    )
    auth_sessions: Mapped[list[AuthSession]] = relationship(
        back_populates="principal",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )

    __table_args__ = (Index("ix_principals_type_active", "principal_type", "is_active"),)


class UserAccount(Base, _IdMixin, _TimestampMixin):
    """Human user profile + local credential."""

    __tablename__ = "user_accounts"

    principal_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey("principals.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    username: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        server_default=DEFAULT_USER_AVATAR_URL,
    )
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    principal: Mapped[Principal] = relationship(back_populates="user_account", lazy="raise")

    __table_args__ = (Index("ix_user_accounts_username_lookup", "username"),)


class AgentAccount(Base, _IdMixin, _TimestampMixin):
    """Agent profile — agents are first-class authorization principals."""

    __tablename__ = "agent_accounts"

    principal_id: Mapped[int] = mapped_column(
        BIGINT,
        ForeignKey("principals.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    owner_principal_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey("principals.id", ondelete="SET NULL"),
        nullable=True,
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    avatar_url: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        server_default=DEFAULT_AGENT_AVATAR_URL,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    principal: Mapped[Principal] = relationship(
        back_populates="agent_account",
        foreign_keys=[principal_id],
        lazy="raise",
    )
    owner_principal: Mapped[Principal | None] = relationship(
        back_populates="owned_agents",
        foreign_keys=[owner_principal_id],
        lazy="raise",
    )

    __table_args__ = (Index("ix_agent_accounts_owner_principal_id", "owner_principal_id"),)


class TenantMembership(Base, _IdMixin, _TimestampMixin):
    """Membership of a principal inside a tenant."""

    __tablename__ = "tenant_memberships"

    tenant_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    principal_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("principals.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=MembershipStatus.ACTIVE,
        server_default=MembershipStatus.ACTIVE,
    )

    tenant: Mapped[Tenant] = relationship(back_populates="memberships", lazy="raise")
    principal: Mapped[Principal] = relationship(back_populates="memberships", lazy="raise")

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "principal_id", name="uq_tenant_memberships_tenant_principal"
        ),
        Index("ix_tenant_memberships_principal_tenant", "principal_id", "tenant_id"),
    )


class Permission(Base, _IdMixin, _TimestampMixin):
    """Atomic permission, e.g. user.read, tool.invoke."""

    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(
        String(255), nullable=False, default="", server_default=""
    )

    role_links: Mapped[list[RolePermission]] = relationship(
        back_populates="permission",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    acl_entries: Mapped[list[AclEntry]] = relationship(
        back_populates="permission",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint("resource_type", "action", name="uq_permissions_resource_action"),
    )


class Role(Base, _IdMixin, _TimestampMixin):
    """Tenant-scoped role (owner / admin / member / agent_runner)."""

    __tablename__ = "roles"

    tenant_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(
        String(255), nullable=False, default="", server_default=""
    )
    is_builtin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    tenant: Mapped[Tenant] = relationship(back_populates="roles", lazy="raise")
    permission_links: Mapped[list[RolePermission]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    principal_bindings: Mapped[list[PrincipalRoleBinding]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="raise",
    )
    acl_entries: Mapped[list[AclEntry]] = relationship(
        back_populates="subject_role",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="AclEntry.subject_role_id",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_roles_tenant_code"),
        Index("ix_roles_tenant_id_name", "tenant_id", "name"),
    )


class RolePermission(Base, _IdMixin, _TimestampMixin):
    """Bridge table: role → permission."""

    __tablename__ = "role_permissions"

    role_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    permission_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )

    role: Mapped[Role] = relationship(back_populates="permission_links", lazy="raise")
    permission: Mapped[Permission] = relationship(back_populates="role_links", lazy="raise")

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
        Index("ix_role_permissions_permission_id", "permission_id"),
    )


class PrincipalRoleBinding(Base, _IdMixin, _TimestampMixin):
    """Bridge table: principal → role inside a tenant."""

    __tablename__ = "principal_role_bindings"

    tenant_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    principal_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("principals.id", ondelete="CASCADE"), nullable=False
    )
    role_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )

    tenant: Mapped[Tenant] = relationship(back_populates="principal_role_bindings", lazy="raise")
    principal: Mapped[Principal] = relationship(
        back_populates="role_bindings",
        foreign_keys=[principal_id],
        lazy="raise",
    )
    role: Mapped[Role] = relationship(back_populates="principal_bindings", lazy="raise")

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "principal_id",
            "role_id",
            name="uq_principal_role_bindings_tenant_principal_role",
        ),
        Index("ix_principal_role_bindings_tenant_principal", "tenant_id", "principal_id"),
        Index("ix_principal_role_bindings_role_id", "role_id"),
    )


class AclEntry(Base, _IdMixin, _TimestampMixin):
    """Instance-level authorization exception."""

    __tablename__ = "acl_entries"

    tenant_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    permission_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )
    subject_principal_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey("principals.id", ondelete="CASCADE"),
        nullable=True,
    )
    subject_role_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=True,
    )
    effect: Mapped[str] = mapped_column(String(16), nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="acl_entries", lazy="raise")
    permission: Mapped[Permission] = relationship(back_populates="acl_entries", lazy="raise")
    subject_principal: Mapped[Principal | None] = relationship(
        back_populates="direct_acl_entries",
        foreign_keys=[subject_principal_id],
        lazy="raise",
    )
    subject_role: Mapped[Role | None] = relationship(
        back_populates="acl_entries",
        foreign_keys=[subject_role_id],
        lazy="raise",
    )

    __table_args__ = (
        CheckConstraint(
            """
            (
                subject_principal_id IS NOT NULL AND subject_role_id IS NULL
            ) OR (
                subject_principal_id IS NULL AND subject_role_id IS NOT NULL
            )
            """,
            name="ck_acl_entries_subject_xor",
        ),
        CheckConstraint(
            f"effect IN ('{AclEffect.ALLOW}', '{AclEffect.DENY}')",
            name="ck_acl_entries_effect",
        ),
        Index(
            "ix_acl_entries_resource_lookup",
            "tenant_id",
            "resource_type",
            "resource_id",
            "permission_id",
        ),
        Index(
            "ix_acl_entries_principal_lookup",
            "tenant_id",
            "subject_principal_id",
            "permission_id",
            "resource_type",
            "resource_id",
        ),
        Index(
            "ix_acl_entries_role_lookup",
            "tenant_id",
            "subject_role_id",
            "permission_id",
            "resource_type",
            "resource_id",
        ),
    )


class AuthSession(Base, _IdMixin, _TimestampMixin):
    """Stateful auth session backed by opaque tokens."""

    __tablename__ = "auth_sessions"

    principal_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("principals.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    access_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    user_agent: Mapped[str] = mapped_column(
        String(512), nullable=False, default="", server_default=""
    )
    ip_address: Mapped[str] = mapped_column(
        String(64), nullable=False, default="", server_default=""
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    principal: Mapped[Principal] = relationship(back_populates="auth_sessions", lazy="raise")
    tenant: Mapped[Tenant] = relationship(back_populates="auth_sessions", lazy="raise")

    __table_args__ = (
        Index("ix_auth_sessions_principal_tenant", "principal_id", "tenant_id"),
        Index("ix_auth_sessions_principal_revoked_at", "principal_id", "revoked_at"),
        Index("ix_auth_sessions_expires_at", "expires_at"),
    )
