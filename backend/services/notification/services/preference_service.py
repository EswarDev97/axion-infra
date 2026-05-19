"""
MindFlow Notification Service - Preference Service
Business logic for notification preference management.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.preference import NotificationPreference
from ..schemas.preference import (
    PreferenceUpdateRequest,
    PreferenceResponse,
    PreferenceListResponse,
)


# Default notification types and their default settings
DEFAULT_NOTIFICATION_TYPES = [
    ("task_assigned", "Task Assigned", True, True, False),
    ("task_completed", "Task Completed", True, False, False),
    ("task_due_soon", "Task Due Soon", True, True, False),
    ("task_overdue", "Task Overdue", True, True, True),
    ("leave_request", "Leave Request", True, True, False),
    ("leave_approved", "Leave Approved", True, True, False),
    ("leave_rejected", "Leave Rejected", True, True, False),
    ("expense_submitted", "Expense Submitted", True, False, False),
    ("expense_approved", "Expense Approved", True, True, False),
    ("expense_rejected", "Expense Rejected", True, True, False),
    ("training_assigned", "Training Assigned", True, True, False),
    ("training_reminder", "Training Reminder", True, True, False),
    ("training_completed", "Training Completed", True, False, False),
    ("complaint_submitted", "Complaint Submitted", True, True, False),
    ("complaint_assigned", "Complaint Assigned", True, True, False),
    ("complaint_updated", "Complaint Updated", True, False, False),
    ("complaint_resolved", "Complaint Resolved", True, True, False),
    ("approval_pending", "Approval Pending", True, True, True),
    ("approval_completed", "Approval Completed", True, True, False),
    ("approval_delegated", "Approval Delegated", True, True, False),
    ("announcement", "Announcement", True, True, False),
    ("system_alert", "System Alert", True, True, True),
]


class PreferenceService:
    """Service for managing notification preferences."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_preference(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str
    ) -> Optional[NotificationPreference]:
        """Get a specific preference for a user."""
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.tenant_id == tenant_id,
                NotificationPreference.user_id == user_id,
                NotificationPreference.notification_type == notification_type
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create_preference(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str
    ) -> NotificationPreference:
        """Get or create a preference for a notification type."""
        pref = await self.get_preference(tenant_id, user_id, notification_type)
        if pref:
            return pref

        # Find default settings
        defaults = next(
            (d for d in DEFAULT_NOTIFICATION_TYPES if d[0] == notification_type),
            (notification_type, notification_type, True, False, False)
        )

        pref = NotificationPreference(
            tenant_id=tenant_id,
            user_id=user_id,
            notification_type=notification_type,
            in_app_enabled=defaults[2],
            email_enabled=defaults[3],
            push_enabled=defaults[4],
        )
        self.db.add(pref)
        await self.db.commit()
        await self.db.refresh(pref)
        return pref

    async def update_preference(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str,
        data: PreferenceUpdateRequest
    ) -> NotificationPreference:
        """Update a notification preference."""
        pref = await self.get_or_create_preference(
            tenant_id, user_id, notification_type
        )

        if data.in_app_enabled is not None:
            pref.in_app_enabled = data.in_app_enabled
        if data.email_enabled is not None:
            pref.email_enabled = data.email_enabled
        if data.push_enabled is not None:
            pref.push_enabled = data.push_enabled

        await self.db.commit()
        await self.db.refresh(pref)
        return pref

    async def list_preferences(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> PreferenceListResponse:
        """List all preferences for a user, creating defaults if needed."""
        # Get existing preferences
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.tenant_id == tenant_id,
                NotificationPreference.user_id == user_id
            ).order_by(NotificationPreference.notification_type)
        )
        existing = {p.notification_type: p for p in result.scalars().all()}

        # Create missing preferences with defaults
        items = []
        for type_info in DEFAULT_NOTIFICATION_TYPES:
            notification_type = type_info[0]
            if notification_type in existing:
                pref = existing[notification_type]
            else:
                pref = NotificationPreference(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    notification_type=notification_type,
                    in_app_enabled=type_info[2],
                    email_enabled=type_info[3],
                    push_enabled=type_info[4],
                )
                self.db.add(pref)
                existing[notification_type] = pref

            items.append(PreferenceResponse(
                notification_type=pref.notification_type,
                display_name=type_info[1],
                in_app_enabled=pref.in_app_enabled,
                email_enabled=pref.email_enabled,
                push_enabled=pref.push_enabled,
            ))

        await self.db.commit()

        return PreferenceListResponse(items=items)

    async def bulk_update_preferences(
        self,
        tenant_id: UUID,
        user_id: UUID,
        updates: list[PreferenceUpdateRequest]
    ) -> PreferenceListResponse:
        """Bulk update multiple preferences at once."""
        for update in updates:
            if update.notification_type:
                await self.update_preference(
                    tenant_id, user_id, update.notification_type, update
                )

        return await self.list_preferences(tenant_id, user_id)

    async def is_channel_enabled(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str,
        channel: str
    ) -> bool:
        """Check if a specific channel is enabled for a notification type."""
        pref = await self.get_preference(tenant_id, user_id, notification_type)

        if pref:
            if channel == "in_app":
                return pref.in_app_enabled
            elif channel == "email":
                return pref.email_enabled
            elif channel == "push":
                return pref.push_enabled
            return False

        # Use defaults if no preference exists
        defaults = next(
            (d for d in DEFAULT_NOTIFICATION_TYPES if d[0] == notification_type),
            None
        )
        if defaults:
            if channel == "in_app":
                return defaults[2]
            elif channel == "email":
                return defaults[3]
            elif channel == "push":
                return defaults[4]

        return channel == "in_app"  # Default to in-app only

    async def disable_all_emails(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> None:
        """Disable email notifications for all types."""
        await self.list_preferences(tenant_id, user_id)  # Ensure all exist

        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.tenant_id == tenant_id,
                NotificationPreference.user_id == user_id
            )
        )
        for pref in result.scalars().all():
            pref.email_enabled = False

        await self.db.commit()

    async def enable_all_in_app(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> None:
        """Enable in-app notifications for all types."""
        await self.list_preferences(tenant_id, user_id)  # Ensure all exist

        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.tenant_id == tenant_id,
                NotificationPreference.user_id == user_id
            )
        )
        for pref in result.scalars().all():
            pref.in_app_enabled = True

        await self.db.commit()
