"""
MindFlow Task Service - Task Dependency Model
Per DATABASE_GOVERNANCE.md - PostgreSQL is authoritative

Actual database schema:
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id),
    dependency_type VARCHAR(30) NOT NULL DEFAULT 'BLOCKS',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);
"""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

if TYPE_CHECKING:
    from .task import Task


class TaskDependency(Base):
    """
    Task dependency relationship.
    Dependency types:
    - BLOCKS: Task B is blocked by Task A
    - FINISH_TO_START: Task B cannot start until Task A finishes
    - FINISH_TO_FINISH: Task B cannot finish until Task A finishes
    - START_TO_START: Task B cannot start until Task A starts
    - START_TO_FINISH: Task B cannot finish until Task A starts
    """

    __tablename__ = "task_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "task_id",
            "depends_on_task_id",
            name="task_dependencies_task_id_depends_on_task_id_key"
        ),
    )

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
    task_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tasks.id"),
        nullable=False,
        index=True
    )
    depends_on_task_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tasks.id"),
        nullable=False,
        index=True
    )

    # Dependency type
    dependency_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="BLOCKS"
    )

    # Audit columns
    created_by: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        foreign_keys=[task_id],
        back_populates="dependencies_as_task",
        lazy="selectin"
    )
    depends_on_task: Mapped["Task"] = relationship(
        "Task",
        foreign_keys=[depends_on_task_id],
        back_populates="dependencies_as_depends_on",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<TaskDependency(task_id={self.task_id}, depends_on={self.depends_on_task_id})>"
