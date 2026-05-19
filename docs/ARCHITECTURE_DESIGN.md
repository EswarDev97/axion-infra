# MindFlow – Architecture Design Document

> **Purpose**: Define the system architecture for MindFlow Phase 1
> **SDLC Phase**: Phase 1 – System Architecture Design
> **Tasks Covered**: 1.1 through 1.10
> **Status**: COMPLETE - Ready for Product Owner Review
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 1 – System Architecture Design |
| **SDLC Tasks** | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [TECH_STACK.md](TECH_STACK.md), [DECISIONS.md](DECISIONS.md) |
| **Approval Status** | COMPLETE - Ready for Product Owner Review |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Service Architecture (Task 1.1)](#2-service-architecture-task-11)
3. [Service Responsibility Boundaries (Task 1.2)](#3-service-responsibility-boundaries-task-12)
4. [Entity Ownership (Task 1.3)](#4-entity-ownership-task-13)
5. [Cross-Cutting Concern Placement (Task 1.4)](#5-cross-cutting-concern-placement-task-14)
6. [Service Communication Patterns (Task 1.5)](#6-service-communication-patterns-task-15)
7. [Dependencies](#7-dependencies)
8. [Approval Record](#8-approval-record)
9. [Inter-Module Communication Patterns (Task 1.6)](#9-inter-module-communication-patterns-task-16)
10. [API Gateway & External Integration (Task 1.7)](#10-api-gateway--external-integration-task-17)
11. [Multi-Tenancy Enforcement (Task 1.8)](#11-multi-tenancy-enforcement-task-18)
12. [Port & Service Configuration (Task 1.9)](#12-port--service-configuration-task-19)
13. [Architecture Summary & Diagrams (Task 1.10)](#13-architecture-summary--diagrams-task-110)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the system architecture for MindFlow Phase 1, defining:
- Backend service structure and responsibilities
- Entity ownership and data boundaries
- Cross-cutting concern implementation
- Service communication patterns

### 1.2 Scope

**In Scope**:
- 7 business modules: Mind Mapping, Task Management, HR, Training, Expense, Complaints, System Foundations
- Cross-cutting services: Authentication, Notifications, File Storage, Approvals
- Phase 1 web-only deployment

**Out of Scope** (per [NON_GOALS.md](NON_GOALS.md)):
- Mobile applications
- AI/ML features
- Offline-first capabilities
- External integrations (email, SMS, WhatsApp)

### 1.3 Design Constraints

Per [TECH_STACK.md](TECH_STACK.md) and [DECISIONS.md](DECISIONS.md):
- **Backend**: Python 3.11+ with FastAPI (LOCKED)
- **Database**: PostgreSQL 16 with Row-Level Security (LOCKED)
- **Cache/Queue**: Redis 7 (LOCKED)
- **File Storage**: MinIO (LOCKED)
- **API Gateway**: Kong (LOCKED)
- **Multi-tenancy**: tenant_id + RLS on all tables (MANDATORY)

### 1.4 Scale Context

Per [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md):
- **Target users**: 40-80 employees
- **Tenant model**: Single tenant for Phase 1
- **Deployment**: Docker + Docker Compose
- **Online-only**: No offline-first requirements

---

## 2. Service Architecture (Task 1.1)

### 2.1 Architecture Approach Decision

#### Evaluation of Approaches

| Approach | Pros | Cons | Suitability for MindFlow |
|----------|------|------|--------------------------|
| **Modular Monolith** | Simple deployment, shared memory, easy debugging, lower operational overhead | Harder to scale independently, tight coupling risk, single point of failure | Suitable for 40-80 users |
| **Microservices** | Independent scaling, clear boundaries, technology flexibility, fault isolation | Operational complexity, network latency, distributed debugging, higher infrastructure cost | Over-engineered for Phase 1 scale |
| **Hybrid** | Balance of simplicity and boundaries, staged evolution path | Complexity of two patterns, inconsistent architecture | Moderate suitability |

#### Recommended Approach: Modular Monolith with Clear Service Boundaries

**Rationale**:

1. **Scale Alignment**: 40-80 users do not require independent scaling of services. A single FastAPI application can easily handle this load.

2. **Operational Simplicity**: Single deployment unit reduces DevOps complexity for Phase 1.

3. **Development Velocity**: Shared codebase enables faster iteration without inter-service coordination.

4. **Future Evolution**: Modular boundaries within the monolith enable extraction to microservices if future scale demands.

**Alignment with ADR-002**:

[ADR-002](DECISIONS.md) specifies a microservices architecture with 10 services. However, the ADR was designed for production-scale deployment. For Phase 1 with 40-80 users:

- **Implementation**: Deploy as a modular monolith with internal module boundaries matching the 10 service definitions from ADR-002
- **API Structure**: Maintain API paths as if services were separate (e.g., `/api/v1/hr/...`, `/api/v1/tasks/...`)
- **Database**: Single PostgreSQL instance with schema separation by module
- **Evolution Path**: Can extract modules to separate services when scale requires (Phase 2+)

**Product Owner Decision Required**: Confirm modular monolith approach for Phase 1 vs. full microservices deployment.

---

### 2.2 Backend Services Identified

Based on [PRD.md](PRD.md), [TECH_STACK.md](TECH_STACK.md), and [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md), MindFlow requires the following logical services (implemented as modules within the monolith):

#### Core Business Services

| Service/Module | Port (if extracted) | Description | PRD Reference |
|----------------|---------------------|-------------|---------------|
| **auth-module** | 8101 | Authentication, RBAC, tenant management, JWT issuance | PRD 8.1, 8.2 |
| **hr-module** | 8102 | Positions, hierarchy, employees, attendance, leave, payroll references | PRD 4.0 |
| **task-module** | 8103 | Task management, sub-tasks, dependencies, comments, attachments | PRD 3.0 |
| **mindmap-module** | 8104 | Mind maps, nodes, templates, task linking | PRD 2.0 |
| **training-module** | 8105 | Courses, sessions, enrollment, exams, certificates | PRD 5.0 |
| **expense-module** | 8106 | Expense requests, items, approvals, payments | PRD 6.0 |
| **complaint-module** | 8107 | Complaints, SLA, escalation, actions | PRD 7.0 |

#### Cross-Cutting Services

| Service/Module | Port (if extracted) | Description | PRD Reference |
|----------------|---------------------|-------------|---------------|
| **approval-module** | 8108 | Generic approval workflows, multi-level approvals | PRD 4.7, 6.3 |
| **notification-module** | 8109 | Real-time notifications, WebSocket, notification queue | PRD 8.5 |
| **storage-module** | 8110 | File uploads, MinIO abstraction, virus scanning (future) | PRD 3.9, 5.4, 6.2 |

#### Infrastructure Services (External)

| Service | Port | Description | Managed By |
|---------|------|-------------|------------|
| **PostgreSQL** | 5432 | Primary data store with RLS | Docker Compose |
| **Redis** | 6379 | Caching, sessions, Celery broker | Docker Compose |
| **MinIO** | 9000/9001 | S3-compatible object storage | Docker Compose |
| **Kong** | 8000/8001 | API Gateway (routing, rate limiting) | Docker Compose |
| **Celery Worker** | N/A | Background task processing | Docker Compose |

---

### 2.3 High-Level Architecture Diagram

```
                          ┌─────────────────────────────────┐
                          │         Next.js Frontend         │
                          │           (Port 3000)            │
                          └───────────────┬─────────────────┘
                                          │ HTTPS
                                          ▼
                          ┌─────────────────────────────────┐
                          │       Kong API Gateway           │
                          │     (Port 8000 - Proxy)          │
                          │     (Port 8001 - Admin)          │
                          └───────────────┬─────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MindFlow Backend (FastAPI)                          │
│                              (Port 8100)                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ auth-module │  │  hr-module  │  │ task-module │  │mindmap-mod  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │training-mod │  │expense-mod  │  │complaint-mod│  │approval-mod │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐                                          │
│  │notif-module │  │storage-mod  │                                          │
│  └─────────────┘  └─────────────┘                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │                    Shared Infrastructure                     │           │
│  │  • Database Session Manager (RLS enforcement)                │           │
│  │  • Redis Client (caching, sessions)                          │           │
│  │  • Celery Client (background tasks)                          │           │
│  │  • Audit Logging Middleware                                  │           │
│  │  • Authentication Middleware                                 │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ PostgreSQL  │      │    Redis    │      │    MinIO    │
    │  (5432)     │      │   (6379)    │      │ (9000/9001) │
    └─────────────┘      └─────────────┘      └─────────────┘
```

---

### 2.4 Why This Architecture Suits MindFlow

| Requirement | How Architecture Addresses It |
|-------------|------------------------------|
| **40-80 user scale** | Single backend instance sufficient; no distributed complexity |
| **Single tenant Phase 1** | Simplified auth; RLS ready for multi-tenant future |
| **Operational simplicity** | One container for backend; standard Docker Compose |
| **Clear module boundaries** | Internal modules match ADR-002 services; easy to extract |
| **Hierarchy-based operations** | hr-module provides hierarchy data to all other modules |
| **Multi-tenancy ready** | PostgreSQL RLS + tenant_id on all tables |
| **Audit requirements** | Centralized audit middleware captures all actions |
| **Compliance (CERT-In, DPDP)** | Structured logging, retention policies enforceable |

---

## 3. Service Responsibility Boundaries (Task 1.2)

### 3.1 auth-module

| Aspect | Definition |
|--------|------------|
| **Owns** | User accounts, authentication, JWT tokens, roles, permissions, tenant records, sessions, password management |
| **Does NOT Own** | Employee HR data (hr-module), business data access (other modules) |
| **Depends On** | PostgreSQL (users, roles tables), Redis (sessions, token blacklist) |

**Key Responsibilities**:
- JWT issuance (access + refresh tokens)
- Token validation and revocation
- Password hashing (bcrypt) and validation
- Account lockout enforcement
- Session management (30-min idle, 12-hr absolute)
- RBAC permission checks
- Tenant isolation enforcement

---

### 3.2 hr-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Employees, positions, departments, organizational hierarchy, attendance, leave requests, payroll references, candidates |
| **Does NOT Own** | User authentication (auth-module), tasks (task-module), training records (training-module) |
| **Depends On** | auth-module (user_id linkage), approval-module (leave approvals), notification-module (leave notifications) |

**Key Responsibilities**:
- Employee lifecycle (create, update, deactivate)
- Organizational hierarchy management
- Position and department management
- Attendance marking and reporting
- Leave request submission and tracking
- Payroll reference storage (no calculations)
- Candidate tracking (basic recruitment)
- Provide hierarchy data to other modules

---

### 3.3 task-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Tasks, sub-tasks, task dependencies, task comments, task attachments (metadata), task status transitions |
| **Does NOT Own** | Mind maps (mindmap-module), file storage (storage-module), employee data (hr-module) |
| **Depends On** | hr-module (assignee validation, hierarchy), storage-module (attachments), notification-module (assignment notifications), approval-module (task approvals if needed) |

**Key Responsibilities**:
- Task CRUD operations
- Sub-task management
- Task assignment (validated against hierarchy)
- Status workflow (Open → In Progress → Blocked → Completed → Dropped)
- Comment management
- Attachment metadata tracking
- Overdue task detection (Celery)
- Task linking to mind map nodes

---

### 3.4 mindmap-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Mind maps, mind map nodes, node relationships, templates, node attachments (metadata) |
| **Does NOT Own** | Tasks (task-module), file storage (storage-module), employee data (hr-module) |
| **Depends On** | hr-module (creator validation), storage-module (attachments), task-module (node-task linking) |

**Key Responsibilities**:
- Mind map CRUD operations
- Node hierarchy management (parent-child)
- Template management
- Node-to-task linking (reference only, no ownership)
- Version tracking (optional enhancement)

---

### 3.5 training-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Courses, training sessions, enrollments, training attendance, exams, exam attempts, exam scores, certificates, training content metadata |
| **Does NOT Own** | Content files (storage-module), employee data (hr-module), notifications (notification-module) |
| **Depends On** | hr-module (trainee/trainer validation), storage-module (content files), notification-module (session reminders), approval-module (enrollment approvals if needed) |

**Key Responsibilities**:
- Course and session management
- Enrollment processing
- Training attendance tracking
- Exam administration
- Score calculation and pass/fail determination
- Certificate generation
- Training compliance reporting

---

### 3.6 expense-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Expense requests, expense items, expense categories, payment records |
| **Does NOT Own** | Receipt files (storage-module), approvals (approval-module), employee data (hr-module) |
| **Depends On** | hr-module (requester validation, hierarchy), storage-module (receipts), approval-module (multi-level approvals), notification-module (approval notifications) |

**Key Responsibilities**:
- Expense request submission
- Expense item management
- Category configuration
- Payment tracking (no automation)
- Expense reporting

---

### 3.7 complaint-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Complaints, complaint categories, complaint actions, SLA configurations, escalation rules |
| **Does NOT Own** | Attachment files (storage-module), employee data (hr-module), approvals (approval-module) |
| **Depends On** | hr-module (owner assignment, escalation hierarchy), storage-module (attachments), notification-module (escalation alerts), task-module (complaint-to-task linking) |

**Key Responsibilities**:
- Complaint logging and categorization
- Assignment and reassignment
- Action tracking
- SLA monitoring and breach detection
- Auto-escalation (Celery scheduled task)
- Complaint resolution workflow
- SLA compliance reporting

---

### 3.8 approval-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Approval workflows, approval steps, approval instances, approval decisions, delegation rules |
| **Does NOT Own** | Business entities being approved (owned by respective modules), hierarchy (hr-module) |
| **Depends On** | hr-module (approver lookup via hierarchy), notification-module (approval requests/decisions) |

**Key Responsibilities**:
- Generic approval workflow engine
- Multi-level approval routing
- Approval delegation support
- Decision recording (approve/reject/delegate)
- Timeout handling for pending approvals
- Callback to originating module on decision

---

### 3.9 notification-module

| Aspect | Definition |
|--------|------------|
| **Owns** | Notification queue, notification records, user notification preferences, WebSocket connections |
| **Does NOT Own** | Business events (generated by other modules), employee data (hr-module) |
| **Depends On** | Redis (pub/sub for real-time), auth-module (user validation) |

**Key Responsibilities**:
- Receive notification events from other modules
- Store notification records
- Push real-time notifications via WebSocket
- Manage user notification preferences
- Mark notifications as read/unread
- Future: Email/SMS integration (Phase 2+)

---

### 3.10 storage-module

| Aspect | Definition |
|--------|------------|
| **Owns** | File metadata registry, MinIO bucket management, presigned URL generation |
| **Does NOT Own** | Business context of files (owned by respective modules) |
| **Depends On** | MinIO (object storage), auth-module (access validation) |

**Key Responsibilities**:
- File upload handling
- Presigned URL generation for downloads
- File metadata tracking (name, size, type, uploader, upload_date)
- Tenant-scoped storage paths
- File deletion (cascade from business entities)
- Future: Virus scanning (ClamAV)

---

### 3.11 Responsibility Matrix Summary

| Module | Creates | Reads | Updates | Deletes | Approves |
|--------|---------|-------|---------|---------|----------|
| **auth-module** | Users, sessions, tokens | Own entities | Own entities | Sessions, tokens | N/A |
| **hr-module** | Employees, positions, leave | Own + subordinates (hierarchy) | Own entities | Soft delete employees | Leave requests |
| **task-module** | Tasks, comments | Own + assigned + subordinates | Own entities | Soft delete tasks | Task completion |
| **mindmap-module** | Mind maps, nodes | Own + shared | Own entities | Soft delete maps | N/A |
| **training-module** | Courses, enrollments, exams | Own + assigned | Own entities | Soft delete courses | Enrollments |
| **expense-module** | Expense requests | Own + subordinates | Own entities (draft) | Soft delete (draft) | Via approval-module |
| **complaint-module** | Complaints, actions | Assigned + escalation chain | Own entities | Soft delete | N/A |
| **approval-module** | Workflows, instances | Approver's queue | Decisions | N/A | All approval types |
| **notification-module** | Notifications | Own notifications | Read status | N/A | N/A |
| **storage-module** | File metadata | Via presigned URL | Metadata | Files (cascade) | N/A |

---

## 4. Entity Ownership (Task 1.3)

### 4.1 Entity Ownership Principles

Per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Rule 1:
- **No module "owns" another**
- **Cross-module links via references, not duplication**
- **Each module has clear entity ownership**

### 4.2 Entity Ownership by Module

#### auth-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `users` | `id` (UUID) | auth-module (full CRUD) | Read by all modules (user_id references) |
| `roles` | `id` (UUID) | auth-module (full CRUD) | Read by all modules (role checks) |
| `permissions` | `id` (UUID) | auth-module (full CRUD) | Read by all modules (permission checks) |
| `user_tenant_roles` | `id` (UUID) | auth-module (full CRUD) | Read by all modules |
| `sessions` | `id` (UUID) | auth-module (full CRUD) | None |
| `tenants` | `id` (UUID) | auth-module (full CRUD) | Read by all modules (tenant_id) |

**Common Columns** (per [LLD.md](LLD.md)):
- `id` (UUID, PK)
- `tenant_id` (UUID, FK, RLS)
- `created_at`, `updated_at` (TIMESTAMP)
- `created_by`, `updated_by` (UUID, FK to users)

---

#### hr-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `employees` | `id` (UUID) | hr-module (full CRUD) | Read by all modules (employee_id references) |
| `positions` | `id` (UUID) | hr-module (full CRUD) | Read by task, training modules |
| `departments` | `id` (UUID) | hr-module (full CRUD) | Read by all modules |
| `attendance_records` | `id` (UUID) | hr-module (full CRUD) | None |
| `leave_requests` | `id` (UUID) | hr-module (full CRUD) | Read by approval-module |
| `leave_types` | `id` (UUID) | hr-module (full CRUD) | None |
| `leave_balances` | `id` (UUID) | hr-module (full CRUD) | None |
| `payroll_references` | `id` (UUID) | hr-module (full CRUD) | None |
| `candidates` | `id` (UUID) | hr-module (full CRUD) | None |

**PII Entities** (require soft delete columns):
- `employees`: `is_deleted`, `deleted_at`, `deletion_reason`
- `candidates`: `is_deleted`, `deleted_at`, `deletion_reason`

---

#### task-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `tasks` | `id` (UUID) | task-module (full CRUD) | Read by mindmap-module (node linking), complaint-module |
| `task_assignees` | `id` (UUID) | task-module (full CRUD) | None |
| `task_comments` | `id` (UUID) | task-module (full CRUD) | None |
| `task_attachments` | `id` (UUID) | task-module (full CRUD) | Read by storage-module (file deletion) |
| `task_dependencies` | `id` (UUID) | task-module (full CRUD) | None |
| `task_statuses` | `id` (UUID) | task-module (full CRUD) | None |

**Soft Delete Columns**: All task entities

---

#### mindmap-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `mind_maps` | `id` (UUID) | mindmap-module (full CRUD) | None |
| `mind_map_nodes` | `id` (UUID) | mindmap-module (full CRUD) | None |
| `mind_map_templates` | `id` (UUID) | mindmap-module (full CRUD) | None |
| `node_attachments` | `id` (UUID) | mindmap-module (full CRUD) | Read by storage-module |

**Soft Delete Columns**: `mind_maps`, `mind_map_nodes`

---

#### training-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `courses` | `id` (UUID) | training-module (full CRUD) | None |
| `training_sessions` | `id` (UUID) | training-module (full CRUD) | None |
| `enrollments` | `id` (UUID) | training-module (full CRUD) | Read by approval-module |
| `training_attendance` | `id` (UUID) | training-module (full CRUD) | None |
| `exams` | `id` (UUID) | training-module (full CRUD) | None |
| `exam_questions` | `id` (UUID) | training-module (full CRUD) | None |
| `exam_attempts` | `id` (UUID) | training-module (full CRUD) | None |
| `exam_responses` | `id` (UUID) | training-module (full CRUD) | None |
| `certificates` | `id` (UUID) | training-module (full CRUD) | None |
| `training_content` | `id` (UUID) | training-module (full CRUD) | Read by storage-module |

**Soft Delete Columns**: `courses`, `training_sessions`, `enrollments`

---

#### expense-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `expense_requests` | `id` (UUID) | expense-module (full CRUD) | Read by approval-module |
| `expense_items` | `id` (UUID) | expense-module (full CRUD) | None |
| `expense_categories` | `id` (UUID) | expense-module (full CRUD) | None |
| `expense_receipts` | `id` (UUID) | expense-module (full CRUD) | Read by storage-module |
| `payment_records` | `id` (UUID) | expense-module (full CRUD) | None |

**Soft Delete Columns**: `expense_requests`

---

#### complaint-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `complaints` | `id` (UUID) | complaint-module (full CRUD) | None |
| `complaint_categories` | `id` (UUID) | complaint-module (full CRUD) | None |
| `complaint_actions` | `id` (UUID) | complaint-module (full CRUD) | None |
| `sla_configurations` | `id` (UUID) | complaint-module (full CRUD) | None |
| `escalation_rules` | `id` (UUID) | complaint-module (full CRUD) | None |
| `complaint_attachments` | `id` (UUID) | complaint-module (full CRUD) | Read by storage-module |

**Soft Delete Columns**: `complaints`

---

#### approval-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `approval_workflows` | `id` (UUID) | approval-module (full CRUD) | Read by all modules needing approvals |
| `approval_steps` | `id` (UUID) | approval-module (full CRUD) | None |
| `approval_instances` | `id` (UUID) | approval-module (full CRUD) | Read by originating module |
| `approval_decisions` | `id` (UUID) | approval-module (full CRUD) | None |
| `delegation_rules` | `id` (UUID) | approval-module (full CRUD) | None |

---

#### notification-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `notifications` | `id` (UUID) | notification-module (full CRUD) | None |
| `notification_preferences` | `id` (UUID) | notification-module (full CRUD) | None |

---

#### storage-module Entities

| Entity | Primary Key | Owner | Cross-Service Access |
|--------|-------------|-------|---------------------|
| `file_metadata` | `id` (UUID) | storage-module (full CRUD) | Read by all modules (file references) |

---

### 4.3 Cross-Module Reference Pattern

**Rule**: Modules reference entities from other modules via foreign keys, never via data duplication.

**Example**: Task references Employee

```
tasks table:
- assigned_to: UUID (FK to employees.id)
- created_by: UUID (FK to users.id)

NOT:
- assigned_to_name: VARCHAR (duplicated data - FORBIDDEN)
```

**Validation**: When task-module creates a task with `assigned_to`, it validates:
1. Employee exists in hr-module
2. Employee is active (not soft-deleted)
3. Assigner has hierarchy permission to assign to this employee

---

### 4.4 Entity Ownership Matrix

| Entity Group | Owner Module | Can Read | Can Update | Can Delete |
|--------------|--------------|----------|------------|------------|
| Users, Roles | auth-module | All modules | auth-module | auth-module |
| Employees, Hierarchy | hr-module | All modules | hr-module | hr-module (soft) |
| Tasks | task-module | creator, assignee, hierarchy | task-module | task-module (soft) |
| Mind Maps | mindmap-module | creator, shared | mindmap-module | mindmap-module (soft) |
| Courses, Scores | training-module | trainee, manager, admin | training-module | training-module (soft) |
| Expenses | expense-module | requester, approvers | expense-module | expense-module (soft) |
| Complaints | complaint-module | owner, escalation chain | complaint-module | complaint-module (soft) |
| Approvals | approval-module | requester, approvers | approval-module | N/A |
| Notifications | notification-module | recipient | notification-module | N/A |
| Files | storage-module | referencing module | storage-module | storage-module |

---

## 5. Cross-Cutting Concern Placement (Task 1.4)

Per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md), the following cross-cutting concerns require architectural placement.

### 5.1 Authentication

| Aspect | Implementation |
|--------|----------------|
| **Location** | auth-module (centralized) |
| **Enforcement** | FastAPI middleware (all routes except /auth/login, /auth/refresh, /health) |
| **Mechanism** | JWT validation (HS256), token blacklist check (Redis) |
| **Integration** | All modules receive validated user context from middleware |

**Flow**:
```
Request → Kong → FastAPI Middleware → auth-module.validate_token() → Module Handler
                      ↓
               Extract: user_id, tenant_id, roles[]
                      ↓
               Inject into Request Context
```

---

### 5.2 Authorization

| Aspect | Implementation |
|--------|----------------|
| **Location** | Hybrid: auth-module (permission definitions) + Each module (enforcement) |
| **Enforcement** | FastAPI dependencies + PostgreSQL RLS |
| **Mechanism** | RBAC permission check + Hierarchy-based filtering |
| **Integration** | Modules call auth-module for permission checks; hr-module for hierarchy |

**Flow**:
```
1. Middleware extracts roles[] from JWT
2. Route handler checks permission: auth_module.has_permission(user_id, "task:create:subordinates")
3. If permission requires hierarchy: hr_module.get_subordinates(user_id)
4. Database query applies RLS: WHERE tenant_id = :tenant_id
```

**PostgreSQL RLS Policy** (example):
```sql
CREATE POLICY tenant_isolation ON tasks
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

---

### 5.3 Audit Logging

| Aspect | Implementation |
|--------|----------------|
| **Location** | Distributed (each module logs own actions) with common middleware |
| **Enforcement** | FastAPI middleware captures all mutations (POST, PUT, PATCH, DELETE) |
| **Mechanism** | Structured JSON logging to audit_logs table |
| **Integration** | All modules use shared AuditLogMiddleware |

**Audit Log Entry Schema**:
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "action": "CREATE | UPDATE | DELETE | APPROVE | REJECT | ESCALATE | ASSIGN",
  "entity_type": "task | employee | expense_request | ...",
  "entity_id": "uuid",
  "old_value": {},
  "new_value": {},
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2026-01-16T12:00:00Z"
}
```

**Retention**: 180 days online (CERT-In), 7 years archived.

---

### 5.4 Approval Workflows

| Aspect | Implementation |
|--------|----------------|
| **Location** | Centralized: approval-module |
| **Enforcement** | Modules submit approval requests; approval-module routes and tracks |
| **Mechanism** | Generic workflow engine with configurable steps |
| **Integration** | hr-module provides hierarchy; originating module receives callback on decision |

**Flow** (Leave Request Example):
```
1. hr-module creates leave_request (status: PENDING)
2. hr-module calls approval-module.create_approval_instance(
     entity_type="leave_request",
     entity_id=leave_request.id,
     workflow_type="leave_approval"
   )
3. approval-module queries hr-module.get_manager(employee_id) for approver
4. approval-module creates approval_instance, notifies approver via notification-module
5. Approver approves/rejects via approval-module API
6. approval-module calls back to hr-module: update leave_request status
7. hr-module sends notification to requester
```

---

### 5.5 Notifications

| Aspect | Implementation |
|--------|----------------|
| **Location** | Centralized: notification-module |
| **Enforcement** | Modules publish notification events; notification-module handles delivery |
| **Mechanism** | Redis Pub/Sub for real-time; WebSocket for push; database for persistence |
| **Integration** | All modules publish to notification-module via internal API or Redis |

**Flow**:
```
1. expense-module approves expense
2. expense-module publishes event: notification_module.notify(
     user_id=requester_id,
     type="EXPENSE_APPROVED",
     payload={expense_id, amount}
   )
3. notification-module stores notification in database
4. notification-module pushes via WebSocket if user connected
5. User views in notification panel
```

---

### 5.6 File Storage

| Aspect | Implementation |
|--------|----------------|
| **Location** | Centralized: storage-module |
| **Enforcement** | Modules call storage-module API for all file operations |
| **Mechanism** | MinIO abstraction with presigned URLs |
| **Integration** | Modules store file_id reference; storage-module handles upload/download |

**Flow** (Task Attachment Upload):
```
1. Frontend requests presigned upload URL from storage-module
2. storage-module generates MinIO presigned URL (tenant-scoped path)
3. Frontend uploads directly to MinIO
4. storage-module records file_metadata (id, name, size, type, uploader, tenant_id)
5. task-module creates task_attachment record with file_id reference
```

**Tenant-Scoped Path**: `/{tenant_id}/{module}/{entity_id}/{filename}`

---

### 5.7 Multi-Tenancy Enforcement

| Aspect | Implementation |
|--------|----------------|
| **Location** | Distributed (all modules) with centralized configuration |
| **Enforcement** | PostgreSQL RLS + Application-level tenant_id injection |
| **Mechanism** | Every database session sets tenant_id from JWT |
| **Integration** | Database session manager injects tenant context |

**Implementation**:
```python
# On every request:
db_session.execute(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
```

**RLS Policy** (applied to ALL tables):
```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table_name}
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

---

### 5.8 Cross-Cutting Summary Table

| Concern | Implementation | Location | Enforcement Layer |
|---------|----------------|----------|-------------------|
| **Authentication** | JWT validation | auth-module | FastAPI Middleware |
| **Authorization** | RBAC + Hierarchy | auth-module + hr-module | FastAPI Dependencies |
| **Audit Logging** | Structured logs | Each module (shared middleware) | FastAPI Middleware |
| **Approval Workflows** | Generic engine | approval-module | Internal API |
| **Notifications** | Event-driven | notification-module | Redis Pub/Sub + WebSocket |
| **File Storage** | MinIO abstraction | storage-module | Internal API |
| **Multi-Tenancy** | RLS | All modules | PostgreSQL RLS + Session |
| **Error Handling** | Structured responses | Shared exception handlers | FastAPI Exception Handlers |
| **Rate Limiting** | Request throttling | Kong API Gateway | Kong Plugin |

---

## 6. Service Communication Patterns (Task 1.5)

### 6.1 Communication Overview

Within the modular monolith, communication patterns are:

1. **Intra-Module**: Direct function calls (same process)
2. **Inter-Module**: Internal service layer (dependency injection)
3. **Frontend ↔ Backend**: HTTP REST via Kong
4. **Backend ↔ Infrastructure**: PostgreSQL, Redis, MinIO clients

---

### 6.2 Frontend ↔ Backend API

| Aspect | Specification |
|--------|---------------|
| **Protocol** | HTTPS (TLS 1.2+) |
| **Format** | JSON (Content-Type: application/json) |
| **Authentication** | Bearer token (Authorization: Bearer {access_token}) |
| **API Style** | REST |
| **Versioning** | URL path: /api/v1/{resource} |
| **Gateway** | Kong (port 8000) |

**Request Flow**:
```
Frontend (Next.js)
    → HTTPS → Kong (8000)
    → HTTP → Backend (8100)
    → Response → Kong
    → HTTPS → Frontend
```

**Example Interaction** (Create Task):
```
POST /api/v1/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "title": "Complete design review",
  "description": "Review UI mockups",
  "assigned_to": "employee-uuid-123",
  "priority": "HIGH",
  "ecd": "2026-01-20"
}

Response: 201 Created
{
  "id": "task-uuid-456",
  "title": "Complete design review",
  "status": "OPEN",
  "created_at": "2026-01-16T10:00:00Z"
}
```

---

### 6.3 Backend API ↔ File Storage

| Aspect | Specification |
|--------|---------------|
| **Protocol** | HTTP (internal network) / HTTPS (if exposed) |
| **Client** | MinIO Python SDK (minio) |
| **Authentication** | MinIO access key/secret key |
| **Pattern** | Presigned URLs for frontend direct upload/download |

**Upload Flow**:
```
1. Frontend → Backend: POST /api/v1/storage/presign-upload
   {
     "filename": "receipt.pdf",
     "content_type": "application/pdf",
     "entity_type": "expense_receipt",
     "entity_id": "expense-uuid-123"
   }

2. Backend → MinIO: Generate presigned PUT URL
   Path: /{tenant_id}/expenses/{expense_id}/receipt.pdf
   Expiry: 15 minutes

3. Backend → Frontend:
   {
     "upload_url": "https://minio.internal:9000/...",
     "file_id": "file-uuid-789"
   }

4. Frontend → MinIO: PUT {upload_url} (direct upload)

5. Frontend → Backend: POST /api/v1/expenses/{id}/attachments
   {
     "file_id": "file-uuid-789"
   }
```

**Download Flow**:
```
1. Frontend → Backend: GET /api/v1/storage/{file_id}/download-url

2. Backend validates: User has access to entity referencing this file

3. Backend → MinIO: Generate presigned GET URL (expiry: 1 hour)

4. Backend → Frontend: { "download_url": "https://..." }

5. Frontend opens download_url in new tab
```

---

### 6.4 Backend API ↔ Notification Service

| Aspect | Specification |
|--------|---------------|
| **Protocol** | Redis Pub/Sub (async) + Internal function call (sync) |
| **Pattern** | Event-driven for notifications |
| **WebSocket** | FastAPI WebSocket endpoint for real-time push |

**Async Notification Pattern** (via Redis):
```python
# Publisher (expense-module)
redis.publish("notifications", json.dumps({
    "type": "EXPENSE_APPROVED",
    "user_id": "user-uuid-123",
    "payload": {
        "expense_id": "expense-uuid-456",
        "amount": 5000
    }
}))

# Subscriber (notification-module)
pubsub = redis.pubsub()
pubsub.subscribe("notifications")
for message in pubsub.listen():
    notification_service.process(message)
```

**WebSocket Connection**:
```
1. Frontend connects: wss://api.mindflow.com/ws/notifications
   Header: Authorization: Bearer {access_token}

2. Backend validates token, extracts user_id

3. Backend registers WebSocket connection for user_id

4. When notification published:
   - Store in database
   - Push to user's WebSocket connection (if connected)
```

---

### 6.5 Cross-Module Data Access (Within Monolith)

| Aspect | Specification |
|--------|---------------|
| **Pattern** | Dependency injection via service layer |
| **Protocol** | Direct Python function calls |
| **Data Isolation** | Each module has its own service class; no direct ORM access across modules |

**Example** (task-module needs employee validation from hr-module):
```python
# task-module/services/task_service.py
class TaskService:
    def __init__(self, hr_service: HRService, ...):
        self.hr_service = hr_service

    async def create_task(self, task_data: TaskCreate, user_context: UserContext):
        # Validate assignee exists and is active
        employee = await self.hr_service.get_employee(task_data.assigned_to)
        if not employee or employee.is_deleted:
            raise ValidationError("Invalid assignee")

        # Validate hierarchy permission
        can_assign = await self.hr_service.is_subordinate(
            manager_id=user_context.user_id,
            employee_id=task_data.assigned_to
        )
        if not can_assign and task_data.assigned_to != user_context.user_id:
            raise ForbiddenError("Cannot assign task to non-subordinate")

        # Create task
        return await self.task_repository.create(task_data)
```

**Service Layer Pattern**:
- Each module exposes a service class
- Services are injected via FastAPI dependency injection
- No direct database queries across module boundaries
- All cross-module access through service methods

---

### 6.6 Background Task Communication (Celery)

| Aspect | Specification |
|--------|---------------|
| **Broker** | Redis (DB 1) |
| **Result Backend** | Redis (DB 2) |
| **Pattern** | Async task execution |
| **Use Cases** | SLA breach checks, data export, retention enforcement, escalations |

**Example** (SLA Breach Detection):
```python
# complaint-module/tasks.py
@celery_app.task
def check_sla_breaches():
    """Runs hourly via Celery Beat"""
    breached_complaints = complaint_service.find_breached_complaints()
    for complaint in breached_complaints:
        # Escalate
        hr_service.get_escalation_target(complaint.owner_id)
        complaint_service.escalate(complaint)
        # Notify
        notification_service.notify(
            user_id=escalation_target.id,
            type="SLA_BREACH_ESCALATION",
            payload={"complaint_id": complaint.id}
        )

# Celery Beat schedule
CELERYBEAT_SCHEDULE = {
    'check-sla-breaches': {
        'task': 'complaint_module.tasks.check_sla_breaches',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

---

### 6.7 Communication Patterns Summary

| Communication Type | Protocol | Authentication | Example |
|--------------------|----------|----------------|---------|
| **Frontend → Backend** | HTTPS REST | JWT Bearer Token | Create task |
| **Backend → PostgreSQL** | TCP (asyncpg) | Connection credentials | Query employees |
| **Backend → Redis** | TCP (redis-py) | Connection credentials | Session storage |
| **Backend → MinIO** | HTTP/HTTPS | Access key/secret | Generate presigned URL |
| **Module → Module** | Python function call | None (internal) | HR validation |
| **Async Notification** | Redis Pub/Sub | None (internal) | Notification events |
| **Real-Time Push** | WebSocket | JWT validation | Live notifications |
| **Background Tasks** | Celery + Redis | None (internal) | SLA checks |

---

## 7. Dependencies

### 7.1 Service Dependency Graph

```
auth-module (foundational - no module dependencies)
    ↑
hr-module (depends on: auth-module)
    ↑
┌───┴───────────────────────────────────────────────────────┐
│                                                           │
task-module     mindmap-module     training-module          │
(hr, storage,   (hr, storage,      (hr, storage,            │
 notification,   task for linking)  notification,           │
 approval)                          approval)               │
    │                                   │                   │
    └───────────────┬───────────────────┘                   │
                    │                                       │
expense-module      complaint-module                        │
(hr, storage,       (hr, storage,                           │
 notification,       notification,                          │
 approval)           task for linking)                      │
                                                            │
approval-module (depends on: hr, notification)              │
notification-module (depends on: auth only)                 │
storage-module (depends on: auth only)                      │
└───────────────────────────────────────────────────────────┘
```

### 7.2 Startup Order

For the modular monolith, startup order is managed within the FastAPI application:

1. **Infrastructure** (external, must be running):
   - PostgreSQL
   - Redis
   - MinIO
   - Kong

2. **Application Initialization Order**:
   1. Database connection pool
   2. Redis connection
   3. auth-module (loads roles, permissions)
   4. hr-module (loads hierarchy cache)
   5. All other modules (parallel)
   6. Celery worker (separate process)

### 7.3 External Dependencies

| Dependency | Version | Purpose | Required |
|------------|---------|---------|----------|
| PostgreSQL | 16 | Primary database | Yes |
| Redis | 7 | Cache, sessions, Celery broker | Yes |
| MinIO | Latest | File storage | Yes |
| Kong | 3.4+ | API Gateway | Yes |

---

## 8. Approval Record

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| Product Owner | [Pending] | PENDING | - | Awaiting review of architecture approach |
| Technical Lead | [Pending] | PENDING | - | - |

---

## 9. Inter-Module Communication Patterns (Task 1.6)

### 9.1 Service Layer Interface Design

Within the modular monolith, inter-module communication follows a strict service layer pattern to maintain module boundaries while enabling seamless integration.

#### Service Layer Principles

| Principle | Description |
|-----------|-------------|
| **Interface Segregation** | Each module exposes a minimal, focused service interface |
| **No Direct ORM Access** | Modules cannot directly query other modules' database tables |
| **Dependency Injection** | Services are injected via FastAPI's Depends() mechanism |
| **Async-First** | All service methods are async for consistency |
| **Type Safety** | Pydantic models for all cross-module data transfer |

#### Service Interface Contracts

```python
# Shared abstract base for all module services
from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID

class BaseModuleService(ABC):
    """Base interface all module services must implement"""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if module is operational"""
        pass

# Example: hr-module service interface
class HRServiceInterface(ABC):
    """Interface exposed by hr-module to other modules"""

    @abstractmethod
    async def get_employee(self, employee_id: UUID, tenant_id: UUID) -> Optional[EmployeeDTO]:
        """Get employee by ID (returns None if not found or soft-deleted)"""
        pass

    @abstractmethod
    async def get_subordinates(self, manager_id: UUID, tenant_id: UUID) -> List[UUID]:
        """Get direct and indirect subordinate employee IDs"""
        pass

    @abstractmethod
    async def is_subordinate(self, manager_id: UUID, employee_id: UUID, tenant_id: UUID) -> bool:
        """Check if employee is in manager's hierarchy chain"""
        pass

    @abstractmethod
    async def get_manager(self, employee_id: UUID, tenant_id: UUID) -> Optional[UUID]:
        """Get direct manager of an employee"""
        pass

    @abstractmethod
    async def get_escalation_chain(self, employee_id: UUID, tenant_id: UUID) -> List[UUID]:
        """Get ordered list of managers up the hierarchy"""
        pass
```

---

### 9.2 Dependency Injection Pattern

```python
# app/core/dependencies.py
from functools import lru_cache
from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.services import AuthService
from app.modules.hr.services import HRService
from app.modules.task.services import TaskService
from app.modules.notification.services import NotificationService
from app.modules.storage.services import StorageService
from app.modules.approval.services import ApprovalService

# Database session dependency
async def get_db_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session

# Service factory functions
@lru_cache()
def get_auth_service() -> AuthService:
    return AuthService()

def get_hr_service(
    db: Annotated[AsyncSession, Depends(get_db_session)]
) -> HRService:
    return HRService(db)

def get_notification_service() -> NotificationService:
    return NotificationService()

def get_storage_service() -> StorageService:
    return StorageService()

def get_approval_service(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    hr_service: Annotated[HRService, Depends(get_hr_service)],
    notification_service: Annotated[NotificationService, Depends(get_notification_service)]
) -> ApprovalService:
    return ApprovalService(db, hr_service, notification_service)

def get_task_service(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    hr_service: Annotated[HRService, Depends(get_hr_service)],
    notification_service: Annotated[NotificationService, Depends(get_notification_service)],
    storage_service: Annotated[StorageService, Depends(get_storage_service)],
    approval_service: Annotated[ApprovalService, Depends(get_approval_service)]
) -> TaskService:
    return TaskService(db, hr_service, notification_service, storage_service, approval_service)
```

---

### 9.3 Transaction Boundary Management

| Scenario | Transaction Strategy |
|----------|---------------------|
| **Single module operation** | Single transaction, auto-commit on success |
| **Cross-module read** | Read-only transaction, no locking |
| **Cross-module write** | Saga pattern with compensation |
| **Notification side-effect** | Fire-and-forget via Redis (outside transaction) |

#### Transaction Flow Example

```python
# task-module creating a task with approval workflow
class TaskService:
    async def create_task_with_approval(
        self,
        task_data: TaskCreate,
        user_context: UserContext
    ) -> Task:
        async with self.db.begin():  # Transaction starts
            # 1. Validate assignee (read from hr-module)
            employee = await self.hr_service.get_employee(
                task_data.assigned_to,
                user_context.tenant_id
            )
            if not employee:
                raise ValidationError("Invalid assignee")

            # 2. Create task (task-module write)
            task = await self.task_repository.create(task_data)

            # 3. Request approval if high priority (cross-module)
            if task_data.priority == Priority.HIGH:
                await self.approval_service.create_approval_instance(
                    entity_type="task",
                    entity_id=task.id,
                    workflow_type="task_creation",
                    tenant_id=user_context.tenant_id
                )
        # Transaction commits here

        # 4. Send notification (outside transaction - fire and forget)
        await self.notification_service.notify(
            user_id=task_data.assigned_to,
            type="TASK_ASSIGNED",
            payload={"task_id": str(task.id), "title": task.title}
        )

        return task
```

---

### 9.4 Error Propagation Strategy

```python
# app/core/exceptions.py
from typing import Optional, Dict, Any

class MindFlowError(Exception):
    """Base exception for all MindFlow errors"""
    def __init__(
        self,
        message: str,
        error_code: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(MindFlowError):
    """Invalid input data"""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details={"field": field} if field else {}
        )

class NotFoundError(MindFlowError):
    """Requested entity not found"""
    def __init__(self, entity_type: str, entity_id: str):
        super().__init__(
            message=f"{entity_type} with ID {entity_id} not found",
            error_code="NOT_FOUND",
            details={"entity_type": entity_type, "entity_id": entity_id}
        )

class ForbiddenError(MindFlowError):
    """User lacks permission for this operation"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(message=message, error_code="FORBIDDEN")

class ConflictError(MindFlowError):
    """Business rule conflict"""
    def __init__(self, message: str, conflict_type: str):
        super().__init__(
            message=message,
            error_code="CONFLICT",
            details={"conflict_type": conflict_type}
        )

class ServiceUnavailableError(MindFlowError):
    """Dependent service unavailable"""
    def __init__(self, service_name: str):
        super().__init__(
            message=f"Service {service_name} is temporarily unavailable",
            error_code="SERVICE_UNAVAILABLE",
            details={"service": service_name}
        )
```

#### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid assignee",
    "details": {
      "field": "assigned_to"
    },
    "request_id": "req-uuid-123",
    "timestamp": "2026-01-16T10:00:00Z"
  }
}
```

---

### 9.5 Circular Dependency Prevention

#### Dependency Rules

| Module | Can Depend On | Cannot Depend On |
|--------|---------------|------------------|
| **auth-module** | None (foundational) | Any business module |
| **hr-module** | auth | task, mindmap, training, expense, complaint |
| **task-module** | auth, hr, storage, notification, approval | mindmap, training, expense, complaint |
| **mindmap-module** | auth, hr, storage, task (read-only link) | training, expense, complaint |
| **training-module** | auth, hr, storage, notification, approval | task, mindmap, expense, complaint |
| **expense-module** | auth, hr, storage, notification, approval | task, mindmap, training, complaint |
| **complaint-module** | auth, hr, storage, notification, task (link) | mindmap, training, expense |
| **approval-module** | auth, hr, notification | business modules |
| **notification-module** | auth | All except auth |
| **storage-module** | auth | All except auth |

#### Preventing Circular Dependencies

```python
# app/core/module_registry.py
from enum import Enum
from typing import Set, Dict

class Module(Enum):
    AUTH = "auth"
    HR = "hr"
    TASK = "task"
    MINDMAP = "mindmap"
    TRAINING = "training"
    EXPENSE = "expense"
    COMPLAINT = "complaint"
    APPROVAL = "approval"
    NOTIFICATION = "notification"
    STORAGE = "storage"

# Allowed dependencies (enforced at startup)
ALLOWED_DEPENDENCIES: Dict[Module, Set[Module]] = {
    Module.AUTH: set(),
    Module.HR: {Module.AUTH},
    Module.TASK: {Module.AUTH, Module.HR, Module.STORAGE, Module.NOTIFICATION, Module.APPROVAL},
    Module.MINDMAP: {Module.AUTH, Module.HR, Module.STORAGE, Module.TASK},
    Module.TRAINING: {Module.AUTH, Module.HR, Module.STORAGE, Module.NOTIFICATION, Module.APPROVAL},
    Module.EXPENSE: {Module.AUTH, Module.HR, Module.STORAGE, Module.NOTIFICATION, Module.APPROVAL},
    Module.COMPLAINT: {Module.AUTH, Module.HR, Module.STORAGE, Module.NOTIFICATION, Module.TASK},
    Module.APPROVAL: {Module.AUTH, Module.HR, Module.NOTIFICATION},
    Module.NOTIFICATION: {Module.AUTH},
    Module.STORAGE: {Module.AUTH},
}

def validate_dependency(from_module: Module, to_module: Module) -> bool:
    """Validate that a module dependency is allowed"""
    return to_module in ALLOWED_DEPENDENCIES.get(from_module, set())
```

---

### 9.6 Data Transfer Objects (DTOs)

```python
# app/shared/dto/employee.py
from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional

class EmployeeDTO(BaseModel):
    """Read-only employee data for cross-module access"""
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    email: str
    position_id: UUID
    position_name: str
    department_id: UUID
    department_name: str
    manager_id: Optional[UUID]
    is_active: bool

    class Config:
        frozen = True  # Immutable

# app/shared/dto/user_context.py
class UserContext(BaseModel):
    """Authenticated user context passed to all service methods"""
    user_id: UUID
    tenant_id: UUID
    employee_id: Optional[UUID]
    roles: list[str]
    permissions: list[str]

    def has_permission(self, permission: str) -> bool:
        return permission in self.permissions

    def has_role(self, role: str) -> bool:
        return role in self.roles
```

---

## 10. API Gateway & External Integration (Task 1.7)

### 10.1 Kong API Gateway Configuration

#### Gateway Overview

| Aspect | Configuration |
|--------|---------------|
| **Gateway** | Kong 3.4+ (OSS edition) |
| **Proxy Port** | 8000 (HTTP) / 8443 (HTTPS) |
| **Admin Port** | 8001 (internal only) |
| **Database** | PostgreSQL (shared with app, separate schema) |
| **Mode** | DB-less or DB-backed (configurable) |

#### Route Configuration

```yaml
# kong/kong.yml (declarative configuration)
_format_version: "3.0"
_transform: true

services:
  - name: mindflow-backend
    url: http://backend:8100
    routes:
      - name: api-v1
        paths:
          - /api/v1
        strip_path: false
        methods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
          - OPTIONS

  - name: mindflow-websocket
    url: http://backend:8100
    routes:
      - name: websocket
        paths:
          - /ws
        strip_path: false
        protocols:
          - http
          - https
          - ws
          - wss

plugins:
  # Global plugins
  - name: cors
    config:
      origins:
        - http://localhost:3000
        - https://mindflow.example.com
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
        - X-Request-ID
        - X-Tenant-ID
      exposed_headers:
        - X-Request-ID
      credentials: true
      max_age: 3600

  - name: request-id
    config:
      header_name: X-Request-ID
      generator: uuid

  - name: correlation-id
    config:
      header_name: X-Correlation-ID
      generator: uuid
      echo_downstream: true
```

---

### 10.2 Rate Limiting Configuration

```yaml
# kong/plugins/rate-limiting.yml
plugins:
  # Global rate limit (per IP)
  - name: rate-limiting
    config:
      minute: 100
      hour: 1000
      policy: redis
      redis_host: redis
      redis_port: 6379
      redis_database: 3
      fault_tolerant: true
      hide_client_headers: false

  # Auth endpoint rate limit (stricter)
  - name: rate-limiting
    service: mindflow-backend
    route: auth-routes
    config:
      minute: 10
      hour: 50
      policy: redis
      redis_host: redis
      redis_port: 6379
      redis_database: 3

# Route-specific configuration
routes:
  - name: auth-routes
    paths:
      - /api/v1/auth/login
      - /api/v1/auth/register
      - /api/v1/auth/forgot-password
```

#### Rate Limit Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit-Minute` | Requests allowed per minute |
| `X-RateLimit-Remaining-Minute` | Requests remaining this minute |
| `X-RateLimit-Limit-Hour` | Requests allowed per hour |
| `X-RateLimit-Remaining-Hour` | Requests remaining this hour |
| `Retry-After` | Seconds until rate limit resets (on 429) |

---

### 10.3 CORS Configuration

| Origin Environment | Allowed Origins |
|--------------------|-----------------|
| **Development** | `http://localhost:3000`, `http://127.0.0.1:3000` |
| **Staging** | `https://staging.mindflow.example.com` |
| **Production** | `https://mindflow.example.com`, `https://www.mindflow.example.com` |

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # CORS settings (loaded from environment)
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
```

---

### 10.4 External Integration Points

#### PostgreSQL Integration

| Aspect | Configuration |
|--------|---------------|
| **Host** | `postgres` (Docker network) / `localhost` (dev) |
| **Port** | 5432 |
| **Database** | `mindflow` |
| **Schema** | `public` (app), `kong` (gateway) |
| **Connection Pool** | Min: 5, Max: 20 (per worker) |
| **SSL** | Required in production |

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}"

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=15,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False  # True for SQL debugging
)

async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

---

#### Redis Integration

| Aspect | Configuration |
|--------|---------------|
| **Host** | `redis` (Docker network) / `localhost` (dev) |
| **Port** | 6379 |
| **Databases** | DB 0: Cache, DB 1: Celery Broker, DB 2: Celery Results, DB 3: Rate Limiting, DB 4: Sessions |
| **Connection Pool** | Max: 10 |

```python
# app/core/redis.py
import redis.asyncio as redis
from app.core.config import settings

redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    max_connections=10,
    decode_responses=True
)

async def get_redis_client() -> redis.Redis:
    return redis.Redis(connection_pool=redis_pool)

# Session-specific client
session_redis = redis.Redis.from_url(
    f"{settings.REDIS_URL}/4",  # DB 4 for sessions
    decode_responses=True
)
```

---

#### MinIO Integration

| Aspect | Configuration |
|--------|---------------|
| **Endpoint** | `minio:9000` (Docker) / `localhost:9000` (dev) |
| **Console** | `minio:9001` |
| **Access Key** | From environment variable |
| **Secret Key** | From environment variable |
| **Buckets** | `mindflow-files` (main), `mindflow-temp` (uploads) |
| **Presigned URL Expiry** | Upload: 15 min, Download: 1 hour |

```python
# app/core/storage.py
from minio import Minio
from app.core.config import settings

minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE  # True in production
)

# Ensure buckets exist on startup
def ensure_buckets():
    for bucket in ["mindflow-files", "mindflow-temp"]:
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
```

---

### 10.5 Health Check Endpoints

```python
# app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Basic health check - always returns OK if app is running"""
    return {"status": "healthy"}

@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db_session)):
    """Readiness check - verifies all dependencies"""
    checks = {}

    # PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"

    # Redis
    try:
        redis = await get_redis_client()
        await redis.ping()
        checks["redis"] = "healthy"
    except Exception as e:
        checks["redis"] = f"unhealthy: {str(e)}"

    # MinIO
    try:
        minio_client.list_buckets()
        checks["storage"] = "healthy"
    except Exception as e:
        checks["storage"] = f"unhealthy: {str(e)}"

    all_healthy = all(v == "healthy" for v in checks.values())
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }

@router.get("/health/live")
async def liveness_check():
    """Liveness check - verifies app is not deadlocked"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}
```

---

### 10.6 Request/Response Logging

```python
# app/middleware/request_logging.py
import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

logger = structlog.get_logger()

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.perf_counter()

        # Log request
        await logger.ainfo(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host,
            user_agent=request.headers.get("User-Agent")
        )

        response = await call_next(request)

        # Log response
        duration_ms = (time.perf_counter() - start_time) * 1000
        await logger.ainfo(
            "request_completed",
            request_id=request_id,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2)
        )

        response.headers["X-Request-ID"] = request_id
        return response
```

---

## 11. Multi-Tenancy Enforcement (Task 1.8)

### 11.1 Tenant Context Architecture

#### Overview

| Aspect | Implementation |
|--------|----------------|
| **Tenant Identifier** | UUID stored in `tenant_id` column on all tables |
| **Isolation Level** | Row-Level Security (RLS) in PostgreSQL |
| **Context Injection** | Middleware sets PostgreSQL session variable |
| **Validation** | JWT contains tenant_id; validated against user's tenant membership |

---

### 11.2 Tenant ID Extraction & Validation

```python
# app/middleware/tenant.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.core.config import settings

class TenantMiddleware(BaseHTTPMiddleware):
    """Extract and validate tenant_id from JWT token"""

    EXEMPT_PATHS = {"/health", "/health/ready", "/health/live", "/api/v1/auth/login"}

    async def dispatch(self, request: Request, call_next):
        # Skip tenant validation for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Extract token
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization token")

        token = auth_header[7:]

        try:
            # Decode JWT (validation done by auth middleware)
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )

            tenant_id = payload.get("tenant_id")
            user_id = payload.get("sub")

            if not tenant_id:
                raise HTTPException(status_code=400, detail="Token missing tenant_id")

            # Store in request state for downstream use
            request.state.tenant_id = tenant_id
            request.state.user_id = user_id
            request.state.roles = payload.get("roles", [])
            request.state.permissions = payload.get("permissions", [])

        except JWTError as e:
            raise HTTPException(status_code=401, detail="Invalid token")

        return await call_next(request)
```

---

### 11.3 PostgreSQL RLS Policies

```sql
-- Schema setup for tenant isolation
-- Run once per table during migrations

-- Enable RLS on table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;

-- Create isolation policy
CREATE POLICY tenant_isolation_employees ON employees
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Allow insert with matching tenant_id
CREATE POLICY tenant_insert_employees ON employees
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Reusable function to apply RLS to any table
CREATE OR REPLACE FUNCTION apply_tenant_rls(table_name TEXT) RETURNS VOID AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);

    EXECUTE format(
        'CREATE POLICY tenant_isolation_%I ON %I USING (tenant_id = current_setting(''app.current_tenant_id'', true)::UUID)',
        table_name, table_name
    );

    EXECUTE format(
        'CREATE POLICY tenant_insert_%I ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true)::UUID)',
        table_name, table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Apply to all business tables
SELECT apply_tenant_rls('employees');
SELECT apply_tenant_rls('tasks');
SELECT apply_tenant_rls('mind_maps');
SELECT apply_tenant_rls('courses');
SELECT apply_tenant_rls('expense_requests');
SELECT apply_tenant_rls('complaints');
SELECT apply_tenant_rls('notifications');
SELECT apply_tenant_rls('file_metadata');
-- ... apply to all tables with tenant_id
```

---

### 11.4 Session-Level Tenant Injection

```python
# app/core/database.py
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import Request

@asynccontextmanager
async def tenant_session(request: Request) -> AsyncSession:
    """Create a database session with tenant context set"""
    tenant_id = getattr(request.state, 'tenant_id', None)

    async with async_session_maker() as session:
        if tenant_id:
            # Set tenant context for RLS
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tenant_id"),
                {"tenant_id": str(tenant_id)}
            )

        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# FastAPI dependency
async def get_tenant_db(request: Request) -> AsyncSession:
    """Dependency that provides tenant-scoped database session"""
    async with tenant_session(request) as session:
        yield session
```

---

### 11.5 Cross-Tenant Access Prevention

#### Application-Level Guards

```python
# app/core/security.py
from uuid import UUID
from fastapi import HTTPException

def validate_tenant_access(
    requested_tenant_id: UUID,
    user_tenant_id: UUID,
    operation: str = "access"
) -> None:
    """Raise exception if user attempts cross-tenant access"""
    if requested_tenant_id != user_tenant_id:
        # Log security event
        logger.warning(
            "cross_tenant_access_attempt",
            user_tenant_id=str(user_tenant_id),
            requested_tenant_id=str(requested_tenant_id),
            operation=operation
        )
        raise HTTPException(
            status_code=403,
            detail="Access denied: cross-tenant operation not allowed"
        )

# Usage in service methods
class TaskService:
    async def get_task(
        self,
        task_id: UUID,
        user_context: UserContext
    ) -> Task:
        task = await self.repository.get_by_id(task_id)

        if task:
            # Defense-in-depth: validate even though RLS should block
            validate_tenant_access(
                task.tenant_id,
                user_context.tenant_id,
                operation="read_task"
            )

        return task
```

#### Query-Level Protection

```python
# app/modules/task/repository.py
class TaskRepository:
    def __init__(self, session: AsyncSession, tenant_id: UUID):
        self.session = session
        self.tenant_id = tenant_id

    async def get_all(self, filters: TaskFilters) -> List[Task]:
        """Always include tenant_id in WHERE clause as defense-in-depth"""
        query = (
            select(TaskModel)
            .where(TaskModel.tenant_id == self.tenant_id)  # Explicit filter
            .where(TaskModel.is_deleted == False)
        )

        if filters.status:
            query = query.where(TaskModel.status == filters.status)
        if filters.assigned_to:
            query = query.where(TaskModel.assigned_to == filters.assigned_to)

        result = await self.session.execute(query)
        return result.scalars().all()
```

---

### 11.6 Tenant Context Propagation

```python
# app/shared/dto/user_context.py
from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

class UserContext(BaseModel):
    """Immutable context passed through all service layers"""
    user_id: UUID
    tenant_id: UUID
    employee_id: Optional[UUID] = None
    roles: List[str] = []
    permissions: List[str] = []

    class Config:
        frozen = True

# Middleware creates context
# app/middleware/context.py
def build_user_context(request: Request) -> UserContext:
    return UserContext(
        user_id=request.state.user_id,
        tenant_id=request.state.tenant_id,
        employee_id=request.state.employee_id,
        roles=request.state.roles,
        permissions=request.state.permissions
    )

# Dependency injection
async def get_user_context(request: Request) -> UserContext:
    return build_user_context(request)

# All endpoints receive context
@router.get("/tasks/{task_id}")
async def get_task(
    task_id: UUID,
    user_context: UserContext = Depends(get_user_context),
    task_service: TaskService = Depends(get_task_service)
):
    return await task_service.get_task(task_id, user_context)
```

---

### 11.7 Multi-Tenancy Security Summary

| Layer | Protection Mechanism |
|-------|---------------------|
| **API Gateway** | JWT validation, tenant_id in token |
| **Middleware** | Extract and validate tenant_id, reject if missing |
| **Service Layer** | UserContext propagation, explicit tenant checks |
| **Repository Layer** | Explicit tenant_id in all WHERE clauses |
| **Database (RLS)** | Automatic row filtering based on session variable |
| **Audit Logging** | All operations logged with tenant_id |

---

## 12. Port & Service Configuration (Task 1.9)

### 12.1 Complete Port Assignment Table

| Service | Development | Staging | Production | Protocol |
|---------|-------------|---------|------------|----------|
| **Frontend (Next.js)** | 3000 | 3000 | 443 (via reverse proxy) | HTTP/HTTPS |
| **Kong API Gateway (Proxy)** | 8000 | 8000 | 443 | HTTP/HTTPS |
| **Kong Admin API** | 8001 | 8001 | Disabled | HTTP |
| **Backend (FastAPI)** | 8100 | 8100 | 8100 (internal) | HTTP |
| **PostgreSQL** | 5432 | 5432 | 5432 (internal) | TCP |
| **Redis** | 6379 | 6379 | 6379 (internal) | TCP |
| **MinIO API** | 9000 | 9000 | 9000 (internal) | HTTP |
| **MinIO Console** | 9001 | 9001 | Disabled | HTTP |
| **Celery Worker** | N/A | N/A | N/A | N/A |
| **Celery Beat** | N/A | N/A | N/A | N/A |

#### Module Ports (if extracted to microservices in future)

| Module | Reserved Port |
|--------|---------------|
| auth-module | 8101 |
| hr-module | 8102 |
| task-module | 8103 |
| mindmap-module | 8104 |
| training-module | 8105 |
| expense-module | 8106 |
| complaint-module | 8107 |
| approval-module | 8108 |
| notification-module | 8109 |
| storage-module | 8110 |

---

### 12.2 Environment-Specific Configuration

#### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - kong

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8100:8100"
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - DATABASE_URL=postgresql+asyncpg://mindflow:devpassword@postgres:5432/mindflow
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_SECURE=false
      - JWT_SECRET_KEY=dev-secret-key-change-in-production
      - JWT_ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=15
      - REFRESH_TOKEN_EXPIRE_DAYS=7
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis
      - minio

  kong:
    image: kong:3.4
    ports:
      - "8000:8000"
      - "8001:8001"
    environment:
      - KONG_DATABASE=off
      - KONG_DECLARATIVE_CONFIG=/kong/kong.yml
      - KONG_PROXY_ACCESS_LOG=/dev/stdout
      - KONG_ADMIN_ACCESS_LOG=/dev/stdout
      - KONG_PROXY_ERROR_LOG=/dev/stderr
      - KONG_ADMIN_ERROR_LOG=/dev/stderr
    volumes:
      - ./kong/kong.dev.yml:/kong/kong.yml:ro

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=mindflow
      - POSTGRES_PASSWORD=devpassword
      - POSTGRES_DB=mindflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: celery -A app.celery_app worker --loglevel=info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    depends_on:
      - redis
      - backend

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: celery -A app.celery_app beat --loglevel=info
    depends_on:
      - celery-worker

volumes:
  postgres_data:
  minio_data:
```

---

#### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    image: ${REGISTRY}/mindflow-frontend:${VERSION}
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${API_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: ${REGISTRY}/mindflow-backend:${VERSION}
    restart: always
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - MINIO_SECURE=true
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=15
      - REFRESH_TOKEN_EXPIRE_DAYS=7
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1024M

  kong:
    image: kong:3.4
    restart: always
    environment:
      - KONG_DATABASE=off
      - KONG_DECLARATIVE_CONFIG=/kong/kong.yml
      - KONG_PROXY_ACCESS_LOG=/dev/stdout
      - KONG_ADMIN_LISTEN=off
    volumes:
      - ./kong/kong.prod.yml:/kong/kong.yml:ro
    healthcheck:
      test: ["CMD", "kong", "health"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery-worker:
    image: ${REGISTRY}/mindflow-backend:${VERSION}
    restart: always
    command: celery -A app.celery_app worker --loglevel=warning --concurrency=4
    environment:
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
      - CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  celery-beat:
    image: ${REGISTRY}/mindflow-backend:${VERSION}
    restart: always
    command: celery -A app.celery_app beat --loglevel=warning
    deploy:
      replicas: 1
```

---

### 12.3 Health Check Configuration

| Service | Endpoint | Interval | Timeout | Retries |
|---------|----------|----------|---------|---------|
| Frontend | `GET /` | 30s | 10s | 3 |
| Backend | `GET /health` | 30s | 10s | 3 |
| Backend (ready) | `GET /health/ready` | 60s | 15s | 5 |
| Kong | `kong health` CLI | 30s | 10s | 3 |
| PostgreSQL | `pg_isready` | 30s | 5s | 3 |
| Redis | `redis-cli ping` | 30s | 5s | 3 |
| MinIO | `mc ready` | 30s | 10s | 3 |

---

### 12.4 Configuration Management

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 15

    # Redis
    REDIS_URL: str
    REDIS_MAX_CONNECTIONS: int = 10

    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = True
    MINIO_BUCKET: str = "mindflow-files"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security
    PASSWORD_MIN_LENGTH: int = 12
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    SESSION_IDLE_TIMEOUT_MINUTES: int = 30
    SESSION_ABSOLUTE_TIMEOUT_HOURS: int = 12

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

### 12.5 Secrets Management

| Secret | Development | Production |
|--------|-------------|------------|
| `DATABASE_URL` | .env file | Docker secrets / Vault |
| `REDIS_URL` | .env file | Docker secrets / Vault |
| `JWT_SECRET_KEY` | .env file (known dev key) | Docker secrets / Vault (generated) |
| `MINIO_ACCESS_KEY` | .env file | Docker secrets / Vault |
| `MINIO_SECRET_KEY` | .env file | Docker secrets / Vault |

```yaml
# docker-compose.prod.yml (secrets section)
secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
  minio_secret:
    external: true

services:
  backend:
    secrets:
      - jwt_secret
      - db_password
      - minio_secret
```

---

## 13. Architecture Summary & Diagrams (Task 1.10)

### 13.1 Executive Summary

MindFlow Phase 1 adopts a **Modular Monolith** architecture optimized for the 40-80 user scale, providing:

| Aspect | Decision |
|--------|----------|
| **Architecture Pattern** | Modular Monolith with clear service boundaries |
| **Backend Framework** | Python 3.11+ with FastAPI (async-first) |
| **Database** | PostgreSQL 16 with Row-Level Security |
| **Cache/Queue** | Redis 7 (caching, sessions, Celery broker) |
| **File Storage** | MinIO (S3-compatible) |
| **API Gateway** | Kong 3.4+ (routing, rate limiting, CORS) |
| **Multi-Tenancy** | tenant_id column + PostgreSQL RLS |
| **Authentication** | JWT (15-min access, 7-day refresh) |
| **Authorization** | RBAC + Hierarchy-based filtering |

#### Key Architectural Decisions

1. **Modular Monolith over Microservices**: Simplified operations for Phase 1 scale; module boundaries match ADR-002 services for future extraction.

2. **PostgreSQL RLS for Multi-Tenancy**: Database-enforced tenant isolation eliminates application-level bugs causing data leaks.

3. **Centralized Cross-Cutting Services**: approval-module, notification-module, and storage-module provide consistent behavior across business modules.

4. **Async-First Design**: All database and service calls are async, enabling efficient handling of concurrent requests.

---

### 13.2 Module Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FOUNDATIONAL LAYER                              │
│  ┌────────────────┐                                                         │
│  │  auth-module   │  ◄── No dependencies (JWT, RBAC, tenant management)     │
│  └───────┬────────┘                                                         │
│          │                                                                  │
│          ▼                                                                  │
│  ┌────────────────┐                                                         │
│  │   hr-module    │  ◄── Depends on: auth                                   │
│  │  (hierarchy)   │      Provides: employee data, subordinate queries       │
│  └───────┬────────┘                                                         │
└──────────┼──────────────────────────────────────────────────────────────────┘
           │
           │  All business modules depend on auth + hr
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CROSS-CUTTING LAYER                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ approval-module │  │notification-mod │  │ storage-module  │             │
│  │ (hr, notif)     │  │ (auth only)     │  │ (auth only)     │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
└───────────┴────────────────────┴────────────────────┴───────────────────────┘
            │                    │                    │
            │  Business modules use cross-cutting services
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BUSINESS LAYER                                  │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ task-module │  │mindmap-mod  │  │training-mod │  │expense-mod  │        │
│  │ (hr,storage,│  │ (hr,storage,│  │ (hr,storage,│  │ (hr,storage,│        │
│  │  notif,appr)│  │  task-link) │  │  notif,appr)│  │  notif,appr)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐                                                            │
│  │complaint-mod│                                                            │
│  │ (hr,storage,│                                                            │
│  │  notif,task)│                                                            │
│  └─────────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 13.3 Request Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW: Create Task                          │
└──────────────────────────────────────────────────────────────────────────────┘

     User                  Frontend              Kong             Backend
      │                       │                   │                   │
      │  1. Click "Create"    │                   │                   │
      │──────────────────────>│                   │                   │
      │                       │                   │                   │
      │                       │ 2. POST /api/v1/tasks                 │
      │                       │   Authorization: Bearer <JWT>         │
      │                       │──────────────────>│                   │
      │                       │                   │                   │
      │                       │                   │ 3. Rate limit check│
      │                       │                   │   CORS validation  │
      │                       │                   │   Add X-Request-ID │
      │                       │                   │──────────────────>│
      │                       │                   │                   │
      │                       │                   │              ┌────┴────┐
      │                       │                   │              │ Middleware│
      │                       │                   │              │ 4. JWT    │
      │                       │                   │              │  validate │
      │                       │                   │              │ 5. Extract│
      │                       │                   │              │  tenant_id│
      │                       │                   │              │ 6. Set RLS│
      │                       │                   │              │  context  │
      │                       │                   │              └────┬────┘
      │                       │                   │                   │
      │                       │                   │              ┌────┴────┐
      │                       │                   │              │task-mod  │
      │                       │                   │              │ 7. Call  │
      │                       │                   │              │ hr-mod   │
      │                       │                   │              │ validate │
      │                       │                   │              │ assignee │
      │                       │                   │              │ 8. Create│
      │                       │                   │              │ task     │
      │                       │                   │              │ 9. Audit │
      │                       │                   │              │ log      │
      │                       │                   │              └────┬────┘
      │                       │                   │                   │
      │                       │                   │         10. Async notify
      │                       │                   │              ┌────┴────┐
      │                       │                   │              │Redis    │
      │                       │                   │              │Pub/Sub  │
      │                       │                   │              └─────────┘
      │                       │                   │                   │
      │                       │                   │◄──────────────────│
      │                       │                   │  11. 201 Created  │
      │                       │◄──────────────────│                   │
      │                       │                   │                   │
      │◄──────────────────────│                   │                   │
      │  12. Show success     │                   │                   │
      │                       │                   │                   │
```

---

### 13.4 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW DIAGRAM                               │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │           Frontend (Next.js)         │
                    │    • React components                │
                    │    • TanStack Query (caching)        │
                    │    • Zustand (client state)          │
                    └──────────────┬──────────────────────┘
                                   │
                         HTTPS (JSON REST)
                                   │
                    ┌──────────────▼──────────────────────┐
                    │          Kong API Gateway            │
                    │    • Rate limiting                   │
                    │    • CORS                            │
                    │    • Request routing                 │
                    └──────────────┬──────────────────────┘
                                   │
                          HTTP (internal)
                                   │
┌──────────────────────────────────▼───────────────────────────────────────────┐
│                         FastAPI Backend (Monolith)                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        MIDDLEWARE LAYER                              │    │
│  │  • Authentication (JWT validation)                                   │    │
│  │  • Tenant extraction & RLS setup                                     │    │
│  │  • Request logging                                                   │    │
│  │  • Audit middleware                                                  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│  ┌──────────────────────────────────▼───────────────────────────────────┐   │
│  │                        SERVICE LAYER                                  │   │
│  │                                                                       │   │
│  │  auth-module  hr-module  task-module  mindmap-module  training-module│   │
│  │  expense-module  complaint-module  approval-module  notification-mod │   │
│  │  storage-module                                                      │   │
│  │                                                                       │   │
│  │  • Business logic                                                     │   │
│  │  • Cross-module coordination                                          │   │
│  │  • Transaction management                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│  ┌──────────────────────────────────▼───────────────────────────────────┐   │
│  │                       REPOSITORY LAYER                                │   │
│  │  • SQLAlchemy ORM                                                     │   │
│  │  • Query builders                                                     │   │
│  │  • Entity mapping                                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
          │                      │                      │
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │     MinIO       │
│                 │    │                 │    │                 │
│ • Business data │    │ • Session cache │    │ • File storage  │
│ • Audit logs    │    │ • Rate limits   │    │ • Attachments   │
│ • RLS policies  │    │ • Pub/Sub       │    │ • Presigned URLs│
│                 │    │ • Celery broker │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

### 13.5 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT ARCHITECTURE                              │
│                              (Docker Compose)                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Docker Host                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Docker Network: mindflow                     │   │
│  │                                                                       │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  frontend   │    │    kong     │    │   backend   │              │   │
│  │  │   :3000     │───>│ :8000,:8001 │───>│    :8100    │              │   │
│  │  │  (Next.js)  │    │  (Gateway)  │    │  (FastAPI)  │              │   │
│  │  └─────────────┘    └─────────────┘    └──────┬──────┘              │   │
│  │                                                │                      │   │
│  │                     ┌──────────────────────────┼──────────────────┐  │   │
│  │                     │                          │                  │  │   │
│  │                     ▼                          ▼                  ▼  │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  postgres   │    │    redis    │    │    minio    │              │   │
│  │  │   :5432     │    │    :6379    │    │ :9000,:9001 │              │   │
│  │  │ (Database)  │    │  (Cache)    │    │  (Storage)  │              │   │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘              │   │
│  │         │                  │                  │                      │   │
│  │         ▼                  │                  ▼                      │   │
│  │  ┌─────────────┐          │           ┌─────────────┐              │   │
│  │  │ pg_data     │          │           │ minio_data  │              │   │
│  │  │  (Volume)   │          │           │  (Volume)   │              │   │
│  │  └─────────────┘          │           └─────────────┘              │   │
│  │                           │                                          │   │
│  │                           ▼                                          │   │
│  │            ┌─────────────────────────────┐                          │   │
│  │            │  celery-worker  celery-beat │                          │   │
│  │            │   (Background tasks)        │                          │   │
│  │            └─────────────────────────────┘                          │   │
│  │                                                                       │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Exposed Ports:                                                             │
│    Development: 3000 (frontend), 8000/8001 (kong), 5432, 6379, 9000/9001   │
│    Production:  443 (via reverse proxy to kong)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 13.6 Security Architecture Summary

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PERIMETER                                                                   │
│  • TLS 1.2+ (HTTPS everywhere)                                              │
│  • Kong rate limiting (100/min global, 10/min auth)                        │
│  • CORS whitelisting                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION                                                              │
│  • JWT tokens (HS256, 15-min access, 7-day refresh)                        │
│  • Password: bcrypt, min 12 chars, complexity rules                        │
│  • Account lockout: 5 failures → 15 min lockout                            │
│  • Session: 30-min idle, 12-hr absolute timeout                            │
│  • Token blacklist in Redis                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUTHORIZATION                                                               │
│  • RBAC: Super Admin > Admin > Manager > Employee                          │
│  • Hierarchy-based: see/manage subordinates only                           │
│  • Permission-based: granular permissions per role                         │
│  • PostgreSQL RLS: database-enforced tenant isolation                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA PROTECTION                                                             │
│  • At rest: PostgreSQL encryption, MinIO server-side encryption            │
│  • In transit: TLS 1.2+ on all connections                                 │
│  • PII: AES-256-GCM field-level encryption for RESTRICTED data            │
│  • Soft delete: PII retained until retention period expires                │
│  • Retention: 7 years (financial), 1 year (operational)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AUDIT & COMPLIANCE                                                          │
│  • All mutations logged (who, what, when, from where)                      │
│  • Immutable audit logs (append-only)                                       │
│  • 180 days online (CERT-In), 7 years archived                             │
│  • DPDP Act 2023 compliant (consent, data rights)                          │
│  • CERT-In 2022 compliant (6-hour incident reporting)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 13.7 Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 14+ | React framework, SSR |
| **Frontend** | TypeScript | 5+ | Type safety |
| **Frontend** | TanStack Query | 5+ | Server state management |
| **Frontend** | Zustand | 4+ | Client state management |
| **Frontend** | Tailwind CSS | 3+ | Styling |
| **API Gateway** | Kong | 3.4+ | Routing, rate limiting |
| **Backend** | Python | 3.11+ | Runtime |
| **Backend** | FastAPI | 0.100+ | Web framework |
| **Backend** | SQLAlchemy | 2.0+ | ORM |
| **Backend** | Pydantic | 2.0+ | Validation |
| **Backend** | Celery | 5+ | Background tasks |
| **Database** | PostgreSQL | 16 | Primary database |
| **Cache** | Redis | 7 | Caching, sessions |
| **Storage** | MinIO | Latest | Object storage |
| **Container** | Docker | 24+ | Containerization |
| **Orchestration** | Docker Compose | 2.20+ | Local orchestration |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | AI (Claude) | Initial creation for Phase 1 Tasks 1.1-1.5 |
| 1.1 | 2026-01-16 | AI (Claude) | Added sections 9-13 for Phase 1 Tasks 1.6-1.10 |

---

**END OF ARCHITECTURE_DESIGN.md**
