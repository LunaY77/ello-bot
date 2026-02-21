"""Unit tests for auth utility functions."""

from datetime import timedelta
from unittest.mock import MagicMock

import pytest

from app.core.exception import CommonErrorCode
from app.utils.auth import (
    create_access_token,
    decode_access_token,
    extract_token,
    hash_password,
    verify_password,
)


def test_hash_password_returns_hashed_string():
    hashed = hash_password("mypassword")
    assert isinstance(hashed, str)
    assert hashed != "mypassword"


def test_hash_password_uses_random_salt():
    h1 = hash_password("mypassword")
    h2 = hash_password("mypassword")
    assert h1 != h2


def test_verify_password_correct():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True


def test_verify_password_incorrect():
    hashed = hash_password("mypassword")
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token_returns_string():
    token = create_access_token({"sub": "1", "token_type": "access"})
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_access_token_valid():
    token = create_access_token({"sub": "42", "token_type": "access"})
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["token_type"] == "access"


def test_decode_access_token_expired():
    token = create_access_token(
        {"sub": "1", "token_type": "access"},
        expires_delta=timedelta(seconds=-1),
    )
    with pytest.raises(RuntimeError) as exc_info:
        decode_access_token(token)
    assert exc_info.value.args[0] == CommonErrorCode.TOKEN_EXPIRED


def test_decode_access_token_invalid_token():
    with pytest.raises(RuntimeError) as exc_info:
        decode_access_token("not.a.valid.token")
    assert exc_info.value.args[0] == CommonErrorCode.TOKEN_INVALID


def test_decode_access_token_wrong_token_type():
    token = create_access_token({"sub": "1", "token_type": "refresh"})
    with pytest.raises(RuntimeError) as exc_info:
        decode_access_token(token)
    assert exc_info.value.args[0] == CommonErrorCode.TOKEN_INVALID


def test_extract_token_valid():
    request = MagicMock()
    request.headers.get.return_value = "Bearer mytoken"
    token = extract_token(request)
    assert token == "mytoken"


def test_extract_token_missing_header():
    request = MagicMock()
    request.headers.get.return_value = None
    with pytest.raises(RuntimeError) as exc_info:
        extract_token(request)
    assert exc_info.value.args[0] == CommonErrorCode.UNAUTHORIZED


def test_extract_token_invalid_scheme():
    request = MagicMock()
    request.headers.get.return_value = "Basic mytoken"
    with pytest.raises(RuntimeError) as exc_info:
        extract_token(request)
    assert exc_info.value.args[0] == CommonErrorCode.TOKEN_INVALID


def test_extract_token_empty_token():
    request = MagicMock()
    request.headers.get.return_value = "Bearer "
    with pytest.raises(RuntimeError) as exc_info:
        extract_token(request)
    assert exc_info.value.args[0] == CommonErrorCode.TOKEN_INVALID
