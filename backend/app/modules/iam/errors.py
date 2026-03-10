from enum import Enum, unique


@unique
class IamErrorCode(Enum):
    """IAM business error code enum."""

    USER_NOT_FOUND = ("B0101", "User not found")
    INVALID_PASSWORD = ("B0102", "Invalid password")
    USERNAME_EXISTS = ("B0103", "Username already exists")
    TENANT_NOT_FOUND = ("B0200", "Tenant not found")
    TENANT_SLUG_EXISTS = ("B0201", "Tenant slug already exists")
    MEMBERSHIP_NOT_FOUND = ("B0202", "Tenant membership not found")
    MEMBERSHIP_EXISTS = ("B0203", "Tenant membership already exists")
    ROLE_NOT_FOUND = ("B0204", "Role not found")
    ROLE_CODE_EXISTS = ("B0205", "Role code already exists in tenant")
    ROLE_DELETE_FORBIDDEN = ("B0206", "Role cannot be deleted")
    LAST_OWNER_REQUIRED = ("B0207", "Tenant must retain at least one owner")
    PERMISSION_NOT_FOUND = ("B0208", "Permission not found")
    PERMISSION_CODE_EXISTS = ("B0209", "Permission code already exists")
    ACL_ENTRY_NOT_FOUND = ("B0210", "ACL entry not found")
    PRINCIPAL_NOT_FOUND = ("B0211", "Principal not found")
    PRINCIPAL_NOT_IN_TENANT = ("B0212", "Principal is not a member of the tenant")
    AGENT_NOT_FOUND = ("B0213", "Agent account not found")
    AGENT_CODE_EXISTS = ("B0214", "Agent code already exists")
    DEFAULT_TENANT_DELETE_FORBIDDEN = ("B0215", "Default tenant cannot be deleted")
    TENANT_SWITCH_FORBIDDEN = (
        "B0216",
        "Cannot switch to a tenant the principal does not belong to",
    )
    INVALID_ACL_SUBJECT = ("B0217", "ACL subject must target either a principal or a role")
    BUILTIN_ROLE_MUTATION_FORBIDDEN = ("B0218", "Built-in role cannot be deleted or renamed")
    TENANT_ROLE_SCOPE_MISMATCH = ("B0219", "Role does not belong to the specified tenant")

    def __init__(self, error_code: str, error_msg: str) -> None:
        self._error_code = error_code
        self._error_msg = error_msg

    @property
    def error_code(self) -> str:
        return self._error_code

    @property
    def error_msg(self) -> str:
        return self._error_msg
