# MindFlow – System Understanding Summary

> **Purpose**: Executive summary of MindFlow system for stakeholders, consolidating all Phase 0 work into a high-level overview.
> **Audience**: Product Owner, Technical Leadership, Project Stakeholders
> **SDLC Reference**: Phase 0, Task 0.10
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Task** | 0.10 – Produce System Understanding Summary |
| **Authority** | Consolidates all Phase 0 documents |
| **Approval Status** | PENDING |
| **Document Type** | Executive Summary |

---

## Executive Summary

**MindFlow** is an internal execution, governance, and operational control platform designed to unify thinking, planning, execution, organizational structure, capability building, financial discipline, and client quality control into one coherent web-based system.

**Phase 1 Scope**: Web-only, multi-tenant SaaS platform supporting 40-80+ users with 7 functional modules, governed by organizational hierarchy, strict auditability, and security-first design.

**Key Differentiators**: Focus on execution over ornamentation, no ERP bloat, hierarchy-driven approvals and escalations, multi-tenant architecture with database-level isolation (PostgreSQL RLS), and comprehensive audit trails for compliance.

---

## Product Overview

### What is MindFlow?

MindFlow is a **centralized, web-based application** that addresses operational execution gaps in organizations by providing:

1. **Cognitive Tools** – Mind mapping for planning and structuring
2. **Execution Engine** – Independent task management for daily work
3. **Organizational Backbone** – HR hierarchy driving all approvals and visibility
4. **Capability Building** – Structured training with mandatory assessments
5. **Financial Control** – Expense tracking with multi-level approvals
6. **Quality Management** – Complaint tracking with SLA enforcement
7. **System Governance** – Audit, RBAC, compliance, and security foundations

### Core Purpose

From [PRD.md](PRD.md) Section 1.2:
> MindFlow is an **internal execution, governance, and operational control platform** that unifies [...] into **one coherent system**, governed by hierarchy, approvals, SLAs, and auditability.

---

## In-Scope Modules (Phase 1)

**Total Modules**: 7

Detailed in [IN_SCOPE_MODULES.md](IN_SCOPE_MODULES.md)

### 1. Mind Mapping Module
- **Purpose**: Cognitive and planning tool (NOT execution owner)
- **Key Features**: Unlimited mind maps, drag-and-drop nodes, templates, Zen mode
- **Critical Constraint**: References tasks, does not own task data

### 2. Task Management Module
- **Purpose**: Independent execution and work management (FIRST-CLASS module)
- **Key Features**: Full CRUD, sub-tasks, dependencies, multiple views, collaboration
- **Critical Constraint**: Exists independently of Mind Maps

### 3. HR Management Module
- **Purpose**: Organizational backbone (FOUNDATION for all modules)
- **Key Features**: Positions, hierarchy, employees, attendance, leave, payroll reference
- **Critical Constraint**: Defines authority flow for all approvals and escalations

### 4. Training Management Module
- **Purpose**: Structured learning with mandatory exams
- **Key Features**: Courses, scheduling, classroom sessions, exam engine, certifications
- **Critical Constraint**: Training mandatory, exams compulsory

### 5. Expense Management Module
- **Purpose**: Financial discipline and auditability
- **Key Features**: Expense requests, multi-level approvals, payment tracking, audit reports
- **Critical Constraint**: Approvals follow HR hierarchy

### 6. Complaints Management Module
- **Purpose**: Client trust and SLA management
- **Key Features**: Complaint logging, classification, SLA tracking, auto-escalation
- **Critical Constraint**: Formal operational incidents with SLA enforcement

### 7. System Foundations Module
- **Purpose**: Core infrastructure and cross-cutting concerns
- **Key Features**: Auth, RBAC, multi-tenancy, audit, backup, config management
- **Critical Constraint**: Universal foundation for all modules

---

## Out-of-Scope Items (Phase 1)

**Total Exclusions**: 26 explicitly out-of-scope items

Detailed in [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md) Section A

### Major Exclusions:
- ❌ **Enterprise Systems**: ERP, CRM, Performance Appraisal, Payroll Automation
- ❌ **Platform**: Mobile apps (native), Desktop apps, Offline-first architecture
- ❌ **HR Features**: Biometric attendance, Geo-fencing, Complex leave policies, Full ATS
- ❌ **Advanced Features**: AI/ML, SSO, Third-party integrations (Phase 1)
- ❌ **Ornamentation**: Gamification, Free-text statuses

**Rationale**: Focus on execution excellence, prevent scope creep, maintain operational clarity.

