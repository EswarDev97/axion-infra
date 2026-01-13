# MindFlow – Full SDLC (Granular, Trackable Checklist)

> **Purpose**: This document defines a complete, security-first, compliance-aware Software Development Life Cycle (SDLC) for the MindFlow platform.  
> Each phase contains **numbered, trackable activities**. A phase is considered **CLOSED only when all items are completed and formally approved**.

---

## 🔵 PHASE 0 — PRODUCT INTENT & CONTEXT LOCK

### Objective
Remove ambiguity before any design or implementation begins.

### Tasks
0.1 Collect final, approved PRD (no drafts).  
0.2 Collect final, approved Tech Stack Lock document.  
0.3 Identify and document in-scope modules.  
0.4 Identify and document explicit out-of-scope items.  
0.5 Define scale assumptions (users per tenant, tenants, data growth).  
0.6 Define platform scope (Web Phase 1, Mobile future phases).  
0.7 Lock multi-tenancy model (tenant_id, RLS).  
0.8 Identify cross-cutting concerns (audit, approvals, notifications, storage).  
0.9 Document non-negotiable architectural rules.  
0.10 Produce **System Understanding Summary**.  
0.11 Produce **Locked Assumptions Register**.  
0.12 Produce **Explicit Non-Goals List**.  
0.13 Obtain formal sign-off.

### Outputs
- System Understanding Summary  
- Locked Assumptions Register  
- Non-Goals Document

### Gate
❌ No security or architecture work before Phase 0 is closed.

---

## 🔐 PHASE 0.5 — SECURITY, COMPLIANCE & SECURE SDLC FOUNDATION (MANDATORY)

### Objective
Embed security, privacy, compliance, and governance **before schemas or APIs are designed**.

---

### 1️⃣ Regulatory & Legal Compliance (India)

0.5.1 Identify applicable regulations (IT Act 2000, IT Rules 2011, DPDP Act 2023, CERT-In 2022).  
0.5.2 Identify all personal and sensitive data categories handled.  
0.5.3 Classify data into Public / Internal / Confidential / Restricted.  
0.5.4 Define data retention rules per category.  
0.5.5 Define data access, correction, and erasure rules.  
0.5.6 Define lawful purpose and usage boundaries.  
0.5.7 Produce **Compliance Mapping Document**.

---

### 2️⃣ Security Architecture Design

0.5.8 Define zero-trust assumptions.  
0.5.9 Define authentication model (JWT claims, expiry, rotation).  
0.5.10 Define authorization model (RBAC + hierarchy).  
0.5.11 Define password policy (length, complexity, lockout).  
0.5.12 Define session invalidation rules.  
0.5.13 Define admin privilege boundaries.  
0.5.14 Produce **Security Architecture Document**.

---

### 3️⃣ Data Security & Privacy Controls

0.5.15 Define encryption-at-rest strategy (DB, backups, MinIO).  
0.5.16 Define encryption-in-transit requirements (HTTPS, WSS, TLS).  
0.5.17 Identify sensitive fields requiring masking or redaction.  
0.5.18 Define logging redaction rules.  
0.5.19 Define file upload security rules (type, size, access).  
0.5.20 Produce **Data Protection & Privacy Design**.

---

### 4️⃣ Threat Modeling (STRIDE)

0.5.21 Identify spoofing threats.  
0.5.22 Identify tampering threats.  
0.5.23 Identify repudiation risks.  
0.5.24 Identify information disclosure risks.  
0.5.25 Identify denial-of-service risks.  
0.5.26 Identify privilege escalation paths.  
0.5.27 Map threats to mitigations.  
0.5.28 Produce **Threat Model & Risk Register**.

---

### 5️⃣ Secure SDLC Governance

0.5.29 Define who can change organizational hierarchy.  
0.5.30 Define who can change approval workflows.  
0.5.31 Define who can change SLA rules.  
0.5.32 Define configuration change audit rules.  
0.5.33 Define environment separation (Dev / Stage / Prod).  
0.5.34 Define secrets management and rotation policy.  
0.5.35 Produce **Secure SDLC & Change Control Policy**.

---

### 6️⃣ Operational Security & Incident Response

