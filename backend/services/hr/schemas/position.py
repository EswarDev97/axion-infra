"""
MindFlow HR Service - Position Schemas
Per API_CONTRACT.md Section 8.2.3
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class PositionCreateRequest(BaseModel):
    """POST /hr/positions request body."""
    code: str = Field(max_length=50)
    title: str = Field(max_length=100)
    description: Optional[str] = None
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    level: int = Field(default=1, ge=1, le=20)

    model_config = ConfigDict(populate_by_name=True)


class PositionUpdateRequest(BaseModel):
    """PUT /hr/positions/{id} request body."""
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    level: Optional[int] = Field(None, ge=1, le=20)
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class PositionResponse(BaseModel):
    """Position response schema."""
    id: UUID
    code: str
    title: str
    description: Optional[str] = None
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    department_name: Optional[str] = Field(None, alias="departmentName")
    level: int
    is_active: bool = Field(alias="isActive")
    employee_count: int = Field(default=0, alias="employeeCount")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PositionListResponse(PaginatedData[PositionResponse]):
    """Paginated list of positions."""
    pass
