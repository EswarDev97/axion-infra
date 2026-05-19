-- =============================================================================
-- MindFlow Database Migration: Training Service Tables
-- Service: training-service
-- Tables: courses, training_content, training_sessions, enrollments, training_attendance,
--         exams, exam_questions, exam_attempts, exam_responses, certificates
-- =============================================================================

-- Courses (main training course entity)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    objective TEXT,
    duration_hours DECIMAL(6,2),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    validity_months INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    category VARCHAR(50),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_courses_tenant_id ON courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_is_deleted ON courses(tenant_id, is_deleted);

-- Training Content (course content materials)
CREATE TABLE IF NOT EXISTS training_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    file_id UUID,
    external_url VARCHAR(500),
    display_order INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_training_content_tenant_id ON training_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_content_course_id ON training_content(course_id);

-- Training Sessions (scheduled training sessions)
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    trainer_employee_id UUID REFERENCES employees(id),
    max_participants INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_tenant_id ON training_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_course_id ON training_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date);

-- Enrollments (employee course enrollments)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    session_id UUID REFERENCES training_sessions(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enrolled_by UUID NOT NULL REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    due_date DATE,
    progress_percentage INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_id ON enrollments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_employee_id ON enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_session_id ON enrollments(session_id);

-- Training Attendance (session attendance tracking)
CREATE TABLE IF NOT EXISTS training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_id UUID NOT NULL REFERENCES training_sessions(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    check_in_time TIME,
    check_out_time TIME,
    remarks TEXT,
    marked_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, session_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_tenant_id ON training_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_session_id ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_employee_id ON training_attendance(employee_id);

-- Exams (course assessments)
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
    show_results_immediately BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_exams_tenant_id ON exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);

-- Exam Questions (questions within an exam)
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_type VARCHAR(30) NOT NULL DEFAULT 'MCQ',
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_tenant_id ON exam_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);

-- Exam Attempts (individual exam attempts)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID NOT NULL REFERENCES exams(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    score INTEGER,
    max_score INTEGER,
    percentage DECIMAL(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    is_passed BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_tenant_id ON exam_attempts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_employee_id ON exam_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_enrollment_id ON exam_attempts(enrollment_id);

-- Exam Responses (individual question responses)
CREATE TABLE IF NOT EXISTS exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES exam_questions(id),
    selected_answer JSONB,
    is_correct BOOLEAN,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_responses_tenant_id ON exam_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exam_responses_attempt_id ON exam_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_responses_question_id ON exam_responses(question_id);

-- Certificates (training completion certificates)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    certificate_number VARCHAR(100) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until DATE,
    pdf_file_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, certificate_number)
);

CREATE INDEX IF NOT EXISTS idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_enrollment_id ON certificates(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_certificates_employee_id ON certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);

-- =============================================================================
-- End of Training Service Tables
-- =============================================================================
