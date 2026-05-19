# MindFlow – Database Schema Design Document

> **Purpose**: Define the complete database schema for MindFlow Phase 1
> **SDLC Phase**: Phase 2 – Domain & Database Schema Design
> **Tasks Covered**: 2.1 through 2.9
> **Status**: COMPLETE - Product Owner Approved
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 2 – Domain & Database Schema Design |
| **SDLC Tasks** | 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md), [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) |
| **Approval Status** | COMPLETE - Product Owner Approved (2026-01-16) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Entity Inventory (Task 2.1)](#2-entity-inventory-task-21)
3. [Table Schemas (Task 2.2)](#3-table-schemas-task-22)
4. [Primary Keys (Task 2.3)](#4-primary-keys-task-23)
5. [Enums (Task 2.4)](#5-enums-task-24)
6. [Indexes and Constraints (Task 2.5)](#6-indexes-and-constraints-task-25)
7. [Row-Level Security Policies (Task 2.6)](#7-row-level-security-policies-task-26)
8. [Audit Logging Points (Task 2.7)](#8-audit-logging-points-task-27)
9. [Security Review (Task 2.8)](#9-security-review-task-28)
10. [Service-Level Schema Approval (Task 2.9)](#10-service-level-schema-approval-task-29)
11. [Dependencies](#11-dependencies)
12. [Approval Record](#12-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete database schema for MindFlow Phase 1, including:
- Entity definitions per service module
- Table structures with all columns and data types
- Primary keys using UUID with `gen_random_uuid()`
- Enums for standardized values
- Indexes and constraints for performance and integrity
- Row-Level Security (RLS) policies for multi-tenancy
- Audit logging points for compliance

### 1.2 Scope

**In Scope**:
- 10 service modules: auth, hr, task, mindmap, training, expense, complaint, approval, notification, storage
- PostgreSQL 16 with Row-Level Security
- Multi-tenancy via `tenant_id` on all tables
- Alembic migration compatibility

**Out of Scope**:
- Database migration scripts (Phase 6)
- Performance tuning (Phase 8)
- Replication configuration (Production)

### 1.3 Design Constraints

Per [TECH_STACK.md](TECH_STACK.md) and [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md):
- **Database**: PostgreSQL 16 (LOCKED)
- **Primary Keys**: UUID using `gen_random_uuid()` (MANDATORY)
- **Multi-tenancy**: `tenant_id` on all tables with RLS (MANDATORY)
- **Audit Columns**: `created_at`, `updated_at`, `created_by`, `updated_by` on all tables (MANDATORY)
- **Soft Delete**: `is_deleted`, `deleted_at`, `deletion_reason` for PII entities (MANDATORY)

### 1.4 Common Column Standards

All tables MUST include the following columns:

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `tenant_id` | UUID | NOT NULL, FK to tenants(id) | Tenant isolation |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `created_by` | UUID | NOT NULL, FK to users(id) | User who created |
| `updated_by` | UUID | NOT NULL, FK to users(id) | User who last updated |

**PII Entities** additionally include:

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | NULL | Deletion timestamp |
| `deletion_reason` | VARCHAR(255) | NULL | Reason for deletion |

---

## 2. Entity Inventory (Task 2.1)

### 2.1 Entity Count Summary

| Service Module | Entity Count | Tables |
|----------------|--------------|--------|
| auth-module | 6 | tenants, users, roles, permissions, role_permissions, user_tenant_roles, sessions |
| hr-module | 9 | employees, positions, departments, attendance_records, leave_requests, leave_types, leave_balances, payroll_references, candidates |
| task-module | 6 | tasks, task_assignees, task_comments, task_attachments, task_dependencies, task_statuses |
| mindmap-module | 4 | mind_maps, mind_map_nodes, mind_map_templates, node_attachments |
| training-module | 10 | courses, training_sessions, enrollments, training_attendance, exams, exam_questions, exam_attempts, exam_responses, certificates, training_content |
| expense-module | 5 | expense_requests, expense_items, expense_categories, expense_receipts, payment_records |
| complaint-module | 6 | complaints, complaint_categories, complaint_actions, sla_configurations, escalation_rules, complaint_attachments |
| approval-module | 5 | approval_workflows, approval_steps, approval_instances, approval_decisions, delegation_rules |
| notification-module | 2 | notifications, notification_preferences |
| storage-module | 1 | file_metadata |
| **TOTAL** | **54** | |

### 2.2 auth-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `tenants` | Tenant organizations | No | No |
| `users` | User accounts for authentication | Yes | Yes |
| `roles` | System role definitions | No | No |
| `permissions` | Permission definitions | No | No |
| `role_permissions` | Role-permission mappings | No | No |
| `user_tenant_roles` | User role assignments per tenant | No | No |
| `sessions` | Active user sessions | No | No |

### 2.3 hr-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `employees` | Employee profiles | Yes | Yes |
| `positions` | Organizational positions | No | No |
| `departments` | Department definitions | No | No |
| `attendance_records` | Daily attendance | Yes | No |
| `leave_requests` | Leave applications | Yes | Yes |
| `leave_types` | Leave type definitions | No | No |
| `leave_balances` | Employee leave balances | No | No |
| `payroll_references` | Salary reference data | Yes (RESTRICTED) | Yes |
| `candidates` | Recruitment candidates | Yes | Yes |

### 2.4 task-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `tasks` | Task records | No | Yes |
| `task_assignees` | Task assignments | No | No |
| `task_comments` | Task comments | No | Yes |
| `task_attachments` | Task file attachments | No | No |
| `task_dependencies` | Task dependency links | No | No |
| `task_statuses` | Task status history | No | No |

### 2.5 mindmap-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `mind_maps` | Mind map records | No | Yes |
| `mind_map_nodes` | Mind map nodes | No | Yes |
| `mind_map_templates` | Mind map templates | No | No |
| `node_attachments` | Node file attachments | No | No |

### 2.6 training-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `courses` | Training courses | No | Yes |
| `training_sessions` | Scheduled sessions | No | Yes |
| `enrollments` | Course enrollments | Yes | Yes |
| `training_attendance` | Session attendance | Yes | No |
| `exams` | Exam definitions | No | No |
| `exam_questions` | Question bank | No | No |
| `exam_attempts` | Exam attempts | Yes | No |
| `exam_responses` | Attempt responses | No | No |
| `certificates` | Completion certificates | Yes | No |
| `training_content` | Course content metadata | No | No |

### 2.7 expense-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `expense_requests` | Expense claims | Yes | Yes |
| `expense_items` | Line items per expense | No | No |
| `expense_categories` | Expense category definitions | No | No |
| `expense_receipts` | Receipt attachments | No | No |
| `payment_records` | Payment tracking | No | No |

### 2.8 complaint-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `complaints` | Complaint records | Yes | Yes |
| `complaint_categories` | Category definitions | No | No |
| `complaint_actions` | Action history | No | No |
| `sla_configurations` | SLA rules | No | No |
| `escalation_rules` | Escalation definitions | No | No |
| `complaint_attachments` | Complaint attachments | No | No |

### 2.9 approval-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `approval_workflows` | Workflow definitions | No | No |
| `approval_steps` | Workflow steps | No | No |
| `approval_instances` | Active approval requests | No | No |
| `approval_decisions` | Approval/rejection records | No | No |
| `delegation_rules` | Approval delegation | No | No |

### 2.10 notification-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `notifications` | Notification records | No | No |
| `notification_preferences` | User preferences | No | No |

### 2.11 storage-module Entities

| Entity | Description | PII | Soft Delete |
|--------|-------------|-----|-------------|
| `file_metadata` | File metadata registry | No | Yes |

---

## 3. Table Schemas (Task 2.2)

### 3.1 auth-module Tables

#### 3.1.1 tenants

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Tenant organizations - multi-tenancy root';
```

#### 3.1.2 users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_reason VARCHAR(255),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, email)
);

COMMENT ON TABLE users IS 'User accounts for authentication - PII entity';
```

#### 3.1.3 roles

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE roles IS 'RBAC role definitions';
```

#### 3.1.4 permissions

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_scope VARCHAR(50) NOT NULL DEFAULT 'OWN',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Permission definitions - system-wide, not tenant-scoped';
```

#### 3.1.5 role_permissions

```sql
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Role-permission assignments';
```

#### 3.1.6 user_tenant_roles

```sql
CREATE TABLE user_tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID NOT NULL REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, role_id)
);

COMMENT ON TABLE user_tenant_roles IS 'User role assignments per tenant';
```

#### 3.1.7 sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    refresh_token_jti UUID NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100)
);

COMMENT ON TABLE sessions IS 'Active user sessions for refresh token tracking';
```

### 3.2 hr-module Tables

#### 3.2.1 departments

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE departments IS 'Department definitions';
```

#### 3.2.2 positions

```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    department_id UUID REFERENCES departments(id),
    parent_position_id UUID REFERENCES positions(id),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE positions IS 'Organizational positions with hierarchy';
```

#### 3.2.3 employees

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    position_id UUID NOT NULL REFERENCES positions(id),
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES employees(id),
    date_of_joining DATE NOT NULL,
    date_of_exit DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, employee_code),
    UNIQUE(tenant_id, email)
);

COMMENT ON TABLE employees IS 'Employee profiles - PII entity with soft delete';
```

#### 3.2.4 leave_types

```sql
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    default_balance INTEGER NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE leave_types IS 'Leave type definitions';
```

#### 3.2.5 leave_balances

```sql
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    opening_balance DECIMAL(5,2) NOT NULL DEFAULT 0,
    accrued DECIMAL(5,2) NOT NULL DEFAULT 0,
    used DECIMAL(5,2) NOT NULL DEFAULT 0,
    adjusted DECIMAL(5,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(5,2) GENERATED ALWAYS AS (opening_balance + accrued - used + adjusted) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, employee_id, leave_type_id, year)
);

COMMENT ON TABLE leave_balances IS 'Employee leave balances per type per year';
```

#### 3.2.6 leave_requests

```sql
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days_count DECIMAL(5,2) NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE leave_requests IS 'Leave applications - PII entity with soft delete';
```

#### 3.2.7 attendance_records

```sql
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    check_in_time TIME,
    check_out_time TIME,
    remarks TEXT,
    marked_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, employee_id, date)
);

COMMENT ON TABLE attendance_records IS 'Daily attendance records';
```

#### 3.2.8 payroll_references

```sql
CREATE TABLE payroll_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    effective_from DATE NOT NULL,
    effective_to DATE,
    basic_pay_encrypted TEXT NOT NULL,
    allowances_encrypted TEXT,
    deductions_encrypted TEXT,
    gross_salary_encrypted TEXT NOT NULL,
    net_salary_encrypted TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE payroll_references IS 'Payroll reference data - RESTRICTED, AES-256-GCM encrypted';
```

#### 3.2.9 candidates

```sql
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    applied_position_id UUID NOT NULL REFERENCES positions(id),
    status VARCHAR(30) NOT NULL DEFAULT 'APPLIED',
    resume_file_id UUID,
    interview_date DATE,
    interview_remarks TEXT,
    offer_date DATE,
    joining_date DATE,
    converted_employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE candidates IS 'Recruitment candidates - PII entity with soft delete';
```

### 3.3 task-module Tables

#### 3.3.1 task_statuses

```sql
CREATE TABLE task_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6B7280',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE task_statuses IS 'Task status definitions';
```

#### 3.3.2 tasks

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES task_statuses(id),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    parent_task_id UUID REFERENCES tasks(id),
    origin_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    origin_id UUID,
    expected_completion_date DATE,
    actual_completion_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE tasks IS 'Task records - soft delete enabled';
```

#### 3.3.3 task_assignees

```sql
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID NOT NULL REFERENCES users(id),
    unassigned_at TIMESTAMPTZ,
    unassigned_by UUID REFERENCES users(id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, task_id, employee_id)
);

COMMENT ON TABLE task_assignees IS 'Task-employee assignments';
```

#### 3.3.4 task_comments

```sql
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    parent_comment_id UUID REFERENCES task_comments(id),
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE task_comments IS 'Task comments with threading support';
```

#### 3.3.5 task_attachments

```sql
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    file_id UUID NOT NULL,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attached_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE task_attachments IS 'Task file attachments - references file_metadata';
```

#### 3.3.6 task_dependencies

```sql
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    task_id UUID NOT NULL REFERENCES tasks(id),
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id),
    dependency_type VARCHAR(30) NOT NULL DEFAULT 'FINISH_TO_START',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    UNIQUE(tenant_id, task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

COMMENT ON TABLE task_dependencies IS 'Task dependency relationships';
```

### 3.4 mindmap-module Tables

#### 3.4.1 mind_map_templates

```sql
CREATE TABLE mind_map_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    thumbnail_url VARCHAR(500),
    template_data JSONB NOT NULL,
    is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);

COMMENT ON TABLE mind_map_templates IS 'Mind map template definitions';
```

#### 3.4.2 mind_maps

```sql
CREATE TABLE mind_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    template_id UUID REFERENCES mind_map_templates(id),
    theme_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE mind_maps IS 'Mind map records - soft delete enabled';
```

#### 3.4.3 mind_map_nodes

```sql
CREATE TABLE mind_map_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    mind_map_id UUID NOT NULL REFERENCES mind_maps(id),
    parent_node_id UUID REFERENCES mind_map_nodes(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    node_type VARCHAR(30) NOT NULL DEFAULT 'IDEA',
    linked_task_id UUID REFERENCES tasks(id),
    x_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    y_position DECIMAL(10,2) NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    visual_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE mind_map_nodes IS 'Mind map nodes with positioning - soft delete enabled';
```

#### 3.4.4 node_attachments

```sql
CREATE TABLE node_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    node_id UUID NOT NULL REFERENCES mind_map_nodes(id),
    file_id UUID NOT NULL,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attached_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE node_attachments IS 'Mind map node attachments - references file_metadata';
```

### 3.5 training-module Tables

#### 3.5.1 courses

```sql
CREATE TABLE courses (
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
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    category VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE courses IS 'Training course definitions - soft delete enabled';
```

#### 3.5.2 training_content

```sql
CREATE TABLE training_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
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

COMMENT ON TABLE training_content IS 'Course content items (PDFs, videos, links)';
```

#### 3.5.3 training_sessions

```sql
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    trainer_employee_id UUID NOT NULL REFERENCES employees(id),
    max_participants INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE training_sessions IS 'Scheduled classroom sessions - soft delete enabled';
```

#### 3.5.4 enrollments

```sql
CREATE TABLE enrollments (
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

COMMENT ON TABLE enrollments IS 'Course enrollments - PII, soft delete enabled';
```

#### 3.5.5 training_attendance

```sql
CREATE TABLE training_attendance (
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

COMMENT ON TABLE training_attendance IS 'Training session attendance - PII';
```

#### 3.5.6 exams

```sql
CREATE TABLE exams (
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

COMMENT ON TABLE exams IS 'Exam definitions';
```

#### 3.5.7 exam_questions

```sql
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    exam_id UUID NOT NULL REFERENCES exams(id),
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

COMMENT ON TABLE exam_questions IS 'Question bank for exams';
```

#### 3.5.8 exam_attempts

```sql
CREATE TABLE exam_attempts (
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

COMMENT ON TABLE exam_attempts IS 'Exam attempt records - PII';
```

#### 3.5.9 exam_responses

```sql
CREATE TABLE exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id),
    question_id UUID NOT NULL REFERENCES exam_questions(id),
    selected_answer JSONB,
    is_correct BOOLEAN,
    points_earned INTEGER NOT NULL DEFAULT 0,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exam_responses IS 'Individual question responses';
```

#### 3.5.10 certificates

```sql
CREATE TABLE certificates (
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

COMMENT ON TABLE certificates IS 'Training completion certificates - PII';
```

### 3.6 expense-module Tables

#### 3.6.1 expense_categories

```sql
CREATE TABLE expense_categories (
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

COMMENT ON TABLE expense_categories IS 'Expense category definitions';
```

#### 3.6.2 expense_requests

```sql
CREATE TABLE expense_requests (
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

COMMENT ON TABLE expense_requests IS 'Expense claims - PII, soft delete enabled';
```

#### 3.6.3 expense_items

```sql
CREATE TABLE expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
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

COMMENT ON TABLE expense_items IS 'Line items per expense request';
```

#### 3.6.4 expense_receipts

```sql
CREATE TABLE expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id),
    expense_item_id UUID REFERENCES expense_items(id),
    file_id UUID NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE expense_receipts IS 'Receipt attachments - references file_metadata';
```

#### 3.6.5 payment_records

```sql
CREATE TABLE payment_records (
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

COMMENT ON TABLE payment_records IS 'Payment tracking for approved expenses';
```

### 3.7 complaint-module Tables

#### 3.7.1 complaint_categories

```sql
CREATE TABLE complaint_categories (
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

COMMENT ON TABLE complaint_categories IS 'Complaint category definitions';
```

#### 3.7.2 sla_configurations

```sql
CREATE TABLE sla_configurations (
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

COMMENT ON TABLE sla_configurations IS 'SLA rules per category and severity';
```

#### 3.7.3 escalation_rules

```sql
CREATE TABLE escalation_rules (
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

COMMENT ON TABLE escalation_rules IS 'Auto-escalation configuration';
```

#### 3.7.4 complaints

```sql
CREATE TABLE complaints (
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

COMMENT ON TABLE complaints IS 'Complaint records - PII, soft delete enabled';
```

#### 3.7.5 complaint_actions

```sql
CREATE TABLE complaint_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id),
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

COMMENT ON TABLE complaint_actions IS 'Complaint action history - append-only';
```

#### 3.7.6 complaint_attachments

```sql
CREATE TABLE complaint_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    complaint_id UUID NOT NULL REFERENCES complaints(id),
    file_id UUID NOT NULL,
    attachment_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE complaint_attachments IS 'Complaint attachments - references file_metadata';
```

### 3.8 approval-module Tables

#### 3.8.1 approval_workflows

```sql
CREATE TABLE approval_workflows (
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

COMMENT ON TABLE approval_workflows IS 'Approval workflow definitions';
```

#### 3.8.2 approval_steps

```sql
CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id),
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

COMMENT ON TABLE approval_steps IS 'Workflow step definitions';
```

#### 3.8.3 approval_instances

```sql
CREATE TABLE approval_instances (
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

COMMENT ON TABLE approval_instances IS 'Active approval requests';
```

#### 3.8.4 approval_decisions

```sql
CREATE TABLE approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    instance_id UUID NOT NULL REFERENCES approval_instances(id),
    step_id UUID NOT NULL REFERENCES approval_steps(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL,
    comments TEXT,
    delegated_from_id UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE approval_decisions IS 'Approval/rejection decisions';
```

#### 3.8.5 delegation_rules

```sql
CREATE TABLE delegation_rules (
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

COMMENT ON TABLE delegation_rules IS 'Approval delegation configurations';
```

### 3.9 notification-module Tables

#### 3.9.1 notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url VARCHAR(500),
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notification records';
```

#### 3.9.2 notification_preferences

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, notification_type)
);

COMMENT ON TABLE notification_preferences IS 'User notification preferences';
```

### 3.10 storage-module Tables

#### 3.10.1 file_metadata

```sql
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    original_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    upload_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    virus_scan_status VARCHAR(20) DEFAULT 'PENDING',
    virus_scan_result TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deletion_reason VARCHAR(255)
);

COMMENT ON TABLE file_metadata IS 'File metadata registry - soft delete enabled';
```

### 3.11 Audit Tables

#### 3.11.1 audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    correlation_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail - 180 days online, 7 years archived';
```

---

## 4. Primary Keys (Task 2.3)

### 4.1 UUID Primary Key Standard

All tables use UUID primary keys generated using PostgreSQL's `gen_random_uuid()` function.

**Rationale**:
- Globally unique across distributed systems
- No sequential guessing attacks
- Supports future microservice extraction
- Per [TECH_STACK.md](TECH_STACK.md) requirement

**Implementation**:

```sql
-- UUID extension (included in PostgreSQL 16)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Primary key pattern for all tables
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### 4.2 Primary Key Summary by Table

| Module | Table | Primary Key |
|--------|-------|-------------|
| auth | tenants | `id UUID DEFAULT gen_random_uuid()` |
| auth | users | `id UUID DEFAULT gen_random_uuid()` |
| auth | roles | `id UUID DEFAULT gen_random_uuid()` |
| auth | permissions | `id UUID DEFAULT gen_random_uuid()` |
| auth | role_permissions | `id UUID DEFAULT gen_random_uuid()` |
| auth | user_tenant_roles | `id UUID DEFAULT gen_random_uuid()` |
| auth | sessions | `id UUID DEFAULT gen_random_uuid()` |
| hr | departments | `id UUID DEFAULT gen_random_uuid()` |
| hr | positions | `id UUID DEFAULT gen_random_uuid()` |
| hr | employees | `id UUID DEFAULT gen_random_uuid()` |
| hr | leave_types | `id UUID DEFAULT gen_random_uuid()` |
| hr | leave_balances | `id UUID DEFAULT gen_random_uuid()` |
| hr | leave_requests | `id UUID DEFAULT gen_random_uuid()` |
| hr | attendance_records | `id UUID DEFAULT gen_random_uuid()` |
| hr | payroll_references | `id UUID DEFAULT gen_random_uuid()` |
| hr | candidates | `id UUID DEFAULT gen_random_uuid()` |
| task | task_statuses | `id UUID DEFAULT gen_random_uuid()` |
| task | tasks | `id UUID DEFAULT gen_random_uuid()` |
| task | task_assignees | `id UUID DEFAULT gen_random_uuid()` |
| task | task_comments | `id UUID DEFAULT gen_random_uuid()` |
| task | task_attachments | `id UUID DEFAULT gen_random_uuid()` |
| task | task_dependencies | `id UUID DEFAULT gen_random_uuid()` |
| mindmap | mind_map_templates | `id UUID DEFAULT gen_random_uuid()` |
| mindmap | mind_maps | `id UUID DEFAULT gen_random_uuid()` |
| mindmap | mind_map_nodes | `id UUID DEFAULT gen_random_uuid()` |
| mindmap | node_attachments | `id UUID DEFAULT gen_random_uuid()` |
| training | courses | `id UUID DEFAULT gen_random_uuid()` |
| training | training_content | `id UUID DEFAULT gen_random_uuid()` |
| training | training_sessions | `id UUID DEFAULT gen_random_uuid()` |
| training | enrollments | `id UUID DEFAULT gen_random_uuid()` |
| training | training_attendance | `id UUID DEFAULT gen_random_uuid()` |
| training | exams | `id UUID DEFAULT gen_random_uuid()` |
| training | exam_questions | `id UUID DEFAULT gen_random_uuid()` |
| training | exam_attempts | `id UUID DEFAULT gen_random_uuid()` |
| training | exam_responses | `id UUID DEFAULT gen_random_uuid()` |
| training | certificates | `id UUID DEFAULT gen_random_uuid()` |
| expense | expense_categories | `id UUID DEFAULT gen_random_uuid()` |
| expense | expense_requests | `id UUID DEFAULT gen_random_uuid()` |
| expense | expense_items | `id UUID DEFAULT gen_random_uuid()` |
| expense | expense_receipts | `id UUID DEFAULT gen_random_uuid()` |
| expense | payment_records | `id UUID DEFAULT gen_random_uuid()` |
| complaint | complaint_categories | `id UUID DEFAULT gen_random_uuid()` |
| complaint | sla_configurations | `id UUID DEFAULT gen_random_uuid()` |
| complaint | escalation_rules | `id UUID DEFAULT gen_random_uuid()` |
| complaint | complaints | `id UUID DEFAULT gen_random_uuid()` |
| complaint | complaint_actions | `id UUID DEFAULT gen_random_uuid()` |
| complaint | complaint_attachments | `id UUID DEFAULT gen_random_uuid()` |
| approval | approval_workflows | `id UUID DEFAULT gen_random_uuid()` |
| approval | approval_steps | `id UUID DEFAULT gen_random_uuid()` |
| approval | approval_instances | `id UUID DEFAULT gen_random_uuid()` |
| approval | approval_decisions | `id UUID DEFAULT gen_random_uuid()` |
| approval | delegation_rules | `id UUID DEFAULT gen_random_uuid()` |
| notification | notifications | `id UUID DEFAULT gen_random_uuid()` |
| notification | notification_preferences | `id UUID DEFAULT gen_random_uuid()` |
| storage | file_metadata | `id UUID DEFAULT gen_random_uuid()` |
| audit | audit_logs | `id UUID DEFAULT gen_random_uuid()` |

---

## 5. Enums (Task 2.4)

### 5.1 PostgreSQL ENUM Types

```sql
-- Tenant Status
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- Employee Status
CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'EXITED');

-- Employment Type
CREATE TYPE employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- Attendance Status
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND');

-- Leave Request Status
CREATE TYPE leave_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN');

-- Task Priority
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Task Origin Type
CREATE TYPE task_origin_type AS ENUM ('MANUAL', 'MIND_MAP', 'COMPLAINT', 'TRAINING', 'EXPENSE');

-- Mind Map Status
CREATE TYPE mind_map_status AS ENUM ('ACTIVE', 'ARCHIVED');

-- Mind Map Node Type
CREATE TYPE node_type AS ENUM ('IDEA', 'ACTIVITY', 'REFERENCE', 'LINKED_TASK');

-- Course Status
CREATE TYPE course_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- Training Content Type
CREATE TYPE training_content_type AS ENUM ('PDF', 'PPT', 'VIDEO', 'LINK', 'DOCUMENT');

-- Training Session Status
CREATE TYPE training_session_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Enrollment Status
CREATE TYPE enrollment_status AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED', 'FAILED');

-- Exam Question Type
CREATE TYPE question_type AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'MULTI_SELECT');

-- Exam Attempt Status
CREATE TYPE exam_attempt_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT', 'GRADED');

-- Expense Request Status
CREATE TYPE expense_request_status AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- Payment Mode
CREATE TYPE payment_mode AS ENUM ('BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI', 'OTHER');

-- Complaint Severity
CREATE TYPE complaint_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Complaint Source Channel
CREATE TYPE complaint_source AS ENUM ('INTERNAL', 'PHONE', 'EMAIL', 'WHATSAPP', 'WALK_IN', 'OTHER');

-- Complaint Status
CREATE TYPE complaint_status AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_INFO', 'RESOLVED', 'CLOSED', 'REOPENED');

-- Complaint Action Type
CREATE TYPE complaint_action_type AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGE', 'ESCALATED', 'COMMENT', 'RESOLUTION', 'CLOSURE', 'REOPENED');

-- Approval Instance Status
CREATE TYPE approval_status AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'TIMED_OUT');

-- Approval Decision
CREATE TYPE approval_decision AS ENUM ('APPROVED', 'REJECTED', 'DELEGATED', 'SKIPPED');

-- Approver Type
CREATE TYPE approver_type AS ENUM ('ROLE', 'POSITION', 'HIERARCHY', 'SPECIFIC_USER');

-- Notification Priority
CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- File Upload Status
CREATE TYPE upload_status AS ENUM ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED');

-- Virus Scan Status
CREATE TYPE virus_scan_status AS ENUM ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'ERROR');

-- Audit Action Type
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ESCALATE', 'ASSIGN', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE');

-- Permission Resource Scope
CREATE TYPE resource_scope AS ENUM ('OWN', 'SUBORDINATES', 'DEPARTMENT', 'ALL');

-- Task Dependency Type
CREATE TYPE dependency_type AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- Candidate Status
CREATE TYPE candidate_status AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEWED', 'SELECTED', 'REJECTED', 'WITHDRAWN', 'HIRED');
```

### 5.2 Enum Usage Summary

| Enum Type | Used In Tables | Values |
|-----------|----------------|--------|
| `tenant_status` | tenants | ACTIVE, SUSPENDED, INACTIVE |
| `employee_status` | employees | ACTIVE, INACTIVE, ON_LEAVE, EXITED |
| `employment_type` | employees | FULL_TIME, PART_TIME, CONTRACT, INTERN |
| `attendance_status` | attendance_records, training_attendance | PRESENT, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, WEEKEND |
| `leave_request_status` | leave_requests | PENDING, APPROVED, REJECTED, CANCELLED, WITHDRAWN |
| `task_priority` | tasks | LOW, MEDIUM, HIGH, CRITICAL |
| `task_origin_type` | tasks | MANUAL, MIND_MAP, COMPLAINT, TRAINING, EXPENSE |
| `mind_map_status` | mind_maps | ACTIVE, ARCHIVED |
| `node_type` | mind_map_nodes | IDEA, ACTIVITY, REFERENCE, LINKED_TASK |
| `course_status` | courses | DRAFT, ACTIVE, ARCHIVED |
| `training_content_type` | training_content | PDF, PPT, VIDEO, LINK, DOCUMENT |
| `training_session_status` | training_sessions | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| `enrollment_status` | enrollments | ENROLLED, IN_PROGRESS, COMPLETED, DROPPED, FAILED |
| `question_type` | exam_questions | MCQ, TRUE_FALSE, FILL_BLANK, MULTI_SELECT |
| `exam_attempt_status` | exam_attempts | IN_PROGRESS, SUBMITTED, TIMED_OUT, GRADED |
| `expense_request_status` | expense_requests | DRAFT, SUBMITTED, MANAGER_APPROVED, FINANCE_APPROVED, PAID, REJECTED, CANCELLED |
| `payment_mode` | payment_records | BANK_TRANSFER, CASH, CHEQUE, UPI, OTHER |
| `complaint_severity` | complaints, sla_configurations | LOW, MEDIUM, HIGH, CRITICAL |
| `complaint_source` | complaints | INTERNAL, PHONE, EMAIL, WHATSAPP, WALK_IN, OTHER |
| `complaint_status` | complaints | NEW, ASSIGNED, IN_PROGRESS, WAITING_INFO, RESOLVED, CLOSED, REOPENED |
| `complaint_action_type` | complaint_actions | CREATED, ASSIGNED, REASSIGNED, STATUS_CHANGE, ESCALATED, COMMENT, RESOLUTION, CLOSURE, REOPENED |
| `approval_status` | approval_instances | PENDING, IN_PROGRESS, APPROVED, REJECTED, CANCELLED, TIMED_OUT |
| `approval_decision` | approval_decisions | APPROVED, REJECTED, DELEGATED, SKIPPED |
| `approver_type` | approval_steps | ROLE, POSITION, HIERARCHY, SPECIFIC_USER |
| `notification_priority` | notifications | LOW, NORMAL, HIGH, URGENT |
| `upload_status` | file_metadata | PENDING, UPLOADING, COMPLETED, FAILED |
| `virus_scan_status` | file_metadata | PENDING, SCANNING, CLEAN, INFECTED, ERROR |
| `audit_action` | audit_logs | CREATE, UPDATE, DELETE, APPROVE, REJECT, ESCALATE, ASSIGN, LOGIN, LOGOUT, PASSWORD_CHANGE |
| `resource_scope` | permissions | OWN, SUBORDINATES, DEPARTMENT, ALL |
| `dependency_type` | task_dependencies | FINISH_TO_START, START_TO_START, FINISH_TO_FINISH, START_TO_FINISH |
| `candidate_status` | candidates | APPLIED, SCREENING, INTERVIEWED, SELECTED, REJECTED, WITHDRAWN, HIRED |

---

## 6. Indexes and Constraints (Task 2.5)

### 6.1 Index Strategy

**Principles**:
1. Every foreign key gets an index
2. Columns used in WHERE clauses get indexes
3. Composite indexes for common query patterns
4. Partial indexes for filtered queries
5. Tenant_id always first in composite indexes

### 6.2 Core Indexes

```sql
-- =====================================================
-- auth-module Indexes
-- =====================================================

-- users
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_is_active ON users(tenant_id, is_active) WHERE is_deleted = FALSE;

-- roles
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_code ON roles(tenant_id, code);

-- user_tenant_roles
CREATE INDEX idx_user_tenant_roles_user_id ON user_tenant_roles(tenant_id, user_id);
CREATE INDEX idx_user_tenant_roles_role_id ON user_tenant_roles(tenant_id, role_id);

-- sessions
CREATE INDEX idx_sessions_user_id ON sessions(tenant_id, user_id);
CREATE INDEX idx_sessions_refresh_token_jti ON sessions(refresh_token_jti);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE is_revoked = FALSE;

-- =====================================================
-- hr-module Indexes
-- =====================================================

-- employees
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_employees_user_id ON employees(tenant_id, user_id);
CREATE INDEX idx_employees_manager_id ON employees(tenant_id, manager_id);
CREATE INDEX idx_employees_position_id ON employees(tenant_id, position_id);
CREATE INDEX idx_employees_department_id ON employees(tenant_id, department_id);
CREATE INDEX idx_employees_status ON employees(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_employee_code ON employees(tenant_id, employee_code);

-- positions
CREATE INDEX idx_positions_tenant_id ON positions(tenant_id);
CREATE INDEX idx_positions_parent_id ON positions(tenant_id, parent_position_id);
CREATE INDEX idx_positions_department_id ON positions(tenant_id, department_id);

-- departments
CREATE INDEX idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX idx_departments_parent_id ON departments(tenant_id, parent_department_id);

-- leave_requests
CREATE INDEX idx_leave_requests_tenant_id ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(tenant_id, from_date, to_date);

-- attendance_records
CREATE INDEX idx_attendance_tenant_id ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_employee_date ON attendance_records(tenant_id, employee_id, date);

-- payroll_references
CREATE INDEX idx_payroll_tenant_id ON payroll_references(tenant_id);
CREATE INDEX idx_payroll_employee_id ON payroll_references(tenant_id, employee_id);

-- candidates
CREATE INDEX idx_candidates_tenant_id ON candidates(tenant_id);
CREATE INDEX idx_candidates_status ON candidates(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_candidates_position_id ON candidates(tenant_id, applied_position_id);

-- =====================================================
-- task-module Indexes
-- =====================================================

-- tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_status_id ON tasks(tenant_id, status_id);
CREATE INDEX idx_tasks_parent_id ON tasks(tenant_id, parent_task_id);
CREATE INDEX idx_tasks_priority ON tasks(tenant_id, priority);
CREATE INDEX idx_tasks_created_by ON tasks(tenant_id, created_by);
CREATE INDEX idx_tasks_ecd ON tasks(tenant_id, expected_completion_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_tasks_origin ON tasks(tenant_id, origin_type, origin_id);

-- task_assignees
CREATE INDEX idx_task_assignees_tenant_id ON task_assignees(tenant_id);
CREATE INDEX idx_task_assignees_task_id ON task_assignees(tenant_id, task_id);
CREATE INDEX idx_task_assignees_employee_id ON task_assignees(tenant_id, employee_id);

-- task_comments
CREATE INDEX idx_task_comments_tenant_id ON task_comments(tenant_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(tenant_id, task_id);

-- task_dependencies
CREATE INDEX idx_task_deps_tenant_id ON task_dependencies(tenant_id);
CREATE INDEX idx_task_deps_task_id ON task_dependencies(tenant_id, task_id);
CREATE INDEX idx_task_deps_depends_on ON task_dependencies(tenant_id, depends_on_task_id);

-- =====================================================
-- mindmap-module Indexes
-- =====================================================

-- mind_maps
CREATE INDEX idx_mind_maps_tenant_id ON mind_maps(tenant_id);
CREATE INDEX idx_mind_maps_created_by ON mind_maps(tenant_id, created_by);
CREATE INDEX idx_mind_maps_status ON mind_maps(tenant_id, status) WHERE is_deleted = FALSE;

-- mind_map_nodes
CREATE INDEX idx_nodes_tenant_id ON mind_map_nodes(tenant_id);
CREATE INDEX idx_nodes_mind_map_id ON mind_map_nodes(tenant_id, mind_map_id);
CREATE INDEX idx_nodes_parent_id ON mind_map_nodes(tenant_id, parent_node_id);
CREATE INDEX idx_nodes_linked_task ON mind_map_nodes(tenant_id, linked_task_id) WHERE linked_task_id IS NOT NULL;

-- =====================================================
-- training-module Indexes
-- =====================================================

-- courses
CREATE INDEX idx_courses_tenant_id ON courses(tenant_id);
CREATE INDEX idx_courses_status ON courses(tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_courses_mandatory ON courses(tenant_id, is_mandatory) WHERE is_mandatory = TRUE;

-- training_sessions
CREATE INDEX idx_sessions_tenant_id ON training_sessions(tenant_id);
CREATE INDEX idx_sessions_course_id ON training_sessions(tenant_id, course_id);
CREATE INDEX idx_sessions_trainer_id ON training_sessions(tenant_id, trainer_employee_id);
CREATE INDEX idx_sessions_date ON training_sessions(tenant_id, session_date);

-- enrollments
CREATE INDEX idx_enrollments_tenant_id ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(tenant_id, course_id);
CREATE INDEX idx_enrollments_employee_id ON enrollments(tenant_id, employee_id);
CREATE INDEX idx_enrollments_status ON enrollments(tenant_id, status);

-- training_attendance
CREATE INDEX idx_training_att_tenant_id ON training_attendance(tenant_id);
CREATE INDEX idx_training_att_session_id ON training_attendance(tenant_id, session_id);
CREATE INDEX idx_training_att_employee_id ON training_attendance(tenant_id, employee_id);

-- exam_attempts
CREATE INDEX idx_exam_attempts_tenant_id ON exam_attempts(tenant_id);
CREATE INDEX idx_exam_attempts_exam_id ON exam_attempts(tenant_id, exam_id);
CREATE INDEX idx_exam_attempts_employee_id ON exam_attempts(tenant_id, employee_id);
CREATE INDEX idx_exam_attempts_enrollment_id ON exam_attempts(tenant_id, enrollment_id);

-- certificates
CREATE INDEX idx_certificates_tenant_id ON certificates(tenant_id);
CREATE INDEX idx_certificates_employee_id ON certificates(tenant_id, employee_id);
CREATE INDEX idx_certificates_course_id ON certificates(tenant_id, course_id);

-- =====================================================
-- expense-module Indexes
-- =====================================================

-- expense_requests
CREATE INDEX idx_expense_req_tenant_id ON expense_requests(tenant_id);
CREATE INDEX idx_expense_req_employee_id ON expense_requests(tenant_id, employee_id);
CREATE INDEX idx_expense_req_status ON expense_requests(tenant_id, status);
CREATE INDEX idx_expense_req_date ON expense_requests(tenant_id, expense_date);

-- expense_items
CREATE INDEX idx_expense_items_tenant_id ON expense_items(tenant_id);
CREATE INDEX idx_expense_items_request_id ON expense_items(tenant_id, expense_request_id);
CREATE INDEX idx_expense_items_category_id ON expense_items(tenant_id, category_id);

-- payment_records
CREATE INDEX idx_payment_rec_tenant_id ON payment_records(tenant_id);
CREATE INDEX idx_payment_rec_request_id ON payment_records(tenant_id, expense_request_id);

-- =====================================================
-- complaint-module Indexes
-- =====================================================

-- complaints
CREATE INDEX idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX idx_complaints_category_id ON complaints(tenant_id, category_id);
CREATE INDEX idx_complaints_status ON complaints(tenant_id, status);
CREATE INDEX idx_complaints_severity ON complaints(tenant_id, severity);
CREATE INDEX idx_complaints_owner_id ON complaints(tenant_id, owner_employee_id);
CREATE INDEX idx_complaints_sla_due ON complaints(tenant_id, sla_resolution_due_at) WHERE status NOT IN ('RESOLVED', 'CLOSED');
CREATE INDEX idx_complaints_complainant_employee ON complaints(tenant_id, complainant_employee_id) WHERE complainant_employee_id IS NOT NULL;

-- complaint_actions
CREATE INDEX idx_complaint_actions_tenant_id ON complaint_actions(tenant_id);
CREATE INDEX idx_complaint_actions_complaint_id ON complaint_actions(tenant_id, complaint_id);

-- sla_configurations
CREATE INDEX idx_sla_config_tenant_id ON sla_configurations(tenant_id);
CREATE INDEX idx_sla_config_category_severity ON sla_configurations(tenant_id, category_id, severity);

-- =====================================================
-- approval-module Indexes
-- =====================================================

-- approval_instances
CREATE INDEX idx_approval_inst_tenant_id ON approval_instances(tenant_id);
CREATE INDEX idx_approval_inst_workflow_id ON approval_instances(tenant_id, workflow_id);
CREATE INDEX idx_approval_inst_entity ON approval_instances(tenant_id, entity_type, entity_id);
CREATE INDEX idx_approval_inst_requester ON approval_instances(tenant_id, requester_id);
CREATE INDEX idx_approval_inst_status ON approval_instances(tenant_id, status);

-- approval_decisions
CREATE INDEX idx_approval_dec_tenant_id ON approval_decisions(tenant_id);
CREATE INDEX idx_approval_dec_instance_id ON approval_decisions(tenant_id, instance_id);
CREATE INDEX idx_approval_dec_approver_id ON approval_decisions(tenant_id, approver_id);

-- delegation_rules
CREATE INDEX idx_delegation_tenant_id ON delegation_rules(tenant_id);
CREATE INDEX idx_delegation_delegator ON delegation_rules(tenant_id, delegator_id);
CREATE INDEX idx_delegation_delegate ON delegation_rules(tenant_id, delegate_id);
CREATE INDEX idx_delegation_valid_dates ON delegation_rules(tenant_id, valid_from, valid_to) WHERE is_active = TRUE;

-- =====================================================
-- notification-module Indexes
-- =====================================================

-- notifications
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_unread ON notifications(tenant_id, user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(tenant_id, created_at DESC);

-- notification_preferences
CREATE INDEX idx_notif_prefs_tenant_id ON notification_preferences(tenant_id);
CREATE INDEX idx_notif_prefs_user_id ON notification_preferences(tenant_id, user_id);

-- =====================================================
-- storage-module Indexes
-- =====================================================

-- file_metadata
CREATE INDEX idx_file_metadata_tenant_id ON file_metadata(tenant_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(tenant_id, uploaded_by);
CREATE INDEX idx_file_metadata_upload_status ON file_metadata(tenant_id, upload_status);

-- =====================================================
-- audit-module Indexes
-- =====================================================

-- audit_logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(tenant_id, action);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;
```

### 6.3 Foreign Key Constraints Summary

All foreign key constraints are defined in the table schemas (Section 3). Key constraints include:

| Table | Foreign Key | References |
|-------|-------------|------------|
| users | tenant_id | tenants(id) |
| employees | user_id | users(id) |
| employees | manager_id | employees(id) |
| employees | position_id | positions(id) |
| tasks | status_id | task_statuses(id) |
| tasks | parent_task_id | tasks(id) |
| task_assignees | employee_id | employees(id) |
| mind_map_nodes | linked_task_id | tasks(id) |
| enrollments | employee_id | employees(id) |
| expense_requests | employee_id | employees(id) |
| complaints | owner_employee_id | employees(id) |
| approval_instances | workflow_id | approval_workflows(id) |
| notifications | user_id | users(id) |

### 6.4 Check Constraints

```sql
-- Prevent circular hierarchy in employees
ALTER TABLE employees ADD CONSTRAINT chk_employees_no_self_manager
    CHECK (manager_id IS NULL OR manager_id != id);

-- Prevent circular task dependencies
ALTER TABLE task_dependencies ADD CONSTRAINT chk_deps_no_self_reference
    CHECK (task_id != depends_on_task_id);

-- Leave request date validation
ALTER TABLE leave_requests ADD CONSTRAINT chk_leave_dates
    CHECK (to_date >= from_date);

-- Expense amount positive
ALTER TABLE expense_items ADD CONSTRAINT chk_expense_amount_positive
    CHECK (amount > 0);

-- Exam score validation
ALTER TABLE exam_attempts ADD CONSTRAINT chk_exam_percentage
    CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100));

-- SLA time validation
ALTER TABLE sla_configurations ADD CONSTRAINT chk_sla_times
    CHECK (response_time_hours > 0 AND resolution_time_hours > response_time_hours);

-- Delegation date validation
ALTER TABLE delegation_rules ADD CONSTRAINT chk_delegation_dates
    CHECK (valid_to >= valid_from);
```

---

## 7. Row-Level Security Policies (Task 2.6)

### 7.1 RLS Overview

Per [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md), PostgreSQL Row-Level Security (RLS) enforces tenant isolation at the database level.

**Pattern**:
```sql
-- Set tenant context on every database connection
SET LOCAL app.current_tenant_id = '{tenant_id_from_jwt}';
```

### 7.2 RLS Policy Template

```sql
-- Enable RLS on table
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner
ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation_policy ON {table_name}
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 7.3 RLS Policies by Module

#### 7.3.1 auth-module RLS

```sql
-- tenants: No RLS (cross-tenant access for system)
-- Accessed only via explicit queries, not through RLS

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roles
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role_permissions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- user_tenant_roles
ALTER TABLE user_tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_tenant_roles
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sessions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

#### 7.3.2 hr-module RLS

```sql
-- departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON departments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- positions
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON positions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- leave_types
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_types
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- leave_balances
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_balances
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_requests
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- attendance_records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_records
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- payroll_references
ALTER TABLE payroll_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_references FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payroll_references
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- candidates
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidates
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

#### 7.3.3 task-module RLS

```sql
-- task_statuses
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON task_statuses
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tasks
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON task_assignees
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON task_comments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON task_attachments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- task_dependencies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON task_dependencies
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

#### 7.3.4 All Other Modules RLS

The same pattern applies to all remaining tables:

```sql
-- mindmap-module
ALTER TABLE mind_map_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mind_map_templates
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mind_maps
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mind_map_nodes
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE node_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON node_attachments
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- training-module (all 10 tables)
-- expense-module (all 5 tables)
-- complaint-module (all 6 tables)
-- approval-module (all 5 tables)
-- notification-module (all 2 tables)
-- storage-module (file_metadata)
-- Follow same pattern for all tables
```

### 7.4 RLS Application Code Pattern

```python
# Python/FastAPI - Set tenant context on each request
from sqlalchemy import text

async def set_tenant_context(db_session, tenant_id: str):
    """Set tenant_id in PostgreSQL session for RLS."""
    await db_session.execute(
        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
    )
```

### 7.5 RLS Exception: Audit Logs

Audit logs do NOT use RLS for SELECT because:
- Admin users need cross-query capability for investigation
- Logs are append-only (no UPDATE/DELETE)

```sql
-- audit_logs: RLS only for INSERT
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- SELECT policy allows admin access to all tenant logs
-- Controlled via application-level RBAC
```

---

## 8. Audit Logging Points (Task 2.7)

### 8.1 Audit Logging Requirements

Per [COMPLIANCE_MAPPING.md](COMPLIANCE_MAPPING.md) and [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md):
- CERT-In: 180 days online retention, 7 years archived
- All critical actions logged
- Structured JSON format
- Immutable (append-only)

### 8.2 Auditable Actions by Module

#### 8.2.1 auth-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| LOGIN | sessions | User login success | HIGH |
| LOGIN_FAILED | users | Failed login attempt | HIGH |
| LOGOUT | sessions | User logout | MEDIUM |
| PASSWORD_CHANGE | users | Password updated | HIGH |
| ACCOUNT_LOCKED | users | Account lockout | CRITICAL |
| ACCOUNT_UNLOCKED | users | Account unlock | HIGH |
| ROLE_ASSIGNED | user_tenant_roles | Role granted | HIGH |
| ROLE_REVOKED | user_tenant_roles | Role removed | HIGH |
| SESSION_REVOKED | sessions | Session terminated | MEDIUM |

#### 8.2.2 hr-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| CREATE | employees | Employee created | HIGH |
| UPDATE | employees | Employee updated | MEDIUM |
| DELETE | employees | Employee soft-deleted | HIGH |
| HIERARCHY_CHANGE | employees | Manager changed | HIGH |
| STATUS_CHANGE | employees | Status changed (Active/Inactive) | HIGH |
| CREATE | leave_requests | Leave submitted | MEDIUM |
| APPROVE | leave_requests | Leave approved | MEDIUM |
| REJECT | leave_requests | Leave rejected | MEDIUM |
| CREATE | attendance_records | Attendance marked | LOW |
| UPDATE | payroll_references | Salary updated | CRITICAL |

#### 8.2.3 task-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| CREATE | tasks | Task created | MEDIUM |
| UPDATE | tasks | Task updated | LOW |
| DELETE | tasks | Task soft-deleted | MEDIUM |
| ASSIGN | task_assignees | Task assigned | MEDIUM |
| UNASSIGN | task_assignees | Task unassigned | MEDIUM |
| STATUS_CHANGE | tasks | Status changed | MEDIUM |

#### 8.2.4 expense-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| CREATE | expense_requests | Expense submitted | MEDIUM |
| UPDATE | expense_requests | Expense updated | MEDIUM |
| APPROVE | expense_requests | Expense approved | HIGH |
| REJECT | expense_requests | Expense rejected | MEDIUM |
| PAYMENT | payment_records | Payment recorded | HIGH |

#### 8.2.5 complaint-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| CREATE | complaints | Complaint logged | MEDIUM |
| ASSIGN | complaints | Complaint assigned | MEDIUM |
| ESCALATE | complaints | Complaint escalated | HIGH |
| RESOLVE | complaints | Complaint resolved | MEDIUM |
| CLOSE | complaints | Complaint closed | MEDIUM |
| REOPEN | complaints | Complaint reopened | HIGH |

#### 8.2.6 approval-module Audit Points

| Action | Entity | Trigger | Priority |
|--------|--------|---------|----------|
| APPROVE | approval_decisions | Request approved | HIGH |
| REJECT | approval_decisions | Request rejected | HIGH |
| DELEGATE | delegation_rules | Approval delegated | HIGH |
| TIMEOUT | approval_instances | Approval timed out | MEDIUM |

### 8.3 Audit Log Schema Reminder

```sql
-- From Section 3.11
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    correlation_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8.4 Retention Policy

| Period | Storage | Notes |
|--------|---------|-------|
| 0-180 days | PostgreSQL (online) | CERT-In requirement |
| 180 days - 7 years | MinIO/S3 (archived) | Compliance requirement |
| 7+ years | Deleted | Per retention policy |

---

## 9. Security Review (Task 2.8)

### 9.1 Security Requirements Checklist

| Requirement | Source | Implementation | Status |
|-------------|--------|----------------|--------|
| UUID primary keys | TECH_STACK.md | `gen_random_uuid()` on all tables | ✅ COMPLETE |
| Multi-tenancy isolation | SECURITY_ARCHITECTURE.md | `tenant_id` + RLS on all tables | ✅ COMPLETE |
| Password hashing | SECURITY_ARCHITECTURE.md | `password_hash` column (bcrypt in app) | ✅ COMPLETE |
| Session tracking | SECURITY_ARCHITECTURE.md | `sessions` table with expiry | ✅ COMPLETE |
| Audit logging | COMPLIANCE_MAPPING.md | `audit_logs` table, 180-day online | ✅ COMPLETE |
| Soft delete for PII | COMPLIANCE_MAPPING.md | `is_deleted`, `deleted_at` columns | ✅ COMPLETE |
| Encrypted sensitive fields | DATA_PROTECTION_DESIGN.md | `*_encrypted` columns for payroll | ✅ COMPLETE |
| RBAC support | SECURITY_ARCHITECTURE.md | roles, permissions, user_tenant_roles | ✅ COMPLETE |
| Hierarchy support | PRD.md | `manager_id`, `parent_position_id` | ✅ COMPLETE |

### 9.2 RESTRICTED Data Fields

Per [DATA_PROTECTION_DESIGN.md](DATA_PROTECTION_DESIGN.md), the following fields require AES-256-GCM encryption:

| Table | Column | Encryption |
|-------|--------|------------|
| payroll_references | basic_pay_encrypted | AES-256-GCM |
| payroll_references | allowances_encrypted | AES-256-GCM |
| payroll_references | deductions_encrypted | AES-256-GCM |
| payroll_references | gross_salary_encrypted | AES-256-GCM |
| payroll_references | net_salary_encrypted | AES-256-GCM |

### 9.3 PII Entities with Soft Delete

| Module | Table | Soft Delete Columns |
|--------|-------|---------------------|
| auth | users | is_deleted, deleted_at, deletion_reason |
| hr | employees | is_deleted, deleted_at, deletion_reason |
| hr | leave_requests | is_deleted, deleted_at, deletion_reason |
| hr | payroll_references | is_deleted, deleted_at, deletion_reason |
| hr | candidates | is_deleted, deleted_at, deletion_reason |
| task | tasks | is_deleted, deleted_at, deletion_reason |
| task | task_comments | is_deleted, deleted_at, deletion_reason |
| mindmap | mind_maps | is_deleted, deleted_at, deletion_reason |
| mindmap | mind_map_nodes | is_deleted, deleted_at, deletion_reason |
| training | courses | is_deleted, deleted_at, deletion_reason |
| training | training_sessions | is_deleted, deleted_at, deletion_reason |
| training | enrollments | is_deleted, deleted_at, deletion_reason |
| expense | expense_requests | is_deleted, deleted_at, deletion_reason |
| complaint | complaints | is_deleted, deleted_at, deletion_reason |
| storage | file_metadata | is_deleted, deleted_at, deletion_reason |

### 9.4 Data Retention Compliance

| Data Category | Retention | Source |
|---------------|-----------|--------|
| Audit logs | 180 days online, 7 years archived | CERT-In 2022 |
| Employee records | Employment + 7 years | COMPLIANCE_MAPPING.md |
| Financial records (expenses) | 7 years | IT Rules 2011 |
| Training certificates | Indefinite | Business requirement |
| Consent records | Indefinite | DPDP Act 2023 |

---

## 10. Service-Level Schema Approval (Task 2.9)

### 10.1 auth-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| tenants | 7 | 0 | No | Yes | ✅ APPROVED |
| users | 17 | 3 | Yes | Yes | ✅ APPROVED |
| roles | 9 | 2 | Yes | Yes | ✅ APPROVED |
| permissions | 8 | 0 | No | No | ✅ APPROVED |
| role_permissions | 6 | 0 | Yes | No | ✅ APPROVED |
| user_tenant_roles | 10 | 2 | Yes | Yes | ✅ APPROVED |
| sessions | 13 | 4 | Yes | Yes | ✅ APPROVED |

### 10.2 hr-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| departments | 10 | 2 | Yes | No | ✅ APPROVED |
| positions | 12 | 3 | Yes | No | ✅ APPROVED |
| employees | 19 | 7 | Yes | Yes | ✅ APPROVED |
| leave_types | 12 | 0 | Yes | No | ✅ APPROVED |
| leave_balances | 12 | 0 | Yes | No | ✅ APPROVED |
| leave_requests | 16 | 4 | Yes | Yes | ✅ APPROVED |
| attendance_records | 12 | 2 | Yes | Yes | ✅ APPROVED |
| payroll_references | 15 | 2 | Yes | Yes | ✅ APPROVED |
| candidates | 17 | 3 | Yes | No | ✅ APPROVED |

### 10.3 task-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| task_statuses | 11 | 0 | Yes | No | ✅ APPROVED |
| tasks | 19 | 7 | Yes | Yes | ✅ APPROVED |
| task_assignees | 11 | 3 | Yes | Yes | ✅ APPROVED |
| task_comments | 12 | 2 | Yes | No | ✅ APPROVED |
| task_attachments | 7 | 0 | Yes | No | ✅ APPROVED |
| task_dependencies | 7 | 3 | Yes | No | ✅ APPROVED |

### 10.4 mindmap-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| mind_map_templates | 12 | 0 | Yes | No | ✅ APPROVED |
| mind_maps | 12 | 3 | Yes | No | ✅ APPROVED |
| mind_map_nodes | 16 | 4 | Yes | No | ✅ APPROVED |
| node_attachments | 7 | 0 | Yes | No | ✅ APPROVED |

### 10.5 training-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| courses | 16 | 3 | Yes | No | ✅ APPROVED |
| training_content | 12 | 0 | Yes | No | ✅ APPROVED |
| training_sessions | 15 | 4 | Yes | No | ✅ APPROVED |
| enrollments | 15 | 4 | Yes | Yes | ✅ APPROVED |
| training_attendance | 12 | 3 | Yes | No | ✅ APPROVED |
| exams | 14 | 0 | Yes | No | ✅ APPROVED |
| exam_questions | 12 | 0 | Yes | No | ✅ APPROVED |
| exam_attempts | 15 | 4 | Yes | Yes | ✅ APPROVED |
| exam_responses | 9 | 0 | Yes | No | ✅ APPROVED |
| certificates | 10 | 3 | Yes | No | ✅ APPROVED |

### 10.6 expense-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| expense_categories | 11 | 0 | Yes | No | ✅ APPROVED |
| expense_requests | 19 | 4 | Yes | Yes | ✅ APPROVED |
| expense_items | 12 | 3 | Yes | No | ✅ APPROVED |
| expense_receipts | 8 | 0 | Yes | No | ✅ APPROVED |
| payment_records | 12 | 2 | Yes | Yes | ✅ APPROVED |

### 10.7 complaint-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| complaint_categories | 11 | 0 | Yes | No | ✅ APPROVED |
| sla_configurations | 11 | 2 | Yes | No | ✅ APPROVED |
| escalation_rules | 13 | 0 | Yes | No | ✅ APPROVED |
| complaints | 28 | 7 | Yes | Yes | ✅ APPROVED |
| complaint_actions | 13 | 2 | Yes | No | ✅ APPROVED |
| complaint_attachments | 8 | 0 | Yes | No | ✅ APPROVED |

### 10.8 approval-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| approval_workflows | 10 | 0 | Yes | No | ✅ APPROVED |
| approval_steps | 15 | 0 | Yes | No | ✅ APPROVED |
| approval_instances | 12 | 5 | Yes | No | ✅ APPROVED |
| approval_decisions | 10 | 3 | Yes | Yes | ✅ APPROVED |
| delegation_rules | 13 | 4 | Yes | Yes | ✅ APPROVED |

### 10.9 notification-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| notifications | 13 | 4 | Yes | No | ✅ APPROVED |
| notification_preferences | 9 | 2 | Yes | No | ✅ APPROVED |

### 10.10 storage-module Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| file_metadata | 15 | 3 | Yes | No | ✅ APPROVED |

### 10.11 Audit Schema

| Table | Columns | Indexes | RLS | Audit | Status |
|-------|---------|---------|-----|-------|--------|
| audit_logs | 13 | 6 | Partial | N/A | ✅ APPROVED |

---

## 11. Dependencies

### 11.1 Phase Dependencies

| This Phase | Depends On | Reason |
|------------|------------|--------|
| Phase 2 (Database Schema) | Phase 1.5 (UI/UX Design) | Screen data requirements inform entity design |
| Phase 2 (Database Schema) | Phase 1 (Architecture Design) | Entity ownership per module |
| Phase 3 (API Contracts) | Phase 2 (Database Schema) | API endpoints reflect database structure |

### 11.2 Document Dependencies

| Document | Relationship |
|----------|--------------|
| [PRD.md](PRD.md) | Functional requirements defining entities |
| [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md) | Module boundaries and entity ownership |
| [UI_UX_DESIGN.md](UI_UX_DESIGN.md) | Screen data requirements |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | RLS, RBAC, audit requirements |
| [DATA_PROTECTION_DESIGN.md](DATA_PROTECTION_DESIGN.md) | Encryption requirements |
| [COMPLIANCE_MAPPING.md](COMPLIANCE_MAPPING.md) | Data retention, soft delete |

---

## 12. Approval Record

### 12.1 Phase Gate Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 2 – Domain & Database Schema Design | COMPLETE - APPROVED | 2026-01-16 |

### 12.2 Task Completion Summary

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Identify entities per service | ✅ COMPLETE |
| 2.2 | Define table structures and columns | ✅ COMPLETE |
| 2.3 | Define UUID primary keys | ✅ COMPLETE |
| 2.4 | Define enums | ✅ COMPLETE |
| 2.5 | Define indexes and constraints | ✅ COMPLETE |
| 2.6 | Define Row-Level Security (RLS) policies | ✅ COMPLETE |
| 2.7 | Define audit logging points | ✅ COMPLETE |
| 2.8 | Review schemas against security requirements | ✅ COMPLETE |
| 2.9 | Approve schema per service | ✅ COMPLETE |

### 12.3 Deliverable Summary

- **Total Tables**: 54
- **Total Enums**: 30
- **Total Indexes**: 100+
- **RLS Policies**: Applied to all tenant-scoped tables
- **Audit Points**: Defined for all critical actions
- **Security Review**: Passed all requirements

### 12.4 Approval Signatures

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| Product Owner | PO | APPROVED | 2026-01-16 | All schema requirements met |
| Technical Lead | Builder | APPROVED | 2026-01-16 | Schema design complete |

---

**Document Status**: COMPLETE - Product Owner Approved (2026-01-16)

**Next Phase**: Phase 3 – API Contract Design is now authorized to begin

---

**END OF DATABASE_SCHEMA.md**

