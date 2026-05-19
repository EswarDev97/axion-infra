-- MindFlow Database Performance Indexes
-- Per PO-030 Task 6.7: Database Performance Optimization
-- Creates composite indexes and additional indexes for common query patterns
--
-- Run this migration after all tables are created:
-- psql -U axionpcs -d axionpcs_db -f performance_indexes.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================================
-- USERS & AUTHENTICATION INDEXES
-- ============================================================================

-- Users: Email lookup (unique, already exists via constraint)
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status) WHERE status = 'ACTIVE';

-- Sessions: Active session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_user ON sessions(tenant_id, user_id);

-- User roles: Permission lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);

-- ============================================================================
-- HR MODULE INDEXES
-- ============================================================================

-- Employees: Common query patterns
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status ON employees(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept ON employees(tenant_id, department_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;

-- Departments: Hierarchy and lookup
CREATE INDEX IF NOT EXISTS idx_departments_tenant_parent ON departments(tenant_id, parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id) WHERE manager_id IS NOT NULL;

-- Positions: Department grouping
CREATE INDEX IF NOT EXISTS idx_positions_tenant_dept ON positions(tenant_id, department_id);

-- Leave requests: Date range queries (very common)
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_status ON leave_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending ON leave_requests(tenant_id, status) WHERE status = 'PENDING';

-- Leave balances: Employee lookup
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_type ON leave_balances(employee_id, leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant_year ON leave_balances(tenant_id, year);

-- Attendance: Date-based queries (very common)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance_records(tenant_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance_records(tenant_id, attendance_date DESC);

-- Payroll: Period queries
CREATE INDEX IF NOT EXISTS idx_payroll_employee_period ON payroll_records(employee_id, pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_period ON payroll_records(tenant_id, pay_period_start);

-- Candidates: Recruitment pipeline
CREATE INDEX IF NOT EXISTS idx_candidates_tenant_status ON candidates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id, status);

-- ============================================================================
-- TASK MODULE INDEXES
-- ============================================================================

-- Tasks: Status and priority filtering (very common)
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_priority ON tasks(tenant_id, priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(tenant_id, expected_completion_date) WHERE is_deleted = FALSE AND actual_completion_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(tenant_id, expected_completion_date) WHERE is_deleted = FALSE AND actual_completion_date IS NULL AND expected_completion_date < CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by, tenant_id) WHERE is_deleted = FALSE;

-- Task assignees: User task lookup (critical for dashboard)
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

-- Task comments: Task lookup
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created ON task_comments(task_id, created_at DESC);

-- Task dependencies: Dependency lookup
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- EXPENSE MODULE INDEXES
-- ============================================================================

-- Expense requests: Status and date filtering
CREATE INDEX IF NOT EXISTS idx_expense_requests_tenant_status ON expense_requests(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_expense_requests_employee ON expense_requests(employee_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_expense_requests_date ON expense_requests(tenant_id, expense_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_expense_requests_pending ON expense_requests(tenant_id, status) WHERE status IN ('SUBMITTED', 'MANAGER_APPROVED') AND is_deleted = FALSE;

-- Expense items: Request lookup
CREATE INDEX IF NOT EXISTS idx_expense_items_request ON expense_items(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category ON expense_items(category_id);

-- Expense categories: Active lookup
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_active ON expense_categories(tenant_id, is_active) WHERE is_active = TRUE;

-- Payment records: Tracking
CREATE INDEX IF NOT EXISTS idx_payment_records_request ON payment_records(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_date ON payment_records(tenant_id, payment_date DESC);

-- ============================================================================
-- TRAINING MODULE INDEXES
-- ============================================================================

-- Courses: Active courses lookup
CREATE INDEX IF NOT EXISTS idx_courses_tenant_status ON courses(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(tenant_id, category);

-- Training sessions: Date-based scheduling
CREATE INDEX IF NOT EXISTS idx_training_sessions_course ON training_sessions(course_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_training_sessions_dates ON training_sessions(tenant_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_training_sessions_upcoming ON training_sessions(tenant_id, start_datetime) WHERE start_datetime > CURRENT_TIMESTAMP;

-- Enrollments: User training history
CREATE INDEX IF NOT EXISTS idx_enrollments_employee ON enrollments(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_session ON enrollments(session_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_status ON enrollments(tenant_id, status);

-- Certificates: Expiry tracking (important for compliance)
CREATE INDEX IF NOT EXISTS idx_certificates_employee ON certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON certificates(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificates_expiring_soon ON certificates(tenant_id, expiry_date) WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

-- Exams: Course lookup
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, exam_id);

-- ============================================================================
-- MINDMAP MODULE INDEXES
-- ============================================================================

-- Mind maps: User maps lookup
CREATE INDEX IF NOT EXISTS idx_mind_maps_tenant_created ON mind_maps(tenant_id, created_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mind_maps_template ON mind_maps(template_id) WHERE template_id IS NOT NULL;

-- Mind map nodes: Parent-child queries
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_map ON mind_map_nodes(mind_map_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_parent ON mind_map_nodes(parent_node_id) WHERE parent_node_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_linked_task ON mind_map_nodes(linked_task_id) WHERE linked_task_id IS NOT NULL;

-- Templates: Active templates
CREATE INDEX IF NOT EXISTS idx_mind_map_templates_tenant ON mind_map_templates(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- COMPLAINT MODULE INDEXES
-- ============================================================================

-- Complaints: Status and priority filtering
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_status ON complaints(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_priority ON complaints(tenant_id, priority) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_by ON complaints(submitted_by);
CREATE INDEX IF NOT EXISTS idx_complaints_escalated ON complaints(tenant_id, escalation_level) WHERE escalation_level > 0;
CREATE INDEX IF NOT EXISTS idx_complaints_sla_due ON complaints(tenant_id, sla_due_at) WHERE status NOT IN ('RESOLVED', 'CLOSED');

-- Complaint actions: Timeline lookup
CREATE INDEX IF NOT EXISTS idx_complaint_actions_complaint ON complaint_actions(complaint_id, created_at DESC);

-- Categories: Active lookup
CREATE INDEX IF NOT EXISTS idx_complaint_categories_tenant ON complaint_categories(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- APPROVAL MODULE INDEXES
-- ============================================================================

-- Approval workflows: Entity type lookup
CREATE INDEX IF NOT EXISTS idx_approval_workflows_tenant_entity ON approval_workflows(tenant_id, entity_type) WHERE is_active = TRUE;

-- Approval instances: Status and entity lookup (critical for approval UI)
CREATE INDEX IF NOT EXISTS idx_approval_instances_tenant_status ON approval_instances(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_instances_entity ON approval_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_requester ON approval_instances(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_instances_pending ON approval_instances(tenant_id, status) WHERE status = 'PENDING';

-- Approval decisions: Instance lookup
CREATE INDEX IF NOT EXISTS idx_approval_decisions_instance ON approval_decisions(instance_id, decided_at);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_approver ON approval_decisions(approver_id);

-- Approval steps: Workflow ordering
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow ON approval_steps(workflow_id, step_order);

-- Delegations: Active delegations
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegator ON approval_delegations(delegator_id, end_date) WHERE end_date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegate ON approval_delegations(delegate_id, end_date) WHERE end_date >= CURRENT_DATE;

-- ============================================================================
-- NOTIFICATION MODULE INDEXES
-- ============================================================================

-- Notifications: User inbox (critical for performance)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_type ON notifications(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- ============================================================================
-- STORAGE MODULE INDEXES
-- ============================================================================

-- File metadata: Entity lookup
CREATE INDEX IF NOT EXISTS idx_file_metadata_entity ON file_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_uploader ON file_metadata(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_metadata_tenant ON file_metadata(tenant_id, created_at DESC);

-- ============================================================================
-- REPORT MODULE INDEXES
-- ============================================================================

-- Report executions: History lookup
CREATE INDEX IF NOT EXISTS idx_report_executions_report ON report_executions(report_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_executions_user ON report_executions(executed_by, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_executions_tenant ON report_executions(tenant_id, executed_at DESC);

-- ============================================================================
-- TEXT SEARCH INDEXES (using pg_trgm for fuzzy search)
-- ============================================================================

-- Employee name search
CREATE INDEX IF NOT EXISTS idx_employees_name_trgm ON employees USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Task title search
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);

-- Complaint subject search
CREATE INDEX IF NOT EXISTS idx_complaints_subject_trgm ON complaints USING gin (subject gin_trgm_ops);

-- Mind map node title search
CREATE INDEX IF NOT EXISTS idx_mind_map_nodes_title_trgm ON mind_map_nodes USING gin (title gin_trgm_ops);

-- Course name search
CREATE INDEX IF NOT EXISTS idx_courses_name_trgm ON courses USING gin (name gin_trgm_ops);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE users;
ANALYZE employees;
ANALYZE tasks;
ANALYZE task_assignees;
ANALYZE leave_requests;
ANALYZE attendance_records;
ANALYZE expense_requests;
ANALYZE notifications;
ANALYZE approval_instances;
ANALYZE complaints;
ANALYZE mind_maps;
ANALYZE mind_map_nodes;
ANALYZE enrollments;
ANALYZE certificates;
