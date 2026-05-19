-- =============================================================================
-- MindFlow Database Migration: Expense Service Tables
-- Service: expense-service
-- Tables: expense_categories, expense_requests, expense_items, expense_receipts, payment_records
-- =============================================================================

-- Expense Categories (must be created first - referenced by expense_items)
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    max_amount DECIMAL(12,2),
    requires_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id ON expense_categories(tenant_id);

-- Expense Requests (main entity)
CREATE TABLE IF NOT EXISTS expense_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    request_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_expense_requests_tenant_id ON expense_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_employee_id ON expense_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON expense_requests(tenant_id, status);

-- Expense Items (line items within a request)
CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2),
    expense_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_items_tenant_id ON expense_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_request_id ON expense_items(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category_id ON expense_items(category_id);

-- Expense Receipts (attachments to expense requests)
CREATE TABLE IF NOT EXISTS expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    expense_item_id UUID REFERENCES expense_items(id) ON DELETE SET NULL,
    file_id UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_receipts_tenant_id ON expense_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_request_id ON expense_receipts(expense_request_id);
CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_item_id ON expense_receipts(expense_item_id);

-- Payment Records (tracks payments for approved expenses)
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    amount_paid DECIMAL(12,2) NOT NULL,
    remarks TEXT,
    processed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_records_tenant_id ON payment_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_expense_request_id ON payment_records(expense_request_id);

-- =============================================================================
-- End of Expense Service Tables
-- =============================================================================
