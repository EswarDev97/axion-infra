# Complaint Management System Enhancement — Technical Design Document

**Version:** 1.1
**Date:** 2026-03-30
**Status:** DRAFT — Updated with Workflow, Field Order, and Closure Rules changes
**Module:** Complaint Management System Enhancement
**Author:** System Architecture Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Existing System Analysis](#2-existing-system-analysis)
3. [Roles and Permissions](#3-roles-and-permissions)
4. [Complaint Workflow](#4-complaint-workflow)
5. [Assignment Logic](#5-assignment-logic)
6. [Escalation Logic](#6-escalation-logic)
7. [Dashboard Logic](#7-dashboard-logic)
8. [Reporting Design](#8-reporting-design)
9. [Database Schema Review](#9-database-schema-review)
10. [Required Table Modifications](#10-required-table-modifications)
11. [Validation Rules](#11-validation-rules)
12. [Security and Access Control](#12-security-and-access-control)
13. [Future Scalability Considerations](#13-future-scalability-considerations)

---

## 1. System Overview

### 1.1 Purpose

Enhance the existing Complaint Management module from a basic CRUD system into a structured enterprise workflow module with:

- Role-based creation and assignment permissions
- Hierarchical assignment enforcement
- Automatic escalation on overdue complaints
- Real-time dashboard with dynamic KPI counts
- Structured reporting with filters and export capability
- Full audit trail and change history

### 1.2 Architecture Context

The MindFlow system is a multi-tenant, microservice-based HRMS platform:

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (App Router), Zustand, TanStack Query | SSR + client-side state |
| API Gateway | Node.js / Express with Prisma client | Proxies to backend services |
| Complaint Service | Python (FastAPI), SQLAlchemy | Standalone microservice on port 8107 |
| Database | PostgreSQL | Multi-tenant via `tenant_id` on all tables |
| Auth | JWT-based, RBAC via `roles` + `permissions` tables | Centralized in auth service |

### 1.3 Design Principles

1. **Reuse existing tables** — never duplicate or rename
2. **Extend only when required** — add columns, indexes, relationships
3. **Maintain backward compatibility** — never drop existing columns
4. **Support existing data** — all additions must be nullable or have safe defaults
5. **Performance-first** — index all filter/report columns

---

## 2. Existing System Analysis

### 2.1 Existing Database Tables

The complaint module currently has **6 tables**:

| Table | Purpose | Status |
|---|---|---|
| `complaints` | Main complaint records | Exists — requires enhancement |
| `complaint_categories` | Hierarchical complaint categories | Exists — adequate |
| `sla_configurations` | SLA rules per category/priority | Exists — adequate |
| `escalation_rules` | Auto-escalation rule definitions | Exists — requires enhancement |
| `complaint_actions` | Audit trail / action history | Exists — adequate |
| `complaint_attachments` | File attachments | Exists — adequate |

### 2.2 Existing Complaint Fields (complaints table)

| Column | Type | Exists | Status |
|---|---|---|---|
| `id` | UUID PK | Yes | No change |
| `tenant_id` | UUID | Yes | No change |
| `complaint_number` | VARCHAR(50) | Yes | Maps to "Complaint ID / Reference Number" |
| `title` | VARCHAR(255) | Yes | Maps to "Reason for Complaint" (rename not needed — semantic mapping) |
| `description` | TEXT | Yes | Maps to "Complaint Description" |
| `category_id` | UUID FK | Yes | No change |
| `severity` | VARCHAR(20) | Yes | Maps to "Severity" |
| `source_channel` | VARCHAR(30) | Yes | Maps to "Channel" |
| `status` | VARCHAR(30) | Yes | Maps to "Current Status" — needs workflow simplification |
| `complainant_name` | VARCHAR(255) | Yes | Maps to "Complainant Name" |
| `complainant_contact` | VARCHAR(255) | Yes | Maps to "Contact Number" |
| `complainant_employee_id` | UUID | Yes | Supports internal complainant reference |
| `owner_employee_id` | UUID | Yes | Maps to "Assigned To" |
| `assigned_at` | TIMESTAMPTZ | Yes | Maps to "Assigned On" |
| `sla_response_due_at` | TIMESTAMPTZ | Yes | Supports escalation calculation |
| `sla_resolution_due_at` | TIMESTAMPTZ | Yes | Maps to "Expected Closure Date" |
| `responded_at` | TIMESTAMPTZ | Yes | No change |
| `resolved_at` | TIMESTAMPTZ | Yes | No change |
| `closed_at` | TIMESTAMPTZ | Yes | Maps to "Closed On" |
| `closure_remarks` | TEXT | Yes | Maps to "Action Taken / Remarks" |
| `reopened_count` | INTEGER | Yes | No change |
| `escalation_level` | INTEGER | Yes | Maps to "Escalation Level" |
| `last_escalated_at` | TIMESTAMPTZ | Yes | No change |
| `reference_type` | VARCHAR(50) | Yes | Can support Claim Number context |
| `reference_id` | VARCHAR(100) | Yes | Can store Claim Number value |
| `is_deleted` | BOOLEAN | Yes | No change |
| `deleted_at` | TIMESTAMPTZ | Yes | No change |
| `deletion_reason` | VARCHAR(255) | Yes | No change |
| `created_at` | TIMESTAMPTZ | Yes | Maps to "Date Time Received" |
| `updated_at` | TIMESTAMPTZ | Yes | Maps to "Last Update Date" |
| `created_by` | UUID | Yes | No change |
| `updated_by` | UUID | Yes | No change |

### 2.3 Gap Analysis — Missing Fields

The following fields from the PRD are **not present** in the existing `complaints` table:

| Required Field | Status | Recommendation |
|---|---|---|
| Complainant Type | **MISSING** | Add column `complainant_type` |
| Insurer / Client | **MISSING** | Add column `insurer_client` |
| Claim Number | **PARTIAL** | Use existing `reference_id` with `reference_type = 'CLAIM'` |
| Vehicle Number | **MISSING** | Add column `vehicle_number` |
| Workshop Name | **MISSING** | Add column `workshop_name` |
| Corrective Action | **MISSING** | Add column `corrective_action` |
| Expected Closure Date | **MAPPED** | Use existing `sla_resolution_due_at` |
| Closure TAT | **MISSING** | Add column `closure_tat_hours` (computed on close) |
| Escalated (Yes/No) | **DERIVED** | Derive from `escalation_level > 0` — no new column needed |

### 2.4 Existing Status State Machine

Current implementation:

```
NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                 ↕ WAITING_INFO
                 ↕ REOPENED (from RESOLVED or CLOSED)
```

### 2.5 Existing Supporting Tables

| Table | Key Fields | Adequate? |
|---|---|---|
| `users` | id, tenantId, email, firstName, lastName, isActive | Yes |
| `roles` | id, tenantId, name, slug, isSystem | Yes |
| `user_tenant_roles` | userId, roleId, tenantId | Yes |
| `permissions` | name, slug, module, action | Yes |
| `role_permissions` | roleId, permissionId | Yes |
| `departments` | id, tenantId, name, code, managerId, parentId | Yes |
| `employees` | id, tenantId, userId, departmentId, managerId, designation | Yes |

### 2.6 Existing API Endpoints

The complaint service already provides 24 endpoints covering:
- Full CRUD operations
- Workflow state transitions (assign, start-progress, request-info, provide-info, escalate, resolve, close, reopen)
- Dashboard statistics
- SLA compliance and aging reports
- Action/comment management
- Attachment management

### 2.7 Existing Frontend Components

- `ComplaintsPageClient.tsx` — List page with stats cards, search, filters
- `ComplaintForm.tsx` — Create/edit modal
- `ComplaintList.tsx` — Table display
- `ComplaintDetail.tsx` — Detail view with actions
- Zustand store with full state management
- TypeScript service layer with all API bindings

---

## 3. Roles and Permissions

### 3.1 Role Definitions

The system uses existing roles from the `roles` table. The following role slugs are relevant:

| Role | Slug | System Role |
|---|---|---|
| Super Admin | `super-admin` | Yes |
| HR Admin | `hr-admin` | Yes |
| Manager | `manager` | Yes |
| Department Head | `department-head` | Yes |
| Employee | `employee` | Yes |

### 3.2 Complaint Creation Permissions

| Role | Can Create Complaints |
|---|---|
| Super Admin | Yes |
| HR Admin | Yes |
| Manager | Yes |
| Department Head | Yes |
| Employee | **No** |

**Implementation:** Add a new permission record:

- Module: `complaints`
- Action: `create`
- Slug: `complaints.create`

Assign this permission to Super Admin, HR Admin, Manager, and Department Head roles. **Do not** assign to Employee role.

### 3.3 Complaint View Permissions

| Role | View Scope |
|---|---|
| Super Admin | All complaints across all departments |
| HR Admin | All complaints across all departments |
| Manager | Complaints assigned to self or to direct reports |
| Department Head | Complaints within own department |
| Employee | Only complaints assigned to self |

**Implementation:** Add permission variants:

| Permission Slug | Description |
|---|---|
| `complaints.view.all` | View all complaints (Super Admin, HR Admin) |
| `complaints.view.department` | View department complaints (Department Head) |
| `complaints.view.team` | View team complaints (Manager) |
| `complaints.view.own` | View own assigned complaints (Employee) |

### 3.4 Complaint Assignment Permissions

| Role | Assignment Scope |
|---|---|
| Super Admin | Can assign to any user; can reassign any complaint |
| HR Admin | Can assign to all users except Super Admin |
| Manager | Can assign only to direct reports (employees where `managerId = current_employee_id`) |
| Department Head | Can assign only to employees in own department |
| Employee | Cannot assign |

**Implementation:** Add permission:

| Permission Slug | Description |
|---|---|
| `complaints.assign.all` | Assign to anyone (Super Admin) |
| `complaints.assign.non-admin` | Assign to non-Super-Admin users (HR Admin) |
| `complaints.assign.team` | Assign to direct reports (Manager) |
| `complaints.assign.department` | Assign to department members (Department Head) |

### 3.5 Permission Matrix Summary

| Action | Super Admin | HR Admin | Manager | Dept Head | Employee |
|---|---|---|---|---|---|
| Create | Yes | Yes | Yes | Yes | No |
| View All | Yes | Yes | No | No | No |
| View Department | Yes | Yes | No | Yes | No |
| View Team | Yes | Yes | Yes | No | No |
| View Own | Yes | Yes | Yes | Yes | Yes |
| Assign Any | Yes | No | No | No | No |
| Assign Non-Admin | No | Yes | No | No | No |
| Assign Team | No | No | Yes | No | No |
| Assign Department | No | No | No | Yes | No |
| Reassign | Yes | Yes (non-admin) | No | No | No |
| Escalate | Yes | Yes | Yes | Yes | No |
| Close | Yes | Yes | No | No | No |
| Delete | Yes | No | No | No | No |
| Export | Yes | Yes | Yes | Yes | No |

---

## 4. Complaint Workflow

### 4.1 Simplified Status Model (Enhanced)

The PRD requires a simplified three-state workflow: **Open → Working → Closed**.

The existing system has a more granular state machine (NEW, ASSIGNED, IN_PROGRESS, WAITING_INFO, RESOLVED, CLOSED, REOPENED).

**Decision:** Maintain the existing granular states for internal tracking but provide a **simplified status mapping** for the user-facing UI and reports.

| Internal Status | Display Status | Description |
|---|---|---|
| NEW | Open | Complaint received, not yet assigned |
| ASSIGNED | Open | Assigned but work not started |
| REOPENED | Open | Previously resolved/closed, reopened |
| IN_PROGRESS | Working | Actively being worked on |
| WAITING_INFO | Working | Awaiting additional information |
| RESOLVED | Closed | Resolution provided |
| CLOSED | Closed | Formally closed |

**Implementation:** Add a derived/computed property `display_status` that maps internal status to simplified status. This does **not** require a new column — it is computed at the application layer.

### 4.2 Status Transition Rules

```
Open (NEW) ─────→ Open (ASSIGNED) ────→ Working (IN_PROGRESS)
                                              │
                                              ├──→ Working (WAITING_INFO) ──→ Working (IN_PROGRESS)
                                              │
                                              └──→ Closed (RESOLVED) ──→ Closed (CLOSED)
                                                        │
                                                        └──→ Open (REOPENED) ──→ Open (ASSIGNED)
```

### 4.3 Creation Screen — Field Order

The complaint creation form must display fields in this exact order:

1. **Channel** — Dropdown (Mail, Phone) — Required
2. **Category** — Dropdown (Inspection, Claims) — Required
3. **Complaint Type** — Text field (NOT a dropdown)
4. **Complainant Name** — Text field
5. **Contact Number** — Text field
6. **Insurer / Client** — Dropdown from master table — Required
7. **Claim No** — Text field
8. **Vehicle Number** — Text field
9. **Workshop Name** — Text field
10. **Complaint Description** — Textarea — Required
11. **Severity** — Dropdown (Low, Medium, High, Critical)
12. **Assign To** — Dropdown, dynamically filtered by role hierarchy

### 4.4 Working Stage

When an assigned employee updates a complaint with working-stage fields:

| Field | Behavior |
|---|---|
| Expected Closure Date | User-entered date |
| Last Update Date | **Auto-set** by system on every update |
| Action Taken / Remarks | Free-text entry |

**System Behavior:** When any working-stage field is updated, status **automatically** transitions to **WORKING** (IN_PROGRESS).

### 4.5 Closure Rules (Updated)

A complaint **cannot** be closed unless:

1. **Reason for Complaint** is entered (required) — stored in `reason_for_complaint`
2. **Corrective Action** is entered (required) — stored in `corrective_action`

**System Actions on Closure:**

1. Set `closed_at` date automatically
2. Calculate **Closure TAT (Days)** = `closed_at` - `created_at` (in days)
3. Calculate `closure_tat_hours` = TAT in hours (for backward compatibility)
4. Change status to **CLOSED**
5. Send notification (via notification service)

### 4.4 Reopen Rules

- Only Super Admin and HR Admin can reopen a complaint
- `reopened_count` is incremented
- `resolved_at` and `closed_at` are cleared
- Status transitions to REOPENED
- A ComplaintAction record is created with `action_type = 'REOPENED'`

---

## 5. Assignment Logic

### 5.1 Dynamic "Assigned To" Dropdown

The "Assigned To" dropdown must be **dynamically filtered** based on the current user's role. This is a backend API concern — the frontend calls an endpoint that returns the eligible assignees.

**Endpoint:** `GET /api/v1/complaints/assignable-users`

**Logic:**

```
IF current_user.role == SUPER_ADMIN:
    RETURN all active employees across all departments

ELSE IF current_user.role == HR_ADMIN:
    RETURN all active employees EXCEPT those with SUPER_ADMIN role

ELSE IF current_user.role == MANAGER:
    RETURN employees WHERE managerId == current_user.employee_id

ELSE IF current_user.role == DEPARTMENT_HEAD:
    RETURN employees WHERE departmentId == current_user.departmentId

ELSE:
    RETURN empty list (Employees cannot assign)
```

### 5.2 Assignment Data Flow

1. User opens complaint creation or assignment form
2. Frontend calls `GET /assignable-users` with current user's JWT
3. Backend resolves user's role and employee record
4. Backend queries `employees` table with appropriate filter
5. Returns list of `{id, employeeCode, firstName, lastName, department, designation}`
6. Frontend populates dropdown

### 5.3 Reassignment

- Only Super Admin and HR Admin can reassign
- Reassignment creates a ComplaintAction with `action_type = 'REASSIGNED'`
- Previous assignee and new assignee are recorded in the action metadata
- `assigned_at` is updated to current timestamp

---

## 6. Escalation Logic

### 6.1 Automatic Escalation Detection

The system must detect overdue complaints and apply escalation levels automatically.

**Trigger Condition:**

```
WHERE status NOT IN ('RESOLVED', 'CLOSED')
  AND sla_resolution_due_at IS NOT NULL
  AND sla_resolution_due_at < NOW()
```

### 6.2 Escalation Levels

| Level | Condition | Action |
|---|---|---|
| 0 | Not overdue | Normal state |
| 1 | Overdue (past `sla_resolution_due_at`) | Mark as escalated |
| 2 | 2+ calendar days past `sla_resolution_due_at` | Second escalation |
| 3 | 5+ calendar days past `sla_resolution_due_at` | Third / critical escalation |

**Calculation:**

```
overdue_days = (NOW() - sla_resolution_due_at).days

IF overdue_days >= 5:
    escalation_level = 3
ELSE IF overdue_days >= 2:
    escalation_level = 2
ELSE IF overdue_days >= 0:
    escalation_level = 1
ELSE:
    escalation_level = 0
```

### 6.3 Escalation Execution

**Option A — Scheduled Job (Recommended):**

A background task (cron job / Celery beat / APScheduler) runs every **15 minutes**:

1. Query all non-closed complaints where `sla_resolution_due_at < NOW()`
2. Calculate the appropriate escalation level
3. If calculated level > current `escalation_level`:
   - Update `escalation_level`
   - Update `last_escalated_at = NOW()`
   - Create a ComplaintAction with `action_type = 'ESCALATED'`
   - Trigger notification to relevant parties based on `escalation_rules` table

**Option B — On-Read Calculation (Supplementary):**

When a complaint is fetched via API, the `escalation_level` is recalculated in real-time. This supplements the scheduled job for immediate accuracy but does **not** replace it (since notifications require the job).

### 6.4 Escalation Notification Targets

Using the existing `escalation_rules` table:

| Escalation Level | Notify |
|---|---|
| Level 1 | Original assignee (`owner_employee_id`) |
| Level 2 | Assignee + Manager of assignee (from `employees.managerId`) |
| Level 3 | Assignee + Manager + Department Head + HR Admin |

### 6.5 Integration with Existing `escalation_rules` Table

The existing `escalation_rules` table has:
- `trigger_type` — Use `'TIME_BASED'`
- `trigger_hours` — Map to overdue thresholds (0h for Level 1, 48h for Level 2, 120h for Level 3)
- `escalate_to_role_id` — Target role for notification
- `escalate_to_user_id` — Target user (optional)
- `notify_original_assignee` — Boolean
- `notify_requester` — Boolean

**Enhancement needed:** Add a `level` column to `escalation_rules` to associate rules with specific escalation levels (see Section 10).

---

## 7. Dashboard Logic

### 7.1 Dashboard KPIs

All values are computed dynamically via database queries — no materialized counters.

| KPI | Query Logic | Scope Filter |
|---|---|---|
| Open Count | `WHERE status IN ('NEW', 'ASSIGNED', 'REOPENED') AND is_deleted = false` | Role-based |
| Working Count | `WHERE status IN ('IN_PROGRESS', 'WAITING_INFO') AND is_deleted = false` | Role-based |
| Overdue Count | `WHERE status NOT IN ('RESOLVED', 'CLOSED') AND sla_resolution_due_at < NOW() AND is_deleted = false` | Role-based |
| Resolved Today Count | `WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at::date = CURRENT_DATE AND is_deleted = false` | Role-based |

### 7.2 Role-Based Scope Filtering

Each KPI query must be scoped by the user's role:

| Role | Additional WHERE Clause |
|---|---|
| Super Admin | (none — sees all) |
| HR Admin | (none — sees all) |
| Manager | `AND owner_employee_id IN (SELECT id FROM employees WHERE manager_id = :current_employee_id)` |
| Department Head | `AND owner_employee_id IN (SELECT id FROM employees WHERE department_id = :current_department_id)` |
| Employee | `AND owner_employee_id = :current_employee_id` |

### 7.3 Existing Dashboard Endpoint

The existing `GET /dashboard/stats` endpoint already returns:
- Total count
- Counts by status (open, assigned, in_progress)
- Overdue counts
- Severity breakdown
- Average resolution hours

**Enhancement needed:**
- Add role-based scope filtering (currently returns all tenant complaints)
- Add "Resolved Today" count
- Map response to simplified status groups (Open, Working, Closed)

---

## 8. Reporting Design

### 8.1 Report Definitions

#### Report 1: Daily Complaint Report

| Attribute | Value |
|---|---|
| Purpose | All complaints received/updated on a specific date |
| Data Source | `complaints` table |
| Key Columns | complaint_number, created_at, severity, status, owner_employee_id, category_id |
| Default Filter | `created_at::date = CURRENT_DATE` |
| Grouping | By status |

#### Report 2: Monthly Complaint Summary

| Attribute | Value |
|---|---|
| Purpose | Aggregated complaint metrics for a calendar month |
| Data Source | `complaints` table |
| Metrics | Total received, resolved, pending, avg closure TAT, escalation rate |
| Default Filter | `created_at BETWEEN first_day_of_month AND last_day_of_month` |
| Grouping | By severity, by category |

#### Report 3: Department-wise Report

| Attribute | Value |
|---|---|
| Purpose | Complaint distribution and resolution by department |
| Data Source | `complaints` JOIN `employees` (via `owner_employee_id`) JOIN `departments` |
| Metrics | Count per department, avg TAT per department, overdue per department |
| Grouping | By department |

#### Report 4: Severity-wise Report

| Attribute | Value |
|---|---|
| Purpose | Complaint breakdown by severity level |
| Data Source | `complaints` table |
| Metrics | Count, avg TAT, escalation rate per severity |
| Grouping | By severity (LOW, MEDIUM, HIGH, CRITICAL) |

#### Report 5: Escalation Report

| Attribute | Value |
|---|---|
| Purpose | All escalated complaints with escalation timeline |
| Data Source | `complaints` WHERE `escalation_level > 0` JOIN `complaint_actions` WHERE `action_type = 'ESCALATED'` |
| Key Columns | complaint_number, severity, escalation_level, last_escalated_at, overdue_days, assignee |
| Grouping | By escalation level |

### 8.2 Common Report Filters

All reports support:

| Filter | Column | Type |
|---|---|---|
| Date Range | `created_at` | Date From / Date To |
| Department | `owner_employee_id → employees.department_id` | Dropdown |
| Status | `status` | Multi-select (simplified: Open, Working, Closed) |
| Severity | `severity` | Multi-select |
| Category | `category_id` | Dropdown |
| Assigned To | `owner_employee_id` | Dropdown |

### 8.3 Export Formats

| Format | Implementation |
|---|---|
| Excel (.xlsx) | Server-side generation using openpyxl (Python) or similar |
| PDF | Server-side generation using reportlab or WeasyPrint |

**Endpoint pattern:** `GET /api/v1/complaints/reports/{report_type}?format=xlsx&from=...&to=...`

### 8.4 Index Requirements for Reporting

The following indexes are required for performant report queries (see Section 10 for full index list):

- `idx_complaints_created_at` on `(tenant_id, created_at)`
- `idx_complaints_severity` on `(tenant_id, severity)`
- `idx_complaints_status_date` on `(tenant_id, status, created_at)`
- `idx_complaints_escalation` on `(tenant_id, escalation_level)` WHERE `escalation_level > 0`

---

## 9. Database Schema Review

### 9.1 Table: `complaints`

**Existing Columns:** 26 columns (see Section 2.2)

**Missing Columns:**

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `complainant_type` | VARCHAR(30) | Yes | `'INTERNAL'` | Complainant Type (INTERNAL, EXTERNAL, INSURER, CLIENT, VENDOR) |
| `insurer_client` | VARCHAR(255) | Yes | NULL | Insurer / Client name |
| `vehicle_number` | VARCHAR(50) | Yes | NULL | Vehicle Number |
| `workshop_name` | VARCHAR(255) | Yes | NULL | Workshop Name |
| `corrective_action` | TEXT | Yes | NULL | Corrective Action description |
| `closure_tat_hours` | DECIMAL(10,2) | Yes | NULL | Closure TAT in hours (computed on close) |
| `expected_closure_date` | DATE | Yes | NULL | User-entered expected closure date (distinct from SLA-computed `sla_resolution_due_at`) |

**Indexes to Add:**

| Index Name | Columns | Type | Condition |
|---|---|---|---|
| `idx_complaints_tenant_status` | `(tenant_id, status)` | B-tree | — |
| `idx_complaints_tenant_created` | `(tenant_id, created_at)` | B-tree | — |
| `idx_complaints_tenant_severity` | `(tenant_id, severity)` | B-tree | — |
| `idx_complaints_tenant_escalation` | `(tenant_id, escalation_level)` | Partial B-tree | `WHERE escalation_level > 0` |
| `idx_complaints_expected_closure` | `(tenant_id, expected_closure_date)` | B-tree | `WHERE status NOT IN ('RESOLVED', 'CLOSED')` |
| `idx_complaints_closed_at` | `(tenant_id, closed_at)` | B-tree | `WHERE closed_at IS NOT NULL` |

**Relationships:** No new foreign keys required — cross-service references remain UUID-based.

**Constraints to Add:**

| Constraint | Definition |
|---|---|
| `chk_complainant_type` | `complainant_type IN ('INTERNAL', 'EXTERNAL', 'INSURER', 'CLIENT', 'VENDOR')` |
| `chk_closure_requires_remarks` | `(status NOT IN ('RESOLVED', 'CLOSED')) OR (closure_remarks IS NOT NULL)` |

---

### 9.2 Table: `complaint_categories`

**Existing Columns:** id, tenant_id, code, name, description, parent_id, default_priority, requires_investigation, is_active, created_at, updated_at, created_by, updated_by

**Missing Columns:** None

**Indexes:** Existing unique constraint on `(tenant_id, code)` is adequate.

**Status:** No changes required.

---

### 9.3 Table: `sla_configurations`

**Existing Columns:** id, tenant_id, category_id, priority, response_time_hours, resolution_time_hours, escalation_time_hours, escalation_enabled, is_active, created_at, updated_at

**Missing Columns:** None — existing fields adequately support the escalation time thresholds.

**Status:** No changes required.

---

### 9.4 Table: `escalation_rules`

**Existing Columns:** id, tenant_id, name, trigger_type, trigger_hours, escalate_to_role_id, escalate_to_user_id, notify_original_assignee, notify_requester, priority, category_id, is_active, created_at, updated_at, created_by

**Missing Columns:**

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `escalation_level` | INTEGER | No | 1 | Maps rule to escalation level (1, 2, or 3) |
| `notify_department_head` | BOOLEAN | No | FALSE | Whether to notify department head |
| `notify_hr_admin` | BOOLEAN | No | FALSE | Whether to notify HR admin |

**Indexes to Add:**

| Index Name | Columns |
|---|---|
| `idx_escalation_rules_level` | `(tenant_id, escalation_level)` |

---

### 9.5 Table: `complaint_actions`

**Existing Columns:** id, tenant_id, complaint_id, action_type, description, performed_by, performed_at, is_internal, old_status, new_status, metadata, created_at

**Missing Columns:**

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `field_changed` | VARCHAR(100) | Yes | NULL | Name of field that was changed (for edit tracking) |
| `old_value` | TEXT | Yes | NULL | Previous value of the field |
| `new_value` | TEXT | Yes | NULL | New value of the field |

> **Note:** The existing `metadata` JSON column can alternatively store field-level change details. However, dedicated columns enable direct querying without JSON parsing. **Recommendation:** Use both — store structured changes in dedicated columns for common fields, and use `metadata` for bulk/complex changes.

**Indexes to Add:**

| Index Name | Columns |
|---|---|
| `idx_complaint_actions_type` | `(tenant_id, complaint_id, action_type)` |
| `idx_complaint_actions_performed` | `(tenant_id, performed_at)` |

---

### 9.6 Table: `complaint_attachments`

**Existing Columns:** id, tenant_id, complaint_id, file_id, original_filename, attachment_type, description, is_confidential, uploaded_by, uploaded_at, created_at

**Missing Columns:** None

**Status:** No changes required.

---

### 9.7 Table: `users`

**Existing Columns:** id, tenantId, email, passwordHash, firstName, lastName, phone, avatar, isActive, isEmailVerified, lastLoginAt, createdAt, updatedAt

**Missing Columns:** None

**Status:** No changes required. User data is accessed cross-service via UUID references.

---

### 9.8 Table: `departments`

**Existing Columns:** id, tenantId, name, code, description, managerId, parentId, isActive, createdAt, updatedAt

**Missing Columns:** None

**Status:** No changes required. The `managerId` field supports Department Head identification.

---

### 9.9 Table: `roles`

**Existing Columns:** id, tenantId, name, slug, description, isSystem, createdAt, updatedAt

**Missing Columns:** None

**Status:** No changes required.

---

### 9.10 Table: `permissions`

**Missing Records (not columns):** The following permission records must be seeded:

| slug | module | action | description |
|---|---|---|---|
| `complaints.create` | complaints | create | Create new complaints |
| `complaints.view.all` | complaints | view_all | View all complaints |
| `complaints.view.department` | complaints | view_department | View department complaints |
| `complaints.view.team` | complaints | view_team | View team complaints |
| `complaints.view.own` | complaints | view_own | View own assigned complaints |
| `complaints.assign.all` | complaints | assign_all | Assign to any user |
| `complaints.assign.non-admin` | complaints | assign_non_admin | Assign to non-admin users |
| `complaints.assign.team` | complaints | assign_team | Assign to direct reports |
| `complaints.assign.department` | complaints | assign_department | Assign to department members |
| `complaints.escalate` | complaints | escalate | Escalate complaints |
| `complaints.close` | complaints | close | Close complaints |
| `complaints.delete` | complaints | delete | Delete complaints |
| `complaints.export` | complaints | export | Export complaint reports |
| `complaints.reassign` | complaints | reassign | Reassign complaints |

---

### 9.11 Tables NOT Required (Covered by Existing Tables)

| Proposed Table | Covered By | Reason |
|---|---|---|
| Complaint Assignments | `complaints.owner_employee_id` + `complaint_actions` (ASSIGNED/REASSIGNED) | Assignment is a field on complaints; history is in actions |
| Complaint Status History | `complaint_actions` with `old_status` / `new_status` | Already tracked |
| Complaint Escalations | `escalation_rules` + `complaint_actions` (ESCALATED) | Rules in escalation_rules; events in actions |
| Complaint Remarks | `complaint_actions` with `action_type = 'COMMENT'` | Already supported |
| Complaint Notifications | `notifications` table (existing system-wide) | Use existing notification infrastructure |

---

## 10. Required Table Modifications — Summary

### 10.1 `complaints` Table — Add Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `complainant_type` | VARCHAR(30) | Yes | `'INTERNAL'` |
| 2 | `insurer_client` | VARCHAR(255) | Yes | NULL |
| 3 | `vehicle_number` | VARCHAR(50) | Yes | NULL |
| 4 | `workshop_name` | VARCHAR(255) | Yes | NULL |
| 5 | `corrective_action` | TEXT | Yes | NULL |
| 6 | `closure_tat_hours` | DECIMAL(10,2) | Yes | NULL |
| 7 | `expected_closure_date` | DATE | Yes | NULL |

### 10.2 `escalation_rules` Table — Add Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `escalation_level` | INTEGER | No | 1 |
| 2 | `notify_department_head` | BOOLEAN | No | FALSE |
| 3 | `notify_hr_admin` | BOOLEAN | No | FALSE |

### 10.3 `complaint_actions` Table — Add Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `field_changed` | VARCHAR(100) | Yes | NULL |
| 2 | `old_value` | TEXT | Yes | NULL |
| 3 | `new_value` | TEXT | Yes | NULL |

### 10.4 New Indexes

| Table | Index | Columns / Condition |
|---|---|---|
| complaints | `idx_complaints_tenant_status` | `(tenant_id, status)` |
| complaints | `idx_complaints_tenant_created` | `(tenant_id, created_at)` |
| complaints | `idx_complaints_tenant_severity` | `(tenant_id, severity)` |
| complaints | `idx_complaints_tenant_escalation` | `(tenant_id, escalation_level) WHERE escalation_level > 0` |
| complaints | `idx_complaints_expected_closure` | `(tenant_id, expected_closure_date) WHERE status NOT IN ('RESOLVED', 'CLOSED')` |
| complaints | `idx_complaints_closed_at` | `(tenant_id, closed_at) WHERE closed_at IS NOT NULL` |
| escalation_rules | `idx_escalation_rules_level` | `(tenant_id, escalation_level)` |
| complaint_actions | `idx_complaint_actions_type` | `(tenant_id, complaint_id, action_type)` |
| complaint_actions | `idx_complaint_actions_performed` | `(tenant_id, performed_at)` |

### 10.5 New Permission Records

14 new permission records to seed (see Section 9.10).

### 10.6 New Role-Permission Mappings

Map permissions to roles as defined in Section 3.5.

---

## 11. Validation Rules

### 11.1 Complaint Creation Validation

| Field | Rule |
|---|---|
| `title` | Required, min 5 chars, max 255 chars |
| `description` | Required, min 10 chars |
| `category_id` | Required, must reference active category |
| `severity` | Required, must be one of: LOW, MEDIUM, HIGH, CRITICAL |
| `source_channel` | Required, must be one of: INTERNAL, PHONE, EMAIL, WHATSAPP, WALK_IN, OTHER |
| `complainant_type` | Optional, must be one of: INTERNAL, EXTERNAL, INSURER, CLIENT, VENDOR |
| `complainant_name` | Required if `complainant_type` is not INTERNAL |
| `complainant_contact` | Optional, if provided must be valid phone/email format |
| `vehicle_number` | Optional, max 50 chars |
| `workshop_name` | Optional, max 255 chars |
| `expected_closure_date` | Optional, must be a future date |

### 11.2 Assignment Validation

| Rule | Description |
|---|---|
| Role check | Current user must have appropriate `complaints.assign.*` permission |
| Assignee scope | Assignee must be within the assigner's permitted scope (see Section 5.1) |
| Assignee active | Assignee must be an active employee (`employment_status = 'ACTIVE'`) |
| Status check | Complaint must be in assignable state (NEW or REOPENED) for initial assignment |

### 11.3 Closure Validation

| Rule | Description |
|---|---|
| Remarks required | `closure_remarks` must not be null or empty |
| Status prerequisite | Complaint must be in RESOLVED status before transitioning to CLOSED |
| TAT computation | `closure_tat_hours` must be computed as `(NOW() - created_at)` in hours |
| Closed On | `closed_at` must be set automatically |

### 11.4 Escalation Validation

| Rule | Description |
|---|---|
| Reason required | Escalation reason must be provided for manual escalation |
| Target required | For manual escalation, `escalate_to_employee_id` must be provided |
| Level increment | `escalation_level` must only increase, never decrease (except on resolution) |

### 11.5 Status Transition Validation

| From | Allowed To | Condition |
|---|---|---|
| NEW | ASSIGNED | `owner_employee_id` must be set |
| ASSIGNED | IN_PROGRESS | — |
| IN_PROGRESS | WAITING_INFO | Message must be provided |
| IN_PROGRESS | RESOLVED | `closure_remarks` must be provided |
| WAITING_INFO | IN_PROGRESS | Response must be provided |
| RESOLVED | CLOSED | — |
| RESOLVED | REOPENED | Reason must be provided |
| CLOSED | REOPENED | Reason must be provided; only Super Admin / HR Admin |

---

## 12. Security and Access Control

### 12.1 Authentication

- All complaint endpoints require a valid JWT token
- Token must contain: `userId`, `tenantId`, `roles[]`
- Multi-tenant isolation: every query includes `WHERE tenant_id = :token.tenantId`

### 12.2 Authorization Enforcement

| Layer | Enforcement |
|---|---|
| API Gateway | Route-level auth middleware validates JWT |
| Complaint Service | Endpoint-level permission check against `roles` + `permissions` |
| Database | `tenant_id` filter on every query (application-enforced) |

### 12.3 Data Visibility Rules

- **Row-level security:** Queries are scoped by role (see Section 7.2)
- **Field-level security:** Confidential complaints (`is_confidential = true`) are only visible to Super Admin, HR Admin, and the assigned employee
- **Internal comments:** Actions with `is_internal = true` are only visible to roles with `complaints.view.all` permission

### 12.4 Audit Trail

- Every state change, assignment, escalation, and comment creates a `complaint_actions` record
- The `performed_by` field links to the acting user
- Records are append-only — actions cannot be edited or deleted
- Enhanced with `field_changed`, `old_value`, `new_value` for detailed change tracking

### 12.5 Data Protection

- `complainant_contact` may contain PII — apply data masking for roles without `complaints.view.all`
- Soft delete ensures data is never physically removed
- `deletion_reason` provides traceability for deletions

---

## 13. Future Scalability Considerations

### 13.1 Performance

| Concern | Mitigation |
|---|---|
| Dashboard query load | Composite indexes on `(tenant_id, status)` and `(tenant_id, created_at)` |
| Report generation for large datasets | Paginated queries; background export for large date ranges |
| Escalation job on growing data | Partial index on `escalation_level > 0`; batch processing with cursor |
| Action history growth | Partition `complaint_actions` by `performed_at` (yearly) if volume exceeds 10M rows |

### 13.2 Feature Extensibility

| Future Feature | Design Accommodation |
|---|---|
| Email/SMS notifications | Existing `notifications` table + notification service integration |
| SLA breach alerts | `escalation_rules` table already supports role/user-based targeting |
| Customer satisfaction surveys | `satisfaction_rating` and `satisfaction_feedback` fields already exist |
| Complaint analytics / trends | `complaint_categories` hierarchy + indexes support aggregation |
| External complainant portal | `is_anonymous` and `is_confidential` fields already exist |
| Workflow customization per tenant | `tenant.settings` JSON field can store workflow config |
| Bulk operations | Add `POST /complaints/bulk-assign` and `POST /complaints/bulk-close` endpoints |

### 13.3 Integration Points

| System | Integration |
|---|---|
| Email Service | Auto-send notifications on assignment, escalation, closure |
| Notification Service | Use existing MindFlow notification infrastructure |
| Document Service | Attachments already integrated via `complaint_attachments` |
| HR Service | Employee and department data accessed via cross-service UUID references |

---

## Appendix A: Field Mapping Reference

| PRD Field | Database Column | Table | Status |
|---|---|---|---|
| Complaint ID / Reference Number | `complaint_number` | complaints | EXISTS |
| Date Time Received | `created_at` | complaints | EXISTS |
| Channel | `source_channel` | complaints | EXISTS |
| Complainant Type | `complainant_type` | complaints | **NEW** |
| Complainant Name | `complainant_name` | complaints | EXISTS |
| Reason for Complaint | `title` | complaints | EXISTS (semantic map) |
| Contact Number | `complainant_contact` | complaints | EXISTS |
| Insurer / Client | `insurer_client` | complaints | **NEW** |
| Claim Number | `reference_id` (with `reference_type = 'CLAIM'`) | complaints | EXISTS (reuse) |
| Vehicle Number | `vehicle_number` | complaints | **NEW** |
| Workshop Name | `workshop_name` | complaints | **NEW** |
| Complaint Description | `description` | complaints | EXISTS |
| Severity | `severity` | complaints | EXISTS |
| Corrective Action | `corrective_action` | complaints | **NEW** |
| Assigned To | `owner_employee_id` | complaints | EXISTS |
| Assigned On | `assigned_at` | complaints | EXISTS |
| Expected Closure Date | `expected_closure_date` | complaints | **NEW** |
| Current Status | `status` | complaints | EXISTS |
| Last Update Date | `updated_at` | complaints | EXISTS |
| Action Taken / Remarks | `closure_remarks` | complaints | EXISTS |
| Closed On | `closed_at` | complaints | EXISTS |
| Closure TAT | `closure_tat_hours` | complaints | **NEW** |
| Escalated | Derived: `escalation_level > 0` | complaints | EXISTS (derived) |
| Escalation Level | `escalation_level` | complaints | EXISTS |

**v1.1 additions:**

| PRD Field | Database Column | Table | Status |
|---|---|---|---|
| Complaint Type | `complaint_type` | complaints | **NEW (v1.1)** |
| Closure TAT (Days) | `closure_tat_days` | complaints | **NEW (v1.1)** |
| Reason for Complaint | `reason_for_complaint` | complaints | **NEW (v1.1)** |

**Summary (v1.1):** 10 new columns total, 0 new tables.

---

## Appendix B: List View Columns (Updated v1.1)

Per PART 5, the complaint list must display these columns in order:

| # | Column | Source |
|---|---|---|
| 1 | Complaint ID | `complaint_number` |
| 2 | Channel | `source_channel` |
| 3 | Category | `category.name` |
| 4 | Complaint Type | `complaint_type` |
| 5 | Complainant Name | `complainant_name` |
| 6 | Insurer / Client | `insurer_client` |
| 7 | Claim Number | `reference_id` |
| 8 | Vehicle Number | `vehicle_number` |
| 9 | Assigned To | `owner_employee_id` |
| 10 | Severity | `severity` |
| 11 | Current Status | `status` |
| 12 | Closure TAT (Days) | `closure_tat_days` = `closed_at - created_at` in days |
| 13 | Escalated (Y/N) | `Y` if `escalation_level > 0`, else `N` |
| 14 | Escalation Level | `escalation_level` |
| 15 | Last Update Date | `updated_at` |
| 16 | Created Date | `created_at` |

---

## Appendix C: Simplified Status Mapping

| Internal Status | Simplified Display | Color Code |
|---|---|---|
| NEW | Open | Blue |
| ASSIGNED | Open | Blue |
| REOPENED | Open | Orange |
| IN_PROGRESS | Working | Yellow |
| WAITING_INFO | Working | Yellow |
| RESOLVED | Closed | Green |
| CLOSED | Closed | Gray |

---

*End of Document*
