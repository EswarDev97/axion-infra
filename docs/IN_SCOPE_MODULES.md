# MindFlow – In-Scope Modules (Phase 1)

> **Purpose**: This document identifies and documents all functional modules included in MindFlow Phase 1 (Web-only).
> **Source**: Extracted from [PRD.md](PRD.md)
> **SDLC Reference**: Phase 0, Task 0.3
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Task** | 0.3 – Identify and document all in-scope modules |
| **Authority** | Subordinate to [PRD.md](PRD.md) |
| **Approval Status** | APPROVED |

---

## Introduction

MindFlow is an internal execution, governance, and operational control platform that unifies thinking, planning, execution, organizational structure, capability building, financial discipline, client quality control, and system oversight into one coherent system.

This document catalogs **all functional modules** that are **in scope for Phase 1** of MindFlow. Each module is documented with its primary purpose, key capabilities, and dependencies on other modules.

**Scope Constraint**: This document covers only web-based functionality. Mobile applications are explicitly excluded from Phase 1.

---

## Table of Contents

1. [Mind Mapping Module](#1-mind-mapping-module)
2. [Task Management Module](#2-task-management-module)
3. [HR Management Module](#3-hr-management-module)
4. [Training Management Module](#4-training-management-module)
5. [Expense Management Module](#5-expense-management-module)
6. [Complaints Management Module](#6-complaints-management-module)
7. [System Foundations Module](#7-system-foundations-module)
8. [Module Dependencies Summary](#module-dependencies-summary)

---

## 1. Mind Mapping Module

### Purpose
A cognitive and planning tool that helps users think, structure, analyze, and plan. Mind maps are long-living planning artifacts for visually representing ideas, workflows, SOPs, claims processes, training structures, operational plans, or problem breakdowns.

**Critical Note**: This module is NOT an execution owner. It does not own task data.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Mind Map Creation & Lifecycle** | Create, edit, archive unlimited mind maps with title, description, and status |
| **Node Creation & Restructuring** | Add, edit, move, reorder nodes with drag-and-drop; preserve visual layout |
| **Node Types** | Support Idea, Activity, Reference/Note, and Linked Task node types |
| **Visual Enhancements** | Support icons, color coding, labels/tags, priority markers, images, attachments |
| **Templates & Themes** | Start from predefined templates (claims workflow, SOP, training roadmap, planning); save custom templates |
| **Focus/Zen Mode** | Distraction-free UI mode hiding sidebars, menus, notifications |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| Task Management Module | For Linked Task node type (references tasks, does not own them) |
| System Foundations Module | Authentication, authorization, audit logging |

---

## 2. Task Management Module

### Purpose
Independent execution and work management module. Tasks exist independently of mind maps. This is the primary execution surface for daily work.

**Critical Note**: This is a FIRST-CLASS, STANDALONE module. Mind Maps are ONE OF SEVERAL task creation entry points.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Independent Task Creation** | Create tasks directly without involving mind maps |
| **Task Creation via Mind Maps** | Convert mind map nodes into tasks (secondary entry point) |
| **Task Attributes** | Title, description, assigned person(s), ECD, status, priority, labels/tags, origin type |
| **Pre-Defined Task Statuses** | Not Started, In Progress, Waiting/Blocked, Review Required, Completed, Dropped/Cancelled |
| **Task Assignment & Re-assignment** | Assign/reassign tasks governed by HR hierarchy and role permissions |
| **Sub-Tasks & Hierarchies** | Hierarchical task breakdown with parent-child relationships |
| **Task Dependencies** | Define dependencies between tasks; enforce process discipline |
| **Task Views** | List View, Kanban Board, Calendar View, Filtered Views (by assignee, status, priority) |
| **Task Collaboration** | Comments, mentions, file attachments |
| **Task Notifications** | In-app notifications for assignment, due dates, overdue, status changes |
| **Task Reporting** | Reports by status, overdue tasks, user workload, priority distribution |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| HR Management Module | Task assignment based on employees and hierarchy |
| System Foundations Module | Authentication, authorization, audit logging, notifications |

---

## 3. HR Management Module

### Purpose
The structural backbone of MindFlow. Defines who exists in the organization, how they relate to each other, and how authority flows. Every other module depends on HR.

**Critical Note**: This module is the FOUNDATION for task assignment, approvals, escalations, and visibility across all modules.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Position Management** | Create/manage organizational positions (MD, National Head, Regional Manager, Manager, Team Lead, Executive); define authority levels |
| **Organizational Hierarchy** | Define reporting structure (who reports to whom); multi-level reporting; governs task assignment, approvals, escalations, visibility |
| **Candidate/Interview Management** | Basic candidate tracking with stages: Applied, Interviewed, Selected, Rejected |
| **Employee Onboarding** | Convert candidates to employees; create employee profile, system access, position mapping, manager mapping |
| **Employee Directory** | Centralized, searchable directory used across all modules; filter by position, status |
| **Attendance Management** | Simple attendance tracking: Present/Absent per day; self-marking or admin marking |
| **Leave Management** | Leave request submission and approval; basic leave balance tracking |
| **Payroll (Reference Only)** | Store basic payroll reference data (NO automation, NO calculations, NO bank integration) |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| System Foundations Module | Authentication, authorization, audit logging |

---

## 4. Training Management Module

### Purpose
Structured learning with classroom sessions and mandatory exams. Ensures employees are trained, assessed, and certified for operational readiness.

**Critical Note**: Training is mandatory, and exam at the end is compulsory.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Training Course/Module Management** | Create training courses with title, description, objectives, duration, mandatory flag |
| **Training Scheduling & Calendar** | Schedule classroom sessions with date, time, location, trainer |
| **Trainer/Instructor Assignment** | Assign senior staff as trainers; enforce visibility and accountability |
| **Training Content Delivery** | Attach digital materials (PDF, PPT, video links, reference links) |
| **Attendance Tracking (Training)** | Track attendance for classroom sessions |
| **Assessment/Exam Engine** | Mandatory online exams per training module; time-bound; auto-submit on timeout |
| **Question Bank** | Reusable questions: MCQ, True/False, Fill in the blanks |
| **Exam Results & Certification** | Store exam results permanently; generate PDF certificates for passing employees |
| **Training Reports** | Completion rates, exam scores, attendance reports |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| HR Management Module | Trainer assignment, employee enrollment, training attendance |
| System Foundations Module | Authentication, authorization, document storage, audit logging |

---

## 5. Expense Management Module

### Purpose
Financial discipline and auditability for expense requests, approvals, payments, and audit.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Expense Request Creation** | Submit expense requests with type, amount, description, date |
| **Bill & Document Upload** | Mandatory supporting document attachments |
| **Multi-Level Approval Workflow** | Sequential approvals: Reporting Manager → Higher Manager (if applicable) → Finance |
| **Expense Status Tracking** | Draft, Submitted, Manager Approved, Finance Approved, Paid, Rejected |
| **Finance Payment Processing** | Record payment mode, reference number, payment date |
| **Expense Reports & Audit** | Reports: employee-wise, month-wise, pending approvals; CSV export |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| HR Management Module | Approval routing via hierarchy; employee expense tracking |
| System Foundations Module | Authentication, authorization, document storage, audit logging, approval workflows |

---

## 6. Complaints Management Module

### Purpose
Client trust management through formal operational incident tracking with SLA and escalation. Complaints are NOT notes; they are formal operational incidents.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Complaint Logging** | Central logging from phone, internal staff, email/WhatsApp (future) |
| **Complaint Classification** | Classify by type, severity (Low/Medium/High/Critical), client/insurer |
| **Context Linking** | Link complaints to claim number, vehicle, workshop, client |
| **Assignment & Ownership** | Assign complaint owner; hierarchy-based escalation |
| **Status Tracking** | New, Assigned, In Progress, Waiting for Info, Resolved, Closed, Reopened |
| **Action History & Notes** | Append-only action log for all investigation steps |
| **SLA & TAT Tracking** | SLA rules based on severity; automatic TAT calculation |
| **Escalation Management** | Automatic escalation on SLA breach via scheduler and hierarchy lookup |
| **Closure & Reopening** | Closure requires remarks; support for reopening |
| **Client Communication (Future)** | Notification hooks for client updates on closure |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| HR Management Module | Assignment and escalation via hierarchy |
| Task Management Module | May generate tasks for resolution activities |
| System Foundations Module | Authentication, authorization, audit logging, notifications, SLA configuration |

---

## 7. System Foundations Module

### Purpose
Core non-functional infrastructure and cross-cutting concerns that support all other modules. This is NOT a user-facing module but provides essential system-level capabilities.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Authentication & Access** | Secure login, session management, password hashing, session timeout, account lifecycle |
| **Role & Permission Matrix (RBAC)** | Fine-grained permissions per module and action; API-level enforcement |
| **Data Ownership & Tenancy** | Multi-tenant architecture with `tenant_id` on all entities; PostgreSQL Row-Level Security (RLS) |
| **Audit & Compliance** | Immutable logs for all critical actions; middleware-based audit logging |
| **Backup & Recovery** | Scheduled automated backups; admin restore controls |
| **Error Handling & Exceptions** | Central error handler; graceful failures; error logs |
| **Configuration Management** | Configurable business rules (not hard-coded); config tables; admin UI; audit config changes |

### Module Dependencies

| Depends On | Reason |
|------------|--------|
| None | Foundation layer with no dependencies on other application modules |

---

## Module Dependencies Summary

This table provides a high-level view of module interdependencies:

| Module | Depends On | Depended Upon By |
|--------|------------|------------------|
| **Mind Mapping** | Task Management, System Foundations | None |
| **Task Management** | HR Management, System Foundations | Mind Mapping, Complaints Management |
| **HR Management** | System Foundations | Task Management, Training Management, Expense Management, Complaints Management |
| **Training Management** | HR Management, System Foundations | None |
| **Expense Management** | HR Management, System Foundations | None |
| **Complaints Management** | HR Management, Task Management, System Foundations | None |
| **System Foundations** | None | All other modules |

### Dependency Flow

```
                    ┌─────────────────────┐
                    │ System Foundations  │
                    │   (Foundation)      │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │    HR     │  │   Task    │  │ Mind Map  │
        │Management │  │Management │  │           │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
      ┌───────┼──────────────┼──────────────┘
      │       │              │
      ▼       ▼              ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Training │ │ Expense │ │Complaint│
└─────────┘ └─────────┘ └─────────┘
```

### Key Insights

1. **HR Management** is the most critical dependency, affecting Task Management, Training, Expense, and Complaints modules
2. **System Foundations** is a universal dependency for all modules
3. **Mind Mapping** has minimal dependencies and is NOT depended upon by other modules (except for optional task creation)
4. **Task Management** is a first-class module that can function independently of Mind Mapping

---

## Summary

MindFlow Phase 1 includes **7 functional modules**:

1. Mind Mapping Module
2. Task Management Module
3. HR Management Module
4. Training Management Module
5. Expense Management Module
6. Complaints Management Module
7. System Foundations Module

**Total In-Scope Modules**: 7

**Module Count Breakdown**:
- User-Facing Functional Modules: 6
- Infrastructure/Foundation Modules: 1

**Architectural Pattern**: Microservices (10 independent services as defined in TECH_STACK.md map to these 7 modules plus cross-cutting services)

---

## Ambiguities & Clarifications Required

### Resolved Ambiguities (Per PRD)
1. ✅ Task Management is independent of Mind Mapping
2. ✅ Mind Maps only reference tasks, do not own them
3. ✅ HR hierarchy is the backbone for approvals and escalations
4. ✅ Payroll is reference-only (no automation)
5. ✅ Multi-tenant architecture confirmed

### No Outstanding Ambiguities
All module definitions from PRD.md are explicit and unambiguous.

---

## Approval Record

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

**END OF IN_SCOPE_MODULES.md**
