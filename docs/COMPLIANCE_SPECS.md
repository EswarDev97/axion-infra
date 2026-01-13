# MindFlow – Compliance Technical Specifications

> **Purpose**: This document translates India's Digital Personal Data Protection Act 2023 (DPDP Act) and CERT-In 2022 Directions into actionable technical requirements for MindFlow.
> **Scope**: Phase 1 (Web-only), Multi-tenant SaaS
> **Authority**: This document is a binding constraint for Phase 2 (Schema Design) and all subsequent phases.
> **SDLC Reference**: Phase 0.5 – Security, Compliance & Secure SDLC Foundation

---

## 1. Applicable Regulations

| Regulation | Relevance to MindFlow |
|------------|----------------------|
| **DPDP Act 2023** | MindFlow processes personal data of employees, users, and potentially customers. All data principals have enforceable rights. |
| **IT Act 2000** | Establishes legal framework for electronic records and cyber offenses. |
| **IT Rules 2011** | Reasonable security practices for sensitive personal data. |
| **CERT-In Directions 2022** | Mandatory incident reporting within 6 hours; log retention requirements. |

---

## 2. Data Principal Rights – Technical Implementation

### 2.1 Right to Access (Section 11, DPDP Act)

**Requirement**: Data principals must be able to obtain a summary of their personal data and processing activities.

**Technical Implementation**:

| Requirement | Implementation |
|-------------|----------------|
| Data Export | Each service must expose an API endpoint: `GET /api/v1/users/{user_id}/data-export` |
| Format | JSON export with human-readable structure |
| Scope | All personal data owned by the requesting user across all services |
| Audit | Every data export request must be logged in `audit_logs` |
| Response Time | Export must be generated within 72 hours (async job via Celery) |

**Schema Constraint**:
- All tables containing personal data must have a `user_id` or `employee_id` foreign key to enable filtering.
- A `personal_data_registry` table must catalog which tables/columns contain personal data.

---

### 2.2 Right to Correction (Section 12, DPDP Act)

**Requirement**: Data principals can request correction of inaccurate or incomplete personal data.

**Technical Implementation**:

| Requirement | Implementation |
|-------------|----------------|
| Correction Request API | `POST /api/v1/users/{user_id}/correction-requests` |
| Request Tracking | All correction requests stored in `data_correction_requests` table |
| Workflow | Requests routed to HR Admin or Tenant Admin for review |
| Propagation | Corrections must propagate to all derived/cached copies |
| Audit Trail | Original value, new value, timestamp, and approver logged |

**Schema Constraint**:
```
Table: data_correction_requests
- id: UUID (PK)
- tenant_id: UUID (FK, RLS)
- user_id: UUID (FK)
- field_name: VARCHAR(255)
- current_value: TEXT
- requested_value: TEXT
- status: ENUM('pending', 'approved', 'rejected')
- reviewed_by: UUID (FK, nullable)
- reviewed_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

### 2.3 Right to Erasure (Section 12, DPDP Act)

**Requirement**: Data principals can request deletion of their personal data when consent is withdrawn or data is no longer necessary.

**Technical Implementation**:

| Requirement | Implementation |
|-------------|----------------|
| Erasure Request API | `POST /api/v1/users/{user_id}/erasure-requests` |
| Soft Delete First | Personal data marked as `is_deleted = true`, `deleted_at = TIMESTAMP` |
| Hard Delete | Permanent deletion after retention period expires (configurable per data category) |
| Exceptions | Data required for legal obligations, ongoing disputes, or audit trails excluded from erasure |
| Cascading | Erasure must cascade to all services holding the user's personal data |
| Anonymization | Where full deletion is not possible, data must be anonymized (PII replaced with hashes) |

**Schema Constraint**:
- All tables with personal data must include:
  - `is_deleted: BOOLEAN DEFAULT FALSE`
  - `deleted_at: TIMESTAMP NULL`
  - `deletion_reason: VARCHAR(255) NULL`
- A `data_erasure_requests` table must track all erasure requests.

```
Table: data_erasure_requests
- id: UUID (PK)
- tenant_id: UUID (FK, RLS)
- user_id: UUID (FK)
- request_type: ENUM('full_erasure', 'partial_erasure', 'anonymization')
- status: ENUM('pending', 'in_progress', 'completed', 'rejected')
- rejection_reason: TEXT (nullable)
- affected_tables: JSONB
- processed_by: UUID (FK, nullable)
- processed_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Erasure Execution**:
- Celery task: `execute_data_erasure(erasure_request_id)`
- Must generate erasure certificate upon completion
- Must notify data principal upon completion

