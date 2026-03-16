"""User routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentAuthDep, UserServiceDep
from app.api.schemas.common import Result
from app.api.schemas.user import (
    BootstrapAdminResponse,
    CurrentUserResponse,
    UpdateUserProfileRequest,
    UpdateUserSettingsRequest,
    UserSettingsResponse,
    UserSummaryResponse,
)
from app.core.constants import API_PREFIX

router = APIRouter(prefix=f"{API_PREFIX}/user", tags=["User"])


@router.post("/bootstrap-admin", response_model=Result[BootstrapAdminResponse])
async def bootstrap_admin(service: UserServiceDep):
    """Initialize or repair the bootstrap admin account.

    Args:
        service: User application service.

    Returns:
        Shared response envelope containing bootstrap-admin state.
    """
    state = await service.ensure_bootstrap_admin()
    return Result.ok(data=BootstrapAdminResponse.from_state(state))


@router.get("/get-current-user", response_model=Result[CurrentUserResponse])
async def get_current_user(auth: CurrentAuthDep, service: UserServiceDep):
    """Return the current authenticated user plus settings.

    Args:
        auth: Authenticated request context.
        service: User application service.

    Returns:
        Shared response envelope containing the current-user state.
    """
    state = await service.get_current_user(user_id=auth.user_id)
    return Result.ok(data=CurrentUserResponse.from_state(state))


@router.get("/get-profile", response_model=Result[UserSummaryResponse])
async def get_profile(auth: CurrentAuthDep, service: UserServiceDep):
    """Return the authenticated user's profile summary.

    Args:
        auth: Authenticated request context.
        service: User application service.

    Returns:
        Shared response envelope containing the user profile.
    """
    user = await service.get_profile(user_id=auth.user_id)
    return Result.ok(data=UserSummaryResponse.from_domain(user))


@router.post("/update-profile", response_model=Result[UserSummaryResponse])
async def update_profile(
    payload: UpdateUserProfileRequest,
    auth: CurrentAuthDep,
    service: UserServiceDep,
):
    """Update the authenticated user's profile fields.

    Args:
        payload: Profile update payload validated by the schema layer.
        auth: Authenticated request context.
        service: User application service.

    Returns:
        Shared response envelope containing the updated profile.
    """
    user = await service.update_profile(
        user_id=auth.user_id,
        display_name=payload.display_name,
        bio=payload.bio,
        timezone=payload.timezone,
    )
    return Result.ok(data=UserSummaryResponse.from_domain(user))


@router.get("/get-settings", response_model=Result[UserSettingsResponse])
async def get_settings(auth: CurrentAuthDep, service: UserServiceDep):
    """Return the authenticated user's settings.

    Args:
        auth: Authenticated request context.
        service: User application service.

    Returns:
        Shared response envelope containing the user's settings.
    """
    settings_state = await service.get_settings(user_id=auth.user_id)
    return Result.ok(data=UserSettingsResponse.from_domain(settings_state))


@router.post("/update-settings", response_model=Result[UserSettingsResponse])
async def update_settings(
    payload: UpdateUserSettingsRequest,
    auth: CurrentAuthDep,
    service: UserServiceDep,
):
    """Update the authenticated user's settings.

    Args:
        payload: Settings update payload validated by the schema layer.
        auth: Authenticated request context.
        service: User application service.

    Returns:
        Shared response envelope containing the updated settings.
    """
    settings_state = await service.update_settings(
        user_id=auth.user_id,
        locale=payload.locale,
        theme=payload.theme,
        system_prompt=payload.system_prompt,
        default_model=payload.default_model,
    )
    return Result.ok(data=UserSettingsResponse.from_domain(settings_state))
