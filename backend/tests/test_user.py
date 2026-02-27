"""Integration tests for user endpoints."""

from app.utils.auth import create_access_token


def test_get_current_user(client, test_user, auth_headers):
    response = client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["username"] == "testuser"
    assert data["data"]["id"] == test_user.id


def test_get_current_user_unauthorized(client):
    response = client.get("/api/users/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False


def test_get_current_user_invalid_sub_claim(client):
    token = create_access_token({"sub": "invalid", "token_type": "access"})
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "A0009"


def test_get_user_by_id(client, test_user, auth_headers):
    response = client.get(f"/api/users/{test_user.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == test_user.id
    assert data["data"]["username"] == "testuser"


def test_get_user_by_id_not_found(client, auth_headers):
    response = client.get("/api/users/9999", headers=auth_headers)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "B0101"


def test_reset_password(client, test_user, auth_headers):
    response = client.post(
        "/api/users/reset-password",
        json={"new_password": "newpassword123"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_reset_password_too_short(client, auth_headers):
    response = client.post(
        "/api/users/reset-password",
        json={"new_password": "12345"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "A0002"


def test_reset_password_unauthorized(client):
    response = client.post("/api/users/reset-password", json={"new_password": "newpassword123"})
    assert response.status_code == 401


def test_upload_avatar(client, test_user, auth_headers):
    response = client.post(
        "/api/users/avatar",
        json={"avatar_url": "https://example.com/avatar.jpg"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_upload_avatar_invalid_url(client, auth_headers):
    response = client.post(
        "/api/users/avatar",
        json={"avatar_url": "not-a-valid-url"},
        headers=auth_headers,
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "A0002"


def test_upload_avatar_unauthorized(client):
    response = client.post(
        "/api/users/avatar",
        json={"avatar_url": "https://example.com/avatar.jpg"},
    )
    assert response.status_code == 401


def test_upload_avatar_preflight_options(client):
    response = client.options(
        "/api/users/avatar",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in (
        "http://localhost:3000",
        "*",
    )
