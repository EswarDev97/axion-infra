"""
MindFlow Auth Service - Tenant Schemas
Per API_CONTRACT.md Section 8.1.4 (Tenant Management Endpoints)
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class TenantCreateRequest(BaseModel):
    """
    POST /tenants request body.
    """
    name: str = Field(max_length=255)
    slug: str = Field(max_length=100, pattern=r"^[a-z0-9-]+$")
    settings: Optional[Dict[str, Any]] = None


class TenantUpdateRequest(BaseModel):
    """
    PUT /tenants/{tenant_id} request body.
    """
    name: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, pattern=r"^(ACTIVE|INACTIVE|SUSPENDED)$")
    settings: Optional[Dict[str, Any]] = None


class TenantResponse(BaseModel):
    """
    Tenant response schema.
    """
    id: UUID
    name: str
    slug: str
    status: str
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TenantListResponse(PaginatedData[TenantResponse]):
    """Paginated list of tenants."""
    pass
