"""
MindFlow Complaint Service - Payment Model
Case-level payment records tracking client/finance references, executive
assignment, case status, and conditional billing/payment-mode details.

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    case_reference VARCHAR(100) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    finance_id UUID REFERENCES clients(id),
    vehicle_registration_number VARCHAR(50) NOT NULL,
    executive_employee_id UUID NOT NULL,
    case_status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    billing_status VARCHAR(30) NOT NULL,
    payment_mode VARCHAR(20),
    utr_number VARCHAR(50),
    transaction_datetime TIMESTAMPTZ,
    amount DECIMAL(12,2),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class Payment(Base):
    """Case-level payment records with client/finance references and
    conditional billing details."""

    __tablename__ = "payments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    # Note: No ForeignKey as tenants table is in Auth service
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )
    case_reference: Mapped[str] = mapped_column(String(100), nullable=False)

    # Client reference (real FK — clients table lives in this same service)
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=False,
        index=True
    )
    # Finance reference (optional; also a client of type FINANCER)
    finance_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=True
    )

    vehicle_registration_number: Mapped[str] = mapped_column(String(50), nullable=False)

    # Note: No ForeignKey as employees table is in HR service
    executive_employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Case status: ASSIGNED, ... (plain String + Python constants, matches
    # Complaint.status / Invoice.status / Client.type precedent)
    case_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ASSIGNED")

    # Billing status: COMPANY_BILLING, CUSTOMER_BILLING, etc.
    billing_status: Mapped[str] = mapped_column(String(30), nullable=False)

    # Payment mode: CASH, TRANSFER, etc. Conditionally required by billing_status.
    payment_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    utr_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    transaction_datetime: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
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

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, case_reference={self.case_reference}, case_status={self.case_status})>"
