"""
MindFlow Complaint Service - Complaint Model
Per DATABASE_SCHEMA.md Section 3.7.4
Enhanced per COMPLAINT_ENHANCEMENT_TDD.md

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES complaint_categories(id),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    source_channel VARCHAR(30) NOT NULL DEFAULT 'INTERNAL',
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    complainant_name VARCHAR(255),
    complainant_contact VARCHAR(255),
    complainant_type VARCHAR(30) DEFAULT 'INTERNAL',
    complainant_employee_id UUID REFERENCES employees(id),
    owner_employee_id UUID REFERENCES employees(id),
    assigned_at TIMESTAMPTZ,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    insurer_client VARCHAR(255),
    vehicle_number VARCHAR(50),
    workshop_name VARCHAR(255),
    corrective_action TEXT,
    expected_closure_date DATE,
    sla_response_due_at TIMESTAMPTZ,
    sla_resolution_due_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closure_remarks TEXT,
    closure_tat_hours DECIMAL(10,2),
    closure_tat_days INTEGER,
    reason_for_complaint TEXT,
    complaint_type VARCHAR(255),
    reopened_count INTEGER NOT NULL DEFAULT 0,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    last_escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, complaint_number)
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .category import ComplaintCategory
    from .complaint_action import ComplaintAction
    from .complaint_attachment import ComplaintAttachment


# Status constants
COMPLAINT_STATUS_NEW = "NEW"
COMPLAINT_STATUS_ASSIGNED = "ASSIGNED"
COMPLAINT_STATUS_IN_PROGRESS = "IN_PROGRESS"
COMPLAINT_STATUS_WAITING_INFO = "WAITING_INFO"
COMPLAINT_STATUS_RESOLVED = "RESOLVED"
COMPLAINT_STATUS_CLOSED = "CLOSED"
COMPLAINT_STATUS_REOPENED = "REOPENED"

# Severity constants
SEVERITY_LOW = "LOW"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_HIGH = "HIGH"
SEVERITY_CRITICAL = "CRITICAL"

# Source channel constants
SOURCE_MAIL = "MAIL"
SOURCE_PHONE = "PHONE"
SOURCE_INTERNAL = "INTERNAL"
SOURCE_EMAIL = "EMAIL"
SOURCE_WHATSAPP = "WHATSAPP"
SOURCE_WALK_IN = "WALK_IN"
SOURCE_OTHER = "OTHER"


class Complaint(Base):
    """
    Complaint records with PII and soft delete support.
    State machine: NEW -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
    Can also be WAITING_INFO, REOPENED, or escalated.
    """

    __tablename__ = "complaints"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    # Note: No ForeignKey as tenants table is in a different service
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )
    complaint_number: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Category reference
    category_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("complaint_categories.id"),
        nullable=False,
        index=True
    )

    # Severity: LOW, MEDIUM, HIGH, CRITICAL
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default=SEVERITY_MEDIUM)

    # Source channel: INTERNAL, PHONE, EMAIL, WHATSAPP, WALK_IN, OTHER
    source_channel: Mapped[str] = mapped_column(String(30), nullable=False, default=SOURCE_INTERNAL)

    # Status: NEW, ASSIGNED, IN_PROGRESS, WAITING_INFO, RESOLVED, CLOSED, REOPENED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=COMPLAINT_STATUS_NEW)

    # Complainant info (external complainant)
    complainant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    complainant_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    complainant_type: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True, default="INTERNAL"
    )

    # Complaint type — free-text field (not dropdown)
    complaint_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Internal employee reference (if complaint is from employee)
    # Note: No ForeignKey as employees table is in HR service
    complainant_employee_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )

    # Owner (assigned to)
    # Note: No ForeignKey as employees table is in HR service
    owner_employee_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        index=True
    )
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Reference to related entity (e.g., order, service, etc.)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Enhanced fields per COMPLAINT_ENHANCEMENT_TDD.md
    insurer_client: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    workshop_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_closure_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)

    # SLA tracking
    sla_response_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_resolution_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closure_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    closure_tat_hours: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    closure_tat_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Reason for complaint (required at closure)
    reason_for_complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Reopening and escalation tracking
    reopened_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    escalation_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_escalated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )
    # Note: No ForeignKey as users table is in Auth service
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )
    # Note: No ForeignKey as users table is in Auth service
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    category: Mapped["ComplaintCategory"] = relationship(
        "ComplaintCategory",
        back_populates="complaints",
        lazy="selectin"
    )
    actions: Mapped[List["ComplaintAction"]] = relationship(
        "ComplaintAction",
        back_populates="complaint",
        lazy="selectin",
        order_by="ComplaintAction.performed_at.desc()"
    )
    attachments: Mapped[List["ComplaintAttachment"]] = relationship(
        "ComplaintAttachment",
        back_populates="complaint",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Complaint(id={self.id}, number={self.complaint_number}, status={self.status})>"

    @property
    def display_status(self) -> str:
        """Map internal status to simplified display status (Open/Working/Closed)."""
        if self.status in (COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED, COMPLAINT_STATUS_REOPENED):
            return "Open"
        elif self.status in (COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO):
            return "Working"
        else:
            return "Closed"

    @property
    def escalated_yn(self) -> str:
        """Return Y/N for escalation status."""
        return "Y" if self.escalation_level > 0 else "N"

    @property
    def is_escalated(self) -> bool:
        """Check if complaint is escalated."""
        return self.escalation_level > 0

    @property
    def is_overdue_response(self) -> bool:
        """Check if response SLA is breached."""
        if not self.sla_response_due_at or self.responded_at:
            return False
        return datetime.utcnow() > self.sla_response_due_at.replace(tzinfo=None)

    @property
    def is_overdue_resolution(self) -> bool:
        """Check if resolution SLA is breached."""
        if not self.sla_resolution_due_at or self.resolved_at:
            return False
        return datetime.utcnow() > self.sla_resolution_due_at.replace(tzinfo=None)

    @property
    def can_be_assigned(self) -> bool:
        """Check if complaint can be assigned."""
        return self.status in (COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_REOPENED)

    @property
    def can_be_resolved(self) -> bool:
        """Check if complaint can be resolved."""
        return self.status in (COMPLAINT_STATUS_ASSIGNED, COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO)

    @property
    def can_be_reopened(self) -> bool:
        """Check if complaint can be reopened."""
        return self.status in (COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED)
