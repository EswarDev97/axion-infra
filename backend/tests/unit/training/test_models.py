"""
Training Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- Course model
- TrainingContent model
- TrainingSession model
- Enrollment model
- Exam model
- ExamAttempt model
- Certificate model
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestCourseModel:
    """Tests for Course model."""

    async def test_course_creation(self, db_session, test_tenant, test_user):
        """Test course creation with all required fields."""
        from services.training.models.course import Course

        course = Course(
            tenant_id=test_tenant.id,
            title="Python Fundamentals",
            code="PY101",
            description="Introduction to Python programming",
            objective="Learn Python basics",
            duration_hours=Decimal("8.0"),
            is_mandatory=False,
            passing_score=70,
            max_attempts=3,
            validity_months=12,
            status="DRAFT",
            category="TECHNICAL",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()
        await db_session.refresh(course)

        assert course.id is not None
        assert course.title == "Python Fundamentals"
        assert course.code == "PY101"
        assert course.duration_hours == Decimal("8.0")
        assert course.passing_score == 70
        assert course.is_mandatory is False
        assert course.status == "DRAFT"

    async def test_course_unique_code_per_tenant(self, db_session, test_tenant, test_user):
        """Test that course code must be unique within a tenant."""
        from services.training.models.course import Course
        from sqlalchemy.exc import IntegrityError

        course1 = Course(
            tenant_id=test_tenant.id,
            title="Course 1",
            code="CODE001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course1)
        await db_session.commit()

        course2 = Course(
            tenant_id=test_tenant.id,
            title="Course 2",
            code="CODE001",  # Same code
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_course_status_values(self, db_session, test_tenant, test_user):
        """Test valid course status values."""
        from services.training.models.course import Course

        for status in ["DRAFT", "PUBLISHED", "ARCHIVED"]:
            course = Course(
                tenant_id=test_tenant.id,
                title=f"Course {status}",
                code=f"STATUS_{status}",
                status=status,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(course)
            await db_session.commit()
            await db_session.refresh(course)
            assert course.status == status

    async def test_course_is_published_property(self, db_session, test_tenant, test_user):
        """Test is_published property."""
        from services.training.models.course import Course

        draft_course = Course(
            tenant_id=test_tenant.id,
            title="Draft Course",
            code="DRAFT001",
            status="DRAFT",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(draft_course)
        await db_session.commit()
        await db_session.refresh(draft_course)

        assert draft_course.is_published is False

        published_course = Course(
            tenant_id=test_tenant.id,
            title="Published Course",
            code="PUB001",
            status="PUBLISHED",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(published_course)
        await db_session.commit()
        await db_session.refresh(published_course)

        assert published_course.is_published is True

    async def test_course_soft_delete(self, db_session, test_tenant, test_user):
        """Test course soft delete functionality."""
        from services.training.models.course import Course

        course = Course(
            tenant_id=test_tenant.id,
            title="Course to Delete",
            code="DEL001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()
        await db_session.refresh(course)

        assert course.is_deleted is False
        assert course.deleted_at is None

        course.is_deleted = True
        course.deleted_at = datetime.utcnow()
        course.deletion_reason = "Test deletion"
        await db_session.commit()
        await db_session.refresh(course)

        assert course.is_deleted is True
        assert course.deleted_at is not None
        assert course.deletion_reason == "Test deletion"


class TestEnrollmentModel:
    """Tests for Enrollment model."""

    async def test_enrollment_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test enrollment creation."""
        from services.training.models.course import Course
        from services.training.models.enrollment import Enrollment

        # Create course first
        course = Course(
            tenant_id=test_tenant.id,
            title="Test Course",
            code="ENROLL001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        # Create enrollment
        enrollment = Enrollment(
            tenant_id=test_tenant.id,
            course_id=course.id,
            employee_id=test_employee.id,
            status="ENROLLED",
            enrolled_by=test_user.id,
            due_date=date.today() + timedelta(days=30),
            progress_percentage=0,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(enrollment)
        await db_session.commit()
        await db_session.refresh(enrollment)

        assert enrollment.id is not None
        assert enrollment.course_id == course.id
        assert enrollment.employee_id == test_employee.id
        assert enrollment.status == "ENROLLED"
        assert enrollment.progress_percentage == 0

    async def test_enrollment_status_values(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test valid enrollment status values."""
        from services.training.models.course import Course
        from services.training.models.enrollment import Enrollment

        course = Course(
            tenant_id=test_tenant.id,
            title="Status Test Course",
            code="STATCRS001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        for i, status in enumerate(["ENROLLED", "IN_PROGRESS", "COMPLETED", "DROPPED", "FAILED"]):
            enrollment = Enrollment(
                tenant_id=test_tenant.id,
                course_id=course.id,
                employee_id=test_employee.id,
                status=status,
                enrolled_by=test_user.id,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            # Need unique constraint workaround - delete before creating
            db_session.add(enrollment)
            await db_session.commit()
            await db_session.refresh(enrollment)
            assert enrollment.status == status
            # Delete for next iteration
            enrollment.is_deleted = True
            await db_session.commit()

    async def test_enrollment_is_overdue_property(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test is_overdue property."""
        from services.training.models.course import Course
        from services.training.models.enrollment import Enrollment

        course = Course(
            tenant_id=test_tenant.id,
            title="Overdue Test Course",
            code="OVDUE001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        # Not overdue - future due date
        enrollment = Enrollment(
            tenant_id=test_tenant.id,
            course_id=course.id,
            employee_id=test_employee.id,
            enrolled_by=test_user.id,
            due_date=date.today() + timedelta(days=7),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(enrollment)
        await db_session.commit()
        await db_session.refresh(enrollment)

        assert enrollment.is_overdue is False

        # Overdue - past due date
        enrollment.due_date = date.today() - timedelta(days=1)
        await db_session.commit()
        await db_session.refresh(enrollment)

        assert enrollment.is_overdue is True

    async def test_enrollment_is_completed_property(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test is_completed property."""
        from services.training.models.course import Course
        from services.training.models.enrollment import Enrollment

        course = Course(
            tenant_id=test_tenant.id,
            title="Complete Test Course",
            code="COMP001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        enrollment = Enrollment(
            tenant_id=test_tenant.id,
            course_id=course.id,
            employee_id=test_employee.id,
            status="IN_PROGRESS",
            enrolled_by=test_user.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(enrollment)
        await db_session.commit()
        await db_session.refresh(enrollment)

        assert enrollment.is_completed is False

        enrollment.status = "COMPLETED"
        enrollment.completed_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(enrollment)

        assert enrollment.is_completed is True


class TestTrainingSessionModel:
    """Tests for TrainingSession model."""

    async def test_session_creation(self, db_session, test_tenant, test_user):
        """Test training session creation."""
        from services.training.models.course import Course
        from services.training.models.training_session import TrainingSession

        course = Course(
            tenant_id=test_tenant.id,
            title="Session Test Course",
            code="SESS001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        session = TrainingSession(
            tenant_id=test_tenant.id,
            course_id=course.id,
            title="Morning Batch",
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=14),
            max_participants=25,
            status="SCHEDULED",
            location="Conference Room A",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        assert session.id is not None
        assert session.title == "Morning Batch"
        assert session.max_participants == 25
        assert session.status == "SCHEDULED"


class TestExamModel:
    """Tests for Exam model."""

    async def test_exam_creation(self, db_session, test_tenant, test_user):
        """Test exam creation."""
        from services.training.models.course import Course
        from services.training.models.exam import Exam

        course = Course(
            tenant_id=test_tenant.id,
            title="Exam Test Course",
            code="EXAM001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        exam = Exam(
            tenant_id=test_tenant.id,
            course_id=course.id,
            title="Final Assessment",
            total_marks=100,
            passing_marks=70,
            duration_minutes=60,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(exam)
        await db_session.commit()
        await db_session.refresh(exam)

        assert exam.id is not None
        assert exam.total_marks == 100
        assert exam.passing_marks == 70
        assert exam.duration_minutes == 60


class TestCertificateModel:
    """Tests for Certificate model."""

    async def test_certificate_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test certificate creation."""
        from services.training.models.course import Course
        from services.training.models.enrollment import Enrollment
        from services.training.models.certificate import Certificate

        course = Course(
            tenant_id=test_tenant.id,
            title="Cert Test Course",
            code="CERT001",
            validity_months=12,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        enrollment = Enrollment(
            tenant_id=test_tenant.id,
            course_id=course.id,
            employee_id=test_employee.id,
            status="COMPLETED",
            enrolled_by=test_user.id,
            completed_at=datetime.utcnow(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(enrollment)
        await db_session.commit()

        certificate = Certificate(
            tenant_id=test_tenant.id,
            enrollment_id=enrollment.id,
            course_id=course.id,
            employee_id=test_employee.id,
            certificate_number="CERT-2026-0001",
            issued_at=datetime.utcnow(),
            valid_until=date.today() + timedelta(days=365),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(certificate)
        await db_session.commit()
        await db_session.refresh(certificate)

        assert certificate.id is not None
        assert certificate.certificate_number == "CERT-2026-0001"
        assert certificate.valid_until is not None


class TestTrainingContentModel:
    """Tests for TrainingContent model."""

    async def test_content_creation(self, db_session, test_tenant, test_user):
        """Test training content creation."""
        from services.training.models.course import Course
        from services.training.models.training_content import TrainingContent

        course = Course(
            tenant_id=test_tenant.id,
            title="Content Test Course",
            code="CONT001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        content = TrainingContent(
            tenant_id=test_tenant.id,
            course_id=course.id,
            title="Introduction Module",
            content_type="VIDEO",
            content_url="https://videos.example.com/intro.mp4",
            sequence_order=1,
            duration_minutes=30,
            is_mandatory=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(content)
        await db_session.commit()
        await db_session.refresh(content)

        assert content.id is not None
        assert content.title == "Introduction Module"
        assert content.content_type == "VIDEO"
        assert content.sequence_order == 1

    async def test_content_types(self, db_session, test_tenant, test_user):
        """Test valid content types."""
        from services.training.models.course import Course
        from services.training.models.training_content import TrainingContent

        course = Course(
            tenant_id=test_tenant.id,
            title="Types Test Course",
            code="TYPES001",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(course)
        await db_session.commit()

        for i, content_type in enumerate(["VIDEO", "DOCUMENT", "PRESENTATION", "QUIZ", "LINK"]):
            content = TrainingContent(
                tenant_id=test_tenant.id,
                course_id=course.id,
                title=f"Content {content_type}",
                content_type=content_type,
                sequence_order=i + 1,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(content)
            await db_session.commit()
            await db_session.refresh(content)
            assert content.content_type == content_type
