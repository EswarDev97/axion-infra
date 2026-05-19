"""
MindFlow Training Service - Certificate Schemas
Per API_CONTRACT.md Section 8.5.6
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


class CertificateIssueRequest(BaseModel):
    """POST /certificates/issue request body."""
    enrollment_id: UUID = Field(alias="enrollmentId")
    valid_until: Optional[date] = Field(None, alias="validUntil")

    model_config = ConfigDict(populate_by_name=True)


class CourseInfo(BaseModel):
    """Course info embedded in certificate response."""
    id: UUID
    title: str
    code: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class EmployeeInfo(BaseModel):
    """Employee info embedded in certificate response."""
    id: UUID
    employee_code: str = Field(alias="employeeCode")
    full_name: str = Field(alias="fullName")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CertificateResponse(BaseModel):
    """Certificate response schema."""
    id: UUID
    certificate_number: str = Field(alias="certificateNumber")
    enrollment_id: UUID = Field(alias="enrollmentId")
    employee_id: UUID = Field(alias="employeeId")
    employee: Optional[EmployeeInfo] = None
    course_id: UUID = Field(alias="courseId")
    course: Optional[CourseInfo] = None
    issued_at: datetime = Field(alias="issuedAt")
    valid_until: Optional[date] = Field(None, alias="validUntil")
    is_valid: bool = Field(default=True, alias="isValid")
    is_expired: bool = Field(default=False, alias="isExpired")
    pdf_file_id: Optional[UUID] = Field(None, alias="pdfFileId")
    tenant_id: UUID = Field(alias="tenantId")
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CertificateListResponse(PaginatedData[CertificateResponse]):
    """Paginated list of certificates."""
    pass
