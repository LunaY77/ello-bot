from __future__ import annotations

import pytest
from sqlalchemy import select

from app.modules.iam.consts import IamRedisKey
from app.modules.iam.model import UserAccount
from app.utils import hash_token
from tests.factories import auth_header, create_user, login_user

pytestmark = pytest.mark.integration


async def test_register_profile_and_password_reset_flow(
    client, db_session, redis_for_assertions
) -> None:
    """Exercise the user registration, profile update, session invalidation, and relogin flow."""
    register_payload = await create_user(client, "alice", "secret123", display_name="Alice")
    access_token = register_payload["accessToken"]

    assert register_payload["user"]["avatarUrl"] == "/static/avatars/default-user.jpeg"
    assert register_payload["tenant"]["slug"] == "personal"

    stored_access_session = await redis_for_assertions.get(
        IamRedisKey.ACCESS_SESSION.key(hash_token(access_token))
    )
    assert stored_access_session is not None

    stored_user = await db_session.scalar(
        select(UserAccount).where(UserAccount.username == "alice")
    )
    assert stored_user is not None
    assert stored_user.bio == ""
    assert stored_user.timezone is None

    me_response = await client.get("/api/iam/auth/me", headers=await auth_header(access_token))
    assert me_response.status_code == 200
    me_payload = me_response.json()["data"]
    assert me_payload["user"]["username"] == "alice"
    assert me_payload["principal"]["displayName"] == "Alice"

    update_response = await client.patch(
        "/api/iam/users/me",
        headers=await auth_header(access_token),
        json={
            "displayName": "Alice Cooper",
            "bio": "bio text",
            "gender": "female",
            "timezone": "Asia/Shanghai",
            "dateOfBirth": "1995-03-12",
        },
    )
    assert update_response.status_code == 200
    update_payload = update_response.json()["data"]
    assert update_payload["displayName"] == "Alice Cooper"
    assert update_payload["bio"] == "bio text"
    assert update_payload["timezone"] == "Asia/Shanghai"
    assert update_payload["dateOfBirth"] == "1995-03-12"

    reset_response = await client.post(
        "/api/iam/auth/password/reset",
        headers=await auth_header(access_token),
        json={"newPassword": "secret456"},
    )
    assert reset_response.status_code == 200

    invalidated_me = await client.get("/api/iam/auth/me", headers=await auth_header(access_token))
    assert invalidated_me.status_code == 401
    assert invalidated_me.json()["code"] == "A0009"

    invalidated_access_session = await redis_for_assertions.get(
        IamRedisKey.ACCESS_SESSION.key(hash_token(access_token))
    )
    assert invalidated_access_session is None

    old_login = await client.post(
        "/api/iam/auth/login",
        json={"username": "alice", "password": "secret123"},
    )
    assert old_login.status_code == 400
    assert old_login.json()["code"] == "B0102"

    new_login = await login_user(client, "alice", "secret456")
    assert new_login["user"]["displayName"] == "Alice Cooper"


async def test_bootstrap_admin_login_and_dynamic_owner_permissions(client) -> None:
    """Verify bootstrap creates the initial owner account and owner permissions remain future-proof."""
    login_payload = await login_user(client, "admin", "BootstrapAdmin_123456")
    access_token = login_payload["accessToken"]
    tenant_id = login_payload["tenant"]["id"]
    principal_id = login_payload["user"]["principalId"]

    assert login_payload["tenant"]["slug"] == "personal"
    assert login_payload["user"]["avatarUrl"] == "/static/avatars/default-user.jpeg"

    create_permission = await client.post(
        "/api/iam/permissions",
        headers=await auth_header(access_token),
        json={
            "code": "tenant.audit.export",
            "resourceType": "tenant_audit",
            "action": "export",
            "description": "Export tenant audit events",
        },
    )
    assert create_permission.status_code == 200

    permission_snapshot = await client.get(
        f"/api/iam/principals/{principal_id}/permissions",
        headers=await auth_header(access_token),
        params={"tenant_id": tenant_id},
    )
    assert permission_snapshot.status_code == 200
    assert "tenant.audit.export" in permission_snapshot.json()["data"]["permissionCodes"]
