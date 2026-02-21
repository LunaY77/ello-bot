"""
Authentication Router (No Auth Required)

Provides user authentication-related HTTP endpoints:
- POST /auth/register: User registration
- POST /auth/login: User login

These endpoints do not require authentication, anyone can access.
"""

from fastapi import APIRouter

from app.core import Result
from app.schema import (
    UserCreate,
    UserResponse,
    UserWithToken,
)
from app.service import UserServiceDep

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Result[UserResponse],
    summary="User Registration",
    description="Register a new user with username and password.",
)
def register(request: UserCreate, user_service: UserServiceDep):
    return Result.ok(data=user_service.register(request.username, request.password))


@router.post(
    "/login",
    response_model=Result[UserWithToken],
    summary="User Login",
    description="Login with username and password, returns user info and access token.",
)
def login(request: UserCreate, user_service: UserServiceDep):
    return Result.ok(data=user_service.login(request.username, request.password))
