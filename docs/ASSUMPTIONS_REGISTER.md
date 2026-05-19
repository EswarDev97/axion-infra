# MindFlow – Assumptions Register

> **Purpose**: Comprehensive catalog of all assumptions made during Phase 0 that require validation in subsequent SDLC phases.
> **Source**: Extracted from [PRD.md](PRD.md), [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md), and all Phase 0 documents
> **SDLC Reference**: Phase 0, Task 0.11
> **Status**: APPROVED
> **Last Updated**: 2026-01-13

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0 – Product Intent & Context Lock |
| **SDLC Task** | 0.11 – Produce Locked Assumptions Register |
| **Authority** | Subordinate to [PRD.md](PRD.md) |
| **Approval Status** | PENDING |

---

## Introduction

### Purpose of This Register

An **assumptions register** is a critical project artifact that:

1. **Documents all assumptions** made during requirements and design phases
2. **Tracks validation status** of each assumption
3. **Identifies risks** associated with incorrect assumptions
4. **Assigns ownership** for assumption validation
5. **Prevents misalignment** between stakeholders and technical teams

### Governance

- Assumptions marked as **EXPLICIT** are stated directly in PRD.md
- Assumptions marked as **IMPLICIT** are reasonable inferences from PRD context
- Assumptions marked as **TBD** require validation in specified SDLC phases
- All assumptions MUST be validated before Phase Gate closure

---

## Table of Contents

