"""
MindFlow HR Service - Holiday Endpoints

RBAC:
- GET (list/single): Any authenticated user (view holidays)
- POST/PUT/DELETE: hr:create:all / hr:update:all / hr:delete:all (Super Admin / HR Admin)
- Weekly off config: hr:read:all / hr:update:all
"""

from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_current_user,
    get_pagination_params,
    require_permission,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..models.weekly_off_config import DAY_NAMES
from ..schemas.holiday import (
    HolidayCreateRequest,
    HolidayListResponse,
    HolidayResponse,
    HolidayUpdateRequest,
    WeeklyOffConfigResponse,
    WeeklyOffDayResponse,
    WeeklyOffUpdateRequest,
)
from ..services.holiday_service import HolidayService

router = APIRouter(prefix="/holidays", tags=["holidays"])


def _holiday_to_response(h) -> HolidayResponse:
    return HolidayResponse(
        id=h.id,
        tenantId=h.tenant_id,
        holidayName=h.holiday_name,
        holidayDate=h.holiday_date,
        holidayType=h.holiday_type,
        isRecurring=h.is_recurring,
        description=h.description,
        createdBy=h.created_by,
        createdAt=h.created_at,
        updatedAt=h.updated_at,
    )


# ============================================================================
# Holiday CRUD — View (any authenticated user)
# ============================================================================


@router.get("", response_model=ApiResponse[HolidayListResponse])
async def list_holidays(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    year: int | None = Query(None),
    holiday_type: str | None = Query(None, alias="holidayType"),
    x_request_id: Annotated[str | None, Header()] = None,
):
    """List holidays. Visible to all authenticated users."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        holidays, total = await service.list_holidays(
            user.tenant_id, pagination, year, holiday_type
        )

    items = [_holiday_to_response(h) for h in holidays]
    total_pages = (total + pagination.page_size - 1) // pagination.page_size

    result = HolidayListResponse(
        items=items,
        pagination=PaginationMeta(
            page=pagination.page,
            pageSize=pagination.page_size,
            totalItems=total,
            totalPages=total_pages,
            hasNext=pagination.page < total_pages,
            hasPrevious=pagination.page > 1,
        ),
    )
    return ApiResponse(success=True, data=result, message="Holidays retrieved", requestId=request_id)


# ============================================================================
# Weekly Off Config — MUST be before /{holiday_id} to avoid path conflict
# ============================================================================


@router.get("/weekly-off", response_model=ApiResponse[WeeklyOffConfigResponse])
async def get_weekly_off_config(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get weekly off config. Visible to all authenticated users."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        configs = await service.get_weekly_offs(user.tenant_id)

    days = []
    if configs:
        for cfg in configs:
            days.append(WeeklyOffDayResponse(
                id=cfg.id,
                dayOfWeek=cfg.day_of_week,
                dayName=DAY_NAMES[cfg.day_of_week],
            ))
    else:
        days = [
            WeeklyOffDayResponse(id=uuid4(), dayOfWeek=5, dayName="Saturday"),
            WeeklyOffDayResponse(id=uuid4(), dayOfWeek=6, dayName="Sunday"),
        ]

    return ApiResponse(
        success=True,
        data=WeeklyOffConfigResponse(days=days),
        message="Weekly off config retrieved",
        requestId=request_id,
    )


@router.put("/weekly-off", response_model=ApiResponse[WeeklyOffConfigResponse])
async def update_weekly_off_config(
    body: WeeklyOffUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update weekly off config. Requires hr:update:all."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        configs = await service.set_weekly_offs(user.tenant_id, body.days_of_week)

    days = [
        WeeklyOffDayResponse(
            id=cfg.id,
            dayOfWeek=cfg.day_of_week,
            dayName=DAY_NAMES[cfg.day_of_week],
        )
        for cfg in configs
    ]

    return ApiResponse(
        success=True,
        data=WeeklyOffConfigResponse(days=days),
        message="Weekly off config updated",
        requestId=request_id,
    )


# ============================================================================
# Single holiday — /{holiday_id} routes (path param catch-all, must be last)
# ============================================================================


@router.get("/{holiday_id}", response_model=ApiResponse[HolidayResponse])
async def get_holiday(
    holiday_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Get a single holiday. Visible to all authenticated users."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        holiday = await service.get_holiday(holiday_id, user.tenant_id)

    return ApiResponse(
        success=True,
        data=_holiday_to_response(holiday),
        message="Holiday retrieved",
        requestId=request_id,
    )


# ============================================================================
# Holiday CRUD — Mutate (HR Admin / Super Admin only)
# ============================================================================


@router.post("", response_model=ApiResponse[HolidayResponse], status_code=201)
async def create_holiday(
    body: HolidayCreateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Create a holiday. Requires hr:create:all."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        holiday = await service.create_holiday(
            tenant_id=user.tenant_id,
            holiday_name=body.holiday_name,
            holiday_date=body.holiday_date,
            holiday_type=body.holiday_type,
            is_recurring=body.is_recurring,
            description=body.description,
            created_by=user.user_id,
        )

    return ApiResponse(
        success=True,
        data=_holiday_to_response(holiday),
        message="Holiday created",
        requestId=request_id,
    )


@router.put("/{holiday_id}", response_model=ApiResponse[HolidayResponse])
async def update_holiday(
    holiday_id: UUID,
    body: HolidayUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Update a holiday. Requires hr:update:all."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        holiday = await service.update_holiday(
            holiday_id=holiday_id,
            tenant_id=user.tenant_id,
            holiday_name=body.holiday_name,
            holiday_date=body.holiday_date,
            holiday_type=body.holiday_type,
            is_recurring=body.is_recurring,
            description=body.description,
        )

    return ApiResponse(
        success=True,
        data=_holiday_to_response(holiday),
        message="Holiday updated",
        requestId=request_id,
    )


@router.delete("/{holiday_id}", response_model=ApiResponse)
async def delete_holiday(
    holiday_id: UUID,
    user: Annotated[CurrentUser, Depends(require_permission("hr:delete:all"))],
    x_request_id: Annotated[str | None, Header()] = None,
):
    """Delete a holiday. Requires hr:delete:all."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = HolidayService(db)
        await service.delete_holiday(holiday_id, user.tenant_id)

    return ApiResponse(success=True, data=None, message="Holiday deleted", requestId=request_id)
