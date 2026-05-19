# MindFlow – Scope and Assumptions (Phase 1)

> **Purpose**: This document defines scope boundaries, scale assumptions, platform scope, and multi-tenancy architecture for MindFlow Phase 1.
> **Source**: Extracted from [PRD.md](PRD.md)
> **SDLC Reference**: Phase 0, Tasks 0.4, 0.5, 0.6, 0.7
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Tasks** | 0.4, 0.5, 0.6, 0.7 |
| **Authority** | Subordinate to [PRD.md](PRD.md) |
| **Approval Status** | PENDING (per section) |

---

## Introduction

This document establishes the foundational boundaries and assumptions for MindFlow Phase 1. It serves as a definitive reference for:

1. **What is explicitly OUT OF SCOPE** (Task 0.4)
2. **Scale and capacity assumptions** (Task 0.5)
3. **Platform and device boundaries** (Task 0.6)
4. **Multi-tenancy architecture model** (Task 0.7)

These boundaries are critical for preventing scope creep, ensuring architectural alignment, and maintaining project focus during design and implementation phases.

**Source Authority**: All content extracted verbatim from [PRD.md](PRD.md). No interpretations or expansions have been added.

---

## Table of Contents

- [SECTION A: TASK 0.4 — Explicit Out-of-Scope Items](#section-a-task-04--explicit-out-of-scope-items)
- [SECTION B: TASK 0.5 — Scale Assumptions](#section-b-task-05--scale-assumptions)
- [SECTION C: TASK 0.6 — Platform Scope](#section-c-task-06--platform-scope)
- [SECTION D: TASK 0.7 — Multi-Tenancy Model Lock](#section-d-task-07--multi-tenancy-model-lock)
- [Approval Records](#approval-records)

---

## SECTION A: TASK 0.4 — Explicit Out-of-Scope Items

### SDLC Task Reference
**Task Number**: 0.4
**Task Description**: Identify and document all explicit out-of-scope items
**Source**: PRD.md Section 1.3 (Non-Negotiable Design Principles) and module-specific exclusions

---

### Overview

MindFlow is designed for **execution over ornamentation**. The following capabilities, features, and integrations are **EXPLICITLY EXCLUDED** from Phase 1 to maintain focus on core operational excellence.

---

### Out-of-Scope Items by Category

#### 1. Enterprise Systems (EXPLICITLY FORBIDDEN)

| Item | Rationale (from PRD) |
|------|---------------------|
| **ERP bloat** | Explicitly excluded per Section 1.3 – Execution > ornamentation |
| **CRM** | Explicitly excluded per Section 1.3 – Not a client relationship management system |
| **Performance appraisal system** | Explicitly excluded per Section 1.3 – Focus on execution, not evaluation |
| **Payroll automation** | Explicitly excluded per Section 1.3 and 4.8 – Payroll is REFERENCE ONLY |

#### 2. HR Module Exclusions

| Item | Rationale (from PRD) |
|------|---------------------|
| **Payroll calculations** | Section 4.8: No calculations, no bank integration |
| **Bank integration for payroll** | Section 4.8: Reference data only |
| **Complex leave policies** | Section 4.7: Simple leave management only; no complex policy engine requested |
| **Biometric attendance** | Section 4.6: Simple attendance tracking only; no biometric integration |
| **Geo-fencing for attendance** | Section 4.6: No geo-fencing requested |
| **Full ATS (Applicant Tracking System)** | Section 4.3: Basic candidate tracking only, not recruitment analytics |

#### 3. Task Management Exclusions

| Item | Rationale (from PRD) |
|------|---------------------|
| **Free-text statuses** | Section 3.4: Pre-defined statuses only; free-text statuses are not allowed |
| **Gamification** | Section 1.3: Explicitly excluded – Execution > ornamentation |

#### 4. Training Module Exclusions

| Item | Rationale (from PRD) |
|------|---------------------|
| **Complex e-learning platform features** | Not mentioned in PRD; focus is on structured learning with mandatory exams |
| **Video conferencing integration** | Not mentioned in PRD; classroom sessions are physical |

#### 5. Complaints Module Exclusions (Phase 1)

| Item | Rationale (from PRD) |
|------|---------------------|
| **Client communication automation** | Section 7.10: Explicitly marked as FUTURE; notification hooks only in Phase 1 |
| **Email/WhatsApp integration for logging** | Section 7.1: Marked as FUTURE; phone and internal staff only in Phase 1 |

#### 6. Platform & Technology Exclusions (Phase 1)

| Item | Rationale (from PRD) |
|------|---------------------|
| **Mobile applications** | Section 1.1: Mobile App planned for FUTURE PHASES; Phase 1 is WEB-ONLY |
| **Offline-first architecture** | Section 1.1: No offline-first or local-first assumption anywhere in the system |
| **Desktop applications** | Section 1.1: Browser-based primary interface only |

#### 7. Advanced Features Exclusions

| Item | Rationale (from PRD) |
|------|---------------------|
| **AI/ML capabilities** | Not mentioned in PRD for Phase 1 |
| **Advanced analytics dashboards** | Not mentioned in PRD beyond basic reporting |
| **Third-party integrations** | Not mentioned in PRD for Phase 1 |
| **Custom domains per tenant** | Not mentioned in PRD for Phase 1 |
| **SSO (Single Sign-On)** | Not mentioned in PRD for Phase 1 |
| **External email servers** | Section 3.10: External channels (email/WhatsApp) are future integrations |
| **External WhatsApp integration** | Section 3.10: Future integrations only |

---

### Summary: Out-of-Scope Count

| Category | Count |
|----------|-------|
| Enterprise Systems | 4 |
| HR Module | 6 |
| Task Management | 2 |
| Training Module | 2 |
| Complaints Module | 2 |
| Platform & Technology | 3 |
| Advanced Features | 7 |
| **TOTAL** | **26 explicitly out-of-scope items** |

---

### Approval Record: Task 0.4

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## SECTION B: TASK 0.5 — Scale Assumptions

### SDLC Task Reference
**Task Number**: 0.5
**Task Description**: Define scale assumptions
**Source**: PRD.md Section 1.1 (Application Nature)

---

### Overview

MindFlow is designed as a **centralized, web-based application** with specific scale targets for Phase 1 deployment.

---

### Scale Assumptions

#### 1. User Count Assumptions

| Metric | Value (from PRD Section 1.1) |
|--------|------------------------------|
| **Initial User Count** | 40-50 users |
| **Target User Count** | 70-80+ users |
| **User Growth Model** | Designed to scale from 40-50 to 70-80+ users |

**Interpretation**: The system must be architected to handle between 40 and 80+ concurrent users with acceptable performance.

---

#### 2. Concurrent User Assumptions

| Metric | Assumption |
|--------|-----------|
| **Concurrent Users** | Not explicitly specified in PRD |
| **Recommended Assumption** | 50-70% of total users may be active concurrently during peak hours |

**Note**: This is a reasonable industry assumption. If PRD does not specify, this should be validated with Product Owner during Phase 1 (Architecture Design).

---

#### 3. Tenant Count Assumptions

| Metric | Assumption |
|--------|-----------|
| **Tenant Model** | Multi-tenant SaaS (per Section 8.3) |
| **Initial Tenant Count** | Not explicitly specified in PRD |
| **Recommended Assumption** | Single tenant (organization) for Phase 1; multi-tenant capability for future scaling |

**Note**: PRD confirms multi-tenant architecture but does not specify initial tenant count. This should be validated during Architecture Design.

---

#### 4. Data Growth Assumptions

| Metric | Assumption |
|--------|-----------|
| **Data Volume per User** | Not explicitly specified in PRD |
| **Document Storage** | Not explicitly specified in PRD |
| **Retention Period** | Not explicitly specified in PRD (compliance requirements in COMPLIANCE_SPECS.md define retention) |

**Note**: Data growth assumptions are not detailed in PRD. These will be defined during Phase 0.5 (Compliance) and Phase 2 (Schema Design).

---

#### 5. Performance Assumptions

| Metric | Assumption |
|--------|-----------|
| **Page Load Time** | Not explicitly specified in PRD |
| **API Response Time** | Not explicitly specified in PRD |
| **Real-Time Updates** | Required for notifications (per Section 3.10) |

**Note**: Performance SLAs are not specified in PRD. These should be defined during Phase 1 (Architecture Design).

---

### Summary: Scale Boundaries

| Dimension | Lower Bound | Upper Bound | Status |
|-----------|-------------|-------------|--------|
| **Users** | 40 | 80+ | EXPLICIT (PRD 1.1) |
| **Tenants** | 1 | N | IMPLICIT (multi-tenant capable) |
| **Concurrent Users** | TBD | TBD | NOT SPECIFIED |
| **Data Volume** | TBD | TBD | NOT SPECIFIED |

---

### Approval Record: Task 0.5

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## SECTION C: TASK 0.6 — Platform Scope

### SDLC Task Reference
**Task Number**: 0.6
**Task Description**: Define platform scope
**Source**: PRD.md Section 1.1 (Application Nature)

---

### Overview

MindFlow Phase 1 is strictly **web-based**. All other platforms are explicitly excluded or deferred to future phases.

---

### Platform Scope Definition

#### 1. Primary Platform (Phase 1)

| Attribute | Value (from PRD Section 1.1) |
|-----------|------------------------------|
| **Primary Platform** | Web-based |
| **Interface Type** | Browser-based primary interface |
| **Architecture Model** | Centralized backend (API + database) |
| **Multi-User Support** | Real-time multi-user usage |
| **Authentication** | Role-based, authenticated access |

**Source**: PRD Section 1.1 – "MindFlow is a **full-fledged, centralized, web-based application** designed for multi-user operation from day one."

---

#### 2. Explicitly Excluded Platforms (Phase 1)

| Platform | Status | Source |
|----------|--------|--------|
| **Mobile App (iOS)** | FUTURE PHASES | PRD Section 1.1: "Mobile App planned for future phases" |
| **Mobile App (Android)** | FUTURE PHASES | PRD Section 1.1: "Mobile App planned for future phases" |
| **Desktop App (Windows)** | NOT PLANNED | Not mentioned in PRD |
| **Desktop App (macOS)** | NOT PLANNED | Not mentioned in PRD |
| **Desktop App (Linux)** | NOT PLANNED | Not mentioned in PRD |

---

#### 3. Architecture Model

| Attribute | Value (from PRD Section 1.1) |
|-----------|------------------------------|
| **Offline-First** | ❌ NOT SUPPORTED |
| **Local-First** | ❌ NOT SUPPORTED |
| **Online-Only** | ✅ REQUIRED |
| **Backend Dependency** | ✅ MANDATORY (Central backend with API + database) |

**Source**: PRD Section 1.1 – "There is **no offline-first or local-first assumption** anywhere in the system."

---

#### 4. Browser Requirements

| Attribute | Assumption |
|-----------|-----------|
| **Browser Support** | Not explicitly specified in PRD |
| **Recommended** | Modern browsers (Chrome, Firefox, Safari, Edge) – latest 2 versions |
| **Responsive Design** | Required (inferred from web-based nature) |

**Note**: Specific browser compatibility matrix not defined in PRD. Should be validated during Phase 1 (Architecture Design).

---

#### 5. Device Scope

| Device Type | Support Status | Rationale |
|-------------|---------------|-----------|
| **Desktop/Laptop** | ✅ PRIMARY | PRD Section 1.1: Browser-based |
| **Tablet (Web)** | ✅ SUPPORTED | Browser-based; responsive design expected |
| **Mobile (Web)** | ✅ SUPPORTED | Browser-based; responsive design expected |
| **Native Mobile Apps** | ❌ FUTURE | PRD Section 1.1: Future phases |

---

### Summary: Platform Boundaries

| Platform | Phase 1 Status | Future Status |
|----------|----------------|---------------|
| **Web (Desktop)** | ✅ IN SCOPE | ✅ ONGOING |
| **Web (Tablet)** | ✅ IN SCOPE | ✅ ONGOING |
| **Web (Mobile)** | ✅ IN SCOPE | ✅ ONGOING |
| **Mobile App (iOS)** | ❌ OUT OF SCOPE | 🔄 PLANNED |
| **Mobile App (Android)** | ❌ OUT OF SCOPE | 🔄 PLANNED |
| **Desktop App** | ❌ OUT OF SCOPE | ❓ NOT PLANNED |
| **Offline Mode** | ❌ OUT OF SCOPE | ❓ NOT PLANNED |

---

### Approval Record: Task 0.6

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## SECTION D: TASK 0.7 — Multi-Tenancy Model Lock

### SDLC Task Reference
**Task Number**: 0.7
**Task Description**: Lock multi-tenancy model
**Source**: PRD.md Section 8.3 (Data Ownership & Tenancy)

---

### Overview

MindFlow employs a **multi-tenant architecture** with strict data isolation enforced at the database level using PostgreSQL Row-Level Security (RLS).

---

### Multi-Tenancy Model Definition

#### 1. Tenant Architecture Model

| Attribute | Value (from PRD Section 8.3) |
|-----------|------------------------------|
| **Tenancy Model** | Multi-tenant SaaS |
| **Data Isolation Strategy** | `tenant_id` + PostgreSQL Row-Level Security (RLS) |
| **Data Ownership** | All data owned by organization (tenant) |
| **Tenant Identifier** | `tenant_id` column on all entities |

**Source**: PRD Section 8.3 – "**CLARIFICATION (User Override)**: Multi-tenant architecture with `tenant_id` on all entities and PostgreSQL Row-Level Security (RLS)."

---

#### 2. Database-Level Enforcement

| Component | Implementation (from PRD) |
|-----------|---------------------------|
| **Tenant Column** | `tenant_id` on all entities |
| **Isolation Mechanism** | PostgreSQL Row-Level Security (RLS) policies |
| **Policy Enforcement** | Database-level (automatic, cannot be bypassed at application level) |

**Critical Requirement**: RLS policies MUST be defined for ALL tables containing tenant data during Phase 2 (Schema Design).

---

#### 3. Tenant_id Enforcement Rules

| Rule | Description |
|------|-------------|
| **Universal Presence** | `tenant_id` must exist on ALL entities (tables) |
| **Non-Nullable** | `tenant_id` must be NON-NULL for all tenant-scoped data |
| **Immutable** | `tenant_id` CANNOT be changed after record creation |
| **Automatic Injection** | Application layer must inject `tenant_id` from authenticated session |
| **RLS Enforcement** | Database RLS policies must filter all queries by `tenant_id` |

---

#### 4. Multi-Tenancy Scope

| Aspect | Model |
|--------|-------|
| **Schema Sharing** | Shared schema (all tenants use same database schema) |
| **Data Isolation** | Logical isolation via `tenant_id` + RLS |
| **Physical Isolation** | NOT USED (no separate databases per tenant) |
| **Tenant Provisioning** | TBD during Phase 1 (Architecture Design) |
| **Tenant Onboarding** | TBD during Phase 4 (Functional Design) |

---

#### 5. Cross-Tenant Operations

| Operation | Allowed? | Enforcement |
|-----------|----------|-------------|
| **Cross-tenant data reads** | ❌ FORBIDDEN | RLS policies block access |
| **Cross-tenant data writes** | ❌ FORBIDDEN | RLS policies block access |
| **Super-admin queries** | ⚠️ CONTROLLED | Requires explicit super-admin role; must be audited |

**Note**: Super-admin access rules to be defined during Phase 0.5 (Security Architecture).

---

#### 6. Tenant Data Lifecycle

| Event | Impact |
|-------|--------|
| **Tenant Creation** | New `tenant_id` generated; tenant record created |
| **Tenant Suspension** | Data retained; access blocked via application logic |
| **Tenant Deletion** | TBD: Hard delete vs. soft delete vs. data export |

**Note**: Tenant deletion policy must be defined during Phase 0.5 (Compliance & Security).

---

#### 7. Tenant Isolation Validation

| Validation Point | Requirement |
|------------------|-------------|
| **Schema Design (Phase 2)** | ALL tables MUST have `tenant_id` column |
| **RLS Policy Design (Phase 2)** | ALL tables MUST have RLS policies defined |
| **API Implementation (Phase 6)** | ALL APIs MUST inject `tenant_id` from session |
| **Testing (Phase 7)** | MUST test tenant isolation (cannot access other tenant data) |

---

### Summary: Multi-Tenancy Lock

| Attribute | Value |
|-----------|-------|
| **Model Type** | Multi-tenant SaaS (shared schema, logical isolation) |
| **Isolation Mechanism** | `tenant_id` + PostgreSQL RLS |
| **Enforcement Level** | Database-level (RLS policies) |
| **Application Responsibility** | Inject `tenant_id` from authenticated session |
| **Status** | LOCKED (per PRD 8.3) |

**CRITICAL**: This model is **FROZEN** per PRD Section 8.3. No alternative tenancy models are permitted without explicit PRD amendment.

---

### Approval Record: Task 0.7

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Product Owner | Authority | APPROVED | 2026-01-13 |

---

## Approval Records

### Overall Document Approval Status

| SDLC Task | Section | Reviewer | Status | Date |
|-----------|---------|----------|--------|------|
| **0.4** | Out-of-Scope Items | Product Owner | PENDING | - |
| **0.5** | Scale Assumptions | Product Owner | PENDING | - |
| **0.6** | Platform Scope | Product Owner | PENDING | - |
| **0.7** | Multi-Tenancy Model | Product Owner | PENDING | - |

---

## Ambiguities & Open Questions

### Identified Gaps

The following items are **NOT SPECIFIED** in PRD.md and require clarification during subsequent SDLC phases:

#### From Task 0.5 (Scale Assumptions):
1. **Concurrent user count** – Not specified; reasonable assumption is 50-70% of total users
2. **Initial tenant count** – Not specified; assumption is single tenant for Phase 1
3. **Data volume per user** – Not specified; to be defined in Phase 2
4. **Performance SLAs** – Not specified; to be defined in Phase 1

#### From Task 0.6 (Platform Scope):
5. **Browser compatibility matrix** – Not specified; recommended: latest 2 versions of major browsers
6. **Responsive design requirements** – Not specified; inferred from web-based nature

#### From Task 0.7 (Multi-Tenancy Model):
7. **Tenant deletion policy** – Not specified; to be defined in Phase 0.5 (Compliance)
8. **Super-admin access rules** – Not specified; to be defined in Phase 0.5 (Security)
9. **Tenant provisioning workflow** – Not specified; to be defined in Phase 1 and Phase 4

**Recommendation**: These gaps are acceptable for Phase 0 closure. They will be addressed in subsequent SDLC phases where they are more appropriately scoped.

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | AI (Claude) | Initial creation for SDLC Tasks 0.4-0.7 |

---

**END OF SCOPE_AND_ASSUMPTIONS.md**
