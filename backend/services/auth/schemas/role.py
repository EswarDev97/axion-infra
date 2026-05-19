"""
MindFlow Auth Service - Role and Permission Schemas
Per API_CONTRACT.md Section 8.1.3 (Role & Permission Endpoints)
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class PermissionResponse(BaseModel):
    """
    Permission response schema.
    """
    id: UUID
    code: str
    name: str
    module: str
    action: str
    resource_scope: str = Field(alias="resourceScope")
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PermissionListResponse(PaginatedData[PermissionResponse]):
    """Paginated list of permissions."""
    pass


class RoleCreateRequest(BaseModel):
    """
    POST /roles request body.
    """
    code: str = Field(max_length=50)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class RoleUpdateRequest(BaseModel):
    """
    PUT /roles/{role_id} request body.
    """
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True)


class RoleResponse(BaseModel):
    """
    Role response schema.
    """
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    is_system_role: bool = Field(alias="isSystemRole")
    permissions: List[str]
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class RoleListResponse(PaginatedData[RoleResponse]):
    """Paginated list of roles."""
    pass
