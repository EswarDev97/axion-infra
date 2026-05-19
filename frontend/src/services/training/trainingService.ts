/**
 * MindFlow - Training Service
 * Per API_CONTRACT.md Section 8.4 (Training Module)
 */

import { get, post, put, del } from '@/services/api/client';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseFilters,
  TrainingContent,
  TrainingContentCreateRequest,
  TrainingContentUpdateRequest,
  TrainingSession,
  TrainingSessionCreateRequest,
  TrainingSessionUpdateRequest,
  SessionFilters,
  TrainingAttendance,
  BulkAttendanceMarkRequest,
  Enrollment,
  EnrollmentCreateRequest,
  BulkEnrollmentRequest,
  EnrollmentFilters,
  Exam,
  ExamCreateRequest,
  ExamUpdateRequest,
  ExamQuestion,
  ExamQuestionCreateRequest,
  ExamQuestionUpdateRequest,
  ExamAttempt,
  ExamAttemptStartResponse,
  ExamSubmitRequest,
  ExamResultResponse,
  Certificate,
  CertificateIssueRequest,
  CertificateVerifyResponse,
  MyTrainingSummary,
} from './types';

const TRAINING_BASE = '/training';

// ============================================================================
// Course Service
// ============================================================================

export const courseService = {
  async list(params?: PaginationParams & CourseFilters): Promise<PaginatedResponse<Course>> {
    return get<PaginatedResponse<Course>>(`${TRAINING_BASE}/courses`, params);
  },

  async getById(id: string): Promise<Course> {
    return get<Course>(`${TRAINING_BASE}/courses/${id}`);
  },

  async create(data: CourseCreateRequest): Promise<Course> {
    return post<Course>(`${TRAINING_BASE}/courses`, data);
  },

  async update(id: string, data: CourseUpdateRequest): Promise<Course> {
    return put<Course>(`${TRAINING_BASE}/courses/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${TRAINING_BASE}/courses/${id}`);
  },

  async publish(id: string): Promise<Course> {
    return post<Course>(`${TRAINING_BASE}/courses/${id}/publish`, {});
  },

  async archive(id: string): Promise<Course> {
    return post<Course>(`${TRAINING_BASE}/courses/${id}/archive`, {});
  },

  async getCategories(): Promise<string[]> {
    return get<string[]>(`${TRAINING_BASE}/courses/categories`);
  },

  // Course Content
  async getContent(courseId: string): Promise<TrainingContent[]> {
    return get<TrainingContent[]>(`${TRAINING_BASE}/courses/${courseId}/content`);
  },

  async addContent(courseId: string, data: TrainingContentCreateRequest): Promise<TrainingContent> {
    return post<TrainingContent>(`${TRAINING_BASE}/courses/${courseId}/content`, data);
  },

  async updateContent(courseId: string, contentId: string, data: TrainingContentUpdateRequest): Promise<TrainingContent> {
    return put<TrainingContent>(`${TRAINING_BASE}/courses/${courseId}/content/${contentId}`, data);
  },

  async deleteContent(courseId: string, contentId: string): Promise<void> {
    return del<void>(`${TRAINING_BASE}/courses/${courseId}/content/${contentId}`);
  },

  async reorderContent(courseId: string, contentIds: string[]): Promise<TrainingContent[]> {
    return post<TrainingContent[]>(`${TRAINING_BASE}/courses/${courseId}/content/reorder`, { contentIds });
  },
};

// ============================================================================
// Training Session Service
// ============================================================================

export const sessionService = {
  async list(params?: PaginationParams & SessionFilters): Promise<PaginatedResponse<TrainingSession>> {
    return get<PaginatedResponse<TrainingSession>>(`${TRAINING_BASE}/sessions`, params);
  },

  async getById(id: string): Promise<TrainingSession> {
    return get<TrainingSession>(`${TRAINING_BASE}/sessions/${id}`);
  },

  async create(data: TrainingSessionCreateRequest): Promise<TrainingSession> {
    return post<TrainingSession>(`${TRAINING_BASE}/sessions`, data);
  },

  async update(id: string, data: TrainingSessionUpdateRequest): Promise<TrainingSession> {
    return put<TrainingSession>(`${TRAINING_BASE}/sessions/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${TRAINING_BASE}/sessions/${id}`);
  },

  async cancel(id: string, reason?: string): Promise<TrainingSession> {
    return post<TrainingSession>(`${TRAINING_BASE}/sessions/${id}/cancel`, { reason });
  },

  async complete(id: string): Promise<TrainingSession> {
    return post<TrainingSession>(`${TRAINING_BASE}/sessions/${id}/complete`, {});
  },

  // Attendance
  async getAttendance(sessionId: string): Promise<TrainingAttendance[]> {
    return get<TrainingAttendance[]>(`${TRAINING_BASE}/sessions/${sessionId}/attendance`);
  },

  async markAttendance(sessionId: string, data: BulkAttendanceMarkRequest): Promise<TrainingAttendance[]> {
    return post<TrainingAttendance[]>(`${TRAINING_BASE}/sessions/${sessionId}/attendance`, data);
  },
};

// ============================================================================
// Enrollment Service
// ============================================================================

