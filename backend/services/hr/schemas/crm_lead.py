"""
MindFlow HR Service - CRM Lead Pydantic Schemas
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from ..models.crm_lead import DiscussionSummary, InterestLevel


# ── Contact person schemas ────────────────────────────────────────────────────

class ContactPersonCreate(BaseModel):
    name: str
    designation: str
    mobile: str
    email: EmailStr

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = v.replace(" ", "").replace("-", "").replace("+", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Mobile number must be at least 10 digits")
        return v


class ContactPersonResponse(BaseModel):
    id: UUID
    leadId: UUID
    name: str
    designation: str
    mobile: str
    email: str
    createdAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, c) -> "ContactPersonResponse":
        return cls(
            id=c.id,
            leadId=c.lead_id,
            name=c.name,
            designation=c.designation,
            mobile=c.mobile,
            email=c.email,
            createdAt=c.created_at,
        )


# ── CRM Lead schemas ──────────────────────────────────────────────────────────

class CrmLeadCreateRequest(BaseModel):
    operatingOfficeName: str
    location: str
    contacts: List[ContactPersonCreate]
    dateContacted: date
    discussionSummary: DiscussionSummary
    interestLevel: InterestLevel
    demoRequired: bool = False
    trainingCompleted: bool = False
    nextFollowupDate: Optional[date] = None
    remarks: Optional[str] = None

    @field_validator("contacts")
    @classmethod
    def at_least_one_contact(cls, v):
        if not v:
            raise ValueError("At least one contact person is required")
        return v


class CrmLeadUpdateRequest(BaseModel):
    operatingOfficeName: Optional[str] = None
    location: Optional[str] = None
    contacts: Optional[List[ContactPersonCreate]] = None
    dateContacted: Optional[date] = None
    discussionSummary: Optional[DiscussionSummary] = None
    interestLevel: Optional[InterestLevel] = None
    demoRequired: Optional[bool] = None
    trainingCompleted: Optional[bool] = None
    nextFollowupDate: Optional[date] = None
    remarks: Optional[str] = None


class CrmLeadResponse(BaseModel):
    id: UUID
    tenantId: UUID
    operatingOfficeName: str
    location: str
    contacts: List[ContactPersonResponse]
    dateContacted: date
    discussionSummary: DiscussionSummary
    interestLevel: InterestLevel
    demoRequired: bool
    trainingCompleted: bool
    nextFollowupDate: Optional[date]
    remarks: Optional[str]
    createdBy: Optional[UUID]
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, lead) -> "CrmLeadResponse":
        return cls(
            id=lead.id,
            tenantId=lead.tenant_id,
            operatingOfficeName=lead.operating_office_name,
            location=lead.location,
            contacts=[ContactPersonResponse.from_model(c) for c in lead.contacts],
            dateContacted=lead.date_contacted,
            discussionSummary=lead.discussion_summary,
            interestLevel=lead.interest_level,
            demoRequired=lead.demo_required,
            trainingCompleted=lead.training_completed,
            nextFollowupDate=lead.next_followup_date,
            remarks=lead.remarks,
            createdBy=lead.created_by,
            createdAt=lead.created_at,
            updatedAt=lead.updated_at,
        )


class CrmLeadListResponse(BaseModel):
    items: List[CrmLeadResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int
    hasNext: bool
    hasPrevious: bool
