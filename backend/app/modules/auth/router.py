from fastapi import APIRouter

from app.core import Result

from .commands import AuthCommandsDep
from .schemas import AuthResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=Result[AuthResponse],
    summary="User Registration",
    description="Register a new user with username and password.",
)
def register(request: RegisterRequest, commands: AuthCommandsDep):
    return Result.ok(data=commands.register(request.username, request.password))


@router.post(
    "/login",
    response_model=Result[AuthResponse],
    summary="User Login",
    description="Login with username and password, returns user info and access token.",
)
def login(request: LoginRequest, commands: AuthCommandsDep):
    return Result.ok(data=commands.login(request.username, request.password))
