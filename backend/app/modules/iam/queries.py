"""IAM read operations: session lookup, account queries, tenant management, RBAC and ACL."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core import DbSession, RedisDep, log
from app.utils import hash_token

from .consts import DEFAULT_TENANT_SLUG, RoleCode
from .model import (
    AclEntry,
    AgentAccount,
    AuthSession,
    Permission,
    Principal,
    PrincipalRoleBinding,
    Role,
    RolePermission,
    Tenant,
    TenantMembership,
    UserAccount,
)
from .schemas import AccessSessionPayload


class IamQueries:
    """IAM read operations — injected per request."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        """Initialize the IAM query service.

        Args:
            db: The request-scoped SQLAlchemy async session.
            redis: The request-scoped Redis client used for auth snapshots.

        Returns:
            None
        """
        self.db = db
        self.redis = redis

    async def get_access_session(self, access_token: str) -> AccessSessionPayload | None:
        """Load an access-session snapshot from Redis.

        Args:
            access_token: The raw opaque access token received from the client.

        Returns:
            The parsed access-session payload when the token is valid, otherwise ``None``.
        """
        token_hash = hash_token(access_token)
        raw = await self.redis.get(self._access_session_key(token_hash))
        if not raw:
            return None
        try:
            return AccessSessionPayload.model_validate_json(raw)
        except Exception:
            log.warning("Malformed access session payload in Redis; treating as missing")
            return None

    async def get_active_user_account_with_principal_by_username(
        self, username: str
    ) -> UserAccount | None:
        """Load an active user account by username together with its principal.

        Args:
            username: The unique username to look up.

        Returns:
            The matched user account with ``principal`` eagerly loaded, or ``None``.
        """
        stmt = (
            select(UserAccount)
            .join(UserAccount.principal)
            .options(joinedload(UserAccount.principal))
            .where(UserAccount.username == username, Principal.is_active.is_(True))
        )
        return await self.db.scalar(stmt)

    async def get_user_account_with_principal_by_principal_id(
        self, principal_id: int
    ) -> UserAccount | None:
        """Load a user account by principal id with its principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The user account ORM object when found, otherwise ``None``.
        """
        stmt = (
            select(UserAccount)
            .options(joinedload(UserAccount.principal))
            .where(UserAccount.principal_id == principal_id)
        )
        return await self.db.scalar(stmt)

    async def get_principal_with_accounts(self, principal_id: int) -> Principal | None:
        """Load a principal together with its optional account relations.

        Args:
            principal_id: The principal identifier to load.

        Returns:
            The principal with both account relations eagerly loaded, or ``None``.
        """
        stmt = (
            select(Principal)
            .options(
                joinedload(Principal.user_account),
                joinedload(Principal.agent_account),
            )
            .where(Principal.id == principal_id)
        )
        return await self.db.scalar(stmt)

    async def get_principal(self, principal_id: int) -> Principal | None:
        """Load a principal by id.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The principal ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(select(Principal).where(Principal.id == principal_id))

    async def get_personal_tenant(self) -> Tenant | None:
        """Load the default shared tenant when it is active.

        Args:
            None

        Returns:
            The tenant ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(
            select(Tenant).where(Tenant.slug == DEFAULT_TENANT_SLUG, Tenant.is_active.is_(True))
        )

    async def get_tenant(self, tenant_id: int) -> Tenant | None:
        """Load a tenant by id.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            The tenant ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))

    async def get_tenant_by_slug(self, slug: str) -> Tenant | None:
        """Load a tenant by slug.

        Args:
            slug: The tenant slug value.

        Returns:
            The tenant ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(select(Tenant).where(Tenant.slug == slug))

    async def list_visible_tenants(self, principal_id: int) -> list[Tenant]:
        """List tenants visible to the principal through membership.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The matching tenant ORM records.
        """
        stmt = (
            select(Tenant)
            .join(TenantMembership, TenantMembership.tenant_id == Tenant.id)
            .where(TenantMembership.principal_id == principal_id)
            .order_by(Tenant.id)
        )
        return list((await self.db.scalars(stmt)).all())

    async def get_membership(self, tenant_id: int, principal_id: int) -> TenantMembership | None:
        """Load one tenant membership for a principal.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.

        Returns:
            The `TenantMembership | None` result for the operation.
        """
        stmt = select(TenantMembership).where(
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.principal_id == principal_id,
        )
        return await self.db.scalar(stmt)

    async def list_memberships_for_tenant(self, tenant_id: int) -> list[TenantMembership]:
        """List memberships inside a tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            The matching tenant membership ORM records.
        """
        stmt = select(TenantMembership).where(TenantMembership.tenant_id == tenant_id)
        return list((await self.db.scalars(stmt)).all())

    async def list_memberships_for_principal(self, principal_id: int) -> list[TenantMembership]:
        """List memberships held by a principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The matching tenant membership ORM records.
        """
        stmt = (
            select(TenantMembership)
            .options(joinedload(TenantMembership.tenant))
            .where(TenantMembership.principal_id == principal_id)
        )
        return list((await self.db.scalars(stmt)).all())

    async def list_users(self, tenant_id: int | None = None) -> list[UserAccount]:
        """List user accounts, optionally filtered to a tenant scope.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            The matching user account ORM records.
        """
        stmt: Select[tuple[UserAccount]] = (
            select(UserAccount)
            .join(UserAccount.principal)
            .options(joinedload(UserAccount.principal))
        )
        if tenant_id is not None:
            stmt = stmt.join(
                TenantMembership,
                TenantMembership.principal_id == UserAccount.principal_id,
            ).where(TenantMembership.tenant_id == tenant_id)
        stmt = stmt.order_by(UserAccount.id)
        return list((await self.db.scalars(stmt)).unique().all())

    async def get_user_by_principal_id(self, principal_id: int) -> UserAccount | None:
        """Load a user account by principal id.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The user account ORM object when found, otherwise ``None``.
        """
        return await self.get_user_account_with_principal_by_principal_id(principal_id)

    async def list_agents(self, tenant_id: int | None = None) -> list[AgentAccount]:
        """List agent accounts, optionally filtered to a tenant scope.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            The matching agent account ORM records.
        """
        stmt: Select[tuple[AgentAccount]] = (
            select(AgentAccount)
            .join(AgentAccount.principal)
            .options(joinedload(AgentAccount.principal))
        )
        if tenant_id is not None:
            stmt = stmt.join(
                TenantMembership,
                TenantMembership.principal_id == AgentAccount.principal_id,
            ).where(TenantMembership.tenant_id == tenant_id)
        stmt = stmt.order_by(AgentAccount.id)
        return list((await self.db.scalars(stmt)).unique().all())

    async def get_agent_by_principal_id(self, principal_id: int) -> AgentAccount | None:
        """Load an agent account by principal id.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The agent account ORM object when found, otherwise ``None``.
        """
        stmt = (
            select(AgentAccount)
            .options(
                joinedload(AgentAccount.principal),
                joinedload(AgentAccount.owner_principal),
            )
            .where(AgentAccount.principal_id == principal_id)
        )
        return await self.db.scalar(stmt)

    async def get_role(self, role_id: int) -> Role | None:
        """Load a role with its permission graph.

        Args:
            role_id: The role identifier for the current operation.

        Returns:
            The role ORM object when found, otherwise ``None``.
        """
        stmt = (
            select(Role)
            .options(selectinload(Role.permission_links).joinedload(RolePermission.permission))
            .where(Role.id == role_id)
        )
        return await self.db.scalar(stmt)

    async def get_role_by_code(self, tenant_id: int, code: str) -> Role | None:
        """Load a tenant role by code with its permission graph.

        Args:
            tenant_id: The tenant identifier for the current operation.
            code: The unique code value for the current resource.

        Returns:
            The role ORM object when found, otherwise ``None``.
        """
        stmt = (
            select(Role)
            .options(selectinload(Role.permission_links).joinedload(RolePermission.permission))
            .where(Role.tenant_id == tenant_id, Role.code == code)
        )
        return await self.db.scalar(stmt)

    async def list_roles(self, tenant_id: int) -> list[Role]:
        """List roles in a tenant with their permission graphs.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            The matching role ORM records.
        """
        stmt = (
            select(Role)
            .options(selectinload(Role.permission_links).joinedload(RolePermission.permission))
            .where(Role.tenant_id == tenant_id)
            .order_by(Role.id)
        )
        return list((await self.db.scalars(stmt)).unique().all())

    async def get_permission_by_id(self, permission_id: int) -> Permission | None:
        """Load a permission by id.

        Args:
            permission_id: The permission identifier for the current operation.

        Returns:
            The permission ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(select(Permission).where(Permission.id == permission_id))

    async def get_permission_by_code(self, code: str) -> Permission | None:
        """Load a permission by code.

        Args:
            code: The unique code value for the current resource.

        Returns:
            The permission ORM object when found, otherwise ``None``.
        """
        return await self.db.scalar(select(Permission).where(Permission.code == code))

    async def list_permissions(self) -> list[Permission]:
        """List all permission definitions.

        Args:
            None

        Returns:
            The `list[Permission]` result for the operation.
        """
        stmt = select(Permission).order_by(Permission.id)
        return list((await self.db.scalars(stmt)).all())

    async def get_principal_roles(self, tenant_id: int, principal_id: int) -> list[Role]:
        """List roles granted to a principal inside one tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.

        Returns:
            The matching role ORM records.
        """
        stmt = (
            select(Role)
            .join(PrincipalRoleBinding, PrincipalRoleBinding.role_id == Role.id)
            .options(selectinload(Role.permission_links).joinedload(RolePermission.permission))
            .where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
            )
            .order_by(Role.id)
        )
        return list((await self.db.scalars(stmt)).unique().all())

    async def get_principal_role_ids(self, tenant_id: int, principal_id: int) -> list[int]:
        """List role identifiers granted to a principal inside one tenant.

        Args:
            tenant_id: The tenant scope to inspect.
            principal_id: The principal whose role bindings should be listed.

        Returns:
            A list of role identifiers granted in the tenant scope.
        """
        result = await self.db.execute(
            select(PrincipalRoleBinding.role_id).where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
            )
        )
        return list(result.scalars().all())

    async def get_permission_codes(
        self,
        tenant_id: int,
        principal_id: int,
        authz_version: int,
    ) -> set[str]:
        """Resolve effective permission codes for a principal inside a tenant.

        Args:
            tenant_id: The tenant scope for permission evaluation.
            principal_id: The principal whose effective permissions are being resolved.
            authz_version: The version used to invalidate cached RBAC snapshots.

        Returns:
            The effective permission code set for the tenant-scoped principal.
        """
        from .consts import IamRedisKey

        # Owners deliberately bypass Redis caching so newly created permissions are visible
        # immediately without waiting for a version bump or cache expiry.
        if await self._principal_has_owner_role(tenant_id, principal_id):
            return set((await self.db.scalars(select(Permission.code))).all())

        # Authz snapshots are versioned so role/ACL mutations can invalidate cached permission sets.
        cache_key = IamRedisKey.AUTHZ_SNAPSHOT.key(tenant_id, principal_id, authz_version)
        cached = await self.redis.get(cache_key)
        if cached:
            try:
                return set(json.loads(cached))
            except Exception:
                pass

        codes = await self._resolve_permission_codes_from_db(tenant_id, principal_id)
        key_def = IamRedisKey.AUTHZ_SNAPSHOT
        assert key_def.expire_seconds is not None
        await self.redis.setex(cache_key, key_def.expire_seconds, json.dumps(sorted(codes)))
        return codes

    async def _principal_has_owner_role(self, tenant_id: int, principal_id: int) -> bool:
        """Check whether the principal currently holds the tenant owner role.

        Args:
            tenant_id: The tenant scope to inspect.
            principal_id: The principal whose owner binding should be checked.

        Returns:
            ``True`` when the principal is an owner in the tenant, otherwise ``False``.
        """
        owner_binding = await self.db.scalar(
            select(PrincipalRoleBinding.id)
            .join(Role, Role.id == PrincipalRoleBinding.role_id)
            .where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
                Role.code == RoleCode.OWNER,
            )
            .limit(1)
        )
        return owner_binding is not None

    async def _resolve_permission_codes_from_db(
        self, tenant_id: int, principal_id: int
    ) -> set[str]:
        """Resolve effective permission codes directly from the database.

        Args:
            tenant_id: The tenant scope for permission evaluation.
            principal_id: The principal whose permissions are being resolved.

        Returns:
            The effective permission code set loaded directly from PostgreSQL.
        """

        stmt = (
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .join(Role, Role.id == RolePermission.role_id)
            .join(PrincipalRoleBinding, PrincipalRoleBinding.role_id == Role.id)
            .where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
            )
        )
        result = await self.db.execute(stmt)
        return set(result.scalars().all())

    async def get_acl_matches(
        self,
        tenant_id: int,
        principal_id: int,
        role_ids: list[int],
        resource_type: str,
        resource_id: int,
        permission_id: int,
    ) -> list[AclEntry]:
        """Load ACL entries matching a specific resource permission check.

        Args:
            tenant_id: The tenant scope where ACLs should be evaluated.
            principal_id: The principal being evaluated.
            role_ids: The current tenant role identifiers granted to the principal.
            resource_type: The resource type being checked.
            resource_id: The concrete resource identifier being checked.
            permission_id: The permission definition being checked.

        Returns:
            The ACL entries that match the principal or any of its current roles.
        """
        from sqlalchemy import or_

        # ACL evaluation can target the principal directly or any role the principal currently holds.
        subject_clauses = [AclEntry.subject_principal_id == principal_id]
        if role_ids:
            subject_clauses.append(AclEntry.subject_role_id.in_(role_ids))

        stmt = select(AclEntry).where(
            AclEntry.tenant_id == tenant_id,
            AclEntry.resource_type == resource_type,
            AclEntry.resource_id == resource_id,
            AclEntry.permission_id == permission_id,
            or_(*subject_clauses),
        )
        return list((await self.db.scalars(stmt)).all())

    async def list_acl_entries(
        self,
        tenant_id: int,
        resource_type: str | None = None,
        resource_id: int | None = None,
        permission_id: int | None = None,
    ) -> list[AclEntry]:
        """List ACL entries in a tenant with optional filters.

        Args:
            tenant_id: The tenant identifier for the current operation.
            resource_type: The resource type involved in the operation.
            resource_id: The resource identifier involved in the operation.
            permission_id: The permission identifier for the current operation.

        Returns:
            The matching ACL entry ORM records.
        """
        stmt: Select[tuple[AclEntry]] = select(AclEntry).where(AclEntry.tenant_id == tenant_id)
        if resource_type is not None:
            stmt = stmt.where(AclEntry.resource_type == resource_type)
        if resource_id is not None:
            stmt = stmt.where(AclEntry.resource_id == resource_id)
        if permission_id is not None:
            stmt = stmt.where(AclEntry.permission_id == permission_id)
        stmt = stmt.order_by(AclEntry.id)
        return list((await self.db.scalars(stmt)).all())

    async def get_acl_entry(self, tenant_id: int, acl_id: int) -> AclEntry | None:
        """Load one ACL entry by id inside a tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            acl_id: The ACL entry identifier.

        Returns:
            The ACL entry ORM object when found, otherwise ``None``.
        """
        stmt = select(AclEntry).where(AclEntry.tenant_id == tenant_id, AclEntry.id == acl_id)
        return await self.db.scalar(stmt)

    async def get_session_list(self, principal_id: int) -> list[AuthSession]:
        """List active non-expired sessions for a principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            The matching auth session ORM records.
        """
        now = datetime.now(UTC)
        stmt = select(AuthSession).where(
            AuthSession.principal_id == principal_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
        return list((await self.db.scalars(stmt)).all())

    async def get_session_with_graph_by_refresh_hash(self, refresh_hash: str) -> AuthSession | None:
        """Load a refresh-token session together with its principal graph.

        Args:
            refresh_hash: The hashed refresh token value.

        Returns:
            The `AuthSession | None` result for the operation.
        """
        now = datetime.now(UTC)
        stmt = (
            select(AuthSession)
            .options(
                joinedload(AuthSession.principal).joinedload(Principal.user_account),
                joinedload(AuthSession.principal).joinedload(Principal.agent_account),
                joinedload(AuthSession.tenant),
            )
            .where(
                AuthSession.refresh_token_hash == refresh_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
        )
        return await self.db.scalar(stmt)

    async def get_session_by_access_token_hash(self, access_token_hash: str) -> AuthSession | None:
        """Load an active session by access-token hash.

        Args:
            access_token_hash: The hashed access token value.

        Returns:
            The `AuthSession | None` result for the operation.
        """
        stmt = select(AuthSession).where(
            AuthSession.access_token_hash == access_token_hash,
            AuthSession.revoked_at.is_(None),
        )
        return await self.db.scalar(stmt)

    async def get_principal_sessions_in_tenant(
        self, tenant_id: int, principal_id: int
    ) -> list[AuthSession]:
        """List active sessions for a principal inside one tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.

        Returns:
            The matching auth session ORM records.
        """
        stmt = select(AuthSession).where(
            AuthSession.tenant_id == tenant_id,
            AuthSession.principal_id == principal_id,
            AuthSession.revoked_at.is_(None),
        )
        return list((await self.db.scalars(stmt)).all())

    @staticmethod
    def _access_session_key(token_hash: str) -> str:
        """Build the Redis key used for an access-session snapshot.

        Args:
            token_hash: The SHA-256 hash of the raw access token.

        Returns:
            The Redis key that stores the serialized access-session payload.
        """
        from .consts import IamRedisKey

        return IamRedisKey.ACCESS_SESSION.key(token_hash)


def get_iam_queries(db: DbSession, redis: RedisDep) -> IamQueries:
    """Build the request-scoped IAM query service.

    Args:
        db: The request-scoped SQLAlchemy async session.
        redis: The request-scoped Redis client.

    Returns:
        The request-scoped IAM query service.
    """
    return IamQueries(db, redis)


IamQueriesDep = Annotated[IamQueries, Depends(get_iam_queries)]
