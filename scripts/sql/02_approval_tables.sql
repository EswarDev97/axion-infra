-- =============================================================================
-- MindFlow Database Migration: Approval Service Tables
-- Service: approval-service
-- Tables: approval_workflows, approval_steps, approval_instances, approval_decisions, delegation_rules
-- =============================================================================

-- Approval Workflows (workflow definitions)
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_tenant_id ON approval_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity_type ON approval_workflows(tenant_id, entity_type);

-- Approval Steps (steps within a workflow)
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    approver_type VARCHAR(30) NOT NULL,
    approver_role VARCHAR(50),
    approver_position_id UUID REFERENCES positions(id),
    use_hierarchy BOOLEAN NOT NULL DEFAULT TRUE,
    hierarchy_level INTEGER,
    timeout_hours INTEGER,
    auto_approve_on_timeout BOOLEAN NOT NULL DEFAULT FALSE,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_tenant_id ON approval_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON approval_steps(workflow_id);

-- Approval Instances (active approval requests)
CREATE TABLE IF NOT EXISTS approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    requester_id UUID NOT NULL REFERENCES users(id),
    current_step_id UUID REFERENCES approval_steps(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_instances_tenant_id ON approval_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_workflow_id ON approval_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_entity_id ON approval_instances(entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_requester_id ON approval_instances(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_status ON approval_instances(tenant_id, status);

-- Approval Decisions (decision records)
CREATE TABLE IF NOT EXISTS approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES approval_steps(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL,
    comments TEXT,
    delegated_from_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_decisions_tenant_id ON approval_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_instance_id ON approval_decisions(instance_id);

-- Delegation Rules (approval delegation configurations)
CREATE TABLE IF NOT EXISTS delegation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    delegator_id UUID NOT NULL REFERENCES users(id),
    delegate_id UUID NOT NULL REFERENCES users(id),
    workflow_id UUID REFERENCES approval_workflows(id),
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    reason VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_delegation_rules_tenant_id ON delegation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delegation_rules_delegator_id ON delegation_rules(delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegation_rules_delegate_id ON delegation_rules(delegate_id);

-- =============================================================================
-- End of Approval Service Tables
-- =============================================================================
