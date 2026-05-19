"""
MindFlow Expense Service - Receipt Schemas
Per API_CONTRACT.md Section 8.6.3
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReceiptUploadRequest(BaseModel):
    """POST /requests/{request_id}/receipts request body."""
    file_id: UUID = Field(alias="fileId")
    expense_item_id: Optional[UUID] = Field(None, alias="expenseItemId")

    model_config = ConfigDict(populate_by_name=True)


class ReceiptResponse(BaseModel):
    """Receipt response schema."""
    id: UUID
    expense_request_id: UUID = Field(alias="expenseRequestId")
    expense_item_id: Optional[UUID] = Field(None, alias="expenseItemId")
    file_id: UUID = Field(alias="fileId")
    uploaded_at: datetime = Field(alias="uploadedAt")
    uploaded_by: UUID = Field(alias="uploadedBy")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
