"""
MindFlow Notification Service - Notification Model
Per DATABASE_SCHEMA.md Section 3.9.1

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url VARCHAR(500),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


# Notification type constants
NOTIFICATION_TYPE_TASK_ASSIGNED = "TASK_ASSIGNED"
NOTIFICATION_TYPE_TASK_COMPLETED = "TASK_COMPLETED"
NOTIFICATION_TYPE_TASK_COMMENT = "TASK_COMMENT"
NOTIFICATION_TYPE_LEAVE_APPROVED = "LEAVE_APPROVED"
NOTIFICATION_TYPE_LEAVE_REJECTED = "LEAVE_REJECTED"
NOTIFICATION_TYPE_EXPENSE_APPROVED = "EXPENSE_APPROVED"
NOTIFICATION_TYPE_EXPENSE_REJECTED = "EXPENSE_REJECTED"
NOTIFICATION_TYPE_COMPLAINT_CREATED = "COMPLAINT_CREATED"
NOTIFICATION_TYPE_COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED"
NOTIFICATION_TYPE_COMPLAINT_ESCALATED = "COMPLAINT_ESCALATED"
NOTIFICATION_TYPE_COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
NOTIFICATION_TYPE_APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
NOTIFICATION_TYPE_APPROVAL_COMPLETED = "APPROVAL_COMPLETED"
NOTIFICATION_TYPE_TRAINING_ENROLLED = "TRAINING_ENROLLED"
NOTIFICATION_TYPE_TRAINING_COMPLETED = "TRAINING_COMPLETED"
NOTIFICATION_TYPE_CERTIFICATE_EXPIRING = "CERTIFICATE_EXPIRING"
NOTIFICATION_TYPE_SYSTEM = "SYSTEM"

# Priority constants
PRIORITY_LOW = "LOW"
PRIORITY_NORMAL = "NORMAL"
PRIORITY_HIGH = "HIGH"
PRIORITY_URGENT = "URGENT"


class Notification(Base):
    """
    User notification records.
    Stores all notifications sent to users.
    """

    __tablename__ = "notifications"

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
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Notification type (e.g., TASK_ASSIGNED, LEAVE_APPROVED, etc.)
    type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Related entity (optional)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), nullable=True)

    # Action URL for navigation
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Priority: LOW, NORMAL, HIGH, URGENT
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default=PRIORITY_NORMAL)

    # Read status
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit columns (immutable)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id})>"

    def mark_as_read(self) -> None:
        """Mark notification as read."""
        self.is_read = True
        self.read_at = datetime.utcnow()
