# MindFlow – Explicit Non-Goals

> **Purpose**: Comprehensive list of features, capabilities, and integrations that are explicitly NOT goals for MindFlow to prevent scope creep and maintain focus.
> **Source**: Extracted from [PRD.md](PRD.md) and [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md)
> **SDLC Reference**: Phase 0, Task 0.12
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Task** | 0.12 – Produce Explicit Non-Goals List |
| **Authority** | Subordinate to [PRD.md](PRD.md) |
| **Approval Status** | PENDING |

---

## Introduction

### Purpose of This Document

This document serves as a **definitive boundary** for what MindFlow **WILL NOT DO**. It exists to:

1. **Prevent scope creep** during design and implementation
2. **Align stakeholder expectations** on what is excluded
3. **Focus development effort** on core operational execution
4. **Provide clear rationale** for exclusions
5. **Document future considerations** (if applicable)

### Philosophy: Execution > Ornamentation

From [PRD.md](PRD.md) Section 1.3:
> **Execution > ornamentation**
> - No ERP bloat
> - No CRM
> - No performance appraisal system
> - No payroll automation
> - No gamification

MindFlow is designed for **operational excellence**, not enterprise feature completeness.

---

## Table of Contents

1. [Phase 1 Exclusions (Future Consideration)](#1-phase-1-exclusions-future-consideration)
2. [Permanent Exclusions (Never Planned)](#2-permanent-exclusions-never-planned)
3. [Platform & Architecture Exclusions](#3-platform--architecture-exclusions)
4. [Technology & Integration Exclusions](#4-technology--integration-exclusions)
5. [HR Module Exclusions](#5-hr-module-exclusions)
6. [Advanced Features Exclusions](#6-advanced-features-exclusions)
7. [Summary & Rationale](#summary--rationale)

---

## 1. Phase 1 Exclusions (Future Consideration)

These features are **NOT in Phase 1** but **MAY BE CONSIDERED** in future phases.

| Non-Goal | Category | Rationale | Future Phase? | Source |
|----------|----------|-----------|---------------|--------|
| **Native Mobile Apps (iOS/Android)** | Platform | Phase 1 is web-only; mobile apps require separate development effort | ✅ Planned for Future | PRD 1.1 |
| **Email Integration for Notifications** | Integration | In-app notifications sufficient for Phase 1; external channels add complexity | ✅ Future | PRD 3.10 |
| **WhatsApp Integration for Notifications** | Integration | In-app notifications sufficient for Phase 1; external channels add complexity | ✅ Future | PRD 3.10 |
| **WhatsApp/Email Complaint Logging** | Integration | Phone and internal logging sufficient for Phase 1 | ✅ Future | PRD 7.1 |
| **Client Communication Automation** | Integration | Manual communication sufficient for Phase 1; notification hooks only | ✅ Future | PRD 7.10 |
| **AI/ML Capabilities** | Technology | Not required for Phase 1 operational execution | ⚠️ TBD | SCOPE_AND_ASSUMPTIONS.md |
| **Advanced Analytics Dashboards** | Reporting | Basic reports sufficient for Phase 1; advanced BI not in PRD | ⚠️ TBD | SCOPE_AND_ASSUMPTIONS.md |
| **SSO (Single Sign-On)** | Authentication | Simple login sufficient for Phase 1; SSO adds integration complexity | ⚠️ TBD | SCOPE_AND_ASSUMPTIONS.md |
| **Custom Domains per Tenant** | Multi-Tenancy | Not required for Phase 1; single domain sufficient | ⚠️ TBD | SCOPE_AND_ASSUMPTIONS.md |
| **Video Conferencing Integration** | Training | Classroom sessions are physical; video not in PRD | ⚠️ TBD | Inferred from PRD 5.2 |

**Total**: 10 items deferred to future phases

---

## 2. Permanent Exclusions (Never Planned)

These capabilities are **EXPLICITLY FORBIDDEN** and will **NEVER BE IMPLEMENTED** in any phase.

| Non-Goal | Category | Rationale | Source |
|----------|----------|-----------|--------|
| **ERP Bloat** | Enterprise System | Focus on execution, not enterprise completeness; explicitly excluded | PRD 1.3 |
| **CRM (Customer Relationship Management)** | Enterprise System | Not a sales/marketing platform; explicitly excluded | PRD 1.3 |
| **Performance Appraisal System** | HR | Not an evaluation platform; focus on execution, not appraisals | PRD 1.3 |
| **Payroll Automation** | HR | Payroll is reference-only; no calculations, no bank integration | PRD 1.3, 4.8 |
| **Gamification** | UI/UX | Focus on execution, not engagement gimmicks; explicitly excluded | PRD 1.3 |
| **Offline-First Architecture** | Architecture | Online-only; no offline sync; explicitly forbidden | PRD 1.1 |
| **Local-First Architecture** | Architecture | Centralized backend mandatory; no local storage of business data | PRD 1.1 |
| **Free-Text Statuses** | Task Management | Enum-based statuses only; free-text not allowed | PRD 3.4 |
| **Payroll Calculations** | HR | Reference data only; no automated calculations | PRD 4.8 |
| **Bank Integration for Payroll** | HR | No automated payouts; manual payment tracking only | PRD 4.8 |

**Total**: 10 items permanently excluded

---

## 3. Platform & Architecture Exclusions

| Non-Goal | Rationale | Phase 1 Status | Source |
|----------|-----------|----------------|--------|
| **Desktop Applications (Windows/macOS/Linux)** | Browser-based interface only; no desktop app development | ❌ NOT PLANNED | PRD 1.1 |
| **Native Mobile Apps (iOS)** | Web-only Phase 1; mobile in future | ⏳ FUTURE | PRD 1.1 |
| **Native Mobile Apps (Android)** | Web-only Phase 1; mobile in future | ⏳ FUTURE | PRD 1.1 |
| **Offline Mode** | Online-only architecture; explicitly forbidden | ❌ FORBIDDEN | PRD 1.1 |
| **Offline Sync** | No offline-first assumption anywhere | ❌ FORBIDDEN | PRD 1.1 |
| **Local Storage of Business Data** | Centralized backend mandatory | ❌ FORBIDDEN | PRD 1.1 |
| **Progressive Web App (PWA) with Offline** | Online-only; no offline capability | ❌ NOT PLANNED | PRD 1.1 |

**Key Constraint**: Phase 1 is **web-only, online-only, centralized architecture**.

---

## 4. Technology & Integration Exclusions

| Non-Goal | Rationale | Phase 1 Status | Source |
|----------|-----------|----------------|--------|
| **Third-Party API Integrations** | Not in PRD for Phase 1 | ⏳ FUTURE | SCOPE_AND_ASSUMPTIONS.md |
| **SSO (Single Sign-On)** | Simple auth sufficient for Phase 1 | ⏳ FUTURE | SCOPE_AND_ASSUMPTIONS.md |
| **LDAP/Active Directory Integration** | Not in PRD for Phase 1 | ⏳ FUTURE | Inferred |
| **Calendar Sync (Google/Outlook)** | Not in PRD for Phase 1 | ⏳ FUTURE | Inferred |
| **External SMTP Email Server (Phase 1)** | In-app notifications sufficient | ⏳ FUTURE | PRD 3.10 |
| **SMS Gateway** | Not in PRD for Phase 1 | ⏳ FUTURE | Inferred |
| **WhatsApp Business API** | Future integration only | ⏳ FUTURE | PRD 3.10, 7.1 |
| **Payment Gateway Integration** | No payroll automation | ❌ NOT NEEDED | PRD 4.8 |
| **Biometric Integration** | Simple attendance only; no biometric | ❌ NOT PLANNED | PRD 4.6 |
| **Geo-Fencing for Attendance** | Not in PRD; simple attendance only | ❌ NOT PLANNED | PRD 4.6 |

**Key Constraint**: Phase 1 is **self-contained with no external integrations**.

---

## 5. HR Module Exclusions

| Non-Goal | Rationale | Status | Source |
|----------|-----------|--------|--------|
| **Full ATS (Applicant Tracking System)** | Basic candidate tracking only; not recruitment analytics | ❌ NOT PLANNED | PRD 4.3 |
| **Complex Leave Policies** | Simple leave management only; no policy engine | ❌ NOT PLANNED | PRD 4.7 |
| **Biometric Attendance** | Simple Present/Absent only; no biometric | ❌ NOT PLANNED | PRD 4.6 |
| **Geo-Fencing for Attendance** | Simple attendance tracking; no location tracking | ❌ NOT PLANNED | PRD 4.6 |
| **Payroll Automation** | Reference-only; no calculations | ❌ FORBIDDEN | PRD 1.3, 4.8 |
| **Payroll Calculations** | Manual payroll; no automated calculations | ❌ FORBIDDEN | PRD 4.8 |
| **Bank Integration for Payroll** | No automated bank transfers | ❌ FORBIDDEN | PRD 4.8 |
| **Performance Appraisals** | Not an evaluation platform | ❌ FORBIDDEN | PRD 1.3 |
| **360-Degree Feedback** | Not in PRD; focus on execution | ❌ NOT PLANNED | Inferred |
| **Employee Self-Service Portal** | Not explicitly in PRD (basic access via web app) | ⚠️ PARTIAL | Inferred |

**Key Constraint**: HR module is **organizational structure + basic tracking**, not full HRMS.

---

## 6. Advanced Features Exclusions

| Non-Goal | Rationale | Status | Source |
|----------|-----------|--------|--------|
| **AI/ML Capabilities** | Not in PRD for Phase 1 | ⏳ FUTURE | SCOPE_AND_ASSUMPTIONS.md |
| **Predictive Analytics** | Not in PRD; basic reporting only | ⏳ FUTURE | Inferred |
| **Advanced Dashboards (BI)** | Basic reports sufficient for Phase 1 | ⏳ FUTURE | SCOPE_AND_ASSUMPTIONS.md |
| **Custom Reporting Builder** | Predefined reports only | ⏳ FUTURE | Inferred |
| **Workflow Automation Engine (Low-Code)** | Not in PRD; specific workflows only | ❌ NOT PLANNED | Inferred |
| **Custom Forms Builder** | Not in PRD; predefined forms only | ❌ NOT PLANNED | Inferred |
| **Advanced Search (Elasticsearch)** | Database search sufficient for Phase 1 | ⏳ FUTURE | CROSS_CUTTING_AND_RULES.md |
| **Real-Time Collaboration (Multiplayer Editing)** | Not in PRD; comments/attachments sufficient | ❌ NOT PLANNED | Inferred |
| **Version Control for Documents** | Not in PRD; file uploads only | ⏳ FUTURE | Inferred |
| **Audit Trail Playback/Replay** | Audit logs stored; no UI replay in Phase 1 | ⏳ FUTURE | Inferred |

**Key Constraint**: Phase 1 focuses on **core execution**, not advanced enterprise features.

---

## Summary & Rationale

### Non-Goals by Category

| Category | Phase 1 Exclusions (Future) | Permanent Exclusions | Total |
|----------|----------------------------|---------------------|-------|
| **Platform & Architecture** | 3 (mobile apps) | 4 (offline, local-first) | 7 |
| **Technology & Integration** | 7 (SSO, email, SMS, etc.) | 3 (payment, biometric, geo-fence) | 10 |
| **HR Module** | 0 | 10 (ATS, payroll, appraisals) | 10 |
| **Enterprise Systems** | 0 | 3 (ERP, CRM, appraisals) | 3 |
| **Advanced Features** | 6 (AI/ML, analytics, BI) | 4 (workflow engine, forms builder) | 10 |
| **Task Management** | 0 | 2 (gamification, free-text status) | 2 |
| **Training Module** | 1 (video conferencing) | 1 (e-learning platform features) | 2 |
| **Complaints Module** | 2 (client comms, external logging) | 0 | 2 |
| **TOTAL** | **19** | **27** | **46** |

---

### Rationale by Theme

#### Theme 1: Execution > Ornamentation
**Exclusions**: ERP, CRM, Performance Appraisals, Gamification
**Rationale**: MindFlow focuses on operational execution, not enterprise completeness or engagement gimmicks.

#### Theme 2: Web-Only, Online-Only Phase 1
**Exclusions**: Mobile apps, Desktop apps, Offline mode, Local storage
**Rationale**: Phase 1 is deliberately scoped for web-based, centralized architecture. Mobile apps planned for future.

#### Theme 3: No External Integrations Phase 1
**Exclusions**: SSO, LDAP, Email, SMS, WhatsApp, Calendar sync, Payment gateways
**Rationale**: Self-contained system for Phase 1; integrations add complexity and dependencies.

#### Theme 4: Simple, Not Enterprise-Grade HR
**Exclusions**: Full ATS, Complex leave policies, Payroll automation, Biometric, Geo-fencing
**Rationale**: HR module provides organizational structure and basic tracking, not full HRMS capabilities.

#### Theme 5: Basic Reporting, Not Advanced BI
**Exclusions**: Advanced dashboards, Predictive analytics, Custom reporting builder
**Rationale**: Predefined reports sufficient for Phase 1 operational needs.

---

### Future vs. Permanent Exclusions

| Status | Count | Decision Criteria |
|--------|-------|-------------------|
| **⏳ Future Phases (Possible)** | 19 | May be added based on operational needs and ROI |
| **❌ Permanently Excluded** | 27 | Explicitly forbidden by PRD or violate core design principles |
| **TOTAL** | **46** | - |

---

### Decision Framework: "Should We Add Feature X?"

Use this decision tree:

```
                    ┌────────────────────┐
                    │ Is Feature X in    │
                    │ PRD.md explicitly? │
                    └─────────┬──────────┘
                              │
                 ┌────────────┴────────────┐
                 ▼ YES                     ▼ NO
         ┌───────────────┐         ┌──────────────────┐
         │  IMPLEMENT    │         │ Is it in         │
         │  per PRD      │         │ NON_GOALS.md?    │
         └───────────────┘         └─────────┬────────┘
                                             │
                                ┌────────────┴────────────┐
                                ▼ YES                     ▼ NO
                        ┌──────────────┐         ┌──────────────────┐
                        │  REJECT      │         │ Does it violate  │
                        │  (Non-Goal)  │         │ "Execution >     │
                        └──────────────┘         │ Ornamentation"?  │
                                                 └─────────┬────────┘
                                                           │
                                              ┌────────────┴────────────┐
                                              ▼ YES                     ▼ NO
                                      ┌──────────────┐         ┌──────────────────┐
                                      │  REJECT      │         │ Propose PRD      │
                                      │  (Violates   │         │ Amendment with   │
                                      │  Principle)  │         │ clear rationale  │
                                      └──────────────┘         └──────────────────┘
```

---

## Approval Record

| Reviewer | Role | Status | Date | Comments |
|----------|------|--------|------|----------|
| Product Owner | Authority | APPROVED | 2026-01-13 | Non-goals list accepted |
| Technical Lead | Review | PENDING | - | - |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | AI (Claude) | Initial creation for SDLC Task 0.12 |

---

**END OF NON_GOALS.md**
