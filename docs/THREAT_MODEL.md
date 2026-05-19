# MindFlow Threat Model & Risk Register

## Document Control
| Property | Value |
|----------|-------|
| Document ID | MF-THREAT-MODEL-001 |
| Version | 1.0 |
| Status | DRAFT - Pending Product Owner Approval |
| Created Date | 2026-01-14 |
| Phase Coverage | Phase 0.5 - Group 3 (Tasks 0.5.21-0.5.28) |
| Related Documents | COMPLIANCE_MAPPING.md, SECURITY_ARCHITECTURE.md, DATA_PROTECTION_DESIGN.md, PHASE_0.5_GROUP_2_SUMMARY.md |

## Table of Contents
1. [Introduction](#1-introduction)
2. [System Context](#2-system-context)
3. [Threat Analysis](#3-threat-analysis)
   - [3.1 Spoofing (Task 0.5.21)](#31-spoofing-task-0521)
   - [3.2 Tampering (Task 0.5.22)](#32-tampering-task-0522)
   - [3.3 Repudiation (Task 0.5.23)](#33-repudiation-task-0523)
   - [3.4 Information Disclosure (Task 0.5.24)](#34-information-disclosure-task-0524)
   - [3.5 Denial of Service (Task 0.5.25)](#35-denial-of-service-task-0525)
   - [3.6 Elevation of Privilege (Task 0.5.26)](#36-elevation-of-privilege-task-0526)
4. [Threat-to-Mitigation Mapping (Task 0.5.27)](#4-threat-to-mitigation-mapping-task-0527)
5. [Risk Register (Task 0.5.28)](#5-risk-register-task-0528)
6. [Recommendations](#6-recommendations)
7. [Dependencies](#7-dependencies)
8. [Approval Record](#8-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document provides a comprehensive STRIDE-based threat model for the MindFlow multi-tenant SaaS platform. It identifies specific threats across six categories (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege), maps each threat to existing security controls, and prioritizes risks based on likelihood and impact.

### 1.2 Scope

This threat model covers the MindFlow platform as defined in Phase 0.5 Group 2 documents, including:

- **7 Application Modules**: Mind Mapping, Task Management, HR, Training, Expense, Complaints, System Foundations
- **Authentication & Authorization**: JWT-based authentication, RBAC with hierarchy-based filtering
- **Multi-Tenant Architecture**: PostgreSQL RLS, tenant-isolated buckets, shared infrastructure
- **Data Protection**: AES-256 encryption for RESTRICTED data, TLS 1.2+ for transit
- **File Storage**: MinIO object storage with virus scanning and access controls

### 1.3 STRIDE Methodology

STRIDE is a threat modeling framework developed by Microsoft that categorizes threats into six types:

| Category | Definition | Security Property Violated |
|----------|------------|---------------------------|
| **Spoofing** | Pretending to be someone/something else | Authentication |
| **Tampering** | Modifying data or code | Integrity |
| **Repudiation** | Denying an action occurred | Non-repudiation |
| **Information Disclosure** | Exposing information to unauthorized parties | Confidentiality |
| **Denial of Service** | Making system unavailable | Availability |
| **Elevation of Privilege** | Gaining unauthorized capabilities | Authorization |

### 1.4 Assumptions

Based on SECURITY_ARCHITECTURE.md Section A.3:

**In Scope Threats**:
- External attackers via internet
- Malicious insiders (authenticated users)
- Compromised credentials
- Cross-tenant attacks
- Session hijacking

**Out of Scope (Phase 1)**:
- Advanced persistent threats (nation-state)
- Physical security of infrastructure
- Cloud provider-level DDoS
- Supply chain attacks
- Side-channel attacks

---

## 2. System Context

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  Next.js Frontend (Browser/Mobile) + WebSocket (WSS)       │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS/TLS 1.2+
┌─────────────────▼───────────────────────────────────────────┐
│                    API Gateway (NGINX)                       │
│     - TLS termination                                        │
│     - Rate limiting                                          │
│     - Request routing                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Backend Services (FastAPI)                      │
│  auth-service │ hr-service │ task-service │ expense-service │
│  training-service │ complaint-service │ mindmap-service     │
│     - JWT validation                                         │
│     - RBAC enforcement                                       │
│     - Business logic                                         │
└─────┬───────────┬──────────────┬──────────────┬────────────┘
      │           │              │              │
      ▼           ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│PostgreSQL│ │  Redis   │ │  MinIO   │ │   ClamAV     │
│  (RLS)   │ │(Sessions)│ │ (Files)  │ │(Virus Scan)  │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
```

### 2.2 Trust Boundaries

| Boundary | Description | Security Controls |
|----------|-------------|-------------------|
| **Internet → API Gateway** | Untrusted public internet to TLS termination | HTTPS, rate limiting, DDoS protection |
| **API Gateway → Backend Services** | Trusted internal network | API keys or mTLS (production) |
| **Backend Services → Databases** | Trusted internal network | TLS (sslmode=require), connection pooling |
| **Tenant A ↔ Tenant B** | Logical isolation within shared infrastructure | PostgreSQL RLS, JWT tenant_id validation |
| **Employee ↔ Manager** | Hierarchy-based access | RBAC + hierarchy filtering |
| **Admin ↔ Non-Admin** | Privileged vs standard users | RBAC role checks, separation of duties |

### 2.3 Assets and Data Classification

Per COMPLIANCE_MAPPING.md Section C:

| Asset | Classification | Storage Location | Encryption |
|-------|---------------|------------------|------------|
| Payroll records (salary components) | RESTRICTED | PostgreSQL (encrypted fields) | AES-256-GCM |
| JWT tokens (access, refresh) | RESTRICTED | Redis (sessions), HTTP-only cookies | TLS in transit, bcrypt hash for storage |
| Employee personal data (name, email, phone) | CONFIDENTIAL | PostgreSQL | TLS in transit only |
| Task/expense descriptions | CONFIDENTIAL | PostgreSQL | TLS in transit only |
| File uploads (receipts, documents) | CONFIDENTIAL | MinIO | SSE-S3 encryption |
| Audit logs | CONFIDENTIAL | PostgreSQL | TLS in transit only |
| Mind maps (planning data) | INTERNAL | PostgreSQL | TLS in transit only |

---

## 3. Threat Analysis

## 3.1 Spoofing (Task 0.5.21)

**Definition**: Attackers pretending to be legitimate users, services, or systems to gain unauthorized access.

### SP-001: JWT Token Theft via XSS

**Threat Description**: Attacker injects malicious JavaScript into the application to steal access tokens from browser memory.

**Attack Vector**:
1. Attacker exploits XSS vulnerability in user-generated content (e.g., task comment)
2. Malicious script executes in victim's browser
3. Script reads access token from memory (stored in frontend state)
4. Token exfiltrated to attacker-controlled server
5. Attacker uses stolen token to impersonate victim

**Affected Component**: Frontend (Next.js), all modules with user input

**Likelihood**: Medium (XSS is common, but frontend frameworks have built-in protections)

**Impact**: High (full account takeover for token lifetime - 15 minutes)

---

### SP-002: JWT Token Replay Attack

**Threat Description**: Attacker intercepts a valid JWT access token and replays it to gain unauthorized access.

**Attack Vector**:
1. Attacker intercepts HTTPS traffic (e.g., via compromised network)
2. Extracts valid access token from Authorization header
3. Replays token to backend API within 15-minute validity window
4. Gains access to victim's data and operations

**Affected Component**: auth-service, all backend services

**Likelihood**: Low (requires HTTPS interception or man-in-the-middle)

**Impact**: High (temporary account access for 15 minutes)

---

### SP-003: Refresh Token Theft via Cookie Hijacking

**Threat Description**: Attacker steals refresh token cookie to obtain long-lived access.

**Attack Vector**:
1. Attacker exploits XSS or CSRF vulnerability
2. Extracts refresh token from HTTP-only cookie (if XSS allows)
3. Uses refresh token to generate new access tokens
4. Maintains persistent access for 7 days (refresh token lifetime)

**Affected Component**: auth-service, frontend cookies

**Likelihood**: Low (HTTP-only cookies prevent JavaScript access)

**Impact**: Critical (7-day persistent access, can generate new access tokens)

---

### SP-004: Credential Stuffing Attack

**Threat Description**: Attacker uses leaked credentials from other breaches to attempt login to MindFlow.

**Attack Vector**:
1. Attacker obtains email/password pairs from external data breaches
2. Automated script attempts logins across thousands of accounts
3. Successfully compromises accounts where users reused passwords
4. Gains full account access

**Affected Component**: auth-service login endpoint (`/auth/login`)

**Likelihood**: High (credential reuse is common)

**Impact**: High (full account compromise)

---

### SP-005: Phishing Attack

**Threat Description**: Attacker creates fake MindFlow login page to harvest credentials.

**Attack Vector**:
1. Attacker sends phishing email mimicking MindFlow
2. Email contains link to fake login page (e.g., `mindflow-login.phishing.com`)
3. User enters credentials on fake page
4. Attacker captures credentials and uses them on real MindFlow platform

**Affected Component**: auth-service (indirect - credentials used on real system)

**Likelihood**: High (phishing is common social engineering technique)

**Impact**: High (full account compromise)

---

### SP-006: Service Impersonation (Internal Services)

**Threat Description**: Attacker impersonates internal backend service to access other services.

**Attack Vector**:
1. Attacker compromises one backend service (e.g., task-service)
2. Exploits lack of mTLS to impersonate auth-service
3. Makes unauthorized requests to hr-service or other services
4. Bypasses authorization checks by pretending to be trusted service

**Affected Component**: Internal service-to-service communication

**Likelihood**: Low (requires initial service compromise)

**Impact**: Critical (cross-service data access)

---

### SP-007: Session Fixation Attack

**Threat Description**: Attacker sets victim's session ID before authentication to hijack session.

**Attack Vector**:
1. Attacker sends victim link with pre-set session ID
2. Victim authenticates using fixed session ID
3. Attacker uses same session ID to access victim's account

**Affected Component**: auth-service session management

**Likelihood**: Very Low (MindFlow generates new session ID on login per SECURITY_ARCHITECTURE.md Section E.4.2)

**Impact**: High (session hijacking)

---

### SP-008: API Key Theft

**Threat Description**: Attacker steals service-to-service API keys to impersonate backend services.

**Attack Vector**:
1. Attacker exploits environment variable exposure (e.g., via error page)
2. Extracts `AUTH_SERVICE_API_KEY` or similar
3. Uses stolen key to make requests as legitimate service
4. Bypasses service authentication

**Affected Component**: All backend services (Phase 1 uses API keys per DATA_PROTECTION_DESIGN.md Section B.4.2)

**Likelihood**: Medium (environment variable leaks are common)

**Impact**: Critical (full service impersonation)

---

### SP-009: Password Reset Token Interception

**Threat Description**: Attacker intercepts password reset email to hijack account.

**Attack Vector**:
1. Attacker initiates password reset for victim account
2. Reset email sent to victim's email address
3. Attacker intercepts email (e.g., via compromised email account)
4. Clicks reset link and sets new password
5. Original user locked out of account

**Affected Component**: auth-service password reset flow

**Likelihood**: Medium (depends on email security)

**Impact**: Critical (permanent account takeover)

---

### SP-010: Brute Force Password Attack

**Threat Description**: Attacker guesses weak passwords through automated attempts.

**Attack Vector**:
1. Attacker targets accounts with weak passwords
2. Automated script tries common passwords (e.g., "password123", "admin123")
3. Bypasses rate limiting via distributed attack (multiple IPs)
4. Successfully compromises weak-password accounts

**Affected Component**: auth-service login endpoint

**Likelihood**: Medium (mitigated by lockout policy, but distributed attacks possible)

**Impact**: High (account compromise)

---

## 3.2 Tampering (Task 0.5.22)

**Definition**: Unauthorized modification of data, code, or system configurations.

### TA-001: SQL Injection in Dynamic Queries

**Threat Description**: Attacker injects malicious SQL code to manipulate database queries.

**Attack Vector**:
1. Attacker submits malicious input in search/filter fields (e.g., task search)
2. Backend constructs SQL query without proper parameterization
3. Malicious SQL executes (e.g., `' OR '1'='1'; DROP TABLE employees; --`)
4. Attacker reads, modifies, or deletes database records

**Affected Component**: All backend services with dynamic SQL (task-service, hr-service, expense-service)

**Likelihood**: Low (ORM frameworks provide protection, but raw SQL queries exist)

**Impact**: Critical (database compromise, data deletion)

---

### TA-002: API Parameter Manipulation

**Threat Description**: Attacker modifies API request parameters to bypass authorization or manipulate data.

**Attack Vector**:
1. User makes legitimate request: `PUT /api/tasks/task123` with `{"status": "completed"}`
2. Attacker intercepts and modifies tenant_id in request body: `{"tenant_id": "other-tenant-uuid", "status": "completed"}`
3. Backend fails to validate tenant_id against JWT claim
4. Task status updated for wrong tenant's task

**Affected Component**: All backend services, especially task-service, expense-service, hr-service

**Likelihood**: Medium (common attack if tenant_id not re-validated)

**Impact**: High (cross-tenant data manipulation)

---

### TA-003: File Upload Malicious Content Injection

**Threat Description**: Attacker uploads malicious file (e.g., PDF with embedded JavaScript) to exploit viewers.

**Attack Vector**:
1. Attacker uploads crafted PDF with embedded JavaScript to expense receipt upload
2. File passes ClamAV scan (zero-day exploit or obfuscated payload)
3. Other user downloads and opens file
4. Malicious code executes in PDF reader
5. Attacker gains access to user's system

**Affected Component**: storage-service, expense-service, task-service, complaint-service

**Likelihood**: Low (ClamAV scans files, but zero-days exist)

**Impact**: High (client-side compromise)

---

### TA-004: Audit Log Tampering

**Threat Description**: Admin or attacker modifies audit logs to hide malicious activity.

**Attack Vector**:
1. HR_ADMIN with direct database access modifies audit log entries
2. Deletes records of unauthorized payroll access
3. Investigation finds no evidence of malicious activity

**Affected Component**: Audit log tables in PostgreSQL

**Likelihood**: Low (requires database access + admin privileges)

**Impact**: Critical (evidence destruction, compliance violation)

---

### TA-005: Salary Data Modification by Unauthorized User

**Threat Description**: Attacker escalates privileges to modify payroll records.

**Attack Vector**:
1. Attacker with EMPLOYEE role exploits authorization bypass
2. Sends `PUT /api/hr/payroll/emp123` with modified salary: `{"basic_pay_encrypted": "tampered_ciphertext"}`
3. Backend fails to validate HR_ADMIN role requirement
4. Payroll record updated with fraudulent data

**Affected Component**: hr-service payroll endpoints

**Likelihood**: Low (RBAC enforced, but logic bugs possible)

**Impact**: Critical (financial fraud)

---

### TA-006: Hierarchy Manipulation

**Threat Description**: Attacker modifies organizational hierarchy to gain access to data.

**Attack Vector**:
1. Employee exploits API to change own manager_id
2. Sets manager_id to CEO's user_id
3. Gains "subordinate" access to all company data via hierarchy filtering
4. Accesses sensitive executive information

**Affected Component**: hr-service employee update endpoints

**Likelihood**: Low (hierarchy changes require HR_ADMIN role per SECURITY_ARCHITECTURE.md)

**Impact**: Critical (organization-wide data access)

---

### TA-007: Approval Workflow Bypass

**Threat Description**: Attacker bypasses approval workflow to directly approve own requests.

**Attack Vector**:
1. Employee submits expense claim
2. Directly calls `PUT /api/expenses/exp123/approve` endpoint
3. Backend fails to validate requester != approver
4. Employee self-approves expense claim

**Affected Component**: approval-service, expense-service, hr-service (leave approvals)

**Likelihood**: Medium (separation of duties must be enforced)

**Impact**: High (financial fraud, policy violation)

---

### TA-008: JWT Claims Manipulation

**Threat Description**: Attacker modifies JWT claims to escalate privileges.

**Attack Vector**:
1. Attacker captures valid JWT for EMPLOYEE role
2. Decodes JWT, modifies `roles` claim to `["EMPLOYEE", "HR_ADMIN"]`
3. Re-encodes JWT without valid signature
4. Sends modified token to backend
5. Backend fails to validate signature properly

**Affected Component**: auth-service, all backend services validating JWTs

**Likelihood**: Very Low (JWT signature validation prevents this per SECURITY_ARCHITECTURE.md)

**Impact**: Critical (privilege escalation)

---

### TA-009: File Metadata Manipulation

**Threat Description**: Attacker modifies file metadata to bypass virus scanning or access controls.

**Attack Vector**:
1. Attacker uploads malicious EXE file
2. Renames to `malware.pdf` and sets MIME type to `application/pdf`
3. File validation fails to check magic bytes
4. Malicious file stored and distributed to users

**Affected Component**: storage-service file upload validation

**Likelihood**: Low (multi-layer validation per DATA_PROTECTION_DESIGN.md Section E.2.3)

**Impact**: High (malware distribution)

---

### TA-010: Training Exam Answer Modification

**Threat Description**: Employee modifies exam answers after submission to pass failed exam.

**Attack Vector**:
1. Employee submits exam with score of 40%
2. Intercepts `POST /api/training/exams/exam123/submit` request
3. Modifies answer payload before submission: changes wrong answers to correct
4. Backend accepts modified submission
5. Employee receives passing score fraudulently

**Affected Component**: training-service exam submission

**Likelihood**: Medium (requires client-side interception, but no server-side validation of answers)

**Impact**: Medium (training compliance fraud)

---

## 3.3 Repudiation (Task 0.5.23)

**Definition**: Users denying actions they performed, or attackers denying their malicious activities.

### RE-001: Admin Action Without Audit Trail

**Threat Description**: HR_ADMIN performs sensitive action (e.g., salary change) without audit log record.

**Attack Vector**:
1. HR_ADMIN modifies employee salary directly in database (bypassing API)
2. No audit log entry created
3. Employee disputes salary change
4. No evidence of who made change or when

**Affected Component**: All services with admin operations

**Likelihood**: Low (API-layer audit logging enforced per SECURITY_ARCHITECTURE.md)

**Impact**: High (accountability loss, compliance violation)

---

### RE-002: Employee Denies Leave Request Submission

**Threat Description**: Employee claims they never submitted leave request, causing workflow confusion.

**Attack Vector**:
1. Employee submits leave request
2. Request auto-rejected due to insufficient balance
3. Employee claims system error, denies submitting request
4. No immutable proof of original submission (if audit logs can be modified)

**Affected Component**: hr-service leave management

**Likelihood**: Low (audit logs are immutable per PRD 1.3)

**Impact**: Medium (workflow disruption, trust issues)

---

### RE-003: Manager Denies Approving Fraudulent Expense

**Threat Description**: Manager approves fraudulent expense, later denies approval when investigated.

**Attack Vector**:
1. Manager approves suspicious expense claim for subordinate
2. Finance audit flags expense as fraudulent
3. Manager claims account was compromised or denies approval
4. Insufficient audit trail to prove deliberate approval

**Affected Component**: approval-service, expense-service

**Likelihood**: Medium (audit logs must capture IP, timestamp, user_id)

**Impact**: High (financial fraud investigation hindered)

---

### RE-004: Attacker Denies Unauthorized Access

**Threat Description**: Attacker gains unauthorized access but no forensic evidence proves it.

**Attack Vector**:
1. Attacker compromises user account via stolen credentials
2. Accesses sensitive payroll data
3. No access logs or insufficient detail (missing IP, timestamp)
4. Investigation cannot prove unauthorized access occurred

**Affected Component**: All services, logging infrastructure

**Likelihood**: Low (CERT-In requires comprehensive logging per COMPLIANCE_MAPPING.md)

**Impact**: Critical (security incident investigation failure)

---

### RE-005: Session Hijacking Without Detection

**Threat Description**: Attacker hijacks session but activity not distinguishable from legitimate user.

**Attack Vector**:
1. Attacker steals refresh token
2. Accesses system from different IP/location
3. Session logs do not capture IP change or device mismatch
4. Legitimate user claims unauthorized access, but no proof

**Affected Component**: auth-service session management

**Likelihood**: Medium (requires enhanced session monitoring)

**Impact**: High (unauthorized access dispute)

---

### RE-006: File Deletion Without Attribution

**Threat Description**: User deletes important file, later denies deletion.

**Attack Vector**:
1. User deletes task attachment
2. Audit log records deletion but missing user_id or timestamp
3. User claims file was never deleted or system error occurred
4. Cannot prove who deleted file

**Affected Component**: storage-service file deletion

**Likelihood**: Low (file deletion should be audited per DATA_PROTECTION_DESIGN.md)

**Impact**: Medium (data loss dispute)

---

### RE-007: Complaint Escalation Manipulation Denial

**Threat Description**: Support staff denies manually escalating complaint to hide SLA violation.

**Attack Vector**:
1. Complaint exceeds SLA threshold
2. Support staff manually de-escalates or delays escalation
3. Audit log doesn't capture manual escalation override
4. Staff denies intervention when SLA breach is investigated

**Affected Component**: complaint-service escalation workflow

**Likelihood**: Low (escalation should be automated and audited)

**Impact**: Medium (SLA compliance dispute)

---

### RE-008: Bulk Data Export Denial

**Threat Description**: Admin denies exporting sensitive data in bulk.

**Attack Vector**:
1. HR_ADMIN exports all employee payroll data via API
2. Data leaked externally
3. Admin denies performing export
4. Insufficient logging of data export operations (missing row count, filter criteria)

**Affected Component**: All services with export functionality

**Likelihood**: Medium (bulk exports are high-risk operations)

**Impact**: High (data breach investigation hindered)

---

### RE-009: Training Certificate Issuance Denial

**Threat Description**: Training Admin denies issuing fraudulent certificate.

**Attack Vector**:
1. Training Admin issues certificate to employee who didn't complete course
2. Employee uses fraudulent certificate for compliance
3. Audit reveals certificate is invalid
4. Training Admin denies issuing it (claims system error)

**Affected Component**: training-service certificate issuance

**Likelihood**: Low (certificate issuance should be audited)

**Impact**: High (training compliance fraud)

---

### RE-010: Password Reset Denial

**Threat Description**: Attacker performs password reset, legitimate user denies initiating it.

**Attack Vector**:
1. Attacker initiates password reset for victim account
2. Reset email sent, attacker intercepts
3. Legitimate user receives notification
4. User claims they never requested reset
5. Insufficient logging to prove who initiated reset (IP, device, timestamp missing)

**Affected Component**: auth-service password reset flow

**Likelihood**: Medium (password reset is common attack vector)

**Impact**: High (account takeover dispute)

---

## 3.4 Information Disclosure (Task 0.5.24)

**Definition**: Exposure of sensitive information to unauthorized parties.

### ID-001: Cross-Tenant Data Leakage via RLS Bypass

**Threat Description**: Attacker bypasses PostgreSQL Row-Level Security to access other tenant's data.

**Attack Vector**:
1. Attacker exploits SQL injection or ORM misconfiguration
2. Query bypasses RLS policy (e.g., via admin connection pool without RLS enabled)
3. Attacker reads payroll, employee, or task data from other tenants
4. Sensitive multi-tenant data exposed

**Affected Component**: PostgreSQL database, all backend services

**Likelihood**: Low (RLS policies enforced per SECURITY_ARCHITECTURE.md Section C.4.1)

**Impact**: Critical (multi-tenant data breach)

---

### ID-002: Payroll Data Exposure in API Response

**Threat Description**: API accidentally returns unmasked salary data to unauthorized user.

**Attack Vector**:
1. Employee requests own profile: `GET /api/users/me`
2. API response includes unmasked payroll data for all employees (serialization bug)
3. Employee views other employees' salaries
4. RESTRICTED data exposure

**Affected Component**: hr-service user profile endpoints

**Likelihood**: Medium (API response filtering must be enforced)

**Impact**: Critical (RESTRICTED data breach per COMPLIANCE_MAPPING.md)

---

### ID-003: JWT Token Leakage in Logs

**Threat Description**: Full JWT tokens logged in application logs, exposing session credentials.

**Attack Vector**:
1. Developer logs full request headers for debugging: `logger.info(f"Request: {request.headers}")`
2. Authorization header with full JWT logged to file
3. Logs stored unencrypted or accessible to ops team
4. Attacker/insider extracts JWT from logs
5. Uses token to impersonate user (within 15-minute validity)

**Affected Component**: All backend services, logging infrastructure

**Likelihood**: High (common developer mistake)

**Impact**: High (session hijacking)

---

### ID-004: File Download URL Exposure

**Threat Description**: Pre-signed MinIO URLs leaked, allowing unauthorized file access.

**Attack Vector**:
1. User generates pre-signed URL for expense receipt download
2. URL shared via insecure channel (e.g., email, chat)
3. Recipient copies URL and accesses file after expiry
4. OR attacker enumerates URLs to access random files

**Affected Component**: storage-service, MinIO pre-signed URLs

**Likelihood**: Medium (1-hour expiry limits exposure per DATA_PROTECTION_DESIGN.md)

**Impact**: High (confidential file exposure)

---

### ID-005: Sensitive Data in Error Messages

**Threat Description**: Error messages expose sensitive system details or data.

**Attack Vector**:
1. User triggers error: `GET /api/hr/payroll/invalid-id`
2. Error message returns: `"Database error: payroll_records.basic_pay_encrypted = 'abc123...' (decryption failed)"`
3. Encrypted salary data exposed in error message
4. Attacker learns database schema, field names, encryption status

**Affected Component**: All backend services error handling

**Likelihood**: High (detailed error messages common in development)

**Impact**: Medium (information leakage aids further attacks)

---

### ID-006: Backup File Exposure

**Threat Description**: Database backup files stored without encryption or access control.

**Attack Vector**:
1. Automated backup job stores PostgreSQL dump in MinIO
2. Backup bucket has overly permissive access policy
3. Attacker enumerates buckets and downloads backup file
4. Backup contains all tenant data, including encrypted payroll (attacker attempts offline decryption)

**Affected Component**: Backup infrastructure, MinIO

**Likelihood**: Low (backups encrypted per DATA_PROTECTION_DESIGN.md Section A.3.3)

**Impact**: Critical (full database compromise)

---

### ID-007: Email Address Enumeration

**Threat Description**: Attacker enumerates valid email addresses via login endpoint.

**Attack Vector**:
1. Attacker submits login: `{"email": "test@example.com", "password": "random"}`
2. Response differs for valid vs invalid email: `"Invalid password"` vs `"Email not found"`
3. Attacker enumerates all employee email addresses
4. Builds list for phishing campaigns

**Affected Component**: auth-service login endpoint

**Likelihood**: High (user enumeration is common vulnerability)

**Impact**: Medium (facilitates phishing attacks)

---

### ID-008: WebSocket Message Interception

**Threat Description**: Attacker intercepts unencrypted WebSocket messages containing sensitive notifications.

**Attack Vector**:
1. User connects to WebSocket for real-time notifications: `ws://mindflow.com/ws`
2. WebSocket not using WSS (unencrypted)
3. Attacker on same network intercepts messages
4. Notifications contain sensitive data (e.g., "Your leave request for medical reasons was approved")

**Affected Component**: WebSocket server, all real-time notification features

**Likelihood**: Very Low (WSS enforced per DATA_PROTECTION_DESIGN.md Section B.3)

**Impact**: High (PII exposure)

---

### ID-009: Hierarchy Data Inference via Timing Attack

**Threat Description**: Attacker infers organizational hierarchy by observing API response times.

**Attack Vector**:
1. Attacker queries subordinate data: `GET /api/tasks?assigned_to=manager123`
2. Response time varies based on subordinate count (hierarchy query complexity)
3. Attacker infers manager has 50+ subordinates (slow query)
4. Maps organizational structure via timing analysis

**Affected Component**: All services with hierarchy-based filtering

**Likelihood**: Low (timing attacks require precision, mitigated by caching)

**Impact**: Low (organizational structure inference)

---

### ID-010: Session Metadata Exposure

**Threat Description**: Session metadata reveals sensitive user information.

**Attack Vector**:
1. User views active sessions: `GET /api/users/me/sessions`
2. Response includes full IP addresses, detailed User-Agent strings
3. Exposes user's home address (via IP geolocation)
4. Privacy violation (IP address is PII per GDPR/DPDP Act)

**Affected Component**: auth-service session management

**Likelihood**: Medium (session metadata logged per SECURITY_ARCHITECTURE.md)

**Impact**: Medium (PII exposure)

---

## 3.5 Denial of Service (Task 0.5.25)

**Definition**: Attackers making the system unavailable to legitimate users.

### DS-001: API Rate Limiting Bypass

**Threat Description**: Attacker overwhelms API with excessive requests, bypassing rate limits.

**Attack Vector**:
1. Attacker uses distributed botnet (1000+ IPs)
2. Each IP makes 100 requests/second to `/api/tasks` endpoint
3. Rate limiting per IP ineffective (each IP under threshold)
4. Backend services overloaded, legitimate requests timeout

**Affected Component**: API Gateway (NGINX), all backend services

**Likelihood**: High (distributed attacks common)

**Impact**: High (service unavailability)

---

### DS-002: Database Connection Pool Exhaustion

**Threat Description**: Attacker consumes all database connections, blocking legitimate queries.

**Attack Vector**:
1. Attacker sends requests triggering slow queries (e.g., complex hierarchy traversal)
2. Each request holds database connection for 30+ seconds
3. Connection pool (max 100 connections) exhausted
4. New requests fail with "Connection timeout" error

**Affected Component**: PostgreSQL connection pool, all backend services

**Likelihood**: Medium (requires slow query exploitation)

**Impact**: Critical (database unavailability)

---

### DS-003: File Upload Disk Space Exhaustion

**Threat Description**: Attacker uploads large files repeatedly to consume all storage.

**Attack Vector**:
1. Attacker uploads 50 MB files to task attachments (max request size)
2. Uploads 1000 files (50 GB total)
3. MinIO storage volume fills up
4. Legitimate users cannot upload files

**Affected Component**: MinIO storage, storage-service

**Likelihood**: Medium (10 MB file size limit per DATA_PROTECTION_DESIGN.md, but cumulative attacks possible)

**Impact**: High (file upload unavailability)

---

### DS-004: Redis Cache Eviction Attack

**Threat Description**: Attacker floods Redis cache with junk data, evicting legitimate session data.

**Attack Vector**:
1. Attacker creates 10,000 user accounts (if registration open)
2. Each account logs in, creating session in Redis
3. Redis maxmemory policy `allkeys-lru` evicts oldest sessions
4. Legitimate users' sessions evicted prematurely
5. Users forced to re-authenticate repeatedly

**Affected Component**: Redis session store, auth-service

**Likelihood**: Low (requires bulk account creation)

**Impact**: Medium (session disruption)

---

### DS-005: WebSocket Connection Exhaustion

**Threat Description**: Attacker opens excessive WebSocket connections, exhausting server resources.

**Attack Vector**:
1. Attacker opens 10,000 WebSocket connections from distributed IPs
2. Each connection authenticated with valid (or stolen) JWT
3. Server allocates memory/threads for each connection
4. Server resources exhausted, new connections rejected

**Affected Component**: WebSocket server (FastAPI)

**Likelihood**: Medium (WebSocket connections are resource-intensive)

**Impact**: High (real-time notifications unavailable)

---

### DS-006: Audit Log Table Bloat

**Threat Description**: Attacker generates excessive audit log entries to fill database storage.

**Attack Vector**:
1. Attacker performs 1 million API requests (automated script)
2. Each request generates audit log entry (500 bytes average)
3. Audit log table grows by 500 MB
4. Repeated attacks fill database storage
5. Database write operations fail

**Affected Component**: PostgreSQL audit_logs table, all services

**Likelihood**: Medium (mitigated by log retention policies)

**Impact**: High (database unavailability)

---

### DS-007: Recursive Hierarchy Query Attack

**Threat Description**: Attacker exploits deep organizational hierarchies to trigger expensive queries.

**Attack Vector**:
1. Attacker with MANAGER role queries subordinate data
2. Organizational hierarchy artificially deepened (e.g., 100 levels)
3. Recursive CTE query consumes excessive CPU/memory
4. Database query timeout, backend service hangs

**Affected Component**: hr-service hierarchy queries, all services using subordinate filtering

**Likelihood**: Low (hierarchy depth should be limited)

**Impact**: Medium (specific endpoint unavailability)

---

### DS-008: Virus Scanning Resource Exhaustion

**Threat Description**: Attacker uploads many large files simultaneously to overload ClamAV.

**Attack Vector**:
1. Attacker uploads 100 concurrent 10 MB files
2. ClamAV processes each file (CPU-intensive)
3. ClamAV container CPU/memory exhausted
4. Subsequent file uploads timeout waiting for virus scan

**Affected Component**: ClamAV antivirus service, storage-service

**Likelihood**: Medium (virus scanning is CPU-intensive)

**Impact**: High (file upload unavailability)

---

### DS-009: Password Reset Email Flood

**Threat Description**: Attacker triggers excessive password reset emails to overwhelm email service.

**Attack Vector**:
1. Attacker submits password reset for 10,000 email addresses
2. Email service sends 10,000 emails
3. Email service rate limit exceeded, legitimate emails delayed/blocked
4. OR email service costs spike significantly

**Affected Component**: auth-service password reset, email service

**Likelihood**: High (password reset endpoints often lack rate limiting)

**Impact**: Medium (email service disruption, cost spike)

---

### DS-010: Training Exam Concurrent Attempts

**Threat Description**: Attacker initiates many concurrent exam attempts to overload training service.

**Attack Vector**:
1. Attacker creates 1000 concurrent exam sessions
2. Training service allocates memory/resources for each session
3. Server resources exhausted
4. Legitimate exam attempts fail to start

**Affected Component**: training-service exam module

**Likelihood**: Low (requires many accounts or distributed attack)

**Impact**: Medium (exam service unavailability)

---

## 3.6 Elevation of Privilege (Task 0.5.26)

**Definition**: Gaining unauthorized capabilities beyond one's assigned permissions.

### PE-001: RBAC Bypass via API Endpoint Inconsistency

**Threat Description**: Attacker accesses privileged endpoint that lacks role check.

**Attack Vector**:
1. HR_ADMIN role required for `PUT /api/hr/employees/{id}`
2. Developer creates new endpoint `PATCH /api/hr/employees/{id}` but forgets role decorator
3. EMPLOYEE role user calls PATCH endpoint
4. Backend updates employee record without authorization check
5. Attacker modifies own salary, manager, or department

**Affected Component**: All backend services, especially hr-service, expense-service

**Likelihood**: Medium (inconsistent authorization checks common)

**Impact**: Critical (privilege escalation)

---

### PE-002: Role Assignment Self-Escalation

**Threat Description**: User exploits API to assign themselves HR_ADMIN role.

**Attack Vector**:
1. User calls `POST /api/users/{user_id}/roles` with `{"role": "HR_ADMIN"}`
2. Backend fails to validate requester has permission to assign roles
3. User successfully grants self HR_ADMIN role
4. Gains access to all tenant employee data and payroll

**Affected Component**: auth-service role assignment, hr-service

**Likelihood**: Low (self-assignment prevention per SECURITY_ARCHITECTURE.md Section F.2.1)

**Impact**: Critical (privilege escalation to admin)

---

### PE-003: JWT Role Claim Injection

**Threat Description**: Attacker modifies JWT to add privileged roles.

**Attack Vector**:
1. Attacker obtains valid JWT with `roles: ["EMPLOYEE"]`
2. Decodes JWT, adds `"HR_ADMIN"` to roles array
3. Re-encodes JWT without signature (or with forged signature)
4. Sends modified JWT to backend
5. Backend fails to validate signature, accepts modified roles

**Affected Component**: auth-service, all backend services validating JWTs

**Likelihood**: Very Low (JWT signature validation prevents this)

**Impact**: Critical (arbitrary role assignment)

---

### PE-004: Hierarchy-Based Access Escalation

**Threat Description**: Attacker manipulates manager_id to become subordinate of target manager.

**Attack Vector**:
1. Attacker with EMPLOYEE role modifies own employee record
2. Sets manager_id to CEO's user_id (via API exploit)
3. Becomes "subordinate" of CEO in hierarchy
4. CEO's hierarchy queries now include attacker
5. Attacker gains access to executive-level data when CEO performs queries

**Affected Component**: hr-service employee update, hierarchy validation

**Likelihood**: Low (hierarchy changes require HR_ADMIN per SECURITY_ARCHITECTURE.md)

**Impact**: Critical (organization-wide data access)

---

### PE-005: Approval Workflow Privilege Escalation

**Threat Description**: Non-manager approves expense claims or leave requests.

**Attack Vector**:
1. Employee without MANAGER role calls `PUT /api/expenses/{id}/approve`
2. Backend checks if user is in approval chain but fails to validate hierarchy relationship
3. Employee approves own expense claim or random claim
4. Workflow bypass

**Affected Component**: approval-service, expense-service, hr-service

**Likelihood**: Medium (approval chain validation must be thorough)

**Impact**: High (financial fraud, policy violation)

---

### PE-006: Cross-Tenant Role Escalation

**Threat Description**: Attacker exploits multi-tenant architecture to gain admin role in other tenant.

**Attack Vector**:
1. Attacker has EMPLOYEE role in Tenant A
2. Exploits tenant isolation bug in role assignment
3. Assigns self HR_ADMIN role in Tenant B
4. Gains access to Tenant B's employee data

**Affected Component**: auth-service role management, tenant isolation

**Likelihood**: Very Low (tenant isolation enforced via RLS)

**Impact**: Critical (cross-tenant privilege escalation)

---

### PE-007: Super-Admin Impersonation

**Threat Description**: Attacker impersonates SUPER_ADMIN role to access cross-tenant data.

**Attack Vector**:
1. Attacker exploits environment variable leak to obtain SUPER_ADMIN credentials
2. Authenticates as SUPER_ADMIN
3. Accesses all tenant data via cross-tenant queries
4. Exfiltrates sensitive data across organization boundaries

**Affected Component**: auth-service, SUPER_ADMIN role (Phase 2+)

**Likelihood**: Very Low (SUPER_ADMIN not implemented in Phase 1 per SECURITY_ARCHITECTURE.md)

**Impact**: Critical (platform-wide compromise)

---

### PE-008: Direct Database Access Privilege Escalation

**Threat Description**: Attacker gains direct database access, bypassing API-level authorization.

**Attack Vector**:
1. Attacker compromises backend service credentials
2. Connects directly to PostgreSQL database
3. Executes SQL queries without API authorization checks
4. Reads/modifies any data (payroll, employee records, audit logs)

**Affected Component**: PostgreSQL database, credential management

**Likelihood**: Low (database credentials should be restricted)

**Impact**: Critical (full database compromise)

---

### PE-009: File Access Privilege Escalation via UUID Enumeration

**Threat Description**: Attacker enumerates file UUIDs to access files from other users/tenants.

**Attack Vector**:
1. Attacker uploads file, receives UUID: `abc-123-def-456`
2. Enumerates adjacent UUIDs: `abc-123-def-455`, `abc-123-def-457`
3. Requests pre-signed URLs for enumerated UUIDs
4. Backend fails to validate file ownership/tenant_id
5. Attacker downloads other users' files (expense receipts, task attachments)

**Affected Component**: storage-service, MinIO pre-signed URL generation

**Likelihood**: Low (UUID v4 has 2^122 possibilities, but tenant_id validation required)

**Impact**: High (unauthorized file access)

---

### PE-010: Admin Privilege Bypass via Service Account

**Threat Description**: Attacker uses service-to-service API key to bypass RBAC.

**Attack Vector**:
1. Attacker steals `AUTH_SERVICE_API_KEY` from environment variable
2. Makes request to hr-service with service API key (instead of user JWT)
3. hr-service trusts service key, bypasses RBAC checks
4. Attacker reads all payroll data without HR_ADMIN role

**Affected Component**: All backend services, service-to-service authentication

**Likelihood**: Medium (service keys must be carefully protected)

**Impact**: Critical (full service-level access)

---

## 4. Threat-to-Mitigation Mapping (Task 0.5.27)

This section maps each identified threat to existing security controls from SECURITY_ARCHITECTURE.md and DATA_PROTECTION_DESIGN.md.

### 4.1 Spoofing Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **SP-001** | JWT Token Theft via XSS | Access token stored in memory (not localStorage); HTTP-only cookies for refresh tokens | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.4.1 |
| **SP-001** | JWT Token Theft via XSS | Short-lived access tokens (15 min expiry) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.1.1 |
| **SP-001** | JWT Token Theft via XSS | Input sanitization in frontend (Next.js built-in XSS protection) | Preventive | TO IMPLEMENT | - |
| **SP-002** | JWT Token Replay Attack | HTTPS/TLS 1.2+ mandatory for all traffic | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section B.2.1 |
| **SP-002** | JWT Token Replay Attack | Token blacklist on logout/password change | Detective | EXISTING | SECURITY_ARCHITECTURE.md Section B.3.1 |
| **SP-003** | Refresh Token Theft | HTTP-only, Secure, SameSite=Strict cookies | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.4.1 |
| **SP-003** | Refresh Token Theft | Refresh token rotation (single-use) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.2.2 |
| **SP-003** | Refresh Token Theft | Token blacklist on suspicious activity | Detective | EXISTING | SECURITY_ARCHITECTURE.md Section B.3.1 |
| **SP-004** | Credential Stuffing | Account lockout (5 attempts / 15 min) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.4.1 |
| **SP-004** | Credential Stuffing | bcrypt password hashing (cost 12) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.2.1 |
| **SP-004** | Credential Stuffing | Strong password policy (12 char, 3/4 categories) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.1.1 |
| **SP-004** | Credential Stuffing | Common password blacklist | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.1.1 |
| **SP-005** | Phishing Attack | User security awareness training | Preventive | TO IMPLEMENT | - |
| **SP-005** | Phishing Attack | Multi-factor authentication (MFA) | Preventive | TO IMPLEMENT (Future) | - |
| **SP-006** | Service Impersonation | mTLS for internal services (production) | Preventive | TO IMPLEMENT | DATA_PROTECTION_DESIGN.md Section B.4.1 |
| **SP-006** | Service Impersonation | API keys for internal services (Phase 1) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section B.4.2 |
| **SP-006** | Service Impersonation | Network isolation (Docker internal network) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section B.4.2 |
| **SP-007** | Session Fixation | New session ID generated on login | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section E.4.2 |
| **SP-007** | Session Fixation | UUIDv4 session IDs (unpredictable) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section E.4.2 |
| **SP-008** | API Key Theft | API keys stored in environment variables (not code) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section A.4.2 |
| **SP-008** | API Key Theft | Secrets manager (production) | Preventive | TO IMPLEMENT | - |
| **SP-008** | API Key Theft | Logging redaction for API keys | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section D.2 |
| **SP-009** | Password Reset Token Interception | Time-limited reset tokens (1 hour expiry) | Preventive | TO IMPLEMENT | - |
| **SP-009** | Password Reset Token Interception | Single-use reset tokens | Preventive | TO IMPLEMENT | - |
| **SP-009** | Password Reset Token Interception | Email security best practices | Preventive | TO IMPLEMENT | - |
| **SP-010** | Brute Force Password | Account lockout (5 attempts / 30 min) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.4.1 |
| **SP-010** | Brute Force Password | Strong password policy | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.1.1 |
| **SP-010** | Brute Force Password | Rate limiting at API gateway | Preventive | TO IMPLEMENT | - |

### 4.2 Tampering Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **TA-001** | SQL Injection | ORM parameterized queries (SQLAlchemy) | Preventive | EXISTING | TECH_STACK.md |
| **TA-001** | SQL Injection | Input validation and sanitization | Preventive | TO IMPLEMENT | - |
| **TA-001** | SQL Injection | PostgreSQL RLS policies (defense-in-depth) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.4.1 |
| **TA-002** | API Parameter Manipulation | tenant_id re-validation from JWT (not request body) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section A.1.2 |
| **TA-002** | API Parameter Manipulation | RLS policies enforce tenant_id filtering | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.4.1 |
| **TA-003** | File Upload Malicious Content | ClamAV virus scanning on upload | Detective | EXISTING | DATA_PROTECTION_DESIGN.md Section E.3.1 |
| **TA-003** | File Upload Malicious Content | File type validation (extension + MIME + magic bytes) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.2.3 |
| **TA-003** | File Upload Malicious Content | Forbidden file types (EXE, JS, HTML, SVG) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.2.2 |
| **TA-004** | Audit Log Tampering | Append-only audit log tables | Preventive | TO IMPLEMENT | - |
| **TA-004** | Audit Log Tampering | Database-level constraints (no UPDATE/DELETE) | Preventive | TO IMPLEMENT | - |
| **TA-004** | Audit Log Tampering | Audit log access restricted to SYSTEM_ADMIN | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section F.3.1 |
| **TA-005** | Salary Data Modification | RBAC role checks (HR_ADMIN required) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.2.2 |
| **TA-005** | Salary Data Modification | AES-256 encryption for payroll fields | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section A.3.2 |
| **TA-006** | Hierarchy Manipulation | HR_ADMIN role required for hierarchy changes | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.3.3 |
| **TA-006** | Hierarchy Manipulation | Circular hierarchy prevention (database constraints) | Preventive | TO IMPLEMENT | - |
| **TA-007** | Approval Workflow Bypass | Separation of duties (requester != approver) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section F.2.3 |
| **TA-007** | Approval Workflow Bypass | Hierarchy validation for approval chain | Preventive | TO IMPLEMENT | - |
| **TA-008** | JWT Claims Manipulation | HMAC-SHA256 signature validation | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.1.1 |
| **TA-008** | JWT Claims Manipulation | Token expiry validation | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.4.3 |
| **TA-009** | File Metadata Manipulation | Multi-layer validation (extension + MIME + magic bytes) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.2.3 |
| **TA-010** | Training Exam Answer Modification | Server-side answer validation | Preventive | TO IMPLEMENT | - |
| **TA-010** | Training Exam Answer Modification | Exam session integrity checks | Preventive | TO IMPLEMENT | - |

### 4.3 Repudiation Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **RE-001** | Admin Action Without Audit Trail | API-layer audit logging (all admin actions) | Detective | EXISTING | SECURITY_ARCHITECTURE.md Section F.3.2 |
| **RE-001** | Admin Action Without Audit Trail | Immutable audit logs (per PRD 1.3) | Detective | TO IMPLEMENT | - |
| **RE-002** | Leave Request Submission Denial | Audit logs for all leave request CRUD operations | Detective | TO IMPLEMENT | - |
| **RE-002** | Leave Request Submission Denial | Immutable audit trail | Detective | TO IMPLEMENT | - |
| **RE-003** | Manager Denies Fraudulent Approval | Audit logs include user_id, IP, timestamp | Detective | EXISTING | SECURITY_ARCHITECTURE.md Section F.3.2 |
| **RE-003** | Manager Denies Fraudulent Approval | Enhanced audit for financial approvals | Detective | TO IMPLEMENT | - |
| **RE-004** | Attacker Denies Unauthorized Access | CERT-In compliant access logging (180 days) | Detective | EXISTING | COMPLIANCE_MAPPING.md Section A.2 |
| **RE-004** | Attacker Denies Unauthorized Access | Comprehensive logs (IP, timestamp, user_id, action) | Detective | EXISTING | DATA_PROTECTION_DESIGN.md Section D.5 |
| **RE-005** | Session Hijacking Without Detection | Session metadata logging (IP, device, timestamp) | Detective | EXISTING | SECURITY_ARCHITECTURE.md Section E.3.2 |
| **RE-005** | Session Hijacking Without Detection | IP change alerts (optional) | Detective | TO IMPLEMENT | - |
| **RE-006** | File Deletion Without Attribution | File deletion audit logs | Detective | TO IMPLEMENT | - |
| **RE-007** | Complaint Escalation Manipulation | Automated escalation workflow (reduces manual intervention) | Preventive | TO IMPLEMENT | - |
| **RE-007** | Complaint Escalation Manipulation | Audit logs for manual escalation overrides | Detective | TO IMPLEMENT | - |
| **RE-008** | Bulk Data Export Denial | Audit logs for data export operations | Detective | TO IMPLEMENT | - |
| **RE-008** | Bulk Data Export Denial | Export logs include row count, filter criteria | Detective | TO IMPLEMENT | - |
| **RE-009** | Training Certificate Issuance Denial | Audit logs for certificate issuance | Detective | TO IMPLEMENT | - |
| **RE-010** | Password Reset Denial | Audit logs for password reset requests (IP, timestamp) | Detective | TO IMPLEMENT | - |

### 4.4 Information Disclosure Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **ID-001** | Cross-Tenant Data Leakage | PostgreSQL RLS policies (FORCE) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.4.1 |
| **ID-001** | Cross-Tenant Data Leakage | JWT tenant_id validation on every request | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section A.1.2 |
| **ID-002** | Payroll Data Exposure in API | Salary masking in API responses (₹**,***) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section C.3.1 |
| **ID-002** | Payroll Data Exposure in API | RBAC-based response filtering | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.2.2 |
| **ID-003** | JWT Token Leakage in Logs | Logging redaction (auto-redact JWT patterns) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section D.4.1 |
| **ID-003** | JWT Token Leakage in Logs | Log only jti or last 8 chars of tokens | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section D.6 |
| **ID-004** | File Download URL Exposure | Short-lived pre-signed URLs (1h view, 15min download) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.4.3 |
| **ID-004** | File Download URL Exposure | Tenant_id validation before URL generation | Preventive | TO IMPLEMENT | - |
| **ID-005** | Sensitive Data in Error Messages | Error sanitization (no sensitive data in responses) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section D.7 |
| **ID-005** | Sensitive Data in Error Messages | Generic error messages for production | Preventive | TO IMPLEMENT | - |
| **ID-006** | Backup File Exposure | AES-256 encryption for backups | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section A.3.3 |
| **ID-006** | Backup File Exposure | Restricted backup bucket access (MFA required) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section A.3.3 |
| **ID-007** | Email Address Enumeration | Generic error messages (don't distinguish valid/invalid email) | Preventive | TO IMPLEMENT | - |
| **ID-008** | WebSocket Message Interception | WSS (WebSocket Secure) mandatory | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section B.3 |
| **ID-009** | Hierarchy Data Inference | Query result caching (consistent response times) | Preventive | TO IMPLEMENT | - |
| **ID-010** | Session Metadata Exposure | IP address logging justified for security (DPDP Act legitimate interest) | N/A | EXISTING | SECURITY_ARCHITECTURE.md Section E.3.2 |

### 4.5 Denial of Service Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **DS-001** | API Rate Limiting Bypass | Rate limiting at API gateway (per IP + per user) | Preventive | TO IMPLEMENT | - |
| **DS-001** | API Rate Limiting Bypass | CAPTCHA for suspicious traffic | Detective | TO IMPLEMENT | - |
| **DS-002** | Database Connection Pool Exhaustion | Connection pooling with max connections limit | Preventive | TO IMPLEMENT | - |
| **DS-002** | Database Connection Pool Exhaustion | Query timeout enforcement (30 seconds) | Preventive | TO IMPLEMENT | - |
| **DS-003** | File Upload Disk Space Exhaustion | File size limits (10 MB per file, 50 MB per request) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.2.1 |
| **DS-003** | File Upload Disk Space Exhaustion | Storage quota per tenant | Preventive | TO IMPLEMENT | - |
| **DS-004** | Redis Cache Eviction | Redis maxmemory policy (allkeys-lru) | Corrective | EXISTING | SECURITY_ARCHITECTURE.md Section E.4.3 |
| **DS-004** | Redis Cache Eviction | Session limit per user (10 concurrent sessions) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section E.3.1 |
| **DS-005** | WebSocket Connection Exhaustion | WebSocket connection limit per user | Preventive | TO IMPLEMENT | - |
| **DS-005** | WebSocket Connection Exhaustion | Idle connection timeout | Preventive | TO IMPLEMENT | - |
| **DS-006** | Audit Log Table Bloat | Log retention policy (180 days online, 7 years archived) | Corrective | EXISTING | COMPLIANCE_MAPPING.md Section D |
| **DS-006** | Audit Log Table Bloat | Log rotation and archival | Corrective | EXISTING | DATA_PROTECTION_DESIGN.md Section D.8 |
| **DS-007** | Recursive Hierarchy Query | Hierarchy depth limit (e.g., max 10 levels) | Preventive | TO IMPLEMENT | - |
| **DS-007** | Recursive Hierarchy Query | Query timeout enforcement | Preventive | TO IMPLEMENT | - |
| **DS-008** | Virus Scanning Resource Exhaustion | Concurrent scan limit (ClamAV queue) | Preventive | TO IMPLEMENT | - |
| **DS-008** | Virus Scanning Resource Exhaustion | Async file processing (background jobs) | Preventive | TO IMPLEMENT | - |
| **DS-009** | Password Reset Email Flood | Rate limiting on password reset (1 per email per hour) | Preventive | TO IMPLEMENT | - |
| **DS-010** | Training Exam Concurrent Attempts | Exam session limit per user | Preventive | TO IMPLEMENT | - |

### 4.6 Elevation of Privilege Mitigations

| Threat ID | Threat | Mitigation Control | Control Type | Status | Reference |
|-----------|--------|-------------------|--------------|--------|-----------|
| **PE-001** | RBAC Bypass via API Endpoint | Consistent RBAC decorators on all endpoints | Preventive | TO IMPLEMENT | - |
| **PE-001** | RBAC Bypass via API Endpoint | API authorization testing (automated) | Detective | TO IMPLEMENT | - |
| **PE-002** | Role Assignment Self-Escalation | Self-assignment prevention (requester != target) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section F.2.1 |
| **PE-002** | Role Assignment Self-Escalation | HR_ADMIN role required for role assignment | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section F.1.1 |
| **PE-003** | JWT Role Claim Injection | JWT signature validation (HMAC-SHA256) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section B.1.1 |
| **PE-004** | Hierarchy-Based Access Escalation | HR_ADMIN role required for manager_id changes | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.3.3 |
| **PE-004** | Hierarchy-Based Access Escalation | Hierarchy change audit logging | Detective | TO IMPLEMENT | - |
| **PE-005** | Approval Workflow Privilege Escalation | Hierarchy validation in approval chain | Preventive | TO IMPLEMENT | - |
| **PE-005** | Approval Workflow Privilege Escalation | RBAC check (MANAGER role required) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.2.2 |
| **PE-006** | Cross-Tenant Role Escalation | Tenant-scoped role assignment (user_tenant_roles table) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.1.2 |
| **PE-006** | Cross-Tenant Role Escalation | RLS policies enforce tenant isolation | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.4.1 |
| **PE-007** | Super-Admin Impersonation | SUPER_ADMIN not implemented in Phase 1 | N/A | N/A | SECURITY_ARCHITECTURE.md Section F.1.5 |
| **PE-008** | Direct Database Access Privilege Escalation | Database credentials restricted to service accounts only | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section D.2.2 |
| **PE-008** | Direct Database Access Privilege Escalation | RLS policies enforce tenant_id even for direct DB access | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section C.4.1 |
| **PE-009** | File Access Privilege Escalation | tenant_id validation before pre-signed URL generation | Preventive | TO IMPLEMENT | - |
| **PE-009** | File Access Privilege Escalation | UUID v4 (unpredictable, 2^122 keyspace) | Preventive | EXISTING | DATA_PROTECTION_DESIGN.md Section E.5.1 |
| **PE-010** | Admin Privilege Bypass via Service Account | Service API keys stored securely (environment variables) | Preventive | EXISTING | SECURITY_ARCHITECTURE.md Section A.4.2 |
| **PE-010** | Admin Privilege Bypass via Service Account | mTLS for internal services (production) | Preventive | TO IMPLEMENT | DATA_PROTECTION_DESIGN.md Section B.4.1 |

---

## 5. Risk Register (Task 0.5.28)

### 5.1 Risk Scoring Methodology

**Likelihood Scale**:
- **Very Low**: < 5% probability over 1 year
- **Low**: 5-25% probability over 1 year
- **Medium**: 25-50% probability over 1 year
- **High**: > 50% probability over 1 year

**Impact Scale**:
- **Low**: Minor disruption, no data loss, < 1 hour downtime
- **Medium**: Service degradation, limited data exposure (< 100 users)
- **High**: Service outage, significant data exposure (100-1000 users), RESTRICTED data breach
- **Critical**: Platform-wide compromise, mass data breach (> 1000 users), regulatory violation

**Risk Score**: Likelihood × Impact (1-4 scale for each)

| Likelihood | Impact | Risk Score | Priority |
|------------|--------|------------|----------|
| High (4) | Critical (4) | 16 | CRITICAL |
| High (4) | High (3) | 12 | HIGH |
| Medium (3) | Critical (4) | 12 | HIGH |
| Medium (3) | High (3) | 9 | MEDIUM |
| Low (2) | Critical (4) | 8 | MEDIUM |
| Low (2) | High (3) | 6 | LOW |

### 5.2 Risk Prioritization Matrix

| Priority | Risk Score Range | Count | Response Strategy |
|----------|------------------|-------|-------------------|
| **CRITICAL** | 13-16 | 6 | Immediate mitigation required before production |
| **HIGH** | 9-12 | 14 | Address in Phase 1 implementation |
| **MEDIUM** | 5-8 | 18 | Address in Phase 2 or with enhanced monitoring |
| **LOW** | 1-4 | 22 | Accept risk or address opportunistically |

### 5.3 Critical Risks (Risk Score 13-16)

| Threat ID | Threat | Likelihood | Impact | Risk Score | Existing Mitigations | Gaps | Recommendations |
|-----------|--------|------------|--------|------------|---------------------|------|-----------------|
| **SP-003** | Refresh Token Theft | Low (2) | Critical (4) | 8 → **Escalated to 13** | HTTP-only cookies, token rotation | XSS could still allow theft in edge cases | Implement Content Security Policy (CSP); conduct XSS penetration testing |
| **ID-001** | Cross-Tenant Data Leakage | Low (2) | Critical (4) | 8 → **Escalated to 13** | PostgreSQL RLS policies, JWT tenant_id validation | Admin connections may bypass RLS; SQL injection risk | Enforce RLS on ALL connections including admin; implement SQL injection testing |
| **ID-002** | Payroll Data Exposure in API | Medium (3) | Critical (4) | **12** | Salary masking, RBAC filtering | Serialization bugs could leak unmasked data | Implement automated API response testing; add explicit field exclusion lists |
| **TA-001** | SQL Injection | Low (2) | Critical (4) | 8 → **Escalated to 12** | ORM parameterized queries | Raw SQL queries exist for complex operations | Code review all SQL queries; implement SQL injection scanner in CI/CD |
| **TA-005** | Salary Data Modification | Low (2) | Critical (4) | 8 → **Escalated to 12** | RBAC role checks, AES-256 encryption | Authorization bypass bugs possible | Implement automated RBAC testing; separation of duties for salary changes |
| **PE-001** | RBAC Bypass via API Endpoint | Medium (3) | Critical (4) | **12** | Partial - inconsistent enforcement | New endpoints may lack authorization decorators | Enforce authorization decorators via linter; API authorization testing in CI/CD |

### 5.4 High Risks (Risk Score 9-12)

| Threat ID | Threat | Likelihood | Impact | Risk Score | Existing Mitigations | Recommendations |
|-----------|--------|------------|--------|------------|---------------------|-----------------|
| **SP-001** | JWT Token Theft via XSS | Medium (3) | High (3) | **9** | Memory storage, HTTP-only cookies | Implement CSP headers; XSS penetration testing |
| **SP-004** | Credential Stuffing | High (4) | High (3) | **12** | Account lockout, strong password policy | Implement breach password detection (HaveIBeenPwned API); MFA (future) |
| **SP-005** | Phishing Attack | High (4) | High (3) | **12** | None (user awareness) | User security training; phishing simulation exercises |
| **SP-008** | API Key Theft | Medium (3) | Critical (4) | **12** | Environment variables, logging redaction | Migrate to secrets manager (AWS Secrets Manager, Azure Key Vault) |
| **SP-009** | Password Reset Token Interception | Medium (3) | Critical (4) | **12** | None | Implement time-limited (1h) single-use reset tokens; email security guidance |
| **TA-002** | API Parameter Manipulation | Medium (3) | High (3) | **9** | tenant_id validation, RLS policies | Automated testing for tenant isolation; penetration testing |
| **TA-007** | Approval Workflow Bypass | Medium (3) | High (3) | **9** | Separation of duties | Hierarchy validation; automated workflow testing |
| **ID-003** | JWT Token Leakage in Logs | High (4) | High (3) | **12** | Logging redaction | Automated log scanning for sensitive data; developer training |
| **ID-004** | File Download URL Exposure | Medium (3) | High (3) | **9** | Short-lived URLs (15 min) | tenant_id validation; URL access logging |
| **ID-007** | Email Address Enumeration | High (4) | Medium (2) | **8** → **Escalated to 9** | None | Generic error messages; rate limiting on login attempts |
| **DS-001** | API Rate Limiting Bypass | High (4) | High (3) | **12** | None | Implement rate limiting at API gateway (per IP + per user); CAPTCHA |
| **DS-009** | Password Reset Email Flood | High (4) | Medium (2) | **8** → **Escalated to 9** | None | Rate limiting (1 per email per hour); CAPTCHA on reset form |
| **PE-002** | Role Assignment Self-Escalation | Low (2) | Critical (4) | **8** → **Escalated to 9** | Self-assignment prevention | Approval workflow for admin role assignments; enhanced audit logging |
| **PE-005** | Approval Workflow Privilege Escalation | Medium (3) | High (3) | **9** | RBAC checks | Hierarchy validation; automated approval chain testing |

### 5.5 Medium Risks (Risk Score 5-8)

| Threat ID | Threat | Risk Score | Key Recommendations |
|-----------|--------|------------|---------------------|
| **SP-002** | JWT Token Replay Attack | 8 | Maintain HTTPS enforcement; monitor for suspicious token usage |
| **SP-006** | Service Impersonation | 8 | Implement mTLS for production; rotate API keys quarterly |
| **SP-010** | Brute Force Password | 8 | Existing lockout sufficient; consider CAPTCHA for repeated failures |
| **TA-003** | File Upload Malicious Content | 6 | ClamAV sufficient; consider cloud-based scanning for production |
| **TA-004** | Audit Log Tampering | 8 | Implement append-only audit tables; restrict database access |
| **TA-006** | Hierarchy Manipulation | 8 | Maintain HR_ADMIN restriction; add circular hierarchy prevention |
| **TA-010** | Training Exam Answer Modification | 6 | Server-side answer validation; exam session integrity checks |
| **RE-003** | Manager Denies Fraudulent Approval | 6 | Enhanced audit logs for financial approvals; dual approval for high-value |
| **RE-005** | Session Hijacking Without Detection | 6 | IP change alerts; User-Agent validation |
| **RE-008** | Bulk Data Export Denial | 6 | Audit logs for exports; include row count and filter criteria |
| **ID-005** | Sensitive Data in Error Messages | 8 | Error sanitization; generic production error messages |
| **ID-006** | Backup File Exposure | 8 | Maintain backup encryption; MFA for backup access |
| **DS-002** | Database Connection Pool Exhaustion | 8 | Connection pooling limits; query timeout (30s) |
| **DS-003** | File Upload Disk Space Exhaustion | 6 | Maintain file size limits; implement tenant storage quotas |
| **DS-006** | Audit Log Table Bloat | 6 | Maintain log retention policy; automated archival |
| **DS-008** | Virus Scanning Resource Exhaustion | 6 | Concurrent scan limits; async processing |
| **PE-004** | Hierarchy-Based Access Escalation | 8 | Maintain HR_ADMIN restriction; audit hierarchy changes |
| **PE-010** | Admin Privilege Bypass via Service Account | 8 | Secure API key storage; implement mTLS for production |

### 5.6 Low Risks (Risk Score 1-4)

**Total Count**: 22 low-risk threats

**Strategy**: Accept residual risk with monitoring, or address opportunistically in future phases.

**Examples**:
- **SP-007**: Session Fixation (Score: 2) - Mitigated by existing controls
- **TA-008**: JWT Claims Manipulation (Score: 2) - Signature validation prevents
- **TA-009**: File Metadata Manipulation (Score: 2) - Multi-layer validation prevents
- **RE-001**: Admin Action Without Audit Trail (Score: 4) - API-layer logging enforced
- **RE-002**: Leave Request Submission Denial (Score: 4) - Immutable audit logs prevent
- **ID-009**: Hierarchy Data Inference (Score: 2) - Low impact, difficult to exploit
- **DS-004**: Redis Cache Eviction (Score: 4) - Session limits mitigate
- **DS-007**: Recursive Hierarchy Query (Score: 4) - Hierarchy depth limits recommended
- **PE-003**: JWT Role Claim Injection (Score: 2) - Signature validation prevents
- **PE-006**: Cross-Tenant Role Escalation (Score: 2) - RLS policies prevent
- **PE-007**: Super-Admin Impersonation (Score: 2) - Not implemented in Phase 1
- **PE-008**: Direct Database Access Privilege Escalation (Score: 4) - RLS enforced
- **PE-009**: File Access Privilege Escalation (Score: 4) - UUID unpredictability + tenant_id validation

---

## 6. Recommendations

### 6.1 Immediate Actions (Pre-Production)

**Critical Priority - Must Address Before Launch**:

1. **Cross-Tenant Isolation Testing**
   - Conduct penetration testing specifically targeting tenant isolation
   - Test RLS policies with admin and service accounts
   - Verify tenant_id validation in all API endpoints

2. **API Authorization Hardening**
   - Implement automated RBAC testing in CI/CD pipeline
   - Add authorization decorator enforcement via linter
   - Review all endpoints for consistent authorization checks

3. **SQL Injection Prevention**
   - Audit all raw SQL queries for parameterization
   - Implement SQL injection testing in CI/CD
   - Enforce ORM usage policy, document exceptions

4. **Logging Redaction**
   - Deploy logging redaction filters (DATA_PROTECTION_DESIGN.md Section D.4.1)
   - Scan existing logs for sensitive data leakage
   - Developer training on secure logging practices

5. **API Rate Limiting**
   - Implement rate limiting at NGINX (per IP + per user)
   - Set thresholds: 100 req/min per IP, 1000 req/min per authenticated user
   - Add CAPTCHA for password reset and login after failures

6. **Password Reset Security**
   - Implement time-limited (1 hour) single-use reset tokens
   - Add rate limiting (1 reset per email per hour)
   - Audit log all reset requests with IP and timestamp

### 6.2 Phase 1 Enhancements

**High Priority - Address During Development**:

1. **Content Security Policy (CSP)**
   - Implement strict CSP headers to prevent XSS
   - `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}';`

2. **Secrets Management**
   - Migrate API keys to AWS Secrets Manager or Azure Key Vault
   - Implement automatic key rotation (90 days)

3. **Enhanced Audit Logging**
   - Implement append-only audit tables (no UPDATE/DELETE)
   - Add audit logs for: file deletion, bulk exports, hierarchy changes
   - Include row count and filter criteria in export logs

4. **Approval Workflow Validation**
   - Implement hierarchy validation in approval chains
   - Prevent self-approval (requester != approver)
   - Add dual approval for high-value transactions (>₹50,000)

5. **Database Security Hardening**
   - Enforce query timeouts (30 seconds)
   - Implement connection pooling limits
   - Add hierarchy depth limits (max 10 levels)

6. **File Upload Security**
   - Implement tenant storage quotas
   - Add concurrent virus scan limits
   - Async file processing via background jobs

### 6.3 Phase 2 Enhancements

**Medium Priority - Future Improvements**:

1. **Multi-Factor Authentication (MFA)**
   - TOTP-based MFA for admin accounts
   - Optional MFA for all users
   - SMS or authenticator app support

2. **Breach Password Detection**
   - Integrate HaveIBeenPwned API
   - Reject passwords found in breach databases
   - Proactive user notification for compromised passwords

3. **Advanced Monitoring**
   - IP change alerts for sessions
   - User-Agent validation
   - Anomaly detection for admin activity

4. **User Security Awareness**
   - Security training program
   - Phishing simulation exercises
   - Password hygiene guidance

5. **mTLS for Internal Services**
   - Replace API keys with mutual TLS
   - Automate certificate rotation
   - Per-service client certificates

6. **Cloud-Based Security Services**
   - AWS S3 malware scanning (replace ClamAV)
   - Cloud-based DDoS protection
   - Web Application Firewall (WAF)

### 6.4 Continuous Security Practices

**Ongoing Activities**:

1. **Penetration Testing**
   - Annual third-party penetration testing
   - Focus on: tenant isolation, RBAC bypass, SQL injection, XSS

2. **Vulnerability Scanning**
   - Weekly automated vulnerability scans (OWASP ZAP, Burp Suite)
   - Monthly dependency updates (npm audit, pip audit)

3. **Security Code Review**
   - Peer review all PRs with security checklist
   - Quarterly security-focused code audits

4. **Incident Response Drills**
   - Quarterly tabletop exercises
   - Test CERT-In 6-hour reporting capability

5. **Compliance Audits**
   - Quarterly DPDP Act compliance reviews
   - Annual SOC 2 Type II audit (when applicable)

---

## 7. Dependencies

### 7.1 Group 2 Document Dependencies

This threat model builds upon:

| Document | Sections Referenced | Purpose |
|----------|---------------------|---------|
| **COMPLIANCE_MAPPING.md** | Section A (Regulations), Section C (Data Classification) | Identify RESTRICTED data, retention requirements |
| **SECURITY_ARCHITECTURE.md** | All sections (A-F) | Validate existing controls, identify gaps |
| **DATA_PROTECTION_DESIGN.md** | All sections (A-E) | Verify encryption, masking, file security controls |

### 7.2 External Dependencies

- OWASP Top 10 (2021): Web application security risks
- NIST Cybersecurity Framework: Risk management approach
- STRIDE Threat Modeling Guide (Microsoft): Methodology reference

### 7.3 Technology Stack Dependencies

Per TECH_STACK.md:
- FastAPI security features (RBAC decorators, CORS, rate limiting)
- PostgreSQL Row-Level Security (RLS)
- Redis session management
- MinIO server-side encryption
- ClamAV antivirus
- NGINX rate limiting and security headers

---

## 8. Approval Record

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| **Product Owner** | [Name] | PENDING | - | Awaiting review |
| **Technical Lead** | [Name] | PENDING | - | - |
| **Security Officer** | [Name] | PENDING | - | - |
| **Compliance Officer** | [Name] | PENDING | - | - |

**Document Status**: **DRAFT - Pending Product Owner Approval**

**Next Steps**:
1. Product Owner review and approval
2. Security Officer validation of threat assessments
3. Technical Lead review of mitigation feasibility
4. Implementation planning for critical and high-priority risks

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-14 | Development Team | Initial STRIDE threat model for Phase 0.5 Group 3 (Tasks 0.5.21-0.5.28) |

---

**END OF THREAT MODEL**

**Summary**:
- **Total Threats Identified**: 60 (10 per STRIDE category)
- **Critical Risks**: 6
- **High Risks**: 14
- **Medium Risks**: 18
- **Low Risks**: 22
- **Existing Mitigations**: 45+ controls from SECURITY_ARCHITECTURE.md and DATA_PROTECTION_DESIGN.md
- **Gaps Identified**: 35+ recommended enhancements
- **Pre-Production Blockers**: 6 critical actions required

This comprehensive threat model provides MindFlow with a prioritized security roadmap aligned with the approved security architecture and data protection design.
