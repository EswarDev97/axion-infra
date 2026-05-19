"""
MindFlow Training Service - Course Model
Per DATABASE_SCHEMA.md Section 3.5.1

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    objective TEXT,
    duration_hours DECIMAL(6,2),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    validity_months INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    category VARCHAR(50),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .training_content import TrainingContent
    from .training_session import TrainingSession
    from .enrollment import Enrollment
    from .exam import Exam
    from .certificate import Certificate


class Course(Base):
    """
    Training course entity.
    Status: DRAFT, PUBLISHED, ARCHIVED
    Category: COMPLIANCE, TECHNICAL, SOFT_SKILLS, ONBOARDING, SAFETY, OTHER
    """

    __tablename__ = "courses"

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

    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Training parameters
    duration_hours: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    passing_score: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    validity_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Status and category
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

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
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    updated_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    # Relationships
    contents: Mapped[List["TrainingContent"]] = relationship(
        "TrainingContent",
        back_populates="course",
        lazy="selectin"
    )
    sessions: Mapped[List["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="course",
        lazy="selectin"
    )
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="course",
        lazy="selectin"
    )
    exams: Mapped[List["Exam"]] = relationship(
        "Exam",
        back_populates="course",
        lazy="selectin"
    )
    certificates: Mapped[List["Certificate"]] = relationship(
        "Certificate",
        back_populates="course",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Course(id={self.id}, code={self.code}, title={self.title[:30]}...)>"

    @property
    def is_published(self) -> bool:
        """Check if course is published."""
        return self.status == "PUBLISHED"

    @property
    def content_count(self) -> int:
        """Get total content count."""
        return len([c for c in self.contents if True]) if self.contents else 0

    @property
    def enrollment_count(self) -> int:
        """Get total enrollment count."""
        return len([e for e in self.enrollments if not e.is_deleted]) if self.enrollments else 0
