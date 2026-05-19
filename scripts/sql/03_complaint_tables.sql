-- =============================================================================
-- MindFlow Database Migration: Complaint Service Tables
-- Service: complaint-service
-- Tables: complaint_categories, sla_configurations, escalation_rules, complaints, complaint_actions, complaint_attachments
-- =============================================================================

-- Complaint Categories (must be created first - referenced by others)
CREATE TABLE IF NOT EXISTS complaint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES complaint_categories(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_complaint_categories_tenant_id ON complaint_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaint_categories_parent ON complaint_categories(parent_category_id);

-- SLA Configurations (SLA rules per category and severity)
CREATE TABLE IF NOT EXISTS sla_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category_id UUID REFERENCES complaint_categories(id),
    severity VARCHAR(20) NOT NULL,
    response_time_hours INTEGER NOT NULL,
    resolution_time_hours INTEGER NOT NULL,
    escalation_time_hours INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, category_id, severity)
);

CREATE INDEX IF NOT EXISTS idx_sla_configurations_tenant_id ON sla_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_configurations_category_id ON sla_configurations(category_id);

-- Escalation Rules (auto-escalation configuration)
CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category_id UUID REFERENCES complaint_categories(id),
    escalation_level INTEGER NOT NULL DEFAULT 1,
    time_threshold_hours INTEGER NOT NULL,
    escalate_to_position_id UUID REFERENCES positions(id),
    escalate_to_role VARCHAR(50),
    notification_template VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_tenant_id ON escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_category_id ON escalation_rules(category_id);

-- Complaints (main complaint records)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES complaint_categories(id),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    source_channel VARCHAR(30) NOT NULL DEFAULT 'INTERNAL',
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    complainant_name VARCHAR(255),
    complainant_contact VARCHAR(255),
    complainant_employee_id UUID REFERENCES employees(id),
    owner_employee_id UUID REFERENCES employees(id),
    assigned_at TIMESTAMPTZ,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    sla_response_due_at TIMESTAMPTZ,
    sla_resolution_due_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closure_remarks TEXT,
    reopened_count INTEGER NOT NULL DEFAULT 0,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    last_escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, complaint_number)
);

CREATE INDEX IF NOT EXISTS idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category_id ON complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_owner_employee_id ON complaints(owner_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_is_deleted ON complaints(tenant_id, is_deleted);

-- Complaint Actions (action history - append-only audit trail)
CREATE TABLE IF NOT EXISTS complaint_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    old_owner_id UUID REFERENCES employees(id),
    new_owner_id UUID REFERENCES employees(id),
    is_internal BOOLEAN NOT NULL DEFAULT TRUE,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_actions_tenant_id ON complaint_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaint_actions_complaint_id ON complaint_actions(complaint_id);

-- Complaint Attachments (file attachments)
CREATE TABLE IF NOT EXISTS complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_id UUID NOT NULL,
    attachment_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_attachments_tenant_id ON complaint_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint_id ON complaint_attachments(complaint_id);

-- =============================================================================
-- End of Complaint Service Tables
-- =============================================================================
