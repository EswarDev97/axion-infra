"""
MindFlow Training Service - Exam Business Logic
Per API_CONTRACT.md Section 8.5.4 & 8.5.5
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
import random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import (
    Course,
    Exam,
    ExamQuestion,
    ExamAttempt,
    ExamResponse,
    Enrollment,
)


class ExamService:
    """Exam management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Exam CRUD ====================

    async def create_exam(
        self,
        tenant_id: UUID,
        course_id: UUID,
        title: str,
        created_by: UUID,
        description: Optional[str] = None,
        duration_minutes: int = 60,
        passing_score: int = 70,
        max_attempts: int = 3,
        shuffle_questions: bool = True,
        shuffle_options: bool = True,
        show_results_immediately: bool = True
    ) -> Exam:
        """Create a new exam."""
        # Validate course exists
        stmt = select(Course).where(
            Course.id == course_id,
            Course.tenant_id == tenant_id,
            Course.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Course", str(course_id))

        exam = Exam(
            tenant_id=tenant_id,
            course_id=course_id,
            title=title,
            description=description,
            duration_minutes=duration_minutes,
            passing_score=passing_score,
            max_attempts=max_attempts,
            shuffle_questions=shuffle_questions,
            shuffle_options=shuffle_options,
            show_results_immediately=show_results_immediately,
            is_active=True,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(exam)
        await self.db.commit()
        await self.db.refresh(exam)

        return exam

    async def get_exam(
        self,
        exam_id: UUID,
        tenant_id: UUID,
        include_questions: bool = False
    ) -> Exam:
        """Get exam by ID."""
        stmt = select(Exam).where(
            Exam.id == exam_id,
            Exam.tenant_id == tenant_id
        )
        if include_questions:
            stmt = stmt.options(selectinload(Exam.questions))

        result = await self.db.execute(stmt)
        exam = result.scalar_one_or_none()

        if not exam:
            raise ResourceNotFoundException("Exam", str(exam_id))

        return exam

    async def list_exams(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        course_id: Optional[UUID] = None
    ) -> Tuple[List[Exam], int]:
        """List exams with pagination."""
        base_query = select(Exam).where(
            Exam.tenant_id == tenant_id
        )

        if course_id:
            base_query = base_query.where(Exam.course_id == course_id)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(Exam.questions)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(Exam.created_at.desc())

        result = await self.db.execute(stmt)
        exams = list(result.scalars().unique().all())

        return exams, total

    async def update_exam(
        self,
        exam_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        passing_score: Optional[int] = None,
        max_attempts: Optional[int] = None,
        shuffle_questions: Optional[bool] = None,
        shuffle_options: Optional[bool] = None,
        show_results_immediately: Optional[bool] = None,
        is_active: Optional[bool] = None
    ) -> Exam:
        """Update exam."""
        exam = await self.get_exam(exam_id, tenant_id)

        if title is not None:
            exam.title = title
        if description is not None:
            exam.description = description
        if duration_minutes is not None:
            exam.duration_minutes = duration_minutes
        if passing_score is not None:
            exam.passing_score = passing_score
        if max_attempts is not None:
            exam.max_attempts = max_attempts
        if shuffle_questions is not None:
            exam.shuffle_questions = shuffle_questions
        if shuffle_options is not None:
            exam.shuffle_options = shuffle_options
        if show_results_immediately is not None:
            exam.show_results_immediately = show_results_immediately
        if is_active is not None:
            exam.is_active = is_active

        exam.updated_by = updated_by
        exam.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(exam)

        return exam

    async def delete_exam(
        self,
        exam_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete exam (hard delete)."""
        exam = await self.get_exam(exam_id, tenant_id, include_questions=True)

        # Delete all questions first
        for question in exam.questions:
            await self.db.delete(question)

        await self.db.delete(exam)
        await self.db.commit()

    # ==================== Question Management ====================

    async def add_question(
        self,
        exam_id: UUID,
        tenant_id: UUID,
        question_type: str,
        question_text: str,
        correct_answer: Dict[str, Any],
        created_by: UUID,
        options: List[Dict[str, Any]] = None,
        explanation: Optional[str] = None,
        points: int = 1,
        display_order: int = 0
    ) -> ExamQuestion:
        """Add question to exam."""
        await self.get_exam(exam_id, tenant_id)

        question = ExamQuestion(
            tenant_id=tenant_id,
            exam_id=exam_id,
            question_type=question_type,
            question_text=question_text,
            options=options or [],
            correct_answer=correct_answer,
            explanation=explanation,
            points=points,
            display_order=display_order,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(question)
        await self.db.commit()
        await self.db.refresh(question)

        return question

    async def get_questions(
        self,
        exam_id: UUID,
        tenant_id: UUID
    ) -> List[ExamQuestion]:
        """Get all questions for an exam."""
        await self.get_exam(exam_id, tenant_id)

        stmt = select(ExamQuestion).where(
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.tenant_id == tenant_id
        ).order_by(ExamQuestion.display_order.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_question(
        self,
        exam_id: UUID,
        question_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        question_type: Optional[str] = None,
        question_text: Optional[str] = None,
        options: Optional[List[Dict[str, Any]]] = None,
        correct_answer: Optional[Dict[str, Any]] = None,
        explanation: Optional[str] = None,
        points: Optional[int] = None,
        display_order: Optional[int] = None
    ) -> ExamQuestion:
        """Update exam question."""
        stmt = select(ExamQuestion).where(
            ExamQuestion.id == question_id,
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()

        if not question:
            raise ResourceNotFoundException("ExamQuestion", str(question_id))

        if question_type is not None:
            question.question_type = question_type
        if question_text is not None:
            question.question_text = question_text
        if options is not None:
            question.options = options
        if correct_answer is not None:
            question.correct_answer = correct_answer
        if explanation is not None:
            question.explanation = explanation
        if points is not None:
            question.points = points
        if display_order is not None:
            question.display_order = display_order

        question.updated_by = updated_by
        question.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(question)

        return question

    async def delete_question(
        self,
        exam_id: UUID,
        question_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete exam question."""
        stmt = select(ExamQuestion).where(
            ExamQuestion.id == question_id,
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        question = result.scalar_one_or_none()

        if not question:
            raise ResourceNotFoundException("ExamQuestion", str(question_id))

        await self.db.delete(question)
        await self.db.commit()

    # ==================== Exam Attempts ====================

    async def start_attempt(
        self,
        exam_id: UUID,
        employee_id: UUID,
        enrollment_id: UUID,
        tenant_id: UUID
    ) -> Tuple[ExamAttempt, List[ExamQuestion]]:
        """Start a new exam attempt."""
        exam = await self.get_exam(exam_id, tenant_id, include_questions=True)

        if not exam.is_active:
            raise BusinessRuleViolationException("Exam is not active")

        # Verify enrollment
        stmt = select(Enrollment).where(
            Enrollment.id == enrollment_id,
            Enrollment.employee_id == employee_id,
            Enrollment.course_id == exam.course_id,
            Enrollment.tenant_id == tenant_id,
            Enrollment.is_deleted == False
        )
        result = await self.db.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            raise ResourceNotFoundException("Enrollment", str(enrollment_id))

        if enrollment.status not in ["ENROLLED", "IN_PROGRESS"]:
            raise BusinessRuleViolationException(
                "Cannot start exam for non-active enrollment"
            )

        # Check attempt count
        stmt = select(func.count()).where(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.employee_id == employee_id,
            ExamAttempt.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        attempt_count = result.scalar() or 0

        if attempt_count >= exam.max_attempts:
            raise BusinessRuleViolationException(
                f"Maximum attempts ({exam.max_attempts}) reached"
            )

        # Check for in-progress attempt
        stmt = select(ExamAttempt).where(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.employee_id == employee_id,
            ExamAttempt.tenant_id == tenant_id,
            ExamAttempt.status == "IN_PROGRESS"
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise BusinessRuleViolationException(
                "You have an in-progress attempt. Complete it first."
            )

        # Create attempt
        attempt = ExamAttempt(
            tenant_id=tenant_id,
            exam_id=exam_id,
            employee_id=employee_id,
            enrollment_id=enrollment_id,
            attempt_number=attempt_count + 1,
            status="IN_PROGRESS",
            max_score=exam.total_points
        )
        self.db.add(attempt)
        await self.db.commit()
        await self.db.refresh(attempt)

        # Update enrollment status
        if enrollment.status == "ENROLLED":
            enrollment.status = "IN_PROGRESS"
            await self.db.commit()

        # Prepare questions (shuffle if needed)
        questions = list(exam.questions)
        if exam.shuffle_questions:
            random.shuffle(questions)

        # Shuffle options if needed
        if exam.shuffle_options:
            for q in questions:
                if q.options:
                    shuffled = list(q.options)
                    random.shuffle(shuffled)
                    q.options = shuffled

        return attempt, questions

    async def get_attempt(
        self,
        attempt_id: UUID,
        tenant_id: UUID
    ) -> ExamAttempt:
        """Get attempt by ID."""
        stmt = select(ExamAttempt).where(
            ExamAttempt.id == attempt_id,
            ExamAttempt.tenant_id == tenant_id
        ).options(
            selectinload(ExamAttempt.exam),
            selectinload(ExamAttempt.responses).selectinload(ExamResponse.question)
        )
        result = await self.db.execute(stmt)
        attempt = result.scalar_one_or_none()

        if not attempt:
            raise ResourceNotFoundException("ExamAttempt", str(attempt_id))

        return attempt

    async def submit_attempt(
        self,
        attempt_id: UUID,
        tenant_id: UUID,
        answers: List[Dict[str, Any]]
    ) -> ExamAttempt:
        """Submit exam attempt with answers."""
        attempt = await self.get_attempt(attempt_id, tenant_id)

        if attempt.status != "IN_PROGRESS":
            raise ResourceStateConflictException(
                "Attempt is not in progress",
                current_state=attempt.status,
                target_state="SUBMITTED"
            )

        # Check if expired
        if attempt.is_expired:
            attempt.status = "EXPIRED"
            await self.db.commit()
            raise BusinessRuleViolationException("Exam time has expired")

        # Get exam questions
        questions = await self.get_questions(attempt.exam_id, tenant_id)
        question_map = {str(q.id): q for q in questions}

        # Process answers
        total_score = 0
        max_score = 0
        now = datetime.now(timezone.utc)

        for answer in answers:
            question_id = str(answer["question_id"])
            selected_answer = answer["selected_answer"]

            question = question_map.get(question_id)
            if not question:
                continue

            is_correct = question.check_answer(selected_answer)
            points_earned = question.points if is_correct else 0
            total_score += points_earned
            max_score += question.points

            response = ExamResponse(
                tenant_id=tenant_id,
                attempt_id=attempt_id,
                question_id=question.id,
                selected_answer=selected_answer,
                is_correct=is_correct,
                points_earned=points_earned,
                answered_at=now
            )
            self.db.add(response)

        # Calculate results
        time_spent = int((now - attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds())
        percentage = Decimal(total_score / max_score * 100) if max_score > 0 else Decimal(0)
        is_passed = percentage >= attempt.exam.passing_score

        attempt.submitted_at = now
        attempt.time_spent_seconds = time_spent
        attempt.score = total_score
        attempt.max_score = max_score
        attempt.percentage = round(percentage, 2)
        attempt.is_passed = is_passed
        attempt.status = "GRADED"

        await self.db.commit()
        await self.db.refresh(attempt)

        # Update enrollment status if passed
        if is_passed:
            stmt = select(Enrollment).where(
                Enrollment.id == attempt.enrollment_id
            )
            result = await self.db.execute(stmt)
            enrollment = result.scalar_one_or_none()

            if enrollment:
                enrollment.status = "COMPLETED"
                enrollment.completed_at = now
                enrollment.progress_percentage = 100
                await self.db.commit()

        return attempt

    async def get_attempt_results(
        self,
        attempt_id: UUID,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """Get detailed results for an attempt."""
        attempt = await self.get_attempt(attempt_id, tenant_id)

        if attempt.status not in ["GRADED", "SUBMITTED"]:
            raise BusinessRuleViolationException(
                "Results not available for this attempt"
            )

        questions_results = []
        for response in attempt.responses:
            questions_results.append({
                "question_id": response.question_id,
                "question_text": response.question.question_text,
                "question_type": response.question.question_type,
                "selected_answer": response.selected_answer,
                "correct_answer": response.question.correct_answer,
                "is_correct": response.is_correct,
                "points_earned": response.points_earned,
                "max_points": response.question.points,
                "explanation": response.question.explanation
            })

        return {
            "attempt_id": attempt.id,
            "exam_id": attempt.exam_id,
            "exam_title": attempt.exam.title,
            "attempt_number": attempt.attempt_number,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
            "time_spent_seconds": attempt.time_spent_seconds,
            "score": attempt.score,
            "max_score": attempt.max_score,
            "percentage": attempt.percentage,
            "passing_score": attempt.exam.passing_score,
            "is_passed": attempt.is_passed,
            "questions": questions_results
        }

    async def get_my_attempts(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[ExamAttempt], int]:
        """Get attempts for current employee."""
        base_query = select(ExamAttempt).where(
            ExamAttempt.employee_id == employee_id,
            ExamAttempt.tenant_id == tenant_id
        )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(ExamAttempt.exam)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(ExamAttempt.started_at.desc())

        result = await self.db.execute(stmt)
        attempts = list(result.scalars().all())

        return attempts, total