1. [Scale & Capacity Assumptions](#1-scale--capacity-assumptions)
2. [Platform & Technology Assumptions](#2-platform--technology-assumptions)
3. [Architecture & Design Assumptions](#3-architecture--design-assumptions)
4. [Business & Operational Assumptions](#4-business--operational-assumptions)
5. [Security & Compliance Assumptions](#5-security--compliance-assumptions)
6. [Integration & External Systems Assumptions](#6-integration--external-systems-assumptions)
7. [Performance & Quality Assumptions](#7-performance--quality-assumptions)
8. [Validation Status Summary](#validation-status-summary)

---

## 1. Scale & Capacity Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **SC-001** | Initial user count: 40-50 users | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **SC-002** | Target user count: 70-80+ users | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **SC-003** | Concurrent users: ~50-70% of total | Industry standard | IMPLICIT | ⏳ PENDING | Phase 1 | Medium (affects infrastructure sizing) |
| **SC-004** | Peak concurrent users: ~40-56 users | Derived from SC-003 | IMPLICIT | ⏳ PENDING | Phase 1 | Medium (affects load testing) |
| **SC-005** | Initial tenant count: Single tenant | Not explicit in PRD | IMPLICIT | ⏳ PENDING | Phase 0.5 | Low (multi-tenant capable) |
| **SC-006** | Growth to multiple tenants in future | Multi-tenant arch | IMPLICIT | ⏳ PENDING | Phase 1 | Low (architecture supports it) |
| **SC-007** | Average tasks per user: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (affects database sizing) |
| **SC-008** | Average file storage per user: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (affects MinIO capacity) |
| **SC-009** | Data retention: Varies by category | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | Low (documented) |
| **SC-010** | Database growth: ~10-20% annually | Industry estimate | IMPLICIT | ⏳ PENDING | Phase 1 | Low (capacity planning) |

---

## 2. Platform & Technology Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **PT-001** | Phase 1 is WEB-ONLY | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **PT-002** | Mobile apps planned for future | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **PT-003** | Online-only (no offline mode) | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **PT-004** | Centralized backend mandatory | PRD 1.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **PT-005** | Browser support: Latest 2 versions of Chrome, Firefox, Safari, Edge | Industry standard | IMPLICIT | ⏳ PENDING | Phase 1 | Medium (affects testing scope) |
| **PT-006** | Responsive design required | Web-based nature | IMPLICIT | ⏳ PENDING | Phase 1 | Low (standard practice) |
| **PT-007** | No IE11 support | Modern web stack | IMPLICIT | ⏳ PENDING | Phase 1 | Low (IE deprecated) |
| **PT-008** | JavaScript enabled required | Next.js dependency | IMPLICIT | ⏳ PENDING | Phase 1 | Low (standard for SPAs) |
| **PT-009** | Minimum screen resolution: 1024x768 | Desktop/tablet support | IMPLICIT | ⏳ PENDING | Phase 1 | Low (standard) |
| **PT-010** | SSL/TLS required (HTTPS only) | Security requirement | IMPLICIT | ✅ CONFIRMED | Phase 0.5 | Low (security mandate) |

---

## 3. Architecture & Design Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **AD-001** | Multi-tenant SaaS with shared schema | PRD 8.3 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **AD-002** | tenant_id + PostgreSQL RLS for isolation | PRD 8.3 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **AD-003** | 10 microservices as per TECH_STACK.md | TECH_STACK.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (documented) |
| **AD-004** | Synchronous APIs via Kong Gateway | TECH_STACK.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (documented) |
| **AD-005** | Asynchronous tasks via Redis + Celery | TECH_STACK.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (documented) |
| **AD-006** | Service-to-service auth required | Security requirement | IMPLICIT | ⏳ PENDING | Phase 0.5 | High (security critical) |
| **AD-007** | JWT tokens for authentication | TECH_STACK.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (documented) |
| **AD-008** | Session timeout: TBD | Not specified | TBD | ⏳ PENDING | Phase 0.5 | Medium (security requirement) |
| **AD-009** | API rate limiting required | Kong capability | IMPLICIT | ⏳ PENDING | Phase 1 | Medium (DoS protection) |
| **AD-010** | CORS configured for frontend domain | Web architecture | IMPLICIT | ⏳ PENDING | Phase 1 | Low (standard requirement) |

---

## 4. Business & Operational Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **BO-001** | Single organization (tenant) for Phase 1 | Implicit from PRD | IMPLICIT | ⏳ PENDING | Phase 0.5 | Low (multi-tenant ready) |
| **BO-002** | Training is mandatory | PRD 5.0 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **BO-003** | Exams are compulsory for training completion | PRD 5.6 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **BO-004** | Organizational hierarchy is single-line (one manager per position) | PRD 4.2 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **BO-005** | Leave approvals follow reporting hierarchy | PRD 4.7 | IMPLICIT | ⏳ PENDING | Phase 4 | Low (inferred from hierarchy) |
| **BO-006** | Expense approvals follow hierarchy | PRD 6.3 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **BO-007** | Complaint escalation follows hierarchy | PRD 7.8 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **BO-008** | Working hours: TBD | Not specified | TBD | ⏳ PENDING | Phase 4 | Low (affects SLA calculations) |
| **BO-009** | Working days: Monday-Friday assumed | Standard business | IMPLICIT | ⏳ PENDING | Phase 4 | Low (affects attendance/leave) |
| **BO-010** | Holidays calendar required | Inferred from leave | IMPLICIT | ⏳ PENDING | Phase 2 | Low (HR module requirement) |

---

## 5. Security & Compliance Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **SE-001** | Data localization: India region required | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (compliance requirement) |
| **SE-002** | DPDP Act 2023 applies | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (legal requirement) |
| **SE-003** | CERT-In 2022 reporting required | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (legal requirement) |
| **SE-004** | Audit logs: 180 days online, 7 years archived | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (compliance requirement) |
| **SE-005** | Encryption at rest required for sensitive fields | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (compliance requirement) |
| **SE-006** | Encryption in transit (HTTPS/TLS) required | COMPLIANCE_SPECS.md | EXPLICIT | ✅ CONFIRMED | Phase 0.5 | High (security requirement) |
| **SE-007** | Password policy: TBD | Not specified | TBD | ⏳ PENDING | Phase 0.5 | High (security critical) |
| **SE-008** | MFA (Multi-Factor Auth): Not Phase 1 | Not in PRD | IMPLICIT | ⏳ PENDING | Phase 0.5 | Medium (security enhancement) |
| **SE-009** | IP whitelisting: Not Phase 1 | Not in PRD | IMPLICIT | ⏳ PENDING | Phase 0.5 | Low (optional security) |
| **SE-010** | Penetration testing required before production | Industry best practice | IMPLICIT | ⏳ PENDING | Phase 7 | High (security validation) |

---

## 6. Integration & External Systems Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **IN-001** | No third-party integrations in Phase 1 | SCOPE_AND_ASSUMPTIONS.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly excluded) |
| **IN-002** | Email integration: Future phases | PRD 3.10 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **IN-003** | WhatsApp integration: Future phases | PRD 3.10, 7.1 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **IN-004** | SSO (Single Sign-On): Future phases | SCOPE_AND_ASSUMPTIONS.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly excluded) |
| **IN-005** | Payment gateway: Not required | Payroll is reference-only | IMPLICIT | ✅ CONFIRMED | Phase 0 | Low (no automation) |
| **IN-006** | Biometric integration: Excluded | PRD 4.6 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly excluded) |
| **IN-007** | SMTP server for system emails: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (notifications requirement) |
| **IN-008** | SMS gateway: Not Phase 1 | Not in PRD | IMPLICIT | ⏳ PENDING | Phase 1 | Low (future feature) |
| **IN-009** | Calendar sync (Google/Outlook): Not Phase 1 | Not in PRD | IMPLICIT | ⏳ PENDING | Phase 1 | Low (future feature) |
| **IN-010** | LDAP/AD integration: Not Phase 1 | Not in PRD | IMPLICIT | ⏳ PENDING | Phase 1 | Low (future feature) |

---

## 7. Performance & Quality Assumptions

| ID | Assumption | Source | Type | Validation Status | Phase to Confirm | Risk if Wrong |
|----|------------|--------|------|-------------------|------------------|---------------|
| **PQ-001** | Page load time target: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (user experience) |
| **PQ-002** | API response time target: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (user experience) |
| **PQ-003** | Real-time notifications required | PRD 3.10 | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (explicitly stated) |
| **PQ-004** | WebSocket for notifications | TECH_STACK.md | EXPLICIT | ✅ CONFIRMED | Phase 0 | Low (documented) |
| **PQ-005** | Database query timeout: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Low (performance tuning) |
| **PQ-006** | File upload size limit: TBD | Not specified | TBD | ⏳ PENDING | Phase 1 | Medium (affects MinIO config) |
| **PQ-007** | Pagination required for list APIs | Best practice | IMPLICIT | ⏳ PENDING | Phase 3 | Medium (performance requirement) |
| **PQ-008** | Uptime SLA: TBD | Not specified | TBD | ⏳ PENDING | Phase 8 | Medium (operational requirement) |
| **PQ-009** | Backup frequency: TBD | Not specified | TBD | ⏳ PENDING | Phase 8 | High (disaster recovery) |
| **PQ-010** | RTO/RPO targets: TBD | Not specified | TBD | ⏳ PENDING | Phase 8 | High (disaster recovery) |

---

## Validation Status Summary

### By Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **CONFIRMED** | 32 | 46% |
| ⏳ **PENDING** | 38 | 54% |
| **TOTAL** | 70 | 100% |

### By Risk Level

| Risk Level | Count | Requires Urgent Validation |
|------------|-------|---------------------------|
| **HIGH** | 8 | Phase 0.5, Phase 7 |
| **MEDIUM** | 18 | Phase 1 |
| **LOW** | 44 | Phase 1-4 |

### By Validation Phase

| Phase | Assumptions to Validate | Priority |
|-------|------------------------|----------|
| **Phase 0.5** (Security & Compliance) | 8 | ⚠️ CRITICAL |
| **Phase 1** (Architecture Design) | 18 | 🔴 HIGH |
| **Phase 2** (Schema Design) | 1 | 🟡 MEDIUM |
| **Phase 3** (API Design) | 1 | 🟡 MEDIUM |
| **Phase 4** (Functional Design) | 5 | 🟡 MEDIUM |
| **Phase 7** (Testing) | 1 | 🔴 HIGH |
| **Phase 8** (Deployment & Ops) | 4 | 🔴 HIGH |

---

## High-Risk Assumptions Requiring Immediate Attention

### Critical for Phase 0.5 (Security & Compliance)

| ID | Assumption | Risk if Wrong |
|----|------------|---------------|
| **AD-006** | Service-to-service auth required | Security breach between services |
| **SE-007** | Password policy: TBD | Weak passwords, security risk |
| **SE-010** | Penetration testing required | Production vulnerabilities |

### Critical for Phase 1 (Architecture Design)

| ID | Assumption | Risk if Wrong |
|----|------------|---------------|
| **SC-003** | Concurrent users: ~50-70% of total | Infrastructure under-provisioned |
| **PT-005** | Browser support: Latest 2 versions | Compatibility issues |
| **AD-009** | API rate limiting required | DoS vulnerability |
| **PQ-002** | API response time target: TBD | Poor user experience |
| **PQ-006** | File upload size limit: TBD | MinIO capacity issues |

### Critical for Phase 8 (Deployment)

| ID | Assumption | Risk if Wrong |
|----|------------|---------------|
| **PQ-009** | Backup frequency: TBD | Data loss risk |
| **PQ-010** | RTO/RPO targets: TBD | Disaster recovery failure |

---

## Assumption Validation Checklist

### Phase 0.5 Validation Tasks

- [ ] Define password policy (length, complexity, lockout)
- [ ] Define session timeout duration
- [ ] Define service-to-service authentication mechanism
- [ ] Confirm data localization region (AWS ap-south-1 or equivalent)
- [ ] Define MFA strategy (Phase 1 or future)

### Phase 1 Validation Tasks

- [ ] Confirm concurrent user percentage (load testing basis)
- [ ] Define browser compatibility matrix
- [ ] Define API response time SLAs
- [ ] Define page load time targets
- [ ] Define file upload size limits
- [ ] Confirm SMTP server for system emails
- [ ] Define API rate limiting thresholds
- [ ] Estimate average data per user (DB sizing)
- [ ] Estimate file storage per user (MinIO sizing)

### Phase 8 Validation Tasks

- [ ] Define backup frequency (daily/hourly)
- [ ] Define RTO (Recovery Time Objective)
- [ ] Define RPO (Recovery Point Objective)
- [ ] Define uptime SLA (99.9%, 99.5%, etc.)

---

## Approval Record

| Reviewer | Role | Status | Date | Comments |
|----------|------|--------|------|----------|
| Product Owner | Authority | APPROVED | 2026-01-13 | Assumptions register accepted |
| Technical Lead | Review | PENDING | - | - |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-13 | AI (Claude) | Initial creation for SDLC Task 0.11 |

---

**END OF ASSUMPTIONS_REGISTER.md**
