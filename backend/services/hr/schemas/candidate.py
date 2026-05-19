"""
MindFlow HR Service - Candidate Schemas
Per API_CONTRACT.md Section 8.2.7
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from shared.schemas import PaginatedData


class CandidateCreateRequest(BaseModel):
    """POST /hr/candidates request body."""
    first_name: str = Field(alias="firstName", max_length=100)
    last_name: str = Field(alias="lastName", max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    position_id: Optional[UUID] = Field(None, alias="positionId")
    resume_file_id: Optional[UUID] = Field(None, alias="resumeFileId")
    source: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CandidateUpdateRequest(BaseModel):
    """PUT /hr/candidates/{id} request body."""
    first_name: Optional[str] = Field(None, alias="firstName", max_length=100)
    last_name: Optional[str] = Field(None, alias="lastName", max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    position_id: Optional[UUID] = Field(None, alias="positionId")
    resume_file_id: Optional[UUID] = Field(None, alias="resumeFileId")
    status: Optional[str] = None
    source: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CandidateResponse(BaseModel):
    """Candidate response schema."""
    id: UUID
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    full_name: str = Field(alias="fullName")
    email: EmailStr
    phone: Optional[str] = None
    position_id: Optional[UUID] = Field(None, alias="positionId")
    position_title: Optional[str] = Field(None, alias="positionTitle")
    resume_file_id: Optional[UUID] = Field(None, alias="resumeFileId")
    status: str
    source: Optional[str] = None
    notes: Optional[str] = None
    applied_at: datetime = Field(alias="appliedAt")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CandidateListResponse(PaginatedData[CandidateResponse]):
    """Paginated list of candidates."""
    pass


class CandidateConvertRequest(BaseModel):
    """POST /hr/candidates/{id}/convert request body."""
    employee_code: str = Field(alias="employeeCode", max_length=50)
    department_id: Optional[UUID] = Field(None, alias="departmentId")
    manager_id: Optional[UUID] = Field(None, alias="managerId")
    date_of_joining: date = Field(alias="dateOfJoining")
    employment_type: str = Field(default="FULL_TIME", alias="employmentType")
    create_user_account: bool = Field(default=False, alias="createUserAccount")

    model_config = ConfigDict(populate_by_name=True)
