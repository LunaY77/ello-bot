"""
User Router
"""

from fastapi import APIRouter

from app.core import CurrentUserDep, Result
from app.schema import ResetPasswordRequest, UploadAvatarRequest, UserInfoResponse
from app.service import UserServiceDep

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
def get_user_info(user_id: int, user_service: UserServiceDep):
    return Result.ok(data=user_service.get_user_info(user_id))


@router.post(
    "/reset-password",
    response_model=Result[None],
    summary="Reset Password",
    description="Reset the password for the currently authenticated user.",
)
def reset_password(
    request: ResetPasswordRequest,
    user_service: UserServiceDep,
    current_user: CurrentUserDep,
):
    user_service.reset_password(current_user.id, request.new_password)
    return Result.ok()


@router.post(
    "/avatar",
    response_model=Result[None],
    summary="Upload Avatar",
    description="Upload a new avatar for the currently authenticated user.",
)
def upload_avatar(
    request: UploadAvatarRequest,
    user_service: UserServiceDep,
    current_user: CurrentUserDep,
):
    user_service.upload_avatar(current_user.id, request.avatar_url)
    return Result.ok()