---

### 2.4 Right to Grievance Redressal (Section 13, DPDP Act)

**Requirement**: Data principals must have a mechanism to raise grievances about data processing.

**Technical Implementation**:
- Leverage existing `complaint-service` with a dedicated category: `DATA_PRIVACY`
- SLA: Response within 7 days, resolution within 30 days
- Escalation to Data Protection Officer (DPO) role if unresolved

---

## 3. Consent Management

### 3.1 Lawful Basis Recording

**Requirement**: Every piece of personal data must have a documented lawful basis for processing.

**Lawful Bases under DPDP Act**:

| Basis Code | Description |
|------------|-------------|
| `CONSENT` | Explicit consent obtained from data principal |
| `EMPLOYMENT` | Necessary for employment contract performance |
| `LEGAL_OBLIGATION` | Required by law (tax, labor regulations) |
| `LEGITIMATE_INTEREST` | Legitimate interest of the data fiduciary (with safeguards) |
| `VITAL_INTEREST` | Protect vital interests of data principal |

**Technical Implementation**:

```
Table: consent_records
- id: UUID (PK)
- tenant_id: UUID (FK, RLS)
- user_id: UUID (FK)
- data_category: VARCHAR(100)
- lawful_basis: ENUM('consent', 'employment', 'legal_obligation', 'legitimate_interest', 'vital_interest')
- purpose: TEXT
- consent_given_at: TIMESTAMP (nullable, for consent basis)
- consent_method: VARCHAR(100) (nullable, e.g., 'web_form', 'employee_onboarding')
- consent_version: VARCHAR(50)
- is_active: BOOLEAN DEFAULT TRUE
- withdrawn_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Schema Constraint**:
- Personal data collection points must record consent before storing data.
- Consent withdrawal must trigger review of data retention necessity.

---

### 3.2 Consent Versioning

**Requirement**: Consent terms may change; the system must track which version of consent the user agreed to.

**Technical Implementation**:
- `consent_versions` table stores all versions of consent text.
- `consent_records.consent_version` references the specific version.
- Users must re-consent when material changes occur.

```
Table: consent_versions
- id: UUID (PK)
- tenant_id: UUID (FK, RLS)
- version: VARCHAR(50)
- purpose_category: VARCHAR(100)
- consent_text: TEXT
- effective_from: TIMESTAMP
- effective_until: TIMESTAMP (nullable)
- created_at: TIMESTAMP
```

---

## 4. Data Classification

### 4.1 Classification Levels

| Level | Description | Examples in MindFlow | Handling Requirements |
|-------|-------------|---------------------|----------------------|
| **Public** | No confidentiality requirement | Company name, public job titles | No restrictions |
| **Internal** | Internal use only | Department names, project names | Access limited to authenticated users |
| **Confidential** | Sensitive business data | Salary data, performance notes, expense amounts | Role-based access, audit logging |
| **Restricted** | Highly sensitive / PII | Aadhaar, PAN, bank details, health data | Encryption at rest, masking in logs, strict access control |

### 4.2 Personal Data Categories in MindFlow

| Data Category | Classification | Service Owner | Retention Period |
|---------------|---------------|---------------|------------------|
| Employee Name | Confidential | hr-service | Employment + 7 years |
| Employee Email | Confidential | auth-service | Employment + 7 years |
| Employee Phone | Confidential | hr-service | Employment + 7 years |
| Aadhaar Number | Restricted | hr-service | Employment + 7 years |
| PAN Number | Restricted | hr-service | Employment + 7 years |
| Bank Account Details | Restricted | hr-service | Employment + 7 years |
| Salary Information | Restricted | hr-service | Employment + 7 years |
| Attendance Records | Confidential | hr-service | 3 years |
| Leave Records | Confidential | hr-service | 3 years |
| Task Assignments | Internal | task-service | 5 years |
| Expense Receipts | Confidential | expense-service | 7 years |
| Complaint Details | Confidential | complaint-service | 5 years |
| Training Records | Internal | training-service | 5 years |
| Uploaded Files | Varies | storage-service | Per file category |

**Schema Constraint**:
- A `data_classification_registry` must exist documenting all tables/columns with their classification level.

---

## 5. Data Retention

### 5.1 Retention Rules

| Data Category | Minimum Retention | Maximum Retention | Deletion Trigger |
|---------------|-------------------|-------------------|------------------|
| Employment Records | 7 years post-termination | 10 years | Automatic after max retention |
| Financial Records | 7 years | 10 years | Automatic after max retention |
| Attendance/Leave | 3 years | 5 years | Automatic after max retention |
| Task Data | 3 years post-completion | 5 years | Automatic after max retention |
| Audit Logs | 180 days online | 7 years archived | Never deleted |
| Security Logs | 180 days online | 7 years archived | Never deleted |
| Consent Records | Duration of consent + 7 years | Indefinite | Never deleted |

### 5.2 Technical Implementation

- Celery scheduled task: `enforce_data_retention()` runs daily.
- Records past retention period are soft-deleted, then hard-deleted after grace period.
- Audit logs and consent records are exempt from deletion.

---

## 6. Data Localization

### 6.1 Requirement

Under DPDP Act 2023 and potential future data localization rules, personal data of Indian residents should be stored within India unless explicitly permitted otherwise.

### 6.2 Technical Implementation

| Component | Localization Requirement |
|-----------|-------------------------|
| PostgreSQL | Must be hosted in India region (AWS ap-south-1, Azure Central India, or on-premise in India) |
| Redis | Must be hosted in India region |
| MinIO | Must be hosted in India region; S3 buckets must be in ap-south-1 |
| Backups | Must be stored in India region |
| CDN | Origin servers must be in India; edge caching permitted globally |
| Logs | Must be stored in India region |

### 6.3 Configuration Constraint

```yaml
# docker-compose.prod.yml constraint
# All infrastructure must specify India region

