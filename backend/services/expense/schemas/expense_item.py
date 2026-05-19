"""
MindFlow Expense Service - Expense Item Schemas
Per API_CONTRACT.md Section 8.6.2
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExpenseItemCreateRequest(BaseModel):
    """POST /requests/{request_id}/items request body."""
    category_id: UUID = Field(alias="categoryId")
    description: str = Field(max_length=255)
    amount: Decimal = Field(gt=0)
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = Field(None, alias="unitPrice", ge=0)
    expense_date: date = Field(alias="expenseDate")

    model_config = ConfigDict(populate_by_name=True)


class ExpenseItemUpdateRequest(BaseModel):
    """PUT /requests/{request_id}/items/{item_id} request body."""
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    description: Optional[str] = Field(None, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[Decimal] = Field(None, alias="unitPrice", ge=0)
    expense_date: Optional[date] = Field(None, alias="expenseDate")

    model_config = ConfigDict(populate_by_name=True)


class CategoryInfo(BaseModel):
    """Category info embedded in item response."""
    id: UUID
    name: str
    code: str
    requires_receipt: bool = Field(alias="requiresReceipt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExpenseItemResponse(BaseModel):
    """Expense item response schema."""
    id: UUID
    expense_request_id: UUID = Field(alias="expenseRequestId")
    category_id: UUID = Field(alias="categoryId")
    category: Optional[CategoryInfo] = None
    description: str
    amount: Decimal
    quantity: int
    unit_price: Optional[Decimal] = Field(None, alias="unitPrice")
    expense_date: date = Field(alias="expenseDate")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: UUID = Field(alias="createdBy")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
