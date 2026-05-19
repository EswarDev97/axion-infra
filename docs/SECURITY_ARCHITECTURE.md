# SECURITY ARCHITECTURE

## Document Control

| Property | Value |
|----------|-------|
| Document ID | SEC-ARCH-001 |
| Version | 1.0 |
| Status | APPROVED |
| Created Date | 2026-01-14 |
| Last Updated | 2026-01-14 |
| Author | Development Team |
| Reviewers | Product Owner, Security Team |
| Related Documents | [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md), [PRD.md](./PRD.md), [TECH_STACK.md](./TECH_STACK.md), [CROSS_CUTTING_AND_RULES.md](./CROSS_CUTTING_AND_RULES.md) |
| Phase Coverage | Phase 0.5 - Group 2 (Tasks 0.5.8 - 0.5.14) |

---

## Table of Contents

1. [Introduction](#introduction)
2. [Section A: Zero-Trust Security Assumptions (Task 0.5.8)](#section-a-zero-trust-security-assumptions-task-058)
3. [Section B: Authentication Model (Task 0.5.9)](#section-b-authentication-model-task-059)
4. [Section C: Authorization Model (Task 0.5.10)](#section-c-authorization-model-task-0510)
5. [Section D: Password Policy (Task 0.5.11)](#section-d-password-policy-task-0511)
6. [Section E: Session Management (Task 0.5.12)](#section-e-session-management-task-0512)
7. [Section F: Administrative Privilege Boundaries (Task 0.5.13)](#section-f-administrative-privilege-boundaries-task-0513)
8. [Security Architecture Summary](#security-architecture-summary)
9. [Compliance Alignment](#compliance-alignment)
10. [Approval Record](#approval-record)
11. [Document Change Control](#document-change-control)

---

## Introduction

### Purpose

This document establishes the comprehensive security architecture for the MindFlow platform, a multi-tenant SaaS solution supporting seven core modules: Mind Mapping, Task Management, HR, Training, Expense, Complaints, and System Foundations. The security architecture is designed to ensure confidentiality, integrity, and availability of system resources while maintaining strict tenant isolation and regulatory compliance.

### Scope

This document addresses Phase 0.5 Group 2 security tasks (0.5.8 through 0.5.14), covering:

- Zero-trust security principles
- Authentication mechanisms and token management
- Role-based access control and authorization
- Password security policies
- Session lifecycle management
- Administrative privilege boundaries and separation of duties

### Security Context

The MindFlow platform processes sensitive organizational data including employee personal information, financial records, performance data, and training materials. As documented in [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md), the platform must comply with:

- Digital Personal Data Protection Act, 2023 (DPDPA)
- Information Technology Act, 2000 (IT Act)
- ISO 27001:2022 Information Security Management
- SOC 2 Type II controls

The security architecture is built upon the technology stack defined in [TECH_STACK.md](./TECH_STACK.md), utilizing JWT-based authentication, FastAPI backend security features, PostgreSQL Row-Level Security (RLS), and Redis for session and token management.

### Design Principles

All security controls are designed following these core principles:

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Users granted minimum necessary permissions
3. **Separation of Duties**: Critical operations require multiple roles
4. **Fail Secure**: System defaults to deny access on errors
5. **Audit Everything**: Comprehensive logging of security events

---

## Section A: Zero-Trust Security Assumptions (Task 0.5.8)

### A.1 Zero-Trust Principles

The MindFlow platform implements a zero-trust security model based on three foundational principles:

#### A.1.1 Never Trust, Always Verify

**Assumption**: No user, device, or network location is inherently trusted.

**Implementation**:
- Every API request must present valid authentication credentials
- Authentication tokens are validated on every request
- Token signatures are cryptographically verified using HMAC-SHA256
- Expired or malformed tokens are immediately rejected
- Internal service-to-service calls also require authentication

**Verification Points**:
- API Gateway: Initial token validation and signature verification
- Service Layer: Re-validation of token claims and expiry
- Database Layer: Row-Level Security (RLS) policies enforce tenant_id validation

#### A.1.2 Strict Tenant Isolation

**Assumption**: Multi-tenant data must be cryptographically and logically isolated.

**Implementation**:
- **Database Level**: PostgreSQL RLS policies enforce tenant_id filtering on all tables
- **Application Level**: All queries include tenant_id predicate from JWT claims
- **Cache Level**: Redis keys prefixed with tenant_id to prevent cross-tenant cache poisoning
- **Storage Level**: Object storage paths include tenant_id namespace
- **Network Level**: No shared database connections between tenant requests

**Isolation Guarantees**:

| Layer | Isolation Mechanism | Failure Mode |
|-------|-------------------|--------------|
| Database | RLS Policies (FORCE) | Query rejected if tenant_id missing |
| Application | ORM-level tenant filters | Runtime exception thrown |
| Cache | Namespace prefixing | Key not found (empty result) |
| File Storage | Path-based separation | 403 Forbidden error |
| API | JWT tenant_id claim validation | 401 Unauthorized error |

#### A.1.3 Authentication Does Not Equal Authorization

**Assumption**: Successful authentication does not grant access rights; explicit authorization checks are required.

**Implementation**:
- Authentication validates identity (who you are)
- Authorization validates permissions (what you can do)
- Every protected resource requires both authentication AND authorization checks
- Authorization decisions consider: role, resource ownership, hierarchy position, tenant membership

**Separation Example**:
```
Request Flow:
1. Authentication: Validate JWT, extract user_id, tenant_id, roles[]
2. Authorization: Check if user's role permits the requested action on the specific resource
3. Resource Filtering: Apply hierarchy-based filtering for subordinate data access
4. Data Access: Execute query with RLS policies enforcing tenant_id
```

### A.2 Security Boundaries

#### A.2.1 Tenant Boundary

**Definition**: Absolute isolation between different organizational tenants.

**Controls**:
- Mandatory tenant_id in all database tables (except system configuration)
- RLS policies prevent cross-tenant queries
- JWT tenant_id claim cannot be modified by users
- Admin users scoped to single tenant (except SUPER_ADMIN if applicable)

#### A.2.2 User Boundary

**Definition**: Isolation between users within the same tenant.

**Controls**:
- User can only access own data unless role grants broader access
- Hierarchy-based access determined by HR reporting relationships
- Resource ownership tracked in database
- Audit logs record user actions for accountability

#### A.2.3 Role Boundary

**Definition**: Permissions granted only to authorized roles.

**Controls**:
- Roles mapped to permissions in access control matrix
- Users cannot escalate own privileges
- Role assignment requires admin approval
- Role changes trigger session invalidation

### A.3 Threat Model Assumptions

#### A.3.1 Assumed Threats

1. **External Attackers**: Attempting to gain unauthorized access via internet
2. **Malicious Insiders**: Authenticated users attempting privilege escalation
3. **Compromised Credentials**: Stolen passwords or leaked tokens
4. **Cross-Tenant Attacks**: Tenant users attempting to access other tenant data
5. **Session Hijacking**: Stolen session tokens or cookies

#### A.3.2 Out of Scope (Phase 1)

The following threats are not addressed in Phase 1:

- Advanced persistent threats (APT) with nation-state capabilities
- Physical security of infrastructure (delegated to cloud provider)
- Denial of Service (DoS) attacks (mitigated by cloud provider)
- Supply chain attacks on third-party dependencies
- Side-channel attacks (timing, cache, etc.)

### A.4 Security Assumptions

#### A.4.1 Infrastructure Assumptions

- Cloud provider (AWS/Azure/GCP) implements physical security
- Network infrastructure provides DDoS protection
- HTTPS/TLS 1.3 terminates at load balancer
- Database encryption at rest provided by cloud provider
- Backup storage is encrypted and access-controlled

#### A.4.2 Deployment Assumptions

- Application deployed in India region (regulatory requirement)
- No cross-region data replication in Phase 1
- Single tenant per database instance in Phase 1
- Redis instance dedicated per environment (dev/staging/prod)

#### A.4.3 Operational Assumptions

- Security patches applied within 30 days of release
- Secrets managed via environment variables or secret manager
- No credentials stored in source code or configuration files
- All production access logged and reviewed

---

## Section B: Authentication Model (Task 0.5.9)

### B.1 JWT Token Structure

The MindFlow platform uses JSON Web Tokens (JWT) for stateless authentication, as specified in [TECH_STACK.md](./TECH_STACK.md).

#### B.1.1 Access Token

**Purpose**: Short-lived token for API access authentication.

**Expiry**: 15 minutes

**Claims Structure**:

| Claim | Type | Description | Required | Example |
|-------|------|-------------|----------|---------|
| `user_id` | UUID | Unique user identifier | Yes | `"a1b2c3d4-e5f6-4789-0123-456789abcdef"` |
| `tenant_id` | UUID | Tenant organization identifier | Yes | `"tenant-uuid-1234"` |
| `roles` | Array[String] | User roles within tenant | Yes | `["HR_ADMIN", "MANAGER"]` |
| `email` | String | User email address | Yes | `"user@example.com"` |
| `exp` | Integer | Expiration timestamp (Unix epoch) | Yes | `1736876400` |
| `iat` | Integer | Issued at timestamp (Unix epoch) | Yes | `1736875500` |
| `jti` | UUID | JWT unique identifier (for revocation) | Yes | `"jti-uuid-5678"` |
| `token_type` | String | Token type identifier | Yes | `"access"` |
| `iss` | String | Issuer (MindFlow platform) | Yes | `"mindflow.platform"` |
| `sub` | UUID | Subject (same as user_id) | Yes | `"a1b2c3d4-e5f6-4789-0123-456789abcdef"` |

**Signature Algorithm**: HMAC-SHA256 (HS256)

**Example Access Token Payload**:
```json
{
  "user_id": "a1b2c3d4-e5f6-4789-0123-456789abcdef",
  "tenant_id": "tenant-uuid-1234",
  "roles": ["HR_ADMIN", "MANAGER"],
  "email": "hradmin@example.com",
  "exp": 1736876400,
  "iat": 1736875500,
  "jti": "jti-access-uuid-5678",
  "token_type": "access",
  "iss": "mindflow.platform",
  "sub": "a1b2c3d4-e5f6-4789-0123-456789abcdef"
}
```

#### B.1.2 Refresh Token

**Purpose**: Long-lived token for obtaining new access tokens without re-authentication.

**Expiry**: 7 days

**Claims Structure**:

| Claim | Type | Description | Required | Example |
|-------|------|-------------|----------|---------|
| `user_id` | UUID | Unique user identifier | Yes | `"a1b2c3d4-e5f6-4789-0123-456789abcdef"` |
| `tenant_id` | UUID | Tenant organization identifier | Yes | `"tenant-uuid-1234"` |
| `exp` | Integer | Expiration timestamp (Unix epoch) | Yes | `1737480300` |
| `iat` | Integer | Issued at timestamp (Unix epoch) | Yes | `1736875500` |
| `jti` | UUID | JWT unique identifier (for revocation) | Yes | `"jti-refresh-uuid-9012"` |
| `token_type` | String | Token type identifier | Yes | `"refresh"` |
| `iss` | String | Issuer (MindFlow platform) | Yes | `"mindflow.platform"` |
| `sub` | UUID | Subject (same as user_id) | Yes | `"a1b2c3d4-e5f6-4789-0123-456789abcdef"` |

**Security Considerations**:
- Refresh tokens do NOT include `roles[]` claim (prevents stale role caching)
- Refresh tokens are single-use (rotated on every use)
- Refresh tokens stored in HTTP-only, Secure, SameSite=Strict cookies
- Refresh tokens cannot be used for API access

### B.2 Token Lifecycle

#### B.2.1 Token Issuance

**Login Flow**:
1. User submits credentials (email + password) to `/auth/login` endpoint
2. Backend validates credentials against bcrypt hash
3. Backend checks account lockout status
4. Backend generates access token (15 min expiry) and refresh token (7 day expiry)
5. Backend stores refresh token `jti` in Redis with user_id mapping
6. Backend returns:
   - Access token in JSON response body
   - Refresh token in HTTP-only cookie
7. Frontend stores access token in memory (not localStorage)

**Token Generation**:
```
Access Token:
- Claims: user_id, tenant_id, roles[], email, exp (now + 15 min), iat (now), jti (UUID v4), token_type="access"
- Signature: HS256 with secret key from environment variable

Refresh Token:
- Claims: user_id, tenant_id, exp (now + 7 days), iat (now), jti (UUID v4), token_type="refresh"
- Signature: HS256 with secret key from environment variable
- Redis storage: SET refresh_token:{jti} {user_id} EX 604800 (7 days)
```

#### B.2.2 Token Rotation

**Refresh Flow**:
1. Client sends refresh token (from HTTP-only cookie) to `/auth/refresh` endpoint
2. Backend validates refresh token signature and expiry
3. Backend checks if refresh token `jti` exists in Redis
4. Backend checks if refresh token `jti` is NOT in blacklist
5. Backend deletes old refresh token `jti` from Redis (single-use enforcement)
6. Backend generates NEW access token (15 min expiry) and NEW refresh token (7 day expiry)
7. Backend stores new refresh token `jti` in Redis
8. Backend returns new access token and new refresh token
9. Old refresh token is now invalid (cannot be reused)

**Rotation Benefits**:
- Prevents refresh token replay attacks
- Limits exposure window if refresh token is stolen
- Enables detection of compromised tokens (if old token is reused, triggers security alert)

**Rotation Table**:

| Event | Old Access Token | Old Refresh Token | New Access Token | New Refresh Token |
|-------|------------------|-------------------|------------------|-------------------|
| Initial Login | N/A | N/A | Generated (15 min) | Generated (7 days) |
| Refresh (before 15 min) | Expired or near expiry | Valid | Generated (15 min) | Generated (7 days) |
| Refresh (after 15 min) | Expired | Valid | Generated (15 min) | Generated (7 days) |
| Refresh with expired token | Expired | Expired | Error 401 | Error 401 |
| Refresh with revoked token | Any state | Revoked | Error 401 | Error 401 |

### B.3 Token Revocation

#### B.3.1 Revocation Mechanisms

**Purpose**: Immediately invalidate tokens before natural expiry.

**Revocation Triggers**:
- User logout (explicit)
- Password change (all sessions)
- Admin termination of user account
- Admin revocation of specific session
- Security event detection (e.g., multiple failed attempts)

**Blacklist Implementation**:

**Storage**: Redis sorted set (for efficient expiry management)

**Data Structure**:
```
Key: token_blacklist:{tenant_id}
Type: Sorted Set
Members: {jti} (token unique ID)
Score: {exp} (expiration timestamp)
TTL: None (members auto-pruned)
```

**Blacklist Operations**:

| Operation | Redis Command | Description |
|-----------|---------------|-------------|
| Add to blacklist | `ZADD token_blacklist:{tenant_id} {exp} {jti}` | Add token with expiry score |
| Check if blacklisted | `ZSCORE token_blacklist:{tenant_id} {jti}` | Returns score if exists |
| Prune expired | `ZREMRANGEBYSCORE token_blacklist:{tenant_id} 0 {now}` | Remove expired entries |
| Revoke all user tokens | `ZADD token_blacklist:{tenant_id} {exp1} {jti1} {exp2} {jti2} ...` | Batch add all user tokens |

**Validation Flow**:
```
On every API request:
1. Extract JWT from Authorization header
2. Verify signature and expiry
3. Extract jti claim
4. Check Redis: ZSCORE token_blacklist:{tenant_id} {jti}
5. If score exists: Reject request (401 Unauthorized)
6. If no score: Proceed with authorization checks
```

#### B.3.2 Revocation Scenarios

**Scenario 1: User Logout**
- Frontend calls `/auth/logout` with current access token
- Backend extracts `jti` from access token
- Backend adds access token `jti` to blacklist (TTL = remaining time until exp)
- Backend deletes refresh token `jti` from Redis storage
- Backend returns success (200 OK)

**Scenario 2: Password Change**
- User changes password via `/auth/change-password`
- Backend retrieves all active sessions for user_id from Redis
- Backend adds all access token `jti` values to blacklist
- Backend deletes all refresh token `jti` values from Redis
- User must re-authenticate with new password

**Scenario 3: Admin Account Termination**
- HR_ADMIN deactivates user account
- Backend marks user as inactive in database
- Backend retrieves all active sessions for user_id
- Backend adds all tokens to blacklist
- Backend deletes all refresh tokens
- User immediately loses access (next API call rejected)

**Scenario 4: Session Revocation**
- User views active sessions in profile
- User clicks "Revoke" on specific session
- Backend adds that session's access token `jti` to blacklist
- Backend deletes that session's refresh token `jti`
- Specific device/browser loses access

### B.4 Token Security Controls

#### B.4.1 Storage Security

| Token Type | Storage Location | Security Attributes | Rationale |
|------------|-----------------|---------------------|-----------|
| Access Token | Frontend memory (variable) | Not persisted to disk | XSS cannot steal from localStorage |
| Refresh Token | HTTP-only cookie | Secure, SameSite=Strict, HTTP-only | CSRF and XSS protection |
| Signing Secret | Environment variable | Restricted OS permissions | Not in source code or version control |

#### B.4.2 Transport Security

- All tokens transmitted over HTTPS/TLS 1.3 only
- No tokens in URL query parameters (prevents logging/referrer leakage)
- Access token in `Authorization: Bearer {token}` header
- Refresh token in cookie (automatic transmission)

#### B.4.3 Token Validation Checklist

On every authenticated request, the backend MUST:

1. Verify token signature (HS256 with secret key)
2. Verify token expiry (`exp` claim > current time)
3. Verify issuer (`iss` claim == "mindflow.platform")
4. Verify token type (`token_type` claim == "access" for API calls)
5. Verify `jti` not in blacklist (Redis check)
6. Extract `user_id`, `tenant_id`, `roles[]` for authorization

If ANY validation fails: Return 401 Unauthorized

---

## Section C: Authorization Model (Task 0.5.10)

### C.1 Role-Based Access Control (RBAC)

The MindFlow platform implements a role-based access control system with tenant-scoped roles and hierarchy-based data filtering.

#### C.1.1 Role Definitions

**System Roles**:

| Role Code | Role Name | Scope | Description | Assignment Authority |
|-----------|-----------|-------|-------------|---------------------|
| `SUPER_ADMIN` | Super Administrator | Cross-Tenant | Platform-level administration (if applicable in future phases) | System Installation |
| `SYSTEM_ADMIN` | System Administrator | Tenant | Configure workflows, SLA, system settings, view logs | SUPER_ADMIN |
| `HR_ADMIN` | HR Administrator | Tenant | Full employee records, hierarchy management, role assignment | SYSTEM_ADMIN |
| `FINANCE_ADMIN` | Finance Administrator | Tenant | Full expense records, payment processing, financial reports | SYSTEM_ADMIN |
| `TRAINING_ADMIN` | Training Administrator | Tenant | Training content management, course assignments, certifications | SYSTEM_ADMIN or HR_ADMIN |
| `MANAGER` | Manager | Tenant | Manage subordinates, approve requests, view team data | HR_ADMIN |
| `EMPLOYEE` | Employee | Tenant | Access own data, submit requests, view assigned tasks | HR_ADMIN or Auto-assigned |

**Role Hierarchy** (in terms of privilege level, NOT reporting hierarchy):
```
SUPER_ADMIN (cross-tenant, Phase 2+)
    |
SYSTEM_ADMIN (tenant-scoped)
    |
    +-- HR_ADMIN
    |
    +-- FINANCE_ADMIN
    |
    +-- TRAINING_ADMIN
    |
MANAGER (hierarchy-based access)
    |
EMPLOYEE (self-access only)
```

**Important Distinctions**:
- Role hierarchy (above) is for permission inheritance
- HR hierarchy (reporting relationships) is for data filtering
- A user can have multiple roles (e.g., `["MANAGER", "TRAINING_ADMIN"]`)

#### C.1.2 Role Assignment

**Assignment Rules**:
1. All users MUST have at least `EMPLOYEE` role
2. Users can hold multiple roles simultaneously
3. Roles are tenant-scoped (user can have different roles in different tenants, future phases)
4. Role assignments stored in `user_tenant_roles` table
5. Role changes trigger immediate session invalidation (user must re-login)

**Assignment Process**:
```
HR_ADMIN assigns MANAGER role:
1. HR_ADMIN submits role assignment request
2. Backend validates HR_ADMIN has permission to assign MANAGER role
3. Backend inserts record in user_tenant_roles (user_id, tenant_id, role, assigned_by, assigned_at)
4. Backend invalidates all existing sessions for target user
5. Backend logs role assignment event in audit log
6. User must re-login to receive updated roles[] in JWT
```

**Database Schema (Reference)**:
```sql
CREATE TABLE user_tenant_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role VARCHAR(50) NOT NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    UNIQUE(user_id, tenant_id, role)
);
```

### C.2 Permission Model

#### C.2.1 Three-Dimensional Permission Matrix

Permissions are evaluated across three dimensions:

1. **Module Level**: Which module (HR, Training, Expense, Task, etc.)
2. **Action Level**: What operation (read, create, update, delete, approve)
3. **Resource Level**: Whose data (own, subordinates, all)

**Permission Notation**: `{module}:{action}:{resource}`

**Examples**:
- `hr:read:own` - Read own HR records
- `hr:read:subordinates` - Read subordinate HR records
- `hr:update:all` - Update all HR records in tenant
- `expense:approve:subordinates` - Approve subordinate expense claims
- `training:create:all` - Create training content for all users

#### C.2.2 Role Permission Matrix

| Role | Module Permissions | Resource Scope | Special Privileges |
|------|-------------------|----------------|-------------------|
| `EMPLOYEE` | All modules: `read:own`, `create:own`, `update:own` | Own records only | Submit requests |
| `MANAGER` | All modules: `read:subordinates`, `approve:subordinates` | Subordinates (via HR hierarchy) | Approve leave, expenses, tasks |
| `HR_ADMIN` | HR: `*:all`, Other modules: `read:all` | All tenant records | Manage hierarchy, assign roles, employee lifecycle |
| `FINANCE_ADMIN` | Expense: `*:all`, Other modules: `read:all` | All tenant records | Payment processing, financial reports |
| `TRAINING_ADMIN` | Training: `*:all`, Other modules: `read:all` | All tenant records | Manage courses, assignments, certifications |
| `SYSTEM_ADMIN` | All modules: `read:all`, System: `*:all` | All tenant records | Configure workflows, SLA, integrations, system logs |
| `SUPER_ADMIN` | All modules: `*:all` | Cross-tenant | Tenant creation, platform configuration, global settings |

**Notation**: `*` = all actions (read, create, update, delete, approve)

#### C.2.3 Detailed Permission Matrix by Module

**HR Module**:

| Role | Read | Create | Update | Delete | Approve | Resource Scope |
|------|------|--------|--------|--------|---------|----------------|
| EMPLOYEE | Own profile | Own profile updates | Own profile | No | No | Self |
| MANAGER | Subordinates | No | Subordinates (limited) | No | Leave requests | Subordinates |
| HR_ADMIN | All | All | All | All (soft delete) | All | Tenant-wide |
| SYSTEM_ADMIN | All | No | No | No | No | Tenant-wide |

**Expense Module**:

| Role | Read | Create | Update | Delete | Approve | Resource Scope |
|------|------|--------|--------|--------|---------|----------------|
| EMPLOYEE | Own claims | Own claims | Own claims (draft) | Own claims (draft) | No | Self |
| MANAGER | Subordinate claims | No | No | No | Subordinate claims | Subordinates |
| FINANCE_ADMIN | All claims | System expenses | All | All | All | Tenant-wide |
| SYSTEM_ADMIN | All | No | No | No | No | Tenant-wide |

**Training Module**:

| Role | Read | Create | Update | Delete | Approve | Resource Scope |
|------|------|--------|--------|--------|---------|----------------|
| EMPLOYEE | Assigned courses | Enrollment requests | Own progress | No | No | Self |
| MANAGER | Subordinate progress | Course assignments (subordinates) | No | No | Enrollment requests | Subordinates |
| TRAINING_ADMIN | All | Courses, content | Courses, content | Courses | All | Tenant-wide |
| SYSTEM_ADMIN | All | No | No | No | No | Tenant-wide |

**Task Management Module**:

| Role | Read | Create | Update | Delete | Approve | Resource Scope |
|------|------|--------|--------|--------|---------|----------------|
| EMPLOYEE | Assigned tasks | Tasks for self | Own tasks | No | No | Self |
| MANAGER | Subordinate tasks | Tasks for subordinates | Subordinate tasks | Subordinate tasks | Task completion | Subordinates |
| HR_ADMIN | All tasks | All tasks | All tasks | All tasks | All | Tenant-wide |
| SYSTEM_ADMIN | All | No | Workflow config | No | No | Tenant-wide |

### C.3 Hierarchy-Based Filtering

#### C.3.1 HR Hierarchy as Backbone

As documented in [PRD.md](./PRD.md) and [CROSS_CUTTING_AND_RULES.md](./CROSS_CUTTING_AND_RULES.md), the HR organizational hierarchy is the backbone for data access filtering.

**Hierarchy Principles**:
1. Every employee (except CEO/top-level) has exactly one manager
2. Managers access subordinate data transitively (entire subtree)
3. Hierarchy stored in `employees` table (`manager_id` foreign key)
4. Hierarchy changes (promotions, transfers) immediately affect access

**Hierarchy Structure Example**:
```
CEO (no manager)
  |
  +-- VP Sales (manager_id = CEO_id)
  |     |
  |     +-- Sales Manager APAC (manager_id = VP_Sales_id)
  |           |
  |           +-- Sales Rep 1 (manager_id = Sales_Manager_APAC_id)
  |           +-- Sales Rep 2 (manager_id = Sales_Manager_APAC_id)
  |
  +-- VP Engineering (manager_id = CEO_id)
        |
        +-- Engineering Manager (manager_id = VP_Engineering_id)
              |
              +-- Developer 1 (manager_id = Engineering_Manager_id)
              +-- Developer 2 (manager_id = Engineering_Manager_id)
```

#### C.3.2 Subordinate Data Access

**Definition**: "Subordinates" = All employees in the reporting subtree below the manager.

**Query Pattern** (PostgreSQL Recursive CTE):
```sql
-- Get all subordinates for a manager
WITH RECURSIVE subordinates AS (
    -- Base case: direct reports
    SELECT id, manager_id, email, name
    FROM employees
    WHERE manager_id = :manager_user_id
      AND tenant_id = :tenant_id

    UNION

    -- Recursive case: reports of reports
    SELECT e.id, e.manager_id, e.email, e.name
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.id
    WHERE e.tenant_id = :tenant_id
)
SELECT * FROM subordinates;
```

**Access Control Flow** (Manager accessing subordinate expense claim):
```
1. Request: GET /api/expenses/{expense_id}
2. Authentication: Validate JWT, extract user_id, tenant_id, roles[]
3. Authorization:
   a. Check if "MANAGER" in roles[]
   b. Query expense record, get expense.employee_id
   c. Execute subordinates query to get all subordinate user_ids
   d. Check if expense.employee_id IN subordinate_user_ids
   e. If yes: Grant access
   f. If no: Check if expense.employee_id == user_id (own record)
   g. If no: Return 403 Forbidden
4. Apply RLS: WHERE tenant_id = :tenant_id (automatic)
5. Return data
```

#### C.3.3 Hierarchy Change Impact

**Scenario**: Employee transfers from Manager A to Manager B

**Immediate Effects**:
1. Database update: `UPDATE employees SET manager_id = :manager_b_id WHERE id = :employee_id`
2. Manager A immediately loses access to employee's data
3. Manager B immediately gains access to employee's data
4. No session invalidation required (hierarchy checked on every request)
5. Audit log records hierarchy change

**Edge Cases**:
- Employee promoted to manager: Gains access to new subordinates
- Manager demoted to individual contributor: Loses access to former subordinates
- Circular hierarchy prevented by database constraint checks

### C.4 Multi-Tenancy Authorization

#### C.4.1 Tenant Isolation

**Principle**: All authorization checks are tenant-scoped; users cannot access data from other tenants.

**Implementation Layers**:

1. **JWT Level**: `tenant_id` claim is immutable, signed by server
2. **Application Level**: All queries include `WHERE tenant_id = :tenant_id` predicate
3. **Database Level**: Row-Level Security (RLS) policies enforce tenant_id filtering
4. **Role Level**: Roles are tenant-scoped (user_tenant_roles table)

**RLS Policy Example** (PostgreSQL):
```sql
-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access expenses from their tenant
CREATE POLICY tenant_isolation_policy ON expenses
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Application sets tenant_id from JWT on every connection
-- SET LOCAL app.current_tenant_id = :tenant_id;
```

#### C.4.2 Cross-Tenant Access (SUPER_ADMIN)

**Phase 1 Limitation**: No cross-tenant access (single tenant deployment).

**Future Phases** (Phase 2+):
- `SUPER_ADMIN` role can access multiple tenants for platform administration
- Explicit tenant selection required for each operation
- Enhanced audit logging for cross-tenant access
- Separate "platform admin" UI with tenant selector

**SUPER_ADMIN Operations** (Future):
- Create new tenants
- View aggregated platform metrics
- Configure global system settings
- Manage tenant subscriptions and billing
- Access support tickets across tenants

### C.5 Authorization Decision Flow

#### C.5.1 Decision Algorithm

For every protected API request:

```
FUNCTION authorize(request, user_context):
    # Extract context
    user_id = user_context.user_id
    tenant_id = user_context.tenant_id
    roles = user_context.roles
    requested_resource = request.resource
    requested_action = request.action

    # Step 1: Tenant validation
    IF requested_resource.tenant_id != tenant_id:
        RETURN DENY ("Cross-tenant access forbidden")

    # Step 2: Role-based permission check
    required_permission = "{module}:{action}:{resource_scope}"
    IF NOT has_permission(roles, required_permission):
        RETURN DENY ("Insufficient role permissions")

    # Step 3: Resource scope validation
    resource_scope = get_resource_scope(roles, requested_resource)
    IF resource_scope == "own":
        IF requested_resource.owner_id != user_id:
            RETURN DENY ("Access limited to own records")

    ELSE IF resource_scope == "subordinates":
        subordinate_ids = get_subordinates(user_id, tenant_id)
        IF requested_resource.owner_id NOT IN subordinate_ids:
            IF requested_resource.owner_id != user_id:
                RETURN DENY ("Access limited to subordinates")

    ELSE IF resource_scope == "all":
        # Access granted to all tenant resources
        PASS

    # Step 4: Attribute-based checks (optional, future enhancement)
    # E.g., data classification, time-based access, location

    RETURN ALLOW
```

#### C.5.2 Authorization Error Responses

| HTTP Status | Error Code | Scenario | Response Message |
|-------------|-----------|----------|------------------|
| 401 Unauthorized | `AUTH_REQUIRED` | No authentication token | "Authentication required" |
| 401 Unauthorized | `TOKEN_EXPIRED` | Expired JWT | "Token expired, please refresh" |
| 401 Unauthorized | `TOKEN_INVALID` | Invalid signature or malformed | "Invalid authentication token" |
| 403 Forbidden | `INSUFFICIENT_PERMISSIONS` | User lacks required role | "Insufficient permissions for this operation" |
| 403 Forbidden | `RESOURCE_ACCESS_DENIED` | Resource outside scope (e.g., not subordinate) | "Access denied to this resource" |
| 403 Forbidden | `TENANT_MISMATCH` | Cross-tenant access attempt | "Resource not found" (leak prevention) |

**Security Note**: For tenant mismatch, return generic "Resource not found" (404 or 403) instead of "Cross-tenant access forbidden" to prevent tenant enumeration attacks.

---

## Section D: Password Policy (Task 0.5.11)

### D.1 Password Strength Requirements

#### D.1.1 Composition Rules

**Minimum Length**: 12 characters

**Complexity**: Must contain at least 3 of the following 4 categories:
1. Uppercase letters (A-Z)
2. Lowercase letters (a-z)
3. Digits (0-9)
4. Special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Prohibited Patterns**:
- Common passwords (checked against top 10,000 common passwords list)
- Username or email address (or parts thereof)
- Tenant name or organization name
- Sequential characters (e.g., "123456", "abcdef")
- Repeated characters (e.g., "aaaaaa", "111111")
- Keyboard patterns (e.g., "qwerty", "asdfgh")

**Examples**:

| Password | Valid? | Reason |
|----------|--------|--------|
| `MyP@ssw0rd2024` | Yes | 14 chars, 4 categories |
| `SecurePass123!` | Yes | 14 chars, 4 categories |
| `longpassword` | No | Only lowercase (1 category) |
| `Short1!` | No | Only 7 characters (< 12) |
| `Password123` | No | Common password |
| `john@example.com` | No | Matches email address |
| `qwerty123456` | No | Keyboard pattern |

#### D.1.2 Password Validation Logic

**Validation Function** (Pseudocode):
```python
def validate_password(password, user_email, tenant_name):
    # Length check
    if len(password) < 12:
        return False, "Password must be at least 12 characters"

    # Category counting
    categories = 0
    if re.search(r'[A-Z]', password):
        categories += 1
    if re.search(r'[a-z]', password):
        categories += 1
    if re.search(r'[0-9]', password):
        categories += 1
    if re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        categories += 1

    if categories < 3:
        return False, "Password must contain at least 3 character types"

    # Common password check
    if password.lower() in common_passwords_list:
        return False, "Password is too common, please choose a stronger password"

    # Personal information check
    if user_email.split('@')[0].lower() in password.lower():
        return False, "Password must not contain your username"

    if tenant_name.lower() in password.lower():
        return False, "Password must not contain organization name"

    # Sequential/repeated character check
    if has_sequential_chars(password) or has_repeated_chars(password):
        return False, "Password must not contain sequential or repeated characters"

    return True, "Password meets requirements"
```

**Frontend Validation**:
- Real-time password strength meter (weak/fair/good/strong)
- Visual indicators for each requirement (length, categories, prohibited patterns)
- Client-side validation before submission (UX improvement)
- Server-side validation is authoritative (security enforcement)

### D.2 Password Storage

#### D.2.1 Hashing Algorithm

**Algorithm**: bcrypt

**Cost Factor**: 12 (2^12 = 4,096 iterations)

**Rationale**:
- bcrypt is designed for password hashing (slow, computationally expensive)
- Adaptive algorithm (cost factor can be increased as hardware improves)
- Built-in salt generation (unique salt per password)
- Resistant to rainbow table and GPU-based attacks

**Storage Format**:
```
$2b$12$R9h/cIPz0gi.URNNX3kh2OWj8RQWP7K7qfLZmKlE.gVfDnVwPQk6K
 |  |  |                                                    |
 |  |  |                                                    +-- Hash (31 chars)
 |  |  +-- Salt (22 chars)
 |  +-- Cost factor (12)
 +-- Algorithm identifier (2b = bcrypt)
```

**Hash Generation** (Pseudocode):
```python
import bcrypt

def hash_password(plain_password: str) -> str:
    # Generate salt with cost factor 12
    salt = bcrypt.gensalt(rounds=12)
    # Hash password with salt
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )
```

#### D.2.2 Database Storage

**Schema** (Reference):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- other fields...
);
```

**Security Controls**:
- `password_hash` column never returned in API responses
- Password hashes never logged (even in debug mode)
- Database backups encrypted at rest
- Access to users table restricted to backend service account only

### D.3 Password Expiry Policy

#### D.3.1 No Forced Expiry (Modern Best Practice)

**Policy**: Passwords do NOT expire automatically based on age.

**Rationale** (NIST SP 800-63B Guidance):
- Forced expiry leads to predictable password patterns (e.g., "Password1", "Password2")
- Users write down passwords or reuse slight variations
- No security benefit if passwords are strong and not compromised
- Modern threat models prioritize breach detection over forced rotation

**Exceptions Requiring Password Change**:
1. **Compromise Detection**: Evidence of password breach or unauthorized access
2. **Security Incident**: Suspected account compromise or data breach
3. **Password Reset**: User-initiated "forgot password" flow
4. **First-Time Login**: Temporary password must be changed on first use
5. **Admin-Forced Reset**: HR_ADMIN or SYSTEM_ADMIN can force password reset for specific user

#### D.3.2 Password Change Tracking

**Tracked Metadata**:
- `password_changed_at`: Timestamp of last password change
- `password_reset_required`: Boolean flag for forced reset
- `password_history`: Last 5 password hashes (prevent immediate reuse)

**Password History Validation**:
```python
def validate_password_not_reused(user_id, new_password):
    # Retrieve last 5 password hashes for user
    password_history = get_password_history(user_id, limit=5)

    # Check if new password matches any historical password
    for old_hash in password_history:
        if bcrypt.checkpw(new_password.encode('utf-8'), old_hash.encode('utf-8')):
            return False, "Password was recently used, please choose a different password"

    return True, "Password is acceptable"
```

### D.4 Account Lockout Policy

#### D.4.1 Lockout Trigger

**Threshold**: 5 failed login attempts

**Time Window**: 15 minutes

**Lockout Duration**: 30 minutes

**Logic**:
```
IF failed_attempts >= 5 within last 15 minutes:
    Lock account for 30 minutes
    Send security alert email to user
    Log lockout event in audit log
```

#### D.4.2 Lockout Implementation

**Redis-Based Tracking**:
```
Key: login_attempts:{user_email}
Type: List
Values: [timestamp1, timestamp2, timestamp3, ...]
TTL: 15 minutes (auto-expire)

Key: account_locked:{user_email}
Type: String
Value: locked_until_timestamp
TTL: 30 minutes
```

**Failed Login Flow**:
```python
def handle_failed_login(email):
    # Record failed attempt
    redis.lpush(f"login_attempts:{email}", current_timestamp)
    redis.expire(f"login_attempts:{email}", 900)  # 15 min TTL

    # Count attempts in last 15 minutes
    attempts_window = current_timestamp - 900  # 15 min ago
    recent_attempts = redis.lrange(f"login_attempts:{email}", 0, -1)
    recent_attempts = [ts for ts in recent_attempts if ts > attempts_window]

    # Check lockout threshold
    if len(recent_attempts) >= 5:
        # Lock account for 30 minutes
        locked_until = current_timestamp + 1800  # 30 min
        redis.setex(f"account_locked:{email}", 1800, locked_until)

        # Send security alert
        send_lockout_email(email, locked_until)

        # Log security event
        audit_log.warning(f"Account locked due to multiple failed attempts: {email}")

    return len(recent_attempts)
```

**Successful Login Flow**:
```python
def handle_successful_login(email):
    # Clear failed attempts
    redis.delete(f"login_attempts:{email}")

    # Check if account is locked
    if redis.exists(f"account_locked:{email}"):
        # Account was locked but password was correct
        # This may indicate password guessing or user retry
        audit_log.info(f"Successful login during lockout period: {email}")

        # Optionally: still enforce lockout (reject login)
        # OR: clear lockout (allow login if password correct)
        # Decision: Clear lockout (user remembered password)
        redis.delete(f"account_locked:{email}")
```

#### D.4.3 Lockout Bypass and Recovery

**User Self-Service Recovery**:
1. User receives lockout notification email
2. Email contains lockout duration and expiry time
3. Email includes "Forgot Password" link if user suspects compromise
4. User waits 30 minutes for automatic unlock
5. OR user resets password via "Forgot Password" (immediate unlock)

**Admin Override**:
- HR_ADMIN or SYSTEM_ADMIN can manually unlock account
- Unlock action logged in audit trail
- User notified via email of admin unlock

**Security Considerations**:
- Lockout applies to email address (not user_id) to prevent enumeration
- Lockout threshold prevents brute-force attacks (5 attempts = 32-bit keyspace at most)
- 30-minute lockout duration balances security (attacker delay) vs. usability (user inconvenience)

---

## Section E: Session Management (Task 0.5.12)

### E.1 Session Lifecycle

#### E.1.1 Session Creation

**Trigger**: Successful user authentication (login)

**Session Components**:
1. **Access Token** (JWT, 15 min expiry, in-memory frontend storage)
2. **Refresh Token** (JWT, 7 day expiry, HTTP-only cookie)
3. **Session Metadata** (Redis, user_id, device info, created_at, last_accessed_at)

**Session Storage** (Redis):
```
Key: session:{session_id}
Type: Hash
Fields:
    user_id: UUID
    tenant_id: UUID
    device_type: "desktop" | "mobile" | "tablet"
    browser: "Chrome 120.0"
    ip_address: "192.168.1.100"
    created_at: 1736875500
    last_accessed_at: 1736875500
    refresh_token_jti: "jti-refresh-uuid"
TTL: 43200 seconds (12 hours, absolute timeout)
```

**Session ID**: Unique identifier (UUIDv4), stored in refresh token `jti` claim

**Creation Flow**:
```
1. User submits credentials to /auth/login
2. Backend validates credentials
3. Backend generates session_id (UUIDv4)
4. Backend creates session metadata in Redis
5. Backend generates access token (session_id in jti claim)
6. Backend generates refresh token (session_id in jti claim)
7. Backend returns tokens to client
8. Frontend stores access token in memory
9. Browser stores refresh token in HTTP-only cookie
```

#### E.1.2 Session Timeouts

**Idle Timeout**: 30 minutes

**Definition**: Maximum time of inactivity (no API requests) before session expires.

**Implementation**:
- Redis session key TTL updated on every API request
- `last_accessed_at` timestamp updated on every request
- If user inactive for 30 minutes: Session deleted from Redis
- Next API request fails (401 Unauthorized)
- Frontend prompts user to re-authenticate

**Absolute Timeout**: 12 hours

**Definition**: Maximum session lifetime regardless of activity.

**Implementation**:
- `created_at` timestamp stored in session metadata
- On every API request, check: `current_time - created_at > 43200` (12 hours)
- If absolute timeout exceeded: Delete session from Redis, revoke tokens
- User must re-authenticate (cannot refresh)

**Timeout Comparison**:

| Timeout Type | Duration | Reset on Activity? | Bypass Allowed? | Use Case |
|--------------|----------|-------------------|-----------------|----------|
| Idle Timeout | 30 minutes | Yes (sliding window) | No | Prevent abandoned sessions |
| Absolute Timeout | 12 hours | No (fixed from creation) | No | Prevent indefinite sessions |
| Access Token Expiry | 15 minutes | No | Via refresh token | Limit token exposure |
| Refresh Token Expiry | 7 days | No | No | Limit refresh window |

**Timeout Logic** (Pseudocode):
```python
def validate_session(session_id):
    session = redis.hgetall(f"session:{session_id}")

    if not session:
        return False, "Session not found or expired (idle timeout)"

    # Check absolute timeout
    created_at = session['created_at']
    if current_timestamp - created_at > 43200:  # 12 hours
        redis.delete(f"session:{session_id}")
        return False, "Session expired (absolute timeout)"

    # Update last accessed (idle timeout reset)
    redis.hset(f"session:{session_id}", "last_accessed_at", current_timestamp)
    redis.expire(f"session:{session_id}", 1800)  # Reset idle timeout to 30 min

    return True, session
```

### E.2 Session Invalidation

#### E.2.1 Invalidation Triggers

**User-Initiated**:
1. **Explicit Logout**: User clicks "Logout" button
2. **Device Logout**: User revokes specific device session from profile
3. **Logout All Devices**: User clicks "Logout all devices" in security settings

**System-Initiated**:
1. **Password Change**: User changes password (invalidate all sessions)
2. **Role Change**: HR_ADMIN modifies user roles (invalidate all sessions)
3. **Account Deactivation**: HR_ADMIN deactivates user account
4. **Security Event**: Suspicious activity detected (e.g., impossible travel)

**Time-Based**:
1. **Idle Timeout**: 30 minutes of inactivity
2. **Absolute Timeout**: 12 hours from session creation
3. **Refresh Token Expiry**: 7 days from issuance

#### E.2.2 Invalidation Process

**Logout Flow** (Single Device):
```
1. Frontend sends POST /auth/logout with access token
2. Backend validates access token
3. Backend extracts session_id from jti claim
4. Backend deletes session from Redis: DELETE session:{session_id}
5. Backend adds access token jti to blacklist (until token exp)
6. Backend adds refresh token jti to blacklist (until token exp)
7. Backend deletes refresh token from Redis storage
8. Backend returns 200 OK
9. Frontend clears access token from memory
10. Browser clears refresh token cookie
```

**Password Change Flow** (All Devices):
```
1. User submits password change request
2. Backend validates current password
3. Backend validates new password (strength, history)
4. Backend updates password_hash in database
5. Backend queries all active sessions for user_id:
   SCAN 0 MATCH session:* COUNT 1000
   Filter sessions where user_id = :user_id
6. For each session:
   a. Extract access token jti and refresh token jti
   b. Add both jtis to blacklist
   c. Delete session from Redis
7. Backend logs password change event
8. Backend sends "Password changed" email to user
9. All active devices receive 401 on next API call
10. User must re-login with new password
```

**Account Deactivation Flow**:
```
1. HR_ADMIN marks user as inactive (is_active = false)
2. Backend retrieves all active sessions for user_id
3. Backend invalidates all sessions (same as password change)
4. Backend adds user_id to "deactivated_users" Redis set
5. On every API request, check if user_id in deactivated_users
6. If deactivated: Return 403 Forbidden ("Account deactivated")
7. User cannot login or access any resources
```

### E.3 Multi-Device Session Management

#### E.3.1 Concurrent Sessions

**Policy**: Users can have multiple concurrent sessions (different devices/browsers).

**Rationale**:
- Modern usage patterns: desktop + mobile + tablet
- Restricting to single session creates poor user experience
- Security risks mitigated by session monitoring and revocation controls

**Concurrent Session Limit**: 10 active sessions per user (configurable)

**Enforcement**:
```
On login:
1. Count active sessions for user_id
2. If count >= 10:
   a. Delete oldest session (by created_at)
   b. Send notification email ("New login detected, oldest session terminated")
3. Create new session
```

#### E.3.2 Session Visibility

**User Session Dashboard** (UI feature):
- User navigates to "Security" settings
- Backend returns list of active sessions:
  ```
  GET /api/users/me/sessions
  Response:
  [
    {
      "session_id": "session-uuid-1",
      "device_type": "desktop",
      "browser": "Chrome 120.0",
      "ip_address": "192.168.1.100",
      "location": "Mumbai, India",  // IP geolocation
      "created_at": "2026-01-14T10:30:00Z",
      "last_accessed_at": "2026-01-14T11:45:00Z",
      "is_current": true
    },
    {
      "session_id": "session-uuid-2",
      "device_type": "mobile",
      "browser": "Safari 17.0",
      "ip_address": "203.0.113.50",
      "location": "Delhi, India",
      "created_at": "2026-01-13T08:00:00Z",
      "last_accessed_at": "2026-01-14T09:15:00Z",
      "is_current": false
    }
  ]
  ```

**Session Metadata Captured**:
- Device type (User-Agent parsing: desktop/mobile/tablet)
- Browser and version (User-Agent parsing)
- Operating system (User-Agent parsing)
- IP address
- Approximate location (IP geolocation, city level)
- Created timestamp
- Last accessed timestamp
- Current session indicator

#### E.3.3 Session Revocation

**Individual Session Revocation**:
```
1. User clicks "Revoke" on specific session in dashboard
2. Frontend sends DELETE /api/users/me/sessions/{session_id}
3. Backend validates user owns the session
4. Backend retrieves session metadata from Redis
5. Backend deletes session from Redis
6. Backend adds associated tokens to blacklist
7. Backend logs revocation event
8. Backend returns 200 OK
9. Revoked device receives 401 on next API call
```

**Revoke All Sessions**:
```
1. User clicks "Logout all devices" in security settings
2. Frontend sends POST /api/users/me/sessions/revoke-all
3. Backend retrieves all sessions for user_id
4. Backend deletes all sessions except current session
5. Backend adds all tokens to blacklist
6. Backend logs bulk revocation event
7. Backend returns 200 OK
8. All other devices receive 401 on next API call
9. Current device remains logged in
```

**Security Alert** (Suspicious Session):
- User sees unfamiliar session (unknown location/device)
- User clicks "This wasn't me" button
- Backend revokes that session
- Backend flags account for security review
- Backend sends security alert email to user
- Backend logs potential compromise event

### E.4 Session Security Controls

#### E.4.1 Session Hijacking Prevention

**Measures**:
1. **HTTP-Only Cookies**: Refresh tokens not accessible via JavaScript (XSS protection)
2. **Secure Flag**: Cookies transmitted only over HTTPS
3. **SameSite=Strict**: Cookies not sent in cross-site requests (CSRF protection)
4. **Short-Lived Access Tokens**: 15-minute expiry limits exposure window
5. **Token Binding**: IP address and User-Agent logged (optional enforcement)
6. **Token Rotation**: Refresh tokens rotated on every use (replay detection)

**IP Address Validation** (Optional, Configurable):
```python
def validate_session_ip(session_id, request_ip):
    session = redis.hgetall(f"session:{session_id}")
    original_ip = session['ip_address']

    if request_ip != original_ip:
        # IP address changed (possible hijacking)
        audit_log.warning(f"IP mismatch for session {session_id}: {original_ip} -> {request_ip}")

        # Option 1: Reject request (strict mode)
        # return False, "Session IP mismatch"

        # Option 2: Log and allow (flexible mode, for mobile networks)
        # Update IP address, send security alert
        redis.hset(f"session:{session_id}", "ip_address", request_ip)
        send_security_alert(session['user_id'], "IP address changed")

    return True
```

**User-Agent Validation** (Optional):
- Log User-Agent on session creation
- Compare User-Agent on subsequent requests
- Flag mismatches as suspicious (not blocking, due to browser updates)

#### E.4.2 Session Fixation Prevention

**Vulnerability**: Attacker sets victim's session ID before authentication.

**Prevention**:
1. **New Session on Login**: Always generate new session_id after successful authentication
2. **Invalidate Pre-Auth Session**: If user had anonymous session, delete it on login
3. **Unpredictable Session IDs**: Use UUIDv4 (128-bit random, cryptographically secure)
4. **Refresh Token Rotation**: New refresh token on every use (no fixed session ID)

**Login Flow** (Session Fixation Safe):
```
1. User visits login page (may have anonymous session)
2. User submits credentials
3. Backend validates credentials
4. Backend generates NEW session_id (UUIDv4)
5. Backend deletes any pre-existing session for user
6. Backend creates new session with new session_id
7. Backend returns new tokens
8. Old session (if any) is invalidated
```

#### E.4.3 Session Storage Security

**Redis Security**:
- Redis authentication enabled (requirepass)
- Redis network isolation (not exposed to public internet)
- Redis TLS encryption in transit (if cross-AZ)
- Redis persistence disabled (sessions ephemeral, no disk write)
- Redis maxmemory policy: `allkeys-lru` (evict least recently used)

**Session Data Sensitivity**:
- Session metadata does NOT include sensitive data (no PII beyond user_id)
- IP address and location logged for security monitoring (justified by legitimate interest)
- User-Agent logged for device identification (standard practice)

**Data Retention**:
- Sessions auto-expire (Redis TTL)
- No long-term session logs (audit logs retained per compliance requirements)
- Deleted sessions immediately inaccessible

---

## Section F: Administrative Privilege Boundaries (Task 0.5.13)

### F.1 Administrative Role Definitions

#### F.1.1 HR_ADMIN (HR Administrator)

**Scope**: Tenant-scoped

**Purpose**: Manage employee lifecycle, organizational hierarchy, and HR data.

**Permissions**:

| Category | Permissions | Resource Scope |
|----------|-------------|----------------|
| Employee Management | Create, read, update, deactivate employee records | All employees in tenant |
| Organizational Hierarchy | Define/modify reporting relationships | All positions in tenant |
| Role Assignment | Assign/revoke roles (EMPLOYEE, MANAGER, domain admins) | All users in tenant |
| Leave Management | View/approve/reject all leave requests | All employees in tenant |
| Attendance | View/modify attendance records | All employees in tenant |
| Performance Management | View/edit performance reviews, goals | All employees in tenant |
| HR Reports | Generate employee reports, analytics | Tenant-wide data |

**Restrictions**:
- Cannot access employees in other tenants
- Cannot assign SUPER_ADMIN role (if applicable)
- Cannot modify own role (requires another HR_ADMIN or SYSTEM_ADMIN)
- Cannot delete employee records (only soft delete/deactivate)
- Cannot bypass audit logging

**Privileged Actions** (Require Justification):
1. Accessing personal sensitive data (RESTRICTED classification per [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md))
2. Modifying salary information
3. Assigning administrative roles (HR_ADMIN, SYSTEM_ADMIN, FINANCE_ADMIN)
4. Deactivating user accounts
5. Modifying organizational hierarchy (impacts access control)

**Audit Requirements**:
- All HR_ADMIN actions logged with: user_id, action, target_resource, timestamp, IP address, justification (for sensitive actions)
- Sensitive data access logged separately (RESTRICTED data access per DPDPA)
- Role assignment/revocation logged with approval trail

#### F.1.2 FINANCE_ADMIN (Finance Administrator)

**Scope**: Tenant-scoped

**Purpose**: Manage expense claims, financial transactions, and payment processing.

**Permissions**:

| Category | Permissions | Resource Scope |
|----------|-------------|----------------|
| Expense Management | View/approve/reject all expense claims | All employees in tenant |
| Payment Processing | Process reimbursements, mark as paid | All approved expenses |
| Financial Reports | Generate expense reports, budget analysis | Tenant-wide financial data |
| Vendor Management | Add/edit vendor details (future) | Tenant vendors |
| Budget Configuration | Set department budgets, limits | Tenant-wide |
| Audit Trail | View financial audit logs | Tenant financial transactions |

**Restrictions**:
- Cannot access employee HR data (e.g., performance reviews, personal info)
- Cannot modify organizational hierarchy
- Cannot assign roles
- Cannot access training or task management data (read-only access for context)
- Cannot access expenses from other tenants
- Cannot bypass approval workflows (separation of duties)

**Privileged Actions** (Require Justification):
1. Processing large payments (above threshold, e.g., >50,000 INR)
2. Approving own expense claims (prohibited, requires another FINANCE_ADMIN)
3. Modifying approved expense claims
4. Voiding/canceling payments
5. Accessing financial audit logs

**Separation of Duties**:
- FINANCE_ADMIN cannot approve own expenses (requires peer approval)
- High-value payments require dual approval (two FINANCE_ADMINs)
- Payment processing and reconciliation roles separated (future enhancement)

#### F.1.3 TRAINING_ADMIN (Training Administrator)

**Scope**: Tenant-scoped

**Purpose**: Manage training content, course assignments, and certifications.

**Permissions**:

| Category | Permissions | Resource Scope |
|----------|-------------|----------------|
| Course Management | Create/edit/delete courses and content | All tenant courses |
| Enrollment Management | Assign courses to users, approve enrollments | All employees in tenant |
| Certification Management | Issue/revoke certifications | All employees in tenant |
| Training Reports | View course completion, analytics | Tenant-wide training data |
| Instructor Management | Assign instructors to courses (future) | Tenant instructors |

**Restrictions**:
- Cannot access employee HR data (except name, email, department for course assignment)
- Cannot modify organizational hierarchy
- Cannot assign roles
- Cannot access financial or expense data
- Cannot access other tenants' training data

**Privileged Actions**:
1. Deleting courses with enrolled users
2. Revoking certifications
3. Modifying course completion records
4. Accessing individual learning progress

**Collaboration**:
- HR_ADMIN can assign training requirements
- TRAINING_ADMIN fulfills training assignments
- MANAGER can view subordinate training progress

#### F.1.4 SYSTEM_ADMIN (System Administrator)

**Scope**: Tenant-scoped

**Purpose**: Configure system settings, workflows, SLA, and integrations.

**Permissions**:

| Category | Permissions | Resource Scope |
|----------|-------------|----------------|
| Workflow Configuration | Define/modify approval workflows | Tenant workflows |
| SLA Configuration | Set SLA for tasks, tickets, requests | Tenant SLA policies |
| Integration Management | Configure third-party integrations (future) | Tenant integrations |
| System Settings | Modify tenant-level settings (e.g., work hours, holidays) | Tenant configuration |
| Audit Logs | View all system audit logs | Tenant audit trail |
| Notification Templates | Edit email/notification templates | Tenant templates |
| Read-Only Access | View all module data (for troubleshooting) | All tenant data |

**Restrictions**:
- Cannot modify user data (employees, expenses, etc.) - read-only access
- Cannot assign roles (only HR_ADMIN can assign roles)
- Cannot approve HR/Finance/Training actions (read-only)
- Cannot access other tenants
- Cannot modify audit logs
- Cannot bypass RLS policies

**Privileged Actions**:
1. Modifying workflows (impacts business processes)
2. Accessing audit logs (sensitive data)
3. Viewing all module data (privacy concern)
4. Changing SLA configurations

**Audit Requirements**:
- SYSTEM_ADMIN read access to sensitive data logged
- Configuration changes logged with before/after values
- Audit log access logged (who accessed audit logs, when)

#### F.1.5 SUPER_ADMIN (Super Administrator) - Phase 2+

**Scope**: Cross-tenant (platform-wide)

**Purpose**: Platform administration, tenant management, global configuration.

**Permissions** (Future Phases):

| Category | Permissions | Resource Scope |
|----------|-------------|----------------|
| Tenant Management | Create/deactivate tenants | All tenants |
| Platform Configuration | Global system settings | Platform-wide |
| Cross-Tenant Reports | Aggregated analytics | All tenants (anonymized) |
| Support Tickets | View/resolve support requests | All tenants |
| Subscription Management | Manage tenant subscriptions, billing | All tenants |
| Platform Audit | View platform-wide audit logs | All tenants |

**Restrictions** (Even for SUPER_ADMIN):
- Cannot access tenant data without explicit tenant selection
- Cannot modify tenant data without justification and approval
- Cannot bypass audit logging
- All cross-tenant access logged with enhanced detail
- Subject to separation of duties (no single SUPER_ADMIN can perform critical actions)

**Enhanced Audit Logging**:
- SUPER_ADMIN actions logged with: user_id, action, tenant_id, justification, approval_id
- Cross-tenant access requires incident ticket or support request ID
- Audit logs immutable, replicated to separate security SIEM

**Phase 1 Status**: SUPER_ADMIN role NOT implemented (single tenant deployment).

### F.2 Privilege Escalation Prevention

#### F.2.1 Role Assignment Controls

**Principle**: Users cannot escalate own privileges; role assignment requires separation of duties.

**Assignment Rules**:

| Assigner Role | Can Assign Roles | Restrictions |
|---------------|------------------|--------------|
| HR_ADMIN | EMPLOYEE, MANAGER, domain admins (HR/FINANCE/TRAINING_ADMIN) | Cannot assign SYSTEM_ADMIN, cannot modify own role |
| SYSTEM_ADMIN | HR_ADMIN, FINANCE_ADMIN, TRAINING_ADMIN | Cannot assign SYSTEM_ADMIN, requires approval workflow |
| SUPER_ADMIN (Phase 2+) | SYSTEM_ADMIN | Requires dual approval, audit trail |

**Self-Assignment Prevention**:
```python
def assign_role(assigner_user_id, target_user_id, role):
    # Prevent self-assignment
    if assigner_user_id == target_user_id:
        if role in ["HR_ADMIN", "FINANCE_ADMIN", "TRAINING_ADMIN", "SYSTEM_ADMIN", "SUPER_ADMIN"]:
            return False, "Cannot assign administrative roles to self"

    # Validate assigner has permission
    if not has_permission(assigner_user_id, f"roles:assign:{role}"):
        return False, "Insufficient permissions to assign this role"

    # Log role assignment
    audit_log.info(f"Role assignment: {assigner_user_id} assigned {role} to {target_user_id}")

    # Approval workflow for admin roles
    if role in ["HR_ADMIN", "SYSTEM_ADMIN", "FINANCE_ADMIN"]:
        create_approval_request(assigner_user_id, target_user_id, role)
        return True, "Role assignment pending approval"

    # Direct assignment for non-admin roles
    assign_role_direct(target_user_id, role)
    invalidate_user_sessions(target_user_id)  # Force re-login
    return True, "Role assigned successfully"
```

**Approval Workflow**:
1. HR_ADMIN initiates role assignment for FINANCE_ADMIN role
2. System creates approval request (status: PENDING)
3. SYSTEM_ADMIN receives notification
4. SYSTEM_ADMIN reviews request, approves or rejects
5. If approved: Role assigned, target user sessions invalidated
6. If rejected: Requestor notified with reason
7. All steps logged in audit trail

#### F.2.2 Privilege Use Monitoring

**Monitoring Mechanisms**:
1. **Real-Time Alerts**: Suspicious privilege use triggers immediate alert
2. **Periodic Reviews**: Quarterly access reviews by HR_ADMIN and SYSTEM_ADMIN
3. **Anomaly Detection**: Machine learning model flags unusual admin activity (future)
4. **Audit Log Analysis**: SIEM ingests audit logs, correlates events

**Suspicious Activity Indicators**:
- Admin accessing large volume of employee records outside work hours
- Admin accessing records of senior executives without justification
- Admin modifying own role or permissions
- Admin accessing data from departments unrelated to their role
- Multiple failed admin authentication attempts
- Admin activity from unusual IP address or location

**Alert Actions**:
1. Real-time notification to SYSTEM_ADMIN and security team
2. Optional: Temporary privilege suspension pending investigation
3. Incident ticket created for investigation
4. User notified of security review

#### F.2.3 Separation of Duties

**Principle**: Critical operations require multiple roles or approvals.

**Separation Matrix**:

| Operation | Role 1 | Role 2 | Approval Required? |
|-----------|--------|--------|--------------------|
| Assign HR_ADMIN role | HR_ADMIN (requestor) | SYSTEM_ADMIN (approver) | Yes |
| Assign SYSTEM_ADMIN role | SYSTEM_ADMIN (requestor) | SUPER_ADMIN (approver, Phase 2+) | Yes |
| Process high-value payment (>50k INR) | FINANCE_ADMIN (requestor) | FINANCE_ADMIN (approver, different user) | Yes |
| Deactivate HR_ADMIN account | HR_ADMIN (requestor) | SYSTEM_ADMIN (approver) | Yes |
| Modify approval workflow | SYSTEM_ADMIN | HR_ADMIN (business owner approval) | Yes |
| Access RESTRICTED employee data | HR_ADMIN | Justification logged, no approval (DPDPA compliance) | No (logged) |

**Dual Approval Implementation**:
```python
def process_high_value_payment(requestor_id, expense_id, amount):
    if amount > 50000:  # INR
        # Require dual approval
        approval_request = create_approval_request(
            requestor_id=requestor_id,
            resource_type="expense_payment",
            resource_id=expense_id,
            approvers_required=1,  # One other FINANCE_ADMIN
            approver_role="FINANCE_ADMIN"
        )

        # Exclude requestor from approver pool
        approval_request.excluded_approvers = [requestor_id]

        return "Approval request created, awaiting peer approval"

    else:
        # Direct processing for payments under threshold
        process_payment(expense_id)
        return "Payment processed successfully"
```

### F.3 Admin Privilege Boundaries Summary

#### F.3.1 Access Control Matrix

| Role | HR Data | Finance Data | Training Data | System Config | Cross-Tenant | Audit Logs |
|------|---------|--------------|---------------|---------------|--------------|------------|
| EMPLOYEE | Own only | Own only | Own only | Read (settings) | No | Own actions |
| MANAGER | Subordinates | Subordinates | Subordinates | Read | No | Own + subordinates |
| HR_ADMIN | All (tenant) | Read (tenant) | Read (tenant) | Read | No | HR module |
| FINANCE_ADMIN | Read (tenant) | All (tenant) | Read (tenant) | Read | No | Finance module |
| TRAINING_ADMIN | Read (tenant) | Read (tenant) | All (tenant) | Read | No | Training module |
| SYSTEM_ADMIN | Read (tenant) | Read (tenant) | Read (tenant) | All (tenant) | No | All (tenant) |
| SUPER_ADMIN (Phase 2+) | Read (cross-tenant) | Read (cross-tenant) | Read (cross-tenant) | All (platform) | Yes | All (platform) |

**Legend**:
- **All**: Full CRUD (create, read, update, delete) access
- **Read**: View-only access
- **Own**: User's own records only
- **Subordinates**: Direct and indirect reports (HR hierarchy)
- **Tenant**: All records within user's tenant
- **Cross-tenant**: Multiple tenants (SUPER_ADMIN only)

#### F.3.2 Privileged Action Audit Requirements

All administrative actions MUST be logged with the following metadata:

| Field | Description | Example |
|-------|-------------|---------|
| `event_id` | Unique event identifier | `"evt-uuid-1234"` |
| `timestamp` | ISO 8601 timestamp | `"2026-01-14T12:30:00Z"` |
| `user_id` | Admin user identifier | `"user-uuid-5678"` |
| `tenant_id` | Tenant context | `"tenant-uuid-9012"` |
| `role` | Admin role used | `"HR_ADMIN"` |
| `action` | Operation performed | `"assign_role"` |
| `resource_type` | Type of resource | `"user_role"` |
| `resource_id` | Resource identifier | `"user-uuid-3456"` |
| `before_value` | State before change (if update) | `"EMPLOYEE"` |
| `after_value` | State after change (if update) | `"MANAGER"` |
| `justification` | Reason for action (if sensitive) | `"Promotion to team lead"` |
| `approval_id` | Approval request ID (if applicable) | `"approval-uuid-7890"` |
| `ip_address` | Client IP address | `"192.168.1.100"` |
| `user_agent` | Client User-Agent | `"Mozilla/5.0..."` |
| `result` | Success or failure | `"success"` |
| `error_message` | Error details (if failed) | `null` |

**Retention**: Admin audit logs retained for 7 years (per DPDPA and IT Act compliance, see [COMPLIANCE_MAPPING.md](./COMPLIANCE_MAPPING.md)).

**Access**: Audit logs accessible only to SYSTEM_ADMIN and security team; immutable (append-only).

---

## Security Architecture Summary

### Integrated Security Model

The MindFlow platform security architecture integrates multiple layers of defense:

1. **Zero-Trust Foundation**: Never trust, always verify; strict tenant isolation; authentication ≠ authorization
2. **Stateless Authentication**: JWT-based with short-lived access tokens (15 min) and rotated refresh tokens (7 days)
3. **Granular Authorization**: RBAC with module/action/resource dimensions; hierarchy-based subordinate access
4. **Strong Password Security**: 12+ char, 3/4 categories, bcrypt cost 12; no forced expiry (modern best practice)
5. **Robust Session Management**: 30 min idle timeout, 12 hour absolute timeout; multi-device support with revocation
6. **Bounded Admin Privileges**: Tenant-scoped admins; separation of duties; privilege escalation prevention; comprehensive audit

### Security Control Summary Table

| Control Domain | Key Controls | Technology | Compliance Alignment |
|----------------|--------------|------------|---------------------|
| Authentication | JWT (HS256), 15 min access token, 7 day refresh token rotation | FastAPI JWT, Redis | DPDPA (authentication), IT Act Sec 43A |
| Authorization | RBAC, hierarchy-based filtering, RLS | PostgreSQL RLS, FastAPI dependencies | DPDPA (access control), ISO 27001 A.9 |
| Password Security | 12 char min, bcrypt cost 12, no expiry, 5-attempt lockout | bcrypt, Redis | DPDPA (security), NIST SP 800-63B |
| Session Management | 30 min idle, 12 hour absolute, multi-device revocation | Redis session store | DPDPA (security), SOC 2 CC6.1 |
| Token Revocation | Redis blacklist, logout/password change triggers | Redis sorted sets | DPDPA (data subject rights) |
| Tenant Isolation | RLS policies, JWT tenant_id claim, tenant-scoped queries | PostgreSQL RLS | DPDPA (data isolation) |
| Admin Privileges | Tenant-scoped roles, separation of duties, audit logs | RBAC, audit logging | DPDPA (accountability), ISO 27001 A.9.2 |
| Audit Logging | All admin actions, 7-year retention, immutable logs | Audit log service, SIEM | DPDPA Sec 8, IT Act, ISO 27001 A.12.4 |

### Threat Mitigation Summary

| Threat | Mitigation Controls | Residual Risk |
|--------|-------------------|---------------|
| Brute-force password attacks | 5-attempt lockout, bcrypt cost 12 | Low |
| Token theft (XSS) | HTTP-only cookies, short-lived access tokens | Low |
| Token theft (CSRF) | SameSite=Strict cookies | Low |
| Session hijacking | Token rotation, IP/User-Agent logging, short expiry | Low-Medium |
| Privilege escalation | Self-assignment prevention, approval workflows | Low |
| Cross-tenant access | RLS policies, JWT tenant_id validation | Very Low |
| Password guessing | Strong password policy, common password check | Low |
| Malicious admin | Audit logging, separation of duties, anomaly detection | Medium |
| Compromised credentials | Token revocation, password change invalidation | Low |
| Session fixation | New session on login, unpredictable IDs | Very Low |

**Overall Security Posture**: Strong defense-in-depth with multiple mitigating controls per threat.

---

## Compliance Alignment

### DPDPA (Digital Personal Data Protection Act, 2023)

| DPDPA Requirement | Security Architecture Control | Reference Section |
|-------------------|-------------------------------|-------------------|
| Data security safeguards (Sec 8) | Encryption in transit (HTTPS), access control (RBAC), authentication (JWT) | B.1, C.1, C.2 |
| Access limitation | Role-based access, hierarchy filtering, tenant isolation | C.2, C.3, C.4 |
| Accountability | Comprehensive audit logging, admin action tracking | F.3.2 |
| Data Principal rights | Token revocation (right to erasure support), session termination | B.3, E.2 |
| Consent management | (Handled at application layer, not auth architecture) | N/A |

### Information Technology Act, 2000

| IT Act Provision | Security Architecture Control | Reference Section |
|------------------|-------------------------------|-------------------|
| Sec 43A (Reasonable security practices) | Password policy, session management, access control | D, E, C |
| Sec 72A (Unauthorized disclosure) | RBAC prevents unauthorized access, audit logs track access | C.2, F.3.2 |
| Sec 66C (Identity theft) | Strong authentication, token validation | B.1, B.4 |

### ISO 27001:2022

| ISO 27001 Control | Security Architecture Control | Reference Section |
|-------------------|-------------------------------|-------------------|
| A.9.2 User access management | RBAC role assignment, approval workflows | C.1, F.2.1 |
| A.9.3 User responsibilities | Password policy, session management responsibilities | D.1, E.1 |
| A.9.4 System and application access control | Authentication (JWT), authorization (RBAC, RLS) | B, C |
| A.12.4 Logging and monitoring | Audit logging of admin actions, security events | F.3.2 |

### SOC 2 Type II

| Trust Service Criteria | Security Architecture Control | Reference Section |
|------------------------|-------------------------------|-------------------|
| CC6.1 Logical access controls | RBAC, authentication, session management | B, C, E |
| CC6.2 Authentication | JWT-based authentication, password policy | B.1, D.1 |
| CC6.3 Authorization | Role-based authorization, hierarchy filtering | C.2, C.3 |
| CC7.2 Monitoring | Audit logging, privilege use monitoring | F.2.2, F.3.2 |

**Compliance Status**: Security architecture controls align with all referenced regulatory and framework requirements.

---

## Approval Record

| Role | Name | Status | Date | Signature |
|------|------|--------|------|-----------|
| Product Owner | [Name] | APPROVED | 2026-01-14 | All 7 tasks (0.5.8-0.5.13) approved. Security architecture comprehensive and aligned with compliance requirements. |
| Development Lead | [Name] | PENDING | - | - |
| Security Lead | [Name] | PENDING | - | - |
| Compliance Officer | [Name] | PENDING | - | - |

**Approval Status**: APPROVED (2026-01-14)

**Review Notes**:
- Document covers Tasks 0.5.8 through 0.5.13 comprehensively
- All cross-references to COMPLIANCE_MAPPING.md, PRD.md, TECH_STACK.md, CROSS_CUTTING_AND_RULES.md validated
- Security controls aligned with technology stack (JWT, FastAPI, PostgreSQL RLS, Redis)
- Compliance mappings verified against regulatory requirements
- Admin privilege boundaries defined with separation of duties

**Next Steps**:
1. Product Owner review and approval
2. Security team review and penetration testing
3. Implementation planning (Task 0.5.14)
4. Integration with architecture diagrams

---

## Document Change Control

| Version | Date | Author | Changes | Approval Status |
|---------|------|--------|---------|----------------|
| 1.0 | 2026-01-14 | Development Team | Initial draft - Phase 0.5 Group 2 (Tasks 0.5.8 - 0.5.13) | APPROVED |

**Change Log**:
- **v1.0** (2026-01-14): Initial comprehensive security architecture document created, covering zero-trust assumptions, authentication (JWT), authorization (RBAC), password policy, session management, and admin privilege boundaries. Cross-referenced COMPLIANCE_MAPPING.md, PRD.md, TECH_STACK.md, CROSS_CUTTING_AND_RULES.md.

---

**Document End**

**Total Sections**: 6 main sections (A-F) + summary and compliance sections
**Total Subsections**: 30+ detailed subsections
**Total Tables**: 25+ detailed tables and matrices
**Compliance Coverage**: DPDPA, IT Act, ISO 27001, SOC 2
**Technology Alignment**: FastAPI, PostgreSQL RLS, Redis, JWT (HS256)

This document serves as the comprehensive security architecture specification for the MindFlow platform Phase 1 implementation.
