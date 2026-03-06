from enum import Enum, unique


@unique
class UserErrorCode(Enum):
    """User business error code enum"""

    USER_NOT_FOUND = ("B0101", "User not found")
    INVALID_PASSWORD = ("B0102", "Invalid password")
    USERNAME_EXISTS = ("B0103", "Username already exists")

    def __init__(self, error_code: str, error_msg: str) -> None:
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        return self._error_code

    @property
    def error_msg(self) -> str:
        return self._error_msg
