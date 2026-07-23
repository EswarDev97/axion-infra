"""
MindFlow Complaint Service - Client Schemas
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClientType(str, Enum):
    CLIENT = "CLIENT"
    FINANCER = "FINANCER"


class ClientCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    type: ClientType = Field(ClientType.CLIENT)
    contact_person: Optional[str] = Field(None, max_length=200, alias="contactPerson")
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None)
    is_active: bool = Field(True, alias="isActive")
    default_tax_type: Optional[str] = Field(None, alias="defaultTaxType")
    default_tax_rate: Optional[Decimal] = Field(None, alias="defaultTaxRate")


class ClientUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    type: Optional[ClientType] = Field(None)
    contact_person: Optional[str] = Field(None, max_length=200, alias="contactPerson")
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None, alias="isActive")
    default_tax_type: Optional[str] = Field(None, alias="defaultTaxType")
    default_tax_rate: Optional[Decimal] = Field(None, alias="defaultTaxRate")


class ClientResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str
    code: str
    type: ClientType
    contact_person: Optional[str] = Field(None, alias="contactPerson")
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = Field(alias="isActive")
    default_tax_type: Optional[str] = Field(None, alias="defaultTaxType")
    default_tax_rate: Optional[Decimal] = Field(None, alias="defaultTaxRate")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ClientListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[ClientResponse]
    total: int
    page: int
    limit: int
    pages: int
