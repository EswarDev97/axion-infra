"""
MindFlow Training Service - Exam API Routes
Per API_CONTRACT.md Section 8.5.4 & 8.5.5
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.dependencies import get_current_user, get_tenant_id, get_employee_id
from shared.schemas import APIResponse, PaginationParams

from ..schemas.exam import (
    ExamCreateRequest,
    ExamUpdateRequest,
    ExamResponse,
    ExamListResponse,
)
from ..schemas.exam_question import (
    ExamQuestionCreateRequest,
    ExamQuestionUpdateRequest,
    ExamQuestionResponse,
    ExamQuestionForAttempt,
)
from ..schemas.exam_attempt import (
    ExamAttemptStartResponse,
    ExamSubmitRequest,
    ExamAttemptResponse,
    ExamResultResponse,
    ExamAttemptListResponse,
)
from ..services.exam_service import ExamService

router = APIRouter(prefix="/exams", tags=["exams"])


def _exam_to_response(exam) -> ExamResponse:
    """Convert Exam model to response schema."""
    questions = []
    if exam.questions:
        questions = [
            {
                "id": q.id,
                "question_type": q.question_type,
                "question_text": q.question_text,
                "points": q.points,
                "display_order": q.display_order
            }
            for q in exam.questions
        ]

    return ExamResponse(
        id=exam.id,
        course_id=exam.course_id,
        title=exam.title,
        description=exam.description,
        duration_minutes=exam.duration_minutes,
        passing_score=exam.passing_score,
        max_attempts=exam.max_attempts,
        shuffle_questions=exam.shuffle_questions,
        shuffle_options=exam.shuffle_options,
        show_results_immediately=exam.show_results_immediately,
        is_active=exam.is_active,
        question_count=exam.question_count,
        total_points=exam.total_points,
        questions=questions,
        tenant_id=exam.tenant_id,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        created_by=exam.created_by
    )


def _question_to_response(question) -> ExamQuestionResponse:
    """Convert ExamQuestion model to response schema."""
    return ExamQuestionResponse(
        id=question.id,
        exam_id=question.exam_id,
        question_type=question.question_type,
        question_text=question.question_text,
        options=question.options,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        points=question.points,
        display_order=question.display_order,
        tenant_id=question.tenant_id,
        created_at=question.created_at,
        updated_at=question.updated_at,
        created_by=question.created_by
    )


def _attempt_to_response(attempt) -> ExamAttemptResponse:
    """Convert ExamAttempt model to response schema."""
    return ExamAttemptResponse(
        id=attempt.id,
        exam_id=attempt.exam_id,
        exam_title=attempt.exam.title if attempt.exam else None,
        employee_id=attempt.employee_id,
        enrollment_id=attempt.enrollment_id,
        attempt_number=attempt.attempt_number,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        time_spent_seconds=attempt.time_spent_seconds,
        score=attempt.score,
        max_score=attempt.max_score,
        percentage=attempt.percentage,
        status=attempt.status,
        is_passed=attempt.is_passed,
        expires_at=attempt.expires_at,
        tenant_id=attempt.tenant_id,
        created_at=attempt.created_at
    )


@router.get("", response_model=APIResponse[ExamListResponse])
async def list_exams(
    course_id: Optional[UUID] = Query(None, alias="courseId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """List exams with pagination."""
    service = ExamService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="created_at",
        sort_order="desc"
    )

    exams, total = await service.list_exams(tenant_id, pagination, course_id)

    return APIResponse(
        success=True,
        data=ExamListResponse(
            items=[_exam_to_response(e) for e in exams],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="Exams retrieved successfully"
    )


@router.post("", response_model=APIResponse[ExamResponse], status_code=201)
async def create_exam(
    request: ExamCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Create a new exam."""
    service = ExamService(db)
    exam = await service.create_exam(
        tenant_id=tenant_id,
        course_id=request.course_id,
        title=request.title,
        created_by=current_user["id"],
        description=request.description,
        duration_minutes=request.duration_minutes,
        passing_score=request.passing_score,
        max_attempts=request.max_attempts,
        shuffle_questions=request.shuffle_questions,
        shuffle_options=request.shuffle_options,
        show_results_immediately=request.show_results_immediately
    )

    return APIResponse(
        success=True,
        data=_exam_to_response(exam),
        message="Exam created successfully"
    )


@router.get("/{exam_id}", response_model=APIResponse[ExamResponse])
async def get_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get exam by ID."""
    service = ExamService(db)
    exam = await service.get_exam(exam_id, tenant_id, include_questions=True)

    return APIResponse(
        success=True,
        data=_exam_to_response(exam),
        message="Exam retrieved successfully"
    )


@router.put("/{exam_id}", response_model=APIResponse[ExamResponse])
async def update_exam(
    exam_id: UUID,
    request: ExamUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update exam."""
    service = ExamService(db)
    exam = await service.update_exam(
        exam_id=exam_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        title=request.title,
        description=request.description,
        duration_minutes=request.duration_minutes,
        passing_score=request.passing_score,
        max_attempts=request.max_attempts,
        shuffle_questions=request.shuffle_questions,
        shuffle_options=request.shuffle_options,
        show_results_immediately=request.show_results_immediately,
        is_active=request.is_active
    )

    return APIResponse(
        success=True,
        data=_exam_to_response(exam),
        message="Exam updated successfully"
    )


