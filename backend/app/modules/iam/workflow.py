"""IAM workflow: cross-domain orchestration for auth flows."""

from __future__ import annotations

from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import BusinessException, DbSession, RedisDep, log
from app.modules.iam.commands import IamCommands
from app.modules.iam.errors import IamErrorCode
from app.modules.iam.queries import IamQueries
from app.modules.iam.schemas import AuthMeResponse, AuthTokenResponse, PrincipalResponse
from app.utils import verify_password


class IamWorkflow:
    """Cross-domain orchestration for IAM auth flows."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis, request: Request) -> None:
        """Initialize the IAM workflow service.

        Args:
            db: The request-scoped SQLAlchemy async session.
            redis: The request-scoped Redis client.
            request: The current FastAPI request.

        Returns:
            None
        """
        self.db = db
        self.redis = redis
        self.request = request
        self._iam_commands = IamCommands(db, redis)
        self._iam_queries = IamQueries(db, redis)

    def user_agent(self) -> str:
        """Return the caller user-agent string from the current request.

        Args:
            None

        Returns:
            The raw ``User-Agent`` header, or an empty string when absent.
        """
        return self.request.headers.get("user-agent", "")

    def ip_address(self) -> str:
        """Return the best-effort caller IP address from the current request.

        Args:
            None

        Returns:
            The forwarded client IP when present, otherwise the socket client host.
        """
        forwarded = self.request.headers.get("x-forwarded-for")
        if forwarded:
            # When the service sits behind a proxy, the left-most address is the client address.
            return forwarded.split(",")[0].strip()
        return self.request.client.host if self.request.client else ""

    async def register(
        self,
        username: str,
        password: str,
        display_name: str | None = None,
    ) -> AuthTokenResponse:
        """Register a new human user and create its first auth session.

        Args:
            username: The unique username for the new account.
            password: The raw password that will be hashed for local auth.
            display_name: The optional human-readable profile name.

        Returns:
            The initial authenticated session payload for the newly created user.
        """
        existing = await self._iam_queries.get_active_user_account_with_principal_by_username(
            username
        )
        if existing is not None:
            raise BusinessException(IamErrorCode.USERNAME_EXISTS)

        principal, user_account, tenant = await self._iam_commands.create_principal_for_user(
            username=username,
            password=password,
            display_name=display_name,
        )
        log.info(f"User registered: {username} (principal_id={principal.id})")
        return await self._iam_commands.create_auth_session(
            principal,
            tenant,
            user_account=user_account,
            # The workflow captures request metadata once so the command layer stays transport-agnostic.
            user_agent=self.user_agent(),
            ip_address=self.ip_address(),
        )

    async def login(self, username: str, password: str) -> AuthTokenResponse:
        """Authenticate a human user and create an auth session.

        Args:
            username: The username supplied by the caller.
            password: The raw password supplied by the caller.

        Returns:
            The authenticated session payload for the caller.
        """
        user_account = await self._iam_queries.get_active_user_account_with_principal_by_username(
            username
        )
        if user_account is None:
            raise BusinessException(IamErrorCode.USER_NOT_FOUND)
        if not verify_password(password, user_account.password_hash):
            raise BusinessException(IamErrorCode.INVALID_PASSWORD)

        # The relation is already eager-loaded by the query method, so this stays explicit-IO safe.
        principal = user_account.principal
        tenant = await self._ensure_personal_tenant()
        log.info(f"Login successful for username: {username}")
        return await self._iam_commands.create_auth_session(
            principal,
            tenant,
            user_account=user_account,
            user_agent=self.user_agent(),
            ip_address=self.ip_address(),
        )

    async def refresh(self, refresh_token: str) -> AuthTokenResponse:
        """Refresh an opaque auth session using the refresh token.

        Args:
            refresh_token: The raw opaque refresh token presented by the client.

        Returns:
            The renewed authenticated session payload.
        """
        return await self._iam_commands.refresh_session(
            refresh_token,
            user_agent=self.user_agent(),
            ip_address=self.ip_address(),
        )

    async def get_auth_me(self, principal_id: int, tenant_id: int) -> AuthMeResponse:
        """Assemble the authenticated principal profile payload.

        Args:
            principal_id: The authenticated principal identifier.
            tenant_id: The active tenant identifier from the auth context.

        Returns:
            The fully shaped ``/auth/me`` response payload.
        """
        principal = await self._iam_queries.get_principal_with_accounts(principal_id)
        tenant = await self._iam_queries.get_tenant(tenant_id)
        if principal is None:
            raise BusinessException(IamErrorCode.PRINCIPAL_NOT_FOUND)
        if tenant is None:
            raise BusinessException(IamErrorCode.TENANT_NOT_FOUND)

        # The query eagerly loaded both account relations so response shaping will not trigger lazy IO.
        return AuthMeResponse(
            principal=PrincipalResponse.model_validate(principal),
            tenant=self._iam_commands._to_tenant_response(tenant),
            user=self._iam_commands._to_user_response(principal.user_account, principal=principal)
            if principal.user_account is not None
            else None,
            agent=self._iam_commands._to_agent_response(
                principal.agent_account, principal=principal
            )
            if principal.agent_account is not None
            else None,
        )

    async def _ensure_personal_tenant(self):
        """Ensure the shared default tenant exists before login flows continue.

        Args:
            None

        Returns:
            The active shared personal tenant.
        """
        tenant = await self._iam_queries.get_personal_tenant()
        if tenant is None:
            # Login and registration both depend on the shared tenant existing even in a brand-new DB.
            tenant = await self._iam_commands.bootstrap_personal_tenant()
        return tenant


def get_iam_workflow(db: DbSession, redis: RedisDep, request: Request) -> IamWorkflow:
    """Build the request-scoped IAM workflow service.

    Args:
        db: The request-scoped SQLAlchemy async session.
        redis: The request-scoped Redis client.
        request: The active FastAPI request.

    Returns:
        A workflow instance wired to the current request scope.
    """
    return IamWorkflow(db, redis, request)


IamWorkflowDep = Annotated[IamWorkflow, Depends(get_iam_workflow)]
