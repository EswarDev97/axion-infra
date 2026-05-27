"""
MindFlow HR Service - CRM Lead Models
Micro-CRM for Operating Office outreach tracking.

Tables: crm_leads, crm_lead_contacts
"""

import enum
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class DiscussionSummary(str, enum.Enum):
    INTRODUCE_AXION = "INTRODUCE_AXION"
    ESTABLISH_CREDIBILITY = "ESTABLISH_CREDIBILITY"
    RO_APPROVAL_CIRCULATED = "RO_APPROVAL_CIRCULATED"
    EXPLAIN_EASY_PROCESS = "EXPLAIN_EASY_PROCESS"
    UNDERSTAND_PAIN_POINTS = "UNDERSTAND_PAIN_POINTS"
    OFFER_TRAINING_DEMO = "OFFER_TRAINING_DEMO"
    OBTAIN_FIRST_CASE = "OBTAIN_FIRST_CASE"


class InterestLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class CrmLead(Base):
    __tablename__ = "crm_leads"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    operating_office_name: Mapped[str] = mapped_column(String(150), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    date_contacted: Mapped[date] = mapped_column(Date(), nullable=False)
    discussion_summary: Mapped[DiscussionSummary] = mapped_column(
        Enum(DiscussionSummary, name="DiscussionSummary", create_type=False), nullable=False
    )
    interest_level: Mapped[InterestLevel] = mapped_column(
        Enum(InterestLevel, name="InterestLevel", create_type=False), nullable=False
    )
    demo_required: Mapped[bool] = mapped_column(Boolean(), server_default="false", nullable=False)
    training_completed: Mapped[bool] = mapped_column(Boolean(), server_default="false", nullable=False)
    next_followup_date: Mapped[Optional[date]] = mapped_column(Date(), nullable=True, index=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)

    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    contacts: Mapped[List["CrmLeadContact"]] = relationship(
        "CrmLeadContact", back_populates="lead", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<CrmLead(id={self.id}, office={self.operating_office_name})>"


class CrmLeadContact(Base):
    __tablename__ = "crm_lead_contacts"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    lead_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    lead: Mapped["CrmLead"] = relationship("CrmLead", back_populates="contacts")

    def __repr__(self) -> str:
        return f"<CrmLeadContact(id={self.id}, name={self.name})>"
