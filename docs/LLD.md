# MindFlow – Low-Level Design (LLD)

> **WARNING**: CONTENT IN THIS FILE IS DRAFT UNTIL THE CORRESPONDING SDLC PHASE GATE IS CLOSED.
>
> - Data Schema sections become FROZEN after Phase 2 closure.
> - API Contract sections become FROZEN after Phase 3 closure.
> - Business Logic sections become FROZEN after Phase 4 closure.

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Status** | SKELETON – Awaiting Phase 2 |
| **Current SDLC Phase** | Phase 0.5 (Security & Compliance) |
| **Last Updated** | 2026-01-13 |

---

## Table of Contents

1. [Auth Service](#1-auth-service-port-8101)
2. [HR Service](#2-hr-service-port-8102)
3. [Task Service](#3-task-service-port-8103)
4. [MindMap Service](#4-mindmap-service-port-8104)
5. [Training Service](#5-training-service-port-8105)
6. [Expense Service](#6-expense-service-port-8106)
7. [Complaint Service](#7-complaint-service-port-8107)
8. [Approval Service](#8-approval-service-port-8108)
9. [Notification Service](#9-notification-service-port-8109)
10. [Storage Service](#10-storage-service-port-8110)
11. [Cross-Cutting: Compliance Tables](#11-cross-cutting-compliance-tables)

---

## 1. Auth Service (Port 8101)

### 1.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `tenants` | Tenant registry | PENDING |
| `users` | User accounts | PENDING |
| `roles` | Role definitions | PENDING |
| `user_roles` | User-role assignments | PENDING |
| `permissions` | Permission definitions | PENDING |
| `role_permissions` | Role-permission mappings | PENDING |
| `refresh_tokens` | JWT refresh token storage | PENDING |
| `password_reset_tokens` | Password reset requests | PENDING |
| `login_attempts` | Failed login tracking | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 1.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/auth/login` | User login | PENDING |
| POST | `/api/v1/auth/logout` | User logout | PENDING |
| POST | `/api/v1/auth/refresh` | Refresh access token | PENDING |
| POST | `/api/v1/auth/password/reset` | Request password reset | PENDING |
| GET | `/api/v1/users` | List users | PENDING |
| GET | `/api/v1/users/{id}` | Get user details | PENDING |
| POST | `/api/v1/users` | Create user | PENDING |
| PUT | `/api/v1/users/{id}` | Update user | PENDING |
| DELETE | `/api/v1/users/{id}` | Deactivate user | PENDING |
| GET | `/api/v1/roles` | List roles | PENDING |
| GET | `/api/v1/tenants` | List tenants (super-admin) | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 1.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 2. HR Service (Port 8102)

### 2.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `departments` | Department registry | PENDING |
| `positions` | Job positions/titles | PENDING |
| `employees` | Employee master data | PENDING |
| `employee_hierarchy` | Reporting relationships | PENDING |
| `attendance_records` | Daily attendance | PENDING |
| `leave_types` | Leave type definitions | PENDING |
| `leave_balances` | Employee leave balances | PENDING |
| `leave_requests` | Leave applications | PENDING |
| `holidays` | Holiday calendar | PENDING |
| `shifts` | Shift definitions | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 2.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/employees` | List employees | PENDING |
| GET | `/api/v1/employees/{id}` | Get employee details | PENDING |
| POST | `/api/v1/employees` | Create employee | PENDING |
| PUT | `/api/v1/employees/{id}` | Update employee | PENDING |
| GET | `/api/v1/departments` | List departments | PENDING |
| GET | `/api/v1/positions` | List positions | PENDING |
| GET | `/api/v1/attendance` | List attendance records | PENDING |
| POST | `/api/v1/attendance/check-in` | Record check-in | PENDING |
| POST | `/api/v1/attendance/check-out` | Record check-out | PENDING |
| GET | `/api/v1/leave-requests` | List leave requests | PENDING |
| POST | `/api/v1/leave-requests` | Submit leave request | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 2.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 3. Task Service (Port 8103)

### 3.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `tasks` | Task master | PENDING |
| `task_assignments` | Task-assignee mapping | PENDING |
| `task_comments` | Task comments/updates | PENDING |
| `task_attachments` | Task file references | PENDING |
| `task_dependencies` | Task dependency links | PENDING |
| `task_checklists` | Subtask checklists | PENDING |
| `task_labels` | Label definitions | PENDING |
| `task_label_assignments` | Task-label mapping | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 3.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/tasks` | List tasks | PENDING |
| GET | `/api/v1/tasks/{id}` | Get task details | PENDING |
| POST | `/api/v1/tasks` | Create task | PENDING |
| PUT | `/api/v1/tasks/{id}` | Update task | PENDING |
| DELETE | `/api/v1/tasks/{id}` | Delete task | PENDING |
| POST | `/api/v1/tasks/{id}/assign` | Assign task | PENDING |
| POST | `/api/v1/tasks/{id}/comments` | Add comment | PENDING |
| PUT | `/api/v1/tasks/{id}/status` | Update status | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 3.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 4. MindMap Service (Port 8104)

### 4.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `mindmaps` | Mind map master | PENDING |
| `mindmap_nodes` | Node definitions | PENDING |
| `mindmap_edges` | Node connections | PENDING |
| `mindmap_templates` | Reusable templates | PENDING |
| `mindmap_shares` | Sharing permissions | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 4.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/mindmaps` | List mind maps | PENDING |
| GET | `/api/v1/mindmaps/{id}` | Get mind map | PENDING |
| POST | `/api/v1/mindmaps` | Create mind map | PENDING |
| PUT | `/api/v1/mindmaps/{id}` | Update mind map | PENDING |
| DELETE | `/api/v1/mindmaps/{id}` | Delete mind map | PENDING |
| POST | `/api/v1/mindmaps/{id}/nodes` | Add node | PENDING |
| PUT | `/api/v1/mindmaps/{id}/nodes/{nodeId}` | Update node | PENDING |
| DELETE | `/api/v1/mindmaps/{id}/nodes/{nodeId}` | Delete node | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 4.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 5. Training Service (Port 8105)

### 5.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `courses` | Course definitions | PENDING |
| `course_modules` | Course content modules | PENDING |
| `training_sessions` | Scheduled sessions | PENDING |
| `session_enrollments` | Participant enrollments | PENDING |
| `exams` | Exam definitions | PENDING |
| `exam_questions` | Exam question bank | PENDING |
| `exam_attempts` | User exam attempts | PENDING |
| `exam_responses` | Question responses | PENDING |
| `certificates` | Issued certificates | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 5.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/courses` | List courses | PENDING |
| GET | `/api/v1/courses/{id}` | Get course details | PENDING |
| POST | `/api/v1/courses` | Create course | PENDING |
| GET | `/api/v1/sessions` | List training sessions | PENDING |
| POST | `/api/v1/sessions/{id}/enroll` | Enroll in session | PENDING |
| GET | `/api/v1/exams` | List exams | PENDING |
| POST | `/api/v1/exams/{id}/start` | Start exam attempt | PENDING |
| POST | `/api/v1/exams/{id}/submit` | Submit exam | PENDING |
| GET | `/api/v1/certificates` | List certificates | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 5.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 6. Expense Service (Port 8106)

### 6.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `expense_categories` | Expense type definitions | PENDING |
| `expense_requests` | Expense submissions | PENDING |
| `expense_items` | Line items per request | PENDING |
| `expense_receipts` | Receipt file references | PENDING |
| `expense_policies` | Spending limits/rules | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 6.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/expenses` | List expense requests | PENDING |
| GET | `/api/v1/expenses/{id}` | Get expense details | PENDING |
| POST | `/api/v1/expenses` | Submit expense request | PENDING |
| PUT | `/api/v1/expenses/{id}` | Update expense | PENDING |
| DELETE | `/api/v1/expenses/{id}` | Cancel expense | PENDING |
| POST | `/api/v1/expenses/{id}/receipts` | Upload receipt | PENDING |
| GET | `/api/v1/expense-categories` | List categories | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 6.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 7. Complaint Service (Port 8107)

### 7.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `complaint_categories` | Complaint type definitions | PENDING |
| `complaints` | Complaint master | PENDING |
| `complaint_comments` | Discussion thread | PENDING |
| `complaint_attachments` | Supporting documents | PENDING |
| `complaint_escalations` | Escalation history | PENDING |
| `sla_configurations` | SLA rules per category | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 7.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/complaints` | List complaints | PENDING |
| GET | `/api/v1/complaints/{id}` | Get complaint details | PENDING |
| POST | `/api/v1/complaints` | Submit complaint | PENDING |
| PUT | `/api/v1/complaints/{id}` | Update complaint | PENDING |
| POST | `/api/v1/complaints/{id}/comments` | Add comment | PENDING |
| POST | `/api/v1/complaints/{id}/escalate` | Escalate complaint | PENDING |
| PUT | `/api/v1/complaints/{id}/resolve` | Resolve complaint | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 7.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 8. Approval Service (Port 8108)

### 8.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `approval_workflows` | Workflow definitions | PENDING |
| `approval_steps` | Steps per workflow | PENDING |
| `approval_requests` | Pending approvals | PENDING |
| `approval_decisions` | Decision history | PENDING |
| `delegation_rules` | Approval delegation | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 8.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/approvals/pending` | List pending approvals | PENDING |
| GET | `/api/v1/approvals/{id}` | Get approval details | PENDING |
| POST | `/api/v1/approvals/{id}/approve` | Approve request | PENDING |
| POST | `/api/v1/approvals/{id}/reject` | Reject request | PENDING |
| POST | `/api/v1/approvals/{id}/delegate` | Delegate approval | PENDING |
| GET | `/api/v1/approval-workflows` | List workflows | PENDING |
| POST | `/api/v1/approval-workflows` | Create workflow | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 8.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 9. Notification Service (Port 8109)

### 9.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `notifications` | Notification records | PENDING |
| `notification_preferences` | User preferences | PENDING |
| `notification_templates` | Message templates | PENDING |
| `websocket_connections` | Active connections | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 9.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/v1/notifications` | List notifications | PENDING |
| PUT | `/api/v1/notifications/{id}/read` | Mark as read | PENDING |
| PUT | `/api/v1/notifications/read-all` | Mark all as read | PENDING |
| GET | `/api/v1/notifications/preferences` | Get preferences | PENDING |
| PUT | `/api/v1/notifications/preferences` | Update preferences | PENDING |
| WS | `/ws/notifications` | WebSocket connection | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 9.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 10. Storage Service (Port 8110)

### 10.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Status |
|------------|-------------|--------|
| `files` | File metadata registry | PENDING |
| `file_access_logs` | Access audit trail | PENDING |

#### Enums

```
-- PENDING Phase 2
```

#### RLS Policies

```
-- PENDING Phase 2
```

---

### 10.2 API Contracts

> **Status**: PENDING – Phase 3

#### Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/files/upload` | Upload file | PENDING |
| GET | `/api/v1/files/{id}` | Get file metadata | PENDING |
| GET | `/api/v1/files/{id}/download` | Download file | PENDING |
| DELETE | `/api/v1/files/{id}` | Delete file | PENDING |
| GET | `/api/v1/files/{id}/presigned-url` | Get presigned URL | PENDING |

#### Request/Response Schemas

```
-- PENDING Phase 3
```

---

### 10.3 Internal Business Logic

> **Status**: PENDING – Phase 4

#### State Transitions

```
-- PENDING Phase 4
```

#### Service Interactions

```
-- PENDING Phase 4
```

---

## 11. Cross-Cutting: Compliance Tables

> **Reference**: COMPLIANCE_SPECS.md

### 11.1 Data Schema

> **Status**: PENDING – Phase 2

#### Tables

| Table Name | Description | Owner Service | Status |
|------------|-------------|---------------|--------|
| `consent_records` | Consent tracking | auth-service | PENDING |
| `consent_versions` | Consent text versions | auth-service | PENDING |
| `data_correction_requests` | DPDP correction requests | auth-service | PENDING |
| `data_erasure_requests` | DPDP erasure requests | auth-service | PENDING |
| `security_incidents` | CERT-In incident log | auth-service | PENDING |
| `audit_logs` | System-wide audit trail | Each service | PENDING |
| `personal_data_registry` | PII field catalog | auth-service | PENDING |
| `data_classification_registry` | Classification metadata | auth-service | PENDING |

#### RLS Policies

```
-- PENDING Phase 2
```

---

## Appendix A: Common Columns

All tables MUST include (per TECH_STACK.md and COMPLIANCE_SPECS.md):

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenancy (RLS enforced) |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last modification time |
| `created_by` | UUID | User who created |
| `updated_by` | UUID | User who last modified |

Tables with personal data MUST also include:

| Column | Type | Description |
|--------|------|-------------|
| `is_deleted` | BOOLEAN | Soft delete flag |
| `deleted_at` | TIMESTAMP | Deletion timestamp |
| `deletion_reason` | VARCHAR(255) | Reason for deletion |

---

## Appendix B: Audit Log Schema

> **Status**: PENDING – Phase 2

```
-- PENDING Phase 2
-- Will define structure for immutable audit logs
-- Reference: COMPLIANCE_SPECS.md Section 7
```

---

**END OF LLD SKELETON**
