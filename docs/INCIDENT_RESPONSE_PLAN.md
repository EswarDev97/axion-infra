# MindFlow Logging & Incident Response Plan

## Document Control
| Property | Value |
|----------|-------|
| Document ID | MF-IRP-001 |
| Version | 1.0 |
| Status | DRAFT - Pending Product Owner Approval |
| Created Date | 2026-01-14 |
| Phase Coverage | Phase 0.5 - Group 3 (Tasks 0.5.36-0.5.42) |
| Related Documents | COMPLIANCE_MAPPING.md, DATA_PROTECTION_DESIGN.md, SECURITY_ARCHITECTURE.md |

## Table of Contents
1. [Introduction](#1-introduction)
2. [Logging Strategy](#2-logging-strategy)
   - 2.1 [Required Log Types (Task 0.5.36)](#21-required-log-types-task-0536)
   - 2.2 [Log Retention Policy (Task 0.5.37)](#22-log-retention-policy-task-0537)
3. [Monitoring and Alerting](#3-monitoring-and-alerting)
   - 3.1 [Alerting Thresholds (Task 0.5.38)](#31-alerting-thresholds-task-0538)
4. [Incident Response](#4-incident-response)
   - 4.1 [Severity Classification (Task 0.5.39)](#41-severity-classification-task-0539)
   - 4.2 [Response Process (Task 0.5.40)](#42-response-process-task-0540)
   - 4.3 [CERT-In Reporting Readiness (Task 0.5.41)](#43-cert-in-reporting-readiness-task-0541)
5. [Compliance Mapping (Task 0.5.42)](#5-compliance-mapping-task-0542)
6. [Dependencies](#6-dependencies)
7. [Approval Record](#7-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the comprehensive logging, monitoring, and incident response framework for the MindFlow platform. It defines operational procedures to ensure:

- **Regulatory Compliance**: CERT-In Directions 2022 (180-day log retention, 6-hour incident reporting)
- **Security Incident Detection**: Real-time monitoring and alerting for security threats
- **Forensic Readiness**: Detailed audit trails for investigation and compliance
- **Business Continuity**: Rapid incident containment and recovery procedures

### 1.2 Scope

This document covers Phase 0.5 Group 3 tasks (0.5.36 through 0.5.42):

- **Task 0.5.36**: Required log types with structured JSON format
- **Task 0.5.37**: Log retention policies (online and archived)
- **Task 0.5.38**: Alerting thresholds with specific metrics
- **Task 0.5.39**: Incident severity classification and SLAs
- **Task 0.5.40**: 5-phase incident response process
- **Task 0.5.41**: CERT-In reporting readiness procedures
- **Task 0.5.42**: Compliance mapping to regulations

### 1.3 Context

As documented in [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md), MindFlow must comply with:

- **CERT-In Directions 2022**: 180-day online log retention, 6-hour incident reporting
- **Information Technology Act 2000**: Reasonable security practices, audit trails
- **DPDP Act 2023**: Breach notification, data protection

The logging and incident response plan implements technical and procedural controls referenced in [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) and applies redaction rules from [DATA_PROTECTION_DESIGN.md](./DATA_PROTECTION_DESIGN.md).

---

## 2. Logging Strategy

### 2.1 Required Log Types (Task 0.5.36)

All logs MUST be structured in JSON format with UTC timestamps in ISO 8601 format. Redaction rules from [DATA_PROTECTION_DESIGN.md](./DATA_PROTECTION_DESIGN.md) apply: never log passwords, tokens, salary amounts, or full email addresses.

#### 2.1.1 Access Logs

**Purpose**: Track all HTTP requests to API endpoints for security monitoring and CERT-In compliance.

**Required Fields**:

| Field | Type | Description | Redaction Rule | Example |
|-------|------|-------------|----------------|---------|
| `timestamp` | ISO 8601 | Request timestamp (UTC) | None | `"2026-01-14T10:30:45.123Z"` |
| `user_id` | UUID | Authenticated user identifier | None | `"a1b2c3d4-e5f6-4789-0123-456789abcdef"` |
| `tenant_id` | UUID | Tenant identifier | None | `"tenant-uuid-1234"` |
| `ip_address` | String | Client IP address | None | `"192.168.1.100"` |
| `endpoint` | String | API endpoint path | None | `"/api/v1/hr/employees"` |
| `http_method` | String | HTTP method | None | `"GET"` |
| `response_code` | Integer | HTTP status code | None | `200` |
| `response_time` | Integer | Response time in milliseconds | None | `45` |
| `user_agent` | String | Client User-Agent header | Partial (truncate to 255 chars) | `"Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."` |
| `query_params` | Object | URL query parameters | **Redact tokens in query strings** | `{"page": 1, "limit": 20}` |

**Example Access Log**:
```json
{
  "log_type": "access",
  "timestamp": "2026-01-14T10:30:45.123Z",
  "user_id": "a1b2c3d4-e5f6-4789-0123-456789abcdef",
  "tenant_id": "tenant-uuid-1234",
  "ip_address": "192.168.1.100",
  "endpoint": "/api/v1/hr/employees",
  "http_method": "GET",
  "response_code": 200,
  "response_time": 45,
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
  "query_params": {"page": 1, "limit": 20}
}
```

**Storage**: Elasticsearch/OpenSearch for online queries, MinIO for archived logs.

**Retention**: 180 days online (CERT-In), 7 years archived (IT Act compliance per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md)).

#### 2.1.2 Admin Action Logs

**Purpose**: Track all administrative actions for accountability and compliance audits.

**Required Fields**:

| Field | Type | Description | Redaction Rule | Example |
|-------|------|-------------|----------------|---------|
| `timestamp` | ISO 8601 | Action timestamp (UTC) | None | `"2026-01-14T10:35:12.456Z"` |
| `admin_user_id` | UUID | Admin performing action | None | `"admin-uuid-5678"` |
| `action_type` | String | Action code | None | `"UPDATE_EMPLOYEE"` |
| `target_entity_type` | String | Resource type | None | `"employee"` |
| `target_entity_id` | UUID | Resource identifier | None | `"employee-uuid-9012"` |
| `before_value` | Object | State before change (metadata only) | **Field names only, NO values for RESTRICTED data** | `{"fields_changed": ["email", "department"]}` |
| `after_value` | Object | State after change (metadata only) | **Field names only, NO values for RESTRICTED data** | `{"fields_changed": ["email", "department"]}` |
| `justification` | String | Reason for action | None | `"Employee requested email correction"` |
| `ip_address` | String | Admin IP address | None | `"192.168.1.50"` |

**Example Admin Action Log**:
```json
{
  "log_type": "admin_action",
  "timestamp": "2026-01-14T10:35:12.456Z",
  "admin_user_id": "admin-uuid-5678",
  "action_type": "UPDATE_EMPLOYEE",
  "target_entity_type": "employee",
  "target_entity_id": "employee-uuid-9012",
  "before_value": {"fields_changed": ["email", "department"]},
  "after_value": {"fields_changed": ["email", "department"]},
  "justification": "Employee requested email correction",
  "ip_address": "192.168.1.50",
  "result": "success"
}
```

**Critical Redaction Rule**: For RESTRICTED fields (salary, payroll data per [DATA_PROTECTION_DESIGN.md](./DATA_PROTECTION_DESIGN.md)), log **field names only**, NEVER values:
```json
{
  "before_value": {"fields_changed": ["basic_pay", "allowances"]},
  "after_value": {"fields_changed": ["basic_pay", "allowances"]}
}
```

**Storage**: PostgreSQL audit_logs table (primary), replicated to Elasticsearch for search.

**Retention**: 7 years (compliance requirement per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md), Section D).

#### 2.1.3 Authentication Failure Logs

**Purpose**: Detect brute-force attacks, credential stuffing, and account compromise attempts.

**Required Fields**:

| Field | Type | Description | Redaction Rule | Example |
|-------|------|-------------|----------------|---------|
| `timestamp` | ISO 8601 | Failure timestamp (UTC) | None | `"2026-01-14T11:05:33.789Z"` |
| `attempted_email` | String | Email used in login attempt | **Mask email**: `j***@example.com` | `"j***@example.com"` |
| `ip_address` | String | Source IP address | None | `"203.0.113.45"` |
| `failure_reason` | String | Reason code | None | `"INVALID_PASSWORD"` |
| `account_lockout_triggered` | Boolean | Lockout status | None | `false` |
| `attempt_count` | Integer | Failed attempts in time window | None | `3` |
| `user_agent` | String | Client User-Agent | Partial (truncate to 255 chars) | `"Mozilla/5.0..."` |

**Example Authentication Failure Log**:
```json
{
  "log_type": "auth_failure",
  "timestamp": "2026-01-14T11:05:33.789Z",
  "attempted_email": "j***@example.com",
  "ip_address": "203.0.113.45",
  "failure_reason": "INVALID_PASSWORD",
  "account_lockout_triggered": false,
  "attempt_count": 3,
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
```

**Failure Reason Codes**:
- `INVALID_PASSWORD`: Correct email, wrong password
- `USER_NOT_FOUND`: Email not in system
- `ACCOUNT_LOCKED`: Account locked due to failed attempts
- `ACCOUNT_DEACTIVATED`: User account deactivated by admin
- `TOKEN_EXPIRED`: JWT token expired
- `TOKEN_REVOKED`: JWT token in blacklist

**Storage**: Elasticsearch/OpenSearch (real-time querying for alerting).

**Retention**: 180 days online, 7 years archived.

#### 2.1.4 Data Access Logs (RESTRICTED Data Only)

**Purpose**: Track access to RESTRICTED data (payroll, sensitive financial data) per DPDP Act Section 8.

**Required Fields**:

| Field | Type | Description | Redaction Rule | Example |
|-------|------|-------------|----------------|---------|
| `timestamp` | ISO 8601 | Access timestamp (UTC) | None | `"2026-01-14T14:22:10.345Z"` |
| `user_id` | UUID | User accessing data | None | `"user-uuid-3456"` |
| `data_category` | String | Data classification | None | `"RESTRICTED"` |
| `record_id` | UUID | Record identifier | None | `"payroll-uuid-7890"` |
| `action` | Enum | Action type | None | `"view"` |
| `authorized_by_role` | String | Role granting access | None | `"HR_ADMIN"` |
| `ip_address` | String | Client IP address | None | `"192.168.1.75"` |

**Example Data Access Log**:
```json
{
  "log_type": "data_access",
  "timestamp": "2026-01-14T14:22:10.345Z",
  "user_id": "user-uuid-3456",
  "data_category": "RESTRICTED",
  "record_id": "payroll-uuid-7890",
  "action": "view",
  "authorized_by_role": "HR_ADMIN",
  "ip_address": "192.168.1.75"
}
```

**Action Types**:
- `view`: Read operation
- `export`: Data export (DPDP Right to Access)
- `modify`: Update operation

**Scope**: Only log access to data classified as RESTRICTED per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section C:
- Payroll data (salary, allowances, deductions)
- Authentication credentials (password hashes, tokens)
- API keys and secrets

**Storage**: PostgreSQL audit_logs table (high security, append-only).

**Retention**: 7 years (immutable per PRD 1.3 "history is immutable").

#### 2.1.5 System Error Logs

**Purpose**: Track application errors, exceptions, and system failures for troubleshooting and reliability monitoring.

**Required Fields**:

| Field | Type | Description | Redaction Rule | Example |
|-------|------|-------------|----------------|---------|
| `timestamp` | ISO 8601 | Error timestamp (UTC) | None | `"2026-01-14T15:45:22.678Z"` |
| `service_name` | String | Service/module name | None | `"hr-service"` |
| `error_type` | String | Error category | None | `"DatabaseConnectionError"` |
| `error_message` | String | Error description | **Redact PII/sensitive data** | `"Connection to database failed: timeout after 30s"` |
| `stack_trace` | String | Stack trace (first 2000 chars) | **Redact file paths with credentials** | `"Traceback (most recent call last):\n  File..."` |
| `request_id` | UUID | Correlation ID for request tracing | None | `"req-uuid-1111"` |
| `severity` | Enum | Error severity level | None | `"ERROR"` |

**Example System Error Log**:
```json
{
  "log_type": "system_error",
  "timestamp": "2026-01-14T15:45:22.678Z",
  "service_name": "hr-service",
  "error_type": "DatabaseConnectionError",
  "error_message": "Connection to database failed: timeout after 30s",
  "stack_trace": "Traceback (most recent call last):\n  File \"/app/database.py\", line 45, in connect\n    connection = psycopg2.connect(dsn)\npsycopg2.OperationalError: timeout",
  "request_id": "req-uuid-1111",
  "severity": "ERROR",
  "user_id": "user-uuid-2222"
}
```

**Severity Levels**:
- `DEBUG`: Detailed diagnostic information
- `INFO`: General informational messages
- `WARNING`: Potential issues, degraded performance
- `ERROR`: Application errors, failed operations
- `CRITICAL`: System failures, service unavailable

**Redaction Rules**:
- Sanitize error messages to remove passwords, tokens, email addresses
- Remove database connection strings with credentials
- Redact file paths containing secrets (e.g., `/app/secrets/api_key.txt`)

**Storage**: Elasticsearch/OpenSearch for centralized error tracking.

**Retention**: 180 days online, 7 years archived.

### 2.2 Log Retention Policy (Task 0.5.37)

#### 2.2.1 Retention Periods

Per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) Section D (Data Retention Rules):

| Retention Phase | Duration | Storage Medium | Access Pattern | Rationale |
|-----------------|----------|----------------|----------------|-----------|
| **Online** | 180 days | Elasticsearch/OpenSearch | Real-time queries, dashboards, alerts | CERT-In Directions 2022 (Direction 4) |
| **Archived** | 7 years | MinIO (compressed, encrypted) | Compliance audits, legal discovery | IT Act 2000, DPDP Act 2023 |

**Total Retention**: 7 years + 180 days

#### 2.2.2 Online Storage (Elasticsearch/OpenSearch)

**Architecture**:
```
Application Logs → Fluentd/Filebeat → Elasticsearch/OpenSearch → Kibana Dashboards
```

**Index Strategy**:
- Time-based indices: `mindflow-logs-YYYY-MM-DD`
- Index rotation: Daily
- Sharding: 3 primary shards, 1 replica (scalability + availability)
- Index Lifecycle Management (ILM):
  - Hot tier (0-7 days): SSD, high IOPS
  - Warm tier (7-90 days): SSD, optimized for search
  - Cold tier (90-180 days): HDD, infrequent access
  - Delete after 180 days (auto-archival before deletion)

**Cluster Configuration** (Phase 1 - 3 nodes):
```yaml
elasticsearch:
  cluster.name: mindflow-logging
  node.master: true
  node.data: true
  node.ingest: true
  indices.lifecycle.history_index_enabled: true
```

**Index Template** (Access Logs):
```json
{
  "index_patterns": ["mindflow-access-logs-*"],
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index.lifecycle.name": "mindflow-logs-policy",
    "index.lifecycle.rollover_alias": "mindflow-access-logs"
  },
  "mappings": {
    "properties": {
      "timestamp": {"type": "date"},
      "user_id": {"type": "keyword"},
      "tenant_id": {"type": "keyword"},
      "ip_address": {"type": "ip"},
      "endpoint": {"type": "keyword"},
      "http_method": {"type": "keyword"},
      "response_code": {"type": "integer"},
      "response_time": {"type": "integer"}
    }
  }
}
```

**Retention Policy** (ILM):
```json
{
  "policy": "mindflow-logs-policy",
  "phases": {
    "hot": {
      "actions": {
        "rollover": {
          "max_size": "50GB",
          "max_age": "1d"
        }
      }
    },
    "warm": {
      "min_age": "7d",
      "actions": {
        "allocate": {"number_of_replicas": 1},
        "readonly": {}
      }
    },
    "cold": {
      "min_age": "90d",
      "actions": {
        "allocate": {"number_of_replicas": 0},
        "freeze": {}
      }
    },
    "delete": {
      "min_age": "180d",
      "actions": {
        "delete": {}
      }
    }
  }
}
```

**Before Deletion**: Archive to MinIO (automated via Curator/ILM hook).

#### 2.2.3 Archived Storage (MinIO)

**Archive Process** (Daily at 02:00 UTC):
1. Identify indices older than 180 days
2. Export index data to JSON lines format
3. Compress with gzip (compression ratio ~10:1)
4. Encrypt with AES-256-CBC (OpenSSL)
5. Upload to MinIO bucket: `mindflow-logs-archive-{YYYY}`
6. Verify upload integrity (checksum validation)
7. Delete Elasticsearch index
8. Log archival event in audit trail

**Archive Script** (Bash):
```bash
#!/bin/bash
# /opt/mindflow/scripts/archive-logs.sh

ARCHIVE_DATE=$(date -d "180 days ago" +%Y-%m-%d)
INDEX_NAME="mindflow-access-logs-${ARCHIVE_DATE}"
ARCHIVE_FILE="${INDEX_NAME}.json.gz.enc"

# Step 1: Export from Elasticsearch
elasticdump \
  --input="http://elasticsearch:9200/${INDEX_NAME}" \
  --output="${INDEX_NAME}.json" \
  --type=data

# Step 2: Compress
gzip "${INDEX_NAME}.json"

# Step 3: Encrypt
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${INDEX_NAME}.json.gz" \
  -out "${ARCHIVE_FILE}" \
  -pass env:LOG_ARCHIVE_ENCRYPTION_KEY

# Step 4: Upload to MinIO
mc cp "${ARCHIVE_FILE}" "minio/mindflow-logs-archive-$(date +%Y)/${ARCHIVE_FILE}"

# Step 5: Verify
if mc stat "minio/mindflow-logs-archive-$(date +%Y)/${ARCHIVE_FILE}"; then
  # Step 6: Delete from Elasticsearch
  curl -X DELETE "http://elasticsearch:9200/${INDEX_NAME}"
  echo "Archived and deleted index: ${INDEX_NAME}"
else
  echo "ERROR: Upload verification failed for ${INDEX_NAME}"
  exit 1
fi

# Step 7: Clean up local files
shred -u "${INDEX_NAME}.json.gz" "${ARCHIVE_FILE}"
```

**Bucket Structure**:
```
mindflow-logs-archive-2026/
  ├── mindflow-access-logs-2026-01-14.json.gz.enc
  ├── mindflow-auth-failure-logs-2026-01-14.json.gz.enc
  ├── mindflow-admin-action-logs-2026-01-14.json.gz.enc
  └── ...

mindflow-logs-archive-2027/
  └── ...
```

**Bucket Policy** (MinIO):
- **Versioning**: Disabled (logs immutable, no overwrites)
- **Encryption**: SSE-S3 (server-side encryption)
- **Access Control**: Restricted to `log-admin` role, MFA required
- **Lifecycle**: Transition to cold storage after 2 years, delete after 7 years

**Restoration Process** (When Needed):
1. Download encrypted archive from MinIO
2. Decrypt with archive encryption key
3. Decompress gzip
4. Import JSON into temporary Elasticsearch index
5. Query/analyze as needed
6. Delete temporary index after investigation

**Expected SLA**: 4-hour retrieval time for archived logs (manual process).

---

## 3. Monitoring and Alerting

### 3.1 Alerting Thresholds (Task 0.5.38)

All alerts sent to designated security team and relevant administrators via email, Slack, or PagerDuty (Phase 1: email).

#### 3.1.1 Critical Alerts (Immediate Response Required)

**Alert 1: Brute-Force Attack Detected**

**Threshold**: 10 or more authentication failures from same IP address within 5 minutes

**Detection Query** (Elasticsearch):
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_type": "auth_failure"}},
        {"range": {"timestamp": {"gte": "now-5m"}}}
      ]
    }
  },
  "aggs": {
    "by_ip": {
      "terms": {"field": "ip_address", "size": 100},
      "aggs": {
        "failure_count": {"value_count": {"field": "ip_address"}}
      }
    }
  }
}
```

**Alert Actions**:
1. **Immediate**: Send email to security team with IP address, attempted emails (masked)
2. **Automated**: Block IP address via firewall rule (iptables/cloud security group)
3. **Audit Log**: Record block event with timestamp, IP, failure count

**Alert Payload**:
```json
{
  "alert_level": "CRITICAL",
  "alert_type": "BRUTE_FORCE_ATTACK",
  "timestamp": "2026-01-14T16:30:00Z",
  "source_ip": "203.0.113.45",
  "failure_count": 12,
  "time_window": "5 minutes",
  "attempted_emails": ["j***@example.com", "a***@example.com"],
  "action_taken": "IP_BLOCKED",
  "notify": ["security@mindflow.example.com", "SYSTEM_ADMIN"]
}
```

**Escalation**: If same attacker targets multiple IPs (distributed attack), escalate to SYSTEM_ADMIN + Product Owner.

---

**Alert 2: Unauthorized Access to Payroll Data**

**Threshold**: Any access to payroll data by user WITHOUT `HR_ADMIN` or `FINANCE_ADMIN` role

**Detection Query**:
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_type": "data_access"}},
        {"term": {"data_category": "RESTRICTED"}},
        {"match": {"record_id": "payroll*"}}
      ],
      "must_not": [
        {"terms": {"authorized_by_role": ["HR_ADMIN", "FINANCE_ADMIN"]}}
      ]
    }
  }
}
```

**Alert Actions**:
1. **Immediate**: Email to HR_ADMIN + SYSTEM_ADMIN with user_id, record_id, timestamp
2. **Automated**: Revoke user session (add JWT to blacklist)
3. **Audit Log**: Record unauthorized access attempt
4. **Investigation**: Trigger security incident workflow (Section 4.2)

**Alert Payload**:
```json
{
  "alert_level": "CRITICAL",
  "alert_type": "UNAUTHORIZED_DATA_ACCESS",
  "timestamp": "2026-01-14T16:45:12Z",
  "user_id": "user-uuid-9999",
  "user_email": "s***@example.com",
  "data_category": "RESTRICTED",
  "record_id": "payroll-uuid-5555",
  "action": "view",
  "authorized_by_role": "EMPLOYEE",
  "action_taken": "SESSION_REVOKED",
  "notify": ["HR_ADMIN", "SYSTEM_ADMIN", "security@mindflow.example.com"]
}
```

**Escalation**: If repeated attempts by same user, escalate to Critical incident (Section 4.1).

#### 3.1.2 High Alerts (1-Hour Response Time)

**Alert 3: Multiple Failed Login Attempts for Admin Account**

**Threshold**: 5 or more failed login attempts for admin account (HR_ADMIN, SYSTEM_ADMIN, FINANCE_ADMIN) within 10 minutes

**Detection Query**:
```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"log_type": "auth_failure"}},
        {"range": {"timestamp": {"gte": "now-10m"}}},
        {"exists": {"field": "attempted_email"}}
      ]
    }
  },
  "aggs": {
    "by_email": {
      "terms": {"field": "attempted_email.keyword"},
      "aggs": {
        "failure_count": {"value_count": {"field": "attempted_email"}}
      }
    }
  }
}
```

**Additional Check**: Query user database to verify if email belongs to admin role.

**Alert Actions**:
1. **Immediate**: Email to account owner (admin user) + SYSTEM_ADMIN
2. **Automated**: Force password reset for admin account (optional, configurable)
3. **Notification**: "Suspicious login activity detected on your admin account"
4. **Audit Log**: Record failed attempts with IP addresses, timestamps

**Alert Payload**:
```json
{
  "alert_level": "HIGH",
  "alert_type": "ADMIN_ACCOUNT_ATTACK",
  "timestamp": "2026-01-14T17:15:30Z",
  "attempted_email": "h***@example.com",
  "admin_role": "HR_ADMIN",
  "failure_count": 5,
  "time_window": "10 minutes",
  "source_ips": ["203.0.113.45", "203.0.113.46"],
  "action_taken": "PASSWORD_RESET_RECOMMENDED",
  "notify": ["hradmin@example.com", "SYSTEM_ADMIN"]
}
```

---

**Alert 4: Tenant Isolation Violation Detected**

**Threshold**: Any SQL query attempting cross-tenant access (tenant_id mismatch between JWT and query)

**Detection Method**: Application-level logging when RLS policy blocks query or tenant_id validation fails.

**Example Log**:
```json
{
  "log_type": "security_violation",
  "timestamp": "2026-01-14T18:00:00Z",
  "user_id": "user-uuid-3333",
  "tenant_id": "tenant-uuid-1111",
  "violation_type": "CROSS_TENANT_QUERY_ATTEMPT",
  "attempted_tenant_id": "tenant-uuid-2222",
  "query": "SELECT * FROM employees WHERE tenant_id = 'tenant-uuid-2222'",
  "result": "BLOCKED_BY_RLS"
}
```

**Alert Actions**:
1. **Immediate**: Email to SUPER_ADMIN (if applicable) + SYSTEM_ADMIN
2. **Automated**: Revoke user session immediately
3. **Investigation**: Review user activity logs for past 7 days
4. **Audit Log**: Record isolation violation with full context

**Alert Payload**:
```json
{
  "alert_level": "HIGH",
  "alert_type": "TENANT_ISOLATION_VIOLATION",
  "timestamp": "2026-01-14T18:00:00Z",
  "user_id": "user-uuid-3333",
  "user_tenant_id": "tenant-uuid-1111",
  "attempted_tenant_id": "tenant-uuid-2222",
  "action_taken": "SESSION_REVOKED",
  "notify": ["SUPER_ADMIN", "SYSTEM_ADMIN", "security@mindflow.example.com"]
}
```

**Escalation**: Treat as Critical incident if multiple users from same tenant attempt cross-tenant access (coordinated attack).

#### 3.1.3 Medium Alerts (4-Hour Response Time)

**Alert 5: Configuration Change to Security Settings**

**Threshold**: Any modification to security-related configuration (password policy, session timeout, role permissions)

**Detection**: Admin action logs with `action_type` matching security configuration changes.

**Alert Actions**:
1. **Notification**: Email to SYSTEM_ADMIN with before/after configuration values
2. **Audit Log**: Record configuration change with admin_user_id, justification
3. **Review**: SYSTEM_ADMIN verifies change is authorized

**Alert Payload**:
```json
{
  "alert_level": "MEDIUM",
  "alert_type": "SECURITY_CONFIG_CHANGE",
  "timestamp": "2026-01-14T19:30:00Z",
  "admin_user_id": "admin-uuid-7777",
  "action_type": "UPDATE_PASSWORD_POLICY",
  "before_value": {"min_length": 12, "complexity": "3/4"},
  "after_value": {"min_length": 14, "complexity": "4/4"},
  "justification": "Enhance security per compliance review",
  "notify": ["SYSTEM_ADMIN"]
}
```

---

**Alert 6: File Upload with Virus Detected**

**Threshold**: Any file upload rejected by ClamAV virus scanner

**Detection**: File upload service logs when `virus_scan_status = "infected"`.

**Alert Actions**:
1. **Immediate**: Email to uploader (user) + Security Team
2. **Automated**: Quarantine file (prevent access, mark as deleted)
3. **Audit Log**: Record virus detection with file metadata (name, size, hash)
4. **Investigation**: Review user recent uploads for additional malware

**Alert Payload**:
```json
{
  "alert_level": "MEDIUM",
  "alert_type": "VIRUS_DETECTED",
  "timestamp": "2026-01-14T20:10:45Z",
  "user_id": "user-uuid-4444",
  "file_name": "expense_receipt.pdf",
  "file_size": 524288,
  "virus_name": "Trojan.PDF.Agent",
  "file_hash_sha256": "d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2",
  "action_taken": "FILE_QUARANTINED",
  "notify": ["user-uuid-4444", "security@mindflow.example.com"]
}
```

---

## 4. Incident Response

### 4.1 Severity Classification (Task 0.5.39)

#### 4.1.1 Severity Tiers

| Severity | Impact Criteria | Response SLA | Escalation Path | Examples |
|----------|----------------|--------------|-----------------|----------|
| **Critical** | Data breach, multi-tenant isolation failure, complete service outage | 15 minutes | Immediate: SYSTEM_ADMIN → Product Owner → CISO | Unauthorized database access, RLS bypass, payroll data leak |
| **High** | Single-tenant data exposure, admin account compromise, partial service outage | 1 hour | SYSTEM_ADMIN → Product Owner | Admin credential theft, SQL injection exploit, DDoS attack |
| **Medium** | Suspicious activity detected, configuration error, degraded performance | 4 hours | SYSTEM_ADMIN (internal investigation) | Unusual admin access patterns, failed deployment, slow queries |
| **Low** | Minor security events, policy violations, isolated errors | 24 hours | Incident logged, no immediate escalation | Single failed login, incorrect password policy setting |

#### 4.1.2 Critical Incidents (15-Minute Response)

**Definition**: Incidents with potential for:
- **Data Breach**: Unauthorized access to RESTRICTED or CONFIDENTIAL data
- **Service Outage**: Complete platform unavailability (>95% users affected)
- **Multi-Tenant Compromise**: Cross-tenant data access or isolation failure

**Response Team**:
- SYSTEM_ADMIN (Incident Commander)
- HR_ADMIN (for employee data breaches)
- FINANCE_ADMIN (for financial data breaches)
- Product Owner (business continuity decisions)
- External: CERT-In (if reportable), Legal Counsel (if data breach)

**Notification Channels**:
- Immediate: PagerDuty (Phase 1: Phone call + Email)
- Continuous: Dedicated Slack channel: `#incident-critical-YYYYMMDD-HHMM`
- Stakeholders: Product Owner, CISO, Board of Directors (for major breaches)

**Required Actions** (First 15 Minutes):
1. Acknowledge incident and assemble response team
2. Assess scope and impact (preliminary)
3. Initiate containment procedures (Section 4.2.2)
4. Notify CERT-In if reportable (Section 4.3)
5. Document all actions in incident timeline

#### 4.1.3 High Incidents (1-Hour Response)

**Definition**: Incidents with potential for:
- **Single-Tenant Data Exposure**: Unauthorized access limited to one tenant
- **Admin Account Compromise**: Stolen or misused admin credentials
- **Partial Service Outage**: Critical module unavailable (e.g., HR, Payroll)

**Response Team**:
- SYSTEM_ADMIN (Incident Commander)
- Relevant Module Admin (HR_ADMIN, FINANCE_ADMIN, TRAINING_ADMIN)
- Product Owner (if escalation needed)

**Notification Channels**:
- Email to SYSTEM_ADMIN + relevant module admin
- Slack channel: `#incident-high-YYYYMMDD`

**Required Actions** (First 1 Hour):
1. Assess incident scope and confirm severity classification
2. Isolate affected systems or accounts
3. Begin forensic log analysis
4. Document findings and containment actions
5. Prepare status update for Product Owner

#### 4.1.4 Medium Incidents (4-Hour Response)

**Definition**: Incidents with potential for:
- **Suspicious Activity**: Anomalous admin behavior, unusual access patterns
- **Configuration Errors**: Misconfigured security settings, workflow issues
- **Degraded Performance**: Slow queries, elevated error rates

**Response Team**:
- SYSTEM_ADMIN (Investigation Lead)

**Notification Channels**:
- Email to SYSTEM_ADMIN
- Incident ticket in issue tracking system (Jira/Linear)

**Required Actions** (First 4 Hours):
1. Review logs and metrics to understand root cause
2. Implement corrective actions if needed
3. Document incident and resolution steps
4. Update monitoring/alerting rules if gaps identified

#### 4.1.5 Low Incidents (24-Hour Response)

**Definition**: Incidents with minimal impact:
- **Minor Security Events**: Isolated failed logins, invalid tokens
- **Policy Violations**: Single user violating access policy
- **Isolated Errors**: Single-instance application errors

**Response Team**:
- SYSTEM_ADMIN (Review when available)

**Notification Channels**:
- Logged in incident tracking system
- No immediate escalation

**Required Actions** (Within 24 Hours):
1. Review incident details
2. Close ticket if no action required
3. Implement preventive measures if pattern detected

### 4.2 Response Process (Task 0.5.40)

#### 4.2.1 5-Phase Incident Response Model

All incidents follow standardized 5-phase process with defined timelines and checkpoints.

```
Detect → Contain → Eradicate → Recover → Report
```

#### 4.2.2 Phase 1: Detect (0-15 Minutes)

**Objective**: Identify and confirm security incident through automated monitoring or manual report.

**Detection Sources**:
1. **Automated Alerts**: Elasticsearch alerting rules (Section 3.1)
2. **User Reports**: Security concerns reported via complaints module (category: DATA_PRIVACY)
3. **Admin Observations**: Suspicious activity noticed during routine operations
4. **External Notifications**: Third-party security researchers, CERT-In advisories

**Detection Process**:
```
Alert Triggered
    ↓
SYSTEM_ADMIN Notified (Email/PagerDuty)
    ↓
Initial Assessment (Severity Classification)
    ↓
Incident Ticket Created
    ↓
Response Team Assembled (if Critical/High)
```

**Incident Ticket Template**:
```
Incident ID: INC-2026-01-14-001
Severity: [CRITICAL | HIGH | MEDIUM | LOW]
Detection Time: 2026-01-14T16:30:00Z
Detected By: [Automated Alert | User Report | Admin]
Initial Description: [Brief description of incident]
Affected Systems: [List of services/modules/users]
Response Team: [SYSTEM_ADMIN, HR_ADMIN, etc.]
Status: DETECTED
```

**Timeline**: 0-15 minutes from alert to ticket creation and team assembly.

#### 4.2.3 Phase 2: Contain (15 Minutes - 1 Hour)

**Objective**: Isolate affected systems to prevent further damage or data exposure.

**Containment Actions** (by incident type):

**Data Breach Containment**:
1. **Revoke Access**:
   - Invalidate all sessions for compromised user accounts (add JWTs to blacklist)
   - Disable compromised admin accounts immediately
   - Revoke API keys if credentials exposed

2. **Isolate Systems**:
   - Disconnect affected servers from network (if compromised)
   - Disable vulnerable API endpoints via load balancer
   - Block attacker IP addresses at firewall level

3. **Preserve Evidence**:
   - Snapshot database state (PostgreSQL pg_dump)
   - Export relevant logs from Elasticsearch (past 7 days)
   - Screenshot admin dashboards showing suspicious activity
   - Document all containment actions with timestamps

**Account Compromise Containment**:
1. Revoke all sessions for compromised account
2. Force password reset (invalidate current password hash)
3. Enable MFA requirement for account (if not already enabled)
4. Review recent actions by compromised account (audit logs)
5. Reverse unauthorized changes if possible

**Service Outage Containment**:
1. Identify failed service/module
2. Redirect traffic to backup instance (if available)
3. Isolate failed instance for root cause analysis
4. Enable maintenance mode if necessary
5. Communicate status to users (status page)

**Containment Checklist**:
- [ ] Affected user accounts identified and disabled
- [ ] Compromised systems isolated from network
- [ ] Attacker IP addresses blocked
- [ ] Evidence preserved (logs, database snapshots)
- [ ] Unauthorized access revoked
- [ ] All containment actions documented in incident ticket

**Timeline**: Complete containment within 1 hour of detection for Critical incidents.

#### 4.2.4 Phase 3: Eradicate (1-4 Hours)

**Objective**: Remove root cause of incident and verify system integrity.

**Eradication Actions**:

**Malware Eradication**:
1. Delete infected files from storage (MinIO)
2. Scan all file uploads from same user (quarantine if needed)
3. Update ClamAV virus signatures
4. Re-scan all files uploaded in past 7 days

**Vulnerability Patching**:
1. Identify vulnerable component (dependency, code, configuration)
2. Apply security patch or configuration change
3. Test fix in staging environment
4. Deploy fix to production with rollback plan
5. Verify vulnerability no longer exploitable

**Unauthorized Access Eradication**:
1. Close security gap that allowed unauthorized access
2. Review and fix authorization logic (if RBAC bypass)
3. Fix RLS policy if tenant isolation violated
4. Update access control tests to prevent regression

**Verification Steps**:
- [ ] Root cause identified and documented
- [ ] Security gap closed (patched, configured, fixed)
- [ ] System integrity verified (no backdoors, no persistent access)
- [ ] Vulnerability no longer exploitable (penetration test)
- [ ] All changes tested in staging before production deployment

**Timeline**: Complete eradication within 4 hours of containment for Critical incidents.

#### 4.2.5 Phase 4: Recover (4-24 Hours)

**Objective**: Restore normal operations and verify security controls.

**Recovery Actions**:

**Service Restoration**:
1. Re-enable affected services/modules
2. Restore user access (remove account lockouts)
3. Verify all functionality working correctly
4. Monitor for anomalies (elevated error rates, unusual traffic)

**Communication**:
1. **Internal**: Notify SYSTEM_ADMIN, Product Owner, affected module admins
2. **External** (if data breach): Notify affected users via email
   - Describe what happened (high-level, non-technical)
   - Explain what data was affected
   - Outline actions taken (containment, eradication)
   - Provide guidance (password reset, monitor accounts)
   - Include contact information for questions

3. **Regulatory** (if reportable): Submit CERT-In report (Section 4.3)

**User Communication Template** (Data Breach):
```
Subject: Important Security Notice - Data Breach Notification

Dear [User Name],

We are writing to inform you of a security incident that may have affected your MindFlow account.

What Happened:
On [DATE], we detected unauthorized access to our system. An attacker gained access to [DESCRIPTION OF DATA: e.g., employee names and email addresses].

What We're Doing:
- We immediately revoked the attacker's access and secured the affected system.
- We have implemented additional security measures to prevent similar incidents.
- We are working with cybersecurity experts to investigate the incident.

What You Should Do:
- Reset your password immediately: [LINK]
- Enable multi-factor authentication: [LINK]
- Monitor your account for suspicious activity
- Report any concerns to security@mindflow.example.com

What Was NOT Affected:
- Passwords (stored encrypted, not accessible)
- Financial data (not accessed by attacker)

We sincerely apologize for this incident and any inconvenience it may cause. We take the security of your data very seriously and are committed to protecting it.

If you have questions, please contact our support team at support@mindflow.example.com or call [PHONE].

Sincerely,
MindFlow Security Team
```

**Verification Checklist**:
- [ ] All services restored and functioning normally
- [ ] User access restored (where appropriate)
- [ ] Security controls verified operational
- [ ] Affected users notified (if data breach)
- [ ] Monitoring alerts configured to detect recurrence

**Timeline**: Complete recovery within 24 hours of eradication for Critical incidents.

#### 4.2.6 Phase 5: Report (Within 6 Hours of Detection)

**Objective**: Document incident, submit regulatory reports, and conduct post-mortem.

**Reporting Requirements**:

**CERT-In Report** (if reportable):
- Submission deadline: **Within 6 hours of detection**
- Report format: CERT-In prescribed template
- Content: Incident type, timeline, impact, containment actions, affected systems
- Submission method: CERT-In portal (https://www.cert-in.org.in/)
- See Section 4.3 for detailed requirements

**Internal Incident Report**:
```
Incident ID: INC-2026-01-14-001
Severity: CRITICAL
Status: RESOLVED

Timeline:
- Detection: 2026-01-14T16:30:00Z (Automated alert)
- Containment: 2026-01-14T16:45:00Z (15 minutes)
- Eradication: 2026-01-14T18:30:00Z (2 hours)
- Recovery: 2026-01-14T22:00:00Z (5.5 hours)
- CERT-In Report: 2026-01-14T22:15:00Z (5.75 hours)

Description:
Unauthorized access to payroll data detected via data access logs. User account "user-uuid-9999" (EMPLOYEE role) accessed 15 payroll records without authorization.

Root Cause:
Authorization logic bug in HR service allowed hierarchy-based access even when user had no subordinates. User exploited this by manipulating manager_id parameter in API request.

Impact:
- 15 payroll records viewed (employee names, salaries)
- No data exported or modified
- Single tenant affected (tenant-uuid-1111)
- 1 user account compromised

Actions Taken:
1. Revoked user session immediately (16:35 UTC)
2. Disabled user account (16:40 UTC)
3. Fixed authorization bug in HR service (17:30 UTC)
4. Deployed fix to production (18:00 UTC)
5. Notified 15 affected employees (20:00 UTC)
6. Submitted CERT-In report (22:15 UTC)

Lessons Learned:
- Authorization tests insufficient (did not cover manager_id manipulation)
- Missing input validation on manager_id parameter
- Need additional RESTRICTED data access alerts

Preventive Measures:
1. Add integration tests for authorization edge cases
2. Implement input validation middleware for all API parameters
3. Deploy data access monitoring for RESTRICTED data
4. Conduct security code review for all HR endpoints

Responsible: SYSTEM_ADMIN (admin-uuid-7777)
Reviewed By: Product Owner, HR_ADMIN
Closed: 2026-01-15T10:00:00Z
```

**Post-Mortem Meeting**:
- Schedule: Within 3 business days of incident resolution
- Attendees: Response team, Product Owner, affected stakeholders
- Agenda:
  1. Incident timeline review
  2. Root cause analysis
  3. Effectiveness of response process
  4. Lessons learned
  5. Preventive measures and action items
- Deliverable: Post-mortem document with action items and owners

**Timeline**: CERT-In report within 6 hours of detection; internal report within 24 hours of resolution.

### 4.3 CERT-In Reporting Readiness (Task 0.5.41)

#### 4.3.1 Reportable Incidents

Per CERT-In Directions 2022 (Direction 5), the following incidents MUST be reported within **6 hours of detection**:

| Incident Type | Description | MindFlow Example |
|---------------|-------------|------------------|
| **Data Breach** | Unauthorized access to data | Attacker accesses employee records, payroll data |
| **Unauthorized Access** | Compromise of IT systems/accounts | Admin account stolen, RLS bypass exploit |
| **Malicious Code** | Virus, trojan, ransomware detected | Malware in file upload, backdoor in codebase |
| **Identity Theft** | Unauthorized use of credentials | Stolen JWT tokens, phished admin password |
| **Data Leak** | Sensitive data exposed publicly | Database dump leaked, S3 bucket misconfigured |
| **Denial of Service** | Service unavailability due to attack | DDoS attack, resource exhaustion |
| **Website Defacement** | Unauthorized modification of web content | Attacker modifies frontend UI (future) |
| **Intrusion** | Unauthorized network/system access | SSH brute-force success, container escape |

**Non-Reportable Incidents** (Internal handling only):
- Minor security events (single failed login)
- Configuration errors without data exposure
- Performance issues unrelated to attacks

#### 4.3.2 Required Information (Ready Within 6 Hours)

CERT-In requires specific information for incident reporting. MindFlow maintains pre-built templates and automated data collection to meet the 6-hour deadline.

**Required Information Checklist**:

| Information Category | Required Details | MindFlow Data Source |
|---------------------|------------------|---------------------|
| **Incident Type** | Type from reportable list | Incident ticket classification |
| **Detection Date/Time** | Timestamp when incident first detected | Incident ticket creation time |
| **Affected Systems** | List of compromised systems/services | Incident ticket (affected_systems field) |
| **Impact Assessment** | Number of users affected, data exposed | Audit logs, database queries |
| **Containment Actions** | Steps taken to isolate incident | Incident ticket (containment_actions field) |
| **Timeline** | Detection, containment, eradication, recovery | Incident ticket (timeline section) |
| **Contact Person** | Name, email, phone of incident commander | SYSTEM_ADMIN contact details |

**CERT-In Report Template**:
```
CERT-IN INCIDENT REPORT

Report ID: CERT-IN-2026-01-14-001
Organization: MindFlow Technologies Pvt. Ltd.
Incident Commander: [SYSTEM_ADMIN Name]
Contact Email: security@mindflow.example.com
Contact Phone: +91-XXX-XXX-XXXX

INCIDENT DETAILS:

1. Incident Type:
   [X] Data Breach
   [ ] Unauthorized Access
   [ ] Malicious Code
   [ ] Identity Theft
   [ ] Data Leak
   [ ] Denial of Service
   [ ] Website Defacement
   [ ] Intrusion

2. Detection Date and Time:
   2026-01-14 16:30:00 IST (UTC+5:30)

3. Description of Incident:
   Unauthorized access to payroll data (RESTRICTED classification) was detected via data access logs. A user account with EMPLOYEE role accessed 15 payroll records without proper authorization. The incident was detected by automated alerting system monitoring RESTRICTED data access.

4. Affected Systems:
   - HR Service (hr-service)
   - PostgreSQL Database (payroll_records table)
   - User Account: user-uuid-9999 (employee@example.com)

5. Number of Users Affected:
   15 employees (payroll data viewed)

6. Data Compromised:
   - Employee names (15 records)
   - Salary information (15 records)
   - NO data exported or modified
   - Data classification: RESTRICTED (per DPDP Act)

7. Timeline:
   - Detection: 2026-01-14 16:30:00 IST (Automated alert)
   - Containment: 2026-01-14 16:45:00 IST (User session revoked)
   - Eradication: 2026-01-14 18:30:00 IST (Authorization bug fixed)
   - Recovery: 2026-01-14 22:00:00 IST (Service restored)

8. Containment Actions Taken:
   - Immediate revocation of user session (JWT blacklisted)
   - User account disabled
   - Authorization logic fixed and deployed
   - Affected employees notified

9. Root Cause:
   Authorization logic bug in HR service allowed unauthorized data access via manager_id parameter manipulation.

10. Current Status:
    [X] Contained
    [X] Eradicated
    [X] Recovered
    [ ] Ongoing investigation

11. Additional Information:
    - No evidence of external attacker involvement (internal user exploit)
    - Fix deployed and verified (18:00 IST)
    - Enhanced monitoring implemented for RESTRICTED data access

12. Submitted By:
    Name: [SYSTEM_ADMIN Name]
    Designation: System Administrator
    Date: 2026-01-14
    Signature: [Digital Signature]
```

**Template Storage Location**: `/docs/incident-response-templates/cert-in-report-template.md`

#### 4.3.3 Incident Report Automation

**Data Collection Script** (Python):
```python
#!/usr/bin/env python3
# /opt/mindflow/scripts/generate-cert-in-report.py

import json
import os
from datetime import datetime, timezone
from elasticsearch import Elasticsearch

def generate_cert_in_report(incident_id):
    """Generate CERT-In report with data from incident ticket and logs"""

    # Load incident ticket
    incident = load_incident_ticket(incident_id)

    # Query Elasticsearch for relevant logs
    es = Elasticsearch(['http://elasticsearch:9200'])

    # Get detection timestamp
    detection_time = incident['detection_time']

    # Get affected users (if data breach)
    affected_users = query_affected_users(es, incident)

    # Get containment actions from audit logs
    containment_actions = query_containment_actions(es, incident_id)

    # Populate template
    report = {
        "report_id": f"CERT-IN-{incident_id}",
        "organization": "MindFlow Technologies Pvt. Ltd.",
        "incident_commander": os.getenv("SYSTEM_ADMIN_NAME"),
        "contact_email": "security@mindflow.example.com",
        "contact_phone": "+91-XXX-XXX-XXXX",
        "incident_type": incident['type'],
        "detection_time": detection_time,
        "description": incident['description'],
        "affected_systems": incident['affected_systems'],
        "affected_user_count": len(affected_users),
        "data_compromised": incident['data_compromised'],
        "timeline": incident['timeline'],
        "containment_actions": containment_actions,
        "root_cause": incident['root_cause'],
        "status": incident['status']
    }

    # Render template
    report_text = render_cert_in_template(report)

    # Save to file
    report_file = f"/var/log/mindflow/cert-in-reports/{incident_id}.txt"
    with open(report_file, 'w') as f:
        f.write(report_text)

    print(f"CERT-In report generated: {report_file}")
    return report_file

def query_affected_users(es, incident):
    """Query audit logs to identify affected users"""
    query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"log_type": "data_access"}},
                    {"term": {"data_category": "RESTRICTED"}},
                    {"range": {"timestamp": {
                        "gte": incident['detection_time'],
                        "lte": incident['recovery_time']
                    }}}
                ]
            }
        }
    }
    result = es.search(index="mindflow-data-access-*", body=query)
    return [hit['_source']['record_id'] for hit in result['hits']['hits']]

def query_containment_actions(es, incident_id):
    """Query audit logs for containment actions"""
    query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"log_type": "admin_action"}},
                    {"match": {"justification": incident_id}}
                ]
            }
        },
        "sort": [{"timestamp": "asc"}]
    }
    result = es.search(index="mindflow-admin-action-*", body=query)
    return [f"{hit['_source']['action_type']} at {hit['_source']['timestamp']}"
            for hit in result['hits']['hits']]

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: generate-cert-in-report.py <incident_id>")
        sys.exit(1)

    incident_id = sys.argv[1]
    report_file = generate_cert_in_report(incident_id)
    print(f"Report ready for submission: {report_file}")
```

**Usage**:
```bash
# Generate CERT-In report from incident ticket
python3 /opt/mindflow/scripts/generate-cert-in-report.py INC-2026-01-14-001

# Output: /var/log/mindflow/cert-in-reports/INC-2026-01-14-001.txt
```

#### 4.3.4 Submission Process

**Manual Submission** (Phase 1):
1. Generate report using automation script (above)
2. Review report for accuracy and completeness
3. Obtain approval from SYSTEM_ADMIN + Product Owner
4. Log in to CERT-In portal: https://www.cert-in.org.in/
5. Submit report via online form
6. Save submission confirmation (PDF)
7. Update incident ticket with submission details

**Automated Submission** (Future Phase):
- CERT-In API integration (if available)
- Automatic report generation on Critical incident detection
- Email notification to CERT-In with report attachment

**Submission Checklist**:
- [ ] Report generated within 6 hours of detection
- [ ] All required fields populated accurately
- [ ] Affected user count verified
- [ ] Timeline includes all phases (detect, contain, eradicate, recover)
- [ ] Report reviewed by SYSTEM_ADMIN
- [ ] Product Owner notified of submission
- [ ] Submission confirmation saved
- [ ] Incident ticket updated with submission details

---

## 5. Compliance Mapping (Task 0.5.42)

### 5.1 CERT-In Directions 2022

| CERT-In Requirement | MindFlow Implementation | Evidence | Section Reference |
|---------------------|------------------------|----------|-------------------|
| **Direction 4: Log Retention (180 days)** | Elasticsearch retains logs online for 180 days with ILM policy | Elasticsearch ILM configuration, archive scripts | 2.2.2 |
| **Direction 4: Log Contents** | Logs include user_id, IP address, timestamp, endpoint, action | Log structure definitions with required fields | 2.1.1 - 2.1.5 |
| **Direction 5: Incident Reporting (6 hours)** | Automated report generation, pre-built templates, submission process | CERT-In report template, automation script | 4.3 |
| **Direction 6: Time Synchronization** | NTP synchronization, UTC timestamps in ISO 8601 format | All log examples show ISO 8601 UTC timestamps | 2.1 |

**Compliance Status**: COMPLIANT

**Evidence Artifacts**:
- Elasticsearch ILM policy: `/config/elasticsearch/ilm-policy.json`
- Log archival script: `/opt/mindflow/scripts/archive-logs.sh`
- CERT-In report template: `/docs/incident-response-templates/cert-in-report-template.md`
- CERT-In report automation: `/opt/mindflow/scripts/generate-cert-in-report.py`

### 5.2 Information Technology Act 2000

| IT Act Provision | MindFlow Implementation | Evidence | Section Reference |
|------------------|------------------------|----------|-------------------|
| **Section 43A: Reasonable Security Practices** | Comprehensive incident response process, security monitoring | 5-phase response model, alerting thresholds | 4.2, 3.1 |
| **Section 72A: Unauthorized Disclosure Prevention** | RESTRICTED data access logging, unauthorized access alerts | Data access logs, Alert 2 (unauthorized payroll access) | 2.1.4, 3.1.1 |
| **Audit Trail Requirement** | Immutable audit logs with 7-year retention | Admin action logs, data access logs | 2.1.2, 2.1.4 |

**Compliance Status**: COMPLIANT

**Evidence Artifacts**:
- Admin action log schema: Section 2.1.2
- Data access log schema: Section 2.1.4
- Incident response procedures: Section 4.2

### 5.3 DPDP Act 2023

| DPDP Requirement | MindFlow Implementation | Evidence | Section Reference |
|------------------|------------------------|----------|-------------------|
| **Section 8: Breach Notification** | User notification templates, incident communication process | User communication template in Phase 4 (Recover) | 4.2.5 |
| **Section 8: Data Protection Board Notification** | CERT-In reporting process (covers DPB notification) | CERT-In report template, 6-hour submission SLA | 4.3 |
| **Section 8: Reasonable Security Safeguards** | Logging, monitoring, incident response procedures | Entire document (logging strategy, monitoring, IR) | 2, 3, 4 |

**Compliance Status**: COMPLIANT

**Evidence Artifacts**:
- Breach notification template: Section 4.2.5 (User Communication Template)
- CERT-In/DPB reporting: Section 4.3
- Security safeguards documentation: Entire document

### 5.4 Compliance Summary Table

| Regulation | Key Obligations | MindFlow Controls | Gaps/Risks |
|------------|----------------|-------------------|------------|
| **CERT-In 2022** | 180-day retention, 6-hour reporting, time sync | Elasticsearch ILM (180d), MinIO archive (7y), UTC timestamps, CERT-In templates | None (COMPLIANT) |
| **IT Act 2000** | Reasonable security, audit trails, access control | 5-phase IR process, admin action logs, RESTRICTED data access logs | None (COMPLIANT) |
| **DPDP Act 2023** | Breach notification, security safeguards, DPB reporting | User notification templates, CERT-In reporting, comprehensive logging | None (COMPLIANT) |

**Overall Compliance Status**: **COMPLIANT** (pending implementation and Product Owner approval)

---

## 6. Dependencies

### 6.1 Technical Dependencies

| Dependency | Purpose | Configuration Owner | Status |
|------------|---------|---------------------|--------|
| **Elasticsearch/OpenSearch** | Online log storage and querying | SYSTEM_ADMIN | To be deployed (Phase 1) |
| **Fluentd/Filebeat** | Log aggregation and forwarding | SYSTEM_ADMIN | To be deployed (Phase 1) |
| **MinIO** | Archived log storage (7 years) | SYSTEM_ADMIN | Deployed (existing) |
| **ClamAV** | Virus scanning for file uploads | SYSTEM_ADMIN | To be deployed (Phase 1) |
| **PostgreSQL** | Audit log storage (admin actions, data access) | SYSTEM_ADMIN | Deployed (existing) |
| **Redis** | Session tracking, lockout tracking | SYSTEM_ADMIN | Deployed (existing) |
| **Email Service** | Alert notifications | SYSTEM_ADMIN | To be configured (SMTP) |

### 6.2 Documentation Dependencies

| Document | Relationship | Impact |
|----------|-------------|--------|
| [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md) | Defines data classification, retention rules | Informs log redaction, retention policies |
| [DATA_PROTECTION_DESIGN.md](./DATA_PROTECTION_DESIGN.md) | Defines redaction rules, sensitive field masking | Applied in log structures (Section 2.1) |
| [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) | Defines authentication, authorization, session management | Informs alert thresholds, incident scenarios |
| [TECH_STACK.md](./TECH_STACK.md) | Defines technology choices (Elasticsearch, MinIO) | Determines logging infrastructure |

### 6.3 Operational Dependencies

| Operational Requirement | Owner | Deadline |
|------------------------|-------|----------|
| Deploy Elasticsearch cluster (3 nodes) | SYSTEM_ADMIN | Phase 1 completion |
| Configure Fluentd log forwarding | SYSTEM_ADMIN | Phase 1 completion |
| Set up MinIO bucket for log archives | SYSTEM_ADMIN | Phase 1 completion |
| Create CERT-In portal account | SYSTEM_ADMIN | Before production launch |
| Define security team escalation contact list | Product Owner | Before production launch |
| Train SYSTEM_ADMIN on incident response procedures | Security Lead | Before production launch |
| Establish on-call rotation for Critical incidents | Product Owner | Before production launch |

---

## 7. Approval Record

| Role | Name | Status | Date | Signature |
|------|------|--------|------|-----------|
| Product Owner | [Name] | PENDING | - | - |
| SYSTEM_ADMIN | [Name] | PENDING | - | - |
| Security Lead | [Name] | PENDING | - | - |
| Compliance Officer | [Name] | PENDING | - | - |

**Document Status**: DRAFT - Pending Product Owner Approval

**Review Notes**:
- Document covers all Phase 0.5 Group 3 tasks (0.5.36 - 0.5.42)
- All cross-references validated (COMPLIANCE_MAPPING.md, DATA_PROTECTION_DESIGN.md, SECURITY_ARCHITECTURE.md)
- Compliance mappings verified against CERT-In, IT Act, DPDP Act
- Logging structure aligned with redaction rules from DATA_PROTECTION_DESIGN.md
- Incident response timelines aligned with CERT-In 6-hour reporting requirement

**Next Steps**:
1. Product Owner review and approval
2. Security team validation of incident response procedures
3. SYSTEM_ADMIN review of operational feasibility
4. Implementation planning for logging infrastructure (Elasticsearch, Fluentd)

---

## Document Change Control

| Version | Date | Author | Changes | Approval Status |
|---------|------|--------|---------|----------------|
| 1.0 | 2026-01-14 | Development Team | Initial draft - Phase 0.5 Group 3 (Tasks 0.5.36 - 0.5.42) | DRAFT |

**Change Log**:
- **v1.0** (2026-01-14): Initial comprehensive logging and incident response plan created, covering log types, retention policies, alerting thresholds, severity classification, 5-phase response process, CERT-In reporting readiness, and compliance mapping. Cross-referenced COMPLIANCE_MAPPING.md, DATA_PROTECTION_DESIGN.md, SECURITY_ARCHITECTURE.md.

---

**Document End**

**Total Sections**: 7 main sections
**Total Tasks Covered**: 7 tasks (0.5.36 - 0.5.42)
**Total Log Types Defined**: 5 (Access, Admin Action, Auth Failure, Data Access, System Error)
**Total Alerts Defined**: 6 (3 Critical, 2 High, 2 Medium)
**Incident Severity Tiers**: 4 (Critical, High, Medium, Low)
**Response Phases**: 5 (Detect, Contain, Eradicate, Recover, Report)
**Compliance Regulations**: 3 (CERT-In 2022, IT Act 2000, DPDP Act 2023)
**Retention Policy**: 180 days online + 7 years archived

This document serves as the comprehensive logging and incident response specification for the MindFlow platform Phase 1 implementation, ensuring CERT-In compliance and operational security readiness.
