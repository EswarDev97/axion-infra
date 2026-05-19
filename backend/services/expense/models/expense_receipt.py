"""
MindFlow Expense Service - Expense Receipt Model
Per DATABASE_SCHEMA.md Section 3.6.4

CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
    expense_item_id UUID REFERENCES expense_items(id),
    file_id UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .expense_request import ExpenseRequest
    from .expense_item import ExpenseItem


class ExpenseReceipt(Base):
    """
    Expense receipt entity - receipt attachment for expense claims.
    """

    __tablename__ = "expense_receipts"

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
    expense_request_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("expense_requests.id"),
        nullable=False,
        index=True
    )
    expense_item_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("expense_items.id"),
        nullable=True,
        index=True
    )

    # File reference (references file_metadata in storage service)
    file_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Upload details
    uploaded_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    # Note: No ForeignKey as users table is in Auth service
    uploaded_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    expense_request: Mapped["ExpenseRequest"] = relationship(
        "ExpenseRequest",
        back_populates="receipts",
        lazy="selectin"
    )
    expense_item: Mapped[Optional["ExpenseItem"]] = relationship(
        "ExpenseItem",
        back_populates="receipts",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ExpenseReceipt(id={self.id}, file_id={self.file_id})>"
