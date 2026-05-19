"""
MindFlow HR Service - Attendance Endpoints
Per API_CONTRACT.md Section 8.2.5

Enhanced with:
- GET /me/today - today's status for current user
- GET /me - own attendance history
- GET /team - manager's team attendance
- GET/PUT /config - attendance configuration
- POST /mark-absent - mark absent for a date
- Role-based data filtering
"""

import csv
import io
from datetime import date
from typing import Annotated, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import StreamingResponse

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_pagination_params,
    require_any_permission,
    require_permission,
    get_current_user,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceRecordResponse,
    AttendanceListResponse,
    AttendanceBulkImportRequest,
    AttendanceReportResponse,
    AttendanceConfigResponse,
    AttendanceConfigUpdateRequest,
    AttendanceCorrectionRequest,
    TeamTodayStatusResponse,
    DashboardStatsResponse,
    MarkAbsentRequest,
)
from ..schemas.attendance import AttendanceBulkImportResult
from ..services import AttendanceService, EmployeeService

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _attendance_to_response(record) -> AttendanceRecordResponse:
    """Convert AttendanceRecord model to AttendanceRecordResponse schema."""
    return AttendanceRecordResponse(
        id=record.id,
        employeeId=record.employee_id,
        employeeName=record.employee.full_name if record.employee else "",
        date=record.date,
        checkIn=record.check_in,
        checkOut=record.check_out,
        workHours=record.work_hours,
        overtimeHours=getattr(record, "overtime_hours", None),
        status=record.status,
        notes=record.notes,
        tenantId=record.tenant_id,
        createdAt=record.created_at,
        updatedAt=record.updated_at
    )


# ============================================================================
# Self-service endpoints (any authenticated user)
# IMPORTANT: /me routes must be registered BEFORE /{record_id} to avoid
# FastAPI interpreting "me" as a UUID path parameter.
# ============================================================================


