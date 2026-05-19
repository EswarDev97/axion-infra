"""
MindFlow Auth Service - User Management Schemas
Per API_CONTRACT.md Section 8.1.2 (User Management Endpoints)
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from shared.schemas import PaginatedData


class UserCreateRequest(BaseModel):
    """
    POST /users request body.
    Per API_CONTRACT.md Section 8.1.4.
    """
    email: EmailStr
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)
    password: str = Field(min_length=12)
    roles: List[str] = Field(default_factory=list)
    tenant_id: Optional[UUID] = Field(None, alias="tenantId")

    model_config = ConfigDict(populate_by_name=True)


class UserUpdateRequest(BaseModel):
    """
    PUT /users/{user_id} request body.
    """
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)
    is_active: Optional[bool] = Field(None, alias="isActive")
    roles: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True)


class UserResponse(BaseModel):
    """
    User response schema.
    Per API_CONTRACT.md Section 8.1.4.
    """
    id: UUID
    email: EmailStr
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    roles: List[str]
    tenant_id: UUID = Field(alias="tenantId")
    status: str
    is_active: bool = Field(alias="isActive")
    is_locked: bool = Field(alias="isLocked")
    last_login_at: Optional[datetime] = Field(None, alias="lastLoginAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class UserListResponse(PaginatedData[UserResponse]):
    """Paginated list of users."""
    pass