---

## Scale and Platform Summary

Detailed in [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md) Sections B and C

### Scale Assumptions (Task 0.5)

| Metric | Value |
|--------|-------|
| **User Count** | 40-50 users (initial) → 70-80+ users (target) |
| **Tenancy Model** | Multi-tenant SaaS |
| **Concurrent Users** | ~50-70% of total (assumption) |
| **Architecture** | Centralized, real-time multi-user |

### Platform Scope (Task 0.6)

| Platform | Phase 1 Status |
|----------|----------------|
| **Web (Desktop/Tablet/Mobile)** | ✅ IN SCOPE |
| **Native Mobile Apps** | ❌ FUTURE PHASES |
| **Desktop Apps** | ❌ NOT PLANNED |
| **Offline Mode** | ❌ EXPLICITLY FORBIDDEN |

**Architecture Model**: Online-only, centralized backend with browser-based interface.

---

## Multi-Tenancy Architecture

Detailed in [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md) Section D

### Multi-Tenancy Model (Task 0.7 – LOCKED)

| Aspect | Implementation |
|--------|----------------|
| **Model Type** | Multi-tenant SaaS (shared schema, logical isolation) |
| **Isolation Mechanism** | `tenant_id` column + PostgreSQL Row-Level Security (RLS) |
| **Enforcement** | Database-level (RLS policies) + Application-level (`tenant_id` injection) |
| **Status** | FROZEN per PRD Section 8.3 |

**Critical Requirements**:
- ALL tables MUST have `tenant_id` column
- ALL tables MUST have RLS policies
- ALL APIs MUST inject `tenant_id` from authenticated session
- Cross-tenant access FORBIDDEN (enforced by RLS)

---

## Cross-Cutting Concerns

