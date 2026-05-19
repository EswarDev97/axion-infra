"""
MindFlow Auth Service - Authentication Schemas
Per API_CONTRACT.md Section 8.1 (Authentication Endpoints)
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """
    POST /login request body.
    Per API_CONTRACT.md Section 8.1.4.
    """
    email: EmailStr
    password: str = Field(min_length=1)


class UserInfoResponse(BaseModel):
    """User info returned in login response."""
    id: UUID
    email: EmailStr
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    roles: List[str]
    permissions: List[str] = Field(default_factory=list)
    tenant_id: UUID = Field(alias="tenantId")

    model_config = ConfigDict(populate_by_name=True)


class LoginResponse(BaseModel):
    """
    POST /login response body.
    Per API_CONTRACT.md Section 8.1.4.

    {
        "accessToken": "eyJhbGciOiJIUzI1NiIs...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
        "tokenType": "Bearer",
        "expiresIn": 900,
        "user": { ... }
    }
    """
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: int = Field(alias="expiresIn")
    user: UserInfoResponse

    model_config = ConfigDict(populate_by_name=True)


class TokenRefreshRequest(BaseModel):
    """
    POST /token/refresh request body.
    """
    refresh_token: str = Field(alias="refreshToken")

    model_config = ConfigDict(populate_by_name=True)


class TokenRefreshResponse(BaseModel):
    """
    POST /token/refresh response body.
    """
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = Field(default="Bearer", alias="tokenType")
    expires_in: int = Field(alias="expiresIn")

    model_config = ConfigDict(populate_by_name=True)


class PasswordForgotRequest(BaseModel):
    """
    POST /password/forgot request body.
    """
    email: EmailStr


class PasswordResetRequest(BaseModel):
    """
    POST /password/reset request body.
    """
    token: str
    new_password: str = Field(min_length=12, alias="newPassword")

    model_config = ConfigDict(populate_by_name=True)


class PasswordChangeRequest(BaseModel):
    """
    POST /password/change request body.
    """
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(min_length=12, alias="newPassword")

    model_config = ConfigDict(populate_by_name=True)


class UserProfileResponse(BaseModel):
    """
    GET /me response body.
    """
    id: UUID
    email: EmailStr
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    roles: List[str]
    permissions: List[str]
    tenant_id: UUID = Field(alias="tenantId")
    last_login_at: Optional[datetime] = Field(None, alias="lastLoginAt")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class UserProfileUpdateRequest(BaseModel):
    """
    PUT /me request body.
    """
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)

    model_config = ConfigDict(populate_by_name=True)
