# MindFlow Secure SDLC & Change Control Policy

## Document Control
| Property | Value |
|----------|-------|
| Document ID | MF-SDLC-POLICY-001 |
| Version | 1.0 |
| Status | DRAFT - Pending Product Owner Approval |
| Created Date | 2026-01-14 |
| Phase Coverage | Phase 0.5 - Group 3 (Tasks 0.5.29-0.5.35) |
| Related Documents | SECURITY_ARCHITECTURE.md, COMPLIANCE_MAPPING.md |

## Table of Contents
1. [Introduction](#1-introduction)
2. [Change Control Policies](#2-change-control-policies)
   - 2.1 [Organizational Hierarchy Changes (Task 0.5.29)](#21-organizational-hierarchy-changes-task-0529)
   - 2.2 [Approval Workflow Changes (Task 0.5.30)](#22-approval-workflow-changes-task-0530)
   - 2.3 [System Configuration Changes (Task 0.5.31)](#23-system-configuration-changes-task-0531)
   - 2.4 [Configuration Change Audit Rules (Task 0.5.32)](#24-configuration-change-audit-rules-task-0532)
3. [Environment Management](#3-environment-management)
   - 3.1 [Environment Separation (Task 0.5.33)](#31-environment-separation-task-0533)
   - 3.2 [Secrets Management and Rotation (Task 0.5.34)](#32-secrets-management-and-rotation-task-0534)
4. [Compliance Mapping (Task 0.5.35)](#4-compliance-mapping-task-0535)
5. [Dependencies](#5-dependencies)
6. [Approval Record](#6-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the Secure Software Development Lifecycle (SDLC) and Change Control policies for the MindFlow platform. It defines mandatory controls, approval processes, and audit requirements for critical system changes that impact security, operations, or compliance.

### 1.2 Scope

This policy covers Phase 0.5 Group 3 tasks (0.5.29 through 0.5.35), specifically:

- **Change Control**: Policies for organizational hierarchy, approval workflows, and system configuration changes
- **Audit Requirements**: Mandatory fields, retention periods, and immutability guarantees for configuration changes
- **Environment Management**: Separation policies for Development, Staging, and Production environments
- **Secrets Management**: Storage, rotation schedules, and emergency procedures for sensitive credentials
- **Compliance Mapping**: Alignment with DPDP Act 2023, CERT-In Directions 2022, IT Act 2000, and IT Rules 2011

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **Change Control** | Formal process for reviewing, approving, implementing, and auditing changes to critical system components |
| **Configuration Change** | Modification to system settings, workflows, hierarchies, or operational parameters |
| **Security-Sensitive Configuration** | Configuration affecting authentication, authorization, encryption, session management, or data protection |
| **SLA Configuration** | Service Level Agreement parameters defining response times, escalation rules, and operational metrics |
| **Cooling Period** | Mandatory delay between workflow approval and activation to allow for testing and rollback planning |
| **Secrets** | Sensitive credentials including database passwords, API keys, encryption keys, and service tokens |
| **Secrets Rotation** | Scheduled replacement of credentials to limit exposure window in case of compromise |

### 1.4 Authority

This policy is subordinate to:
- SECURITY_ARCHITECTURE.md (for RBAC roles and authentication model)
- COMPLIANCE_MAPPING.md (for regulatory requirements)
- PRD.md (for business requirements)

All change control procedures must comply with security architecture constraints and regulatory obligations.

---

## 2. Change Control Policies

### 2.1 Organizational Hierarchy Changes (Task 0.5.29)

#### 2.1.1 Overview

Organizational hierarchy defines reporting relationships between employees, which determines data access rights, approval routing, and escalation paths per CROSS_CUTTING_AND_RULES.md Rule 2 ("Hierarchy is the backbone"). Changes to hierarchy have immediate security and operational impact.

#### 2.1.2 Authorized Roles

Only the following roles may modify organizational hierarchy:

| Role | Scope of Authority | Examples |
|------|-------------------|----------|
| **HR_ADMIN** | All hierarchy changes within tenant | Assign manager, modify reporting structure, create positions |
| **SYSTEM_ADMIN** | Read-only access for troubleshooting | View hierarchy, no modification rights |
| **MANAGER** | Read-only for subordinate hierarchy | View own reporting chain, no modification rights |

**Restriction**: HR_ADMIN cannot modify own reporting relationship (self-assignment prevention).

#### 2.1.3 Prohibited Actions

The following hierarchy modifications are **strictly prohibited** and MUST be rejected by validation logic:

| Prohibited Action | Rationale | Validation Rule |
|------------------|-----------|----------------|
| **Circular Hierarchies** | Employee A reports to Employee B, Employee B reports to Employee A (direct or transitive) | Detect cycles using graph traversal; reject if cycle detected |
| **Self-Reporting** | Employee reports to themselves (`manager_id = employee_id`) | Database constraint: `CHECK (manager_id != employee_id)` |
| **Orphaned Employees** | Employee has no manager and is not designated CEO/top-level | All employees except CEO must have `manager_id NOT NULL` |
| **Invalid Manager References** | Manager ID references non-existent or inactive employee | Foreign key constraint with cascade rules; validate manager is active |
| **Cross-Tenant Manager Assignment** | Employee in Tenant A reports to manager in Tenant B | Validate `employees.tenant_id = managers.tenant_id` |
| **Multiple Managers** | Employee assigned more than one direct manager | Enforce single `manager_id` column (not many-to-many) |

**Implementation**: Validation rules enforced at database layer (constraints) AND application layer (business logic).

#### 2.1.4 Validation Rules

Before applying any hierarchy change, the system MUST validate:

| Validation Check | Implementation | Error Handling |
|-----------------|---------------|----------------|
| **Single Manager Per Employee** | Enforce `manager_id` as single foreign key (not array) | Reject with 400 Bad Request |
| **Valid Position References** | Validate `position_id` exists in positions table | Reject with 400 Bad Request |
| **Active Manager Status** | Validate `manager.is_active = true` | Reject with 400 Bad Request |
| **Tenant Consistency** | Validate `employee.tenant_id = manager.tenant_id` | Reject with 403 Forbidden |
| **No Circular Dependencies** | Run cycle detection algorithm on proposed change | Reject with 400 Bad Request |
| **Authorization** | Validate requestor has HR_ADMIN role | Reject with 403 Forbidden |

**Cycle Detection Algorithm** (Pseudocode):
```python
def detect_hierarchy_cycle(employee_id, new_manager_id, tenant_id):
    """
    Check if assigning new_manager_id to employee_id creates a cycle.
    """
    visited = set()
    current_id = new_manager_id

    while current_id is not None:
        if current_id == employee_id:
            return True  # Cycle detected
        if current_id in visited:
            break  # Already checked this path
        visited.add(current_id)
        current_id = get_manager_id(current_id, tenant_id)

    return False  # No cycle detected
```

#### 2.1.5 Audit Requirements

All hierarchy changes MUST be logged with the following metadata:

| Audit Field | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| `event_id` | UUID | Unique event identifier | `"evt-hier-uuid-1234"` |
| `timestamp` | ISO 8601 | Change timestamp | `"2026-01-14T10:30:00Z"` |
| `user_id` | UUID | HR_ADMIN who made change | `"user-uuid-5678"` |
| `tenant_id` | UUID | Tenant context | `"tenant-uuid-9012"` |
| `employee_id` | UUID | Employee whose hierarchy changed | `"emp-uuid-3456"` |
| `before_manager_id` | UUID | Previous manager (NULL if new employee) | `"mgr-uuid-7890"` |
| `after_manager_id` | UUID | New manager | `"mgr-uuid-1111"` |
| `before_position_id` | UUID | Previous position | `"pos-uuid-2222"` |
| `after_position_id` | UUID | New position | `"pos-uuid-3333"` |
| `change_type` | String | Type of change | `"MANAGER_CHANGE"`, `"PROMOTION"`, `"TRANSFER"` |
| `justification` | String | Reason for change | `"Employee promoted to Team Lead"` |
| `approval_id` | UUID | Approval request ID (if applicable) | `"approval-uuid-4444"` |
| `ip_address` | String | Client IP address | `"192.168.1.100"` |
| `user_agent` | String | Client User-Agent | `"Mozilla/5.0..."` |

**Snapshot Requirement**: Store before/after snapshots of employee record in JSON format for full audit trail.

**Retention**: Hierarchy change logs retained for **7 years** per COMPLIANCE_MAPPING.md Section D.

#### 2.1.6 Immediate Impact Notification

When hierarchy changes occur, the following actions MUST be triggered:

1. **Access Rights Recalculation**: Former manager immediately loses access to employee data; new manager gains access
2. **Approval Chain Update**: Pending approvals automatically rerouted to new manager
3. **Notification**: Employee and both managers notified of hierarchy change
4. **Session Maintenance**: No session invalidation required (hierarchy checked on every request per SECURITY_ARCHITECTURE.md Section C.3.3)

---

### 2.2 Approval Workflow Changes (Task 0.5.30)

#### 2.2.1 Overview

Approval workflows define the routing, escalation, and decision logic for business processes including leave requests, expense claims, task assignments, and complaint escalations. Changes to workflows directly impact operational execution and compliance.

#### 2.2.2 Authorized Roles by Workflow Type

Different workflow types require different authorization:

| Workflow Type | Authorized Roles | Rationale |
|--------------|-----------------|-----------|
| **Expense Workflows** | FINANCE_ADMIN, SYSTEM_ADMIN | Financial approval routing requires finance domain expertise |
| **Leave Workflows** | HR_ADMIN, SYSTEM_ADMIN | HR domain expertise required for leave policy compliance |
| **Task Workflows** | SYSTEM_ADMIN | Operational task routing requires system-level perspective |
| **Complaint Workflows** | SYSTEM_ADMIN | Client-facing SLA compliance requires system-level control |
| **Training Workflows** | TRAINING_ADMIN, SYSTEM_ADMIN | Training program management requires training domain expertise |

**Dual Approval Requirement**: For critical workflow changes (e.g., bypass approval step, modify SLA), both domain admin (e.g., FINANCE_ADMIN) AND SYSTEM_ADMIN approval required.

#### 2.2.3 Cooling Period

**Definition**: Mandatory delay between workflow approval and activation to allow for testing and rollback planning.

| Workflow Type | Cooling Period | Rationale |
|--------------|---------------|-----------|
| **Security-Affecting Workflows** | 48 hours | Extra time for security review and testing |
| **Financial Workflows** | 48 hours | Extra time for financial compliance review |
| **Operational Workflows** | 24 hours | Standard testing and rollback preparation |
| **Minor Configuration** | No cooling period | Low-risk changes (e.g., notification text updates) |

**Implementation**:
- Workflow changes stored in `pending_workflow_changes` table with `activation_timestamp = NOW() + cooling_period`
- Celery scheduled task activates workflow at specified timestamp
- During cooling period, change can be rolled back without impact

**Cooling Period Workflow**:
```
1. FINANCE_ADMIN submits expense workflow change
2. SYSTEM_ADMIN reviews and approves
3. System calculates activation_timestamp = NOW() + 48 hours
4. Change status: APPROVED_PENDING_ACTIVATION
5. Notification sent to stakeholders with activation time
6. Testing period: 48 hours
7. At activation_timestamp: Celery task activates workflow
8. Change status: ACTIVE
9. Audit log records activation
```

#### 2.2.4 Prohibited Actions

The following workflow modifications are **strictly prohibited**:

| Prohibited Action | Rationale | Enforcement |
|------------------|-----------|-------------|
| **Bypass Approval Steps** | Removing mandatory approval step violates compliance and accountability | Validate workflow has at least 1 approval step; reject if removed |
| **Self-Approval** | Approver cannot be same as requester for same workflow | Validate `approver_id != requester_id` in workflow definition |
| **Retroactive Changes** | Applying workflow changes to already-submitted requests | Workflow version locked at request submission; changes apply to new requests only |
| **Unauthorized Escalation Removal** | Removing escalation rules violates SLA compliance | Validate workflow has escalation rules if SLA-bound |
| **Cross-Tenant Workflow Assignment** | Workflow in Tenant A cannot route to approver in Tenant B | Validate all approvers belong to same tenant_id |

**Implementation**: Validation rules enforced at API layer before persisting workflow changes.

#### 2.2.5 Workflow Versioning

All workflow changes MUST use versioning to ensure audit trail and prevent retroactive application:

| Workflow Version Attribute | Description | Example |
|---------------------------|-------------|---------|
| `workflow_id` | Unique workflow identifier | `"workflow-expense-approval-001"` |
| `version` | Incremental version number | `1`, `2`, `3` |
| `created_at` | Version creation timestamp | `"2026-01-14T10:00:00Z"` |
| `created_by` | User who created version | `"user-uuid-5678"` |
| `status` | Version status | `DRAFT`, `APPROVED_PENDING_ACTIVATION`, `ACTIVE`, `DEPRECATED` |
| `activation_timestamp` | When version becomes active | `"2026-01-16T10:00:00Z"` (48 hours later) |
| `deprecation_timestamp` | When version becomes inactive | `NULL` (current version) or `"2026-02-01T00:00:00Z"` |

**Request-Workflow Binding**:
- When user submits request (e.g., expense claim), system records `workflow_version_id`
- Request processed using workflow version active at submission time
- Workflow changes do NOT affect in-flight requests

#### 2.2.6 Audit Requirements

All workflow changes MUST be logged with the following metadata:

| Audit Field | Data Type | Description | Example |
|-------------|-----------|-------------|---------|
| `event_id` | UUID | Unique event identifier | `"evt-workflow-uuid-1234"` |
| `timestamp` | ISO 8601 | Change timestamp | `"2026-01-14T10:30:00Z"` |
| `user_id` | UUID | Admin who made change | `"user-uuid-5678"` |
| `tenant_id` | UUID | Tenant context | `"tenant-uuid-9012"` |
| `workflow_id` | UUID | Workflow identifier | `"workflow-expense-approval-001"` |
| `workflow_type` | String | Workflow category | `"EXPENSE_APPROVAL"`, `"LEAVE_APPROVAL"` |
| `version_before` | Integer | Previous version number | `1` |
| `version_after` | Integer | New version number | `2` |
| `change_type` | String | Type of change | `"ADD_APPROVAL_STEP"`, `"MODIFY_SLA"`, `"CHANGE_APPROVER"` |
| `change_summary` | JSON | Detailed before/after comparison | `{"added_step": "Finance Manager approval"}` |
| `justification` | String | Reason for change | `"New financial policy requires dual approval for >50k INR"` |
| `approval_id` | UUID | Approval request ID | `"approval-uuid-4444"` |
| `cooling_period_hours` | Integer | Cooling period applied | `48` |
| `activation_timestamp` | ISO 8601 | When change becomes active | `"2026-01-16T10:30:00Z"` |
| `ip_address` | String | Client IP address | `"192.168.1.100"` |
| `user_agent` | String | Client User-Agent | `"Mozilla/5.0..."` |

**Retention**: Workflow change logs retained for **7 years** per COMPLIANCE_MAPPING.md Section D.

---

### 2.3 System Configuration Changes (Task 0.5.31)

#### 2.3.1 Overview

System configurations control security policies, operational parameters, and service level agreements. This section distinguishes between security-sensitive configurations and operational SLA configurations, each with different authorization requirements.

#### 2.3.2 Security Configuration Categories

**Security configurations** directly affect authentication, authorization, data protection, or compliance:

| Configuration Category | Examples | Impact |
|-----------------------|----------|--------|
| **Password Policy** | Minimum length (12 chars), complexity rules (3/4 categories), lockout threshold (5 attempts) | Controls authentication security per SECURITY_ARCHITECTURE.md Section D |
| **Session Timeout** | Idle timeout (30 min), absolute timeout (12 hours) | Controls session management per SECURITY_ARCHITECTURE.md Section E |
| **JWT Expiry** | Access token expiry (15 min), refresh token expiry (7 days) | Controls authentication token lifetime per SECURITY_ARCHITECTURE.md Section B |
| **Encryption Settings** | Encryption algorithms (AES-256), key rotation schedules (quarterly) | Controls data protection per COMPLIANCE_MAPPING.md Section C |
| **Rate Limiting** | Max API requests per minute (100), max login attempts per 15 min (5) | Controls brute-force attack prevention |
| **CORS Policy** | Allowed origins, allowed methods | Controls cross-origin access security |
| **Audit Log Settings** | Retention period (180 days online, 7 years archived), log level (INFO) | Controls compliance logging per CERT-In |

#### 2.3.3 SLA Configuration Categories

**SLA configurations** define operational performance targets and escalation rules:

| Configuration Category | Examples | Impact |
|-----------------------|----------|--------|
| **Complaint Response Times** | Initial response (8 hours), resolution (72 hours) | Controls client-facing SLA compliance |
| **Task Escalation Rules** | Overdue threshold (24 hours), escalation recipient (manager) | Controls operational escalation |
| **Training Enrollment Deadlines** | Enrollment window (14 days before session), cancellation deadline (48 hours) | Controls training program operations |
| **Expense Approval SLA** | Manager approval deadline (48 hours), finance approval deadline (72 hours) | Controls financial operations |
| **Leave Request SLA** | Manager response deadline (24 hours) | Controls HR operations |

#### 2.3.4 Authorization Matrix

| Configuration Type | Authorized Roles | Approval Required? | Rationale |
|-------------------|------------------|-------------------|-----------|
| **Security Configurations** | SYSTEM_ADMIN + Product Owner | ✅ Yes (dual approval) | High security impact requires executive approval |
| **Expense SLA Configurations** | FINANCE_ADMIN | ❌ No (single approval) | Domain admin has operational authority |
| **Leave SLA Configurations** | HR_ADMIN | ❌ No (single approval) | Domain admin has operational authority |
| **Task SLA Configurations** | SYSTEM_ADMIN | ❌ No (single approval) | Operational configuration within system scope |
| **Training SLA Configurations** | TRAINING_ADMIN | ❌ No (single approval) | Domain admin has operational authority |
| **Complaint SLA Configurations** | SYSTEM_ADMIN | ❌ No (single approval) | Client-facing SLA requires system-level control |

**Dual Approval Workflow for Security Configurations**:
```
1. SYSTEM_ADMIN submits security configuration change request
2. System creates approval request routed to Product Owner
3. Product Owner reviews impact and approves/rejects
4. If approved: Change applied with audit log
5. If rejected: Requestor notified with reason
6. All steps logged in audit trail
```

#### 2.3.5 Configuration Change Validation

Before applying any configuration change, the system MUST validate:

| Validation Check | Examples | Error Handling |
|-----------------|----------|----------------|
| **Value Range Validation** | Password min length >= 8, session timeout <= 24 hours | Reject with 400 Bad Request |
| **Security Policy Compliance** | Cannot reduce password strength below baseline | Reject with 403 Forbidden |
| **Operational Feasibility** | Cannot set complaint response SLA to 0 hours | Reject with 400 Bad Request |
| **Dependency Validation** | Idle timeout must be < absolute timeout | Reject with 400 Bad Request |
| **Regulatory Compliance** | Log retention >= 180 days (CERT-In requirement) | Reject with 403 Forbidden |

#### 2.3.6 Configuration Versioning

All configuration changes MUST use versioning:

| Version Attribute | Description | Example |
|------------------|-------------|---------|
| `config_key` | Configuration identifier | `"password_policy.min_length"` |
| `config_value` | Configuration value | `"12"` |
| `version` | Incremental version number | `1`, `2`, `3` |
| `effective_from` | When configuration becomes active | `"2026-01-14T10:00:00Z"` |
| `effective_until` | When configuration becomes inactive | `NULL` (current) or `"2026-02-01T00:00:00Z"` |
| `changed_by` | User who made change | `"user-uuid-5678"` |
| `approval_id` | Approval request ID (if applicable) | `"approval-uuid-4444"` |

**Configuration Retrieval**:
```python
def get_config(config_key, timestamp=None):
    """
    Retrieve configuration value effective at given timestamp.
    If timestamp is None, return current active value.
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    return db.query(Config).filter(
        Config.config_key == config_key,
        Config.effective_from <= timestamp,
        (Config.effective_until.is_(None) | (Config.effective_until > timestamp))
    ).order_by(Config.version.desc()).first()
```

#### 2.3.7 Audit Requirements

All configuration changes MUST be logged with the following metadata (see Section 2.4 for full audit field specification).

**Retention**: Configuration change logs retained for **7 years** per COMPLIANCE_MAPPING.md Section D.

---

### 2.4 Configuration Change Audit Rules (Task 0.5.32)

#### 2.4.1 Overview

All configuration changes MUST be audited with comprehensive metadata to support compliance, forensics, and accountability. This section defines mandatory audit fields, retention periods, and immutability guarantees.

#### 2.4.2 Minimum Audit Fields (15 Required)

Every configuration change audit log MUST include the following 15 fields:

| # | Field Name | Data Type | Description | Example |
|---|------------|-----------|-------------|---------|
| 1 | `user_id` | UUID | User who made change | `"user-uuid-5678"` |
| 2 | `tenant_id` | UUID | Tenant context | `"tenant-uuid-9012"` |
| 3 | `timestamp` | ISO 8601 | Change timestamp (UTC) | `"2026-01-14T10:30:00.123Z"` |
| 4 | `config_key` | String | Configuration identifier | `"password_policy.min_length"` |
| 5 | `old_value` | String/JSON | Value before change | `"10"` |
| 6 | `new_value` | String/JSON | Value after change | `"12"` |
| 7 | `change_type` | Enum | Type of change | `CREATE`, `UPDATE`, `DELETE`, `RESTORE` |
| 8 | `justification` | String | Reason for change | `"Increase password security baseline"` |
| 9 | `approval_id` | UUID (nullable) | Approval request ID if applicable | `"approval-uuid-4444"` |
| 10 | `ip_address` | String | Client IP address | `"192.168.1.100"` |
| 11 | `user_agent` | String | Client User-Agent | `"Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."` |
| 12 | `session_id` | UUID | Session identifier | `"session-uuid-7890"` |
| 13 | `entity_type` | String | Entity category | `"security_config"`, `"sla_config"`, `"workflow"`, `"hierarchy"` |
| 14 | `entity_id` | UUID | Entity identifier | `"config-uuid-1111"` |
| 15 | `is_security_sensitive` | Boolean | Flags security-related changes | `true` (for password policy), `false` (for SLA config) |

**Optional Fields** (Recommended for Enhanced Audit):

| Field Name | Data Type | Description | Example |
|------------|-----------|-------------|---------|
| `correlation_id` | UUID | Links related changes across services | `"corr-uuid-2222"` |
| `change_source` | String | API endpoint or admin UI | `"/api/v1/config/password-policy"` |
| `rollback_available` | Boolean | Whether change can be rolled back | `true` |
| `risk_level` | Enum | Risk assessment | `HIGH`, `MEDIUM`, `LOW` |
| `compliance_tags` | Array[String] | Compliance frameworks affected | `["CERT-In", "DPDP Act"]` |

#### 2.4.3 Audit Field Specifications

**Field-Level Rules**:

| Field | Validation | Constraints | Notes |
|-------|-----------|-------------|-------|
| `user_id` | Must reference valid user | Foreign key to users table | Cannot be NULL |
| `tenant_id` | Must reference valid tenant | Foreign key to tenants table | Cannot be NULL |
| `timestamp` | Must be ISO 8601 UTC | Precision: milliseconds | System-generated (not client-provided) |
| `config_key` | Must follow naming convention | Format: `category.subcategory.parameter` | Example: `session.timeout.idle_minutes` |
| `old_value` | Stored as JSON for complex objects | Max size: 10 KB | NULL if CREATE operation |
| `new_value` | Stored as JSON for complex objects | Max size: 10 KB | NULL if DELETE operation |
| `change_type` | Must be valid enum | Values: `CREATE`, `UPDATE`, `DELETE`, `RESTORE` | Cannot be NULL |
| `justification` | Required for security-sensitive changes | Min length: 20 chars for security changes | Cannot be NULL for `is_security_sensitive=true` |
| `approval_id` | Required if approval workflow triggered | Foreign key to approval_requests table | NULL if no approval required |
| `ip_address` | Must be valid IPv4 or IPv6 | Format: `x.x.x.x` or IPv6 notation | Cannot be NULL |
| `user_agent` | Full User-Agent string | Max length: 500 chars | Cannot be NULL |
| `session_id` | Must reference active session | Foreign key to sessions table | Cannot be NULL |
| `entity_type` | Must be valid entity category | Values: `security_config`, `sla_config`, `workflow`, `hierarchy`, `approval_workflow` | Cannot be NULL |
| `entity_id` | Must reference valid entity | Foreign key to respective entity table | Cannot be NULL |
| `is_security_sensitive` | Boolean flag for security review | Values: `true`, `false` | Triggers enhanced monitoring if `true` |

#### 2.4.4 Retention Period

**7-Year Retention Requirement**:

All configuration change audit logs MUST be retained for **7 years** minimum, aligned with CERT-In and IT Act compliance requirements per COMPLIANCE_MAPPING.md Section D.

| Retention Phase | Duration | Storage Location | Access Control |
|----------------|----------|------------------|----------------|
| **Online (Hot)** | 180 days | PostgreSQL primary database | SYSTEM_ADMIN, audit queries |
| **Warm Archive** | 6.5 years (remaining) | Cold storage (S3 Glacier or equivalent) | SYSTEM_ADMIN with justification, compliance audits |
| **After 7 Years** | Indefinite (optional) | Archived for historical reference | Restricted to compliance officer only |

**Implementation**:
- Celery scheduled task runs daily at 02:00 UTC
- Archives audit logs older than 180 days to cold storage (S3 Glacier, India region)
- Maintains index for efficient retrieval during compliance audits
- Never deletes audit logs (immutability principle)

#### 2.4.5 Immutability Guarantees

**Append-Only Audit Logs**:

Configuration change audit logs are **strictly append-only** with the following guarantees:

| Immutability Rule | Implementation | Enforcement |
|------------------|---------------|-------------|
| **No Updates** | Audit log records cannot be modified after creation | Database trigger rejects UPDATE statements on audit tables |
| **No Deletes** | Audit log records cannot be deleted | Database trigger rejects DELETE statements on audit tables |
| **Append-Only** | Only INSERT operations permitted | Application layer enforces insert-only; no update/delete APIs |
| **Tamper Detection** | Cryptographic hash chain for integrity verification | Each log entry includes hash of previous entry (blockchain-style) |

**Database Trigger for Immutability** (PostgreSQL):
```sql
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Audit logs are immutable. Updates are not permitted.';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit logs are immutable. Deletes are not permitted.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_audit_log
BEFORE UPDATE OR DELETE ON config_change_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
```

**Hash Chain Implementation**:
```python
import hashlib

def create_audit_log_entry(user_id, config_key, old_value, new_value, ...):
    """
    Create audit log entry with hash chain for tamper detection.
    """
    # Retrieve hash of most recent audit log entry
    previous_hash = get_latest_audit_log_hash(tenant_id)

    # Create audit log record
    audit_entry = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "timestamp": datetime.utcnow().isoformat(),
        "config_key": config_key,
        "old_value": old_value,
        "new_value": new_value,
        # ... all 15 mandatory fields ...
        "previous_hash": previous_hash
    }

    # Calculate hash of current entry
    entry_json = json.dumps(audit_entry, sort_keys=True)
    current_hash = hashlib.sha256(entry_json.encode()).hexdigest()
    audit_entry["entry_hash"] = current_hash

    # Insert into database
    db.insert("config_change_audit_logs", audit_entry)

    return audit_entry
```

#### 2.4.6 Audit Log Retrieval and Reporting

**Query API**:
- Endpoint: `GET /api/v1/audit/config-changes`
- Authorization: SYSTEM_ADMIN, compliance officer
- Query Parameters: `start_date`, `end_date`, `entity_type`, `is_security_sensitive`, `user_id`, `config_key`
- Response Format: JSON array of audit log entries

**Compliance Reporting**:
- Monthly summary report: All security-sensitive configuration changes
- Quarterly compliance audit: Full export of all configuration change logs
- Incident response: Ad-hoc queries for forensic investigation

**Audit Log Export**:
- Format: JSON, CSV, or PDF
- Encryption: AES-256 for exported files
- Access Control: Audit log exports require dual approval (SYSTEM_ADMIN + Product Owner)

---

## 3. Environment Management

### 3.1 Environment Separation (Task 0.5.33)

#### 3.1.1 Overview

MindFlow maintains three distinct environments for secure software development lifecycle: Development, Staging, and Production. Each environment is logically and physically isolated to prevent cross-contamination, data leakage, and unauthorized access.

#### 3.1.2 Environment Definitions

**Three-Environment Architecture**:

| Environment | Purpose | Data Characteristics | Access Control |
|------------|---------|---------------------|----------------|
| **Development** | Active development, feature implementation, unit testing | Synthetic test data, anonymized datasets, no real PII | Developers, QA engineers |
| **Staging** | Integration testing, UAT, pre-production validation | Anonymized production-like data, realistic volumes | QA engineers, product team, limited developer access |
| **Production** | Live customer operations | Real customer data, full PII, financial records | Operations team, on-call engineers (with MFA), restricted admin access |

#### 3.1.3 Network Isolation

**Separate VPCs/Subnets**:

Each environment MUST be deployed in separate Virtual Private Clouds (VPCs) or network segments with the following isolation controls:

| Isolation Control | Implementation | Enforcement |
|------------------|---------------|-------------|
| **Separate VPC per Environment** | Dev VPC, Staging VPC, Production VPC (AWS) or equivalent (Azure VNets, GCP VPCs) | Cloud infrastructure-as-code (Terraform/CloudFormation) |
| **Private Subnets** | Backend services in private subnets (no direct internet access) | Network ACLs, security groups |
| **Separate Database Instances** | Dedicated PostgreSQL instance per environment | No shared database connections |
| **Separate Redis Instances** | Dedicated Redis instance per environment | No shared cache |
| **Separate Object Storage Buckets** | Dedicated MinIO/S3 bucket per environment (dev-mindflow-storage, staging-mindflow-storage, prod-mindflow-storage) | IAM policies, bucket policies |
| **Network Firewall Rules** | No network connectivity between dev/staging and production | Security groups, NACLs, firewall rules |

**Exception**: Limited one-way connectivity from production to staging for data anonymization pipeline (see Section 3.1.4).

**Network Diagram** (Conceptual):
```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION VPC                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Frontend   │   │   Backend    │   │   Database   │   │
│  │   (Public)   │──▶│  (Private)   │──▶│   (Private)  │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                             │
│  Access: MFA required, limited personnel                   │
└─────────────────────────────────────────────────────────────┘

                             ▲
                             │ (One-way: Data anonymization)
                             │

┌─────────────────────────────────────────────────────────────┐
│                      STAGING VPC                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Frontend   │   │   Backend    │   │   Database   │   │
│  │   (Public)   │──▶│  (Private)   │──▶│   (Private)  │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                             │
│  Access: QA team, product team, limited developers         │
└─────────────────────────────────────────────────────────────┘

                             ▼
                             ▼

┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT VPC                           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Frontend   │   │   Backend    │   │   Database   │   │
│  │   (Local)    │──▶│  (Private)   │──▶│   (Private)  │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                             │
│  Access: All developers, QA engineers                      │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.4 Data Policies

**Production Data Never Copied to Dev/Staging**:

| Policy | Description | Enforcement |
|--------|-------------|-------------|
| **No Production Data in Dev** | Development environment MUST NOT contain any production data, real PII, or financial records | Automated checks in CI/CD pipeline reject deployments with production data connections |
| **No Production Data in Staging** | Staging environment MUST NOT contain real customer PII or financial records | Data anonymization pipeline required (see below) |
| **Synthetic Test Data for Dev** | Development uses hand-crafted synthetic datasets | Documented test data creation scripts in repository |
| **Anonymized Data for Staging** | Staging uses anonymized, production-like datasets | Automated anonymization pipeline (see below) |

**Data Anonymization Pipeline** (Production → Staging):

If staging requires production-like data volumes for performance testing:

1. **Data Export**: Scheduled export from production database (weekly, off-peak hours)
2. **Anonymization**: PII fields replaced with synthetic data:
   - Names: Replace with generated fake names (Faker library)
   - Emails: Replace with `testuser{id}@staging.mindflow.local`
   - Phone numbers: Replace with `XXXX-XXXX-{random}`
   - Addresses: Replace with generic addresses
   - Financial amounts: Randomize within realistic ranges
   - Dates: Shift by random offset to maintain temporal relationships
3. **Data Validation**: Ensure referential integrity preserved, no PII leaked
4. **Import to Staging**: Load anonymized dataset into staging database
5. **Audit Log**: Record anonymization process with timestamp, record counts, PII fields anonymized

**Implementation** (Pseudocode):
```python
def anonymize_production_data_for_staging():
    """
    Anonymize production data for staging environment.
    """
    # Export production data (read-only replica)
    prod_data = export_from_production_replica()

    # Anonymize PII fields
    anonymized_data = anonymize_pii_fields(prod_data, {
        "employees.name": generate_fake_name,
        "employees.email": lambda: f"testuser{uuid.uuid4()}@staging.mindflow.local",
        "employees.phone": lambda: f"XXXX-XXXX-{random.randint(1000, 9999)}",
        "expenses.amount": lambda amount: randomize_amount(amount, variance=0.2),
        # ... all PII fields ...
    })

    # Validate no PII leaked
    validate_no_pii(anonymized_data)

    # Import to staging
    import_to_staging(anonymized_data)

    # Audit log
    log_anonymization_event(record_count=len(anonymized_data))
```

#### 3.1.5 Access Control

**Environment-Specific Access Policies**:

| Environment | Access Requirements | Credential Management | Monitoring |
|------------|--------------------|-----------------------|-----------|
| **Development** | Developer credentials (SSH keys, VPN) | Stored in developer workstations, rotated annually | Basic logging (application logs) |
| **Staging** | QA team credentials, limited developer access | Separate credentials per environment, rotated quarterly | Enhanced logging (access logs, API logs) |
| **Production** | **MFA required**, on-call engineers only, break-glass emergency access | Separate credentials, rotated quarterly, privileged access management (PAM) | **Full audit logging**, real-time monitoring, SIEM integration |

**Production MFA Requirement**:

All production access MUST require multi-factor authentication (MFA):

| Access Type | MFA Method | Enforcement |
|------------|------------|-------------|
| **SSH to Production Servers** | SSH key + TOTP (Google Authenticator, Authy) | SSH configuration: `AuthenticationMethods publickey,keyboard-interactive` |
| **Production Database Access** | Database password + TOTP | Database proxy enforces MFA (e.g., Teleport, StrongDM) |
| **AWS Console Access (Production Account)** | IAM password + TOTP/U2F | IAM policy: `Require MFA for all actions` |
| **Kubernetes Cluster Access (Production)** | kubectl config + TOTP | OIDC provider with MFA enforcement |

**Separate Credentials Per Environment**:

| Credential Type | Development | Staging | Production | Rotation Schedule |
|----------------|-------------|---------|-----------|------------------|
| **Database Password** | `dev-db-password` | `staging-db-password` | `prod-db-password` | Quarterly (90 days) |
| **Redis Password** | `dev-redis-password` | `staging-redis-password` | `prod-redis-password` | Quarterly (90 days) |
| **JWT Signing Secret** | `dev-jwt-secret` | `staging-jwt-secret` | `prod-jwt-secret` | Annually (365 days) |
| **MinIO/S3 Access Keys** | `dev-minio-access-key` | `staging-minio-access-key` | `prod-minio-access-key` | Quarterly (90 days) |
| **API Keys (External Services)** | `dev-api-key` | `staging-api-key` | `prod-api-key` | Quarterly (90 days) |

**Credential Storage**:
- Development: Environment variables in `.env` file (not committed to repository)
- Staging: Environment variables managed by CI/CD pipeline (GitHub Secrets, GitLab CI/CD Variables)
- Production: AWS Secrets Manager / Azure Key Vault / HashiCorp Vault (see Section 3.2)

#### 3.1.6 Deployment Promotion Policy

**One-Way Deployment Flow**:

Changes MUST flow through environments in this order:

```
Development → Staging → Production
```

| Promotion Stage | Approval Required? | Testing Required? | Rollback Plan? |
|----------------|-------------------|------------------|----------------|
| **Dev → Staging** | No (automatic via CI/CD) | ✅ Yes (unit tests, integration tests) | Rollback to previous commit |
| **Staging → Production** | ✅ Yes (QA sign-off + Product Owner approval) | ✅ Yes (UAT, performance testing, security testing) | Rollback to previous release (blue-green deployment) |

**Production Deployment Approval**:
1. QA team completes UAT in staging
2. QA lead signs off on deployment
3. Product Owner reviews release notes and approves
4. DevOps engineer executes deployment during maintenance window
5. Post-deployment smoke tests validate production health
6. If smoke tests fail: Immediate rollback to previous version

---

### 3.2 Secrets Management and Rotation (Task 0.5.34)

#### 3.2.1 Overview

Secrets (database passwords, API keys, encryption keys, service tokens) are high-value attack targets requiring secure storage, access control, and regular rotation. This section defines secret categories, storage methods, rotation schedules, and emergency procedures.

#### 3.2.2 Secret Categories

**Four Primary Secret Categories**:

| Category | Examples | Sensitivity | Rotation Frequency |
|----------|----------|-------------|-------------------|
| **Database Credentials** | PostgreSQL password, Redis password | CRITICAL | Quarterly (90 days) |
| **API Keys** | External service API keys (future: payment gateway, email service) | HIGH | Quarterly (90 days) |
| **Encryption Keys** | AES-256 data encryption keys, JWT signing secret | CRITICAL | Annually (365 days) with versioned re-encryption |
| **Service Tokens** | Service-to-service authentication tokens, Celery broker credentials | HIGH | On compromise or role change |

#### 3.2.3 Storage Methods

**Phase 1 (Development, Staging)**:

| Environment | Storage Method | Access Control | Rationale |
|------------|---------------|----------------|-----------|
| **Development** | Environment variables in `.env` file | File system permissions (chmod 600) | Simple for local development |
| **Staging** | CI/CD pipeline secrets (GitHub Secrets, GitLab CI/CD Variables) | Repository admin access only | Integrated with deployment pipeline |

**Production (Current and Future)**:

| Phase | Storage Method | Access Control | Rationale |
|-------|---------------|----------------|-----------|
| **Phase 1 (Interim)** | Environment variables (Kubernetes Secrets, Docker Secrets) | Namespace RBAC, encrypted at rest | Simple initial deployment |
| **Production (Target)** | AWS Secrets Manager / Azure Key Vault / HashiCorp Vault | IAM policies, audit logging, automatic rotation | Industry best practice for production |

**Secrets Manager Implementation** (AWS Secrets Manager Example):

```python
import boto3
import json

def get_secret(secret_name, region_name="ap-south-1"):
    """
    Retrieve secret from AWS Secrets Manager.
    """
    client = boto3.client("secretsmanager", region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response["SecretString"])
        return secret
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {e}")
        raise

# Usage in application startup
db_credentials = get_secret("prod/mindflow/database")
DATABASE_URL = f"postgresql://{db_credentials['username']}:{db_credentials['password']}@{db_credentials['host']}:{db_credentials['port']}/{db_credentials['database']}"
```

#### 3.2.4 Rotation Schedules

**Quarterly Rotation (90 Days)**:

| Secret Category | Rotation Frequency | Automation | Downtime Required? |
|----------------|-------------------|------------|-------------------|
| **Production Database Passwords** | Every 90 days | Automated via Secrets Manager rotation | No (graceful transition) |
| **API Keys** | Every 90 days | Manual rotation with key overlap period | No (dual-key period) |
| **Redis Password** | Every 90 days | Automated via Secrets Manager rotation | No (graceful transition) |
| **MinIO/S3 Access Keys** | Every 90 days | Manual rotation with key overlap period | No (dual-key period) |

**Annual Rotation (365 Days)**:

| Secret Category | Rotation Frequency | Automation | Downtime Required? |
|----------------|-------------------|------------|-------------------|
| **Encryption Keys (AES-256)** | Every 365 days | Automated with versioned re-encryption | No (gradual re-encryption) |
| **JWT Signing Secret** | Every 365 days | Manual rotation during maintenance window | Yes (all sessions invalidated) |

**On-Demand Rotation**:

| Secret Category | Rotation Trigger | Response Time | Procedure |
|----------------|-----------------|---------------|-----------|
| **Service Tokens** | Compromise detected or role change | Within 1 hour | Emergency rotation procedure (see Section 3.2.6) |
| **All Secrets** | Security incident or suspected breach | Within 1 hour | Emergency rotation procedure (see Section 3.2.6) |

#### 3.2.5 Rotation Procedures

**Database Password Rotation** (Zero-Downtime):

1. **Pre-Rotation**:
   - Generate new password (strong random password, 32 characters)
   - Store new password in Secrets Manager as version 2

2. **Rotation**:
   - Update database user password: `ALTER USER mindflow_app WITH PASSWORD 'new_password';`
   - Application retrieves new password from Secrets Manager
   - New connections use new password
   - Existing connections continue with old password (graceful transition)

3. **Post-Rotation**:
   - Monitor connection success rate
   - After 24 hours: Confirm no errors, mark rotation successful
   - Old password version archived (not deleted)

**Encryption Key Rotation** (Versioned Re-Encryption):

MindFlow uses **envelope encryption** with key versioning:

1. **Key Structure**:
   - Master key (KEK - Key Encryption Key): Rotated annually
   - Data encryption keys (DEK - Data Encryption Key): Unique per encrypted field, encrypted by KEK

2. **Rotation Process**:
   - Generate new KEK (version 2)
   - Re-encrypt all DEKs with new KEK
   - Update key version reference in database
   - Gradual re-encryption of data (background job)

3. **Implementation**:
   ```python
   def rotate_encryption_key():
       """
       Rotate master encryption key (KEK) and re-encrypt all DEKs.
       """
       # Generate new KEK
       new_kek = generate_aes_256_key()
       store_kek_in_secrets_manager(new_kek, version=2)

       # Retrieve all DEKs encrypted with old KEK
       old_deks = get_all_deks(kek_version=1)

       # Re-encrypt DEKs with new KEK
       for dek in old_deks:
           decrypted_dek = decrypt_with_kek(dek, kek_version=1)
           re_encrypted_dek = encrypt_with_kek(decrypted_dek, kek_version=2)
           update_dek_in_database(dek.id, re_encrypted_dek, kek_version=2)

       # Mark old KEK as deprecated (not deleted, for decryption of old data)
       deprecate_kek(version=1)

       # Background job: Re-encrypt data with new DEKs
       schedule_data_re_encryption_job()
   ```

**JWT Signing Secret Rotation** (Maintenance Window):

1. **Pre-Rotation Communication**:
   - Notify users of scheduled maintenance (24-hour notice)
   - Maintenance window: Low-traffic period (e.g., Sunday 02:00-04:00 IST)

2. **Rotation**:
   - Generate new JWT signing secret (256-bit random key)
   - Store new secret in Secrets Manager
   - Deploy updated configuration with new secret
   - **All existing sessions invalidated** (users must re-login)
   - Restart all backend services to load new secret

3. **Post-Rotation**:
   - Monitor authentication success rate
   - Support team available for user assistance
   - Document rotation in audit log

#### 3.2.6 Emergency Rotation Procedure

**Trigger**: Suspected secret compromise (e.g., exposed in logs, leaked to public repository, unauthorized access detected)

**Response Time**: Within 1 hour of detection

**Procedure**:

1. **Immediate Actions** (Within 15 minutes):
   - Incident responder confirms compromise
   - Escalate to on-call security engineer and Product Owner
   - Execute emergency rotation playbook

2. **Secret Rotation** (Within 30 minutes):
   - Generate new secret (strong random generation)
   - Store new secret in Secrets Manager
   - Update application configuration (emergency deployment)
   - Revoke compromised secret (mark as invalid, delete from storage)

3. **Impact Mitigation** (Within 1 hour):
   - If database password compromised: Rotate immediately, monitor for unauthorized queries
   - If API key compromised: Revoke with external service provider, generate new key
   - If JWT secret compromised: Invalidate all sessions, force user re-authentication
   - If encryption key compromised: Rotate key, re-encrypt all data with new key

4. **Post-Incident** (Within 24 hours):
   - Root cause analysis: How was secret compromised?
   - Implement corrective actions (e.g., remove secret from logs, fix code)
   - Document incident in security incident log
   - Notify affected stakeholders if data breach occurred
   - File CERT-In incident report if required (within 6 hours)

**Emergency Rotation Checklist**:

| Action | Responsible | Completed? |
|--------|------------|-----------|
| Confirm compromise | Incident responder | ☐ |
| Escalate to security team | Incident responder | ☐ |
| Generate new secret | DevOps engineer | ☐ |
| Deploy new secret | DevOps engineer | ☐ |
| Revoke old secret | DevOps engineer | ☐ |
| Monitor for unauthorized access | Security engineer | ☐ |
| Root cause analysis | Security engineer | ☐ |
| Implement corrective actions | Development team | ☐ |
| Document incident | Security engineer | ☐ |
| CERT-In report (if applicable) | Compliance officer | ☐ |

#### 3.2.7 Secrets Audit and Monitoring

**Secrets Access Logging**:

All secret retrievals MUST be logged:

| Log Field | Description | Example |
|-----------|-------------|---------|
| `timestamp` | Access timestamp | `"2026-01-14T10:30:00Z"` |
| `user_id` | User or service account | `"service-account-backend"` |
| `secret_name` | Secret identifier | `"prod/mindflow/database"` |
| `access_type` | Access method | `"READ"`, `"ROTATE"`, `"DELETE"` |
| `ip_address` | Client IP | `"10.0.1.50"` (internal service IP) |
| `success` | Access success/failure | `true` or `false` |
| `failure_reason` | Reason for failure (if applicable) | `"Insufficient permissions"` |

**Secrets Rotation Monitoring**:

- Automated alerts: Secrets approaching rotation deadline (7 days before)
- Dashboard: Secrets rotation status (last rotated, next rotation due)
- Monthly report: All secrets rotated, rotation delays, failed rotations

**Secrets Security Review**:

- Quarterly audit: Review all secrets access logs for anomalies
- Annual audit: Review secrets rotation compliance, access control policies
- Penetration testing: Attempt to extract secrets from running systems

---

## 4. Compliance Mapping (Task 0.5.35)

### 4.1 Overview

This section maps the Secure SDLC and Change Control policies defined in this document to regulatory compliance requirements documented in COMPLIANCE_MAPPING.md.

### 4.2 DPDP Act 2023 Alignment

| DPDP Act Requirement | Secure SDLC Control | Implementation |
|---------------------|-------------------|----------------|
| **Section 8: Data Security Safeguards** | Environment separation, secrets management, encryption key rotation | Production data isolated from dev/staging; encryption keys rotated annually |
| **Section 8: Reasonable Security Practices** | Configuration change audit rules, immutable audit logs | All security configuration changes audited; logs retained 7 years |
| **Section 8: Access Limitation** | Production MFA requirement, separate credentials per environment | MFA mandatory for production access; credentials never shared across environments |
| **Section 11: Data Principal Rights (Audit Trail)** | Configuration change audit logs | All system changes audited to support data principal rights investigations |

### 4.3 CERT-In Directions 2022 Alignment

| CERT-In Requirement | Secure SDLC Control | Implementation |
|--------------------|-------------------|----------------|
| **Direction 4: Log Retention (180 Days)** | Configuration change audit rules (180 days online, 7 years archived) | Audit logs retained 180 days in PostgreSQL, 7 years in cold storage |
| **Direction 5: Incident Reporting (6 Hours)** | Emergency secrets rotation procedure | Compromised secrets rotated within 1 hour; incident reported to CERT-In within 6 hours |
| **Direction 6: Time Synchronization** | Audit log timestamp precision | All audit logs use ISO 8601 UTC timestamps with millisecond precision; NTP synchronization enforced |

### 4.4 IT Act 2000 Alignment

| IT Act Provision | Secure SDLC Control | Implementation |
|-----------------|-------------------|----------------|
| **Section 43A: Reasonable Security Practices** | Comprehensive change control policies, secrets management, environment separation | Formal approval processes for critical changes; secrets stored securely and rotated regularly |
| **Section 72A: Unauthorized Disclosure** | Separate credentials per environment, production MFA, audit logs | Production secrets never used in dev/staging; all access audited |

### 4.5 IT Rules 2011 Alignment

| IT Rules Requirement | Secure SDLC Control | Implementation |
|---------------------|-------------------|----------------|
| **Rule 4: Security Practices and Procedures** | Documented change control policies, audit requirements | This document defines comprehensive security practices for system changes |
| **Rule 5: Sensitive Personal Data Protection** | Encryption key rotation (annually), secrets management | Encryption keys protecting financial data and passwords rotated annually |

### 4.6 Compliance Summary Table

| Regulation | Compliant Controls | Non-Compliant Risks Mitigated |
|-----------|-------------------|------------------------------|
| **DPDP Act 2023** | Environment separation, audit logs, access control | Unauthorized access to production data, data breach |
| **CERT-In 2022** | Log retention (180 days + 7 years), incident response | Non-compliance penalties, inability to investigate incidents |
| **IT Act 2000** | Change control, secrets management | Unauthorized access, data tampering |
| **IT Rules 2011** | Documented security practices, encryption key rotation | Sensitive data exposure, non-compliance with reasonable security practices |

---

## 5. Dependencies

### 5.1 Prerequisite Documents

This policy depends on the following approved documents:

| Document | Version | Dependency |
|----------|---------|------------|
| **SECURITY_ARCHITECTURE.md** | 1.0 (APPROVED) | RBAC roles (HR_ADMIN, SYSTEM_ADMIN, FINANCE_ADMIN, TRAINING_ADMIN, MANAGER, EMPLOYEE), authentication model (JWT), session management |
| **COMPLIANCE_MAPPING.md** | 1.0 (APPROVED) | Regulatory requirements (DPDP Act, CERT-In, IT Act, IT Rules), data retention periods (7 years), audit log requirements (180 days) |
| **PRD.md** | 1.0 | Business requirements, hierarchy backbone principle, immutability principle ("history is immutable") |
| **CROSS_CUTTING_AND_RULES.md** | 1.0 | Rule 2 (Hierarchy is backbone), Rule 9 (Soft delete before hard delete) |
| **TECH_STACK.md** | 1.0 | Technology choices (PostgreSQL, Redis, MinIO, Celery), JWT authentication, bcrypt password hashing |

### 5.2 Related Policies (Future)

The following policies will reference this document:

| Policy | Phase | Dependency |
|--------|-------|------------|
| **Incident Response Plan** | Phase 0.5 Group 4 | Emergency secrets rotation procedure, CERT-In incident reporting |
| **Business Continuity Plan** | Phase 0.5 Group 4 | Environment separation, backup and recovery procedures |
| **Developer Onboarding Guide** | Phase 1 | Environment access control, secrets management for local development |
| **Operations Runbook** | Phase 1 | Secrets rotation procedures, configuration change workflows |

---

## 6. Approval Record

### 6.1 Approval Status

| Role | Name | Status | Date | Signature |
|------|------|--------|------|-----------|
| **Product Owner** | [Name] | PENDING | - | Awaiting approval for Phase 0.5 Group 3 (Tasks 0.5.29-0.5.35) |
| **Security Lead** | [Name] | PENDING | - | Security review pending |
| **Compliance Officer** | [Name] | PENDING | - | Compliance review pending |
| **Development Lead** | [Name] | PENDING | - | Technical review pending |

### 6.2 Review Notes

**Pre-Approval Checklist**:

- ☐ All 7 tasks (0.5.29-0.5.35) comprehensively covered
- ☐ Cross-references to SECURITY_ARCHITECTURE.md validated
- ☐ Cross-references to COMPLIANCE_MAPPING.md validated
- ☐ Compliance mappings verified against DPDP Act, CERT-In, IT Act, IT Rules
- ☐ Authorized roles aligned with RBAC definitions in SECURITY_ARCHITECTURE.md
- ☐ Audit requirements aligned with 7-year retention and CERT-In 180-day requirement
- ☐ Environment separation policies defined for Dev, Staging, Production
- ☐ Secrets management and rotation schedules defined (quarterly, annually, on-demand)
- ☐ Emergency rotation procedure defined (1-hour response time)

### 6.3 Next Steps

1. **Product Owner Review**: Review and approve all 7 tasks (0.5.29-0.5.35)
2. **Security Team Review**: Validate security controls, rotation schedules, and emergency procedures
3. **Compliance Review**: Validate alignment with DPDP Act, CERT-In, IT Act, IT Rules
4. **Technical Review**: Validate implementation feasibility and technology alignment
5. **Phase 0.5 Group 4**: Proceed to Incident Response and Business Continuity planning

---

## 7. Document Change Control

| Version | Date | Author | Changes | Approval Status |
|---------|------|--------|---------|----------------|
| 1.0 | 2026-01-14 | Development Team | Initial draft - Phase 0.5 Group 3 (Tasks 0.5.29-0.5.35) | DRAFT |

**Change Log**:
- **v1.0** (2026-01-14): Initial comprehensive Secure SDLC & Change Control Policy created, covering organizational hierarchy changes, approval workflow changes, system configuration changes, configuration change audit rules, environment separation, secrets management and rotation, and compliance mapping. Cross-referenced SECURITY_ARCHITECTURE.md and COMPLIANCE_MAPPING.md.

---

**Document End**

**Total Sections**: 7 main sections (Introduction, Change Control, Environment Management, Compliance Mapping, Dependencies, Approval, Change Control)
**Total Subsections**: 30+ detailed subsections
**Total Tables**: 40+ detailed tables and matrices
**Compliance Coverage**: DPDP Act 2023, CERT-In Directions 2022, IT Act 2000, IT Rules 2011
**Technology Alignment**: PostgreSQL, Redis, MinIO, Celery, AWS Secrets Manager/Azure Key Vault

This document serves as the comprehensive Secure SDLC & Change Control Policy for the MindFlow platform Phase 0.5 Group 3 implementation.
