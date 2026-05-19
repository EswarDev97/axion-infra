"""
Notification Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- Notification model
- NotificationPreference model
"""

import pytest
from datetime import datetime
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestNotificationModel:
    """Tests for Notification model."""

    async def test_notification_creation(self, db_session, test_tenant, test_user):
        """Test notification creation."""
        from services.notification.models.notification import Notification

        notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            type="TASK_ASSIGNED",
            title="New Task Assigned",
            message="You have been assigned a new task: Review Q1 Report",
            entity_type="TASK",
            entity_id=uuid4(),
            action_url="/tasks/view/123",
            priority="NORMAL",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.id is not None
        assert notification.type == "TASK_ASSIGNED"
        assert notification.title == "New Task Assigned"
        assert notification.is_read is False
        assert notification.read_at is None

    async def test_notification_types(self, db_session, test_tenant, test_user):
        """Test various notification types."""
        from services.notification.models.notification import (
            Notification,
            NOTIFICATION_TYPE_TASK_ASSIGNED,
            NOTIFICATION_TYPE_TASK_COMPLETED,
            NOTIFICATION_TYPE_TASK_COMMENT,
            NOTIFICATION_TYPE_LEAVE_APPROVED,
            NOTIFICATION_TYPE_LEAVE_REJECTED,
            NOTIFICATION_TYPE_EXPENSE_APPROVED,
            NOTIFICATION_TYPE_EXPENSE_REJECTED,
            NOTIFICATION_TYPE_COMPLAINT_CREATED,
            NOTIFICATION_TYPE_COMPLAINT_ASSIGNED,
            NOTIFICATION_TYPE_COMPLAINT_ESCALATED,
            NOTIFICATION_TYPE_COMPLAINT_RESOLVED,
            NOTIFICATION_TYPE_APPROVAL_REQUIRED,
            NOTIFICATION_TYPE_APPROVAL_COMPLETED,
            NOTIFICATION_TYPE_TRAINING_ENROLLED,
            NOTIFICATION_TYPE_TRAINING_COMPLETED,
            NOTIFICATION_TYPE_CERTIFICATE_EXPIRING,
            NOTIFICATION_TYPE_SYSTEM,
        )

        notification_types = [
            NOTIFICATION_TYPE_TASK_ASSIGNED,
            NOTIFICATION_TYPE_TASK_COMPLETED,
            NOTIFICATION_TYPE_TASK_COMMENT,
            NOTIFICATION_TYPE_LEAVE_APPROVED,
            NOTIFICATION_TYPE_LEAVE_REJECTED,
            NOTIFICATION_TYPE_EXPENSE_APPROVED,
            NOTIFICATION_TYPE_EXPENSE_REJECTED,
            NOTIFICATION_TYPE_COMPLAINT_CREATED,
            NOTIFICATION_TYPE_COMPLAINT_ASSIGNED,
            NOTIFICATION_TYPE_COMPLAINT_ESCALATED,
            NOTIFICATION_TYPE_COMPLAINT_RESOLVED,
            NOTIFICATION_TYPE_APPROVAL_REQUIRED,
            NOTIFICATION_TYPE_APPROVAL_COMPLETED,
            NOTIFICATION_TYPE_TRAINING_ENROLLED,
            NOTIFICATION_TYPE_TRAINING_COMPLETED,
            NOTIFICATION_TYPE_CERTIFICATE_EXPIRING,
            NOTIFICATION_TYPE_SYSTEM,
        ]

        for notif_type in notification_types:
            notification = Notification(
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                type=notif_type,
                title=f"Test {notif_type}",
                message="Test message",
            )
            db_session.add(notification)
            await db_session.commit()
            await db_session.refresh(notification)
            assert notification.type == notif_type

    async def test_notification_priority_values(self, db_session, test_tenant, test_user):
        """Test notification priority values."""
        from services.notification.models.notification import (
            Notification,
            PRIORITY_LOW,
            PRIORITY_NORMAL,
            PRIORITY_HIGH,
            PRIORITY_URGENT,
        )

        priorities = [PRIORITY_LOW, PRIORITY_NORMAL, PRIORITY_HIGH, PRIORITY_URGENT]

        for priority in priorities:
            notification = Notification(
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                type="SYSTEM",
                title="Priority Test",
                message="Test message",
                priority=priority,
            )
            db_session.add(notification)
            await db_session.commit()
            await db_session.refresh(notification)
            assert notification.priority == priority

    async def test_notification_mark_as_read(self, db_session, test_tenant, test_user):
        """Test marking notification as read."""
        from services.notification.models.notification import Notification

        notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            type="TASK_ASSIGNED",
            title="Test",
            message="Test message",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.is_read is False
        assert notification.read_at is None

        # Mark as read
        notification.mark_as_read()
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.is_read is True
        assert notification.read_at is not None

    async def test_notification_with_entity_reference(
        self, db_session, test_tenant, test_user
    ):
        """Test notification with entity reference."""
        from services.notification.models.notification import Notification

        entity_id = uuid4()
        notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            type="LEAVE_APPROVED",
            title="Leave Request Approved",
            message="Your leave request has been approved",
            entity_type="LEAVE_REQUEST",
            entity_id=entity_id,
            action_url=f"/leave/requests/{entity_id}",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.entity_type == "LEAVE_REQUEST"
        assert notification.entity_id == entity_id
        assert notification.action_url == f"/leave/requests/{entity_id}"

    async def test_notification_without_entity_reference(
        self, db_session, test_tenant, test_user
    ):
        """Test notification without entity reference (system notification)."""
        from services.notification.models.notification import Notification

        notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            type="SYSTEM",
            title="System Maintenance",
            message="System maintenance scheduled for tonight",
            priority="HIGH",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        assert notification.entity_type is None
        assert notification.entity_id is None
        assert notification.action_url is None

    async def test_notification_created_at_immutable(
        self, db_session, test_tenant, test_user
    ):
        """Test that created_at is set automatically and immutable."""
        from services.notification.models.notification import Notification

        before = datetime.utcnow()
        notification = Notification(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            type="TASK_ASSIGNED",
            title="Test",
            message="Test message",
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)
        after = datetime.utcnow()

        assert notification.created_at is not None
        assert before <= notification.created_at <= after