export const enrollmentService = {
  async list(params?: PaginationParams & EnrollmentFilters): Promise<PaginatedResponse<Enrollment>> {
    return get<PaginatedResponse<Enrollment>>(`${TRAINING_BASE}/enrollments`, params);
  },

  async getById(id: string): Promise<Enrollment> {
    return get<Enrollment>(`${TRAINING_BASE}/enrollments/${id}`);
  },

  async enroll(data: EnrollmentCreateRequest): Promise<Enrollment> {
    return post<Enrollment>(`${TRAINING_BASE}/enrollments`, data);
  },

  async bulkEnroll(data: BulkEnrollmentRequest): Promise<Enrollment[]> {
    return post<Enrollment[]>(`${TRAINING_BASE}/enrollments/bulk`, data);
  },

  async drop(id: string, reason?: string): Promise<Enrollment> {
    return post<Enrollment>(`${TRAINING_BASE}/enrollments/${id}/drop`, { reason });
  },

  async updateProgress(id: string, progressPercent: number): Promise<Enrollment> {
    return post<Enrollment>(`${TRAINING_BASE}/enrollments/${id}/progress`, { progressPercent });
  },

  async complete(id: string): Promise<Enrollment> {
    return post<Enrollment>(`${TRAINING_BASE}/enrollments/${id}/complete`, {});
  },
};

// ============================================================================
// Exam Service
// ============================================================================

export const examService = {
  async list(params?: PaginationParams & { courseId?: string }): Promise<PaginatedResponse<Exam>> {
    return get<PaginatedResponse<Exam>>(`${TRAINING_BASE}/exams`, params);
  },

  async getById(id: string): Promise<Exam> {
    return get<Exam>(`${TRAINING_BASE}/exams/${id}`);
  },

  async create(data: ExamCreateRequest): Promise<Exam> {
    return post<Exam>(`${TRAINING_BASE}/exams`, data);
  },

  async update(id: string, data: ExamUpdateRequest): Promise<Exam> {
    return put<Exam>(`${TRAINING_BASE}/exams/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`${TRAINING_BASE}/exams/${id}`);
  },

  // Questions
  async getQuestions(examId: string): Promise<ExamQuestion[]> {
    return get<ExamQuestion[]>(`${TRAINING_BASE}/exams/${examId}/questions`);
  },

  async addQuestion(examId: string, data: ExamQuestionCreateRequest): Promise<ExamQuestion> {
    return post<ExamQuestion>(`${TRAINING_BASE}/exams/${examId}/questions`, data);
  },

  async updateQuestion(examId: string, questionId: string, data: ExamQuestionUpdateRequest): Promise<ExamQuestion> {
    return put<ExamQuestion>(`${TRAINING_BASE}/exams/${examId}/questions/${questionId}`, data);
  },

  async deleteQuestion(examId: string, questionId: string): Promise<void> {
    return del<void>(`${TRAINING_BASE}/exams/${examId}/questions/${questionId}`);
  },

  async reorderQuestions(examId: string, questionIds: string[]): Promise<ExamQuestion[]> {
    return post<ExamQuestion[]>(`${TRAINING_BASE}/exams/${examId}/questions/reorder`, { questionIds });
  },

  // Attempts
  async startAttempt(examId: string): Promise<ExamAttemptStartResponse> {
    return post<ExamAttemptStartResponse>(`${TRAINING_BASE}/exams/${examId}/start`, {});
  },

  async submitAttempt(attemptId: string, data: ExamSubmitRequest): Promise<ExamResultResponse> {
    return post<ExamResultResponse>(`${TRAINING_BASE}/attempts/${attemptId}/submit`, data);
  },

  async getAttempts(examId: string): Promise<ExamAttempt[]> {
    return get<ExamAttempt[]>(`${TRAINING_BASE}/exams/${examId}/attempts`);
  },

  async getAttemptResult(attemptId: string): Promise<ExamResultResponse> {
    return get<ExamResultResponse>(`${TRAINING_BASE}/attempts/${attemptId}/result`);
  },
};

// ============================================================================
// Certificate Service
// ============================================================================

export const certificateService = {
  async list(params?: PaginationParams & { employeeId?: string; courseId?: string }): Promise<PaginatedResponse<Certificate>> {
    return get<PaginatedResponse<Certificate>>(`${TRAINING_BASE}/certificates`, params);
  },

  async getById(id: string): Promise<Certificate> {
    return get<Certificate>(`${TRAINING_BASE}/certificates/${id}`);
  },

  async issue(data: CertificateIssueRequest): Promise<Certificate> {
    return post<Certificate>(`${TRAINING_BASE}/certificates`, data);
  },

  async verify(certificateNumber: string): Promise<CertificateVerifyResponse> {
    return get<CertificateVerifyResponse>(`${TRAINING_BASE}/certificates/verify/${certificateNumber}`);
  },

  async download(id: string): Promise<Blob> {
    return get<Blob>(`${TRAINING_BASE}/certificates/${id}/download`);
  },
};

// ============================================================================
// My Training (Employee Dashboard)
// ============================================================================

export const myTrainingService = {
  async getSummary(): Promise<MyTrainingSummary> {
    return get<MyTrainingSummary>(`${TRAINING_BASE}/me/summary`);
  },

  async getEnrollments(params?: PaginationParams): Promise<PaginatedResponse<Enrollment>> {
    return get<PaginatedResponse<Enrollment>>(`${TRAINING_BASE}/me/enrollments`, params);
  },

  async getCertificates(params?: PaginationParams): Promise<PaginatedResponse<Certificate>> {
    return get<PaginatedResponse<Certificate>>(`${TRAINING_BASE}/me/certificates`, params);
  },

  async getUpcomingSessions(params?: PaginationParams): Promise<PaginatedResponse<TrainingSession>> {
    return get<PaginatedResponse<TrainingSession>>(`${TRAINING_BASE}/me/sessions`, params);
  },
};

// ============================================================================
// Combined Training Module Export
// ============================================================================

export const trainingModule = {
  courses: courseService,
  sessions: sessionService,
  enrollments: enrollmentService,
  exams: examService,
  certificates: certificateService,
  myTraining: myTrainingService,
};

export default trainingModule;
