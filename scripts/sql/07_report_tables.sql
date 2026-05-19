-- =============================================================================
-- MindFlow Database Migration: Report Service Tables
-- Service: report-service
-- Tables: reports, report_parameters, report_executions
-- =============================================================================

-- Reports (report definitions)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    query_template TEXT NOT NULL,
    default_format VARCHAR(20) DEFAULT 'JSON',
    columns_config JSONB DEFAULT '[]',
    required_permission VARCHAR(100),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    cache_ttl_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_code ON reports(code);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(tenant_id, category);

-- Report Parameters (parameter definitions for reports)
CREATE TABLE IF NOT EXISTS report_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    param_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    default_value VARCHAR(255),
    validation_regex VARCHAR(500),
    min_value VARCHAR(100),
    max_value VARCHAR(100),
    allowed_values JSONB,
    display_order INTEGER DEFAULT 0,
    placeholder VARCHAR(255),
    help_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_parameters_report_id ON report_parameters(report_id);

-- Report Executions (execution history and results)
CREATE TABLE IF NOT EXISTS report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    executed_by UUID NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parameters JSONB DEFAULT '{}',
    format VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    row_count INTEGER,
    execution_time_ms INTEGER,
    result_file_id UUID,
    error_message TEXT,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_executions_tenant_id ON report_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_executed_by ON report_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);

-- =============================================================================
-- End of Report Service Tables
-- =============================================================================