class TestNotificationPreferenceModel:
    """Tests for NotificationPreference model."""

    async def test_preference_creation(self, db_session, test_tenant, test_user):
        """Test notification preference creation."""
        from services.notification.models.preference import NotificationPreference

        preference = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="TASK_ASSIGNED",
            channel="EMAIL",
            is_enabled=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(preference)
        await db_session.commit()
        await db_session.refresh(preference)

        assert preference.id is not None
        assert preference.notification_type == "TASK_ASSIGNED"
        assert preference.channel == "EMAIL"
        assert preference.is_enabled is True

    async def test_preference_channels(self, db_session, test_tenant, test_user):
        """Test different notification channels."""
        from services.notification.models.preference import NotificationPreference

        channels = ["EMAIL", "IN_APP", "SMS", "PUSH"]

        for i, channel in enumerate(channels):
            preference = NotificationPreference(
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                notification_type=f"TYPE_{i}",
                channel=channel,
                is_enabled=True,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(preference)
            await db_session.commit()
            await db_session.refresh(preference)
            assert preference.channel == channel

    async def test_preference_disable(self, db_session, test_tenant, test_user):
        """Test disabling notification preference."""
        from services.notification.models.preference import NotificationPreference

        preference = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="LEAVE_APPROVED",
            channel="EMAIL",
            is_enabled=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(preference)
        await db_session.commit()

        # Disable
        preference.is_enabled = False
        await db_session.commit()
        await db_session.refresh(preference)

        assert preference.is_enabled is False

    async def test_preference_unique_per_user_type_channel(
        self, db_session, test_tenant, test_user
    ):
        """Test unique constraint on user + type + channel."""
        from services.notification.models.preference import NotificationPreference
        from sqlalchemy.exc import IntegrityError

        pref1 = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="TASK_ASSIGNED",
            channel="EMAIL",
            is_enabled=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(pref1)
        await db_session.commit()

        pref2 = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="TASK_ASSIGNED",  # Same type
            channel="EMAIL",  # Same channel
            is_enabled=False,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(pref2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_multiple_preferences_per_notification_type(
        self, db_session, test_tenant, test_user
    ):
        """Test user can have different channel preferences for same type."""
        from services.notification.models.preference import NotificationPreference

        # Email preference
        email_pref = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="EXPENSE_APPROVED",
            channel="EMAIL",
            is_enabled=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # In-app preference
        app_pref = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="EXPENSE_APPROVED",
            channel="IN_APP",
            is_enabled=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # SMS preference (disabled)
        sms_pref = NotificationPreference(
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            notification_type="EXPENSE_APPROVED",
            channel="SMS",
            is_enabled=False,
            created_by=test_user.id,
            updated_by=test_user.id,
        )

        db_session.add_all([email_pref, app_pref, sms_pref])
        await db_session.commit()

        # Query preferences
        from sqlalchemy import select

        stmt = select(NotificationPreference).where(
            NotificationPreference.user_id == test_user.id,
            NotificationPreference.notification_type == "EXPENSE_APPROVED",
        )
        result = await db_session.execute(stmt)
        preferences = result.scalars().all()

        assert len(preferences) == 3
        enabled_channels = [p.channel for p in preferences if p.is_enabled]
        assert "EMAIL" in enabled_channels
        assert "IN_APP" in enabled_channels
        assert "SMS" not in enabled_channels


class TestNotificationBulkOperations:
    """Tests for bulk notification operations."""

    async def test_create_multiple_notifications(
        self, db_session, test_tenant, test_user
    ):
        """Test creating multiple notifications at once."""
        from services.notification.models.notification import Notification

        notifications = []
        for i in range(10):
            notification = Notification(
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                type="TASK_ASSIGNED",
                title=f"Task {i+1}",
                message=f"You have been assigned task {i+1}",
            )
            notifications.append(notification)

        db_session.add_all(notifications)
        await db_session.commit()

        # Verify all created
        from sqlalchemy import select, func

        stmt = select(func.count()).select_from(Notification).where(
            Notification.user_id == test_user.id
        )
        result = await db_session.execute(stmt)
        count = result.scalar()

        assert count >= 10

    async def test_mark_all_as_read(self, db_session, test_tenant, test_user):
        """Test marking multiple notifications as read."""
        from services.notification.models.notification import Notification
        from sqlalchemy import select, update

        # Create unread notifications
        for i in range(5):
            notification = Notification(
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                type="SYSTEM",
                title=f"Notification {i+1}",
                message="Test message",
            )
            db_session.add(notification)

        await db_session.commit()

        # Bulk mark as read
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == test_user.id,
                Notification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await db_session.execute(stmt)
        await db_session.commit()

        # Verify all read
        stmt = select(Notification).where(
            Notification.user_id == test_user.id,
            Notification.is_read == False,
        )
        result = await db_session.execute(stmt)
        unread = result.scalars().all()

        assert len(unread) == 0
