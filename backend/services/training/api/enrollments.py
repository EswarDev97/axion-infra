"""
MindFlow Training Service - Enrollment API Routes
Per API_CONTRACT.md Section 8.5.3
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id, get_employee_id
from shared.schemas import APIResponse, PaginationParams

from ..schemas.enrollment import (
    EnrollmentCreateRequest,
    EnrollmentUpdateRequest,
    EnrollmentResponse,
    EnrollmentListResponse,
    EnrollmentFilters,
    BulkEnrollmentRequest,
)
from ..services.enrollment_service import EnrollmentService

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


def _enrollment_to_response(enrollment) -> EnrollmentResponse:
    """Convert Enrollment model to response schema."""
    course_info = None
    if enrollment.course:
        course_info = {
            "id": enrollment.course.id,
            "title": enrollment.course.title,
            "code": enrollment.course.code,
            "is_mandatory": enrollment.course.is_mandatory
        }

    return EnrollmentResponse(
        id=enrollment.id,
        course_id=enrollment.course_id,
        course=course_info,
        employee_id=enrollment.employee_id,
        employee=None,  # Would need employee lookup
        session_id=enrollment.session_id,
        status=enrollment.status,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        due_date=enrollment.due_date,
        progress_percentage=enrollment.progress_percentage,
        is_overdue=enrollment.is_overdue,
        is_completed=enrollment.is_completed,
        tenant_id=enrollment.tenant_id,
        created_at=enrollment.created_at,
        updated_at=enrollment.updated_at,
        created_by=enrollment.created_by
    )


@router.get("", response_model=APIResponse[EnrollmentListResponse])
async def list_enrollments(
    course_id: Optional[UUID] = Query(None, alias="courseId"),
    employee_id: Optional[UUID] = Query(None, alias="employeeId"),
    session_id: Optional[UUID] = Query(None, alias="sessionId"),
    status: Optional[str] = Query(None),
    is_overdue: Optional[bool] = Query(None, alias="isOverdue"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    sort_by: str = Query("enrolled_at", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List enrollments with pagination and filters."""
    service = EnrollmentService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    filters = EnrollmentFilters(
        course_id=course_id,
        employee_id=employee_id,
        session_id=session_id,
        status=status,
        is_overdue=is_overdue
    )

    enrollments, total = await service.list_enrollments(tenant_id, pagination, filters)

    return APIResponse(
        success=True,
        data=EnrollmentListResponse(
            items=[_enrollment_to_response(e) for e in enrollments],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="Enrollments retrieved successfully"
    )


@router.post("", response_model=APIResponse[EnrollmentResponse], status_code=201)
async def create_enrollment(
    request: EnrollmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Create a new enrollment."""
    service = EnrollmentService(db)
    enrollment = await service.create_enrollment(
        tenant_id=tenant_id,
        course_id=request.course_id,
        employee_id=request.employee_id,
        enrolled_by=current_user["id"],
        session_id=request.session_id,
        due_date=request.due_date
    )

    return APIResponse(
        success=True,
        data=_enrollment_to_response(enrollment),
        message="Enrollment created successfully"
    )


@router.post("/bulk", response_model=APIResponse[list], status_code=201)
async def bulk_enroll(
    request: BulkEnrollmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Bulk enroll multiple employees."""
    service = EnrollmentService(db)
    enrollments = await service.bulk_enroll(
        tenant_id=tenant_id,
        course_id=request.course_id,
        employee_ids=request.employee_ids,
        enrolled_by=current_user["id"],
        session_id=request.session_id,
        due_date=request.due_date
    )

    return APIResponse(
        success=True,
        data=[_enrollment_to_response(e) for e in enrollments],
        message=f"{len(enrollments)} employees enrolled successfully"
    )


@router.get("/my-enrollments", response_model=APIResponse[EnrollmentListResponse])
async def get_my_enrollments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id)
):
    """Get my enrollments."""
    service = EnrollmentService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="enrolled_at",
        sort_order="desc"
    )

    enrollments, total = await service.get_my_enrollments(employee_id, tenant_id, pagination)

    return APIResponse(
        success=True,
        data=EnrollmentListResponse(
            items=[_enrollment_to_response(e) for e in enrollments],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="My enrollments retrieved successfully"
    )


@router.get("/{enrollment_id}", response_model=APIResponse[EnrollmentResponse])
async def get_enrollment(
    enrollment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get enrollment by ID."""
    service = EnrollmentService(db)
    enrollment = await service.get_enrollment(enrollment_id, tenant_id)

    return APIResponse(
        success=True,
        data=_enrollment_to_response(enrollment),
        message="Enrollment retrieved successfully"
    )


@router.put("/{enrollment_id}", response_model=APIResponse[EnrollmentResponse])
async def update_enrollment(
    enrollment_id: UUID,
    request: EnrollmentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update enrollment."""
    service = EnrollmentService(db)
    enrollment = await service.update_enrollment(
        enrollment_id=enrollment_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        status=request.status,
        progress_percentage=request.progress_percentage,
        due_date=request.due_date
    )

    return APIResponse(
        success=True,
        data=_enrollment_to_response(enrollment),
        message="Enrollment updated successfully"
    )


@router.delete("/{enrollment_id}", response_model=APIResponse)
async def cancel_enrollment(
    enrollment_id: UUID,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Cancel enrollment (soft delete)."""
    service = EnrollmentService(db)
    await service.cancel_enrollment(
        enrollment_id=enrollment_id,
        tenant_id=tenant_id,
        deleted_by=current_user["id"],
        reason=reason
    )

    return APIResponse(
        success=True,
        data=None,
        message="Enrollment cancelled successfully"
    )
