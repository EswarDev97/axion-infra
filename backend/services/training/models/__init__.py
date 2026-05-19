"""
MindFlow Training Service - Models
Per DATABASE_SCHEMA.md Section 3.5
"""

# Import shared model stubs first for cross-service foreign key resolution
# These must be imported before Training models that reference tenants/users tables
from shared.models import TenantStub, UserStub  # noqa: F401

from .course import Course
from .training_content import TrainingContent
from .training_session import TrainingSession
from .enrollment import Enrollment
from .training_attendance import TrainingAttendance
from .exam import Exam
from .exam_question import ExamQuestion
from .exam_attempt import ExamAttempt
from .exam_response import ExamResponse
from .certificate import Certificate

__all__ = [
    "Course",
    "TrainingContent",
    "TrainingSession",
    "Enrollment",
    "TrainingAttendance",
    "Exam",
    "ExamQuestion",
    "ExamAttempt",
    "ExamResponse",
    "Certificate",
]
