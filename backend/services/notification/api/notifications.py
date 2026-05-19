"""
MindFlow Notification Service - Notification API Routes
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id

from ..schemas.notification import (
    NotificationCreateRequest,
    NotificationResponse,
    NotificationListResponse,
    NotificationCountResponse,
    BroadcastRequest,
    MetadataInfo,
)
from ..services.notification_service import NotificationService

router = APIRouter()


def _to_response(notification) -> NotificationResponse:
    """Convert notification model to response schema."""
    metadata = None
    if notification.entity_type or notification.entity_id or notification.action_url:
        metadata = MetadataInfo(
            entity_type=notification.entity_type,
            entity_id=notification.entity_id,
            action_url=notification.action_url,
        )

    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        metadata=metadata,
        priority=notification.priority,
        is_read=notification.is_read,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = Query(None, alias="type"),
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List notifications for the current user."""
    service = NotificationService(db)
    return await service.list(
        tenant_id=tenant_id,
        user_id=current_user["id"],
        page=page,
        limit=limit,
        is_read=is_read,
        notification_type=notification_type,
        priority=priority,
    )


@router.get("/count", response_model=NotificationCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get unread notification count for the current user."""
    service = NotificationService(db)
    count = await service.get_unread_count(tenant_id, current_user["id"])
    return NotificationCountResponse(unread_count=count)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Get a specific notification."""
    service = NotificationService(db)
    notification = await service.get_by_id(
        notification_id, tenant_id, current_user["id"]
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return _to_response(notification)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Mark a notification as read."""
    service = NotificationService(db)
    notification = await service.get_by_id(
        notification_id, tenant_id, current_user["id"]
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification = await service.mark_as_read(notification)
    return _to_response(notification)


@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Mark all notifications as read for the current user."""
    service = NotificationService(db)
    count = await service.mark_all_as_read(tenant_id, current_user["id"])
    return {"marked_count": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Delete a notification."""
    service = NotificationService(db)
    notification = await service.get_by_id(
        notification_id, tenant_id, current_user["id"]
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    await service.delete(notification)


# Admin/Internal endpoints for sending notifications

@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Create a notification (internal/admin use)."""
    service = NotificationService(db)
    notification = await service.create(data, tenant_id)
    return _to_response(notification)


@router.post("/broadcast", response_model=list[NotificationResponse])
async def broadcast_notification(
    data: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Broadcast a notification to multiple users (admin use)."""
    service = NotificationService(db)
    notifications = await service.broadcast_notification(
        tenant_id=tenant_id,
        user_ids=data.user_ids,
        notification_type=data.type,
        title=data.title,
        message=data.message,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        action_url=data.action_url,
        priority=data.priority or "normal",
    )
    return [_to_response(n) for n in notifications]
