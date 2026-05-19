/**
 * MindFlow - Training Service Types
 * Per API_CONTRACT.md Section 8.4 (Training Module)
 */

// ============================================================================
// Course
// ============================================================================

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseDeliveryMode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  status: CourseStatus;
  deliveryMode: CourseDeliveryMode;
  maxEnrollments?: number | null;
  prerequisites?: string | null;
  learningObjectives?: string[] | null;
  contentCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CourseCreateRequest {
  title: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  duration?: number;
  deliveryMode?: CourseDeliveryMode;
  maxEnrollments?: number;
  prerequisites?: string;
  learningObjectives?: string[];
}

export interface CourseUpdateRequest {
  title?: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  deliveryMode?: CourseDeliveryMode;
  maxEnrollments?: number | null;
  prerequisites?: string | null;
  learningObjectives?: string[] | null;
}

export interface CourseFilters {
  status?: CourseStatus;
  category?: string;
  deliveryMode?: CourseDeliveryMode;
  search?: string;
}

// ============================================================================
// Training Content
// ============================================================================

export type ContentType = 'VIDEO' | 'DOCUMENT' | 'QUIZ' | 'INTERACTIVE' | 'EXTERNAL_LINK';

export interface TrainingContent {
  id: string;
  tenantId: string;
  courseId: string;
  title: string;
  contentType: ContentType;
  contentUrl?: string | null;
  fileId?: string | null;
  duration?: number | null;
  sortOrder: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingContentCreateRequest {
  title: string;
  contentType: ContentType;
  contentUrl?: string;
  fileId?: string;
  duration?: number;
  sortOrder?: number;
  isRequired?: boolean;
}

export interface TrainingContentUpdateRequest {
  title?: string;
  contentUrl?: string | null;
  fileId?: string | null;
  duration?: number | null;
  sortOrder?: number;
  isRequired?: boolean;
}

// ============================================================================
// Training Session
// ============================================================================

export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface TrainingSession {
  id: string;
  tenantId: string;
  courseId: string;
  courseName?: string;
  instructorId: string;
  instructorName?: string;
  title: string;
  description?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  meetingUrl?: string | null;
  maxAttendees?: number | null;
  status: SessionStatus;
  attendeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSessionCreateRequest {
  courseId: string;
  instructorId: string;
  title: string;
  description?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  maxAttendees?: number;
}

export interface TrainingSessionUpdateRequest {
  instructorId?: string;
  title?: string;
  description?: string | null;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  meetingUrl?: string | null;
  maxAttendees?: number | null;
  status?: SessionStatus;
}

export interface SessionFilters {
  courseId?: string;
  instructorId?: string;
  status?: SessionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// Training Attendance
// ============================================================================

export type TrainingAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface TrainingAttendance {
  id: string;
  sessionId: string;
  employeeId: string;
  employeeName?: string;
  status: TrainingAttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceMarkRequest {
  employeeId: string;
  status: TrainingAttendanceStatus;
  checkInTime?: string;
  notes?: string;
}

export interface BulkAttendanceMarkRequest {
  attendances: AttendanceMarkRequest[];
}

// ============================================================================
// Enrollment
// ============================================================================

export type EnrollmentStatus = 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED' | 'FAILED';

export interface Enrollment {
  id: string;
  tenantId: string;
  courseId: string;
  courseName?: string;
  employeeId: string;
  employeeName?: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercent: number;
  lastAccessedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentCreateRequest {
  courseId: string;
  employeeId: string;
  expiresAt?: string;
}

export interface BulkEnrollmentRequest {
  courseId: string;
  employeeIds: string[];
  expiresAt?: string;
}

export interface EnrollmentFilters {
  courseId?: string;
  employeeId?: string;
  status?: EnrollmentStatus;
  search?: string;
}

// ============================================================================
// Exam
// ============================================================================

export interface Exam {
  id: string;
  tenantId: string;
  courseId: string;
  courseName?: string;
  title: string;
  description?: string | null;
  passingScore: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  shuffleQuestions: boolean;
  showResults: boolean;
  isActive: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamCreateRequest {
  courseId: string;
  title: string;
  description?: string;
  passingScore?: number;
  timeLimit?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
}

export interface ExamUpdateRequest {
  title?: string;
  description?: string | null;
  passingScore?: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  isActive?: boolean;
}

// ============================================================================
// Exam Question
// ============================================================================

export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[] | null;
  correctAnswer: string | string[];
  points: number;
  sortOrder: number;
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionCreateRequest {
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[];
  correctAnswer: string | string[];
  points?: number;
  sortOrder?: number;
  explanation?: string;
}

export interface ExamQuestionUpdateRequest {
  questionText?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  points?: number;
  sortOrder?: number;
  explanation?: string | null;
}

// ============================================================================
// Exam Attempt
// ============================================================================

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle?: string;
  employeeId: string;
  employeeName?: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  passed?: boolean | null;
  timeSpent?: number | null;
  createdAt: string;
}

export interface ExamAttemptStartResponse {
  attemptId: string;
  examTitle: string;
  timeLimit?: number | null;
  questionCount: number;
  startedAt: string;
}

export interface ExamSubmitRequest {
  responses: Array<{
    questionId: string;
    answer: string | string[];
  }>;
}

export interface ExamResultResponse {
  attemptId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  passingScore: number;
  showResults: boolean;
  questionResults?: Array<{
    questionId: string;
    questionText: string;
    yourAnswer: string | string[];
    correctAnswer?: string | string[];
    isCorrect: boolean;
    points: number;
    earnedPoints: number;
    explanation?: string | null;
  }>;
}

// ============================================================================
// Certificate
// ============================================================================

export interface Certificate {
  id: string;
  tenantId: string;
  enrollmentId: string;
  employeeId: string;
  employeeName?: string;
  courseId: string;
  courseName?: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string | null;
  certificateUrl?: string | null;
  createdAt: string;
}

export interface CertificateIssueRequest {
  enrollmentId: string;
  expiresAt?: string;
}

export interface CertificateVerifyResponse {
  valid: boolean;
  certificate?: Certificate;
  message: string;
}

// ============================================================================
// Employee Training Dashboard
// ============================================================================

export interface MyTrainingSummary {
  enrolledCourses: number;
  inProgressCourses: number;
  completedCourses: number;
  upcomingSessions: number;
  totalCertificates: number;
  expiringCertificates: number;
}
