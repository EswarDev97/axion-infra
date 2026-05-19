# MindFlow – Implementation Plan

> **Purpose**: Define the executable build plan for MindFlow Phase 1
> **SDLC Phase**: Phase 5 – Implementation Planning
> **Tasks Covered**: 5.1 through 5.6
> **Status**: COMPLETE - Product Owner Approved
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 5 – Implementation Planning |
| **SDLC Tasks** | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_CONTRACT.md](API_CONTRACT.md), [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md), [MODULE_FUNCTIONAL_DESIGN.md](MODULE_FUNCTIONAL_DESIGN.md), [THREAT_MODEL.md](THREAT_MODEL.md) |
| **Approval Status** | COMPLETE - Product Owner Approved (2026-01-16) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Build Sequence (Task 5.1)](#2-build-sequence-task-51)
3. [Service Dependency Order (Task 5.2)](#3-service-dependency-order-task-52)
4. [Sprint Scope & Milestones (Task 5.3)](#4-sprint-scope--milestones-task-53)
5. [Implementation Risks (Task 5.4)](#5-implementation-risks-task-54)
6. [Rollback Strategy (Task 5.5)](#6-rollback-strategy-task-55)
7. [Roadmap Freeze (Task 5.6)](#7-roadmap-freeze-task-56)
8. [Dependencies](#8-dependencies)
9. [Approval Record](#9-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the implementation plan for MindFlow Phase 1, defining:
- Build sequence for all modules and features
- Service dependency order for backend development
- Sprint scope and milestones
- Implementation risks and mitigation strategies
- Rollback strategies per feature
- Frozen implementation roadmap

### 1.2 Scope

**In Scope**:
- 10 backend service modules (auth, hr, task, mindmap, training, expense, complaint, approval, notification, storage)
- Next.js frontend with 75+ pages
- PostgreSQL 16 database with 54 tables
- 136+ REST API endpoints
- Real-time notifications via WebSocket

**Out of Scope** (per [NON_GOALS.md](NON_GOALS.md)):
- Mobile applications
- AI/ML features
- External integrations (email, SMS, WhatsApp)
- Offline-first capabilities

### 1.3 Implementation Approach

Per [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md), MindFlow Phase 1 uses a **Modular Monolith** architecture:
- Single FastAPI application with internal module boundaries
- API paths maintain microservice-like structure (`/api/v1/{module}/...`)
- Single PostgreSQL instance with schema separation by module
- Extraction to microservices possible in Phase 2+

---

## 2. Build Sequence (Task 5.1)

### 2.1 Build Phases Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          IMPLEMENTATION TIMELINE                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: FOUNDATION ──────────────────────┐                                │
│  (Sprints 1-3)                              │                                │
│  • Infrastructure                           │                                │
│  • Auth module                              │                                │
│  • Shared components                        │                                │
│                                             ▼                                │
│  PHASE 2: CORE MODULES ────────────────────┐                                │
│  (Sprints 4-7)                              │                                │
│  • HR module (hierarchy backbone)          │                                │
│  • Task module (primary execution)          │                                │
│  • Storage module                           │                                │
│                                             ▼                                │
│  PHASE 3: EXTENDED MODULES ────────────────┐                                │
│  (Sprints 8-11)                             │                                │
│  • Training module                          │                                │
│  • Expense module                           │                                │
│  • Mind Map module                          │                                │
│                                             ▼                                │
│  PHASE 4: ADVANCED FEATURES ───────────────┐                                │
│  (Sprints 12-14)                            │                                │
│  • Complaint module                         │                                │
│  • Approval module                          │                                │
│  • Notification module                      │                                │
│                                             ▼                                │
│  PHASE 5: INTEGRATION & POLISH ────────────┐                                │
│  (Sprints 15-16)                            │                                │
│  • Cross-module integration                 │                                │
│  • Reporting & dashboards                   │                                │
│  • Performance optimization                 │                                │
│                                             ▼                                │
│  PRODUCTION READY                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Phase 1: Foundation (Sprints 1-3)

**Duration**: 6 weeks
**Priority**: Critical - All other phases depend on this

#### 2.2.1 Infrastructure Setup (Sprint 1)

| Component | Description | Success Criteria |
|-----------|-------------|------------------|
| Docker Compose | Development environment | All services start with `docker compose up` |
| PostgreSQL 16 | Database with extensions | `uuid-ossp`, `pgcrypto` enabled |
| Redis 7 | Cache and session store | Connection verified |
| MinIO | Object storage | Bucket creation working |
| Kong | API Gateway (stub) | Routing configured |

**Deliverables**:
- `docker-compose.yml` with all infrastructure services
- Database initialization scripts
- Environment variable templates (`.env.example`)
- Development setup documentation

#### 2.2.2 Auth Module - Backend (Sprint 1-2)

| Feature | API Endpoints | Database Tables |
|---------|---------------|-----------------|
| User Registration | `POST /api/v1/auth/register` | `users`, `tenants` |
| Login | `POST /api/v1/auth/login` | `sessions` |
| Token Refresh | `POST /api/v1/auth/token/refresh` | - |
| Logout | `POST /api/v1/auth/logout` | - |
| Password Reset | `POST /api/v1/auth/password/reset-request`, `POST /api/v1/auth/password/reset` | - |
| RBAC | Internal middleware | `roles`, `permissions`, `role_permissions`, `user_tenant_roles` |

**Success Criteria**:
- JWT authentication working (15-min access, 7-day refresh)
- Account lockout after 5 failed attempts
- Password validation (12+ chars, complexity)
- Session management in Redis

#### 2.2.3 Auth Module - Frontend (Sprint 2)

| Page | Path | Components |
|------|------|------------|
| Login | `/login` | `LoginForm`, `AuthLayout` |
| Forgot Password | `/forgot-password` | `ForgotPasswordForm` |
| Reset Password | `/reset-password` | `ResetPasswordForm` |

**Success Criteria**:
- Login flow complete with token storage
- Auto-redirect on token expiry
- Protected route guards working

#### 2.2.4 Shared UI Components (Sprint 2-3)

| Category | Components |
|----------|------------|
| Atoms | `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `Badge`, `Avatar`, `Spinner`, `Tooltip` |
| Form | `FormField`, `SearchInput`, `DatePicker`, `FileUploader` |
| Feedback | `Toast`, `Alert`, `Modal`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `LoadingState` |
| Data | `DataTable`, `Pagination`, `FilterBar`, `StatCard` |
| Navigation | `Sidebar`, `Header`, `Breadcrumb`, `NavMenu`, `UserMenu` |
| Layout | `AppLayout`, `AuthLayout`, `PageHeader`, `Card` |

**Success Criteria**:
- All 25+ shared components implemented
- Storybook documentation for each component
- Responsive design verified on all breakpoints

#### 2.2.5 Database Schema Migrations (Sprint 3)

| Module | Tables | Priority |
|--------|--------|----------|
| auth-module | 7 tables | P1 |
| hr-module | 9 tables | P1 |
| task-module | 6 tables | P1 |

**Success Criteria**:
- All migrations run successfully
- RLS policies applied to all tables
- Indexes created per [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Seed data for development

---

### 2.3 Phase 2: Core Modules (Sprints 4-7)

**Duration**: 8 weeks
**Priority**: High - Primary business functionality

#### 2.3.1 HR Module - Backend (Sprint 4-5)

| Feature | Endpoints | Dependencies |
|---------|-----------|--------------|
| Employees | CRUD `/api/v1/hr/employees/*` | auth-module |
| Positions | CRUD `/api/v1/hr/positions/*` | auth-module |
| Departments | CRUD `/api/v1/hr/departments/*` | auth-module |
| Hierarchy | GET `/api/v1/hr/hierarchy/*` | auth-module |
| Candidates | CRUD `/api/v1/hr/candidates/*` | auth-module |
| Attendance | CRUD `/api/v1/hr/attendance/*` | employees |
| Leave | Full workflow `/api/v1/hr/leave/*` | employees, approval-module (stub) |
| Payroll Reference | CRUD `/api/v1/hr/payroll/*` | employees |

**Success Criteria**:
- Employee onboarding workflow complete
- Hierarchy queries (get subordinates) working
- Leave request/approval flow functional
- RBAC enforcement on all endpoints

#### 2.3.2 HR Module - Frontend (Sprint 5-6)

| Page Category | Pages |
|---------------|-------|
| Employees | List, Create, Detail, Edit |
| Positions | List, Create |
| Hierarchy | Org Chart visualization |
| Candidates | List, Create, Detail |
| Attendance | Calendar view, Bulk marking |
| Leave | My Leave, Apply, Balance, Approvals |
| Payroll | Reference list (read-only) |

**Success Criteria**:
- 15+ HR pages implemented
- Org chart rendering correctly
- Leave workflow end-to-end

#### 2.3.3 Storage Module (Sprint 5)

| Feature | Endpoints | Storage |
|---------|-----------|---------|
| File Upload | `POST /api/v1/storage/files` | MinIO |
| File Download | `GET /api/v1/storage/files/{id}/download` | Presigned URLs |
| File Delete | `DELETE /api/v1/storage/files/{id}` | MinIO + metadata |

**Success Criteria**:
- File upload with validation (type, size)
- Presigned URL generation (1hr view, 15min download)
- Tenant-scoped storage paths

#### 2.3.4 Task Module - Backend (Sprint 6-7)

| Feature | Endpoints | Dependencies |
|---------|-----------|--------------|
| Tasks | CRUD `/api/v1/tasks/*` | auth-module, hr-module |
| Assignees | Manage `/api/v1/tasks/{id}/assignees/*` | hr-module |
| Comments | CRUD `/api/v1/tasks/{id}/comments/*` | - |
| Attachments | Upload/List `/api/v1/tasks/{id}/attachments/*` | storage-module |
| Dependencies | Manage `/api/v1/tasks/{id}/dependencies/*` | - |
| Status | Transitions `/api/v1/tasks/{id}/status` | - |

**Success Criteria**:
- Task CRUD with all attributes
- Assignment with hierarchy validation
- Status workflow (state machine)
- Sub-task support
- Dependency management

#### 2.3.5 Task Module - Frontend (Sprint 7)

| View | Path | Features |
|------|------|----------|
| List View | `/tasks` | Filtering, sorting, pagination |
| Kanban Board | `/tasks/board` | Drag-drop status changes |
| Calendar | `/tasks/calendar` | ECD-based calendar |
| My Tasks | `/tasks/my` | Personal task list |
| Team Tasks | `/tasks/team` | Subordinate tasks |
| Task Detail | `/tasks/[id]` | Full task management |
| Create Task | `/tasks/new` | Task creation form |

**Success Criteria**:
- 7 task views implemented
- Kanban drag-drop working
- Task detail with comments and attachments

---

### 2.4 Phase 3: Extended Modules (Sprints 8-11)

**Duration**: 8 weeks
**Priority**: Medium - Extended business functionality

#### 2.4.1 Training Module (Sprint 8-9)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Courses | `courses`, `training_content` | CRUD `/api/v1/training/courses/*` |
| Sessions | `training_sessions`, `training_attendance` | CRUD `/api/v1/training/sessions/*` |
| Enrollments | `enrollments` | `/api/v1/training/enrollments/*` |
| Exams | `exams`, `exam_questions`, `exam_attempts`, `exam_responses` | `/api/v1/training/exams/*` |
| Certificates | `certificates` | `/api/v1/training/certificates/*` |

**Frontend**:
- Course catalog and detail pages
- Session scheduling and attendance
- Exam taking interface (timed)
- Certificate viewing

**Success Criteria**:
- Course creation with content upload
- Enrollment workflow
- Exam taking with auto-submit on timeout
- Certificate generation (PDF)

#### 2.4.2 Expense Module (Sprint 9-10)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Expense Requests | `expense_requests`, `expense_items` | CRUD `/api/v1/expenses/*` |
| Categories | `expense_categories` | CRUD `/api/v1/expenses/categories/*` |
| Receipts | `expense_receipts` | Upload `/api/v1/expenses/{id}/receipts/*` |
| Payments | `payment_records` | Record `/api/v1/expenses/{id}/payment` |

**Frontend**:
- Expense submission with items and receipts
- Approval queue for managers
- Payment processing for finance
- Expense reports

**Success Criteria**:
- Multi-item expense creation
- Receipt upload requirement enforcement
- Approval workflow integration

#### 2.4.3 Mind Map Module (Sprint 10-11)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Mind Maps | `mind_maps` | CRUD `/api/v1/mindmaps/*` |
| Nodes | `mind_map_nodes` | CRUD `/api/v1/mindmaps/{id}/nodes/*` |
| Templates | `mind_map_templates` | CRUD `/api/v1/mindmaps/templates/*` |
| Node-Task Linking | Reference | `POST /api/v1/mindmaps/{id}/nodes/{nodeId}/convert-to-task` |

**Frontend**:
- Canvas-based mind map editor
- Node creation, editing, drag-drop
- Template selection on create
- Convert node to task feature
- Zen mode (distraction-free)

**Success Criteria**:
- Canvas rendering with React Flow or similar
- Real-time position persistence
- Node-to-task conversion
- Template cloning

---

### 2.5 Phase 4: Advanced Features (Sprints 12-14)

**Duration**: 6 weeks
**Priority**: Medium - Cross-cutting and advanced features

#### 2.5.1 Complaint Module (Sprint 12)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Complaints | `complaints` | CRUD `/api/v1/complaints/*` |
| Categories | `complaint_categories` | CRUD `/api/v1/complaints/categories/*` |
| Actions | `complaint_actions` | `/api/v1/complaints/{id}/actions/*` |
| SLA Config | `sla_configurations` | CRUD `/api/v1/complaints/sla/*` |
| Escalation | `escalation_rules` | CRUD `/api/v1/complaints/escalation/*` |

**Success Criteria**:
- Complaint logging with severity
- SLA calculation and tracking
- Auto-escalation (Celery scheduled task)
- Resolution workflow

#### 2.5.2 Approval Module (Sprint 13)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Workflows | `approval_workflows`, `approval_steps` | Admin CRUD |
| Instances | `approval_instances` | Runtime management |
| Decisions | `approval_decisions` | Approve/reject actions |
| Delegation | `delegation_rules` | Delegate management |

**Integration Points**:
- Leave approval (hr-module)
- Expense approval (expense-module)
- Enrollment approval (training-module) - optional

**Success Criteria**:
- Generic approval engine working
- Multi-level approval routing
- Delegation support
- Timeout handling

#### 2.5.3 Notification Module (Sprint 14)

**Backend**:
| Feature | Tables | Endpoints |
|---------|--------|-----------|
| Notifications | `notifications` | CRUD `/api/v1/notifications/*` |
| Preferences | `notification_preferences` | User settings |
| WebSocket | Connection management | Real-time delivery |

**Event Sources** (from all modules):
- Task: assignment, status change, overdue, mention
- HR: leave approval, attendance reminder
- Training: enrollment, session reminder, exam result
- Expense: submission, approval, payment
- Complaint: assignment, SLA warning, escalation
- Approval: pending, decision

**Success Criteria**:
- WebSocket connection with reconnection
- Real-time notification delivery
- Notification preferences respected
- Mark as read functionality

---

### 2.6 Phase 5: Integration & Polish (Sprints 15-16)

**Duration**: 4 weeks
**Priority**: High - Production readiness

#### 2.6.1 Cross-Module Integration (Sprint 15)

| Integration | Modules | Validation |
|-------------|---------|------------|
| Task from Mind Map | mindmap → task | Node-task bidirectional reference |
| Task from Complaint | complaint → task | Complaint-linked task creation |
| Approval callbacks | approval → hr, expense, training | Status update on decision |
| Notification triggers | all modules → notification | Event-driven notifications |
| File attachments | storage → task, expense, complaint, training | File reference integrity |

#### 2.6.2 Reporting & Dashboards (Sprint 15-16)

| Report | Module | Data Source |
|--------|--------|-------------|
| Task Completion Rate | Task | Aggregate by status, date |
| Leave Balance Summary | HR | Employee leave balances |
| Attendance Dashboard | HR | Attendance aggregates |
| Expense Summary | Expense | By category, status, employee |
| Training Progress | Training | Enrollment completion rates |
| Complaint SLA Report | Complaint | SLA breach statistics |
| System Dashboard | Cross-cutting | Key metrics from all modules |

#### 2.6.3 Performance Optimization (Sprint 16)

| Area | Actions |
|------|---------|
| Database | Query optimization, index review, connection pooling |
| API | Response caching, pagination limits enforcement |
| Frontend | Bundle optimization, lazy loading, image optimization |
| Infrastructure | Redis caching configuration, CDN setup (if applicable) |

**Success Criteria**:
- All cross-module workflows functional
- Dashboard with key metrics
- Page load < 2 seconds
- API response < 500ms (95th percentile)

---

## 3. Service Dependency Order (Task 5.2)

### 3.1 Dependency Graph

```
                    ┌─────────────────┐
                    │   auth-module   │ ◄──── No dependencies (build first)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │storage-module│ │  hr-module  │ │notification │
       │(minimal deps)│ │(auth + base)│ │   (stub)    │
       └──────┬──────┘ └──────┬──────┘ └─────────────┘
              │              │
              │    ┌─────────┴─────────┐
              │    │                   │
              ▼    ▼                   ▼
       ┌─────────────────┐      ┌─────────────────┐
       │   task-module   │      │ training-module │
       │(auth + hr + stor)      │ (auth + hr)     │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                │    ┌─────────────────┐ │
                │    │ expense-module  │ │
                │    │ (auth + hr)     │ │
                │    └────────┬────────┘ │
                │             │          │
                ▼             ▼          ▼
       ┌─────────────────────────────────────────┐
       │            approval-module               │
       │     (auth + hr + task + expense +       │
       │              training)                   │
       └─────────────────────────────────────────┘
                             │
                             ▼
       ┌─────────────────────────────────────────┐
       │          notification-module            │
       │          (full implementation)          │
       │       (depends on all modules)          │
       └─────────────────────────────────────────┘
                             │
                             ▼
       ┌─────────────────────────────────────────┐
       │           mindmap-module                │
       │        (auth + task for linking)        │
       └─────────────────────────────────────────┘
                             │
                             ▼
       ┌─────────────────────────────────────────┐
       │          complaint-module               │
       │   (auth + hr + task for linking +      │
       │          notification for SLA)          │
       └─────────────────────────────────────────┘
```

### 3.2 Build Order (Bottom-Up)

| Order | Module | Dependencies | Sprint |
|-------|--------|--------------|--------|
| 1 | **auth-module** | None (PostgreSQL, Redis) | 1-2 |
| 2 | **storage-module** | auth-module (MinIO) | 5 |
| 3 | **hr-module** | auth-module | 4-6 |
| 4 | **task-module** | auth-module, hr-module, storage-module | 6-7 |
| 5 | **training-module** | auth-module, hr-module, storage-module | 8-9 |
| 6 | **expense-module** | auth-module, hr-module, storage-module | 9-10 |
| 7 | **mindmap-module** | auth-module, task-module | 10-11 |
| 8 | **complaint-module** | auth-module, hr-module, task-module | 12 |
| 9 | **approval-module** | auth-module, hr-module | 13 |
| 10 | **notification-module** | auth-module, all modules (events) | 14 |

### 3.3 Dependency Types

| Type | Description | Example |
|------|-------------|---------|
| **Hard Dependency** | Cannot function without | task-module requires hr-module for assignee validation |
| **Soft Dependency** | Enhanced functionality | mindmap-module can function without task-module (no linking) |
| **Event Dependency** | Notification triggers | All modules emit events to notification-module |
| **Approval Integration** | Workflow routing | expense-module routes to approval-module |

### 3.4 Parallel Development Opportunities

| Parallel Track | Modules | Condition |
|----------------|---------|-----------|
| Track A | hr-module + storage-module | Both depend only on auth-module |
| Track B | task-module + training-module | After hr-module complete |
| Track C | expense-module + mindmap-module | After dependencies complete |
| Track D | complaint-module + approval-module | Can develop simultaneously |

---

## 4. Sprint Scope & Milestones (Task 5.3)

### 4.1 Sprint Configuration

| Parameter | Value |
|-----------|-------|
| Sprint Duration | 2 weeks |
| Total Sprints | 16 |
| Total Duration | 32 weeks |

### 4.2 Sprint Details

#### Sprint 1: Infrastructure & Auth Backend
**Weeks 1-2**

| User Story | Points | Priority |
|------------|--------|----------|
| As DevOps, I need Docker Compose environment for development | 8 | P1 |
| As DevOps, I need PostgreSQL with RLS configuration | 5 | P1 |
| As DevOps, I need Redis for session management | 3 | P1 |
| As DevOps, I need MinIO for file storage | 3 | P1 |
| As a user, I can register an account | 5 | P1 |
| As a user, I can login with email/password | 5 | P1 |
| As a user, I get JWT tokens on successful login | 3 | P1 |
| As a user, I can refresh my access token | 3 | P1 |

**Total Points**: 35

**Milestone**: Infrastructure running, authentication APIs functional

**Acceptance Criteria**:
- [ ] `docker compose up` starts all services
- [ ] User can register, login, and receive tokens
- [ ] Token refresh works before expiry
- [ ] Account lockout after 5 failed attempts

---

#### Sprint 2: Auth Frontend & Shared Components
**Weeks 3-4**

| User Story | Points | Priority |
|------------|--------|----------|
| As a user, I can login through a web form | 5 | P1 |
| As a user, I can request a password reset | 3 | P1 |
| As a user, I can set a new password via reset link | 3 | P1 |
| As a developer, I have Button component | 2 | P1 |
| As a developer, I have Input/Select/Checkbox components | 3 | P1 |
| As a developer, I have Modal/Toast/Alert components | 5 | P1 |
| As a developer, I have DataTable component | 8 | P1 |
| As a developer, I have AppLayout with sidebar | 5 | P1 |

**Total Points**: 34

**Milestone**: Auth flow complete, core UI components available

**Acceptance Criteria**:
- [ ] Login → Dashboard redirect working
- [ ] Protected routes redirect to login if unauthenticated
- [ ] 15+ shared components implemented
- [ ] Storybook documentation complete

---

#### Sprint 3: Database Migrations & RBAC
**Weeks 5-6**

| User Story | Points | Priority |
|------------|--------|----------|
| As DevOps, I need Alembic migrations for auth tables | 5 | P1 |
| As DevOps, I need Alembic migrations for HR tables | 5 | P1 |
| As DevOps, I need Alembic migrations for Task tables | 5 | P1 |
| As an admin, I can define roles and permissions | 5 | P1 |
| As an admin, I can assign roles to users | 3 | P1 |
| As a system, I enforce RBAC on all endpoints | 8 | P1 |
| As a developer, I have seed data for development | 3 | P1 |

**Total Points**: 34

**Milestone**: Database schema deployed, RBAC operational

**Acceptance Criteria**:
- [ ] All migrations run without errors
- [ ] RLS policies enforced on tenant-scoped tables
- [ ] RBAC middleware blocks unauthorized access
- [ ] Seed data creates test users with different roles

---

#### Sprint 4: HR Backend - Employees & Positions
**Weeks 7-8**

| User Story | Points | Priority |
|------------|--------|----------|
| As HR Admin, I can create employees | 5 | P1 |
| As HR Admin, I can update employee information | 3 | P1 |
| As HR Admin, I can deactivate employees | 3 | P1 |
| As HR Admin, I can manage positions | 5 | P1 |
| As HR Admin, I can manage departments | 3 | P1 |
| As HR Admin, I can define reporting hierarchy | 5 | P1 |
| As a manager, I can view my subordinates | 5 | P1 |
| As HR Admin, I can manage candidates | 5 | P1 |

**Total Points**: 34

**Milestone**: Core HR data management complete

**Acceptance Criteria**:
- [ ] Employee CRUD with all fields
- [ ] Hierarchy queries return correct subordinates
- [ ] Position/department management working
- [ ] Candidate tracking functional

---

#### Sprint 5: HR Backend - Leave & Attendance + Storage Module
**Weeks 9-10**

| User Story | Points | Priority |
|------------|--------|----------|
| As HR Admin, I can configure leave types | 3 | P1 |
| As an employee, I can view my leave balance | 3 | P1 |
| As an employee, I can apply for leave | 5 | P1 |
| As a manager, I can approve/reject leave requests | 5 | P1 |
| As an employee, I can mark my attendance | 3 | P1 |
| As HR Admin, I can view attendance reports | 5 | P1 |
| As a user, I can upload files | 5 | P1 |
| As a user, I can download files via presigned URL | 5 | P1 |

**Total Points**: 34

**Milestone**: Leave workflow complete, file storage operational

**Acceptance Criteria**:
- [ ] Leave request → approval → balance deduction
- [ ] Attendance marking with date validation
- [ ] File upload with type/size validation
- [ ] Presigned URLs generated correctly

---

#### Sprint 6: HR Frontend
**Weeks 11-12**

| User Story | Points | Priority |
|------------|--------|----------|
| As HR Admin, I can view employee list | 5 | P1 |
| As HR Admin, I can create/edit employees | 5 | P1 |
| As HR Admin, I can view organization chart | 8 | P1 |
| As an employee, I can view/apply for leave | 5 | P1 |
| As a manager, I can approve leave from dashboard | 5 | P1 |
| As HR Admin, I can view attendance calendar | 5 | P2 |

**Total Points**: 33

**Milestone**: HR module fully functional end-to-end

**Acceptance Criteria**:
- [ ] 15+ HR pages implemented
- [ ] Org chart visualizes hierarchy
- [ ] Leave workflow complete in UI
- [ ] Mobile-responsive design

---

#### Sprint 7: Task Module
**Weeks 13-14**

| User Story | Points | Priority |
|------------|--------|----------|
| As an employee, I can create tasks | 5 | P1 |
| As a manager, I can assign tasks to subordinates | 5 | P1 |
| As an assignee, I can update task status | 3 | P1 |
| As a user, I can add comments to tasks | 3 | P1 |
| As a user, I can attach files to tasks | 3 | P1 |
| As a user, I can create sub-tasks | 5 | P1 |
| As a user, I can set task dependencies | 5 | P1 |
| As a user, I can view tasks in list/kanban/calendar | 8 | P1 |

**Total Points**: 37

**Milestone**: Task management fully operational

**Acceptance Criteria**:
- [ ] Task CRUD with all attributes
- [ ] Status transitions validated
- [ ] Kanban drag-drop working
- [ ] Dependencies block status changes correctly

---

#### Sprint 8: Training Module - Backend
**Weeks 15-16**

| User Story | Points | Priority |
|------------|--------|----------|
| As Training Admin, I can create courses | 5 | P1 |
| As Training Admin, I can upload course content | 5 | P1 |
| As Training Admin, I can create exam questions | 5 | P1 |
| As Training Admin, I can schedule training sessions | 5 | P1 |
| As a manager, I can enroll employees in courses | 3 | P1 |
| As an employee, I can view enrolled courses | 3 | P1 |
| As Training Admin, I can track session attendance | 3 | P1 |

**Total Points**: 29

**Milestone**: Training administration complete

**Acceptance Criteria**:
- [ ] Course creation with content upload
- [ ] Question bank management
- [ ] Session scheduling working
- [ ] Enrollment tracking functional

---

#### Sprint 9: Training Module - Exams + Expense Backend
**Weeks 17-18**

| User Story | Points | Priority |
|------------|--------|----------|
| As an employee, I can take exams online | 8 | P1 |
| As a system, I auto-submit exams on timeout | 3 | P1 |
| As a system, I calculate exam scores automatically | 3 | P1 |
| As a system, I issue certificates on passing | 5 | P1 |
| As an employee, I can create expense requests | 5 | P1 |
| As an employee, I can add expense items | 3 | P1 |
| As an employee, I can upload receipts | 3 | P1 |

**Total Points**: 30

**Milestone**: Exam flow complete, expense creation functional

**Acceptance Criteria**:
- [ ] Timed exam with auto-submit
- [ ] Score calculation and pass/fail
- [ ] Certificate PDF generation
- [ ] Expense creation with items and receipts

---

#### Sprint 10: Expense Module Complete + Mind Map Backend
**Weeks 19-20**

| User Story | Points | Priority |
|------------|--------|----------|
| As a manager, I can approve/reject expenses | 5 | P1 |
| As Finance, I can record expense payments | 5 | P1 |
| As an employee, I can track my expense status | 3 | P1 |
| As a user, I can create mind maps | 5 | P1 |
| As a user, I can add/edit/delete nodes | 5 | P1 |
| As a user, I can move nodes (drag-drop positions) | 5 | P1 |
| As a user, I can use templates for new mind maps | 3 | P1 |

**Total Points**: 31

**Milestone**: Expense workflow complete, mind map backend ready

**Acceptance Criteria**:
- [ ] Expense approval workflow with amount thresholds
- [ ] Payment recording
- [ ] Mind map CRUD with node management
- [ ] Node position persistence

---

#### Sprint 11: Mind Map Frontend + Training Frontend
**Weeks 21-22**

| User Story | Points | Priority |
|------------|--------|----------|
| As a user, I can view mind maps on canvas | 8 | P1 |
| As a user, I can convert nodes to tasks | 5 | P1 |
| As a user, I can use zen mode | 2 | P2 |
| As an employee, I can view my training courses | 3 | P1 |
| As an employee, I can take exams through UI | 8 | P1 |
| As an employee, I can view my certificates | 3 | P1 |
| As Training Admin, I can view training reports | 5 | P2 |

**Total Points**: 34

**Milestone**: Mind map canvas functional, training UI complete

**Acceptance Criteria**:
- [ ] Canvas rendering with React Flow or similar
- [ ] Node-to-task conversion working
- [ ] Exam taking UI with timer
- [ ] Certificate viewing

---

#### Sprint 12: Complaint Module
**Weeks 23-24**

| User Story | Points | Priority |
|------------|--------|----------|
| As an employee, I can log complaints | 5 | P1 |
| As Admin, I can assign complaints to owners | 5 | P1 |
| As an owner, I can record actions on complaints | 3 | P1 |
| As an owner, I can resolve complaints | 3 | P1 |
| As a system, I calculate SLA based on severity | 5 | P1 |
| As a system, I auto-escalate on SLA breach | 8 | P1 |
| As Admin, I can configure SLA rules | 5 | P1 |

**Total Points**: 34

**Milestone**: Complaint management with SLA tracking

**Acceptance Criteria**:
- [ ] Complaint logging with severity
- [ ] SLA calculation and display
- [ ] Auto-escalation via Celery
- [ ] Action history tracking

---

#### Sprint 13: Approval Module
**Weeks 25-26**

| User Story | Points | Priority |
|------------|--------|----------|
| As Admin, I can configure approval workflows | 5 | P1 |
| As Admin, I can define multi-level approval steps | 5 | P1 |
| As an approver, I can view my pending approvals | 5 | P1 |
| As an approver, I can approve/reject requests | 5 | P1 |
| As an approver, I can delegate approvals | 5 | P1 |
| As a system, I route approvals based on hierarchy | 8 | P1 |
| Integrate with leave, expense, enrollment | 8 | P1 |

**Total Points**: 41

**Milestone**: Generic approval engine integrated

**Acceptance Criteria**:
- [ ] Approval workflow configuration
- [ ] Multi-level routing working
- [ ] Delegation functional
- [ ] Integrated with hr-module (leave), expense-module

---

#### Sprint 14: Notification Module
**Weeks 27-28**

| User Story | Points | Priority |
|------------|--------|----------|
| As a user, I receive real-time notifications | 8 | P1 |
| As a user, I can view notification list | 3 | P1 |
| As a user, I can mark notifications as read | 2 | P1 |
| As a user, I can configure notification preferences | 5 | P2 |
| As a system, I send notifications for task events | 5 | P1 |
| As a system, I send notifications for approval events | 5 | P1 |
| As a system, I send notifications for SLA warnings | 5 | P1 |

**Total Points**: 33

**Milestone**: Real-time notifications operational

**Acceptance Criteria**:
- [ ] WebSocket connection with auto-reconnect
- [ ] Notifications delivered in real-time
- [ ] 40+ notification events integrated
- [ ] Preferences respected

---

#### Sprint 15: Integration & Reporting
**Weeks 29-30**

| User Story | Points | Priority |
|------------|--------|----------|
| Cross-module integration testing | 8 | P1 |
| As a manager, I can view task completion reports | 5 | P1 |
| As HR, I can view leave balance reports | 3 | P1 |
| As HR, I can view attendance reports | 3 | P1 |
| As Finance, I can view expense reports | 5 | P1 |
| As Training Admin, I can view training reports | 3 | P1 |
| As Admin, I can view SLA compliance reports | 5 | P1 |
| As Admin, I can view system dashboard | 8 | P1 |

**Total Points**: 40

**Milestone**: All integrations verified, reporting available

**Acceptance Criteria**:
- [ ] All cross-module workflows tested
- [ ] 12+ reports implemented
- [ ] Dashboard with key metrics
- [ ] Export to CSV functional

---

#### Sprint 16: Polish & Production Prep
**Weeks 31-32**

| User Story | Points | Priority |
|------------|--------|----------|
| Performance optimization (queries, caching) | 8 | P1 |
| Security hardening (CSP, rate limiting) | 5 | P1 |
| Error handling review | 3 | P1 |
| Documentation finalization | 5 | P1 |
| Production deployment configuration | 8 | P1 |
| End-to-end testing | 8 | P1 |
| Bug fixes from QA | 13 | P1 |

**Total Points**: 50

**Milestone**: Production-ready release

**Acceptance Criteria**:
- [ ] Page load < 2 seconds
- [ ] API response < 500ms (95th percentile)
- [ ] Zero critical/high security findings
- [ ] All test cases passing

---

### 4.3 Milestone Summary

| Milestone | Sprint | Key Deliverables |
|-----------|--------|------------------|
| M1: Auth & Infrastructure | Sprint 2 | Authentication working, development environment stable |
| M2: Database & RBAC | Sprint 3 | Schema deployed, role-based access enforced |
| M3: HR Module | Sprint 6 | Employee management, leave workflow, hierarchy |
| M4: Task Module | Sprint 7 | Task management with all features |
| M5: Training & Expense | Sprint 11 | Course enrollment, exam, expense workflow |
| M6: Mind Map | Sprint 11 | Canvas-based mind mapping |
| M7: Complaints & Approvals | Sprint 13 | SLA-based complaint management, generic approvals |
| M8: Notifications | Sprint 14 | Real-time notification delivery |
| M9: Integration Complete | Sprint 15 | All modules integrated, reports available |
| M10: Production Ready | Sprint 16 | Performance optimized, security hardened |

---

### 4.4 Gantt Chart

```
Sprint  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |10 |11 |12 |13 |14 |15 |16 |
--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
Infra   |███|   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
Auth    |███|███|   |   |   |   |   |   |   |   |   |   |   |   |   |   |
RBAC    |   |   |███|   |   |   |   |   |   |   |   |   |   |   |   |   |
UI Base |   |███|███|   |   |   |   |   |   |   |   |   |   |   |   |   |
HR      |   |   |   |███|███|███|   |   |   |   |   |   |   |   |   |   |
Storage |   |   |   |   |███|   |   |   |   |   |   |   |   |   |   |   |
Task    |   |   |   |   |   |███|███|   |   |   |   |   |   |   |   |   |
Training|   |   |   |   |   |   |   |███|███|   |███|   |   |   |   |   |
Expense |   |   |   |   |   |   |   |   |███|███|   |   |   |   |   |   |
MindMap |   |   |   |   |   |   |   |   |   |███|███|   |   |   |   |   |
Complaint|  |   |   |   |   |   |   |   |   |   |   |███|   |   |   |   |
Approval|   |   |   |   |   |   |   |   |   |   |   |   |███|   |   |   |
Notif   |   |   |   |   |   |   |   |   |   |   |   |   |   |███|   |   |
Integr  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |███|   |
Polish  |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |███|
```

---

## 5. Implementation Risks (Task 5.4)

### 5.1 Technical Risks

#### TR-001: PostgreSQL RLS Performance

| Attribute | Value |
|-----------|-------|
| **Description** | Row-Level Security policies may degrade query performance on large datasets |
| **Impact** | High |
| **Probability** | Medium |
| **Mitigation** | 1. Use `set_config('app.current_tenant_id', ...)` for efficient RLS. 2. Add tenant_id to all indexes. 3. Benchmark with production-scale data. 4. Implement query caching for frequently accessed data. |
| **Contingency** | Optimize RLS policies or implement application-level filtering as fallback |

#### TR-002: Mind Map Canvas Performance

| Attribute | Value |
|-----------|-------|
| **Description** | Canvas rendering with many nodes (100+) may cause browser performance issues |
| **Impact** | Medium |
| **Probability** | Medium |
| **Mitigation** | 1. Use virtualization for large mind maps. 2. Implement viewport-based rendering. 3. Lazy-load node details. 4. Set practical limit (500 nodes per map). |
| **Contingency** | Implement pagination or collapsible sections for large maps |

#### TR-003: WebSocket Connection Stability

| Attribute | Value |
|-----------|-------|
| **Description** | WebSocket connections may drop due to network issues or server restarts |
| **Impact** | Medium |
| **Probability** | High |
| **Mitigation** | 1. Implement exponential backoff reconnection. 2. Queue notifications during disconnect. 3. Fallback to polling if WebSocket unavailable. 4. Client-side connection health monitoring. |
| **Contingency** | HTTP polling fallback with 30-second interval |

#### TR-004: Complex Approval Workflow Routing

| Attribute | Value |
|-----------|-------|
| **Description** | Multi-level approval routing with delegation may have edge cases |
| **Impact** | High |
| **Probability** | Medium |
| **Mitigation** | 1. Comprehensive test cases for all routing scenarios. 2. Clear workflow visualization in admin UI. 3. Audit logging of all routing decisions. 4. Timeout handling for unresponsive approvers. |
| **Contingency** | Admin override capability for stuck approvals |

#### TR-005: File Upload Security

| Attribute | Value |
|-----------|-------|
| **Description** | Malicious file uploads could compromise system or users |
| **Impact** | Critical |
| **Probability** | Medium |
| **Mitigation** | 1. Multi-layer file validation (extension, MIME, magic bytes). 2. File size limits (10MB per file). 3. ClamAV virus scanning (Phase 2 or when available). 4. Serve files via presigned URLs, not direct download. 5. Content-Disposition: attachment header. |
| **Contingency** | Quarantine suspicious files for manual review |

#### TR-006: State Machine Integrity

| Attribute | Value |
|-----------|-------|
| **Description** | Invalid state transitions could corrupt business data |
| **Impact** | High |
| **Probability** | Low |
| **Mitigation** | 1. Server-side state transition validation. 2. Comprehensive state machine unit tests. 3. Database-level check constraints for status values. 4. Audit logging of all transitions. |
| **Contingency** | Manual database correction with audit trail |

### 5.2 Schedule Risks

#### SR-001: Dependency Blocking

| Attribute | Value |
|-----------|-------|
| **Description** | Delays in foundation modules block dependent modules |
| **Impact** | High |
| **Probability** | Medium |
| **Mitigation** | 1. Prioritize auth and hr modules early. 2. Create mock APIs for parallel development. 3. Daily standups to identify blockers. 4. Buffer time built into schedule. |
| **Contingency** | Re-prioritize sprint scope to unblock critical path |

#### SR-002: UI Component Rework

| Attribute | Value |
|-----------|-------|
| **Description** | Shared components may need significant rework after initial use |
| **Impact** | Medium |
| **Probability** | Medium |
| **Mitigation** | 1. Design review before implementation. 2. Build Storybook documentation. 3. Get sign-off from first module usage. 4. Plan refactoring sprint if needed. |
| **Contingency** | Allocate Sprint 16 buffer for component fixes |

#### SR-003: Integration Issues

| Attribute | Value |
|-----------|-------|
| **Description** | Cross-module integrations may reveal interface mismatches |
| **Impact** | Medium |
| **Probability** | Medium |
| **Mitigation** | 1. Define inter-module contracts early. 2. Integration tests for each module boundary. 3. Sprint 15 dedicated to integration. 4. Clear API versioning. |
| **Contingency** | Extend Sprint 15 or reduce Sprint 16 scope |

#### SR-004: Performance Optimization Time

| Attribute | Value |
|-----------|-------|
| **Description** | Performance issues discovered late may require significant optimization |
| **Impact** | Medium |
| **Probability** | Medium |
| **Mitigation** | 1. Performance testing throughout development. 2. Set performance budgets (page load < 2s). 3. Monitor database query times. 4. Sprint 16 includes optimization time. |
| **Contingency** | Defer non-critical features to meet performance targets |

### 5.3 Security Risks

#### SEC-001: JWT Token Theft (from THREAT_MODEL.md SP-001)

| Attribute | Value |
|-----------|-------|
| **Description** | Access tokens could be stolen via XSS |
| **Impact** | High |
| **Probability** | Medium |
| **Mitigation** | 1. Short token lifetime (15 minutes). 2. Refresh token in httpOnly cookie. 3. CSP headers to prevent XSS. 4. Input sanitization. 5. React's built-in XSS protection. |
| **Implementation Sprint** | Sprint 1-2 |

#### SEC-002: Cross-Tenant Data Leakage (from THREAT_MODEL.md TA-002)

| Attribute | Value |
|-----------|-------|
| **Description** | API parameter manipulation could access other tenant data |
| **Impact** | Critical |
| **Probability** | Low |
| **Mitigation** | 1. Never trust tenant_id from request body. 2. Extract tenant_id from JWT only. 3. PostgreSQL RLS enforcement. 4. Comprehensive tenant isolation tests. |
| **Implementation Sprint** | Sprint 1, 3 |

#### SEC-003: Approval Workflow Bypass (from THREAT_MODEL.md TA-007)

| Attribute | Value |
|-----------|-------|
| **Description** | Users might self-approve their own requests |
| **Impact** | High |
| **Probability** | Medium |
| **Mitigation** | 1. Server-side validation: requester != approver. 2. Approval workflow configuration prevents self-approval. 3. Audit logging of all approvals. 4. Separation of duties enforcement. |
| **Implementation Sprint** | Sprint 13 |

### 5.4 Risk Matrix Summary

| Risk ID | Risk | Impact | Probability | Priority | Sprint to Address |
|---------|------|--------|-------------|----------|-------------------|
| TR-001 | PostgreSQL RLS Performance | High | Medium | P1 | Sprint 3, 16 |
| TR-002 | Mind Map Canvas Performance | Medium | Medium | P2 | Sprint 11 |
| TR-003 | WebSocket Stability | Medium | High | P1 | Sprint 14 |
| TR-004 | Approval Routing Complexity | High | Medium | P1 | Sprint 13 |
| TR-005 | File Upload Security | Critical | Medium | P1 | Sprint 5 |
| TR-006 | State Machine Integrity | High | Low | P2 | Sprint 7 |
| SR-001 | Dependency Blocking | High | Medium | P1 | All sprints |
| SR-002 | UI Component Rework | Medium | Medium | P2 | Sprint 2-3 |
| SR-003 | Integration Issues | Medium | Medium | P2 | Sprint 15 |
| SR-004 | Performance Optimization | Medium | Medium | P2 | Sprint 16 |
| SEC-001 | JWT Token Theft | High | Medium | P1 | Sprint 1-2 |
| SEC-002 | Cross-Tenant Leakage | Critical | Low | P1 | Sprint 1, 3 |
| SEC-003 | Approval Bypass | High | Medium | P1 | Sprint 13 |

---

## 6. Rollback Strategy (Task 5.5)

### 6.1 Rollback Principles

| Principle | Description |
|-----------|-------------|
| **Feature Flags** | All new features behind environment toggles |
| **Backward Compatible** | Database migrations must be backward compatible |
| **Quick Rollback** | Target: < 15 minutes to rollback any feature |
| **Data Preservation** | No data loss during rollback |
| **Audit Trail** | Log all rollback decisions |

### 6.2 Feature Flag Strategy

#### 6.2.1 Feature Flag Implementation

```python
# Environment-based feature flags
FEATURE_FLAGS = {
    "MINDMAP_TASK_LINKING": env.bool("FF_MINDMAP_TASK_LINKING", True),
    "APPROVAL_DELEGATION": env.bool("FF_APPROVAL_DELEGATION", True),
    "COMPLAINT_AUTO_ESCALATION": env.bool("FF_COMPLAINT_ESCALATION", True),
    "WEBSOCKET_NOTIFICATIONS": env.bool("FF_WEBSOCKET_NOTIFICATIONS", True),
    "EXPENSE_MULTI_LEVEL_APPROVAL": env.bool("FF_EXPENSE_APPROVAL", True),
    "TRAINING_CERTIFICATE_PDF": env.bool("FF_TRAINING_CERTIFICATE", True),
}

# Usage in code
if feature_flags.get("MINDMAP_TASK_LINKING"):
    # Enable node-to-task conversion
    pass
```

#### 6.2.2 Rollout Strategy

| Phase | User Coverage | Duration | Criteria to Proceed |
|-------|---------------|----------|---------------------|
| Canary | 5% users | 1 day | No errors, positive feedback |
| Limited | 25% users | 2 days | Error rate < 0.1%, performance stable |
| Broad | 50% users | 3 days | Error rate < 0.1%, no critical bugs |
| Full | 100% users | Ongoing | Stable metrics |

#### 6.2.3 Rollback Trigger Criteria

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | > 1% increase | Investigate |
| Error Rate | > 5% increase | Rollback immediately |
| Response Time | > 2x baseline | Investigate |
| Response Time | > 5x baseline | Rollback immediately |
| User Complaints | > 3 for same issue | Investigate |
| Data Integrity | Any corruption | Rollback immediately |

### 6.3 Database Migration Rollback

#### 6.3.1 Migration Design Rules

| Rule | Description |
|------|-------------|
| **Additive Only** | Add columns, don't drop (mark deprecated) |
| **Default Values** | New columns must have defaults |
| **Nullable** | New required fields nullable initially, enforce later |
| **No Rename** | Don't rename columns, add new + migrate + deprecate |
| **Index Concurrently** | Use `CREATE INDEX CONCURRENTLY` |

#### 6.3.2 Alembic Rollback Process

```bash
# View current revision
alembic current

# View migration history
alembic history

# Rollback one revision
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>

# Rollback all (danger!)
alembic downgrade base
```

#### 6.3.3 Migration Rollback Example

**Forward Migration (adding column):**
```python
def upgrade():
    op.add_column('tasks', sa.Column('priority_score', sa.Integer(), nullable=True, default=0))

def downgrade():
    op.drop_column('tasks', 'priority_score')
```

**Rollback Procedure:**
1. Disable feature flag for affected feature
2. Deploy previous application version
3. Run `alembic downgrade -1`
4. Verify application works without new column
5. Monitor for errors

### 6.4 Module-Specific Rollback Strategies

#### 6.4.1 Auth Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| JWT algorithm change | 1. Revert code 2. Invalidate all sessions | Users must re-login |
| Password policy change | 1. Revert code | No data impact |
| Role/permission change | 1. Revert code 2. Restore role_permissions | Access changes reverted |

#### 6.4.2 HR Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| Leave workflow change | 1. Disable flag 2. Revert code | Pending approvals continue with old flow |
| Hierarchy change | 1. Revert code | Relationships preserved |
| Employee field change | 1. Revert migration 2. Column dropped | Data in new column lost |

#### 6.4.3 Task Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| Status workflow change | 1. Revert code | Tasks in new statuses need manual fix |
| Dependency feature | 1. Disable flag 2. Revert code | Dependencies preserved but ignored |
| Sub-task feature | 1. Disable flag 2. Revert code | Sub-tasks orphaned (need cleanup) |

#### 6.4.4 Mind Map Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| Node-task linking | 1. Disable flag | Existing links preserved but hidden |
| Canvas rendering change | 1. Revert frontend | No data impact |
| Template feature | 1. Disable flag | Templates preserved but inaccessible |

#### 6.4.5 Approval Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| Workflow engine change | 1. Revert code 2. Manually process pending | Pending approvals need manual handling |
| Delegation feature | 1. Disable flag | Active delegations ignored |
| Timeout handling | 1. Revert code | Timeouts stop auto-processing |

#### 6.4.6 Notification Module Rollback

| Scenario | Rollback Steps | Data Impact |
|----------|----------------|-------------|
| WebSocket to polling | 1. Disable flag 2. Enable polling | No data loss, delayed delivery |
| New event type | 1. Revert code | New events not sent |
| Preference change | 1. Revert code | Preferences preserved |

### 6.5 Data Backup Strategy

#### 6.5.1 Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | MinIO / S3 |
| Incremental | Every 6 hours | 7 days | MinIO / S3 |
| Transaction Log | Continuous | 7 days | Local + MinIO |
| Pre-Migration | Before each migration | 90 days | MinIO / S3 |

#### 6.5.2 Backup Before Deployment

```bash
# Pre-deployment backup script
#!/bin/bash

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mindflow_pre_deploy_${BACKUP_DATE}.sql"

# Create backup
pg_dump -h localhost -U mindflow -d mindflow > /backups/$BACKUP_FILE

# Compress
gzip /backups/$BACKUP_FILE

# Upload to MinIO
mc cp /backups/${BACKUP_FILE}.gz minio/backups/pre-deploy/

# Verify backup
mc ls minio/backups/pre-deploy/${BACKUP_FILE}.gz

echo "Backup complete: ${BACKUP_FILE}.gz"
```

#### 6.5.3 Restore Procedure

```bash
# Restore from backup
#!/bin/bash

BACKUP_FILE=$1

# Download from MinIO
mc cp minio/backups/pre-deploy/$BACKUP_FILE /tmp/

# Decompress
gunzip /tmp/$BACKUP_FILE

# Restore
psql -h localhost -U mindflow -d mindflow < /tmp/${BACKUP_FILE%.gz}

echo "Restore complete from: $BACKUP_FILE"
```

### 6.6 Rollback Runbook

#### 6.6.1 Emergency Rollback Checklist

```
□ 1. ASSESS
   □ Identify the issue (error logs, metrics)
   □ Determine affected feature/module
   □ Estimate impact (users affected, data at risk)

□ 2. COMMUNICATE
   □ Alert team in #incidents channel
   □ Post status page update (if applicable)

□ 3. ISOLATE
   □ Disable feature flag (if available)
   □ If feature flag insufficient, proceed to code rollback

□ 4. ROLLBACK CODE
   □ Identify last stable commit
   □ Deploy previous version
   □ Verify deployment successful

□ 5. ROLLBACK DATABASE (if needed)
   □ Check if migration rollback needed
   □ Run backup verification
   □ Execute Alembic downgrade
   □ Verify schema matches code

□ 6. VERIFY
   □ Smoke test critical paths
   □ Check error rates returning to normal
   □ Verify no data loss/corruption

□ 7. DOCUMENT
   □ Create incident report
   □ Log rollback in CHANGELOG
   □ Schedule post-mortem

□ 8. COMMUNICATE RESOLUTION
   □ Update status page
   □ Notify affected users (if applicable)
```

---

## 7. Roadmap Freeze (Task 5.6)

### 7.1 Freeze Declaration

**This Implementation Plan is hereby FROZEN as of the approval date.**

Changes to this roadmap require:
1. Formal change request with justification
2. Impact analysis on dependencies and timeline
3. Product Owner approval
4. Update to this document and CHANGELOG.md

### 7.2 Change Control Process

| Change Type | Approval Required | Update Required |
|-------------|-------------------|-----------------|
| **Sprint scope adjustment** (within phase) | Tech Lead | Sprint backlog only |
| **Feature deferral** (within phase) | Tech Lead + PO | This document |
| **Phase timeline change** | PO + Stakeholders | This document + CHANGELOG |
| **Module removal/addition** | PO + Stakeholders | Full re-planning |
| **Technology change** | Architecture Review Board | TECH_STACK.md + This document |

### 7.3 Frozen Elements

The following are FROZEN and cannot change without formal approval:

| Element | Reference |
|---------|-----------|
| Module list | 10 modules as defined in Section 2 |
| Build sequence | Phase 1 → 5 as defined in Section 2 |
| Service dependencies | Dependency graph in Section 3 |
| Sprint structure | 16 sprints, 2 weeks each |
| Total timeline | 32 weeks |
| Technology stack | [TECH_STACK.md](TECH_STACK.md) |
| Database schema | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| API contracts | [API_CONTRACT.md](API_CONTRACT.md) |

### 7.4 Flexible Elements

The following may be adjusted by Tech Lead without formal change request:

| Element | Constraints |
|---------|-------------|
| Story point allocation within sprint | Total must not exceed capacity |
| Developer assignment | Skills must match requirements |
| Daily task prioritization | Must align with sprint goals |
| Bug fix scheduling | Critical bugs take priority |
| Technical approach | Must meet acceptance criteria |

### 7.5 Roadmap Validation Checklist

| Validation Item | Status |
|-----------------|--------|
| Build sequence follows dependency order | ✅ |
| Service dependencies align with ARCHITECTURE_DESIGN.md | ✅ |
| Sprint scope is realistic (30-40 points per sprint) | ✅ |
| All technical risks from THREAT_MODEL.md addressed | ✅ |
| Rollback strategy includes database migration rollback | ✅ |
| Document includes timeline/Gantt chart | ✅ |
| Roadmap references all prerequisite documents | ✅ |

---

## 8. Dependencies

### 8.1 Document Dependencies

| Document | Dependency Type | Usage |
|----------|-----------------|-------|
| [PRD.md](PRD.md) | Authority | Feature requirements, module priorities |
| [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md) | Authority | Service structure, dependencies |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Authority | Table structures, migration planning |
| [API_CONTRACT.md](API_CONTRACT.md) | Authority | Endpoint specifications |
| [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) | Authority | Component structure, page hierarchy |
| [MODULE_FUNCTIONAL_DESIGN.md](MODULE_FUNCTIONAL_DESIGN.md) | Authority | Workflows, state machines |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Authority | Security risks, mitigation requirements |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | Authority | Security controls implementation |
| [COMPLIANCE_MAPPING.md](COMPLIANCE_MAPPING.md) | Authority | Compliance requirements |

### 8.2 Phase Dependencies

| Phase | Depends On | Produces |
|-------|------------|----------|
| Phase 6 (Implementation) | This document | Working code |
| Phase 7 (Testing) | Phase 6 | Test results |
| Phase 8 (Deployment) | Phase 7 | Production system |

---

## 9. Approval Record

### 9.1 Phase Gate Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 5 – Implementation Planning | CLOSED | 2026-01-16 |

### 9.2 Task Completion Summary

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Define build sequence | ✅ COMPLETE |
| 5.2 | Define service dependency order | ✅ COMPLETE |
| 5.3 | Define sprint scope and milestones | ✅ COMPLETE |
| 5.4 | Identify implementation risks | ✅ COMPLETE |
| 5.5 | Define rollback strategy per feature | ✅ COMPLETE |
| 5.6 | Freeze implementation roadmap | ✅ COMPLETE |

### 9.3 Deliverable Summary

| Attribute | Value |
|-----------|-------|
| **Build Phases** | 5 phases (Foundation, Core, Extended, Advanced, Integration) |
| **Total Sprints** | 16 sprints (32 weeks) |
| **Service Modules** | 10 modules in dependency order |
| **Milestones** | 10 key deliverables |
| **Risks Identified** | 13 (6 technical, 4 schedule, 3 security) |
| **Rollback Strategy** | Feature flags + Alembic migrations |

### 9.4 Approval Signatures

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| **Product Owner** | [PO Name] | APPROVED | 2026-01-16 | Implementation plan approved, development authorized |
| **Builder (AI)** | Claude | COMPLETE | 2026-01-16 | Roadmap frozen, ready for Phase 6 |

---

**Document Status**: COMPLETE - Product Owner Approved (2026-01-16)

**Next Phase**: Phase 6 – Controlled Implementation (AUTHORIZED)

**AUTHORIZATION**: Development team may begin coding.

---

**END OF IMPLEMENTATION_PLAN.md**
