"""
Pydantic Data Models

Used for API request and response data validation, includes:
- UserBase: Base user information
- UserCreate: User registration request
- UserLogin: User login request
- ResetPasswordRequest: Password reset request
- UploadAvatarRequest: Avatar upload request
- UserResponse: User response (sanitized)
- Token: Token response
- UserWithToken: User info and Token returned after successful login
"""

from typing import Annotated

from pydantic import AnyUrl, BeforeValidator, ConfigDict, Field, StringConstraints

from app.core import ApiModel

# ============== Request Types ==============

UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=20)]

Password = Annotated[str, StringConstraints(min_length=6, max_length=20)]


def _parse_url(v: object) -> str:
    from pydantic import TypeAdapter

    return str(TypeAdapter(AnyUrl).validate_python(v))


AvatarUrl = Annotated[str, BeforeValidator(_parse_url)]

# ============== Request Schemas ==============


class RegisterRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])


class LoginRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])


class ResetPasswordRequest(ApiModel):
    new_password: Password = Field(..., description="New password", examples=["newpassword123"])


class UploadAvatarRequest(ApiModel):
    avatar_url: AvatarUrl = Field(
        ..., description="Avatar URL", examples=["https://example.com/avatar.jpg"]
    )


# ============== Response Schemas ==============


class UserInfoResponse(ApiModel):
    """User Info response schema (sanitized)

    User information returned to client, does not contain sensitive information.

    Attributes:
        id: User ID
        username: Username
        avatar: Avatar URL
        role: User role
        is_active: Is active
    """

    id: int = Field(..., description="User ID")
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    avatar: str = Field(default="", description="Avatar URL")
    role: str = Field(default="user", description="User role")
    is_active: bool = Field(default=True, description="Is active")

    # Allow creation from ORM object
    model_config = ConfigDict(from_attributes=True)


class AuthResponse(ApiModel):
    """Authentication response schema

    Contains user information and token returned after successful login or registration.

    Attributes:
        user: User information (sanitized)
        token: JWT access token
    """

    user: UserInfoResponse = Field(..., description="User information")
    token: str = Field(..., description="JWT access token")
