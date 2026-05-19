# MindFlow – Cross-Cutting Concerns and Architectural Rules

> **Purpose**: This document identifies cross-cutting concerns spanning multiple modules and defines non-negotiable architectural rules for MindFlow.
> **Source**: Extracted from [PRD.md](PRD.md), [TECH_STACK.md](TECH_STACK.md), and [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md)
> **SDLC Reference**: Phase 0, Tasks 0.8 and 0.9
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Tasks** | 0.8 (Cross-Cutting Concerns), 0.9 (Architectural Rules) |
| **Authority** | Subordinate to [PRD.md](PRD.md) and [TECH_STACK.md](TECH_STACK.md) |
| **Approval Status** | PENDING (per task) |

---

## Introduction

This document serves two critical purposes:

1. **Identifies cross-cutting concerns** that span multiple modules and require centralized or coordinated handling (Task 0.8)
2. **Documents non-negotiable architectural rules** that MUST be followed throughout all SDLC phases (Task 0.9)

These definitions prevent duplication, ensure consistency, and establish architectural guardrails for Phase 1 and beyond.

---

## Table of Contents

- [SECTION A: TASK 0.8 — Cross-Cutting Concerns](#section-a-task-08--cross-cutting-concerns)
- [SECTION B: TASK 0.9 — Non-Negotiable Architectural Rules](#section-b-task-09--non-negotiable-architectural-rules)
- [Approval Records](#approval-records)

---

## SECTION A: TASK 0.8 — Cross-Cutting Concerns

### SDLC Task Reference
**Task Number**: 0.8
**Task Description**: Identify cross-cutting concerns
**Source**: PRD.md Section 1.2 and module "How to Build" sections

---

### Overview

Cross-cutting concerns are capabilities that span multiple modules and cannot be isolated to a single service. These concerns require either:
- **Centralized handling** (dedicated service)
- **Distributed implementation** (common library/pattern)
- **Coordinated approach** (shared infrastructure)

---

### 1. Audit & Logging

#### Description
Immutable audit trails for all critical actions across all modules.

#### Modules Affected
- **ALL MODULES** (universal requirement)

#### Implementation Approach (from PRD Section 8.4)

| Aspect | Implementation |
|--------|----------------|
| **Mechanism** | Middleware-based audit logging |
| **Storage** | Append-only audit log table per service |
| **Retention** | 180 days online, 7 years archived (per COMPLIANCE_SPECS.md) |
| **Content** | User, action, timestamp, before/after values, tenant_id |
| **Immutability** | No updates or deletes permitted |

#### Centralized vs Distributed
**Distributed**: Each service maintains its own audit logs, but follows common schema and retention policies.

#### Technical Requirements
- All services must implement audit middleware
- Audit logs must include: `user_id`, `tenant_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `timestamp`, `ip_address`
- Critical actions requiring audit: CREATE, UPDATE, DELETE, APPROVE, REJECT, ESCALATE, ASSIGN

---

### 2. Approvals & Workflows

#### Description
Multi-level approval workflows based on organizational hierarchy.

#### Modules Affected
- Leave Management (HR Module)
- Expense Management
- Complaints Management (escalation)
- Configuration Changes (System Foundations)

#### Implementation Approach (from PRD)

| Aspect | Implementation |
|--------|----------------|
| **Service** | Centralized approval-service (Port 8108) |
| **Routing** | Hierarchy-based (from HR hierarchy) |
| **Workflow Engine** | Generic, configurable approval steps |
| **States** | Pending, Approved, Rejected, Delegated |
| **Delegation** | Support for approval delegation |

#### Centralized vs Distributed
**Centralized**: Dedicated `approval-service` handles all approval workflows.

#### Integration Pattern
- Modules submit approval requests to approval-service
- Approval-service queries hr-service for hierarchy
- Approval-service notifies originating module on decision
- Originating module updates entity status

---

### 3. Notifications

#### Description
In-app notifications for events, assignments, and alerts.

#### Modules Affected
- Task Management (assignment, due dates, overdue)
- Leave Management (approval decisions)
- Expense Management (approval decisions)
- Complaints Management (escalations)
- Training Management (session reminders, exam results)

#### Implementation Approach (from PRD Section 3.10)

| Aspect | Implementation |
|--------|----------------|
| **Service** | Centralized notification-service (Port 8109) |
| **Delivery** | WebSocket for real-time push |
| **Storage** | Notification records table |
| **Preferences** | User-configurable notification settings |
| **External Channels** | Email/WhatsApp marked as FUTURE |

#### Centralized vs Distributed
**Centralized**: Dedicated `notification-service` handles all notifications.

#### Integration Pattern
- Services publish notification events to notification-service (via Redis Pub/Sub or API)
- Notification-service stores notifications and pushes via WebSocket
- Users subscribe to WebSocket channel on login

---

### 4. Document/File Storage

#### Description
Secure file upload, storage, and retrieval for attachments.

#### Modules Affected
- Task Management (attachments)
- Training Management (content delivery: PDF, PPT, videos)
- Expense Management (receipt uploads)
- Complaints Management (supporting documents)
- Mind Mapping (node attachments)

#### Implementation Approach (from PRD and TECH_STACK.md)

| Aspect | Implementation |
|--------|----------------|
| **Service** | Centralized storage-service (Port 8110) |
| **Backend** | MinIO (S3-compatible) |
| **Metadata** | File metadata registry table |
| **Access Control** | RBAC + tenant_id enforcement |
| **Audit** | File access logs |

#### Centralized vs Distributed
**Centralized**: Dedicated `storage-service` abstracts MinIO access.

#### Integration Pattern
- Services call storage-service API for upload/download
- Storage-service generates presigned URLs
- File metadata stored in storage-service database
- Actual files stored in MinIO

---

### 5. Search & Filtering

#### Description
Cross-module search and filtering capabilities.

#### Modules Affected
- Task Management (filter by assignee, status, priority)
- Employee Directory (search by name, position)
- Complaints Management (filter by status, severity)
- Training Management (search courses)

#### Implementation Approach (from PRD)

| Aspect | Implementation |
|--------|----------------|
| **Implementation** | Distributed (per-service) |
| **Mechanism** | Database queries with indexes |
| **Future Enhancement** | Elasticsearch for full-text search |

#### Centralized vs Distributed
**Distributed**: Each service implements its own search/filter logic.

#### Technical Requirements
- All list APIs must support filtering query parameters
- Common filter patterns: status, date range, assignee, creator
- Pagination mandatory for large result sets

---

### 6. Reporting & Export

#### Description
Data export and reporting capabilities across modules.

#### Modules Affected
- Task Management (task reports, workload reports)
- Training Management (completion rates, exam scores)
- Expense Management (employee-wise, month-wise)
- Complaints Management (SLA compliance reports)
- Leave Management (leave balance reports)
- Attendance Management (attendance reports)

#### Implementation Approach (from PRD)

| Aspect | Implementation |
|--------|----------------|
| **Implementation** | Distributed (per-service) |
| **Export Format** | CSV (explicitly mentioned in PRD Section 6.6) |
| **Aggregation** | SQL aggregate queries |
| **Future Enhancement** | PDF reports, dashboards |

#### Centralized vs Distributed
**Distributed**: Each service generates its own reports.

#### Technical Requirements
- Export APIs must enforce tenant_id filtering
- Large exports should be asynchronous (Celery tasks)
- Export audit logging mandatory

---

### 7. Configuration Management

#### Description
Business rules and operational parameters that must be configurable, not hard-coded.

#### Modules Affected
- Complaints Management (SLA rules per category)
- Expense Management (approval thresholds)
- Leave Management (leave balance rules)
- Training Management (passing scores)

#### Implementation Approach (from PRD Section 8.7)

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Config tables per service |
| **Admin UI** | Required for config management |
| **Audit** | All config changes must be audited |
| **Validation** | Config changes require validation |

#### Centralized vs Distributed
**Distributed**: Each service manages its own configuration tables.

#### Technical Requirements
- Config changes require admin role
- Config history must be maintained
- Config changes trigger audit events

---

### 8. SLA & Escalation

#### Description
Service Level Agreement tracking and automatic escalation.

#### Modules Affected
- Complaints Management (SLA based on severity)
- Task Management (overdue task escalation)

#### Implementation Approach (from PRD Section 7.7 and 7.8)

| Aspect | Implementation |
|--------|----------------|
| **SLA Rules** | Configurable per complaint category/task priority |
| **TAT Calculation** | Automatic based on creation time |
| **Escalation** | Scheduler + hierarchy lookup |
| **Notification** | Trigger notifications on SLA breach |

#### Centralized vs Distributed
**Distributed**: Implemented per-service (complaints-service, task-service).

#### Technical Requirements
- Celery scheduled task runs hourly to check SLA breaches
- Escalation queries hr-service for hierarchy
- Escalation triggers notification-service

---

### 9. RBAC & Authorization

#### Description
Role-Based Access Control and permission enforcement.

#### Modules Affected
- **ALL MODULES** (universal requirement)

#### Implementation Approach (from PRD Section 8.2)

| Aspect | Implementation |
|--------|----------------|
| **Service** | Centralized auth-service (Port 8101) |
| **Enforcement** | API-level (middleware in each service) |
| **Permissions** | Fine-grained per module and action |
| **Hierarchy** | Permission checks may query HR hierarchy |

#### Centralized vs Distributed
**Hybrid**:
- Permission definitions stored in auth-service
- Permission enforcement distributed (middleware per service)

#### Integration Pattern
- All services validate JWT tokens from auth-service
- Services call auth-service to check permissions
- Services may query hr-service for hierarchy-based checks

---

### 10. Multi-Tenancy Enforcement

#### Description
Data isolation and tenant_id enforcement across all modules.

#### Modules Affected
- **ALL MODULES** (universal requirement)

#### Implementation Approach (from PRD Section 8.3)

| Aspect | Implementation |
|--------|----------------|
| **Mechanism** | `tenant_id` + PostgreSQL Row-Level Security (RLS) |
| **Application Layer** | Inject `tenant_id` from JWT session |
| **Database Layer** | RLS policies filter all queries |
| **Validation** | Application validates `tenant_id` matches session |

#### Centralized vs Distributed
**Distributed**: All services must implement tenant_id injection and RLS policies.

#### Technical Requirements
- ALL tables must have `tenant_id` column
- ALL tables must have RLS policies
- ALL APIs must inject `tenant_id` from authenticated session
- Cross-tenant queries are FORBIDDEN (enforced by RLS)

---

### Cross-Cutting Concerns Summary Table

| Concern | Approach | Service Owner | Phase 2 Impact |
|---------|----------|---------------|----------------|
| **Audit & Logging** | Distributed | Each service | Audit log tables per service |
| **Approvals & Workflows** | Centralized | approval-service | Approval workflow tables |
| **Notifications** | Centralized | notification-service | Notification tables, WebSocket |
| **Document/File Storage** | Centralized | storage-service | File metadata registry |
| **Search & Filtering** | Distributed | Each service | Indexes on filter columns |
| **Reporting & Export** | Distributed | Each service | Aggregate query optimization |
| **Configuration Management** | Distributed | Each service | Config tables per service |
| **SLA & Escalation** | Distributed | Per service | SLA config tables, scheduled tasks |
| **RBAC & Authorization** | Hybrid | auth-service | Permission tables, middleware |
| **Multi-Tenancy Enforcement** | Distributed | All services | `tenant_id` + RLS on all tables |

---

### Approval Record: Task 0.8

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## SECTION B: TASK 0.9 — Non-Negotiable Architectural Rules

### SDLC Task Reference
**Task Number**: 0.9
**Task Description**: Document non-negotiable architectural rules
**Source**: PRD.md Section 1.3, Section 8.x, and module-specific constraints

---

### Overview

These rules are **MANDATORY** and **NON-NEGOTIABLE**. Violation of any rule requires PRD amendment and explicit Product Owner approval.

---

### Rule 1: Modules are Independent but Integrated

**Source**: PRD Section 1.3 (Design Principle #1)

#### Statement
No module "owns" another. Cross-module links exist via references, not duplication.

#### Implications
- Task Management does NOT own Mind Maps
- Mind Maps do NOT own Tasks
- Complaints do NOT own Tasks (they may reference tasks)
- Each module has clear entity ownership

#### Enforcement
- Phase 1 (Architecture Design): Define entity ownership boundaries
- Phase 2 (Schema Design): Foreign keys must reference entities, not duplicate data
- Phase 6 (Implementation): No direct database access between services

#### Violation Example
❌ Mind Map nodes storing task data (title, description, status)
✅ Mind Map nodes storing only `task_id` reference

---

### Rule 2: Hierarchy is the Backbone

**Source**: PRD Section 1.3 (Design Principle #2)

#### Statement
Task assignment, approvals, escalations, and visibility ALL flow from HR hierarchy.

#### Implications
- HR Module is the FOUNDATION for all other modules
- Organizational hierarchy defines:
  - Who can assign tasks to whom
  - Who approves what (multi-level)
  - Who sees what (visibility)
  - Escalation paths

#### Enforcement
- Phase 1: HR service must be designed first
- Phase 2: Hierarchy relationships must be modeled correctly
- Phase 3: All approval APIs must query HR hierarchy
- Phase 6: All assignment/approval logic must validate against hierarchy

#### Violation Example
❌ Hard-coded approval rules (e.g., "Manager A approves expenses")
✅ Dynamic hierarchy lookup (e.g., "Employee's reporting manager approves")

---

### Rule 3: Execution > Ornamentation

**Source**: PRD Section 1.3 (Design Principle #3)

#### Statement
No ERP bloat, no CRM, no performance appraisal system, no payroll automation, no gamification.

#### Implications
- Focus on operational execution, not enterprise features
- Features must have clear operational value
- No "nice to have" enterprise integrations

#### Enforcement
- Phase 0: Explicit out-of-scope list (26 items documented)
- All Phases: New features require PRD amendment

#### Violation Example
❌ Adding performance review module
❌ Adding gamification badges/points
✅ Adding task completion tracking (operational value)

---

### Rule 4: Auditability Everywhere

**Source**: PRD Section 1.3 (Design Principle #4)

#### Statement
Nothing important happens silently. History is immutable.

#### Implications
- All critical actions must be logged
- Audit logs are append-only (no updates, no deletes)
- Who did what, when, and why must be traceable

#### Enforcement
- Phase 2: Audit log tables per service
- Phase 3: Audit APIs defined
- Phase 6: Audit middleware mandatory

#### Critical Actions Requiring Audit
- CREATE, UPDATE, DELETE operations on core entities
- APPROVE, REJECT decisions
- ASSIGN, REASSIGN actions
- ESCALATE operations
- Configuration changes

---

### Rule 5: Multi-Tenancy Enforcement

**Source**: PRD Section 8.3

#### Statement
`tenant_id` + PostgreSQL Row-Level Security (RLS) on ALL entities.

#### Implications
- ALL tables must have `tenant_id` column (non-nullable)
- ALL tables must have RLS policies
- ALL APIs must inject `tenant_id` from session
- Cross-tenant access is FORBIDDEN

#### Enforcement
- Phase 2: Schema design must include `tenant_id` on all tables
- Phase 2: RLS policies must be defined for all tables
- Phase 6: Application must inject `tenant_id`
- Phase 7: Testing must validate tenant isolation

#### Violation Example
❌ Table without `tenant_id` column
❌ Query that doesn't filter by `tenant_id`
✅ All queries automatically filtered by RLS policies

---

### Rule 6: Online-Only Architecture

**Source**: PRD Section 1.1

#### Statement
No offline-first or local-first assumptions anywhere in the system.

#### Implications
- Central backend is MANDATORY
- All data lives on server
- No local storage of business data
- No offline sync mechanisms

#### Enforcement
- Phase 1: Architecture must be centralized
- Phase 6: Frontend must require server connectivity
- Phase 7: Testing must validate server dependency

#### Violation Example
❌ Implementing local storage for tasks
❌ Building offline sync
✅ Network error handling with user-friendly messages

---

### Rule 7: Web-Only Phase 1

**Source**: PRD Section 1.1

#### Statement
Phase 1 is WEB-ONLY. Mobile apps are planned for future phases.

#### Implications
- No native mobile app development in Phase 1
- Responsive web design for mobile browsers acceptable
- No React Native, Flutter, or native mobile code

#### Enforcement
- Phase 0: Platform scope locked (Task 0.6)
- Phase 1: Architecture focuses on web delivery
- Phase 5: Implementation roadmap excludes mobile apps

#### Violation Example
❌ Starting React Native development
✅ Responsive web UI that works on mobile browsers

---

### Rule 8: Enum-Based Statuses (No Free-Text)

**Source**: PRD Section 3.4

#### Statement
Task statuses (and other entity statuses) must be standardized and controlled. Free-text statuses are not allowed.

#### Implications
- Status values must be enums
- Status transitions must be validated
- Reporting and filtering rely on predictable status values

#### Enforcement
- Phase 2: Define status enums for all entities
- Phase 3: API validation of status values
- Phase 6: Backend enforces enum constraints

#### Violation Example
❌ Allowing users to type custom status values
✅ Dropdown with predefined statuses only

---

### Rule 9: Soft Deletes for Critical Data

**Source**: PRD Section 2.1, Section 8.4, and COMPLIANCE_SPECS.md

#### Statement
Critical data must use soft deletes (retain data with `is_deleted` flag).

#### Implications
- No hard deletes on core entities (tasks, employees, complaints, etc.)
- Audit trails remain intact
- Data recovery possible
- Compliance with data retention requirements

#### Enforcement
- Phase 2: Tables must include `is_deleted`, `deleted_at`, `deletion_reason`
- Phase 3: Delete APIs implement soft delete
- Phase 6: Hard deletes only after retention period expires (automated)

#### Entities Requiring Soft Delete
- Employees
- Tasks
- Mind Maps
- Training Modules
- Expenses
- Complaints
- All entities with audit significance

---

### Rule 10: API-Level Validation and Enforcement

**Source**: PRD Section 8.2, multiple module sections

#### Statement
Business rules, permissions, and data validation must be enforced at the API level, not just in the UI.

#### Implications
- UI is NOT trusted for validation
- Backend APIs validate all inputs
- Authorization checks on every API endpoint
- No client-side-only validation

#### Enforcement
- Phase 3: API contracts define validation rules
- Phase 6: Backend implements validation middleware
- Phase 7: Security testing validates server-side enforcement

#### Validation Requirements
- Input validation (type, format, length)
- Business rule validation (e.g., ECD must be in future)
- Authorization checks (RBAC + hierarchy)
- Tenant_id validation (matches session)

---

### Architectural Rules Summary Table

| Rule # | Rule Name | Source | Enforcement Phase | Violation Impact |
|--------|-----------|--------|-------------------|------------------|
| 1 | Modules are Independent | PRD 1.3 | Phase 1, 2, 6 | Data duplication, tight coupling |
| 2 | Hierarchy is Backbone | PRD 1.3 | Phase 1, 2, 3, 6 | Broken approvals/escalations |
| 3 | Execution > Ornamentation | PRD 1.3 | Phase 0, All | Scope creep, feature bloat |
| 4 | Auditability Everywhere | PRD 1.3, 8.4 | Phase 2, 3, 6 | Compliance failure |
| 5 | Multi-Tenancy Enforcement | PRD 8.3 | Phase 2, 6, 7 | Data leaks, security breach |
| 6 | Online-Only Architecture | PRD 1.1 | Phase 1, 6, 7 | Architecture mismatch |
| 7 | Web-Only Phase 1 | PRD 1.1 | Phase 0, 1, 5 | Scope creep, platform mismatch |
| 8 | Enum-Based Statuses | PRD 3.4 | Phase 2, 3, 6 | Reporting breaks, validation fails |
| 9 | Soft Deletes for Critical Data | PRD 2.1, 8.4 | Phase 2, 3, 6 | Audit trail loss, compliance risk |
| 10 | API-Level Validation | PRD 8.2 | Phase 3, 6, 7 | Security vulnerabilities |

---

### Approval Record: Task 0.9

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## Approval Records

### Overall Document Approval Status

| SDLC Task | Section | Reviewer | Status | Date |
|-----------|---------|----------|--------|------|
| **0.8** | Cross-Cutting Concerns | Product Owner | PENDING | - |
| **0.9** | Architectural Rules | Product Owner | PENDING | - |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | AI (Claude) | Initial creation for SDLC Tasks 0.8-0.9 |

---

**END OF CROSS_CUTTING_AND_RULES.md**
