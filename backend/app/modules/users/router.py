from fastapi import APIRouter

from app.core import CurrentUserDep, Result

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
def get_current_user_info(current_user: CurrentUserDep):
    return Result.ok(data=UserInfoResponse.model_validate(current_user))


@router.get(
    "/{user_id}",
    response_model=Result[UserInfoResponse],
    summary="Get User Info",
    description="Get user information by user ID.",
)
def get_user_info(user_id: int, queries: UserQueriesDep):
    return Result.ok(data=queries.get_user_info(user_id))


@router.post(
    "/reset-password",
    response_model=Result[None],
    summary="Reset Password",
    description="Reset the password for the currently authenticated user.",
)
def reset_password(
    request: ResetPasswordRequest,
    commands: UserCommandsDep,
    current_user: CurrentUserDep,
):
    commands.reset_password(current_user.id, request.new_password)
    return Result.ok()


@router.post(
    "/avatar",
    response_model=Result[None],
    summary="Upload Avatar",
    description="Upload a new avatar for the currently authenticated user.",
)
def upload_avatar(
    request: UploadAvatarRequest,
    commands: UserCommandsDep,
    current_user: CurrentUserDep,
):
    commands.upload_avatar(current_user.id, request.avatar_url)
    return Result.ok()
