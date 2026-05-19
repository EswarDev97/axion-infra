"""
MindFlow Notification Service - Preference API Routes
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id

from ..schemas.preference import (
    PreferenceUpdateRequest,
    PreferenceResponse,
    PreferenceListResponse,
    BulkPreferenceUpdateRequest,
)
from ..services.preference_service import PreferenceService

router = APIRouter()


@router.get("", response_model=PreferenceListResponse)
async def list_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """List all notification preferences for the current user."""
    service = PreferenceService(db)
    return await service.list_preferences(tenant_id, current_user["id"])


@router.put("/{notification_type}", response_model=PreferenceResponse)
async def update_preference(
    notification_type: str,
    data: PreferenceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Update a specific notification preference."""
    service = PreferenceService(db)
    pref = await service.update_preference(
        tenant_id, current_user["id"], notification_type, data
    )

    # Get display name
    from ..services.preference_service import DEFAULT_NOTIFICATION_TYPES
    display_name = next(
        (d[1] for d in DEFAULT_NOTIFICATION_TYPES if d[0] == notification_type),
        notification_type
    )

    return PreferenceResponse(
        notification_type=pref.notification_type,
        display_name=display_name,
        in_app_enabled=pref.in_app_enabled,
        email_enabled=pref.email_enabled,
        push_enabled=pref.push_enabled,
    )


@router.put("", response_model=PreferenceListResponse)
async def bulk_update_preferences(
    data: BulkPreferenceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Bulk update multiple notification preferences."""
    service = PreferenceService(db)
    return await service.bulk_update_preferences(
        tenant_id, current_user["id"], data.preferences
    )


@router.post("/disable-all-emails")
async def disable_all_emails(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Disable email notifications for all types."""
    service = PreferenceService(db)
    await service.disable_all_emails(tenant_id, current_user["id"])
    return {"message": "All email notifications disabled"}


@router.post("/enable-all-in-app")
async def enable_all_in_app(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """Enable in-app notifications for all types."""
    service = PreferenceService(db)
    await service.enable_all_in_app(tenant_id, current_user["id"])
    return {"message": "All in-app notifications enabled"}
