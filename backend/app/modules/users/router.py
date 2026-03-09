from fastapi import APIRouter, Request

from app.core import CurrentUserDep, Result
from app.utils import decode_access_token, extract_token

from .commands import UserCommandsDep
from .queries import UserQueriesDep
from .schemas import ResetPasswordRequest, UploadAvatarRequest, UserInfoResponse

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/me",
    response_model=Result[UserInfoResponse],
    summary="Get Current User",
    description="Get the currently authenticated user's information.",
)
async def get_current_user_info(current_user: CurrentUserDep):
    return Result.ok(data=UserInfoResponse.model_validate(current_user))


@router.get(
    "/{user_id}",
    response_model=Result[UserInfoResponse],
    summary="Get User Info",
    description="Get user information by user ID.",
)
async def get_user_info(user_id: int, queries: UserQueriesDep):
    return Result.ok(data=await queries.get_user_info(user_id))


@router.post(
    "/reset-password",
    response_model=Result[None],
    summary="Reset Password",
    description="Reset the password for the currently authenticated user.",
)
async def reset_password(
    request: ResetPasswordRequest,
    commands: UserCommandsDep,
    current_user: CurrentUserDep,
):
    await commands.reset_password(current_user.id, request.new_password)
    return Result.ok()


@router.post(
    "/avatar",
    response_model=Result[None],
    summary="Upload Avatar",
    description="Upload a new avatar for the currently authenticated user.",
)
async def upload_avatar(
    request: UploadAvatarRequest,
    commands: UserCommandsDep,
    current_user: CurrentUserDep,
):
    await commands.upload_avatar(current_user.id, request.avatar_url)
    return Result.ok()


@router.post(
    "/logout",
    response_model=Result[None],
    summary="User Logout",
    description="Logout the current user by removing the token from the active whitelist.",
)
async def logout(
    request: Request,
    _current_user: CurrentUserDep,
    commands: UserCommandsDep,
):
    token = extract_token(request)
    payload = decode_access_token(token)
    await commands.logout(jti=payload["jti"])
    return Result.ok()
