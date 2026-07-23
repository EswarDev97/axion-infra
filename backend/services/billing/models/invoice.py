"""
MindFlow Billing Service - Invoice Model
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .invoice_item import InvoiceItem


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    client_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    quote_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("quotes.id"), nullable=True, index=True)

    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Bill date = the invoice date printed on the document (editable at creation)
    bill_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    quote_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    po_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    po_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    bill_to_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bill_to_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bill_to_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bill_to_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=Decimal("0.00"))

    # GST breakdown columns
    igst_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    cgst_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))
    sgst_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0.00"))

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    created_by: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    updated_by: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)

    items: Mapped[List["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Invoice(id={self.id}, number={self.invoice_number}, status={self.status})>"

    @property
    def item_count(self) -> int:
        return len(self.items) if self.items else 0

    def calculate_totals(self) -> None:
        if not self.items:
            self.subtotal = Decimal("0.00")
        else:
            self.subtotal = sum(item.amount for item in self.items)
        igst_amt = self.subtotal * (self.igst_percentage / Decimal("100"))
        cgst_amt = self.subtotal * (self.cgst_percentage / Decimal("100"))
        sgst_amt = self.subtotal * (self.sgst_percentage / Decimal("100"))
        self.tax_amount = igst_amt + cgst_amt + sgst_amt
        self.tax_percentage = self.igst_percentage + self.cgst_percentage + self.sgst_percentage
        self.total_amount = self.subtotal + self.tax_amount
