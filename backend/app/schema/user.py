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

from pydantic import AnyUrl, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

# ============== Request Types ==============

UserName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=50)]

Password = Annotated[str, StringConstraints(min_length=6, max_length=100)]


def _parse_url(v: object) -> str:
    from pydantic import TypeAdapter

    return str(TypeAdapter(AnyUrl).validate_python(v))


AvatarUrl = Annotated[str, BeforeValidator(_parse_url)]

# ============== Request Schemas ==============


class UserBase(BaseModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])


class UserCreate(UserBase):
    password: Password = Field(..., description="Password", examples=["password123"])


class UserLogin(BaseModel):
    username: UserName = Field(..., description="Username")
    password: Password = Field(..., description="Password")


class ResetPasswordRequest(BaseModel):
    new_password: Password = Field(..., description="New password")


class UploadAvatarRequest(BaseModel):
    avatar_url: AvatarUrl = Field(..., description="Avatar URL")


# ============== Response Schemas ==============


class UserResponse(UserBase):
    """User response schema (sanitized)

    User information returned to client, does not contain sensitive information.

    Attributes:
        id: User ID
        avatar: Avatar URL
        role: User role
        is_active: Is active
    """

    id: int = Field(..., description="User ID")
    avatar: str = Field(default="", description="Avatar URL")
    role: str = Field(default="user", description="User role")
    is_active: bool = Field(default=True, description="Is active")

    # Allow creation from ORM object
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Token response schema

    Attributes:
        access_token: JWT access token
        token_type: Token type
    """

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class UserWithToken(UserResponse, Token):
    """User info and Token returned after successful login

    Inherits UserResponse and Token, contains complete user info and token.
    """

    pass
