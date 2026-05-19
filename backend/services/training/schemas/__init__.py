"""
MindFlow Training Service - Schemas
Per API_CONTRACT.md Section 8.5
"""

from .course import (
    CourseCreateRequest,
    CourseUpdateRequest,
    CourseResponse,
    CourseListResponse,
    CourseFilters,
)
from .training_content import (
    TrainingContentCreateRequest,
    TrainingContentUpdateRequest,
    TrainingContentResponse,
)
from .training_session import (
    TrainingSessionCreateRequest,
    TrainingSessionUpdateRequest,
    TrainingSessionResponse,
    TrainingSessionListResponse,
    TrainingSessionFilters,
)
from .enrollment import (
    EnrollmentCreateRequest,
    EnrollmentUpdateRequest,
    EnrollmentResponse,
    EnrollmentListResponse,
    EnrollmentFilters,
    BulkEnrollmentRequest,
)
from .exam import (
    ExamCreateRequest,
    ExamUpdateRequest,
    ExamResponse,
    ExamListResponse,
)
from .exam_question import (
    ExamQuestionCreateRequest,
    ExamQuestionUpdateRequest,
    ExamQuestionResponse,
)
from .exam_attempt import (
    ExamAttemptStartResponse,
    ExamSubmitRequest,
    ExamAttemptResponse,
    ExamResultResponse,
)
from .certificate import (
    CertificateIssueRequest,
    CertificateResponse,
    CertificateListResponse,
)
from .attendance import (
    AttendanceMarkRequest,
    AttendanceResponse,
    AttendanceListResponse,
)

__all__ = [
    # Course
    "CourseCreateRequest",
    "CourseUpdateRequest",
    "CourseResponse",
    "CourseListResponse",
    "CourseFilters",
    # Training Content
    "TrainingContentCreateRequest",
    "TrainingContentUpdateRequest",
    "TrainingContentResponse",
    # Training Session
    "TrainingSessionCreateRequest",
    "TrainingSessionUpdateRequest",
    "TrainingSessionResponse",
    "TrainingSessionListResponse",
    "TrainingSessionFilters",
    # Enrollment
    "EnrollmentCreateRequest",
    "EnrollmentUpdateRequest",
    "EnrollmentResponse",
    "EnrollmentListResponse",
    "EnrollmentFilters",
    "BulkEnrollmentRequest",
    # Exam
    "ExamCreateRequest",
    "ExamUpdateRequest",
    "ExamResponse",
    "ExamListResponse",
    # Exam Question
    "ExamQuestionCreateRequest",
    "ExamQuestionUpdateRequest",
    "ExamQuestionResponse",
    # Exam Attempt
    "ExamAttemptStartResponse",
    "ExamSubmitRequest",
    "ExamAttemptResponse",
    "ExamResultResponse",
    # Certificate
    "CertificateIssueRequest",
    "CertificateResponse",
    "CertificateListResponse",
    # Attendance
    "AttendanceMarkRequest",
    "AttendanceResponse",
    "AttendanceListResponse",
]
