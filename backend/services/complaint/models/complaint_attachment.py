"""
MindFlow Complaint Service - Complaint Attachment Model
Per DATABASE_SCHEMA.md Section 3.7.6

CREATE TABLE complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id),
    file_id UUID NOT NULL,
    attachment_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .complaint import Complaint


# Attachment type constants
ATTACHMENT_GENERAL = "GENERAL"
ATTACHMENT_EVIDENCE = "EVIDENCE"
ATTACHMENT_RESOLUTION = "RESOLUTION"
ATTACHMENT_CORRESPONDENCE = "CORRESPONDENCE"


class ComplaintAttachment(Base):
    """
    Complaint attachments - references file_metadata in storage service.
    """

    __tablename__ = "complaint_attachments"

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
    complaint_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("complaints.id"),
        nullable=False,
        index=True
    )

    # Reference to file in storage service
    file_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Attachment type: GENERAL, EVIDENCE, RESOLUTION, CORRESPONDENCE
    attachment_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=ATTACHMENT_GENERAL
    )

    # Upload tracking
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    # Note: No ForeignKey as users table is in Auth service
    uploaded_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False
    )

    # Audit columns (immutable)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        back_populates="attachments",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ComplaintAttachment(id={self.id}, complaint_id={self.complaint_id}, file_id={self.file_id})>"
