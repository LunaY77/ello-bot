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

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ============== Request Schemas ==============


class UserBase(BaseModel):
    username: str = Field(..., description="Username", examples=["john_doe"])

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not (3 <= len(v) <= 50):
            raise ValueError("Username must be between 3 and 50 characters")
        return v


class UserCreate(UserBase):
    password: str = Field(..., description="Password", examples=["password123"])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not (6 <= len(v) <= 100):
            raise ValueError("Password must be between 6 and 100 characters")
        return v


class UserLogin(BaseModel):
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Password is required")
        return v


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., description="New password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not (6 <= len(v) <= 100):
            raise ValueError("Password must be between 6 and 100 characters")
        return v


class UploadAvatarRequest(BaseModel):
    avatar_url: str = Field(..., description="Avatar URL")

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Avatar URL is required")
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Avatar URL must start with http:// or https://")
        return v


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