# AWS Example
AWS_REGION: ap-south-1
S3_BUCKET_REGION: ap-south-1

# MinIO must be deployed on India-based infrastructure
MINIO_REGION: ap-south-1
```

**Deployment Constraint**:
- Production deployment documentation must verify India-region hosting.
- Cloud provider region must be validated before production release.

---

## 7. CERT-In 2022 – Incident Reporting Requirements

### 7.1 Reportable Incidents

Per CERT-In Directions 2022, the following must be reported within **6 hours**:

| Incident Type | MindFlow Relevance |
|---------------|-------------------|
| Targeted scanning/probing of critical systems | API Gateway, auth-service |
| Compromise of critical systems | Any service breach |
| Unauthorized access to IT systems | Failed/successful unauthorized logins |
| Defacement of websites | Frontend compromise |
| Malicious code attacks | Malware in uploaded files |
| Attacks on servers and network infrastructure | DDoS, infrastructure attacks |
| Identity theft, spoofing, phishing | Account takeover attempts |
| Data breaches | Any PII exposure |
| Data leaks | Unauthorized data access |

### 7.2 Technical Requirements for 6-Hour Reporting

**Logging Requirements**:

| Log Type | Retention (Online) | Retention (Archive) | Content |
|----------|-------------------|---------------------|---------|
| Access Logs | 180 days | 7 years | IP, timestamp, user, endpoint, response code |
| Authentication Logs | 180 days | 7 years | Login attempts, success/failure, IP, device |
| Admin Action Logs | 180 days | 7 years | Admin user, action, target, timestamp |
| Security Event Logs | 180 days | 7 years | Anomalies, blocked requests, rate limits |
| Error Logs | 90 days | 2 years | Stack traces, error codes |

**Schema Constraint**:

```
Table: security_incidents
- id: UUID (PK)
- tenant_id: UUID (FK, RLS, nullable for platform-level incidents)
- incident_type: ENUM('unauthorized_access', 'data_breach', 'malware', 'ddos', 'phishing', 'other')
- severity: ENUM('critical', 'high', 'medium', 'low')
- detected_at: TIMESTAMP
- reported_to_cert_in: BOOLEAN DEFAULT FALSE
- cert_in_reported_at: TIMESTAMP (nullable)
- cert_in_reference_id: VARCHAR(100) (nullable)
- description: TEXT
- affected_systems: JSONB
- affected_users_count: INTEGER
- containment_actions: TEXT
- root_cause: TEXT (nullable)
- resolution: TEXT (nullable)
- resolved_at: TIMESTAMP (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 7.3 Instant Availability Requirements

For 6-hour reporting, the following must be queryable within minutes:

| Data Point | Source | Query Capability |
|------------|--------|------------------|
| Affected IP addresses | Access logs | Indexed, searchable |
| Affected user accounts | Auth logs | Indexed, searchable |
| Timeline of events | All logs | Time-range queries |
| Affected data categories | Data classification registry | Instant lookup |
| Affected tenant(s) | All logs | Filtered by tenant_id |

**Technical Implementation**:
- ELK stack (or equivalent) must index all security-relevant logs.
- Alerting thresholds must trigger immediate notification to security team.
- Pre-built queries for CERT-In report fields must exist.

### 7.4 Log Synchronization

**Requirement**: All servers must maintain synchronized clocks.

**Implementation**:
- NTP synchronization mandatory for all containers.
- Timestamp format: ISO 8601 with timezone (UTC preferred).
- Log correlation IDs must span services for request tracing.

---

## 8. Sensitive Field Handling

### 8.1 Fields Requiring Encryption at Rest

| Field | Table | Encryption Method |
|-------|-------|-------------------|
| Aadhaar Number | employees | AES-256, application-level |
| PAN Number | employees | AES-256, application-level |
| Bank Account Number | employees | AES-256, application-level |
| Bank IFSC | employees | AES-256, application-level |

### 8.2 Fields Requiring Log Redaction

These fields must NEVER appear in plaintext in logs:

- Passwords (must never be logged, even hashed)
- Aadhaar Number
- PAN Number
- Bank Account Details
- JWT Tokens (log only last 8 characters)
- API Keys

**Implementation**:
- Structured logging with automatic redaction patterns.
- Log sanitization middleware in all services.

### 8.3 Fields Requiring UI Masking

| Field | Display Format |
|-------|---------------|
| Aadhaar | XXXX-XXXX-1234 (last 4 visible) |
| PAN | XXXXX1234X (middle 4 visible) |
| Bank Account | XXXXXXXX1234 (last 4 visible) |
| Phone | +91-XXXXX-12345 (last 5 visible) |

---

## 9. Implementation Checklist

This section maps compliance requirements to SDLC phases.

### Phase 2 (Schema Design) Requirements

- [ ] All personal data tables include soft-delete columns
- [ ] `consent_records` table exists
- [ ] `consent_versions` table exists
- [ ] `data_correction_requests` table exists
- [ ] `data_erasure_requests` table exists
- [ ] `security_incidents` table exists
- [ ] `personal_data_registry` table exists
- [ ] `data_classification_registry` table exists
- [ ] All PII fields identified and marked for encryption
- [ ] Audit logging columns on all sensitive tables

### Phase 3 (API Design) Requirements

- [ ] Data export endpoint defined
- [ ] Correction request endpoint defined
- [ ] Erasure request endpoint defined
- [ ] Consent management endpoints defined

### Phase 6 (Implementation) Requirements

- [ ] Application-level encryption for restricted fields
- [ ] Log redaction middleware implemented
- [ ] Consent validation before data collection
- [ ] Retention enforcement Celery tasks

### Phase 8 (Deployment) Requirements

- [ ] India-region hosting verified
- [ ] NTP synchronization configured
- [ ] ELK stack deployed with required indexes
- [ ] CERT-In report templates prepared
- [ ] Incident response runbook completed

---

## 10. References

| Document | Description |
|----------|-------------|
| [DPDP Act 2023](https://www.meity.gov.in/data-protection-framework) | Digital Personal Data Protection Act, 2023 |
| [CERT-In Directions 2022](https://www.cert-in.org.in/) | Cyber Security Directions, April 2022 |
| [IT Act 2000](https://www.meity.gov.in/content/information-technology-act) | Information Technology Act, 2000 |
| [SDLC.md](SDLC.md) | MindFlow SDLC |
| [TECH_STACK.md](TECH_STACK.md) | Technology Stack |

---

**Document Status**: ACTIVE
**SDLC Phase**: 0.5 – Security, Compliance & Secure SDLC Foundation
**Last Updated**: 2026-01-13

---

**END OF COMPLIANCE SPECIFICATIONS**
