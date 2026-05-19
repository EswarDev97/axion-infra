"""
MindFlow Expense Service - Category Schemas
Per API_CONTRACT.md Section 8.6.4
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCategoryCreateRequest(BaseModel):
    """Request schema for creating an expense category."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    requires_receipt: bool = Field(True, alias="requiresReceipt")

    model_config = ConfigDict(populate_by_name=True)


class ExpenseCategoryUpdateRequest(BaseModel):
    """Request schema for updating an expense category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    requires_receipt: Optional[bool] = Field(None, alias="requiresReceipt")
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)


class ExpenseCategoryResponse(BaseModel):
    """Expense category response schema."""
    id: UUID
    name: str
    code: str
    description: Optional[str] = None
    max_amount: Optional[Decimal] = Field(None, alias="maxAmount")
    requires_receipt: bool = Field(alias="requiresReceipt")
    is_active: bool = Field(alias="isActive")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