@router.delete("/{exam_id}", response_model=APIResponse)
async def delete_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Delete exam."""
    service = ExamService(db)
    await service.delete_exam(exam_id, tenant_id)

    return APIResponse(
        success=True,
        data=None,
        message="Exam deleted successfully"
    )


# ==================== Question Endpoints ====================

@router.get("/{exam_id}/questions", response_model=APIResponse[List[ExamQuestionResponse]])
async def get_questions(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get all questions for an exam."""
    service = ExamService(db)
    questions = await service.get_questions(exam_id, tenant_id)

    return APIResponse(
        success=True,
        data=[_question_to_response(q) for q in questions],
        message="Questions retrieved successfully"
    )


@router.post("/{exam_id}/questions", response_model=APIResponse[ExamQuestionResponse], status_code=201)
async def add_question(
    exam_id: UUID,
    request: ExamQuestionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Add question to exam."""
    service = ExamService(db)
    question = await service.add_question(
        exam_id=exam_id,
        tenant_id=tenant_id,
        question_type=request.question_type,
        question_text=request.question_text,
        correct_answer=request.correct_answer,
        created_by=current_user["id"],
        options=[o.model_dump() for o in request.options] if request.options else None,
        explanation=request.explanation,
        points=request.points,
        display_order=request.display_order
    )

    return APIResponse(
        success=True,
        data=_question_to_response(question),
        message="Question added successfully"
    )


@router.put("/{exam_id}/questions/{question_id}", response_model=APIResponse[ExamQuestionResponse])
async def update_question(
    exam_id: UUID,
    question_id: UUID,
    request: ExamQuestionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Update exam question."""
    service = ExamService(db)
    question = await service.update_question(
        exam_id=exam_id,
        question_id=question_id,
        tenant_id=tenant_id,
        updated_by=current_user["id"],
        question_type=request.question_type,
        question_text=request.question_text,
        options=[o.model_dump() for o in request.options] if request.options else None,
        correct_answer=request.correct_answer,
        explanation=request.explanation,
        points=request.points,
        display_order=request.display_order
    )

    return APIResponse(
        success=True,
        data=_question_to_response(question),
        message="Question updated successfully"
    )


@router.delete("/{exam_id}/questions/{question_id}", response_model=APIResponse)
async def delete_question(
    exam_id: UUID,
    question_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Delete exam question."""
    service = ExamService(db)
    await service.delete_question(exam_id, question_id, tenant_id)

    return APIResponse(
        success=True,
        data=None,
        message="Question deleted successfully"
    )


# ==================== Exam Attempt Endpoints ====================

@router.post("/{exam_id}/start", response_model=APIResponse[ExamAttemptStartResponse], status_code=201)
async def start_exam(
    exam_id: UUID,
    enrollment_id: UUID = Query(..., alias="enrollmentId"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id)
):
    """Start a new exam attempt."""
    service = ExamService(db)
    attempt, questions = await service.start_attempt(
        exam_id=exam_id,
        employee_id=employee_id,
        enrollment_id=enrollment_id,
        tenant_id=tenant_id
    )

    # Prepare questions for response (without correct answers)
    question_list = [
        ExamQuestionForAttempt(
            id=q.id,
            question_number=i + 1,
            question_type=q.question_type,
            question_text=q.question_text,
            options=q.options,
            points=q.points
        )
        for i, q in enumerate(questions)
    ]

    return APIResponse(
        success=True,
        data=ExamAttemptStartResponse(
            attempt_id=attempt.id,
            exam_id=attempt.exam_id,
            exam_title=attempt.exam.title,
            started_at=attempt.started_at,
            time_limit=attempt.exam.duration_minutes,
            expires_at=attempt.expires_at,
            questions=question_list,
            total_questions=len(question_list),
            total_points=sum(q.points for q in questions)
        ),
        message="Exam started"
    )


@router.get("/attempts/{attempt_id}", response_model=APIResponse[ExamAttemptResponse])
async def get_attempt(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get exam attempt by ID."""
    service = ExamService(db)
    attempt = await service.get_attempt(attempt_id, tenant_id)

    return APIResponse(
        success=True,
        data=_attempt_to_response(attempt),
        message="Attempt retrieved successfully"
    )


@router.post("/attempts/{attempt_id}/submit", response_model=APIResponse[ExamAttemptResponse])
async def submit_attempt(
    attempt_id: UUID,
    request: ExamSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Submit exam attempt with answers."""
    service = ExamService(db)
    answers = [
        {
            "question_id": a.question_id,
            "selected_answer": a.selected_answer
        }
        for a in request.answers
    ]
    attempt = await service.submit_attempt(attempt_id, tenant_id, answers)

    return APIResponse(
        success=True,
        data=_attempt_to_response(attempt),
        message="Exam submitted successfully"
    )


@router.get("/attempts/{attempt_id}/results", response_model=APIResponse[ExamResultResponse])
async def get_attempt_results(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """Get detailed results for an attempt."""
    service = ExamService(db)
    results = await service.get_attempt_results(attempt_id, tenant_id)

    return APIResponse(
        success=True,
        data=ExamResultResponse(**results),
        message="Results retrieved successfully"
    )


@router.get("/my-attempts", response_model=APIResponse[ExamAttemptListResponse])
async def get_my_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    employee_id: UUID = Depends(get_employee_id)
):
    """Get my exam attempts."""
    service = ExamService(db)
    pagination = PaginationParams(
        page=page,
        page_size=page_size,
        sort_by="started_at",
        sort_order="desc"
    )

    attempts, total = await service.get_my_attempts(employee_id, tenant_id, pagination)

    return APIResponse(
        success=True,
        data=ExamAttemptListResponse(
            items=[_attempt_to_response(a) for a in attempts],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size
        ),
        message="My attempts retrieved successfully"
    )
