from __future__ import annotations

from typing import Any

from httpx import AsyncClient


async def create_user(
    client: AsyncClient,
    username: str,
    password: str,
    display_name: str | None = None,
) -> dict[str, Any]:
    """Register a user through the public IAM API and return the response payload."""
    payload: dict[str, Any] = {"username": username, "password": password}
    if display_name is not None:
        payload["displayName"] = display_name

    response = await client.post("/api/iam/auth/register", json=payload)
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def login_user(client: AsyncClient, username: str, password: str) -> dict[str, Any]:
    """Log in through the public IAM API and return the response payload."""
    response = await client.post(
        "/api/iam/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def auth_header(token: str) -> dict[str, str]:
    """Build a bearer token header for authenticated test requests."""
    return {"Authorization": f"Bearer {token}"}
