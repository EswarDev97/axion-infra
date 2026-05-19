"""
MindFlow Notification Service - Notification Service
Business logic for notification management.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification, PRIORITY_NORMAL
from ..schemas.notification import (
    NotificationCreateRequest,
    NotificationResponse,
    NotificationListResponse,
    MetadataInfo,
)


class NotificationService:
    """Service for managing notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        data: NotificationCreateRequest,
        tenant_id: UUID
    ) -> Notification:
        """Create a new notification."""
        notification = Notification(
            tenant_id=tenant_id,
            user_id=data.user_id,
            type=data.type,
            title=data.title,
            message=data.message,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            action_url=data.action_url,
            priority=data.priority or PRIORITY_NORMAL,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_by_id(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Optional[Notification]:
        """Get a notification by ID."""
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.tenant_id == tenant_id
        )
        if user_id:
            query = query.where(Notification.user_id == user_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def mark_as_read(
        self,
        notification: Notification
    ) -> Notification:
        """Mark a notification as read."""
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_as_read(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> int:
        """Mark all notifications as read for a user."""
        result = await self.db.execute(
            update(Notification).where(
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
                Notification.is_read == False
            ).values(
                is_read=True,
                read_at=datetime.utcnow()
            )
        )
        await self.db.commit()
        return result.rowcount

    async def delete(
        self,
        notification: Notification
    ) -> None:
        """Delete a notification."""
        await self.db.delete(notification)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
        is_read: Optional[bool] = None,
        notification_type: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> NotificationListResponse:
        """List notifications with pagination."""
        query = select(Notification).where(
            Notification.tenant_id == tenant_id,
            Notification.user_id == user_id
        )

        if is_read is not None:
            query = query.where(Notification.is_read == is_read)

        if notification_type:
            query = query.where(Notification.type == notification_type)

        if priority:
            query = query.where(Notification.priority == priority)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate (most recent first)
        query = query.order_by(Notification.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        notifications = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        items = []
        for n in notifications:
            metadata = None
            if n.entity_type or n.entity_id or n.action_url:
                metadata = MetadataInfo(
                    entity_type=n.entity_type,
                    entity_id=n.entity_id,
                    action_url=n.action_url,
                )

            items.append(NotificationResponse(
                id=n.id,
                type=n.type,
                title=n.title,
                message=n.message,
                metadata=metadata,
                priority=n.priority,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at,
            ))

        return NotificationListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_unread_count(
        self,
        tenant_id: UUID,
        user_id: UUID
    ) -> int:
        """Get unread notification count for a user."""
        result = await self.db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        )
        return result.scalar() or 0

    async def send_notification(
        self,
        tenant_id: UUID,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        priority: str = PRIORITY_NORMAL
    ) -> Notification:
        """
        Send a notification to a user.
        This is the main entry point for creating notifications from other services.
        """
        data = NotificationCreateRequest(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            priority=priority,
        )
        return await self.create(data, tenant_id)

    async def broadcast_notification(
        self,
        tenant_id: UUID,
        user_ids: List[UUID],
        notification_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        action_url: Optional[str] = None,
        priority: str = PRIORITY_NORMAL
    ) -> List["Notification"]:
        """
        Broadcast a notification to multiple users.
        """
        notifications = []
        for user_id in user_ids:
            notification = await self.send_notification(
                tenant_id=tenant_id,
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                entity_type=entity_type,
                entity_id=entity_id,
                action_url=action_url,
                priority=priority,
            )
            notifications.append(notification)
        return notifications
