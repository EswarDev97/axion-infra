"""
MindFlow Training Service - Course API Routes
Per API_CONTRACT.md Section 8.5.1 & 8.5.7
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id
from shared.schemas import APIResponse, PaginationParams

from ..schemas.course import (
    CourseCreateRequest,
    CourseUpdateRequest,
    CourseResponse,
    CourseListResponse,
    CourseFilters,
)
from ..schemas.training_content import (
    TrainingContentCreateRequest,
    TrainingContentUpdateRequest,
    TrainingContentResponse,
)
from ..services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["courses"])


def _course_to_response(course) -> CourseResponse:
    """Convert Course model to response schema."""
    contents = []
    if course.contents:
        contents = [
            {
                "id": c.id,
                "title": c.title,
                "content_type": c.content_type,
                "display_order": c.display_order,
                "duration_minutes": c.duration_minutes,
                "is_mandatory": c.is_mandatory
            }
            for c in course.contents
        ]

    exams = []
    if course.exams:
        exams = [
            {
                "id": e.id,
                "title": e.title,
                "duration_minutes": e.duration_minutes,
                "passing_score": e.passing_score,
                "question_count": e.question_count,
                "is_active": e.is_active
            }
            for e in course.exams
        ]

    return CourseResponse(
        id=course.id,
        title=course.title,
        code=course.code,
        description=course.description,
        objective=course.objective,
        duration_hours=course.duration_hours,
        is_mandatory=course.is_mandatory,
        passing_score=course.passing_score,
        max_attempts=course.max_attempts,
        validity_months=course.validity_months,
        status=course.status,
        category=course.category,
        content_count=course.content_count,
        enrollment_count=course.enrollment_count,
        contents=contents,
        exams=exams,
        tenant_id=course.tenant_id,
        created_at=course.created_at,
        updated_at=course.updated_at,
        created_by=course.created_by
    )


@router.get("", response_model=APIResponse[CourseListResponse])
async def list_courses(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_mandatory: Optional[bool] = Query(None, alias="isMandatory"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    sort_by: str = Query("created_at", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List courses with pagination and filters."""
    service = CourseService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    filters = CourseFilters(
        status=status,
        category=category,
        is_mandatory=is_mandatory,
        search=search
    )

    courses, total = await service.list_courses(tenant_id, pagination, filters)

    return APIResponse(
        success=True,
        data=CourseListResponse(
            items=[_course_to_response(c) for c in courses],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="Courses retrieved successfully"
    )


@router.post("", response_model=APIResponse[CourseResponse], status_code=201)
async def create_course(
    request: CourseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Create a new course."""
    service = CourseService(db)
    course = await service.create_course(
        tenant_id=tenant_id,
        title=request.title,
        code=request.code,
        created_by=current_user["id"],
        description=request.description,
        objective=request.objective,
        duration_hours=request.duration_hours,
        is_mandatory=request.is_mandatory,
        passing_score=request.passing_score,
        max_attempts=request.max_attempts,
        validity_months=request.validity_months,
        category=request.category
    )

    return APIResponse(
        success=True,
        data=_course_to_response(course),
        message="Course created successfully"
    )


@router.get("/{course_id}", response_model=APIResponse[CourseResponse])
async def get_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get course by ID."""
    service = CourseService(db)
    course = await service.get_course(course_id, tenant_id, include_content=True)

    return APIResponse(
        success=True,
        data=_course_to_response(course),
        message="Course retrieved successfully"
    )


@router.put("/{course_id}", response_model=APIResponse[CourseResponse])
async def update_course(
    course_id: UUID,
    request: CourseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update course."""
    service = CourseService(db)
    course = await service.update_course(
        course_id=course_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        title=request.title,
        description=request.description,
        objective=request.objective,
        duration_hours=request.duration_hours,
        is_mandatory=request.is_mandatory,
        passing_score=request.passing_score,
        max_attempts=request.max_attempts,
        validity_months=request.validity_months,
        category=request.category
    )

    return APIResponse(
        success=True,
        data=_course_to_response(course),
        message="Course updated successfully"
    )


@router.delete("/{course_id}", response_model=APIResponse)
async def delete_course(
    course_id: UUID,
    reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Delete course (soft delete)."""
    service = CourseService(db)
    await service.delete_course(
        course_id=course_id,
        tenant_id=tenant_id,
        deleted_by=current_user["id"],
        reason=reason
    )

    return APIResponse(
        success=True,
        data=None,
        message="Course deleted successfully"
    )


@router.post("/{course_id}/publish", response_model=APIResponse[CourseResponse])
async def publish_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Publish a course."""
    service = CourseService(db)
    course = await service.publish_course(
        course_id=course_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"]
    )

    return APIResponse(
        success=True,
        data=_course_to_response(course),
        message="Course published successfully"
    )


@router.post("/{course_id}/archive", response_model=APIResponse[CourseResponse])
async def archive_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Archive a course."""
    service = CourseService(db)
    course = await service.archive_course(
        course_id=course_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"]
    )

    return APIResponse(
        success=True,
        data=_course_to_response(course),
        message="Course archived successfully"
    )


# ==================== Content Endpoints ====================

def _content_to_response(content) -> TrainingContentResponse:
    """Convert TrainingContent model to response schema."""
    return TrainingContentResponse(
        id=content.id,
        course_id=content.course_id,
        title=content.title,
        content_type=content.content_type,
        file_id=content.file_id,
        external_url=content.external_url,
        display_order=content.display_order,
        duration_minutes=content.duration_minutes,
        is_mandatory=content.is_mandatory,
        tenant_id=content.tenant_id,
        created_at=content.created_at,
        updated_at=content.updated_at,
        created_by=content.created_by
    )


@router.get("/{course_id}/content", response_model=APIResponse[list])
async def list_course_content(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List content for a course."""
    service = CourseService(db)
    contents = await service.list_content(course_id, tenant_id)

    return APIResponse(
        success=True,
        data=[_content_to_response(c) for c in contents],
        message="Content retrieved successfully"
    )


@router.post("/{course_id}/content", response_model=APIResponse[TrainingContentResponse], status_code=201)
async def add_course_content(
    course_id: UUID,
    request: TrainingContentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Add content to course."""
    service = CourseService(db)
    content = await service.add_content(
        course_id=course_id,
        tenant_id=tenant_id,
        title=request.title,
        content_type=request.content_type,
        created_by=current_user["id"],
        file_id=request.file_id,
        external_url=request.external_url,
        display_order=request.display_order,
        duration_minutes=request.duration_minutes,
        is_mandatory=request.is_mandatory
    )

    return APIResponse(
        success=True,
        data=_content_to_response(content),
        message="Content added successfully"
    )


@router.get("/content/{content_id}", response_model=APIResponse[TrainingContentResponse])
async def get_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get content by ID."""
    service = CourseService(db)
    content = await service.get_content(content_id, tenant_id)

    return APIResponse(
        success=True,
        data=_content_to_response(content),
        message="Content retrieved successfully"
    )


@router.put("/content/{content_id}", response_model=APIResponse[TrainingContentResponse])
async def update_content(
    content_id: UUID,
    request: TrainingContentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update content."""
    service = CourseService(db)
    content = await service.update_content(
        content_id=content_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        title=request.title,
        content_type=request.content_type,
        file_id=request.file_id,
        external_url=request.external_url,
        display_order=request.display_order,
        duration_minutes=request.duration_minutes,
        is_mandatory=request.is_mandatory
    )

    return APIResponse(
        success=True,
        data=_content_to_response(content),
        message="Content updated successfully"
    )


@router.delete("/content/{content_id}", response_model=APIResponse)
async def delete_content(
    content_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Delete content."""
    service = CourseService(db)
    await service.delete_content(content_id, tenant_id)

    return APIResponse(
        success=True,
        data=None,
        message="Content deleted successfully"
    )
