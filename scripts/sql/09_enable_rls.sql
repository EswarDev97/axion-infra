-- =============================================================================
-- MindFlow Database Migration: Enable Row-Level Security (RLS)
-- Date: 2026-01-25
-- Purpose: Enable RLS on all tenant-based tables for multi-tenant isolation
-- =============================================================================

-- =============================================================================
-- STEP 1: Create RLS helper function for tenant context
-- =============================================================================

-- Function to get current tenant from session variable
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is super admin (bypasses tenant restriction)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_super_admin', TRUE)::BOOLEAN, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- STEP 2: Enable RLS on all tenant-based tables
-- =============================================================================

-- AUTH SERVICE tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- HR SERVICE tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- TASK SERVICE tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- EXPENSE SERVICE tables
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- APPROVAL SERVICE tables
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_rules ENABLE ROW LEVEL SECURITY;

-- COMPLAINT SERVICE tables
ALTER TABLE complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_attachments ENABLE ROW LEVEL SECURITY;

-- TRAINING SERVICE tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- MINDMAP SERVICE tables
ALTER TABLE mind_map_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_attachments ENABLE ROW LEVEL SECURITY;

-- NOTIFICATION SERVICE tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- REPORT SERVICE tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

-- STORAGE SERVICE tables
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: Create RLS policies for tenant isolation
-- =============================================================================

-- Template for tenant-based tables:
-- Policy allows access only when:
-- 1. tenant_id matches current_tenant_id(), OR
-- 2. User is super admin

-- AUTH SERVICE policies
CREATE POLICY tenant_isolation_tenants ON tenants
    USING (is_super_admin() OR id = current_tenant_id());

CREATE POLICY tenant_isolation_users ON users
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_roles ON roles
    USING (is_super_admin() OR tenant_id = current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY tenant_isolation_permissions ON permissions
    USING (TRUE);  -- Permissions are global, not tenant-specific

CREATE POLICY tenant_isolation_role_permissions ON role_permissions
    USING (TRUE);  -- Join table, inherits from role

CREATE POLICY tenant_isolation_user_tenant_roles ON user_tenant_roles
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_sessions ON sessions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- HR SERVICE policies
CREATE POLICY tenant_isolation_departments ON departments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_positions ON positions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_employees ON employees
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_leave_types ON leave_types
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_leave_balances ON leave_balances
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_leave_requests ON leave_requests
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_attendance_records ON attendance_records
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_payroll_references ON payroll_references
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_candidates ON candidates
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- TASK SERVICE policies
CREATE POLICY tenant_isolation_tasks ON tasks
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_task_statuses ON task_statuses
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_task_assignees ON task_assignees
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_task_comments ON task_comments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_task_attachments ON task_attachments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_task_dependencies ON task_dependencies
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- EXPENSE SERVICE policies
CREATE POLICY tenant_isolation_expense_categories ON expense_categories
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_expense_requests ON expense_requests
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_expense_items ON expense_items
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_expense_receipts ON expense_receipts
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_payment_records ON payment_records
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- APPROVAL SERVICE policies
CREATE POLICY tenant_isolation_approval_workflows ON approval_workflows
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_approval_steps ON approval_steps
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_approval_instances ON approval_instances
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_approval_decisions ON approval_decisions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_delegation_rules ON delegation_rules
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- COMPLAINT SERVICE policies
CREATE POLICY tenant_isolation_complaint_categories ON complaint_categories
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_sla_configurations ON sla_configurations
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_escalation_rules ON escalation_rules
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_complaints ON complaints
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_complaint_actions ON complaint_actions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_complaint_attachments ON complaint_attachments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- TRAINING SERVICE policies
CREATE POLICY tenant_isolation_courses ON courses
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_training_content ON training_content
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_training_sessions ON training_sessions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_enrollments ON enrollments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_training_attendance ON training_attendance
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_exams ON exams
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_exam_questions ON exam_questions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_exam_attempts ON exam_attempts
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_exam_responses ON exam_responses
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_certificates ON certificates
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- MINDMAP SERVICE policies
CREATE POLICY tenant_isolation_mind_map_templates ON mind_map_templates
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_mind_maps ON mind_maps
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_mind_map_nodes ON mind_map_nodes
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_node_attachments ON node_attachments
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- NOTIFICATION SERVICE policies
CREATE POLICY tenant_isolation_notifications ON notifications
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- REPORT SERVICE policies
CREATE POLICY tenant_isolation_reports ON reports
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_report_parameters ON report_parameters
    USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_report_executions ON report_executions
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- STORAGE SERVICE policies
CREATE POLICY tenant_isolation_file_metadata ON file_metadata
    USING (is_super_admin() OR tenant_id = current_tenant_id());

-- =============================================================================
-- STEP 4: Grant usage on helper functions to application user
-- =============================================================================

-- Ensure application role can use the helper functions
-- GRANT EXECUTE ON FUNCTION current_tenant_id() TO app_user;
-- GRANT EXECUTE ON FUNCTION is_super_admin() TO app_user;

-- =============================================================================
-- VERIFICATION: Query to check RLS status
-- =============================================================================

-- Run this query to verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- =============================================================================
-- End of RLS Configuration
-- =============================================================================
