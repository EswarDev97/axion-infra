# MindFlow – Compliance Mapping Document

> **Purpose**: Comprehensive regulatory compliance analysis for Indian market
> **Source**: Extracted from Phase 0 documents
> **SDLC Reference**: Phase 0.5, Tasks 0.5.1 - 0.5.7
> **Status**: APPROVED
> **Last Updated**: 2026-01-14

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 0.5 – Security, Compliance & Secure SDLC Foundation |
| **SDLC Tasks** | 0.5.1 - 0.5.7 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [TECH_STACK.md](TECH_STACK.md), and Phase 0 documents |
| **Approval Status** | PENDING |

---

## Table of Contents

1. [Applicable Regulations](#section-a-task-051--applicable-regulations)
2. [Personal and Sensitive Data Categories](#section-b-task-052--personal-and-sensitive-data-categories)
3. [Data Classification](#section-c-task-053--data-classification)
4. [Data Retention Rules](#section-d-task-054--data-retention-rules)
5. [User Rights (Access, Correction, Erasure)](#section-e-task-055--user-rights)
6. [Lawful Purpose and Usage Boundaries](#section-f-task-056--lawful-purpose-and-usage-boundaries)
7. [Compliance Summary & Next Steps](#compliance-summary--next-steps)

---

## Section A (Task 0.5.1) – Applicable Regulations

### Overview

MindFlow, as a multi-tenant SaaS platform handling employee personal data, training records, financial data, and operational information, is subject to multiple Indian regulatory frameworks. This section identifies all applicable regulations based on MindFlow's data handling characteristics.

**Data Handling Context** (from [PRD.md](PRD.md) and [IN_SCOPE_MODULES.md](IN_SCOPE_MODULES.md)):
- HR data: Employee records, attendance, leave, payroll references
- Training data: Course enrollment, exam scores, certifications
- Financial data: Expense requests and amounts
- Complaint data: Client grievance records
- Multi-tenant architecture: Shared infrastructure, logical data isolation
- Web-based: Online-only, centralized backend
- File storage: Documents, attachments, training materials

---

### 1. Digital Personal Data Protection Act (DPDP Act) 2023

#### Applicability

MindFlow **EXPLICITLY APPLIES** to DPDP Act 2023 because:

1. **Processes Personal Data**: MindFlow collects and processes personal data of employees including:
   - Names, contact information (email, phone)
   - Employment details (position, department, reporting manager)
   - Attendance and leave records
   - Training participation and assessment scores
   - Expense claim information
   - Task assignments and comments

2. **Employees as Data Principals**: Under DPDP Act, employees are "data principals" with enforceable rights regardless of employment relationship

3. **Digital Processing**: All data is digitally stored and processed via web-based platform

4. **Indian Residents**: MindFlow is designed for organizations operating in India with employees who are Indian residents

#### Key Provisions Relevant to MindFlow

| Provision | Description | MindFlow Impact |
|-----------|-------------|----------------|
| **Section 6 - Notice & Consent** | Data fiduciaries must obtain valid consent before processing personal data | Employee onboarding must include explicit consent collection |
| **Section 11 - Right to Access** | Data principals can request summary of personal data | MindFlow must provide data export functionality |
| **Section 12 - Right to Correction** | Data principals can request correction of inaccurate data | MindFlow must support data correction workflows |
| **Section 12 - Right to Erasure** | Data principals can request deletion when consent is withdrawn | MindFlow must implement erasure workflows with legal retention exceptions |
| **Section 13 - Grievance Redressal** | Data principals must have mechanism to raise grievances | Leverage Complaints module with DATA_PRIVACY category |
| **Section 8 - Data Breach Notification** | Must notify Data Protection Board and affected individuals | Requires breach detection and notification system |

#### Compliance Requirements for MindFlow

1. **Consent Management**:
   - Obtain explicit consent during employee onboarding
   - Maintain consent records with version tracking
   - Support consent withdrawal

2. **Data Principal Rights**:
   - Implement data export API (`GET /api/v1/users/{user_id}/data-export`)
   - Implement data correction request workflow
   - Implement data erasure request workflow with legal retention exceptions

3. **Data Minimization**:
   - Collect only data necessary for operational purposes defined in [PRD.md](PRD.md)
   - No secondary use for AI/ML (explicitly excluded per [NON_GOALS.md](NON_GOALS.md))

4. **Purpose Limitation**:
   - Use data only for purposes disclosed at collection
   - Prohibited: Marketing, profiling, third-party sharing (Phase 1)

5. **Data Security**:
   - Implement reasonable security practices (covered by IT Rules 2011)
   - Encryption at rest for sensitive fields
   - Encryption in transit (HTTPS/TLS)

---

### 2. CERT-In Directions 2022 (Cyber Security Directions)

#### Applicability

MindFlow **EXPLICITLY APPLIES** to CERT-In Directions 2022 because:

1. **Service Provider Classification**: MindFlow is a web-based service provider under CERT-In definitions
2. **Handles Indian User Data**: Processes data of Indian residents (employees)
3. **Central Backend**: Centralized infrastructure storing and processing data

#### Key Provisions Relevant to MindFlow

| Provision | Description | MindFlow Impact |
|-----------|-------------|----------------|
| **Direction 4 - Log Retention** | All service providers must maintain logs for minimum 180 days | Access logs, authentication logs, admin action logs must be retained 180 days online |
| **Direction 5 - Incident Reporting** | Cyber security incidents must be reported to CERT-In within 6 hours | Requires automated incident detection and rapid reporting capability |
| **Direction 6 - Time Synchronization** | All systems must maintain synchronized time | NTP synchronization mandatory for all containers |

#### Compliance Requirements for MindFlow

1. **Log Retention (180 Days Minimum)**:

   Required log types per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md):
   - **Access Logs**: IP, timestamp, user, endpoint, response code
   - **Authentication Logs**: Login attempts (success/failure), IP, device, timestamp
   - **Admin Action Logs**: Admin user, action, target entity, timestamp
   - **Security Event Logs**: Anomalies, blocked requests, rate limiting events

2. **Incident Reporting (6-Hour Window)**:

   Reportable incidents include:
   - Targeted scanning/probing of critical systems
   - Compromise of any service
   - Unauthorized access to IT systems
   - Data breaches or data leaks
   - Identity theft, spoofing, phishing attempts
   - Malicious code in uploaded files

   **Technical Requirements**:
   - Incident detection via monitoring and alerting
   - Security incidents table to track all incidents
   - Pre-built CERT-In report templates
   - Automated alerting to security team
   - ELK stack (or equivalent) for log aggregation and search

3. **Time Synchronization**:
   - NTP configuration for all Docker containers
   - UTC timezone for all logs
   - ISO 8601 timestamp format

4. **Clock Synchronization Evidence**:
   - Log correlation IDs for request tracing across services
   - Timestamp accuracy validation

---

### 3. IT Act 2000 (Information Technology Act)

#### Applicability

MindFlow **APPLIES** to IT Act 2000 because:

1. **Electronic Records**: All MindFlow data is stored as electronic records
2. **Digital Platform**: Web-based application with digital authentication
3. **Compliance Foundation**: IT Act provides legal framework for electronic transactions and cyber offenses

#### Key Provisions Relevant to MindFlow

| Provision | Description | MindFlow Impact |
|-----------|-------------|----------------|
| **Section 43A - Data Protection** | Reasonable security practices for sensitive personal data | Foundation for security architecture |
| **Section 66 - Hacking & Cyber Offenses** | Penalties for unauthorized access | Justifies strong access control and audit requirements |
| **Section 72A - Disclosure of Information** | Penalties for unauthorized disclosure | Requires strict data access controls and audit trails |

#### Compliance Requirements for MindFlow

1. **Reasonable Security Practices**:
   - Implement comprehensive security architecture (Phase 0.5 tasks 0.5.8-0.5.14)
   - Document security policies and controls

2. **Access Control**:
   - Authentication via JWT tokens (per [TECH_STACK.md](TECH_STACK.md))
   - RBAC enforcement at API level
   - Multi-tenancy via PostgreSQL RLS

3. **Audit & Accountability**:
   - Immutable audit logs for all critical actions
   - Track who accessed what data when
   - Comply with "nothing important happens silently" principle ([PRD.md](PRD.md) Section 1.3)

---

### 4. IT Rules 2011 (Reasonable Security Practices and Procedures)

#### Applicability

MindFlow **APPLIES** to IT Rules 2011 because:

1. **Handles Sensitive Personal Data**: Financial information (expense amounts, payroll references), passwords
2. **Body Corporate**: Organizations using MindFlow are "body corporate" under the rules
3. **Outsourced Processing**: If MindFlow is offered as SaaS, it acts as a data processor

#### Key Provisions Relevant to MindFlow

| Provision | Description | MindFlow Impact |
|-----------|-------------|----------------|
| **Rule 4 - Security Practices** | Must implement comprehensive security policy | Requires documented security policy covering all data categories |
| **Rule 5 - Sensitive Personal Data** | Financial info, passwords require enhanced protection | Encryption at rest for payroll references, expense data; password hashing |
| **Rule 6 - Consent Collection** | Explicit consent required for sensitive data | Consent during employee onboarding must cover financial data processing |

#### Compliance Requirements for MindFlow

1. **Security Policy Documentation**:
   - Comprehensive security policy covering:
     - Information security measures
     - Business continuity and disaster recovery
     - Network security
     - Access control
     - Encryption standards
     - Audit procedures

2. **Sensitive Personal Data Protection**:

   Sensitive data in MindFlow:
   - **Financial Information**: Payroll references ([PRD.md](PRD.md) Section 4.8), expense amounts (Section 6.1)
   - **Passwords**: Authentication credentials
   - **Potentially Health Data**: If leave records include medical details

   Protection requirements:
   - Encryption at rest (AES-256 for financial fields)
   - Encryption in transit (HTTPS/TLS mandatory)
   - Password hashing (bcrypt per [TECH_STACK.md](TECH_STACK.md))
   - Redaction in logs (never log passwords, financial details)

3. **Third-Party Data Processors**:
   - If MindFlow infrastructure is hosted by cloud provider (AWS, Azure), ensure contractual compliance
   - Data localization: India region only (per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md))

---

### Summary Table: Applicable Regulations

| Regulation | Primary Obligations | Compliance Owner | Enforcement Phase |
|-----------|-------------------|-----------------|------------------|
| **DPDP Act 2023** | Consent management, data principal rights (access, correction, erasure), breach notification | auth-service, all services | Phase 0.5, Phase 2, Phase 6 |
| **CERT-In 2022** | Log retention (180 days), incident reporting (6 hours), time synchronization | All services, logging infrastructure | Phase 0.5, Phase 8 |
| **IT Act 2000** | Reasonable security practices, access control, audit trails | System Foundations, all services | Phase 0.5, Phase 6 |
| **IT Rules 2011** | Security policy, sensitive data protection, encryption, consent | auth-service, hr-service, expense-service | Phase 0.5, Phase 2, Phase 6 |

---

## Section B (Task 0.5.2) – Personal and Sensitive Data Categories

### Overview

This section catalogs all personal data (PII) and sensitive personal data (SPI) processed by MindFlow across its 7 modules, as defined in [IN_SCOPE_MODULES.md](IN_SCOPE_MODULES.md).

### Personal Data (PII) Identification

Personal Data is any data that can identify an individual. Under DPDP Act 2023, all personal data requires lawful basis and appropriate protection.

#### 1. Mind Mapping Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **Author Identity** | created_by user_id | Mind map creation | mindmap_service DB | Ownership tracking, audit |
| **Node Content** | Node titles, descriptions potentially containing names | Node creation/editing | mindmap_service DB | Planning and structuring |
| **Mind Map Titles** | May reference individuals or projects | Mind map creation | mindmap_service DB | Organization and categorization |

**Privacy Classification**: Generally internal planning data; may contain incidental references to individuals.

---

#### 2. Task Management Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **Task Assignee** | employee_id(s) of assigned persons | Task creation/assignment | task-service DB | Work allocation |
| **Task Creator** | created_by user_id | Task creation | task-service DB | Accountability, audit |
| **Task Comments** | Free-text comments potentially mentioning individuals | Comment posting | task-service DB | Collaboration |
| **Task Descriptions** | May reference individuals, performance, activities | Task creation/editing | task-service DB | Work execution context |
| **File Attachments** | Metadata (uploader, timestamp) | File upload | storage-service DB | Supporting documentation |

**Privacy Classification**: **Operational PII** - task assignments reveal workload, performance, and supervisor-subordinate relationships.

---

#### 3. HR Management Module

**This module handles the MOST PERSONAL DATA.**

| Data Type | Examples | Collection Point | Storage Location | Purpose | Sensitivity |
|-----------|----------|------------------|------------------|---------|-------------|
| **Employee Name** | Full legal name | Employee onboarding | hr-service DB | Identification | **PII** |
| **Contact Information** | Email, phone number | Employee onboarding | hr-service DB | Communication | **PII** |
| **Position/Designation** | Job title, level | Employee onboarding | hr-service DB | Organizational structure | **PII** |
| **Reporting Manager** | Manager employee_id | Employee onboarding | hr-service DB | Hierarchy management | **PII** |
| **Date of Joining** | Employment start date | Employee onboarding | hr-service DB | Employment records | **PII** |
| **Employment Status** | Active/Inactive/Exited | Status changes | hr-service DB | HR management | **PII** |
| **Attendance Records** | Present/Absent per day | Attendance marking | hr-service DB | Attendance tracking | **PII** |
| **Leave Requests** | Leave type, dates, reason | Leave application | hr-service DB | Leave management | **PII** (reasons may reveal personal circumstances) |
| **Payroll References** | Salary components, basic pay, allowances | Payroll reference entry | hr-service DB | Reference only (no calculations) | **SENSITIVE (Financial)** |
| **Candidate Information** | Name, contact, resume, interview status | Candidate tracking | hr-service DB | Recruitment (basic) | **PII** |

**Note**: Per [PRD.md](PRD.md) Section 4.8, payroll is **reference-only** with no automation or bank integration. However, salary information is still sensitive personal data.

---

#### 4. Training Management Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **Enrollment Records** | employee_id, training_session_id | Training enrollment | training-service DB | Training management |
| **Trainer Assignment** | trainer_employee_id | Session scheduling | training-service DB | Training delivery |
| **Training Attendance** | Present/Absent per session | Attendance marking | training-service DB | Compliance tracking |
| **Exam Attempts** | employee_id, exam_id, attempt timestamp | Exam start | training-service DB | Assessment tracking |
| **Exam Scores** | Score, pass/fail status | Exam submission | training-service DB | Performance assessment |
| **Exam Responses** | Question responses | Exam submission | training-service DB | Assessment validation |
| **Certificates** | employee_id, course, completion date | Certificate generation | training-service DB | Certification records |

**Privacy Classification**: **Educational PII** - reveals training participation, performance, and skill gaps.

---

#### 5. Expense Management Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **Expense Requester** | employee_id | Expense request creation | expense-service DB | Financial tracking |
| **Expense Amounts** | Rupee amounts per expense item | Expense request creation | expense-service DB | Financial approval | **SENSITIVE (Financial)** |
| **Expense Descriptions** | Reason for expense, trip details, client names | Expense request creation | expense-service DB | Audit justification |
| **Receipt Uploads** | File metadata, receipt images | Document upload | storage-service DB | Financial audit |
| **Approver Actions** | Approved/rejected by employee_id | Approval workflow | approval-service DB | Audit trail |
| **Payment Details** | Payment mode, reference number, date | Finance processing | expense-service DB | Payment tracking |

**Privacy Classification**: **Financial PII** - reveals spending patterns, travel, client interactions.

---

#### 6. Complaints Management Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **Complainant** | Customer name, contact (if external) OR internal employee_id | Complaint logging | complaint-service DB | Issue tracking |
| **Complaint Owner** | Assigned employee_id | Complaint assignment | complaint-service DB | Accountability |
| **Complaint Description** | Free-text description potentially mentioning individuals | Complaint logging | complaint-service DB | Resolution context |
| **Action Notes** | Investigation steps, individuals involved | Comment posting | complaint-service DB | Audit trail |
| **Escalation History** | Escalated to employee_id, timestamp | Auto-escalation | complaint-service DB | SLA compliance |
| **Client/Vehicle/Workshop References** | Identifiable context links | Complaint logging | complaint-service DB | Complaint resolution |

**Privacy Classification**: **Operational PII + Potentially Client PII** - may contain client names and contact information if complaint is client-facing.

---

#### 7. System Foundations Module

| Data Type | Examples | Collection Point | Storage Location | Purpose |
|-----------|----------|------------------|------------------|---------|
| **User Credentials** | Email/username, password (hashed) | User registration | auth-service DB | Authentication | **SENSITIVE** |
| **Session Tokens** | JWT tokens, refresh tokens | Login | auth-service DB | Session management | **SENSITIVE** |
| **Audit Logs** | user_id, action, entity, timestamp, IP address | All critical actions | Each service DB | Compliance, forensics | **PII (reveals user activity)** |
| **Access Logs** | IP address, user_id, endpoint, timestamp | Every API call | ELK stack / logging infra | Security monitoring | **PII (IP addresses)** |
| **Role Assignments** | employee_id, role_id | Admin configuration | auth-service DB | Authorization |

**Privacy Classification**: **System-Level PII + Authentication Credentials** - most sensitive category.

---

### Sensitive Personal Data (SPI) Classification

Under DPDP Act 2023 and IT Rules 2011, certain data categories are classified as **Sensitive Personal Data** requiring enhanced protection.

#### Sensitive Data Categories in MindFlow

| Data Category | Module | Specific Fields | Sensitivity Rationale | Protection Requirements |
|--------------|--------|----------------|---------------------|------------------------|
| **Financial Information** | HR (Payroll), Expense | Salary components, basic pay, allowances, expense amounts | IT Rules 2011 defines financial info as sensitive | Encryption at rest (AES-256), redaction in logs, restricted access |
| **Passwords** | System Foundations | Password hashes | IT Rules 2011 defines passwords as sensitive | Hashing (bcrypt), never log, secure storage |
| **Authentication Credentials** | System Foundations | JWT tokens, refresh tokens | High-value attack targets | Secure storage, short TTL, rotation, never log plaintext |
| **Leave Reasons** | HR (Leave Management) | Free-text leave reason field | May reveal medical or personal circumstances | Access restrictions, potential for health data |
| **Complaint Details** | Complaints | Complaint descriptions involving personal incidents | May reveal personal circumstances, conflicts | Access restrictions, confidentiality controls |

**Note**: [PRD.md](PRD.md) does not explicitly mention collection of:
- Biometric data (explicitly excluded per Section 4.6)
- Health data (not explicit, but may appear incidentally in leave reasons)
- Aadhaar/PAN (not mentioned in PRD but common in Indian HR systems - **requires clarification**)

---

### Module Mapping Summary

| Module | PII Data Categories | Sensitive Data Categories | Volume (Est.) |
|--------|-------------------|-------------------------|--------------|
| **Mind Mapping** | Author identity, content references | None | Medium (content-driven) |
| **Task Management** | Assignees, comments, attachments | None | High (daily operations) |
| **HR Management** | Names, contact, position, hierarchy, attendance, leave | **Payroll references (financial)**, leave reasons | High (all employees) |
| **Training Management** | Enrollment, attendance, scores, certificates | None | Medium (training cadence) |
| **Expense Management** | Requester, descriptions, receipts | **Expense amounts (financial)** | Medium (monthly/ad-hoc) |
| **Complaints Management** | Complainant, owner, descriptions | Potentially sensitive incidents | Low (exception-based) |
| **System Foundations** | User credentials, audit logs, IP addresses | **Passwords, tokens** | High (all user activity) |

---

### Data Not Specified in PRD (Requires Clarification)

The following data types are common in Indian HR systems but **NOT EXPLICITLY MENTIONED** in [PRD.md](PRD.md):

| Data Type | Common in Indian Systems? | PRD Status | Recommendation |
|-----------|-------------------------|------------|---------------|
| **Aadhaar Number** | Yes (mandatory for many employers) | Not mentioned | Clarify if required; if yes, must encrypt and comply with Aadhaar Act |
| **PAN Number** | Yes (tax compliance) | Not mentioned | Clarify if required; if yes, must encrypt |
| **Bank Account Details** | Yes (for salary payments) | Payroll is reference-only; unclear | Clarify if stored; if yes, must encrypt |
| **Biometric Data** | No (explicitly excluded per PRD 4.6) | Excluded | Not applicable |
| **Health Information** | Potentially (via leave reasons) | Not explicit | Must treat leave reasons as potentially sensitive |

**Recommendation**: Product Owner should clarify whether Aadhaar, PAN, and bank details are required for MindFlow's payroll reference feature.

---

## Section C (Task 0.5.3) – Data Classification

### Overview

Data classification enables appropriate security controls, access restrictions, and audit requirements based on sensitivity. MindFlow adopts a **4-tier classification model** aligned with industry standards and compliance requirements.

### Classification Tiers

#### Tier 1: PUBLIC

**Definition**: Data that can be publicly disclosed without risk to individuals or organization.

**Handling Requirements**: No restrictions.

**Examples in MindFlow**:

| Data Category | Module | Examples | Justification |
|--------------|--------|----------|---------------|
| **Product Documentation** | System Foundations | Help docs, user guides (if public-facing) | Intended for public consumption |
| **Public Job Postings** | HR Management (Candidate) | Open position listings (if applicable) | Intended for public viewing |

**Note**: [PRD.md](PRD.md) does not specify any truly public data. Most MindFlow data is operational and internal. This tier may be **empty** or limited to future marketing materials.

---

#### Tier 2: INTERNAL

**Definition**: Data for internal organizational use only; not sensitive but should not be publicly disclosed.

**Handling Requirements**:
- Access limited to authenticated users within tenant
- No external sharing
- No special encryption beyond transport layer (HTTPS)
- Standard audit logging

**Examples in MindFlow**:

| Data Category | Module | Examples | Justification |
|--------------|--------|----------|---------------|
| **Mind Maps (Non-Confidential)** | Mind Mapping | General planning mind maps, process flows, training structures | Internal planning artifacts |
| **Task Lists (Non-Confidential)** | Task Management | Task titles, descriptions (non-sensitive) | Operational task management |
| **Training Course Catalogs** | Training Management | Course titles, descriptions, objectives | Training program information |
| **Department Names** | HR Management | Department structure (if non-sensitive) | Organizational structure |
| **Position Titles (Generic)** | HR Management | Generic job titles (e.g., "Manager", "Executive") | Organizational structure |
| **Mind Map Templates** | Mind Mapping | Predefined templates (claims workflow, SOP) | Internal reusable assets |
| **Complaint Categories** | Complaints Management | Predefined complaint types | Configuration data |

**Access Control**: Authenticated users within tenant; RBAC may further restrict visibility based on role.

---

#### Tier 3: CONFIDENTIAL

**Definition**: Sensitive business data requiring protection and limited access. Unauthorized disclosure could harm individuals or organization.

**Handling Requirements**:
- Role-based access control (RBAC)
- Audit logging mandatory
- Encryption in transit (HTTPS)
- May require encryption at rest for specific fields
- Access restricted to authorized roles only
- Tenant isolation strictly enforced via RLS

**Examples in MindFlow**:

| Data Category | Module | Examples | Justification |
|--------------|--------|----------|---------------|
| **Employee Records** | HR Management | Names, contact info, positions, reporting structure | Personal data, org structure |
| **Attendance Records** | HR Management | Daily attendance (Present/Absent) | Personal work history |
| **Leave Records (Non-Medical)** | HR Management | Leave applications (non-medical reasons) | Personal absence data |
| **Performance Data (Task History)** | Task Management | Task completion rates, overdue tasks by user | Work performance indicators |
| **Training Scores** | Training Management | Exam scores, pass/fail status | Educational assessment |
| **Expense Amounts** | Expense Management | Expense request amounts, descriptions | Financial data (business spending) |
| **Complaint Details** | Complaints Management | Complaint descriptions, resolutions | Operational issues |
| **Approval Histories** | Approval Service | Who approved/rejected what | Accountability trail |
| **Client/Customer Names** | Complaints Management | Client names linked to complaints | Business relationships |
| **Project/Task Assignments** | Task Management | Who is assigned to what work | Work distribution |
| **Hierarchical Relationships** | HR Management | Manager-subordinate mappings | Organizational authority structure |

**Access Control**: RBAC + hierarchy-based filtering. Managers can view subordinate data; employees view own data.

---

#### Tier 4: RESTRICTED

**Definition**: Highly sensitive data requiring strict access controls and enhanced technical safeguards. Unauthorized access could result in regulatory violations, identity theft, or financial fraud.

**Handling Requirements**:
- Encryption at rest (AES-256)
- Encryption in transit (HTTPS/TLS mandatory)
- Strict RBAC (admin-only for most fields)
- Redaction in logs (never log plaintext)
- Field-level masking in UI (e.g., show last 4 digits only)
- Audit logging mandatory with enhanced detail
- Access requires explicit need-to-know justification

**Examples in MindFlow**:

| Data Category | Module | Specific Fields | Justification |
|--------------|--------|----------------|---------------|
| **Authentication Credentials** | System Foundations | Password hashes, JWT tokens, refresh tokens | Account takeover risk |
| **Payroll Information** | HR Management | Salary components, basic pay, allowances | Financial PII (IT Rules 2011 sensitive) |
| **Financial Details (Personal)** | Expense Management | Expense amounts tied to individuals | Financial PII |
| **Leave Reasons (Medical)** | HR Management | Leave reason text field (if medical) | Potential health data |
| **API Keys / Service Tokens** | System Foundations | Service-to-service auth tokens | Infrastructure security |
| **Encryption Keys** | System Foundations | AES keys, JWT signing secrets | Cryptographic material |
| **Admin Override Logs** | System Foundations | Super-admin actions, RLS bypasses | Privileged access audit |

**Special Cases Requiring Clarification**:

| Data Type | Current PRD Status | If Required, Classification |
|-----------|-------------------|----------------------------|
| **Aadhaar Number** | Not mentioned | RESTRICTED (Aadhaar Act compliance) |
| **PAN Number** | Not mentioned | RESTRICTED (financial identifier) |
| **Bank Account Details** | Payroll is reference-only | RESTRICTED (financial credential) |

---

### Data Classification Matrix

| Data Category | Module | Classification Tier | Access Control Requirement | Encryption at Rest | Log Redaction | Compliance Driver |
|--------------|--------|---------------------|---------------------------|--------------------|---------------|------------------|
| Mind Map Templates | Mind Mapping | INTERNAL | Authenticated users | No | No | N/A |
| Task Assignments | Task Management | CONFIDENTIAL | RBAC + hierarchy | No | No | Data minimization |
| Employee Names | HR Management | CONFIDENTIAL | RBAC | No | No | DPDP Act (PII) |
| Salary Components | HR Management | RESTRICTED | Admin only | **Yes (AES-256)** | **Yes** | IT Rules 2011 (sensitive) |
| Passwords | System Foundations | RESTRICTED | N/A (hashed) | **Yes (bcrypt hash)** | **Never log** | IT Rules 2011 (sensitive) |
| Expense Amounts | Expense Management | CONFIDENTIAL | RBAC + approval chain | Optional | No | IT Rules 2011 (financial) |
| Training Scores | Training Management | CONFIDENTIAL | Employee + managers | No | No | Educational privacy |
| Audit Logs | All Services | CONFIDENTIAL | Admin only | No | Partial (redact restricted fields) | CERT-In, IT Act |
| JWT Tokens | System Foundations | RESTRICTED | N/A (session-based) | **Yes** | **Yes (log last 8 chars only)** | Security best practice |
| Complaint Descriptions | Complaints | CONFIDENTIAL | Assigned owner + escalation chain | No | No | Confidentiality |
| Client Names | Complaints | CONFIDENTIAL | RBAC | No | No | Business confidentiality |
| IP Addresses (Logs) | System Foundations | CONFIDENTIAL | Admin only | No | No | CERT-In retention |

---

### Classification Decision Framework

**How to classify new data categories**:

```
┌─────────────────────────────────────────────┐
│ Is the data already public?                │
└──────────────┬──────────────────────────────┘
               │
         ┌─────┴─────┐
         ▼ YES       ▼ NO
      PUBLIC     ┌──────────────────────────────────┐
                 │ Is it authentication/cryptographic│
                 │ material or financial PII?       │
                 └──────────┬────────────────────────┘
                            │
                   ┌────────┴────────┐
                   ▼ YES             ▼ NO
               RESTRICTED    ┌────────────────────────────┐
                             │ Does unauthorized access   │
                             │ harm individuals/org?      │
                             └──────┬─────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼ YES               ▼ NO
                     CONFIDENTIAL          INTERNAL
```

---

### Classification Summary by Module

| Module | Internal | Confidential | Restricted | Notes |
|--------|----------|-------------|-----------|-------|
| **Mind Mapping** | Templates, non-sensitive maps | Sensitive planning data | None | Mostly Internal |
| **Task Management** | Public task templates | Task assignments, history | None | Mostly Confidential |
| **HR Management** | Generic position titles | Employee records, attendance, leave | Payroll data | Mix of Confidential + Restricted |
| **Training Management** | Course catalogs | Enrollment, scores, certificates | None | Mostly Confidential |
| **Expense Management** | Expense categories | Expense descriptions, amounts | High-value expenses (threshold TBD) | Mostly Confidential |
| **Complaints Management** | Complaint categories | Complaint details, actions | Sensitive incidents | Mostly Confidential |
| **System Foundations** | Help docs | Audit logs, role assignments | Passwords, tokens, keys | Mix of Confidential + Restricted |

---

## Section D (Task 0.5.4) – Data Retention Rules

### Overview

Data retention policies balance operational needs, regulatory compliance, and data minimization principles. MindFlow's retention rules are driven by:
- CERT-In requirement: 180 days minimum for logs
- DPDP Act principle: Data should not be retained longer than necessary
- Business needs per module (as defined in [PRD.md](PRD.md))
- Audit and legal obligations

### Retention Policy Principles

1. **Compliance-Driven Minimum**: Legal minimums (e.g., CERT-In 180 days) are enforced
2. **Operational Need**: Retention periods align with business requirements from [PRD.md](PRD.md)
3. **Data Minimization**: Maximum retention limits prevent indefinite storage
4. **Soft Delete First**: Critical data soft-deleted before permanent removal (per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Rule 9)
5. **Audit Logs Exception**: Audit logs and consent records NEVER deleted (permanent retention)

---

### Retention Rules by Data Category

#### 1. Audit and Security Logs

| Data Category | Retention Period (Online) | Retention Period (Archived) | Rationale | Disposal Method | Source Requirement |
|--------------|-------------------------|---------------------------|-----------|-----------------|-------------------|
| **Access Logs** | 180 days | 7 years | CERT-In mandates 180 days online; 7 years for forensics | Automated archival to cold storage; never delete | CERT-In 2022 Direction 4 |
| **Authentication Logs** | 180 days | 7 years | CERT-In mandates 180 days; security investigations | Automated archival to cold storage; never delete | CERT-In 2022 Direction 4 |
| **Admin Action Logs** | 180 days | 7 years | CERT-In mandates 180 days; governance audit | Automated archival to cold storage; never delete | CERT-In 2022 Direction 4 |
| **Security Event Logs** | 180 days | 7 years | CERT-In mandates 180 days; incident analysis | Automated archival to cold storage; never delete | CERT-In 2022 Direction 4 |
| **Audit Logs (Business)** | 7 years (online) | Indefinite | Compliance, dispute resolution, audit trails | Never delete (immutable per PRD 1.3) | DPDP Act, IT Act |

**Implementation**:
- ELK stack (or equivalent) retains 180 days online
- After 180 days: Archive to S3 Glacier (or equivalent) in India region
- Archived logs retained for 7 years minimum
- Audit logs (business actions) retained indefinitely per PRD 1.3 principle "history is immutable"

---

#### 2. HR & Employee Data

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Employee Records** | Employment duration + 7 years | Standard HR practice; compliance with labor laws | Soft delete on exit; hard delete after 7 years | Industry best practice |
| **Attendance Records** | 3 years | Operational need; labor law compliance | Soft delete after 3 years; archive if required | Inferred from PRD 4.6 |
| **Leave Records** | 3 years | Operational need; policy compliance | Soft delete after 3 years | Inferred from PRD 4.7 |
| **Payroll References** | Employment duration + 7 years | Financial audit requirements | Soft delete on exit; hard delete after 7 years | IT Rules 2011 (financial data) |
| **Candidate Records** | 1 year (if not hired) | Recruitment records; avoid indefinite storage | Soft delete after 1 year; hard delete after 2 years | DPDP Act (data minimization) |
| **Candidate Records** | Convert to Employee (if hired) | Candidate becomes employee | Merge into employee record | Business logic |

**Implementation**:
- Soft delete: Set `is_deleted = true`, `deleted_at = TIMESTAMP`
- Hard delete: Celery scheduled task purges records past retention period
- Exception: Employee records linked to ongoing disputes/litigation retained until resolved

---

#### 3. Task Management Data

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Active Tasks** | Indefinite (while active) | Operational execution | N/A | Business requirement |
| **Completed Tasks** | 5 years post-completion | Audit trail, project history, compliance | Soft delete after 5 years; hard delete after 6 years | Inferred from PRD 3.0 |
| **Cancelled/Dropped Tasks** | 3 years post-cancellation | Audit trail, decision history | Soft delete after 3 years; hard delete after 4 years | Data minimization |
| **Task Comments** | Same as parent task | Context preservation | Cascade with task | Business requirement |
| **Task Attachments** | Same as parent task | Context preservation | Cascade with task (delete from MinIO) | Business requirement |

**Implementation**:
- Task status determines retention trigger (e.g., completion date, cancellation date)
- Soft delete maintains audit trail
- Hard delete removes from database and MinIO (attachments)

---

#### 4. Training Data

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Training Enrollment** | 5 years post-completion | Certification validity, compliance | Soft delete after 5 years | Inferred from PRD 5.0 |
| **Exam Attempts** | 5 years post-completion | Assessment validation, disputes | Soft delete after 5 years | Inferred from PRD 5.6 |
| **Exam Scores** | 5 years post-completion | Certification validity, audit | Soft delete after 5 years | Inferred from PRD 5.8 |
| **Certificates** | Indefinite | Proof of competency; long-term value | Never delete (or employee lifetime + 10 years) | Business requirement |
| **Training Content** | Indefinite (while course active) | Reusable training materials | Delete when course retired + 1 year | Business requirement |

**Implementation**:
- Certificates may require indefinite retention or very long retention (employment + 10 years)
- Training history tied to employee records (cascade retention)

---

#### 5. Expense Data

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Expense Requests** | 7 years post-approval | Financial audit requirements (India tax law) | Soft delete after 7 years; hard delete after 8 years | IT Rules 2011, tax compliance |
| **Expense Receipts** | 7 years post-approval | Financial audit requirements | Soft delete after 7 years; hard delete from MinIO after 8 years | IT Rules 2011, tax compliance |
| **Payment Records** | 7 years post-payment | Financial audit requirements | Soft delete after 7 years | IT Rules 2011, tax compliance |

**Implementation**:
- 7-year retention aligns with Indian Income Tax Act requirements for financial records
- Receipts in MinIO must be retained for same duration as expense metadata

---

#### 6. Complaints Data

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Open Complaints** | Indefinite (while open) | Operational requirement | N/A | Business requirement |
| **Resolved Complaints** | 5 years post-resolution | Audit trail, SLA compliance verification, dispute handling | Soft delete after 5 years; hard delete after 6 years | Inferred from PRD 7.0 |
| **Complaint Attachments** | Same as parent complaint | Context preservation | Cascade with complaint (delete from MinIO) | Business requirement |

**Implementation**:
- Retention clock starts at resolution date, not closure date
- Critical for SLA audit and client relationship history

---

#### 7. Mind Maps

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Active Mind Maps** | Indefinite (while active) | Planning artifacts; long-living per PRD 2.1 | N/A | PRD 2.1 |
| **Archived Mind Maps** | 3 years post-archival | Reference value; not operational | Soft delete after 3 years; hard delete after 4 years | Data minimization |

**Implementation**:
- Mind maps are "long-living" per PRD 2.1, but archived maps have limited operational value
- Soft delete preserves for recovery if needed

---

#### 8. Consent Records

| Data Category | Retention Period | Rationale | Disposal Method | Source Requirement |
|--------------|-----------------|-----------|-----------------|-------------------|
| **Consent Records** | Indefinite | Legal proof of consent; DPDP Act compliance | **Never delete** | DPDP Act 2023 Section 6 |
| **Consent Versions** | Indefinite | Historical record of consent terms | **Never delete** | DPDP Act 2023 Section 6 |
| **Consent Withdrawal** | Indefinite | Legal proof of withdrawal | **Never delete** | DPDP Act 2023 Section 6 |

**Implementation**:
- Consent records are permanent legal documentation
- Even after user account deletion, consent history retained for compliance

---

### Retention Rules Summary Table

| Data Category | Minimum Retention | Maximum Retention | Disposal Trigger | Notes |
|--------------|------------------|------------------|-----------------|-------|
| **Audit Logs** | 180 days online | Indefinite (7 years archived, then indefinite) | Never deleted | CERT-In + audit principle |
| **Employee Records** | Employment duration | Employment + 7 years | Employee exit + 7 years | Labor law compliance |
| **Tasks** | Duration + 3 years (cancelled) | 5 years (completed) | Completion/cancellation date | Audit trail |
| **Training** | Duration + 5 years | Indefinite (certificates) | Completion date | Certification validity |
| **Expenses** | Duration + 7 years | 7 years post-approval | Approval date | Tax law compliance |
| **Complaints** | Duration | 5 years post-resolution | Resolution date | SLA audit |
| **Consent Records** | Indefinite | Indefinite | Never deleted | Legal documentation |
| **Mind Maps** | Duration | 3 years post-archival | Archival date | Planning artifacts |

---

### Soft Delete vs. Hard Delete Implementation

**Soft Delete** (per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Rule 9):

All tables with critical data must include:
- `is_deleted: BOOLEAN DEFAULT FALSE`
- `deleted_at: TIMESTAMP NULL`
- `deletion_reason: VARCHAR(255) NULL`

**Hard Delete**:

- Celery scheduled task: `enforce_data_retention()` runs daily
- Identifies records past maximum retention + grace period (30 days)
- Permanently deletes from database and MinIO
- Generates deletion audit log (exception: audit logs themselves never deleted)

**Grace Period**: 30-day grace period between soft delete expiry and hard delete for recovery

---

### Data Retention Enforcement

**Automated Enforcement**:
- Celery task: `enforce_data_retention()` scheduled daily at 02:00 UTC
- Per-service implementation (each service manages its own retention)
- Audit logging of retention actions

**Manual Retention Holds**:
- Legal hold flag available for ongoing litigation/investigations
- Admin can flag records for indefinite retention
- Requires audit trail of hold placement and removal

---

## Section E (Task 0.5.5) – User Rights

### Overview

Under DPDP Act 2023, data principals (employees in MindFlow) have enforceable rights regarding their personal data. This section defines how MindFlow implements these rights while respecting operational, legal, and audit requirements.

### Right to Access (DPDP Act Section 11)

#### Scope of Access Rights

**User Self-Access**:

Users (employees) can access the following data about themselves:

| Data Category | Access Method | Format | Implementation |
|--------------|--------------|--------|----------------|
| **Employee Profile** | `GET /api/v1/users/{user_id}/profile` | JSON | hr-service |
| **Task Assignments** | `GET /api/v1/tasks?assigned_to={user_id}` | JSON | task-service |
| **Training Records** | `GET /api/v1/training/enrollments?user_id={user_id}` | JSON | training-service |
| **Expense Requests** | `GET /api/v1/expenses?requester_id={user_id}` | JSON | expense-service |
| **Leave Applications** | `GET /api/v1/leave-requests?employee_id={user_id}` | JSON | hr-service |
| **Mind Maps Created** | `GET /api/v1/mindmaps?created_by={user_id}` | JSON | mindmap-service |
| **Audit Log (Own Actions)** | `GET /api/v1/audit-logs?user_id={user_id}` | JSON | Each service |

**Full Data Export**:

Per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md) Section 2.1:
- Endpoint: `GET /api/v1/users/{user_id}/data-export`
- Format: JSON with human-readable structure
- Scope: All personal data across ALL services
- Implementation: Async job via Celery (72-hour SLA)
- Audit: Every export request logged

**Manager Access**:

Managers can access subordinate data based on organizational hierarchy:

| Data Category | Access Scope | Hierarchy Constraint | Implementation |
|--------------|------------|---------------------|----------------|
| **Subordinate Profiles** | Direct reports + indirect reports | Via HR hierarchy | hr-service validates hierarchy |
| **Subordinate Tasks** | Tasks assigned to subordinates | Visibility rules | task-service validates hierarchy |
| **Subordinate Training** | Enrollment, attendance, scores | Reporting line only | training-service validates hierarchy |
| **Subordinate Expenses** | Pending approvals only | Approval chain | expense-service validates approval chain |
| **Subordinate Leave** | Pending approvals only | Approval chain | hr-service validates approval chain |

**Hierarchy Constraint**: Per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Rule 2, hierarchy is the backbone. Managers can only view data for employees in their reporting chain.

**Admin Access**:

Admins (HR Admin, System Admin) have broader access:

| Role | Access Scope | Restrictions | Audit Requirement |
|------|-------------|--------------|------------------|
| **HR Admin** | All employee records within tenant | Tenant-scoped only (RLS) | All access logged |
| **Finance Admin** | All expense records within tenant | Tenant-scoped only (RLS) | All access logged |
| **System Admin** | All data (technical admin) | Tenant-scoped only (RLS) | All access logged with enhanced detail |
| **Super Admin** | Cross-tenant access (if applicable) | **Rarely granted; explicit justification required** | All access logged; alerts triggered |

---

### Right to Correction (DPDP Act Section 12)

#### Correction Workflows

**User Self-Correction**:

Users can correct the following data themselves:

| Data Category | Can Self-Correct? | Approval Required? | Implementation |
|--------------|-------------------|-------------------|----------------|
| **Contact Information** | ✅ Yes | No | Direct update via `PUT /api/v1/users/{user_id}/profile` |
| **Profile Photo** | ✅ Yes | No | Upload via storage-service |
| **Password** | ✅ Yes | No | `POST /api/v1/auth/change-password` |
| **Notification Preferences** | ✅ Yes | No | Direct update |

**Admin-Approval Required**:

Some corrections require admin approval to maintain data integrity:

| Data Category | Can Self-Correct? | Approval Required? | Approver | Rationale |
|--------------|-------------------|-------------------|----------|-----------|
| **Employee Name** | ❌ No | ✅ Yes | HR Admin | Legal name changes require validation |
| **Date of Birth** | ❌ No | ✅ Yes | HR Admin | Identity verification required |
| **Position/Designation** | ❌ No | ✅ Yes | HR Admin | Organizational structure integrity |
| **Reporting Manager** | ❌ No | ✅ Yes | HR Admin | Hierarchy integrity |
| **Payroll References** | ❌ No | ✅ Yes | Finance Admin | Financial integrity |

**Correction Request Workflow**:

Per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md) Section 2.2:

1. User submits correction request: `POST /api/v1/users/{user_id}/correction-requests`
2. Request stored in `data_correction_requests` table:
   - `field_name`, `current_value`, `requested_value`, `status: pending`
3. Request routed to appropriate admin (HR Admin, Finance Admin)
4. Admin reviews and approves/rejects
5. If approved: Original data updated; audit log records old and new values
6. User notified of decision

**Immutable Data**:

The following data **CANNOT BE CORRECTED** by users or admins:

| Data Category | Rationale | Alternative |
|--------------|-----------|-------------|
| **Audit Logs** | Immutable per PRD 1.3 "history is immutable" | Cannot be corrected |
| **Approved Expense Records** | Financial audit integrity | Cannot be corrected (must cancel and re-submit) |
| **Completed Training Scores** | Assessment integrity | Cannot be corrected (retake exam if disputed) |
| **Historical Task Completion** | Audit trail integrity | Cannot be corrected (comment with explanation) |

---

### Right to Erasure ("Right to be Forgotten") (DPDP Act Section 12)

#### Erasure Principles

**Erasure is NOT ABSOLUTE**. Per DPDP Act and legal obligations, MindFlow must balance erasure rights with:
- Legal retention requirements (e.g., tax law, labor law)
- Ongoing dispute resolution
- Audit trail integrity
- Third-party obligations (e.g., client complaint records)

#### Erasable Data

Users can request erasure of the following data:

| Data Category | Can Be Erased? | Conditions | Implementation |
|--------------|----------------|-----------|----------------|
| **Profile Photo** | ✅ Yes | No ongoing legal hold | Delete from MinIO |
| **Mind Maps (Personal)** | ✅ Yes | User created, not referenced by active tasks | Soft delete |
| **Task Comments (Personal)** | ⚠️ Partial | Anonymize (replace name with "Deleted User") | Anonymization |
| **Training Content Uploads (Personal)** | ✅ Yes | User uploaded, not official course content | Delete from MinIO |

#### Non-Erasable Data

The following data **CANNOT BE ERASED** even upon request:

| Data Category | Rationale | Legal/Operational Basis |
|--------------|-----------|------------------------|
| **Audit Logs** | Immutable audit trail | PRD 1.3, CERT-In, IT Act |
| **Financial Records (Expenses)** | Tax law compliance | Indian Income Tax Act (7-year retention) |
| **Payroll References** | Labor law compliance | Employment law (7-year retention) |
| **Legal/Compliance Logs** | Regulatory requirement | CERT-In, DPDP Act breach records |
| **Consent Records** | Legal proof of consent | DPDP Act 2023 Section 6 |
| **Task History (Audit)** | Operational audit trail | Accountability per PRD 1.3 |
| **Training Certificates** | Certification validity | Business requirement |
| **Complaint Records** | Client obligations, SLA audit | Business requirement |

#### Erasure Request Workflow

Per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md) Section 2.3:

1. User submits erasure request: `POST /api/v1/users/{user_id}/erasure-requests`
2. Request stored in `data_erasure_requests` table:
   - `request_type: full_erasure | partial_erasure | anonymization`
   - `status: pending`
3. System validates against legal retention requirements
4. System generates proposed erasure plan:
   - Erasable data: List tables/fields to delete
   - Non-erasable data: List exceptions with rationale
5. User reviews and confirms plan
6. Celery task: `execute_data_erasure(erasure_request_id)` executes approved plan
7. Erasure certificate generated and provided to user
8. User notified of completion

**Anonymization Strategy**:

For data that cannot be deleted but can be anonymized:

| Field Type | Anonymization Method |
|-----------|---------------------|
| **Names** | Replace with "Deleted User" or UUID |
| **Email** | Replace with `deleted-{uuid}@anonymized.local` |
| **Phone** | Replace with `XXXX-XXXX-XXXX` |
| **Comments/Free-Text** | Replace with "[Content removed upon user request]" |

**Soft-Delete Handling**:

Per [CROSS_CUTTING_AND_RULES.md](CROSS_CUTTING_AND_RULES.md) Rule 9:

- Erasure first triggers soft delete: `is_deleted = true`, `deleted_at = TIMESTAMP`
- After retention period + grace period: Hard delete (permanent removal)
- Exception: Audit logs and non-erasable data remain

---

### Right to Grievance Redressal (DPDP Act Section 13)

#### Grievance Mechanism

Per [COMPLIANCE_SPECS.md](COMPLIANCE_SPECS.md) Section 2.4:

**Leverage Existing Complaints Module**:

MindFlow's existing Complaints Management Module (per [IN_SCOPE_MODULES.md](IN_SCOPE_MODULES.md)) will support data privacy grievances.

**Implementation**:
- New complaint category: `DATA_PRIVACY`
- Subcategories:
  - Consent violation
  - Unauthorized access
  - Data breach
  - Refusal of access/correction/erasure
  - Other privacy concerns

**SLA**:
- Response: 7 days
- Resolution: 30 days
- Escalation: To Data Protection Officer (DPO) role if unresolved

**Escalation Path**:
- Level 1: HR Admin / Privacy Officer
- Level 2: DPO (designated role)
- Level 3: Data Protection Board (external escalation)

---

### User Rights Implementation Table

| Right | User Self-Service | Admin Approval Required | Implementation Endpoint | Exceptions |
|-------|------------------|------------------------|------------------------|------------|
| **Access** | ✅ Yes (own data) | No (for own data) | `GET /api/v1/users/{user_id}/data-export` | None |
| **Access (Manager)** | ✅ Yes (subordinates) | No (within hierarchy) | Per-service APIs with hierarchy validation | Hierarchy constraints |
| **Correction (Contact)** | ✅ Yes | No | `PUT /api/v1/users/{user_id}/profile` | None |
| **Correction (Name)** | ❌ No | ✅ Yes | `POST /api/v1/users/{user_id}/correction-requests` | HR Admin approval |
| **Erasure (Profile Photo)** | ✅ Yes | No | `DELETE /api/v1/users/{user_id}/photo` | No legal hold |
| **Erasure (Employee Record)** | ❌ No | ⚠️ Conditional | `POST /api/v1/users/{user_id}/erasure-requests` | Cannot erase if retention required |
| **Grievance** | ✅ Yes | No | `POST /api/v1/complaints` (category: DATA_PRIVACY) | Routed to DPO |

---

## Section F (Task 0.5.6) – Lawful Purpose and Usage Boundaries

### Overview

Per DPDP Act 2023, every piece of personal data collected by MindFlow must have a **lawful basis** for processing and a **defined purpose**. This section documents the purpose specification and usage boundaries for each data category.

### Lawful Bases Under DPDP Act 2023

MindFlow relies on the following lawful bases:

| Lawful Basis | Description | Example Use Case |
|-------------|-------------|-----------------|
| **CONSENT** | Explicit, informed consent from data principal | Optional features (e.g., profile photo upload) |
| **EMPLOYMENT** | Necessary for employment contract performance | Employee records, attendance, task assignments |
| **LEGAL_OBLIGATION** | Required by law (tax, labor regulations) | Payroll references (tax compliance), audit logs (CERT-In) |
| **LEGITIMATE_INTEREST** | Legitimate interest of MindFlow/employer (with safeguards) | Operational analytics, system performance monitoring |
| **VITAL_INTEREST** | Protect vital interests of data principal | Emergency contact information (if added in future) |

---

### Purpose Specification by Module

#### 1. Mind Mapping Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Mind Map Content** | Enable planning and structuring | EMPLOYMENT | Operational use only; no AI/ML training | PRD 2.0 |
| **Author Identity** | Ownership tracking, audit | EMPLOYMENT | Accountability; cannot be used for performance evaluation | PRD 2.1 |
| **Node Attachments** | Support planning with reference materials | EMPLOYMENT | Operational use only; deleted with mind map | PRD 2.4 |

**Prohibited Uses**:
- ❌ AI/ML training on mind map content (excluded per [NON_GOALS.md](NON_GOALS.md))
- ❌ Employee surveillance or performance scoring based on mind map usage
- ❌ Marketing or third-party sharing

---

#### 2. Task Management Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Task Assignments** | Work allocation and execution management | EMPLOYMENT | Operational execution only; managers can view subordinate workload | PRD 3.5 |
| **Task Comments** | Collaboration and context sharing | EMPLOYMENT | Work context only; cannot be used for performance appraisal (excluded per PRD 1.3) | PRD 3.9 |
| **Task Completion History** | Audit trail, operational reporting | EMPLOYMENT | Reporting only; not for formal performance appraisals | PRD 3.11 |
| **File Attachments** | Supporting documentation for tasks | EMPLOYMENT | Task-specific use only; deleted with task | PRD 3.9 |

**Prohibited Uses**:
- ❌ Formal performance appraisal (excluded per [NON_GOALS.md](NON_GOALS.md))
- ❌ Automated scoring or ranking of employees (no gamification per PRD 1.3)
- ❌ Marketing or third-party sharing

---

#### 3. HR Management Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Employee Name, Contact** | Identification, communication, organizational structure | EMPLOYMENT | HR management only; cannot be shared externally (Phase 1) | PRD 4.4 |
| **Position, Hierarchy** | Organizational structure, approval routing, escalation | EMPLOYMENT | Operational hierarchy only; defines authority | PRD 4.1, 4.2 |
| **Attendance Records** | Attendance tracking, leave balance management | EMPLOYMENT | Manager-level visibility only; not public | PRD 4.6 |
| **Leave Requests** | Leave management, approval workflows | EMPLOYMENT | Approval chain visibility only; reasons may reveal personal circumstances | PRD 4.7 |
| **Payroll References** | Reference data for payroll context (no automation) | EMPLOYMENT + LEGAL_OBLIGATION | Reference only; no calculations, no bank transfers | PRD 4.8 |
| **Candidate Information** | Basic recruitment tracking | CONSENT | Retained 1 year max if not hired; consent during application | PRD 4.3 |

**Prohibited Uses**:
- ❌ Payroll automation (explicitly excluded per PRD 1.3, 4.8)
- ❌ Performance appraisals (explicitly excluded per PRD 1.3)
- ❌ Third-party sharing (no integrations Phase 1 per [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md))
- ❌ Marketing or profiling

---

#### 4. Training Management Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Training Enrollment** | Training program management, compliance tracking | EMPLOYMENT | Operational training management only | PRD 5.1 |
| **Training Attendance** | Compliance verification (training is mandatory per PRD 5.0) | EMPLOYMENT | Operational compliance only; not for performance scoring | PRD 5.5 |
| **Exam Scores** | Assessment of training completion, certification eligibility | EMPLOYMENT | Certification eligibility only; not for performance appraisals | PRD 5.6, 5.8 |
| **Certificates** | Proof of competency, operational readiness | EMPLOYMENT | Certification records; long-term retention | PRD 5.8 |

**Prohibited Uses**:
- ❌ Formal performance appraisals (excluded per PRD 1.3)
- ❌ Employee ranking or comparison (no gamification per PRD 1.3)
- ❌ Marketing or third-party sharing

---

#### 5. Expense Management Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Expense Requester** | Financial tracking, approval routing | EMPLOYMENT | Approval chain visibility only | PRD 6.1 |
| **Expense Amounts** | Financial approval, payment processing, audit | EMPLOYMENT + LEGAL_OBLIGATION | Financial audit and approval only; 7-year retention for tax compliance | PRD 6.1, 6.5 |
| **Expense Receipts** | Financial audit, verification | LEGAL_OBLIGATION | Audit only; 7-year retention for tax compliance | PRD 6.2 |
| **Approval History** | Accountability, audit trail | EMPLOYMENT | Audit and compliance only | PRD 6.3 |

**Prohibited Uses**:
- ❌ Employee profiling or surveillance
- ❌ Marketing or third-party sharing
- ❌ Automated expense scoring or employee comparison

---

#### 6. Complaints Management Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **Complainant Information** | Issue tracking, resolution, client trust | EMPLOYMENT (internal) or CONSENT (client) | Operational resolution only; confidentiality required | PRD 7.1, 7.2 |
| **Complaint Description** | Context for resolution, SLA compliance | EMPLOYMENT (internal) or CONSENT (client) | Operational use only; restricted access | PRD 7.1 |
| **Assignment History** | Accountability, escalation management | EMPLOYMENT | Operational use only; audit trail | PRD 7.4, 7.8 |
| **SLA Tracking** | Compliance monitoring, escalation triggers | EMPLOYMENT | Operational SLA management only | PRD 7.7 |

**Prohibited Uses**:
- ❌ Employee performance scoring based on complaint volume
- ❌ Marketing or third-party sharing (client confidentiality)
- ❌ Public disclosure of complaint details

---

#### 7. System Foundations Module

| Data Category | Collection Purpose | Legal Basis | Usage Limits | Source (PRD Section) |
|--------------|-------------------|-------------|--------------|---------------------|
| **User Credentials** | Authentication, system access | EMPLOYMENT | Authentication only; passwords hashed, never logged | PRD 8.1 |
| **Audit Logs** | Compliance, forensics, accountability | LEGAL_OBLIGATION (CERT-In, IT Act) | Audit and compliance only; never deleted | PRD 8.4 |
| **Access Logs** | Security monitoring, incident response | LEGAL_OBLIGATION (CERT-In) | Security and compliance only; 180 days online, 7 years archived | PRD 8.4 |
| **Role Assignments** | Authorization, RBAC enforcement | EMPLOYMENT | Access control only; audited | PRD 8.2 |
| **Configuration Data** | System behavior, business rules | EMPLOYMENT | Operational configuration only; changes audited | PRD 8.7 |

**Prohibited Uses**:
- ❌ User profiling or surveillance beyond operational needs
- ❌ Marketing or third-party sharing
- ❌ AI/ML training (excluded per [NON_GOALS.md](NON_GOALS.md))

---

### Usage Boundaries Summary

#### Permitted Uses

| Use Case | Modules | Justification |
|----------|---------|---------------|
| **Operational Execution** | All modules | Core purpose per [PRD.md](PRD.md) Section 1.2 |
| **Audit & Compliance Reporting** | All modules | Mandatory per CERT-In, IT Act, DPDP Act |
| **Hierarchy-Based Approvals** | HR, Expense, Complaints | Core workflow per PRD 1.3 (hierarchy is backbone) |
| **Internal Analytics (System Performance)** | All modules | Legitimate interest (not user behavior profiling) |
| **Security Monitoring** | System Foundations | Legitimate interest + legal obligation (CERT-In) |

#### Prohibited Uses

| Use Case | Modules | Rationale |
|----------|---------|-----------|
| **AI/ML Processing** | All modules | Explicitly excluded per [NON_GOALS.md](NON_GOALS.md) |
| **Third-Party Sharing** | All modules | No integrations Phase 1 per [SCOPE_AND_ASSUMPTIONS.md](SCOPE_AND_ASSUMPTIONS.md) |
| **Marketing or Advertising** | All modules | Not a CRM per [NON_GOALS.md](NON_GOALS.md) |
| **Performance Appraisals** | All modules | Explicitly excluded per PRD 1.3 |
| **Gamification / Employee Ranking** | All modules | Explicitly excluded per PRD 1.3 |
| **User Behavior Profiling** | All modules | Purpose beyond operational execution (violates PRD 1.3 principle) |

---

### Data Sharing Policy

#### Internal Sharing

| Sharing Type | Permitted? | Conditions |
|-------------|-----------|------------|
| **Within Tenant** | ✅ Yes | Based on RBAC + hierarchy constraints |
| **Cross-Tenant** | ❌ FORBIDDEN | RLS enforcement; no cross-tenant queries |
| **Across Services (Internal)** | ✅ Yes | Via APIs only; no direct database access (per ADR-002) |

#### External Sharing

| Sharing Type | Phase 1 Status | Future Phases | Conditions |
|-------------|---------------|---------------|------------|
| **Third-Party Integrations** | ❌ FORBIDDEN | ⏳ Future | Requires consent + compliance review + PRD amendment |
| **Email/WhatsApp (Notifications)** | ❌ FORBIDDEN | ⏳ Future (marked in PRD) | Requires consent + data processor agreement |
| **Cloud Hosting Provider** | ✅ Permitted | ✅ Ongoing | India region only; data processor agreement required |
| **Regulatory Authorities (CERT-In, DPB)** | ✅ Permitted | ✅ Ongoing | Legal obligation; incident reporting only |

---

### Purpose Limitation Enforcement

**Technical Enforcement**:
- APIs validate `purpose` parameter (if multi-purpose data access exists)
- Audit logs record access purpose for compliance review
- RBAC restricts access to authorized purposes only

**Organizational Enforcement**:
- Privacy policy documents purpose specification
- Data processing inventory maintained
- Annual compliance review validates purpose adherence

---

## Compliance Summary & Next Steps

### Compliance Obligations Summary

| Regulation | Key Obligations | MindFlow Implementation Approach | Status |
|-----------|-----------------|--------------------------------|--------|
| **DPDP Act 2023** | Consent management, data principal rights (access, correction, erasure), breach notification, purpose limitation | Implement data export, correction workflow, erasure workflow, consent tables; leverage Complaints module for grievances | Phase 0.5 Group 1 COMPLETE (Planning); Implementation in Phase 2, 3, 6 |
| **CERT-In 2022** | Log retention (180 days online), incident reporting (6 hours), time synchronization | ELK stack for log aggregation; `security_incidents` table; NTP sync; pre-built CERT-In report templates | Phase 0.5 Group 1 COMPLETE (Planning); Implementation in Phase 8 |
| **IT Act 2000** | Reasonable security practices, access control, audit trails | Comprehensive security architecture (Phase 0.5 Group 2); RBAC + RLS; immutable audit logs | Phase 0.5 Group 1 COMPLETE (Planning); Implementation in Phase 0.5 Group 2, Phase 6 |
| **IT Rules 2011** | Security policy documentation, sensitive data protection (encryption), consent collection | Document security policy (Phase 0.5); AES-256 encryption for payroll/financial fields; consent during onboarding | Phase 0.5 Group 1 COMPLETE (Planning); Implementation in Phase 2, 6 |

---

### High-Risk Compliance Items

These items require special attention in subsequent Phase 0.5 groups:

#### Critical for Phase 0.5 Group 2 (Security Architecture)

| Item | Compliance Driver | Implementation Requirement |
|------|------------------|---------------------------|
| **Encryption at Rest** | IT Rules 2011, DPDP Act | AES-256 for payroll references, expense amounts, passwords (address in Task 0.5.15) |
| **Encryption in Transit** | IT Rules 2011, DPDP Act | HTTPS/TLS mandatory; WSS for WebSocket (address in Task 0.5.16) |
| **Password Policy** | IT Rules 2011 | Minimum length, complexity, lockout (address in Task 0.5.11) |
| **Session Management** | DPDP Act, security best practice | Timeout, invalidation, token rotation (address in Task 0.5.12) |
| **Admin Privilege Boundaries** | DPDP Act, IT Act | Define super-admin vs. admin; cross-tenant access rules (address in Task 0.5.13) |

#### Critical for Phase 0.5 Group 3 (Threat Modeling)

| Item | Compliance Driver | Implementation Requirement |
|------|------------------|---------------------------|
| **Information Disclosure Threats** | DPDP Act, IT Act | Threat model for PII exposure (address in Task 0.5.24) |
| **Tampering Threats** | IT Act, CERT-In | Threat model for data integrity (address in Task 0.5.22) |
| **Privilege Escalation** | DPDP Act, IT Act | Threat model for unauthorized access (address in Task 0.5.26) |

#### Critical for Phase 0.5 Group 4 (Incident Response)

| Item | Compliance Driver | Implementation Requirement |
|------|------------------|---------------------------|
| **CERT-In 6-Hour Reporting** | CERT-In Directions 2022 | Incident detection, automated alerting, report templates (address in Task 0.5.40, 0.5.41) |
| **DPDP Breach Notification** | DPDP Act 2023 Section 8 | Breach detection, notification process to Data Protection Board and users (address in Task 0.5.40) |
| **Log Aggregation** | CERT-In Directions 2022 | ELK stack deployment, 180-day online retention, 7-year archival (address in Task 0.5.36, 0.5.37) |

---

### Phase 0.5 Group 2 Inputs (Security Architecture)

This compliance mapping provides the following inputs for Security Architecture design:

1. **Data Classification Matrix**: Informs encryption requirements (Section C)
2. **Sensitive Fields Inventory**: Payroll references, passwords, tokens, expense amounts (Section B)
3. **Authentication Requirements**: Password policy, session timeout, JWT rotation needs (Section E, F)
4. **Authorization Requirements**: RBAC + hierarchy constraints, admin privilege boundaries (Section E)
5. **Consent Management**: Lawful basis documentation informs consent collection points (Section F)

---

### Phase 0.5 Group 3 Inputs (Threat Modeling)

This compliance mapping provides the following inputs for Threat Modeling:

1. **Regulatory Compliance Threats**: Information disclosure (DPDP), tampering (CERT-In), repudiation (audit logs)
2. **Sensitive Data Targets**: High-value targets for attackers (payroll, passwords, financial data)
3. **Data Principal Rights**: Threat of unauthorized erasure, correction tampering
4. **Log Integrity**: Audit logs immutability requirement informs tampering threat mitigation

---

### Phase 0.5 Group 4 Inputs (Incident Response)

This compliance mapping provides the following inputs for Incident Response planning:

1. **CERT-In Reportable Incidents**: Data breaches, unauthorized access, malware (Section A)
2. **DPDP Breach Notification**: When to notify Data Protection Board and affected users
3. **Log Retention**: 180-day online, 7-year archival requirements (Section D)
4. **Instant Availability**: 6-hour reporting window requires instant log queryability (Section A)

---

### Outstanding Clarifications Required

The following items require Product Owner clarification:

| Item | Current Status | Impact if Unresolved |
|------|---------------|---------------------|
| **Aadhaar/PAN Storage** | Not mentioned in PRD | If required, must add encryption + Aadhaar Act compliance |
| **Bank Account Details** | Payroll is "reference-only"; unclear if stored | If stored, must encrypt (RESTRICTED classification) |
| **Health Data in Leave Reasons** | Not explicit; leave reasons are free-text | If health data likely, must add consent + enhanced protection |
| **Multi-Tenant Initial Count** | Not specified (assumption: single tenant Phase 1) | Affects tenant provisioning workflow design |
| **Data Localization Region** | India region required; specific provider not specified | Must confirm AWS ap-south-1, Azure Central India, or on-premise India |

**Recommendation**: Schedule clarification session with Product Owner before Phase 0.5 Group 2.

---

## Product Owner Clarifications (2026-01-14)

The following clarifications were provided by the Product Owner in response to outstanding items:

### 1. Aadhaar/PAN Storage
**Status**: NOT required for Phase 1
**Rationale**: Payroll is reference-only per PRD Section 4.8 with no bank integration or automation.
**Future**: If future phases require Aadhaar/PAN, will be added via formal PRD amendment with full Aadhaar Act compliance analysis.

### 2. Bank Account Details
**Status**: NOT stored in Phase 1
**Rationale**: Payroll is reference-only with no payment automation per PRD Section 4.8.
**Future**: If future phases require bank account storage, will be added via PRD amendment with encryption (RESTRICTED classification).

### 3. Health Data in Leave Reasons
**Status**: Potentially sensitive
**Decision**: Treat leave reasons as potentially containing medical information.
**Classification**: CONFIDENTIAL (not RESTRICTED unless explicit health data confirmed)
**Implementation**:
- Explicitly inform users during leave application that reasons may be visible to approval chain
- Apply access restrictions per approval workflow
- Consider masking or redaction if medical keywords detected (optional enhancement)

### 4. Multi-Tenant Initial Count
**Status**: Single tenant for Phase 1
**Rationale**: Phase 1 targets initial customer (single tenant deployment).
**Future**: Multi-tenant provisioning workflow will be designed in Phase 1 (Architecture) but activated in future phases.

### 5. Data Localization Region
**Status**: India region mandatory
**Decision**: All data must be stored in India region per DPDP Act and data sovereignty requirements.
**Implementation**: Document requirement as "India region required" without specifying cloud provider (AWS ap-south-1, Azure Central India, or on-premise India datacenter).
**Phase 1 Decision**: Specific cloud provider selection deferred to Phase 1 (System Architecture Design).

---

## Impact on Phase 0.5 Group 2

Based on Product Owner clarifications:

1. **No Aadhaar/PAN encryption required** for Phase 1 security architecture
2. **No bank account encryption required** for Phase 1 security architecture
3. **Leave reasons**: Apply standard CONFIDENTIAL-tier controls (RBAC + audit logging; no field-level encryption)
4. **Single tenant**: Simplifies initial authentication and authorization design
5. **India region**: Must be incorporated into data protection design (Task 0.5.15 - encryption at rest, 0.5.16 - encryption in transit)

These clarifications are now **locked** and will inform Phase 0.5 Group 2 (Security Architecture + Data Protection).

---

## Approval Record

| Reviewer | Role | Status | Date | Comments |
|----------|------|--------|------|----------|
| Product Owner | Authority | APPROVED | 2026-01-14 | All 7 tasks approved. Clarifications provided for outstanding items. |
| Technical Lead | Review | PENDING | - | - |
| Legal/Compliance (if applicable) | Advisory | PENDING | - | - |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-14 | AI (Claude) | Initial creation for SDLC Tasks 0.5.1 - 0.5.7 |

---

**END OF COMPLIANCE_MAPPING.md**
