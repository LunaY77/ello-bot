"""IAM write operations: sessions, accounts, tenants, RBAC and ACL."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core import AuthException, BusinessException, CommonErrorCode, DbSession, RedisDep, log
from app.utils import generate_opaque_token, hash_password, hash_token

from .consts import (
    BUILTIN_PERMISSIONS,
    BUILTIN_ROLE_PERMISSIONS,
    BUILTIN_ROLES,
    DEFAULT_AGENT_AVATAR_URL,
    DEFAULT_TENANT_NAME,
    DEFAULT_TENANT_SLUG,
    DEFAULT_USER_AVATAR_URL,
    REFRESH_TOKEN_TTL_DAYS,
    IamRedisKey,
    MembershipStatus,
    PrincipalType,
    RoleCode,
)
from .errors import IamErrorCode
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
from .schemas import (
    AgentAccountResponse,
    AuthTokenResponse,
    TenantSummaryResponse,
    UserAccountResponse,
)


class IamCommands:
    """IAM write operations — injected per request."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis) -> None:
        """Store the request-scoped database session and Redis client.

        Args:
            db: The request-scoped SQLAlchemy async session.
            redis: The request-scoped Redis client.

        Returns:
            None
        """
        self.db = db
        self.redis = redis

    async def ensure_builtin_permissions(self) -> dict[str, Permission]:
        """Ensure every built-in permission row exists.

        Args:
            None

        Returns:
            The built-in permissions indexed by permission code.
        """
        existing = {
            permission.code: permission
            for permission in (
                await self.db.scalars(
                    select(Permission).where(
                        Permission.code.in_([p[0] for p in BUILTIN_PERMISSIONS])
                    )
                )
            ).all()
        }
        for code, resource_type, action, description in BUILTIN_PERMISSIONS:
            if code in existing:
                continue
            permission = Permission(
                code=code,
                resource_type=resource_type,
                action=action,
                description=description,
            )
            self.db.add(permission)
            await self.db.flush()
            existing[code] = permission
        return existing

    async def ensure_builtin_roles(self, tenant: Tenant) -> dict[str, Role]:
        """Ensure the tenant contains the complete built-in role and permission graph.

        Args:
            tenant: The tenant ORM object being processed.

        Returns:
            The tenant roles indexed by role code.
        """
        permissions = await self.ensure_builtin_permissions()
        existing_roles = {
            role.code: role
            for role in (
                await self.db.scalars(select(Role).where(Role.tenant_id == tenant.id))
            ).all()
        }
        for code, name, description, is_builtin in BUILTIN_ROLES:
            if code not in existing_roles:
                role = Role(
                    tenant_id=tenant.id,
                    code=code,
                    name=name,
                    description=description,
                    is_builtin=is_builtin,
                )
                self.db.add(role)
                await self.db.flush()
                existing_roles[code] = role

        for role_code, permission_codes in BUILTIN_ROLE_PERMISSIONS.items():
            role = existing_roles[role_code]
            # Built-in role sync must be additive so we can safely re-run bootstrap at startup.
            current_permission_ids = set(
                (
                    await self.db.execute(
                        select(RolePermission.permission_id).where(
                            RolePermission.role_id == role.id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for permission_code in permission_codes:
                permission_id = permissions[permission_code].id
                if permission_id in current_permission_ids:
                    continue
                self.db.add(RolePermission(role_id=role.id, permission_id=permission_id))
        await self.db.flush()
        return existing_roles

    async def ensure_tenant_with_builtin_roles(self, slug: str, name: str) -> Tenant:
        """Ensure a tenant exists and has the complete built-in IAM role graph.

        Args:
            slug: The tenant slug value.
            name: The human-readable name to persist.

        Returns:
            The tenant ORM object for the requested scope.
        """
        tenant = await self.db.scalar(select(Tenant).where(Tenant.slug == slug))
        if tenant is None:
            tenant = Tenant(slug=slug, name=name, is_active=True)
            self.db.add(tenant)
            await self.db.flush()
            log.info(f"Created bootstrap tenant: {slug}")
        elif not tenant.is_active:
            # Startup bootstrap must guarantee the initial tenant can actually be used.
            tenant.is_active = True
            await self.db.flush()
            log.warning(f"Re-activated bootstrap tenant: {slug}")
        await self.ensure_builtin_roles(tenant)
        return tenant

    async def bootstrap_personal_tenant(self) -> Tenant:
        """Ensure the default shared tenant exists for login and registration flows.

        Args:
            None

        Returns:
            The tenant ORM object for the requested scope.
        """
        return await self.ensure_tenant_with_builtin_roles(
            DEFAULT_TENANT_SLUG,
            DEFAULT_TENANT_NAME,
        )

    async def bootstrap_application(
        self,
        tenant_slug: str,
        tenant_name: str,
        admin_username: str,
        admin_password: str,
        admin_display_name: str,
    ) -> tuple[Tenant, Principal]:
        """Initialize the bootstrap tenant and bootstrap owner account idempotently.

        Args:
            tenant_slug: The bootstrap tenant slug.
            tenant_name: The bootstrap tenant name.
            admin_username: The `admin_username` value.
            admin_password: The `admin_password` value.
            admin_display_name: The `admin_display_name` value.

        Returns:
            The bootstrap tenant and bootstrap principal.
        """
        tenant = await self.ensure_tenant_with_builtin_roles(tenant_slug, tenant_name)
        principal, _user_account = await self.ensure_bootstrap_owner_account(
            tenant=tenant,
            username=admin_username,
            password=admin_password,
            display_name=admin_display_name,
        )
        return tenant, principal

    async def ensure_bootstrap_owner_account(
        self,
        tenant: Tenant,
        username: str,
        password: str,
        display_name: str,
    ) -> tuple[Principal, UserAccount]:
        """Ensure the bootstrap administrator exists, is active, and owns the tenant.

        Args:
            tenant: The tenant ORM object being processed.
            username: The username associated with the account.
            password: The raw password provided by the caller.
            display_name: The display name to create or update.

        Returns:
            The principal and user account created or ensured by the operation.
        """
        user_account = await self.db.scalar(
            select(UserAccount)
            .options(joinedload(UserAccount.principal))
            .where(UserAccount.username == username)
        )
        if user_account is None:
            principal, user_account = await self._create_user_account(
                username=username,
                password=password,
                display_name=display_name,
            )
            log.info(f"Created bootstrap administrator: {username} (principal_id={principal.id})")
        else:
            principal = user_account.principal

        if not principal.is_active:
            principal.is_active = True

        # Bootstrap must repair membership drift so the admin always lands in the initial tenant.
        membership = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant.id,
                TenantMembership.principal_id == principal.id,
            )
        )
        if membership is None:
            self.db.add(
                TenantMembership(
                    tenant_id=tenant.id,
                    principal_id=principal.id,
                    status=MembershipStatus.ACTIVE,
                )
            )
            await self.db.flush()
        elif membership.status != MembershipStatus.ACTIVE:
            membership.status = MembershipStatus.ACTIVE

        # Owner is the strongest built-in role and is treated as tenant superuser at query time.
        await self._grant_role_by_code(tenant.id, principal.id, RoleCode.OWNER)
        await self.db.flush()
        return principal, user_account

    async def _create_user_account(
        self,
        username: str,
        password: str,
        display_name: str | None = None,
    ) -> tuple[Principal, UserAccount]:
        """Create the principal and user-account rows without assigning tenant membership.

        Args:
            username: The username associated with the account.
            password: The raw password provided by the caller.
            display_name: The display name to create or update.

        Returns:
            The principal and user account created or ensured by the operation.
        """
        password_hash = hash_password(password)
        principal = Principal(
            principal_type=PrincipalType.USER,
            display_name=display_name or username,
            is_active=True,
        )
        user_account = UserAccount(
            principal=principal,
            username=username,
            password_hash=password_hash,
            avatar_url=DEFAULT_USER_AVATAR_URL,
        )
        self.db.add_all([principal, user_account])
        await self.db.flush()
        return principal, user_account

    async def create_tenant(self, slug: str, name: str, owner_principal_id: int) -> Tenant:
        """Create a new tenant and assign the creator as owner.

        Args:
            slug: The tenant slug value.
            name: The human-readable name to persist.
            owner_principal_id: The owner principal identifier for the current operation.

        Returns:
            The tenant ORM object for the requested scope.
        """
        existing = await self.db.scalar(select(Tenant).where(Tenant.slug == slug))
        if existing:
            raise BusinessException(IamErrorCode.TENANT_SLUG_EXISTS)

        owner = await self.db.scalar(select(Principal).where(Principal.id == owner_principal_id))
        if owner is None:
            raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)

        tenant = Tenant(slug=slug, name=name, is_active=True)
        self.db.add(tenant)
        await self.db.flush()

        # A freshly created tenant must receive the full built-in role graph before the owner bind.
        await self.ensure_builtin_roles(tenant)

        self.db.add(
            TenantMembership(
                tenant_id=tenant.id,
                principal_id=owner_principal_id,
                status=MembershipStatus.ACTIVE,
            )
        )
        await self.db.flush()
        await self._grant_role_by_code(tenant.id, owner_principal_id, RoleCode.OWNER)
        await self.db.flush()
        return tenant

    async def update_tenant(
        self,
        tenant_id: int,
        slug: str | None = None,
        name: str | None = None,
        is_active: bool | None = None,
    ) -> Tenant:
        """Update mutable tenant fields inside the tenant scope.

        Args:
            tenant_id: The tenant identifier for the current operation.
            slug: The tenant slug value.
            name: The human-readable name to persist.
            is_active: Whether the target record should be active.

        Returns:
            The tenant ORM object for the requested scope.
        """
        tenant = await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))
        if tenant is None:
            raise BusinessException(IamErrorCode.TENANT_NOT_FOUND)
        if slug is not None and slug != tenant.slug:
            existing = await self.db.scalar(select(Tenant).where(Tenant.slug == slug))
            if existing is not None:
                raise BusinessException(IamErrorCode.TENANT_SLUG_EXISTS)
            tenant.slug = slug
        if name is not None:
            tenant.name = name
        if is_active is not None:
            tenant.is_active = is_active
        await self.db.flush()
        return tenant

    async def delete_tenant(self, tenant_id: int) -> None:
        """Delete a tenant after revoking its active sessions.

        Args:
            tenant_id: The tenant identifier for the current operation.

        Returns:
            None
        """
        tenant = await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))
        if tenant is None:
            raise BusinessException(IamErrorCode.TENANT_NOT_FOUND)
        if tenant.slug == DEFAULT_TENANT_SLUG:
            raise BusinessException(IamErrorCode.DEFAULT_TENANT_DELETE_FORBIDDEN)

        sessions = (
            await self.db.scalars(
                select(AuthSession).where(
                    AuthSession.tenant_id == tenant_id, AuthSession.revoked_at.is_(None)
                )
            )
        ).all()
        for session in sessions:
            await self._revoke_session(session, session.access_token_hash)

        await self.db.delete(tenant)
        await self.db.flush()

    async def create_principal_for_user(
        self,
        username: str,
        password: str,
        display_name: str | None = None,
    ) -> tuple[Principal, UserAccount, Tenant]:
        """Create a new human principal and attach it to the default tenant.

        Args:
            username: The username associated with the account.
            password: The raw password provided by the caller.
            display_name: The display name to create or update.

        Returns:
            The created principal, user account, and tenant.
        """
        tenant = await self.bootstrap_personal_tenant()
        principal, user_account = await self._create_user_account(
            username=username,
            password=password,
            display_name=display_name,
        )

        # Every new human account is anchored to the shared default tenant before first login.
        self.db.add(
            TenantMembership(
                tenant_id=tenant.id,
                principal_id=principal.id,
                status=MembershipStatus.ACTIVE,
            )
        )
        await self.db.flush()
        await self._grant_role_by_code(tenant.id, principal.id, RoleCode.MEMBER)
        return principal, user_account, tenant

    async def create_agent_account(
        self,
        tenant_id: int,
        code: str,
        display_name: str,
        description: str = "",
        avatar_url: str | None = None,
        owner_principal_id: int | None = None,
    ) -> tuple[Principal, AgentAccount]:
        """Create a new agent principal inside a tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            code: The unique code value for the current resource.
            display_name: The display name to create or update.
            description: The description text to persist.
            avatar_url: The avatar URL to store on the account.
            owner_principal_id: The owner principal identifier for the current operation.

        Returns:
            The created principal and agent account.
        """
        existing = await self.db.scalar(select(AgentAccount).where(AgentAccount.code == code))
        if existing is not None:
            raise BusinessException(IamErrorCode.AGENT_CODE_EXISTS)

        if owner_principal_id is not None:
            owner = await self.db.scalar(
                select(Principal).where(Principal.id == owner_principal_id)
            )
            if owner is None:
                raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)

        principal = Principal(
            principal_type=PrincipalType.AGENT,
            display_name=display_name,
            is_active=True,
        )
        agent_account = AgentAccount(
            principal=principal,
            owner_principal_id=owner_principal_id,
            code=code,
            avatar_url=avatar_url or DEFAULT_AGENT_AVATAR_URL,
            description=description,
        )
        self.db.add_all([principal, agent_account])
        await self.db.flush()

        # Agents participate in tenant authz exactly like users, so membership and default role binding
        # are created immediately rather than lazily on first use.
        self.db.add(
            TenantMembership(
                tenant_id=tenant_id,
                principal_id=principal.id,
                status=MembershipStatus.ACTIVE,
            )
        )
        await self.db.flush()
        await self._grant_role_by_code(tenant_id, principal.id, RoleCode.AGENT_RUNNER)
        return principal, agent_account

    async def update_user_profile(
        self,
        principal_id: int,
        display_name: str | None = None,
        bio: str | None = None,
        gender: str | None = None,
        date_of_birth=None,
        timezone: str | None = None,
    ) -> UserAccount:
        """Update mutable profile fields for a user account.

        Args:
            principal_id: The principal identifier for the current operation.
            display_name: The display name to create or update.
            bio: The biography text to persist on the user account.
            gender: The optional gender value to persist.
            date_of_birth: The optional birth date to persist.
            timezone: The optional timezone string to persist.

        Returns:
            The user account ORM object for the operation result.
        """
        user_account = await self.db.scalar(
            select(UserAccount)
            .options(joinedload(UserAccount.principal))
            .where(UserAccount.principal_id == principal_id)
        )
        if user_account is None:
            raise BusinessException(IamErrorCode.USER_NOT_FOUND)
        if display_name is not None:
            user_account.principal.display_name = display_name
        if bio is not None:
            user_account.bio = bio
        if gender is not None:
            user_account.gender = gender
        if date_of_birth is not None:
            user_account.date_of_birth = date_of_birth
        if timezone is not None:
            user_account.timezone = timezone
        await self.db.flush()
        return user_account

    async def update_user_avatar(self, principal_id: int, avatar_url: str) -> UserAccount:
        """Update the avatar URL for a user account.

        Args:
            principal_id: The principal identifier for the current operation.
            avatar_url: The avatar URL to store on the account.

        Returns:
            The user account ORM object for the operation result.
        """
        user_account = await self.db.scalar(
            select(UserAccount)
            .options(joinedload(UserAccount.principal))
            .where(UserAccount.principal_id == principal_id)
        )
        if user_account is None:
            raise BusinessException(IamErrorCode.USER_NOT_FOUND)
        user_account.avatar_url = avatar_url
        await self.db.flush()
        return user_account

    async def reset_password(self, principal_id: int, new_password: str) -> None:
        """Reset a user password and invalidate existing sessions.

        Args:
            principal_id: The principal identifier for the current operation.
            new_password: The new raw password that will replace the current one.

        Returns:
            None
        """
        user_account = await self.db.scalar(
            select(UserAccount).where(UserAccount.principal_id == principal_id)
        )
        if user_account is None:
            raise BusinessException(IamErrorCode.USER_NOT_FOUND)
        user_account.password_hash = hash_password(new_password)
        await self.db.flush()
        await self.revoke_all_sessions(principal_id)

    async def set_principal_active(self, principal_id: int, is_active: bool) -> Principal:
        """Enable or disable a principal and revoke sessions when disabling.

        Args:
            principal_id: The principal identifier for the current operation.
            is_active: Whether the target record should be active.

        Returns:
            The principal ORM object for the operation result.
        """
        principal = await self.db.scalar(select(Principal).where(Principal.id == principal_id))
        if principal is None:
            raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)
        principal.is_active = is_active
        await self.db.flush()
        if not is_active:
            await self.revoke_all_sessions(principal_id)
        return principal

    async def update_agent(
        self,
        principal_id: int,
        display_name: str | None = None,
        description: str | None = None,
        avatar_url: str | None = None,
    ) -> AgentAccount:
        """Update mutable profile fields for an agent account.

        Args:
            principal_id: The principal identifier for the current operation.
            display_name: The display name to create or update.
            description: The description text to persist.
            avatar_url: The avatar URL to store on the account.

        Returns:
            The agent account ORM object for the operation result.
        """
        agent_account = await self.db.scalar(
            select(AgentAccount)
            .options(joinedload(AgentAccount.principal))
            .where(AgentAccount.principal_id == principal_id)
        )
        if agent_account is None:
            raise BusinessException(IamErrorCode.AGENT_NOT_FOUND)
        if display_name is not None:
            agent_account.principal.display_name = display_name
        if description is not None:
            agent_account.description = description
        if avatar_url is not None:
            agent_account.avatar_url = avatar_url
        await self.db.flush()
        return agent_account

    async def set_agent_owner(
        self, principal_id: int, owner_principal_id: int | None
    ) -> AgentAccount:
        """Assign or clear the human owner of an agent account.

        Args:
            principal_id: The principal identifier for the current operation.
            owner_principal_id: The owner principal identifier for the current operation.

        Returns:
            The agent account ORM object for the operation result.
        """
        agent_account = await self.db.scalar(
            select(AgentAccount)
            .options(joinedload(AgentAccount.principal))
            .where(AgentAccount.principal_id == principal_id)
        )
        if agent_account is None:
            raise BusinessException(IamErrorCode.AGENT_NOT_FOUND)
        if owner_principal_id is not None:
            owner = await self.db.scalar(
                select(Principal).where(Principal.id == owner_principal_id)
            )
            if owner is None:
                raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)
        agent_account.owner_principal_id = owner_principal_id
        await self.db.flush()
        return agent_account

    async def delete_agent(self, principal_id: int) -> None:
        """Delete an agent principal and revoke its sessions.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        principal = await self.db.scalar(
            select(Principal)
            .options(joinedload(Principal.agent_account))
            .where(Principal.id == principal_id, Principal.principal_type == PrincipalType.AGENT)
        )
        if principal is None or principal.agent_account is None:
            raise BusinessException(IamErrorCode.AGENT_NOT_FOUND)
        await self.revoke_all_sessions(principal_id)
        await self.db.delete(principal)
        await self.db.flush()

    async def add_membership(
        self, tenant_id: int, principal_id: int, status: str
    ) -> TenantMembership:
        """Add a principal to a tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            status: The membership status to store.

        Returns:
            The `TenantMembership` result for the operation.
        """
        tenant = await self.db.scalar(select(Tenant).where(Tenant.id == tenant_id))
        if tenant is None:
            raise BusinessException(IamErrorCode.TENANT_NOT_FOUND)
        principal = await self.db.scalar(select(Principal).where(Principal.id == principal_id))
        if principal is None:
            raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)

        existing = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.principal_id == principal_id,
            )
        )
        if existing is not None:
            raise BusinessException(IamErrorCode.MEMBERSHIP_EXISTS)

        membership = TenantMembership(tenant_id=tenant_id, principal_id=principal_id, status=status)
        self.db.add(membership)
        await self.db.flush()
        return membership

    async def update_membership(
        self, tenant_id: int, principal_id: int, status: str
    ) -> TenantMembership:
        """Update the membership state for a tenant principal.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            status: The membership status to store.

        Returns:
            The `TenantMembership` result for the operation.
        """
        membership = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.principal_id == principal_id,
            )
        )
        if membership is None:
            raise BusinessException(IamErrorCode.MEMBERSHIP_NOT_FOUND)
        membership.status = status
        await self.db.flush()
        return membership

    async def remove_membership(self, tenant_id: int, principal_id: int) -> None:
        """Remove a principal from a tenant and revoke scoped access.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        membership = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.principal_id == principal_id,
            )
        )
        if membership is None:
            raise BusinessException(IamErrorCode.MEMBERSHIP_NOT_FOUND)
        await self._ensure_not_last_owner(tenant_id, principal_id)

        bindings = (
            await self.db.scalars(
                select(PrincipalRoleBinding).where(
                    PrincipalRoleBinding.tenant_id == tenant_id,
                    PrincipalRoleBinding.principal_id == principal_id,
                )
            )
        ).all()
        for binding in bindings:
            await self.db.delete(binding)
        await self._revoke_sessions_for_tenant_principal(tenant_id, principal_id)
        await self.db.delete(membership)
        await self.db.flush()
        await self.increment_authz_version(principal_id)

    async def grant_role(
        self, tenant_id: int, principal_id: int, role_id: int
    ) -> PrincipalRoleBinding:
        """Grant a tenant role to a principal.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            role_id: The role identifier for the current operation.

        Returns:
            The role binding created or reused by the operation.
        """
        role = await self.db.scalar(select(Role).where(Role.id == role_id))
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        if role.tenant_id != tenant_id:
            raise BusinessException(IamErrorCode.TENANT_ROLE_SCOPE_MISMATCH)
        membership = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == tenant_id,
                TenantMembership.principal_id == principal_id,
            )
        )
        if membership is None:
            raise BusinessException(IamErrorCode.PRINCIPAL_NOT_IN_TENANT)

        existing = await self.db.scalar(
            select(PrincipalRoleBinding).where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
                PrincipalRoleBinding.role_id == role_id,
            )
        )
        if existing is not None:
            return existing

        binding = PrincipalRoleBinding(
            tenant_id=tenant_id, principal_id=principal_id, role_id=role_id
        )
        self.db.add(binding)
        await self.db.flush()
        await self.increment_authz_version(principal_id)
        return binding

    async def revoke_role(self, tenant_id: int, principal_id: int, role_id: int) -> None:
        """Revoke a tenant role from a principal.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            role_id: The role identifier for the current operation.

        Returns:
            None
        """
        await self._ensure_not_last_owner(tenant_id, principal_id, role_id)
        binding = await self.db.scalar(
            select(PrincipalRoleBinding).where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
                PrincipalRoleBinding.role_id == role_id,
            )
        )
        if binding is None:
            return
        await self.db.delete(binding)
        await self.db.flush()
        await self.increment_authz_version(principal_id)

    async def create_role(self, tenant_id: int, code: str, name: str, description: str) -> Role:
        """Create a custom tenant-scoped role.

        Args:
            tenant_id: The tenant identifier for the current operation.
            code: The unique code value for the current resource.
            name: The human-readable name to persist.
            description: The description text to persist.

        Returns:
            The role ORM object for the operation result.
        """
        existing = await self.db.scalar(
            select(Role).where(Role.tenant_id == tenant_id, Role.code == code)
        )
        if existing is not None:
            raise BusinessException(IamErrorCode.ROLE_CODE_EXISTS)
        role = Role(
            tenant_id=tenant_id, code=code, name=name, description=description, is_builtin=False
        )
        self.db.add(role)
        await self.db.flush()
        return role

    async def update_role(
        self,
        tenant_id: int,
        role_id: int,
        code: str | None = None,
        name: str | None = None,
        description: str | None = None,
    ) -> Role:
        """Update a tenant-scoped role.

        Args:
            tenant_id: The tenant identifier for the current operation.
            role_id: The role identifier for the current operation.
            code: The unique code value for the current resource.
            name: The human-readable name to persist.
            description: The description text to persist.

        Returns:
            The role ORM object for the operation result.
        """
        role = await self.db.scalar(
            select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
        )
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        if role.is_builtin and (
            (code is not None and code != role.code) or (name is not None and name != role.name)
        ):
            raise BusinessException(IamErrorCode.BUILTIN_ROLE_MUTATION_FORBIDDEN)
        if code is not None and code != role.code:
            existing = await self.db.scalar(
                select(Role).where(Role.tenant_id == tenant_id, Role.code == code)
            )
            if existing is not None:
                raise BusinessException(IamErrorCode.ROLE_CODE_EXISTS)
            role.code = code
        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        await self.db.flush()
        return role

    async def delete_role(self, tenant_id: int, role_id: int) -> None:
        """Delete a custom role after validating references.

        Args:
            tenant_id: The tenant identifier for the current operation.
            role_id: The role identifier for the current operation.

        Returns:
            None
        """
        role = await self.db.scalar(
            select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
        )
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        if role.is_builtin:
            raise BusinessException(IamErrorCode.BUILTIN_ROLE_MUTATION_FORBIDDEN)
        has_bindings = await self.db.scalar(
            select(PrincipalRoleBinding).where(PrincipalRoleBinding.role_id == role_id).limit(1)
        )
        has_acl = await self.db.scalar(
            select(AclEntry).where(AclEntry.subject_role_id == role_id).limit(1)
        )
        if has_bindings is not None or has_acl is not None:
            raise BusinessException(IamErrorCode.ROLE_DELETE_FORBIDDEN)
        await self.db.delete(role)
        await self.db.flush()

    async def replace_role_permissions(
        self, tenant_id: int, role_id: int, permission_ids: list[int]
    ) -> Role:
        """Replace the full permission set of a role.

        Args:
            tenant_id: The tenant identifier for the current operation.
            role_id: The role identifier for the current operation.
            permission_ids: The permission identifiers to apply.

        Returns:
            The role ORM object for the operation result.
        """
        role = await self.db.scalar(
            select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
        )
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        permissions = {
            permission.id: permission
            for permission in (
                await self.db.scalars(
                    select(Permission).where(Permission.id.in_(permission_ids or [-1]))
                )
            ).all()
        }
        if len(permissions) != len(set(permission_ids)):
            raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)

        current_links = (
            await self.db.scalars(select(RolePermission).where(RolePermission.role_id == role_id))
        ).all()
        for link in current_links:
            await self.db.delete(link)
        await self.db.flush()

        # The replacement is intentionally full-state: delete then re-insert so the DB becomes the source
        # of truth for exactly the provided permission set.
        for permission_id in permission_ids:
            self.db.add(RolePermission(role_id=role_id, permission_id=permission_id))
        await self.db.flush()
        await self._bump_role_subjects_authz(role_id)
        refreshed = await self.db.scalar(
            select(Role).options(joinedload(Role.tenant)).where(Role.id == role_id)
        )
        assert refreshed is not None
        return refreshed

    async def add_permission_to_role(
        self, tenant_id: int, role_id: int, permission_id: int
    ) -> None:
        """Attach a permission to a role.

        Args:
            tenant_id: The tenant identifier for the current operation.
            role_id: The role identifier for the current operation.
            permission_id: The permission identifier for the current operation.

        Returns:
            None
        """
        role = await self.db.scalar(
            select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
        )
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        permission = await self.db.scalar(select(Permission).where(Permission.id == permission_id))
        if permission is None:
            raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)
        existing = await self.db.scalar(
            select(RolePermission).where(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id,
            )
        )
        if existing is None:
            self.db.add(RolePermission(role_id=role_id, permission_id=permission_id))
            await self.db.flush()
            await self._bump_role_subjects_authz(role_id)

    async def remove_permission_from_role(
        self, tenant_id: int, role_id: int, permission_id: int
    ) -> None:
        """Remove a permission from a role.

        Args:
            tenant_id: The tenant identifier for the current operation.
            role_id: The role identifier for the current operation.
            permission_id: The permission identifier for the current operation.

        Returns:
            None
        """
        role = await self.db.scalar(
            select(Role).where(Role.id == role_id, Role.tenant_id == tenant_id)
        )
        if role is None:
            raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
        link = await self.db.scalar(
            select(RolePermission).where(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id,
            )
        )
        if link is None:
            return
        await self.db.delete(link)
        await self.db.flush()
        await self._bump_role_subjects_authz(role_id)

    async def create_permission(
        self,
        code: str,
        resource_type: str,
        action: str,
        description: str,
    ) -> Permission:
        """Create a new permission definition.

        Args:
            code: The unique code value for the current resource.
            resource_type: The resource type involved in the operation.
            action: The `action` value.
            description: The description text to persist.

        Returns:
            The permission ORM object for the operation result.
        """
        existing = await self.db.scalar(select(Permission).where(Permission.code == code))
        if existing is not None:
            raise BusinessException(IamErrorCode.PERMISSION_CODE_EXISTS)
        permission = Permission(
            code=code,
            resource_type=resource_type,
            action=action,
            description=description,
        )
        self.db.add(permission)
        await self.db.flush()
        return permission

    async def update_permission(
        self,
        permission_id: int,
        code: str | None = None,
        resource_type: str | None = None,
        action: str | None = None,
        description: str | None = None,
    ) -> Permission:
        """Update a permission definition.

        Args:
            permission_id: The permission identifier for the current operation.
            code: The unique code value for the current resource.
            resource_type: The resource type involved in the operation.
            action: The `action` value.
            description: The description text to persist.

        Returns:
            The permission ORM object for the operation result.
        """
        permission = await self.db.scalar(select(Permission).where(Permission.id == permission_id))
        if permission is None:
            raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)
        if code is not None and code != permission.code:
            existing = await self.db.scalar(select(Permission).where(Permission.code == code))
            if existing is not None:
                raise BusinessException(IamErrorCode.PERMISSION_CODE_EXISTS)
            permission.code = code
        if resource_type is not None:
            permission.resource_type = resource_type
        if action is not None:
            permission.action = action
        if description is not None:
            permission.description = description
        await self.db.flush()
        return permission

    async def delete_permission(self, permission_id: int) -> None:
        """Delete a permission and bump affected authorization snapshots.

        Args:
            permission_id: The permission identifier for the current operation.

        Returns:
            None
        """
        permission = await self.db.scalar(select(Permission).where(Permission.id == permission_id))
        if permission is None:
            raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)
        role_ids = list(
            (
                await self.db.execute(
                    select(RolePermission.role_id).where(
                        RolePermission.permission_id == permission_id
                    )
                )
            )
            .scalars()
            .all()
        )
        role_subject_ids = await self._role_subject_principal_ids(role_ids)
        acl_subject_ids = await self._affected_principal_ids_from_permission_acl(permission_id)
        await self.db.delete(permission)
        await self.db.flush()
        await self._bump_principals_authz(role_subject_ids | acl_subject_ids)

    async def create_acl_entry(
        self,
        tenant_id: int,
        resource_type: str,
        resource_id: int,
        permission_id: int,
        subject_principal_id: int | None,
        subject_role_id: int | None,
        effect: str,
    ) -> AclEntry:
        """Create an ACL override entry.

        Args:
            tenant_id: The tenant identifier for the current operation.
            resource_type: The resource type involved in the operation.
            resource_id: The resource identifier involved in the operation.
            permission_id: The permission identifier for the current operation.
            subject_principal_id: The principal identifier targeted by the ACL entry.
            subject_role_id: The role identifier targeted by the ACL entry.
            effect: The ACL effect to apply.

        Returns:
            The ACL entry ORM object for the operation result.
        """
        await self._validate_acl_subject(tenant_id, subject_principal_id, subject_role_id)
        permission = await self.db.scalar(select(Permission).where(Permission.id == permission_id))
        if permission is None:
            raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)
        acl_entry = AclEntry(
            tenant_id=tenant_id,
            resource_type=resource_type,
            resource_id=resource_id,
            permission_id=permission_id,
            subject_principal_id=subject_principal_id,
            subject_role_id=subject_role_id,
            effect=effect,
        )
        self.db.add(acl_entry)
        await self.db.flush()
        await self._bump_acl_subjects_authz(subject_principal_id, subject_role_id)
        return acl_entry

    async def update_acl_entry(
        self,
        tenant_id: int,
        acl_id: int,
        permission_id: int | None = None,
        subject_principal_id: int | None = None,
        subject_role_id: int | None = None,
        effect: str | None = None,
    ) -> AclEntry:
        """Update an ACL override entry.

        Args:
            tenant_id: The tenant identifier for the current operation.
            acl_id: The ACL entry identifier.
            permission_id: The permission identifier for the current operation.
            subject_principal_id: The principal identifier targeted by the ACL entry.
            subject_role_id: The role identifier targeted by the ACL entry.
            effect: The ACL effect to apply.

        Returns:
            The ACL entry ORM object for the operation result.
        """
        acl_entry = await self.db.scalar(
            select(AclEntry).where(AclEntry.tenant_id == tenant_id, AclEntry.id == acl_id)
        )
        if acl_entry is None:
            raise BusinessException(IamErrorCode.ACL_ENTRY_NOT_FOUND)

        old_principal_id = acl_entry.subject_principal_id
        old_role_id = acl_entry.subject_role_id

        new_principal_id = (
            subject_principal_id
            if subject_principal_id is not None
            else acl_entry.subject_principal_id
        )
        new_role_id = subject_role_id if subject_role_id is not None else acl_entry.subject_role_id
        await self._validate_acl_subject(tenant_id, new_principal_id, new_role_id)

        if permission_id is not None:
            permission = await self.db.scalar(
                select(Permission).where(Permission.id == permission_id)
            )
            if permission is None:
                raise BusinessException(IamErrorCode.PERMISSION_NOT_FOUND)
            acl_entry.permission_id = permission_id
        acl_entry.subject_principal_id = new_principal_id
        acl_entry.subject_role_id = new_role_id
        if effect is not None:
            acl_entry.effect = effect
        await self.db.flush()

        await self._bump_acl_subjects_authz(old_principal_id, old_role_id)
        await self._bump_acl_subjects_authz(new_principal_id, new_role_id)
        return acl_entry

    async def delete_acl_entry(self, tenant_id: int, acl_id: int) -> None:
        """Delete an ACL override entry.

        Args:
            tenant_id: The tenant identifier for the current operation.
            acl_id: The ACL entry identifier.

        Returns:
            None
        """
        acl_entry = await self.db.scalar(
            select(AclEntry).where(AclEntry.tenant_id == tenant_id, AclEntry.id == acl_id)
        )
        if acl_entry is None:
            raise BusinessException(IamErrorCode.ACL_ENTRY_NOT_FOUND)
        principal_id = acl_entry.subject_principal_id
        role_id = acl_entry.subject_role_id
        await self.db.delete(acl_entry)
        await self.db.flush()
        await self._bump_acl_subjects_authz(principal_id, role_id)

    async def increment_authz_version(self, principal_id: int) -> None:
        """Increment the authorization version for a principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        await self.db.execute(
            update(Principal)
            .where(Principal.id == principal_id)
            .values(authz_version=Principal.authz_version + 1)
        )

    async def increment_session_version(self, principal_id: int) -> None:
        """Increment the session version for a principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        await self.db.execute(
            update(Principal)
            .where(Principal.id == principal_id)
            .values(session_version=Principal.session_version + 1)
        )

    async def create_auth_session(
        self,
        principal: Principal,
        tenant: Tenant,
        user_account: UserAccount | None = None,
        agent_account: AgentAccount | None = None,
        user_agent: str = "",
        ip_address: str = "",
    ) -> AuthTokenResponse:
        """Create a persisted auth session and cache its access snapshot.

        Args:
            principal: The principal ORM object being processed.
            tenant: The tenant ORM object being processed.
            user_account: The user account ORM object being processed.
            agent_account: The agent account ORM object being processed.
            user_agent: The caller user-agent string.
            ip_address: The best-effort caller IP address.

        Returns:
            The authenticated session payload.
        """
        access_token = generate_opaque_token()
        refresh_token = generate_opaque_token()
        access_token_hash = hash_token(access_token)
        refresh_token_hash = hash_token(refresh_token)

        now = datetime.now(UTC)
        session = AuthSession(
            principal_id=principal.id,
            tenant_id=tenant.id,
            access_token_hash=access_token_hash,
            refresh_token_hash=refresh_token_hash,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
        )
        self.db.add(session)
        await self.db.flush()

        # Response shaping must use explicitly supplied ORM objects to avoid implicit IO.
        payload = AuthTokenResponse(
            user=self._to_user_response(user_account, principal=principal)
            if user_account
            else None,
            agent=self._to_agent_response(agent_account, principal=principal)
            if agent_account
            else None,
            tenant=self._to_tenant_response(tenant),
            access_token=access_token,
            refresh_token=refresh_token,
        )
        # The Redis snapshot lets auth middleware validate opaque tokens without a per-request DB hit.
        access_payload = {
            "session_id": session.id,
            "principal_id": principal.id,
            "tenant_id": tenant.id,
            "principal_type": principal.principal_type,
            "session_version": principal.session_version,
            "authz_version": principal.authz_version,
        }
        key_def = IamRedisKey.ACCESS_SESSION
        assert key_def.expire_seconds is not None
        await self.redis.setex(
            key_def.key(access_token_hash),
            key_def.expire_seconds,
            json_dumps(access_payload),
        )
        return payload

    async def revoke_session_by_access_token_hash(self, access_token_hash: str) -> None:
        """Revoke an active session by hashed access token.

        Args:
            access_token_hash: The hashed access token value.

        Returns:
            None
        """
        session = await self.db.scalar(
            select(AuthSession).where(
                AuthSession.access_token_hash == access_token_hash,
                AuthSession.revoked_at.is_(None),
            )
        )
        if session is not None:
            await self._revoke_session(session, access_token_hash)

    async def revoke_session_by_id(self, session_id: int, principal_id: int) -> None:
        """Revoke one session owned by the principal.

        Args:
            session_id: The auth session identifier.
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        session = await self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == session_id,
                AuthSession.principal_id == principal_id,
                AuthSession.revoked_at.is_(None),
            )
        )
        if session is not None:
            await self._revoke_session(session, session.access_token_hash)

    async def revoke_all_sessions(self, principal_id: int) -> None:
        """Revoke every active session for a principal.

        Args:
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        sessions = (
            await self.db.scalars(
                select(AuthSession).where(
                    AuthSession.principal_id == principal_id,
                    AuthSession.revoked_at.is_(None),
                )
            )
        ).all()
        for session in sessions:
            await self._revoke_session(session, session.access_token_hash)
        await self.increment_session_version(principal_id)

    async def refresh_session(
        self,
        refresh_token: str,
        user_agent: str = "",
        ip_address: str = "",
    ) -> AuthTokenResponse:
        """Rotate a refresh token into a new auth session.

        Args:
            refresh_token: The raw opaque refresh token presented by the client.
            user_agent: The caller user-agent string.
            ip_address: The best-effort caller IP address.

        Returns:
            The authenticated session payload.
        """
        refresh_hash = hash_token(refresh_token)
        session = await self.db.scalar(
            select(AuthSession)
            .options(
                joinedload(AuthSession.principal).joinedload(Principal.user_account),
                joinedload(AuthSession.principal).joinedload(Principal.agent_account),
                joinedload(AuthSession.tenant),
            )
            .where(
                AuthSession.refresh_token_hash == refresh_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > datetime.now(UTC),
            )
        )
        if session is None:
            raise AuthException(CommonErrorCode.TOKEN_INVALID)
        if not session.principal.is_active or not session.tenant.is_active:
            raise AuthException(CommonErrorCode.UNAUTHORIZED)

        # Refresh is implemented as revoke-then-create so both the DB record and Redis snapshot rotate.
        await self._revoke_session(session, session.access_token_hash)
        return await self.create_auth_session(
            session.principal,
            session.tenant,
            user_account=session.principal.user_account,
            agent_account=session.principal.agent_account,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def switch_tenant(
        self,
        principal_id: int,
        access_token_hash: str,
        target_tenant_id: int,
        user_agent: str = "",
        ip_address: str = "",
    ) -> AuthTokenResponse:
        """Rotate the current access session into a different tenant scope.

        Args:
            principal_id: The principal identifier for the current operation.
            access_token_hash: The hashed access token value.
            target_tenant_id: The tenant identifier the caller wants to switch into.
            user_agent: The caller user-agent string.
            ip_address: The best-effort caller IP address.

        Returns:
            The authenticated session payload.
        """
        membership = await self.db.scalar(
            select(TenantMembership).where(
                TenantMembership.tenant_id == target_tenant_id,
                TenantMembership.principal_id == principal_id,
            )
        )
        if membership is None:
            raise BusinessException(IamErrorCode.TENANT_SWITCH_FORBIDDEN)

        session = await self.db.scalar(
            select(AuthSession)
            .options(
                joinedload(AuthSession.principal).joinedload(Principal.user_account),
                joinedload(AuthSession.principal).joinedload(Principal.agent_account),
            )
            .where(
                AuthSession.access_token_hash == access_token_hash,
                AuthSession.principal_id == principal_id,
                AuthSession.revoked_at.is_(None),
            )
        )
        if session is None:
            raise AuthException(CommonErrorCode.TOKEN_INVALID)
        tenant = await self.db.scalar(
            select(Tenant).where(Tenant.id == target_tenant_id, Tenant.is_active.is_(True))
        )
        if tenant is None:
            raise BusinessException(IamErrorCode.TENANT_NOT_FOUND)

        # Switching tenant invalidates the current access token so tenant scope cannot fork across tokens.
        await self._revoke_session(session, access_token_hash)
        return await self.create_auth_session(
            session.principal,
            tenant,
            user_account=session.principal.user_account,
            agent_account=session.principal.agent_account,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def _grant_role_by_code(
        self,
        tenant_id: int,
        principal_id: int,
        role_code: str,
    ) -> PrincipalRoleBinding | None:
        """Grant a role by code when it exists in the tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            role_code: The role code to resolve inside the tenant.

        Returns:
            The role binding when the role exists, otherwise ``None``.
        """
        role = await self.db.scalar(
            select(Role).where(Role.tenant_id == tenant_id, Role.code == role_code)
        )
        if role is None:
            return None
        return await self.grant_role(tenant_id, principal_id, role.id)

    async def _revoke_session(self, session: AuthSession, access_token_hash: str) -> None:
        """Mark a session revoked and remove its access snapshot from Redis.

        Args:
            session: The auth session ORM object being processed.
            access_token_hash: The hashed access token value.

        Returns:
            None
        """
        session.revoked_at = datetime.now(UTC)
        await self.db.flush()
        await self.redis.delete(IamRedisKey.ACCESS_SESSION.key(access_token_hash))

    async def _revoke_sessions_for_tenant_principal(
        self, tenant_id: int, principal_id: int
    ) -> None:
        """Revoke all active sessions for one principal in one tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.

        Returns:
            None
        """
        sessions = (
            await self.db.scalars(
                select(AuthSession).where(
                    AuthSession.tenant_id == tenant_id,
                    AuthSession.principal_id == principal_id,
                    AuthSession.revoked_at.is_(None),
                )
            )
        ).all()
        for session in sessions:
            await self._revoke_session(session, session.access_token_hash)

    async def _ensure_not_last_owner(
        self,
        tenant_id: int,
        principal_id: int,
        role_id: int | None = None,
    ) -> None:
        """Prevent removal of the final owner from a tenant.

        Args:
            tenant_id: The tenant identifier for the current operation.
            principal_id: The principal identifier for the current operation.
            role_id: The role identifier for the current operation.

        Returns:
            None
        """
        owner_role = await self.db.scalar(
            select(Role).where(Role.tenant_id == tenant_id, Role.code == RoleCode.OWNER)
        )
        if owner_role is None:
            return
        if role_id is not None and role_id != owner_role.id:
            return
        has_owner = await self.db.scalar(
            select(PrincipalRoleBinding).where(
                PrincipalRoleBinding.tenant_id == tenant_id,
                PrincipalRoleBinding.principal_id == principal_id,
                PrincipalRoleBinding.role_id == owner_role.id,
            )
        )
        if has_owner is None:
            return
        # Owner removal must never leave the tenant without any owner binding.
        owner_count = (
            (
                await self.db.execute(
                    select(PrincipalRoleBinding.principal_id).where(
                        PrincipalRoleBinding.tenant_id == tenant_id,
                        PrincipalRoleBinding.role_id == owner_role.id,
                    )
                )
            )
            .scalars()
            .all()
        )
        if len(owner_count) <= 1:
            raise BusinessException(IamErrorCode.LAST_OWNER_REQUIRED)

    async def _bump_role_subjects_authz(self, role_id: int) -> None:
        """Bump authz versions for principals affected by a role change.

        Args:
            role_id: The role identifier for the current operation.

        Returns:
            None
        """
        principal_ids = await self._role_subject_principal_ids([role_id])
        await self._bump_principals_authz(principal_ids)

    async def _role_subject_principal_ids(self, role_ids: list[int]) -> set[int]:
        """Collect principals that currently hold any of the given roles.

        Args:
            role_ids: The role identifiers relevant to the current operation.

        Returns:
            The `set[int]` result for the operation.
        """
        if not role_ids:
            return set()
        result = await self.db.execute(
            select(PrincipalRoleBinding.principal_id).where(
                PrincipalRoleBinding.role_id.in_(role_ids)
            )
        )
        return set(result.scalars().all())

    async def _affected_principal_ids_from_permission_acl(self, permission_id: int) -> set[int]:
        """Collect principals affected by ACL entries for a permission.

        Args:
            permission_id: The permission identifier for the current operation.

        Returns:
            The `set[int]` result for the operation.
        """
        direct_ids = {
            principal_id
            for principal_id in (
                (
                    await self.db.execute(
                        select(AclEntry.subject_principal_id).where(
                            AclEntry.permission_id == permission_id,
                            AclEntry.subject_principal_id.is_not(None),
                        )
                    )
                )
                .scalars()
                .all()
            )
            if principal_id is not None
        }
        # Role-targeted ACL rows must be expanded into principals before we can invalidate authz versions.
        role_ids = list(
            (
                await self.db.execute(
                    select(AclEntry.subject_role_id).where(
                        AclEntry.permission_id == permission_id,
                        AclEntry.subject_role_id.is_not(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        return direct_ids | (await self._role_subject_principal_ids(role_ids))

    async def _bump_acl_subjects_authz(
        self,
        subject_principal_id: int | None,
        subject_role_id: int | None,
    ) -> None:
        """Bump authz versions for principals affected by an ACL change.

        Args:
            subject_principal_id: The principal identifier targeted by the ACL entry.
            subject_role_id: The role identifier targeted by the ACL entry.

        Returns:
            None
        """
        principal_ids: set[int] = set()
        if subject_principal_id is not None:
            principal_ids.add(subject_principal_id)
        if subject_role_id is not None:
            principal_ids |= await self._role_subject_principal_ids([subject_role_id])
        await self._bump_principals_authz(principal_ids)

    async def _bump_principals_authz(self, principal_ids: set[int]) -> None:
        """Increment the authz version for every affected principal.

        Args:
            principal_ids: The `principal_ids` value.

        Returns:
            None
        """
        for principal_id in principal_ids:
            await self.increment_authz_version(principal_id)

    async def _validate_acl_subject(
        self,
        tenant_id: int,
        subject_principal_id: int | None,
        subject_role_id: int | None,
    ) -> None:
        """Validate that an ACL subject belongs to the tenant scope.

        Args:
            tenant_id: The tenant identifier for the current operation.
            subject_principal_id: The principal identifier targeted by the ACL entry.
            subject_role_id: The role identifier targeted by the ACL entry.

        Returns:
            None
        """
        if (subject_principal_id is None) == (subject_role_id is None):
            raise BusinessException(IamErrorCode.INVALID_ACL_SUBJECT)
        if subject_principal_id is not None:
            membership = await self.db.scalar(
                select(TenantMembership).where(
                    TenantMembership.tenant_id == tenant_id,
                    TenantMembership.principal_id == subject_principal_id,
                )
            )
            if membership is None:
                raise BusinessException(IamErrorCode.PRINCIPAL_NOT_IN_TENANT)
        if subject_role_id is not None:
            role = await self.db.scalar(select(Role).where(Role.id == subject_role_id))
            if role is None:
                raise BusinessException(IamErrorCode.ROLE_NOT_FOUND)
            if role.tenant_id != tenant_id:
                raise BusinessException(IamErrorCode.TENANT_ROLE_SCOPE_MISMATCH)

    @staticmethod
    def _to_tenant_response(tenant: Tenant) -> TenantSummaryResponse:
        """Convert a tenant ORM object into its response model.

        Args:
            tenant: The tenant ORM object being processed.

        Returns:
            The serialized tenant response model.
        """
        return TenantSummaryResponse.model_validate(tenant)

    @staticmethod
    def _to_user_response(
        user_account: UserAccount,
        *,
        principal: Principal | None = None,
    ) -> UserAccountResponse:
        """Convert a user-account ORM object into its response model.

        Args:
            user_account: The user account ORM object being processed.
            principal: The principal ORM object being processed.

        Returns:
            The serialized user-account response model.
        """
        resolved_principal = principal or user_account.principal
        return UserAccountResponse(
            principal_id=user_account.principal_id,
            username=user_account.username,
            avatar_url=user_account.avatar_url,
            bio=user_account.bio,
            gender=user_account.gender,
            date_of_birth=user_account.date_of_birth,
            timezone=user_account.timezone,
            display_name=resolved_principal.display_name,
            is_active=resolved_principal.is_active,
            created_at=user_account.created_at,
            updated_at=user_account.updated_at,
        )

    @staticmethod
    def _to_agent_response(
        agent_account: AgentAccount,
        *,
        principal: Principal | None = None,
    ) -> AgentAccountResponse:
        """Convert an agent-account ORM object into its response model.

        Args:
            agent_account: The agent account ORM object being processed.
            principal: The principal ORM object being processed.

        Returns:
            The serialized agent-account response model.
        """
        resolved_principal = principal or agent_account.principal
        return AgentAccountResponse(
            principal_id=agent_account.principal_id,
            owner_principal_id=agent_account.owner_principal_id,
            code=agent_account.code,
            avatar_url=agent_account.avatar_url,
            description=agent_account.description,
            display_name=resolved_principal.display_name,
            is_active=resolved_principal.is_active,
            created_at=agent_account.created_at,
            updated_at=agent_account.updated_at,
        )


def json_dumps(data: dict) -> str:
    """Serialize a small dictionary payload for Redis storage.

    Args:
        data: The dictionary payload to serialize.

    Returns:
        The JSON string stored in Redis.
    """
    import json

    return json.dumps(data)


def get_iam_commands(db: DbSession, redis: RedisDep) -> IamCommands:
    """Build the request-scoped IAM command service.

    Args:
        db: The request-scoped SQLAlchemy async session.
        redis: The request-scoped Redis client.

    Returns:
        The request-scoped IAM command service.
    """
    return IamCommands(db, redis)


IamCommandsDep = Annotated[IamCommands, Depends(get_iam_commands)]
