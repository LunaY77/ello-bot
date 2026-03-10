from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.modules.iam.workflow import IamWorkflow
from app.utils import hash_password


@pytest.mark.asyncio
async def test_login_uses_preloaded_user_account_principal_without_extra_query() -> None:
    """Ensure login reuses the eagerly loaded principal relation instead of re-querying it."""
    request = SimpleNamespace(headers={}, client=SimpleNamespace(host="127.0.0.1"))
    workflow = IamWorkflow(db=None, redis=None, request=request)  # type: ignore[arg-type]

    principal = SimpleNamespace(id=101, principal_type="user", session_version=1, authz_version=2)
    tenant = SimpleNamespace(id=201, slug="personal", name="Personal", is_active=True)
    user_account = SimpleNamespace(
        principal=principal,
        principal_id=principal.id,
        username="alice",
        password_hash=hash_password("secret123"),
        avatar_url="/static/avatars/default-user.jpeg",
        bio="",
        gender=None,
        date_of_birth=None,
        timezone=None,
        created_at=None,
        updated_at=None,
    )

    workflow._iam_queries.get_active_user_account_with_principal_by_username = AsyncMock(
        return_value=user_account
    )
    workflow._iam_queries.get_principal = AsyncMock()
    workflow._ensure_personal_tenant = AsyncMock(return_value=tenant)
    workflow._iam_commands.create_auth_session = AsyncMock(return_value={"ok": True})

    result = await workflow.login("alice", "secret123")

    assert result == {"ok": True}
    workflow._iam_queries.get_principal.assert_not_called()
    workflow._iam_commands.create_auth_session.assert_awaited_once_with(
        principal,
        tenant,
        user_account=user_account,
        user_agent="",
        ip_address="127.0.0.1",
    )