Detailed in [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Section A

### Major Cross-Cutting Concerns (Task 0.8)

| Concern | Approach | Service Owner |
|---------|----------|---------------|
| **Audit & Logging** | Distributed | Each service |
| **Approvals & Workflows** | Centralized | approval-service |
| **Notifications** | Centralized | notification-service |
| **Document Storage** | Centralized | storage-service |
| **RBAC & Authorization** | Hybrid | auth-service + middleware |
| **Multi-Tenancy** | Distributed | All services (RLS) |
| **Search & Filtering** | Distributed | Each service |
| **Reporting & Export** | Distributed | Each service |
| **Configuration** | Distributed | Each service |
| **SLA & Escalation** | Distributed | Per service |

**Key Insight**: Mix of centralized services (approvals, notifications, storage) and distributed patterns (audit, multi-tenancy, reporting).

---

## Key Architectural Decisions

Documented in [DECISIONS.md](DECISIONS.md)

### ADR-001: Technology Stack Selection
- **Decision**: Python/FastAPI backend, Next.js/TypeScript frontend, PostgreSQL + Redis + MinIO
- **Rationale**: Modern, type-safe, microservices-ready, compliance-capable
- **Status**: ACCEPTED

### ADR-002: Microservices Architecture
- **Decision**: 10 independent services by domain
- **Rationale**: Independent development/deployment, clear ownership, horizontal scaling
- **Status**: ACCEPTED

### Phase 0 Architectural Commitments

From [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Section B

1. **Modules are Independent** – No ownership, reference-only relationships
2. **Hierarchy is Backbone** – All approvals/escalations flow from HR
3. **Execution > Ornamentation** – No ERP bloat, CRM, gamification
4. **Auditability Everywhere** – Immutable logs for all critical actions
5. **Multi-Tenancy Enforced** – `tenant_id` + RLS on all entities
6. **Online-Only** – No offline-first architecture
7. **Web-Only Phase 1** – Mobile apps in future phases
8. **Enum-Based Statuses** – No free-text statuses
9. **Soft Deletes** – Retain critical data with `is_deleted` flag
10. **API-Level Validation** – Backend enforces all rules

---

## Module Dependency Graph

```
                    ┌─────────────────────┐
                    │ System Foundations  │
                    │ (auth, RBAC, audit) │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │    HR     │  │   Task    │  │ Mind Map  │
        │Management │  │Management │  │           │
        │(BACKBONE) │  │(EXECUTION)│  │ (PLANNING)│
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
      ┌───────┼──────────────┼──────────────┘
      │       │              │
      ▼       ▼              ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Training │ │ Expense │ │Complaint│
│ Module  │ │ Module  │ │ Module  │
└─────────┘ └─────────┘ └─────────┘
```

**Dependency Flow**:
1. **System Foundations** – Universal dependency for all modules
2. **HR Management** – Critical dependency for Task, Training, Expense, Complaints
3. **Task Management** – Referenced by Mind Maps and Complaints (optional)
4. **Mind Maps** – Standalone planning tool with minimal dependencies

**Critical Path**: System Foundations → HR Management → [All Other Modules]

---

## Technology Architecture

From [TECH_STACK.md](TECH_STACK.md)

### 10 Microservices (Phase 1)

| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 8101 | Authentication, RBAC, tenant management |
| hr-service | 8102 | Positions, hierarchy, employees, attendance, leave |
| task-service | 8103 | Task management, sub-tasks, dependencies |
| mindmap-service | 8104 | Mind maps, nodes, templates |
| training-service | 8105 | Courses, sessions, exams, certificates |
| expense-service | 8106 | Expense requests, approvals, payments |
| complaint-service | 8107 | Complaints, SLA, escalation |
| approval-service | 8108 | Generic approval workflows |
| notification-service | 8109 | Real-time notifications, WebSocket |
| storage-service | 8110 | File uploads, MinIO abstraction |

### Infrastructure Stack
- **API Gateway**: Kong 3.4+ (Port 8000)
- **Database**: PostgreSQL 16 (with RLS)
- **Cache/Queue**: Redis 7
- **File Storage**: MinIO (S3-compatible)
- **Container Orchestration**: Docker + Docker Compose

### Frontend Stack
- **Framework**: Next.js 14 + TypeScript 5.x
- **State Management**: Zustand (client), TanStack React Query (server)
- **UI**: Tailwind CSS, React Hook Form, Zod

---

## Assumptions and Open Questions

Detailed in [ASSUMPTIONS_REGISTER.md](ASSUMPTIONS_REGISTER.md)

### Key Assumptions Requiring Validation

| Assumption | Source | Phase to Confirm |
|------------|--------|------------------|
| Concurrent users ~50-70% of total | Reasonable estimate | Phase 1 (Architecture) |
| Single tenant for Phase 1 deployment | Not explicit in PRD | Phase 1 |
| Browser compatibility: latest 2 versions | Standard practice | Phase 1 |
| Performance SLAs not specified | PRD omission | Phase 1 |
| Tenant deletion policy undefined | PRD omission | Phase 0.5 (Compliance) |

**Recommendation**: These assumptions are acceptable for Phase 0 closure. They will be validated and documented in subsequent phases.

---

## Next Steps (Post-Phase 0)

### Immediate Next Phase: Phase 0.5
**Security, Compliance & Secure SDLC Foundation**

Tasks include:
- Regulatory compliance mapping (DPDP Act 2023, CERT-In 2022)
- Data classification and retention policies
- Security architecture design (zero-trust, authentication, authorization)
- Threat modeling (STRIDE)
- Logging and incident response planning

### Phase 1: System Architecture Design
- Define service boundaries and responsibilities
- Define inter-service communication patterns
- Define API Gateway responsibilities
- Assign development ports
- Produce Architecture Design Document

### Phase 2: Domain & Database Schema Design
- Design entity schemas per service
- Define enums, indexes, constraints
- Define Row-Level Security (RLS) policies
- Freeze all data structures

---

## Document References

This System Understanding Summary consolidates the following Phase 0 documents:

| Document | Purpose | SDLC Tasks |
|----------|---------|------------|
| [PRD.md](PRD.md) | Product Requirements (FROZEN) | 0.1 |
| [TECH_STACK.md](TECH_STACK.md) | Technology Stack (FROZEN) | 0.2 |
| [IN_SCOPE_MODULES.md](IN_SCOPE_MODULES.md) | Module definitions | 0.3 |
| [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md) | Scope boundaries and assumptions | 0.4-0.7 |
| [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) | Cross-cutting concerns and rules | 0.8-0.9 |
| [ASSUMPTIONS_REGISTER.md](ASSUMPTIONS_REGISTER.md) | Assumptions catalog | 0.11 |
| [NON_GOALS.md](NON_GOALS.md) | Explicit exclusions | 0.12 |

---

## Approval Record

| Reviewer | Role | Status | Date | Comments |
|----------|------|--------|------|----------|
| Product Owner | Authority | APPROVED | 2026-01-13 | All deliverables meet requirements |
| Technical Lead | Review | PENDING | - | - |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | AI (Claude) | Initial creation for SDLC Task 0.10 |

---

**END OF SYSTEM_UNDERSTANDING.md**
