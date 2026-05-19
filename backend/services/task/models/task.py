"""
MindFlow Task Service - Task Model
Per DATABASE_SCHEMA.md Section 3.4.2

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES task_statuses(id),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    parent_task_id UUID REFERENCES tasks(id),
    origin_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    origin_reference_id UUID,
    expected_completion_date DATE,
    actual_completion_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    tags JSONB DEFAULT '[]',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .task_status import TaskStatus
    from .task_assignee import TaskAssignee
    from .task_comment import TaskComment
    from .task_attachment import TaskAttachment
    from .task_dependency import TaskDependency


class Task(Base):
    """
    Task entity - supports hierarchical structure and state machine.
    Priority: LOW, MEDIUM, HIGH, URGENT
    Origin type: MANUAL, WORKFLOW, REVIEW, APPROVAL, MAINTENANCE
    """

    __tablename__ = "tasks"

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
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status and priority
    status_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("task_statuses.id"),
        nullable=False,
        index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM"
    )

    # Hierarchy
    parent_task_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tasks.id"),
        nullable=True,
        index=True
    )

    # Origin tracking
    origin_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="MANUAL"
    )
    origin_reference_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True
    )

    # Department assignment
    department_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=True,
        index=True
    )

    # Dates
    expected_completion_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )
    actual_completion_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )

    # Time tracking
    estimated_hours: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )
    actual_hours: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(6, 2),
        nullable=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Tags (flexible categorization)
    tags: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list
    )

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deletion_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

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
    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )
    updated_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True
    )

    # Relationships
    status: Mapped["TaskStatus"] = relationship(
        "TaskStatus",
        back_populates="tasks",
        lazy="selectin"
    )
    parent_task: Mapped[Optional["Task"]] = relationship(
        "Task",
        remote_side=[id],
        back_populates="subtasks",
        lazy="selectin"
    )
    subtasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="parent_task",
        lazy="selectin"
    )
    assignees: Mapped[List["TaskAssignee"]] = relationship(
        "TaskAssignee",
        back_populates="task",
        lazy="selectin"
    )
    comments: Mapped[List["TaskComment"]] = relationship(
        "TaskComment",
        back_populates="task",
        lazy="selectin"
    )
    attachments: Mapped[List["TaskAttachment"]] = relationship(
        "TaskAttachment",
        back_populates="task",
        lazy="selectin"
    )
    dependencies_as_task: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        lazy="selectin"
    )
    dependencies_as_depends_on: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.depends_on_task_id",
        back_populates="depends_on_task",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title={self.title[:30]}...)>"

    @property
    def time_taken_minutes(self) -> Optional[int]:
        """Calculate time taken in minutes between started_at and completed_at."""
        if not self.started_at or not self.completed_at:
            return None
        delta = self.completed_at - self.started_at
        return int(delta.total_seconds() / 60)

    @property
    def is_overdue(self) -> bool:
        """Check if task is overdue."""
        if not self.expected_completion_date:
            return False
        if self.actual_completion_date:
            return False
        return date.today() > self.expected_completion_date

    @property
    def progress_percentage(self) -> Optional[int]:
        """Calculate progress based on subtasks."""
        if not self.subtasks:
            return None
        completed = sum(
            1 for st in self.subtasks
            if st.status and st.status.is_terminal and not st.is_deleted
        )
        total = sum(1 for st in self.subtasks if not st.is_deleted)
        if total == 0:
            return None
        return int((completed / total) * 100)
