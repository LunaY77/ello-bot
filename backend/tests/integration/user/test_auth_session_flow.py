from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.core import hash_token
from app.infra.cache.redis import SessionRedisKeys
from app.infra.db.models.user import UserModel

pytestmark = pytest.mark.integration


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def login_admin(client) -> dict:
    response = await client.post(
        "/api/sessions/login",
        json={"username": "admin", "password": "BootstrapAdmin_123456"},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_bootstrap_auth_profile_flow(client, db_session, redis_for_assertions):
    session = await login_admin(client)

    access_token = session["accessToken"]
    refresh_token = session["refreshToken"]
    snapshot_key = SessionRedisKeys.ACCESS_SESSION.key(hash_token(access_token))
    assert await redis_for_assertions.get(snapshot_key)

    me_response = await client.get("/api/user/get-current-user", headers=auth_header(access_token))
    assert me_response.status_code == 200, me_response.text
    me_payload = me_response.json()["data"]
    assert me_payload["user"]["username"] == "admin"
    assert me_payload["settings"]["theme"] == "system"
    assert me_payload["settings"]["defaultModel"] == "gpt-5"

    profile_response = await client.post(
        "/api/user/update-profile",
        headers=auth_header(access_token),
        json={
            "displayName": "Workspace Owner",
            "bio": "Personal profile only.",
            "timezone": "Asia/Shanghai",
        },
    )
    assert profile_response.status_code == 200, profile_response.text
    profile_payload = profile_response.json()["data"]
    assert profile_payload["displayName"] == "Workspace Owner"
    assert profile_payload["bio"] == "Personal profile only."
    assert profile_payload["timezone"] == "Asia/Shanghai"

    settings_response = await client.post(
        "/api/user/update-settings",
        headers=auth_header(access_token),
        json={
            "locale": "zh-CN",
            "theme": "light",
            "defaultModel": "gpt-5-mini",
            "systemPrompt": "Be concise.",
        },
    )
    assert settings_response.status_code == 200, settings_response.text
    settings_payload = settings_response.json()["data"]
    assert settings_payload["locale"] == "zh-CN"
    assert settings_payload["theme"] == "light"
    assert settings_payload["defaultModel"] == "gpt-5-mini"

    sessions_response = await client.get("/api/sessions/list", headers=auth_header(access_token))
    assert sessions_response.status_code == 200, sessions_response.text
    sessions_payload = sessions_response.json()["data"]
    assert len(sessions_payload) == 1
    assert sessions_payload[0]["userAgent"]

    refreshed_response = await client.post(
        "/api/sessions/refresh",
        json={"refreshToken": refresh_token},
    )
    assert refreshed_response.status_code == 200, refreshed_response.text
    refreshed_payload = refreshed_response.json()["data"]
    assert refreshed_payload["accessToken"] != access_token
    assert refreshed_payload["refreshToken"] != refresh_token

    old_me_response = await client.get(
        "/api/user/get-current-user", headers=auth_header(access_token)
    )
    assert old_me_response.status_code == 401, old_me_response.text

    logout_response = await client.post(
        "/api/sessions/logout",
        headers=auth_header(refreshed_payload["accessToken"]),
    )
    assert logout_response.status_code == 200, logout_response.text
    assert (
        await redis_for_assertions.get(
            SessionRedisKeys.ACCESS_SESSION.key(hash_token(refreshed_payload["accessToken"]))
        )
        is None
    )

    post_logout_me = await client.get(
        "/api/user/get-current-user",
        headers=auth_header(refreshed_payload["accessToken"]),
    )
    assert post_logout_me.status_code == 401, post_logout_me.text

    user_count = await db_session.scalar(select(func.count(UserModel.id)))
    assert user_count == 1


async def test_registration_is_blocked_in_mvp_mode(client, db_session):
    before_count = await db_session.scalar(select(func.count(UserModel.id)))

    response = await client.post(
        "/api/sessions/register",
        json={
            "username": "new-user",
            "password": "strongpass",
            "displayName": "New User",
        },
    )

    assert response.status_code == 400, response.text
    payload = response.json()
    assert payload["code"] == "B1103"
    assert payload["message"] == "Registration is not available in MVP mode"

    after_count = await db_session.scalar(select(func.count(UserModel.id)))
    assert before_count == after_count


async def test_health_and_debug_routes(client):
    health_response = await client.get("/health")
    assert health_response.status_code == 200, health_response.text
    assert health_response.json()["data"] == {"db": True, "redis": True}

    debug_response = await client.get("/api/debug/runtime")
    assert debug_response.status_code == 200, debug_response.text
    debug_payload = debug_response.json()["data"]
    assert debug_payload["state"] == "started"
    assert debug_payload["dbReady"] is True
    assert debug_payload["redisReady"] is True
