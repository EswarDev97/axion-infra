"""
MindFlow Complaint Service - Complaint Schemas
Per API_CONTRACT.md Section 8.7.1
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .category import CategoryResponse


class SLAInfo(BaseModel):
    """SLA information for a complaint."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    response_hours: int = Field(alias="responseHours")
    resolution_hours: int = Field(alias="resolutionHours")
    escalation_hours: int = Field(alias="escalationHours")
    response_due_at: Optional[datetime] = Field(None, alias="responseDueAt")
    resolution_due_at: Optional[datetime] = Field(None, alias="resolutionDueAt")


class UserInfo(BaseModel):
    """Minimal user information."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str


class ComplaintCreateRequest(BaseModel):
    """
    Request schema for creating a complaint.
    Field order on creation screen:
      Channel, Category, Complaint Type, Complainant Name, Contact Number,
      Insurer/Client, Claim No, Vehicle Number, Workshop Name,
      Complaint Description, Severity, Assign To
    """

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    # Channel (required) — dropdown: MAIL, PHONE
    source_channel: str = Field(..., alias="sourceChannel")
    # Category (required) — dropdown: Inspection, Claims (references category table)
    category_id: UUID = Field(..., alias="categoryId")
    # Complaint Type — free-text field (NOT a dropdown)
    complaint_type: Optional[str] = Field(None, max_length=255, alias="complaintType")
    # Complainant Name
    complainant_name: Optional[str] = Field(None, max_length=255, alias="complainantName")
    # Contact Number
    complainant_contact: Optional[str] = Field(None, max_length=255, alias="complainantContact")
    # Insurer / Client (required) — dropdown from master table
    insurer_client: Optional[str] = Field(None, max_length=255, alias="insurerClient")
    # Claim Number
    reference_id: Optional[str] = Field(None, max_length=100, alias="claimNo")
    # Vehicle Number
    vehicle_number: Optional[str] = Field(None, max_length=50, alias="vehicleNumber")
    # Workshop Name
    workshop_name: Optional[str] = Field(None, max_length=255, alias="workshopName")
    # Complaint Description (required)
    description: str = Field(..., min_length=1, alias="description")
    # Severity
    severity: str = Field("MEDIUM", alias="severity")
    # Assign To — dynamic dropdown filtered by role hierarchy
    owner_employee_id: Optional[UUID] = Field(None, alias="assignTo")

    # Legacy/additional fields kept for backward compatibility
    title: Optional[str] = Field(None, max_length=255, alias="title")
    complainant_type: Optional[str] = Field(None, max_length=30, alias="complainantType")
    complainant_employee_id: Optional[UUID] = Field(None, alias="complainantEmployeeId")
    reference_type: Optional[str] = Field(None, max_length=50, alias="referenceType")
    corrective_action: Optional[str] = Field(None, alias="correctiveAction")
    expected_closure_date: Optional[date] = Field(None, alias="expectedClosureDate")


class ComplaintUpdateRequest(BaseModel):
    """
    Request schema for updating a complaint.
    Working stage fields: expectedClosureDate, closureRemarks (action taken / remarks)
    """

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    title: Optional[str] = Field(None, min_length=1, max_length=255, alias="title")
    description: Optional[str] = Field(None, min_length=1, alias="description")
    category_id: Optional[UUID] = Field(None, alias="categoryId")
    severity: Optional[str] = Field(None, alias="severity")
    status: Optional[str] = Field(None, alias="status")
    complaint_type: Optional[str] = Field(None, max_length=255, alias="complaintType")
    complainant_type: Optional[str] = Field(None, max_length=30, alias="complainantType")
    complainant_name: Optional[str] = Field(None, max_length=255, alias="complainantName")
    complainant_contact: Optional[str] = Field(None, max_length=255, alias="complainantContact")
    reference_type: Optional[str] = Field(None, max_length=50, alias="referenceType")
    reference_id: Optional[str] = Field(None, max_length=100, alias="referenceId")
    insurer_client: Optional[str] = Field(None, max_length=255, alias="insurerClient")
    vehicle_number: Optional[str] = Field(None, max_length=50, alias="vehicleNumber")
    workshop_name: Optional[str] = Field(None, max_length=255, alias="workshopName")
    corrective_action: Optional[str] = Field(None, alias="correctiveAction")
    # Working stage fields
    expected_closure_date: Optional[date] = Field(None, alias="expectedClosureDate")
    closure_remarks: Optional[str] = Field(None, alias="closureRemarks")  # Action Taken / Remarks


class ComplaintAssignRequest(BaseModel):
    """Request schema for assigning a complaint."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    owner_employee_id: UUID = Field(..., alias="ownerEmployeeId")
    notes: Optional[str] = Field(None, alias="notes")


class ComplaintEscalateRequest(BaseModel):
    """Request schema for escalating a complaint."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    escalate_to_employee_id: Optional[UUID] = Field(None, alias="escalateToEmployeeId")
    reason: str = Field(..., min_length=1, alias="reason")


class ComplaintResolveRequest(BaseModel):
    """Request schema for resolving a complaint."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    resolution_notes: str = Field(..., min_length=1, alias="resolutionNotes")


class ComplaintCloseRequest(BaseModel):
    """Request schema for closing a complaint. Both fields are REQUIRED."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    reason_for_complaint: str = Field(..., min_length=1, alias="reasonForComplaint")
    corrective_action: str = Field(..., min_length=1, alias="correctiveAction")
    closure_remarks: Optional[str] = Field(None, alias="closureRemarks")


class ComplaintReopenRequest(BaseModel):
    """Request schema for reopening a complaint."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    reason: str = Field(..., min_length=1, alias="reason")


