"""Unit tests for UserService."""

import pytest

from app.core.exception import BusinessException
from app.model.user import User
from app.repository.user import UserRepository
from app.service.user import UserErrorCode, UserService
from app.utils.auth import hash_password, verify_password


@pytest.fixture
def user_service(db_session):
    repo = UserRepository(db_session)
    return UserService(repo)


@pytest.fixture
def existing_user(db_session):
    user = User(
        username="existing",
        password=hash_password("password123"),
        role="user",
        is_active=True,
        avatar="",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_register_success(user_service):
    result = user_service.register("newuser", "password123")
    assert result.user.username == "newuser"
    assert result.user.id is not None
    assert result.user.role == "user"
    assert result.user.is_active is True
    assert result.token


def test_register_duplicate_username(user_service, existing_user):
    with pytest.raises(BusinessException) as exc_info:
        user_service.register("existing", "password123")
    assert exc_info.value.error_code == UserErrorCode.USERNAME_EXISTS.error_code


def test_login_success(user_service, existing_user):
    result = user_service.login("existing", "password123")
    assert result.user.username == "existing"
    assert result.token


def test_login_user_not_found(user_service):
    with pytest.raises(BusinessException) as exc_info:
        user_service.login("nonexistent", "password123")
    assert exc_info.value.error_code == UserErrorCode.INVALID_PASSWORD.error_code


def test_login_wrong_password(user_service, existing_user):
    with pytest.raises(BusinessException) as exc_info:
        user_service.login("existing", "wrongpassword")
    assert exc_info.value.error_code == UserErrorCode.INVALID_PASSWORD.error_code


def test_login_inactive_user(user_service, db_session):
    user = User(
        username="inactive",
        password=hash_password("password123"),
        role="user",
        is_active=False,
        avatar="",
    )
    db_session.add(user)
    db_session.commit()

    with pytest.raises(BusinessException) as exc_info:
        user_service.login("inactive", "password123")
    assert exc_info.value.error_code == UserErrorCode.INVALID_PASSWORD.error_code


def test_get_user_info_success(user_service, existing_user):
    result = user_service.get_user_info(existing_user.id)
    assert result.id == existing_user.id
    assert result.username == "existing"


def test_get_user_info_not_found(user_service):
    with pytest.raises(BusinessException) as exc_info:
        user_service.get_user_info(9999)
    assert exc_info.value.error_code == UserErrorCode.USER_NOT_FOUND.error_code


def test_reset_password_success(user_service, existing_user, db_session):
    user_service.reset_password(existing_user.id, "newpassword123")
    db_session.refresh(existing_user)
    assert verify_password("newpassword123", existing_user.password)


def test_reset_password_user_not_found(user_service):
    with pytest.raises(BusinessException) as exc_info:
        user_service.reset_password(9999, "newpassword123")
    assert exc_info.value.error_code == UserErrorCode.USER_NOT_FOUND.error_code


def test_upload_avatar_success(user_service, existing_user, db_session):
    user_service.upload_avatar(existing_user.id, "https://example.com/avatar.jpg")
    db_session.refresh(existing_user)
    assert existing_user.avatar == "https://example.com/avatar.jpg"


def test_upload_avatar_user_not_found(user_service):
    with pytest.raises(BusinessException) as exc_info:
        user_service.upload_avatar(9999, "https://example.com/avatar.jpg")
    assert exc_info.value.error_code == UserErrorCode.USER_NOT_FOUND.error_code
