"""Integration tests for auth endpoints."""


def test_register_success(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["code"] == "0"
    assert data["data"]["username"] == "newuser"
    assert data["data"]["role"] == "user"
    assert data["data"]["is_active"] is True
    assert "password" not in data["data"]


def test_register_duplicate_username(client, test_user):
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "B0003"


def test_register_username_too_short(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "password123"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "A0001"


def test_register_password_too_short(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "validuser", "password": "12345"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "A0001"


def test_login_success(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["code"] == "0"
    assert data["data"]["username"] == "testuser"
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "B0002"


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "password123"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["code"] == "B0002"
