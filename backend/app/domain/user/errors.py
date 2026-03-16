"""User-domain error codes."""

from enum import Enum, unique


@unique
class UserErrorCode(Enum):
    """User-domain business error codes."""

    USERNAME_EXISTS = ("B1101", "Username already exists")
    REGISTRATION_DISABLED = ("B1103", "Registration is not available in MVP mode")
    USER_NOT_FOUND = ("B1104", "User not found")

    def __init__(self, error_code: str, error_msg: str) -> None:
        """Store the code and message for the enum member.

        Args:
            error_code: Machine-readable error code.
            error_msg: Human-readable error message.
        """
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        """Expose the machine-readable error code.

        Returns:
            Structured error code string.
        """
        return self._error_code

    @property
    def error_msg(self) -> str:
        """Expose the human-readable error message.

        Returns:
            Error message string.
        """
        return self._error_msg
