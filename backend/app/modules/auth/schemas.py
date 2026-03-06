"""
Pydantic Data Models

Used for auth API request and response data validation.
"""

from pydantic import Field

from app.core import ApiModel
from app.modules.users import Password, UserInfoResponse, UserName

# ============== Request Schemas ==============


class RegisterRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])


class LoginRequest(ApiModel):
    username: UserName = Field(..., description="Username", examples=["john_doe"])
    password: Password = Field(..., description="Password", examples=["password123"])


# ============== Response Schemas ==============


class AuthResponse(ApiModel):
    """Authentication response schema

    Contains user information and token returned after successful login or registration.

    Attributes:
        user: User information (sanitized)
        token: JWT access token
    """

    user: UserInfoResponse = Field(..., description="User information")
    token: str = Field(..., description="JWT access token")