@router.get("/me/today", response_model=ApiResponse[AttendanceRecordResponse])
async def get_today_status(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get today's attendance status for the logged-in user."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        employee = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )
        if not employee:
            return ApiResponse(
                success=True,
                data=None,
                message="No employee record found",
                requestId=request_id
            )

        record = await att_service.get_today_status(
            user.tenant_id, employee.id
        )

        return ApiResponse(
            success=True,
            data=_attendance_to_response(record) if record else None,
            message="Today status retrieved",
            requestId=request_id
        )


@router.get("/me", response_model=ApiResponse[List[AttendanceRecordResponse]])
async def get_my_attendance(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get attendance history for the logged-in user."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        employee = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )
        if not employee:
            return ApiResponse(
                success=True,
                data=[],
                message="No employee record found",
                requestId=request_id
            )

        records = await att_service.get_my_attendance(
            user.tenant_id, employee.id, start_date, end_date
        )

        items = [_attendance_to_response(r) for r in records]
        return ApiResponse(
            success=True,
            data=items,
            message="My attendance retrieved",
            requestId=request_id
        )


# ============================================================================
# Check In / Check Out (any authenticated user)
# ============================================================================


@router.post("/check-in", response_model=ApiResponse[AttendanceRecordResponse])
async def check_in(
    body: AttendanceCheckInRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Record check-in."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        employee_id = body.employee_id
        if not employee_id:
            employee = await emp_service.get_employee_by_user_id(
                user.user_id, user.tenant_id
            )
            if employee:
                employee_id = employee.id
            else:
                from shared.exceptions import BusinessRuleViolationException
                raise BusinessRuleViolationException(
                    "No employee record found for current user"
                )

        record = await att_service.check_in(
            user.tenant_id, employee_id, body.notes,
            actor_user_id=user.user_id,
        )

        return ApiResponse(
            success=True,
            data=_attendance_to_response(record),
            message="Check-in recorded successfully",
            requestId=request_id
        )


@router.post("/check-out", response_model=ApiResponse[AttendanceRecordResponse])
async def check_out(
    body: AttendanceCheckOutRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Record check-out."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        employee_id = body.employee_id
        if not employee_id:
            employee = await emp_service.get_employee_by_user_id(
                user.user_id, user.tenant_id
            )
            if employee:
                employee_id = employee.id
            else:
                from shared.exceptions import BusinessRuleViolationException
                raise BusinessRuleViolationException(
                    "No employee record found for current user"
                )

        record = await att_service.check_out(
            user.tenant_id, employee_id, body.notes,
            actor_user_id=user.user_id,
        )

        return ApiResponse(
            success=True,
            data=_attendance_to_response(record),
            message="Check-out recorded successfully",
            requestId=request_id
        )


# ============================================================================
# Dashboard Stats (authenticated users with hr:read:all)
# ============================================================================


@router.get("/dashboard-stats", response_model=ApiResponse[DashboardStatsResponse])
async def get_dashboard_stats(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get today's attendance dashboard statistics."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        stats = await service.get_dashboard_stats(user.tenant_id)

        return ApiResponse(
            success=True,
            data=DashboardStatsResponse(
                totalEmployees=stats["total_employees"],
                presentToday=stats["present_today"],
                absentToday=stats["absent_today"],
                lateToday=stats["late_today"],
                onLeaveToday=stats["on_leave_today"],
                attendancePercentage=stats["attendance_percentage"],
            ),
            message="Dashboard stats retrieved",
            requestId=request_id
        )


# ============================================================================
# Team attendance (Manager view)
# ============================================================================


@router.get("/team", response_model=ApiResponse[AttendanceListResponse])
async def list_team_attendance(
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    employee_id: UUID | None = Query(None, alias="employeeId"),
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    status: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List attendance for manager's team (direct reports)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        # Resolve the manager's employee record
        manager = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )

        if not manager:
            # No employee record — return empty
            result = AttendanceListResponse(
                items=[],
                pagination=PaginationMeta(
                    page=1, pageSize=pagination.page_size,
                    totalItems=0, totalPages=0,
                    hasNext=False, hasPrevious=False,
                )
            )
            return ApiResponse(success=True, data=result, message="No team found", requestId=request_id)

        records, total = await att_service.list_team_attendance(
            user.tenant_id, manager.id, pagination,
            start_date, end_date, status, employee_id,
        )

        items = [_attendance_to_response(r) for r in records]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = AttendanceListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Team attendance retrieved",
            requestId=request_id
        )


# ============================================================================
# Team Today Status (Manager view)
# ============================================================================


@router.get("/team/today", response_model=ApiResponse[List[TeamTodayStatusResponse]])
async def get_team_today_status(
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get today's attendance status for all team members."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        emp_service = EmployeeService(db)
        att_service = AttendanceService(db)

        manager = await emp_service.get_employee_by_user_id(
            user.user_id, user.tenant_id
        )
        if not manager:
            return ApiResponse(success=True, data=[], message="No team found", requestId=request_id)

        statuses = await att_service.get_team_today_status(
            user.tenant_id, manager.id
        )

        items = [
            TeamTodayStatusResponse(
                employeeId=s["employee_id"],
                employeeName=s["employee_name"],
                employeeCode=s["employee_code"],
                departmentName=s["department_name"],
                status=s["status"],
                checkIn=s["check_in"],
                checkOut=s["check_out"],
                workHours=s["work_hours"],
            )
            for s in statuses
        ]

        return ApiResponse(
            success=True,
            data=items,
            message="Team today status retrieved",
            requestId=request_id
        )


# ============================================================================
# All attendance (HR Admin / Super Admin)
# ============================================================================


@router.get("", response_model=ApiResponse[AttendanceListResponse])
async def list_attendance(
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    employee_id: UUID | None = Query(None, alias="employeeId"),
    department_id: UUID | None = Query(None, alias="departmentId"),
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    status: str | None = Query(None),
    x_request_id: Annotated[str | None, Header()] = None
):
    """List all attendance records. HR/Admin see all; Manager sees only team."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        att_service = AttendanceService(db)
        emp_service = EmployeeService(db)

        # Role-based filtering: if user only has hr:read:subordinates (not hr:read:all),
        # restrict to their team
        if not user.is_super_admin() and not user.has_permission("hr:read:all"):
            manager = await emp_service.get_employee_by_user_id(
                user.user_id, user.tenant_id
            )
            if manager:
                records, total = await att_service.list_team_attendance(
                    user.tenant_id, manager.id, pagination,
                    start_date, end_date, status, employee_id,
                )
            else:
                records, total = [], 0
        else:
            # If department_id filter provided, filter by employees in that department
            effective_employee_id = employee_id
            if department_id and not employee_id:
                # We pass employee_id=None and handle department filtering in the query
                # For simplicity, get employee IDs for department first
                from sqlalchemy import select as sa_select
                from ..models import Employee
                dept_emp_stmt = sa_select(Employee.id).where(
                    Employee.department_id == department_id,
                    Employee.tenant_id == user.tenant_id,
                    Employee.is_deleted == False,
                )
                dept_result = await db.execute(dept_emp_stmt)
                dept_employee_ids = [row[0] for row in dept_result.fetchall()]

                if not dept_employee_ids:
                    records, total = [], 0
                else:
                    # Use list_attendance with custom filtering
                    from sqlalchemy import select as sa_select
                    from ..models import AttendanceRecord
                    from sqlalchemy.orm import selectinload as si
                    from sqlalchemy import func as sa_func

                    base_q = sa_select(AttendanceRecord).where(
                        AttendanceRecord.tenant_id == user.tenant_id,
                        AttendanceRecord.employee_id.in_(dept_employee_ids),
                    )
                    if start_date:
                        base_q = base_q.where(AttendanceRecord.date >= start_date)
                    if end_date:
                        base_q = base_q.where(AttendanceRecord.date <= end_date)
                    if status:
                        base_q = base_q.where(AttendanceRecord.status == status)

                    count_stmt = sa_select(sa_func.count()).select_from(base_q.subquery())
                    cnt_result = await db.execute(count_stmt)
                    total = cnt_result.scalar() or 0

                    stmt = base_q.options(si(AttendanceRecord.employee)).offset(
                        pagination.offset
                    ).limit(pagination.page_size).order_by(AttendanceRecord.date.desc())
                    res = await db.execute(stmt)
                    records = list(res.scalars().all())
            else:
                records, total = await att_service.list_attendance(
                    user.tenant_id, pagination,
                    effective_employee_id, start_date, end_date, status,
                )

        items = [_attendance_to_response(r) for r in records]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = AttendanceListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Attendance records retrieved successfully",
            requestId=request_id
        )


@router.get("/report", response_model=ApiResponse[AttendanceReportResponse])
async def get_attendance_report(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    department_id: UUID | None = Query(None, alias="departmentId"),
    employee_id: UUID | None = Query(None, alias="employeeId"),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Generate attendance report."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        result = await service.generate_report(
            user.tenant_id, start_date, end_date, department_id, employee_id
        )

        return ApiResponse(
            success=True,
            data=AttendanceReportResponse(
                startDate=result["start_date"],
                endDate=result["end_date"],
                totalEmployees=result["total_employees"],
                summary=result["summary"]
            ),
            message="Attendance report generated successfully",
            requestId=request_id
        )


# ============================================================================
# CSV Export (HR Admin) — must be before /{record_id} to avoid path conflict
# ============================================================================


@router.get("/export/csv")
async def export_attendance_csv(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    department_id: UUID | None = Query(None, alias="departmentId"),
    employee_id: UUID | None = Query(None, alias="employeeId"),
):
    """Export attendance records as CSV."""
    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        rows = await service.export_attendance_csv(
            user.tenant_id, start_date, end_date, department_id, employee_id
        )

    if not rows:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Employee Code", "Employee Name", "Check In",
                         "Check Out", "Work Hours", "Overtime Hours", "Status", "Notes"])
        output.seek(0)
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        output.seek(0)

    filename = f"attendance_{start_date}_{end_date}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================================================
# Single record + Correction — /{record_id} routes last (path param catch-all)
# ============================================================================


@router.get("/{record_id}", response_model=ApiResponse[AttendanceRecordResponse])
async def get_attendance_record(
    record_id: UUID,
    user: Annotated[CurrentUser, Depends(require_any_permission(["hr:read:all", "hr:read:subordinates"]))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get attendance record by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        record = await service.get_attendance_record(record_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_attendance_to_response(record),
            message="Attendance record retrieved successfully",
            requestId=request_id
        )


@router.put("/{record_id}", response_model=ApiResponse[AttendanceRecordResponse])
async def correct_attendance_record(
    record_id: UUID,
    body: AttendanceCorrectionRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    request: Request,
    x_request_id: Annotated[str | None, Header()] = None
):
    """Correct an attendance record (HR Admin only)."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        record = await service.correct_attendance(
            record_id=record_id,
            tenant_id=user.tenant_id,
            check_in=body.check_in,
            check_out=body.check_out,
            status=body.status,
            notes=body.notes,
            actor_user_id=user.user_id,
        )

        return ApiResponse(
            success=True,
            data=_attendance_to_response(record),
            message="Attendance record corrected successfully",
            requestId=request_id
        )


# ============================================================================
# Bulk Import (HR Admin)
# ============================================================================


@router.post("/bulk-import", response_model=ApiResponse[AttendanceBulkImportResult])
async def bulk_import(
    body: AttendanceBulkImportRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Bulk import attendance records."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        result = await service.bulk_import(user.tenant_id, body.records)

        return ApiResponse(
            success=True,
            data=AttendanceBulkImportResult(**result),
            message=f"Imported {result['successful']} of {result['total']} records",
            requestId=request_id
        )


# ============================================================================
# Mark Absent (HR Admin)
# ============================================================================


@router.post("/mark-absent", response_model=ApiResponse)
async def mark_absent(
    body: MarkAbsentRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:create:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Mark absent for all employees without attendance on a given date."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        result = await service.mark_absent(
            user.tenant_id, body.target_date, actor_user_id=user.user_id
        )

        return ApiResponse(
            success=True,
            data=result,
            message=f"Marked {result['marked']} employees absent",
            requestId=request_id
        )


# ============================================================================
# Attendance Configuration (HR Admin / Super Admin)
# ============================================================================


@router.get("/config", response_model=ApiResponse[AttendanceConfigResponse])
async def get_attendance_config(
    user: Annotated[CurrentUser, Depends(require_permission("hr:read:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get attendance configuration for the tenant."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        config = await service.get_or_create_config(user.tenant_id)

        return ApiResponse(
            success=True,
            data=AttendanceConfigResponse(
                id=config.id,
                tenantId=config.tenant_id,
                officeStartTime=config.office_start_time.strftime("%H:%M"),
                officeEndTime=config.office_end_time.strftime("%H:%M"),
                gracePeriodMinutes=config.grace_period_minutes,
                minWorkHours=config.min_work_hours,
                halfDayHours=config.half_day_hours,
                createdAt=config.created_at,
                updatedAt=config.updated_at,
            ),
            message="Attendance config retrieved",
            requestId=request_id
        )


@router.put("/config", response_model=ApiResponse[AttendanceConfigResponse])
async def update_attendance_config(
    body: AttendanceConfigUpdateRequest,
    user: Annotated[CurrentUser, Depends(require_permission("hr:update:all"))],
    x_request_id: Annotated[str | None, Header()] = None
):
    """Update attendance configuration for the tenant."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = AttendanceService(db)
        config = await service.update_config(
            tenant_id=user.tenant_id,
            office_start_time=body.office_start_time,
            office_end_time=body.office_end_time,
            grace_period_minutes=body.grace_period_minutes,
            min_work_hours=body.min_work_hours,
            half_day_hours=body.half_day_hours,
        )

        return ApiResponse(
            success=True,
            data=AttendanceConfigResponse(
                id=config.id,
                tenantId=config.tenant_id,
                officeStartTime=config.office_start_time.strftime("%H:%M"),
                officeEndTime=config.office_end_time.strftime("%H:%M"),
                gracePeriodMinutes=config.grace_period_minutes,
                minWorkHours=config.min_work_hours,
                halfDayHours=config.half_day_hours,
                createdAt=config.created_at,
                updatedAt=config.updated_at,
            ),
            message="Attendance config updated",
            requestId=request_id
        )