0.5.36 Define required log types (access, admin, failures).  
0.5.37 Define log retention durations (minimum 180 days online).  
0.5.38 Define alerting thresholds.  
0.5.39 Define incident severity levels.  
0.5.40 Define incident response steps (detect, contain, eradicate, report).  
0.5.41 Define CERT-In reporting readiness.  
0.5.42 Produce **Logging & Incident Response Plan**.

### Phase 0.5 Outputs
- Security Architecture Document  
- Compliance Mapping  
- Threat Model & Risk Register  
- Secure SDLC Policy  
- Incident Response Plan

### Gate
❌ No database schemas before Phase 0.5 is closed.

---

## 🏗️ PHASE 1 — SYSTEM ARCHITECTURE DESIGN

### Tasks
1.1 Identify all backend services.  
1.2 Define responsibility boundaries per service.  
1.3 Define entity ownership per service.  
1.4 Define cross-cutting service placement.  
1.5 Define service communication patterns.  
1.6 Define sync vs async interactions.  
1.7 Define API gateway responsibilities.  
1.8 Define multi-tenancy enforcement flow.  
1.9 Assign development ports.  
1.10 Produce **Architecture Design Document**.

### Gate
❌ No schema design before Phase 1 closure.

---

## 🗄️ PHASE 2 — DOMAIN & DATABASE SCHEMA DESIGN

(Executed one service at a time)

2.1 Identify entities per service.  
2.2 Define table structures and columns.  
2.3 Define UUID primary keys.  
2.4 Define enums.  
2.5 Define indexes and constraints.  
2.6 Define RLS policies.  
2.7 Define audit logging points.  
2.8 Review schemas against security requirements.  
2.9 Approve schema per service.

### Gate
❌ No APIs before Phase 2 closure.

---

## 🔌 PHASE 3 — API CONTRACT & INTEGRATION DESIGN

3.1 Define endpoints per service.  
3.2 Define request schemas.  
3.3 Define response schemas.  
3.4 Define validation rules.  
3.5 Define authorization checks.  
3.6 Define error handling standards.  
3.7 Review APIs against threat model.  
3.8 Freeze API contracts.

---

## 🧩 PHASE 4 — MODULE-LEVEL FUNCTIONAL DESIGN

4.1 Define workflows per module.  
4.2 Define state machines.  
4.3 Define approval flows.  
4.4 Define escalation rules.  
4.5 Define notification triggers.  
4.6 Define reporting logic.  
4.7 Validate against PRD.  
4.8 Approve module designs.

---

## 🛠️ PHASE 5 — IMPLEMENTATION PLANNING

5.1 Define build sequence.  
5.2 Define service dependency order.  
5.3 Define sprint scope and milestones.  
5.4 Identify implementation risks.  
5.5 Define rollback strategy per feature.  
5.6 Freeze implementation roadmap.

---

## 💻 PHASE 6 — CONTROLLED IMPLEMENTATION

(Repeated per feature)

6.1 Implement schema migrations.  
6.2 Implement data models.  
6.3 Implement APIs.  
6.4 Implement audit hooks.  
6.5 Implement RBAC enforcement.  
6.6 Implement validation and error handling.  
6.7 Conduct code review.  
6.8 Merge only after approval.

---

## 🧪 PHASE 7 — TESTING & QUALITY ASSURANCE

7.1 Write unit tests.  
7.2 Write integration tests.  
7.3 Test RBAC enforcement.  
7.4 Test RLS tenant isolation.  
7.5 Test negative and abuse cases.  
7.6 Perform security testing.  
7.7 Review test coverage.  
7.8 Obtain QA sign-off.

---

## 🚀 PHASE 8 — DEPLOYMENT, OPERATIONS & BCDR

8.1 Configure CI/CD pipelines.  
8.2 Configure secrets and environment variables.  
8.3 Set up monitoring.  
8.4 Set up alerting.  
8.5 Configure backups.  
8.6 Test backup restoration.  
8.7 Define RTO/RPO.  
8.8 Produce operational runbooks.

---

## 📊 PHASE 9 — POST-DEPLOY GOVERNANCE & CONTINUOUS IMPROVEMENT

9.1 Perform periodic access reviews.  
9.2 Review audit logs regularly.  
9.3 Apply security patches.  
9.4 Conduct incident response drills.  
9.5 Execute controlled enhancements.  
9.6 Revalidate compliance periodically.

---

**End of Document**
