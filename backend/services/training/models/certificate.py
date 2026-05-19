"""
MindFlow Training Service - Certificate Model
Per DATABASE_SCHEMA.md Section 3.5.10

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    certificate_number VARCHAR(100) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until DATE,
    pdf_file_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, certificate_number)
);
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Date, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .enrollment import Enrollment
    from .course import Course


class Certificate(Base):
    """
    Certificate entity - training completion certificate.
    """

    __tablename__ = "certificates"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id"),
        nullable=False,
        index=True
    )
    enrollment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("enrollments.id"),
        nullable=False,
        index=True
    )
    employee_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.id"),
        nullable=False,
        index=True
    )
    course_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("courses.id"),
        nullable=False,
        index=True
    )

    # Certificate details
    certificate_number: Mapped[str] = mapped_column(String(100), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pdf_file_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )

    # Audit columns
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(
        "Enrollment",
        back_populates="certificates",
        lazy="selectin"
    )
    course: Mapped["Course"] = relationship(
        "Course",
        back_populates="certificates",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Certificate(id={self.id}, number={self.certificate_number})>"

    @property
    def is_expired(self) -> bool:
        """Check if certificate has expired."""
        if not self.valid_until:
            return False
        return date.today() > self.valid_until

    @property
    def is_valid(self) -> bool:
        """Check if certificate is still valid."""
        return not self.is_expired
