from __future__ import annotations

import pytest

from tests.factories import auth_header, create_user

pytestmark = pytest.mark.integration


async def test_tenant_rbac_acl_and_agent_management_flow(client) -> None:
    """Exercise tenant bootstrap, role grants, ACL creation, and agent ownership wiring."""
    owner_data = await create_user(client, "owner", "secret123", display_name="Owner")
    owner_personal_token = owner_data["accessToken"]

    tenant_response = await client.post(
        "/api/iam/tenants",
        headers=await auth_header(owner_personal_token),
        json={"slug": "team-alpha", "name": "Team Alpha"},
    )
    assert tenant_response.status_code == 200
    tenant_id = tenant_response.json()["data"]["id"]

    switched = await client.post(
        "/api/iam/auth/switch-tenant",
        headers=await auth_header(owner_personal_token),
        json={"tenantId": tenant_id},
    )
    assert switched.status_code == 200
    owner_team_token = switched.json()["data"]["accessToken"]

    roles_response = await client.get(
        f"/api/iam/tenants/{tenant_id}/roles",
        headers=await auth_header(owner_team_token),
    )
    assert roles_response.status_code == 200
    assert {role["code"] for role in roles_response.json()["data"]} >= {
        "owner",
        "admin",
        "member",
        "agent_runner",
    }
    owner_role_id = next(
        role["id"] for role in roles_response.json()["data"] if role["code"] == "owner"
    )

    permission_response = await client.post(
        "/api/iam/permissions",
        headers=await auth_header(owner_team_token),
        json={
            "code": "report.read",
            "resourceType": "report",
            "action": "read",
            "description": "Read reports",
        },
    )
    assert permission_response.status_code == 200
    permission_id = permission_response.json()["data"]["id"]

    role_response = await client.post(
        f"/api/iam/tenants/{tenant_id}/roles",
        headers=await auth_header(owner_team_token),
        json={"code": "reviewer", "name": "Reviewer", "description": "Review role"},
    )
    assert role_response.status_code == 200
    reviewer_role_id = role_response.json()["data"]["id"]

    replace_role_permissions = await client.put(
        f"/api/iam/tenants/{tenant_id}/roles/{reviewer_role_id}/permissions",
        headers=await auth_header(owner_team_token),
        json={"permissionIds": [permission_id]},
    )
    assert replace_role_permissions.status_code == 200
    assert replace_role_permissions.json()["data"]["permissions"][0]["code"] == "report.read"

    member_register = await create_user(client, "member", "secret123", display_name="Member")
    member_principal_id = member_register["user"]["principalId"]

    add_member = await client.post(
        f"/api/iam/tenants/{tenant_id}/members",
        headers=await auth_header(owner_team_token),
        json={"principalId": member_principal_id, "status": "active"},
    )
    assert add_member.status_code == 200

    grant_role = await client.post(
        f"/api/iam/tenants/{tenant_id}/members/{member_principal_id}/roles/{reviewer_role_id}",
        headers=await auth_header(owner_team_token),
    )
    assert grant_role.status_code == 200

    permission_snapshot = await client.get(
        f"/api/iam/principals/{member_principal_id}/permissions",
        headers=await auth_header(owner_team_token),
        params={"tenant_id": tenant_id},
    )
    assert permission_snapshot.status_code == 200
    assert "report.read" in permission_snapshot.json()["data"]["permissionCodes"]

    agent_response = await client.post(
        "/api/iam/agents",
        headers=await auth_header(owner_team_token),
        json={
            "code": "review-bot",
            "displayName": "Review Bot",
            "description": "Agent reviewer",
            "ownerPrincipalId": member_principal_id,
        },
    )
    assert agent_response.status_code == 200
    agent_principal_id = agent_response.json()["data"]["principalId"]
    assert agent_response.json()["data"]["avatarUrl"] == "/static/avatars/default-agent.png"

    acl_response = await client.post(
        f"/api/iam/tenants/{tenant_id}/acl",
        headers=await auth_header(owner_team_token),
        json={
            "resourceType": "report",
            "resourceId": 42,
            "permissionId": permission_id,
            "subjectRoleId": reviewer_role_id,
            "effect": "allow",
        },
    )
    assert acl_response.status_code == 200
    acl_id = acl_response.json()["data"]["id"]

    acl_list = await client.get(
        f"/api/iam/tenants/{tenant_id}/acl",
        headers=await auth_header(owner_team_token),
        params={"resource_type": "report", "resource_id": 42},
    )
    assert acl_list.status_code == 200
    assert acl_list.json()["data"][0]["id"] == acl_id

    revoke_last_owner = await client.delete(
        f"/api/iam/tenants/{tenant_id}/members/{owner_data['user']['principalId']}/roles/{owner_role_id}",
        headers=await auth_header(owner_team_token),
    )
    assert revoke_last_owner.status_code == 400
    assert revoke_last_owner.json()["code"] == "B0207"

    get_agent = await client.get(
        f"/api/iam/agents/{agent_principal_id}",
        headers=await auth_header(owner_team_token),
    )
    assert get_agent.status_code == 200
    assert get_agent.json()["data"]["ownerPrincipalId"] == member_principal_id
