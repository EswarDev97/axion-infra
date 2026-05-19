"""
MindFlow Training Service - Session API Routes
Per API_CONTRACT.md Section 8.5.2
"""

from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id
from shared.schemas import APIResponse, PaginationParams

from ..schemas.training_session import (
    TrainingSessionCreateRequest,
    TrainingSessionUpdateRequest,
    TrainingSessionResponse,
    TrainingSessionListResponse,
    TrainingSessionFilters,
)
from ..schemas.attendance import (
    AttendanceMarkRequest,
    AttendanceResponse,
    AttendanceListResponse,
    BulkAttendanceMarkRequest,
)
from ..services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_to_response(session) -> TrainingSessionResponse:
    """Convert TrainingSession model to response schema."""
    course_info = None
    if session.course:
        course_info = {
            "id": session.course.id,
            "title": session.course.title,
            "code": session.course.code
        }

    return TrainingSessionResponse(
        id=session.id,
        course_id=session.course_id,
        course=course_info,
        title=session.title,
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        location=session.location,
        trainer_employee_id=session.trainer_employee_id,
        trainer_name=None,  # Would need employee lookup
        max_participants=session.max_participants,
        participant_count=session.participant_count,
        is_full=session.is_full,
        status=session.status,
        notes=session.notes,
        tenant_id=session.tenant_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        created_by=session.created_by
    )


def _attendance_to_response(attendance) -> AttendanceResponse:
    """Convert TrainingAttendance model to response schema."""
    return AttendanceResponse(
        id=attendance.id,
        session_id=attendance.session_id,
        employee_id=attendance.employee_id,
        employee=None,  # Would need employee lookup
        status=attendance.status,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
        remarks=attendance.remarks,
        marked_by=attendance.marked_by,
        tenant_id=attendance.tenant_id,
        created_at=attendance.created_at,
        updated_at=attendance.updated_at
    )


@router.get("", response_model=APIResponse[TrainingSessionListResponse])
async def list_sessions(
    course_id: Optional[UUID] = Query(None, alias="courseId"),
    status: Optional[str] = Query(None),
    trainer_employee_id: Optional[UUID] = Query(None, alias="trainerEmployeeId"),
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    sort_by: str = Query("session_date", alias="sortBy"),
    sort_order: str = Query("asc", alias="sortOrder"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List training sessions with pagination and filters."""
    service = SessionService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    filters = TrainingSessionFilters(
        course_id=course_id,
        status=status,
        trainer_employee_id=trainer_employee_id,
        start_date=start_date,
        end_date=end_date
    )

    sessions, total = await service.list_sessions(tenant_id, pagination, filters)

    return APIResponse(
        success=True,
        data=TrainingSessionListResponse(
            items=[_session_to_response(s) for s in sessions],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="Sessions retrieved successfully"
    )


@router.post("", response_model=APIResponse[TrainingSessionResponse], status_code=201)
async def create_session(
    request: TrainingSessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Create a new training session."""
    service = SessionService(db)
    session = await service.create_session(
        tenant_id=tenant_id,
        course_id=request.course_id,
        title=request.title,
        session_date=request.session_date,
        start_time=request.start_time,
        end_time=request.end_time,
        created_by=current_user["id"],
        location=request.location,
        trainer_employee_id=request.trainer_employee_id,
        max_participants=request.max_participants,
        notes=request.notes
    )

    return APIResponse(
        success=True,
        data=_session_to_response(session),
        message="Session created successfully"
    )


@router.get("/{session_id}", response_model=APIResponse[TrainingSessionResponse])
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get session by ID."""
    service = SessionService(db)
    session = await service.get_session(session_id, tenant_id)

    return APIResponse(
        success=True,
        data=_session_to_response(session),
        message="Session retrieved successfully"
    )


@router.put("/{session_id}", response_model=APIResponse[TrainingSessionResponse])
async def update_session(
    session_id: UUID,
    request: TrainingSessionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update session."""
    service = SessionService(db)
    session = await service.update_session(
        session_id=session_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        title=request.title,
        session_date=request.session_date,
        start_time=request.start_time,
        end_time=request.end_time,
        location=request.location,
        trainer_employee_id=request.trainer_employee_id,
        max_participants=request.max_participants,
        status=request.status,
        notes=request.notes
    )

    return APIResponse(
        success=True,
        data=_session_to_response(session),
        message="Session updated successfully"
    )


@router.delete("/{session_id}", response_model=APIResponse)
async def cancel_session(
    session_id: UUID,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Cancel session (soft delete)."""
    service = SessionService(db)
    await service.cancel_session(
        session_id=session_id,
        tenant_id=tenant_id,
        deleted_by=current_user["id"],
        reason=reason
    )

    return APIResponse(
        success=True,
        data=None,
        message="Session cancelled successfully"
    )


# ==================== Attendance Endpoints ====================

@router.get("/{session_id}/attendance", response_model=APIResponse[List[AttendanceResponse]])
async def get_attendance(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get attendance for a session."""
    service = SessionService(db)
    attendances = await service.get_attendance(session_id, tenant_id)

    return APIResponse(
        success=True,
        data=[_attendance_to_response(a) for a in attendances],
        message="Attendance retrieved successfully"
    )


@router.post("/{session_id}/attendance", response_model=APIResponse[AttendanceResponse], status_code=201)
async def mark_attendance(
    session_id: UUID,
    request: AttendanceMarkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Mark attendance for an employee."""
    service = SessionService(db)
    attendance = await service.mark_attendance(
        session_id=session_id,
        employee_id=request.employee_id,
        tenant_id=tenant_id,
        marked_by=current_user["id"],
        status=request.status,
        check_in_time=request.check_in_time,
        check_out_time=request.check_out_time,
        remarks=request.remarks
    )

    return APIResponse(
        success=True,
        data=_attendance_to_response(attendance),
        message="Attendance marked successfully"
    )


@router.post("/{session_id}/attendance/bulk", response_model=APIResponse[List[AttendanceResponse]])
async def bulk_mark_attendance(
    session_id: UUID,
    request: BulkAttendanceMarkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Mark attendance for multiple employees."""
    service = SessionService(db)
    attendances_data = [
        {
            "employee_id": a.employee_id,
            "status": a.status,
            "check_in_time": a.check_in_time,
            "check_out_time": a.check_out_time,
            "remarks": a.remarks
        }
        for a in request.attendances
    ]
    attendances = await service.bulk_mark_attendance(
        session_id=session_id,
        tenant_id=tenant_id,
        marked_by=current_user["id"],
        attendances=attendances_data
    )

    return APIResponse(
        success=True,
        data=[_attendance_to_response(a) for a in attendances],
        message="Attendance marked successfully"
    )