class ComplaintResponse(BaseModel):
    """
    Response schema for a complaint (list view).
    Columns per PART 5: Complaint ID, Channel, Category, Complaint Type, Complainant Name,
    Insurer/Client, Claim Number, Vehicle Number, Assigned To, Severity, Current Status,
    Closure TAT (Days), Escalated (Y/N), Escalation Level, Last Update Date, Created Date
    """

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    complaint_number: str = Field(alias="complaintNumber")
    source_channel: str = Field(alias="sourceChannel")
    category: CategoryResponse
    complaint_type: Optional[str] = Field(None, alias="complaintType")
    complainant_name: Optional[str] = Field(None, alias="complainantName")
    insurer_client: Optional[str] = Field(None, alias="insurerClient")
    reference_id: Optional[str] = Field(None, alias="referenceId")
    vehicle_number: Optional[str] = Field(None, alias="vehicleNumber")
    owner_employee_id: Optional[UUID] = Field(None, alias="ownerEmployeeId")
    assigned_to_name: Optional[str] = Field(None, alias="assignedToName")
    severity: str
    status: str
    display_status: str = Field("Open", alias="displayStatus")
    closure_tat_days: Optional[int] = Field(None, alias="closureTatDays")
    escalated_yn: str = Field("N", alias="escalatedYN")
    escalation_level: int = Field(alias="escalationLevel")
    updated_at: datetime = Field(alias="updatedAt")
    created_at: datetime = Field(alias="createdAt")
    title: Optional[str] = Field(None, alias="title")
    is_escalated: bool = Field(False, alias="isEscalated")
    assigned_at: Optional[datetime] = Field(None, alias="assignedAt")
    expected_closure_date: Optional[date] = Field(None, alias="expectedClosureDate")
    sla_response_due_at: Optional[datetime] = Field(None, alias="slaResponseDueAt")
    sla_resolution_due_at: Optional[datetime] = Field(None, alias="slaResolutionDueAt")
    is_overdue_response: bool = Field(False, alias="isOverdueResponse")
    is_overdue_resolution: bool = Field(False, alias="isOverdueResolution")


class ComplaintDetailResponse(BaseModel):
    """Response schema for complaint details."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    complaint_number: str = Field(alias="complaintNumber")
    title: str
    description: str
    category: CategoryResponse
    severity: str
    source_channel: str = Field(alias="sourceChannel")
    status: str
    display_status: str = Field("Open", alias="displayStatus")
    complainant_type: Optional[str] = Field(None, alias="complainantType")
    complainant_name: Optional[str] = Field(None, alias="complainantName")
    complainant_contact: Optional[str] = Field(None, alias="complainantContact")
    complainant_employee_id: Optional[UUID] = Field(None, alias="complainantEmployeeId")
    owner_employee_id: Optional[UUID] = Field(None, alias="ownerEmployeeId")
    assigned_to_name: Optional[str] = Field(None, alias="assignedToName")
    assigned_at: Optional[datetime] = Field(None, alias="assignedAt")
    reference_type: Optional[str] = Field(None, alias="referenceType")
    reference_id: Optional[str] = Field(None, alias="referenceId")
    insurer_client: Optional[str] = Field(None, alias="insurerClient")
    vehicle_number: Optional[str] = Field(None, alias="vehicleNumber")
    workshop_name: Optional[str] = Field(None, alias="workshopName")
    corrective_action: Optional[str] = Field(None, alias="correctiveAction")
    expected_closure_date: Optional[date] = Field(None, alias="expectedClosureDate")
    sla: Optional[SLAInfo] = None
    responded_at: Optional[datetime] = Field(None, alias="respondedAt")
    resolved_at: Optional[datetime] = Field(None, alias="resolvedAt")
    closed_at: Optional[datetime] = Field(None, alias="closedAt")
    closure_remarks: Optional[str] = Field(None, alias="closureRemarks")
    closure_tat_hours: Optional[Decimal] = Field(None, alias="closureTatHours")
    closure_tat_days: Optional[int] = Field(None, alias="closureTatDays")
    reason_for_complaint: Optional[str] = Field(None, alias="reasonForComplaint")
    complaint_type: Optional[str] = Field(None, alias="complaintType")
    reopened_count: int = Field(alias="reopenedCount")
    is_escalated: bool = Field(False, alias="isEscalated")
    escalation_level: int = Field(alias="escalationLevel")
    last_escalated_at: Optional[datetime] = Field(None, alias="lastEscalatedAt")
    is_overdue_response: bool = Field(False, alias="isOverdueResponse")
    is_overdue_resolution: bool = Field(False, alias="isOverdueResolution")
    created_by: Optional[UserInfo] = Field(None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ComplaintListResponse(BaseModel):
    """Response schema for list of complaints."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[ComplaintResponse]
    total: int
    page: int
    limit: int
    pages: int


class ComplaintFilters(BaseModel):
    """Filter parameters for listing complaints."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    category_id: Optional[UUID] = Field(None, alias="categoryId")
    severity: Optional[str] = Field(None, alias="severity")
    status: Optional[str] = Field(None, alias="status")
    source_channel: Optional[str] = Field(None, alias="sourceChannel")
    owner_employee_id: Optional[UUID] = Field(None, alias="ownerEmployeeId")
    complainant_employee_id: Optional[UUID] = Field(None, alias="complainantEmployeeId")
    overdue: Optional[bool] = Field(None, alias="overdue")
    search: Optional[str] = Field(None, alias="search")
