"""
MindFlow Backend - Common Schemas
Per API_CONTRACT.md Section 3 - Common Response Format
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Error detail for validation errors."""
    field: Optional[str] = None
    message: str
    code: str


class ErrorResponse(BaseModel):
    """
    Error response per API_CONTRACT.md Section 3.3.

    {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format",
                "code": "INVALID_FORMAT"
            }
        ]
    }
    """
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class PaginationMeta(BaseModel):
    """
    Pagination metadata per API_CONTRACT.md Section 3.2.

    {
        "page": 1,
        "pageSize": 20,
        "totalItems": 150,
        "totalPages": 8,
        "hasNext": true,
        "hasPrevious": false
    }
    """
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=200, alias="pageSize")
    total_items: int = Field(ge=0, alias="totalItems")
    total_pages: int = Field(ge=0, alias="totalPages")
    has_next: bool = Field(alias="hasNext")
    has_previous: bool = Field(alias="hasPrevious")

    model_config = ConfigDict(populate_by_name=True)


class PaginatedData(BaseModel, Generic[T]):
    """Paginated data wrapper."""
    items: List[T]
    pagination: PaginationMeta


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response per API_CONTRACT.md Section 3.1.

    Success:
    {
        "success": true,
        "data": { ... },
        "message": "Operation successful",
        "timestamp": "2026-01-16T10:30:00Z",
        "requestId": "uuid"
    }

    Error:
    {
        "success": false,
        "error": { ... },
        "timestamp": "2026-01-16T10:30:00Z",
        "requestId": "uuid"
    }
    """
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: UUID = Field(alias="requestId")

    model_config = ConfigDict(populate_by_name=True)


class PaginationParams(BaseModel):
    """
    Pagination query parameters per API_CONTRACT.md Section 4.1.

    | Parameter | Type | Default | Max | Description |
    |-----------|------|---------|-----|-------------|
    | `page` | integer | 1 | - | Page number (1-indexed) |
    | `page_size` | integer | 20 | 200 | Items per page |
    | `sort_by` | string | `created_at` | - | Field to sort by |
    | `sort_order` | enum | `desc` | - | `asc` or `desc` |
    """
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


# Common base models for entities
class BaseEntitySchema(BaseModel):
    """Base schema for entity responses."""
    id: UUID
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )


class TenantScopedEntitySchema(BaseEntitySchema):
    """Base schema for tenant-scoped entities."""
    tenant_id: UUID = Field(alias="tenantId")


class AuditedEntitySchema(TenantScopedEntitySchema):
    """Base schema for fully audited entities."""
    created_by: UUID = Field(alias="createdBy")
    updated_by: UUID = Field(alias="updatedBy")


class SoftDeleteEntitySchema(AuditedEntitySchema):
    """Base schema for soft-deletable entities."""
    is_deleted: bool = Field(default=False, alias="isDeleted")
    deleted_at: Optional[datetime] = Field(default=None, alias="deletedAt")
    deletion_reason: Optional[str] = Field(default=None, alias="deletionReason")


# Alias for backwards compatibility
APIResponse = ApiResponse
