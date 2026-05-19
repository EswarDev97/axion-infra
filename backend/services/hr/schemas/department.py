"""
MindFlow HR Service - Department Schemas
Per API_CONTRACT.md Section 8.2.2
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class DepartmentCreateRequest(BaseModel):
    """POST /hr/departments request body."""
    code: str = Field(max_length=50)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")

    model_config = ConfigDict(populate_by_name=True)


class DepartmentUpdateRequest(BaseModel):
    """PUT /hr/departments/{id} request body."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class DepartmentResponse(BaseModel):
    """Department response schema."""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    manager_name: Optional[str] = Field(None, alias="managerName")
    is_active: bool = Field(alias="isActive")
    employee_count: int = Field(default=0, alias="employeeCount")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class DepartmentTreeNode(BaseModel):
    """Department in tree structure."""
    id: UUID
    code: str
    name: str
    parent_id: Optional[UUID] = Field(None, alias="parentId")
    manager_name: Optional[str] = Field(None, alias="managerName")
    employee_count: int = Field(default=0, alias="employeeCount")
    children: List["DepartmentTreeNode"] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class DepartmentListResponse(PaginatedData[DepartmentResponse]):
    """Paginated list of departments."""
    pass
