# MindFlow – API Contract & Integration Design

> **Purpose**: Define complete API contracts for all MindFlow services
> **SDLC Phase**: Phase 3 – API Contract & Integration Design
> **Tasks Covered**: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
> **Status**: COMPLETE - Product Owner Approved
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 3 – API Contract & Integration Design |
| **SDLC Tasks** | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) |
| **Approval Status** | COMPLETE - Product Owner Approved (2026-01-16) |

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication Standards](#2-authentication-standards)
3. [Common Response Format](#3-common-response-format)
4. [Pagination Standards](#4-pagination-standards)
5. [Error Handling Standards](#5-error-handling-standards)
6. [Validation Rules](#6-validation-rules)
7. [Authorization Matrix](#7-authorization-matrix)
8. [Module APIs](#8-module-apis)
   - [8.1 auth-module](#81-auth-module)
   - [8.2 hr-module](#82-hr-module)
   - [8.3 task-module](#83-task-module)
   - [8.4 mindmap-module](#84-mindmap-module)
   - [8.5 training-module](#85-training-module)
   - [8.6 expense-module](#86-expense-module)
   - [8.7 complaint-module](#87-complaint-module)
   - [8.8 approval-module](#88-approval-module)
   - [8.9 notification-module](#89-notification-module)
   - [8.10 storage-module](#810-storage-module)
9. [Inter-Module Communication](#9-inter-module-communication)
10. [Security Review Against Threat Model](#10-security-review-against-threat-model)
11. [API Versioning Strategy](#11-api-versioning-strategy)

---

## 1. API Design Principles

### 1.1 RESTful Conventions

| Principle | Implementation |
|-----------|----------------|
| **Resource Naming** | Plural nouns (e.g., `/users`, `/tasks`, `/employees`) |
| **HTTP Methods** | GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE (remove) |
| **URL Structure** | `/api/v1/{module}/{resource}/{id?}/{sub-resource?}` |
| **Idempotency** | PUT and DELETE are idempotent; POST is not |
| **Stateless** | All state in JWT; no server-side session dependency |

### 1.2 Naming Conventions

```
Endpoints:        snake_case for query params, camelCase for JSON body
Examples:
  Query:          ?page_size=20&sort_by=created_at
  JSON Body:      { "firstName": "John", "lastName": "Doe" }
  Path:           /api/v1/hr/employees/{employee_id}
```

### 1.3 Content Types

| Type | Usage |
|------|-------|
| `application/json` | All request/response bodies |
| `multipart/form-data` | File uploads only |

---

## 2. Authentication Standards

### 2.1 JWT Token Structure

**Access Token (15 minutes)**:
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "email": "user@example.com",
  "roles": ["MANAGER", "HR_ADMIN"],
  "permissions": ["hr:read:all", "hr:write:subordinates"],
  "exp": 1234567890,
  "iat": 1234567890,
  "jti": "unique-token-id",
  "token_type": "access",
  "iss": "mindflow",
  "sub": "uuid"
}
```

**Refresh Token (7 days)**:
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "jti": "unique-token-id",
  "token_type": "refresh",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### 2.2 Authentication Headers

```
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_uuid> (optional - extracted from token if not provided)
X-Request-ID: <correlation_id> (optional - generated if not provided)
```

### 2.3 Token Refresh Flow

1. Client detects 401 response or token near expiry
2. Client calls `POST /api/v1/auth/token/refresh` with refresh token
3. Server validates refresh token, issues new access + refresh tokens
4. Old refresh token is revoked (rotation)

---

## 3. Common Response Format

### 3.1 Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

### 3.2 Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "message": "Retrieved successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

### 3.3 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

## 4. Pagination Standards

### 4.1 Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number (1-indexed) |
| `page_size` | integer | 20 | 100 | Items per page |
| `sort_by` | string | `created_at` | - | Field to sort by |
| `sort_order` | enum | `desc` | - | `asc` or `desc` |

### 4.2 Example Request

```
GET /api/v1/hr/employees?page=2&page_size=25&sort_by=last_name&sort_order=asc
```

---

## 5. Error Handling Standards

### 5.1 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST (resource created) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Validation errors, malformed request |
| `401` | Unauthorized | Missing/invalid/expired token |
| `403` | Forbidden | Valid token, insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Duplicate resource, state conflict |
| `422` | Unprocessable Entity | Business logic validation failure |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Maintenance or overload |

### 5.2 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_TOKEN_EXPIRED` | 401 | Access token has expired |
| `AUTH_TOKEN_INVALID` | 401 | Token is malformed or invalid |
| `AUTH_REFRESH_INVALID` | 401 | Refresh token is invalid or revoked |
| `AUTH_CREDENTIALS_INVALID` | 401 | Wrong email/password |
| `AUTH_ACCOUNT_LOCKED` | 403 | Account locked due to failed attempts |
| `AUTH_ACCOUNT_INACTIVE` | 403 | User account is deactivated |
| `AUTHZ_INSUFFICIENT_PERMISSION` | 403 | User lacks required permission |
| `AUTHZ_TENANT_MISMATCH` | 403 | Resource belongs to different tenant |
| `AUTHZ_HIERARCHY_VIOLATION` | 403 | Action not allowed by hierarchy |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `VALIDATION_REQUIRED_FIELD` | 400 | Required field missing |
| `VALIDATION_INVALID_FORMAT` | 400 | Field format invalid |
| `VALIDATION_OUT_OF_RANGE` | 400 | Value outside allowed range |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RESOURCE_ALREADY_EXISTS` | 409 | Resource with identifier exists |
| `RESOURCE_STATE_CONFLICT` | 409 | Invalid state transition |
| `BUSINESS_RULE_VIOLATION` | 422 | Business logic constraint violated |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 5.3 Error Response Examples

**Validation Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Email is required", "code": "VALIDATION_REQUIRED_FIELD" },
      { "field": "phoneNumber", "message": "Invalid phone format", "code": "VALIDATION_INVALID_FORMAT" }
    ]
  },
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**Authorization Error**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHZ_INSUFFICIENT_PERMISSION",
    "message": "You do not have permission to delete employees",
    "details": [
      { "required": "hr:delete:all", "actual": "hr:delete:subordinates" }
    ]
  },
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

## 6. Validation Rules

### 6.1 Common Field Validations

| Field Type | Rules |
|------------|-------|
| **UUID** | Valid UUID v4 format |
| **Email** | RFC 5322 compliant, max 255 chars |
| **Password** | Min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special |
| **Phone** | E.164 format (e.g., +919876543210), max 15 digits |
| **Name** | 1-100 chars, alphanumeric + spaces + hyphens |
| **Date** | ISO 8601 format (YYYY-MM-DD) |
| **DateTime** | ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ) |
| **Currency** | Decimal(15,2), non-negative |
| **Percentage** | Decimal(5,2), 0-100 |
| **URL** | Valid URL format, max 2048 chars |
| **Text (short)** | Max 255 chars |
| **Text (medium)** | Max 1000 chars |
| **Text (long)** | Max 10000 chars |

### 6.2 Business Validations

| Context | Rule |
|---------|------|
| **Employee Assignment** | Assignee must be active employee in same tenant |
| **Hierarchy Scope** | User can only access own data or subordinates (based on role) |
| **Date Ranges** | End date must be >= start date |
| **Leave Balance** | Cannot exceed available balance |
| **Expense Limits** | Per-item and total limits per category |
| **SLA Configuration** | Escalation hours must be < breach hours |
| **Status Transitions** | Only valid transitions allowed (see state machines) |

### 6.3 File Upload Validations

| Constraint | Value |
|------------|-------|
| **Max File Size** | 10 MB per file, 50 MB per request |
| **Allowed Types** | Images: jpg, jpeg, png, gif, webp; Documents: pdf, doc, docx, xls, xlsx, ppt, pptx; Archives: zip |
| **Filename** | Max 255 chars, alphanumeric + underscore + hyphen + period |
| **Virus Scan** | Required before storage (Phase 2) |

---

## 7. Authorization Matrix

### 7.1 RBAC Roles

| Role | Code | Scope |
|------|------|-------|
| **Super Admin** | `SUPER_ADMIN` | All tenants, all modules, all actions |
| **System Admin** | `SYSTEM_ADMIN` | Own tenant, all modules, all actions |
| **HR Admin** | `HR_ADMIN` | Own tenant, HR module, all actions |
| **Finance Admin** | `FINANCE_ADMIN` | Own tenant, Expense module, all actions |
| **Training Admin** | `TRAINING_ADMIN` | Own tenant, Training module, all actions |
| **Manager** | `MANAGER` | Own tenant, subordinates scope |
| **Employee** | `EMPLOYEE` | Own tenant, own data scope |

### 7.2 Permission Format

```
{module}:{action}:{scope}

Where:
  module: auth, hr, task, mindmap, training, expense, complaint, approval, notification, storage
  action: create, read, update, delete, approve, export
  scope:  own, subordinates, department, all
```

### 7.3 Module Permission Matrix

#### auth-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `auth:create:all` | Y | Y | N | N | N | N | N |
| `auth:read:all` | Y | Y | N | N | N | N | N |
| `auth:update:all` | Y | Y | N | N | N | N | N |
| `auth:delete:all` | Y | Y | N | N | N | N | N |
| `auth:read:own` | Y | Y | Y | Y | Y | Y | Y |
| `auth:update:own` | Y | Y | Y | Y | Y | Y | Y |

#### hr-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `hr:create:all` | Y | Y | Y | N | N | N | N |
| `hr:read:all` | Y | Y | Y | N | N | N | N |
| `hr:read:subordinates` | Y | Y | Y | N | N | Y | N |
| `hr:read:own` | Y | Y | Y | Y | Y | Y | Y |
| `hr:update:all` | Y | Y | Y | N | N | N | N |
| `hr:update:subordinates` | Y | Y | Y | N | N | Y | N |
| `hr:delete:all` | Y | Y | Y | N | N | N | N |
| `hr:approve:leave` | Y | Y | Y | N | N | Y | N |
| `hr:export:all` | Y | Y | Y | N | N | N | N |

#### task-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `task:create:all` | Y | Y | Y | Y | Y | Y | Y |
| `task:read:all` | Y | Y | Y | Y | Y | N | N |
| `task:read:subordinates` | Y | Y | Y | Y | Y | Y | N |
| `task:read:own` | Y | Y | Y | Y | Y | Y | Y |
| `task:update:all` | Y | Y | N | N | N | N | N |
| `task:update:subordinates` | Y | Y | Y | Y | Y | Y | N |
| `task:update:own` | Y | Y | Y | Y | Y | Y | Y |
| `task:delete:all` | Y | Y | N | N | N | N | N |
| `task:assign:subordinates` | Y | Y | Y | Y | Y | Y | N |

#### expense-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `expense:create:own` | Y | Y | Y | Y | Y | Y | Y |
| `expense:read:all` | Y | Y | N | Y | N | N | N |
| `expense:read:subordinates` | Y | Y | N | Y | N | Y | N |
| `expense:read:own` | Y | Y | Y | Y | Y | Y | Y |
| `expense:update:own` | Y | Y | Y | Y | Y | Y | Y |
| `expense:approve:all` | Y | Y | N | Y | N | N | N |
| `expense:approve:subordinates` | Y | Y | N | Y | N | Y | N |
| `expense:delete:own` | Y | Y | Y | Y | Y | Y | Y |
| `expense:export:all` | Y | Y | N | Y | N | N | N |

#### complaint-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `complaint:create:all` | Y | Y | Y | Y | Y | Y | Y |
| `complaint:read:all` | Y | Y | Y | N | N | N | N |
| `complaint:read:assigned` | Y | Y | Y | Y | Y | Y | Y |
| `complaint:read:own` | Y | Y | Y | Y | Y | Y | Y |
| `complaint:update:assigned` | Y | Y | Y | Y | Y | Y | Y |
| `complaint:resolve:assigned` | Y | Y | Y | Y | Y | Y | N |
| `complaint:escalate:all` | Y | Y | Y | N | N | N | N |
| `complaint:configure:sla` | Y | Y | N | N | N | N | N |

#### training-module Permissions

| Permission | SUPER_ADMIN | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | TRAINING_ADMIN | MANAGER | EMPLOYEE |
|------------|-------------|--------------|----------|---------------|----------------|---------|----------|
| `training:create:all` | Y | Y | N | N | Y | N | N |
| `training:read:all` | Y | Y | Y | N | Y | Y | Y |
| `training:update:all` | Y | Y | N | N | Y | N | N |
| `training:delete:all` | Y | Y | N | N | Y | N | N |
| `training:enroll:subordinates` | Y | Y | Y | N | Y | Y | N |
| `training:enroll:own` | Y | Y | Y | Y | Y | Y | Y |
| `training:grade:all` | Y | Y | N | N | Y | N | N |
| `training:certificate:issue` | Y | Y | N | N | Y | N | N |

---

## 8. Module APIs

### 8.1 auth-module

**Base Path**: `/api/v1/auth`

#### 8.1.1 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/login` | User login with email/password | No |
| `POST` | `/logout` | Invalidate current session | Yes |
| `POST` | `/token/refresh` | Refresh access token | No (refresh token in body) |
| `POST` | `/password/forgot` | Request password reset | No |
| `POST` | `/password/reset` | Reset password with token | No |
| `POST` | `/password/change` | Change password (authenticated) | Yes |
| `GET` | `/me` | Get current user profile | Yes |
| `PUT` | `/me` | Update current user profile | Yes |

#### 8.1.2 User Management Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/users` | List all users | `auth:read:all` |
| `POST` | `/users` | Create new user | `auth:create:all` |
| `GET` | `/users/{user_id}` | Get user by ID | `auth:read:all` |
| `PUT` | `/users/{user_id}` | Update user | `auth:update:all` |
| `DELETE` | `/users/{user_id}` | Deactivate user | `auth:delete:all` |
| `POST` | `/users/{user_id}/activate` | Reactivate user | `auth:update:all` |
| `POST` | `/users/{user_id}/unlock` | Unlock locked account | `auth:update:all` |

#### 8.1.3 Role & Permission Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/roles` | List all roles | `auth:read:all` |
| `POST` | `/roles` | Create custom role | `auth:create:all` |
| `GET` | `/roles/{role_id}` | Get role details | `auth:read:all` |
| `PUT` | `/roles/{role_id}` | Update role | `auth:update:all` |
| `DELETE` | `/roles/{role_id}` | Delete role | `auth:delete:all` |
| `GET` | `/permissions` | List all permissions | `auth:read:all` |
| `PUT` | `/users/{user_id}/roles` | Assign roles to user | `auth:update:all` |

#### 8.1.4 Tenant Management Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/tenants` | List all tenants | `SUPER_ADMIN` only |
| `POST` | `/tenants` | Create new tenant | `SUPER_ADMIN` only |
| `GET` | `/tenants/{tenant_id}` | Get tenant details | `SUPER_ADMIN` or own tenant |
| `PUT` | `/tenants/{tenant_id}` | Update tenant | `SUPER_ADMIN` or `SYSTEM_ADMIN` |
| `DELETE` | `/tenants/{tenant_id}` | Deactivate tenant | `SUPER_ADMIN` only |

#### 8.1.5 Session Management Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/sessions` | List active sessions | `auth:read:own` |
| `DELETE` | `/sessions/{session_id}` | Terminate specific session | `auth:update:own` |
| `DELETE` | `/sessions` | Terminate all sessions except current | `auth:update:own` |

#### Request/Response Schemas

**POST /login**

Request:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["MANAGER"],
      "tenantId": "uuid"
    }
  },
  "message": "Login successful",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /users**

Request:
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "TempP@ssw0rd123",
  "roles": ["EMPLOYEE"],
  "tenantId": "uuid"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "roles": ["EMPLOYEE"],
    "tenantId": "uuid",
    "status": "ACTIVE",
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "User created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

### 8.2 hr-module

**Base Path**: `/api/v1/hr`

#### 8.2.1 Employee Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/employees` | List employees | `hr:read:*` (scope varies) |
| `POST` | `/employees` | Create employee | `hr:create:all` |
| `GET` | `/employees/{employee_id}` | Get employee | `hr:read:*` |
| `PUT` | `/employees/{employee_id}` | Update employee | `hr:update:*` |
| `DELETE` | `/employees/{employee_id}` | Deactivate employee | `hr:delete:all` |
| `GET` | `/employees/{employee_id}/subordinates` | Get direct reports | `hr:read:subordinates` |
| `GET` | `/employees/{employee_id}/hierarchy` | Get full hierarchy tree | `hr:read:subordinates` |

#### 8.2.2 Department Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/departments` | List departments | `hr:read:all` |
| `POST` | `/departments` | Create department | `hr:create:all` |
| `GET` | `/departments/{department_id}` | Get department | `hr:read:all` |
| `PUT` | `/departments/{department_id}` | Update department | `hr:update:all` |
| `DELETE` | `/departments/{department_id}` | Delete department | `hr:delete:all` |
| `GET` | `/departments/{department_id}/employees` | Get department employees | `hr:read:all` |

#### 8.2.3 Position Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/positions` | List positions | `hr:read:all` |
| `POST` | `/positions` | Create position | `hr:create:all` |
| `GET` | `/positions/{position_id}` | Get position | `hr:read:all` |
| `PUT` | `/positions/{position_id}` | Update position | `hr:update:all` |
| `DELETE` | `/positions/{position_id}` | Delete position | `hr:delete:all` |

#### 8.2.4 Attendance Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/attendance` | List attendance records | `hr:read:*` |
| `POST` | `/attendance/check-in` | Record check-in | `hr:update:own` |
| `POST` | `/attendance/check-out` | Record check-out | `hr:update:own` |
| `GET` | `/attendance/{employee_id}` | Get employee attendance | `hr:read:*` |
| `POST` | `/attendance/bulk` | Bulk attendance import | `hr:create:all` |
| `GET` | `/attendance/report` | Attendance summary report | `hr:read:all` |

#### 8.2.5 Leave Management Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/leave/types` | List leave types | `hr:read:own` |
| `POST` | `/leave/types` | Create leave type | `hr:create:all` |
| `PUT` | `/leave/types/{type_id}` | Update leave type | `hr:update:all` |
| `DELETE` | `/leave/types/{type_id}` | Delete leave type | `hr:delete:all` |
| `GET` | `/leave/balances` | Get leave balances | `hr:read:*` |
| `GET` | `/leave/balances/{employee_id}` | Get employee balances | `hr:read:*` |
| `POST` | `/leave/requests` | Submit leave request | `hr:update:own` |
| `GET` | `/leave/requests` | List leave requests | `hr:read:*` |
| `GET` | `/leave/requests/{request_id}` | Get leave request | `hr:read:*` |
| `PUT` | `/leave/requests/{request_id}` | Update leave request | `hr:update:own` |
| `DELETE` | `/leave/requests/{request_id}` | Cancel leave request | `hr:update:own` |
| `POST` | `/leave/requests/{request_id}/approve` | Approve leave | `hr:approve:leave` |
| `POST` | `/leave/requests/{request_id}/reject` | Reject leave | `hr:approve:leave` |

#### 8.2.6 Payroll Reference Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/payroll/references` | List payroll references | `hr:read:all` |
| `POST` | `/payroll/references` | Create payroll reference | `hr:create:all` |
| `GET` | `/payroll/references/{employee_id}` | Get employee payroll ref | `hr:read:*` |
| `PUT` | `/payroll/references/{employee_id}` | Update payroll reference | `hr:update:all` |

#### 8.2.7 Candidate Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/candidates` | List candidates | `hr:read:all` |
| `POST` | `/candidates` | Create candidate | `hr:create:all` |
| `GET` | `/candidates/{candidate_id}` | Get candidate | `hr:read:all` |
| `PUT` | `/candidates/{candidate_id}` | Update candidate | `hr:update:all` |
| `DELETE` | `/candidates/{candidate_id}` | Delete candidate | `hr:delete:all` |
| `POST` | `/candidates/{candidate_id}/convert` | Convert to employee | `hr:create:all` |

#### Request/Response Schemas

**POST /employees**

Request:
```json
{
  "userId": "uuid",
  "employeeCode": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "+919876543210",
  "dateOfBirth": "1990-05-15",
  "dateOfJoining": "2025-01-15",
  "positionId": "uuid",
  "departmentId": "uuid",
  "reportingManagerId": "uuid",
  "employmentType": "FULL_TIME",
  "address": {
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  }
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeCode": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "phone": "+919876543210",
    "dateOfBirth": "1990-05-15",
    "dateOfJoining": "2025-01-15",
    "position": {
      "id": "uuid",
      "title": "Software Engineer"
    },
    "department": {
      "id": "uuid",
      "name": "Engineering"
    },
    "reportingManager": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "employmentType": "FULL_TIME",
    "status": "ACTIVE",
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Employee created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /leave/requests**

Request:
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2026-02-01",
  "endDate": "2026-02-03",
  "reason": "Family vacation",
  "isHalfDay": false,
  "contactNumber": "+919876543210"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "uuid",
    "leaveType": {
      "id": "uuid",
      "name": "Annual Leave"
    },
    "startDate": "2026-02-01",
    "endDate": "2026-02-03",
    "totalDays": 3,
    "reason": "Family vacation",
    "status": "PENDING",
    "approver": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Leave request submitted successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

### 8.3 task-module

**Base Path**: `/api/v1/tasks`

#### 8.3.1 Task Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List tasks | `task:read:*` |
| `POST` | `/` | Create task | `task:create:all` |
| `GET` | `/{task_id}` | Get task | `task:read:*` |
| `PUT` | `/{task_id}` | Update task | `task:update:*` |
| `PATCH` | `/{task_id}/status` | Update task status | `task:update:*` |
| `DELETE` | `/{task_id}` | Delete task | `task:delete:*` |
| `GET` | `/{task_id}/subtasks` | Get subtasks | `task:read:*` |
| `POST` | `/{task_id}/subtasks` | Create subtask | `task:create:all` |

#### 8.3.2 Task Assignment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{task_id}/assignees` | Get assignees | `task:read:*` |
| `POST` | `/{task_id}/assignees` | Add assignee | `task:assign:subordinates` |
| `DELETE` | `/{task_id}/assignees/{employee_id}` | Remove assignee | `task:assign:subordinates` |
| `POST` | `/{task_id}/reassign` | Bulk reassign | `task:assign:subordinates` |

#### 8.3.3 Task Comment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{task_id}/comments` | List comments | `task:read:*` |
| `POST` | `/{task_id}/comments` | Add comment | `task:read:*` |
| `PUT` | `/{task_id}/comments/{comment_id}` | Edit comment | Own comment only |
| `DELETE` | `/{task_id}/comments/{comment_id}` | Delete comment | Own comment only |

#### 8.3.4 Task Attachment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{task_id}/attachments` | List attachments | `task:read:*` |
| `POST` | `/{task_id}/attachments` | Upload attachment | `task:update:*` |
| `GET` | `/{task_id}/attachments/{attachment_id}` | Download attachment | `task:read:*` |
| `DELETE` | `/{task_id}/attachments/{attachment_id}` | Delete attachment | `task:update:*` |

#### 8.3.5 Task Dependency Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{task_id}/dependencies` | List dependencies | `task:read:*` |
| `POST` | `/{task_id}/dependencies` | Add dependency | `task:update:*` |
| `DELETE` | `/{task_id}/dependencies/{dependency_id}` | Remove dependency | `task:update:*` |

#### 8.3.6 Task View Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/views/kanban` | Kanban board view | `task:read:*` |
| `GET` | `/views/calendar` | Calendar view | `task:read:*` |
| `GET` | `/views/list` | List view with filters | `task:read:*` |
| `GET` | `/my` | My tasks | `task:read:own` |
| `GET` | `/assigned` | Tasks I assigned | `task:read:subordinates` |

#### 8.3.7 Task Status Configuration

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/statuses` | List task statuses | `task:read:own` |
| `POST` | `/statuses` | Create custom status | `SYSTEM_ADMIN` |
| `PUT` | `/statuses/{status_id}` | Update status | `SYSTEM_ADMIN` |
| `DELETE` | `/statuses/{status_id}` | Delete status | `SYSTEM_ADMIN` |

#### Request/Response Schemas

**POST /**

Request:
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "priority": "HIGH",
  "status": "NOT_STARTED",
  "expectedCompletionDate": "2026-02-15",
  "assigneeIds": ["uuid1", "uuid2"],
  "labels": ["backend", "security"],
  "parentTaskId": null,
  "originType": "MANUAL",
  "originId": null
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to the API",
    "priority": "HIGH",
    "status": "NOT_STARTED",
    "expectedCompletionDate": "2026-02-15",
    "assignees": [
      { "id": "uuid1", "name": "John Doe" },
      { "id": "uuid2", "name": "Jane Smith" }
    ],
    "labels": ["backend", "security"],
    "parentTask": null,
    "originType": "MANUAL",
    "createdBy": {
      "id": "uuid",
      "name": "Manager Name"
    },
    "createdAt": "2026-01-16T10:30:00Z",
    "updatedAt": "2026-01-16T10:30:00Z"
  },
  "message": "Task created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**PATCH /{task_id}/status**

Request:
```json
{
  "status": "IN_PROGRESS",
  "comment": "Starting work on this task"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "previousStatus": "NOT_STARTED",
    "newStatus": "IN_PROGRESS",
    "changedAt": "2026-01-16T11:00:00Z",
    "changedBy": {
      "id": "uuid",
      "name": "John Doe"
    }
  },
  "message": "Task status updated",
  "timestamp": "2026-01-16T11:00:00Z",
  "requestId": "uuid"
}
```

#### Task Status State Machine

```
                    ┌──────────────┐
                    │  NOT_STARTED │
                    └───────┬──────┘
                            │
                            ▼
                    ┌──────────────┐
              ┌─────│  IN_PROGRESS │◄────┐
              │     └───────┬──────┘     │
              │             │            │
              ▼             ▼            │
      ┌──────────┐  ┌──────────────┐     │
      │ BLOCKED  │  │   REVIEW     │─────┘
      └────┬─────┘  └───────┬──────┘
           │                │
           └────────┬───────┘
                    ▼
            ┌──────────────┐
            │  COMPLETED   │
            └──────────────┘

            ┌──────────────┐
            │   DROPPED    │ (from any state)
            └──────────────┘
```

---

### 8.4 mindmap-module

**Base Path**: `/api/v1/mindmaps`

#### 8.4.1 Mind Map Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List mind maps | `mindmap:read:*` |
| `POST` | `/` | Create mind map | `mindmap:create:all` |
| `GET` | `/{mindmap_id}` | Get mind map | `mindmap:read:*` |
| `PUT` | `/{mindmap_id}` | Update mind map | `mindmap:update:*` |
| `DELETE` | `/{mindmap_id}` | Archive mind map | `mindmap:delete:*` |
| `POST` | `/{mindmap_id}/duplicate` | Duplicate mind map | `mindmap:create:all` |

#### 8.4.2 Node Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{mindmap_id}/nodes` | Get all nodes | `mindmap:read:*` |
| `POST` | `/{mindmap_id}/nodes` | Create node | `mindmap:update:*` |
| `PUT` | `/{mindmap_id}/nodes/{node_id}` | Update node | `mindmap:update:*` |
| `DELETE` | `/{mindmap_id}/nodes/{node_id}` | Delete node | `mindmap:update:*` |
| `PUT` | `/{mindmap_id}/nodes/{node_id}/position` | Update node position | `mindmap:update:*` |
| `POST` | `/{mindmap_id}/nodes/{node_id}/link-task` | Link task to node | `mindmap:update:*` |
| `DELETE` | `/{mindmap_id}/nodes/{node_id}/link-task` | Unlink task | `mindmap:update:*` |
| `PUT` | `/{mindmap_id}/nodes/bulk-position` | Bulk update positions | `mindmap:update:*` |

#### 8.4.3 Template Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/templates` | List templates | `mindmap:read:*` |
| `POST` | `/templates` | Create template | `SYSTEM_ADMIN` |
| `GET` | `/templates/{template_id}` | Get template | `mindmap:read:*` |
| `PUT` | `/templates/{template_id}` | Update template | `SYSTEM_ADMIN` |
| `DELETE` | `/templates/{template_id}` | Delete template | `SYSTEM_ADMIN` |
| `POST` | `/templates/{template_id}/instantiate` | Create map from template | `mindmap:create:all` |

#### 8.4.4 Node Attachment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{mindmap_id}/nodes/{node_id}/attachments` | List attachments | `mindmap:read:*` |
| `POST` | `/{mindmap_id}/nodes/{node_id}/attachments` | Upload attachment | `mindmap:update:*` |
| `DELETE` | `/{mindmap_id}/nodes/{node_id}/attachments/{attachment_id}` | Delete attachment | `mindmap:update:*` |

#### Request/Response Schemas

**POST /**

Request:
```json
{
  "title": "Q1 Product Roadmap",
  "description": "Planning for Q1 2026 releases",
  "templateId": null
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Q1 Product Roadmap",
    "description": "Planning for Q1 2026 releases",
    "status": "ACTIVE",
    "createdBy": {
      "id": "uuid",
      "name": "John Doe"
    },
    "nodes": [
      {
        "id": "uuid",
        "title": "Central Node",
        "nodeType": "IDEA",
        "parentNodeId": null,
        "xPosition": 0,
        "yPosition": 0,
        "displayOrder": 0
      }
    ],
    "createdAt": "2026-01-16T10:30:00Z",
    "updatedAt": "2026-01-16T10:30:00Z"
  },
  "message": "Mind map created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /{mindmap_id}/nodes**

Request:
```json
{
  "title": "Feature: User Authentication",
  "description": "Implement secure login system",
  "nodeType": "ACTIVITY",
  "parentNodeId": "uuid",
  "xPosition": 150,
  "yPosition": 100,
  "visualMetadata": {
    "color": "#3498db",
    "icon": "lock",
    "labels": ["security", "priority"]
  }
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "mindMapId": "uuid",
    "title": "Feature: User Authentication",
    "description": "Implement secure login system",
    "nodeType": "ACTIVITY",
    "parentNodeId": "uuid",
    "xPosition": 150,
    "yPosition": 100,
    "displayOrder": 1,
    "visualMetadata": {
      "color": "#3498db",
      "icon": "lock",
      "labels": ["security", "priority"]
    },
    "linkedTask": null,
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Node created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /{mindmap_id}/nodes/{node_id}/link-task**

Request:
```json
{
  "taskId": "uuid"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "nodeId": "uuid",
    "linkedTask": {
      "id": "uuid",
      "title": "Implement user authentication",
      "status": "IN_PROGRESS",
      "priority": "HIGH"
    }
  },
  "message": "Task linked successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

### 8.5 training-module

**Base Path**: `/api/v1/training`

#### 8.5.1 Course Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/courses` | List courses | `training:read:all` |
| `POST` | `/courses` | Create course | `training:create:all` |
| `GET` | `/courses/{course_id}` | Get course | `training:read:all` |
| `PUT` | `/courses/{course_id}` | Update course | `training:update:all` |
| `DELETE` | `/courses/{course_id}` | Delete course | `training:delete:all` |
| `POST` | `/courses/{course_id}/publish` | Publish course | `training:update:all` |
| `POST` | `/courses/{course_id}/archive` | Archive course | `training:update:all` |

#### 8.5.2 Training Session Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/sessions` | List sessions | `training:read:all` |
| `POST` | `/sessions` | Create session | `training:create:all` |
| `GET` | `/sessions/{session_id}` | Get session | `training:read:all` |
| `PUT` | `/sessions/{session_id}` | Update session | `training:update:all` |
| `DELETE` | `/sessions/{session_id}` | Cancel session | `training:delete:all` |
| `GET` | `/sessions/{session_id}/attendance` | Get attendance | `training:read:all` |
| `POST` | `/sessions/{session_id}/attendance` | Mark attendance | `training:update:all` |

#### 8.5.3 Enrollment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/enrollments` | List enrollments | `training:read:*` |
| `POST` | `/enrollments` | Create enrollment | `training:enroll:*` |
| `GET` | `/enrollments/{enrollment_id}` | Get enrollment | `training:read:*` |
| `PUT` | `/enrollments/{enrollment_id}` | Update enrollment | `training:update:all` |
| `DELETE` | `/enrollments/{enrollment_id}` | Cancel enrollment | `training:enroll:*` |
| `POST` | `/enrollments/bulk` | Bulk enroll | `training:enroll:subordinates` |
| `GET` | `/my-enrollments` | My enrollments | `training:read:own` |

#### 8.5.4 Exam Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/exams` | List exams | `training:read:all` |
| `POST` | `/exams` | Create exam | `training:create:all` |
| `GET` | `/exams/{exam_id}` | Get exam | `training:read:all` |
| `PUT` | `/exams/{exam_id}` | Update exam | `training:update:all` |
| `DELETE` | `/exams/{exam_id}` | Delete exam | `training:delete:all` |
| `GET` | `/exams/{exam_id}/questions` | Get questions | `training:read:all` |
| `POST` | `/exams/{exam_id}/questions` | Add question | `training:update:all` |
| `PUT` | `/exams/{exam_id}/questions/{question_id}` | Update question | `training:update:all` |
| `DELETE` | `/exams/{exam_id}/questions/{question_id}` | Delete question | `training:update:all` |

#### 8.5.5 Exam Attempt Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `POST` | `/exams/{exam_id}/start` | Start exam attempt | `training:read:own` |
| `GET` | `/attempts/{attempt_id}` | Get attempt | `training:read:*` |
| `POST` | `/attempts/{attempt_id}/submit` | Submit answers | `training:read:own` |
| `GET` | `/attempts/{attempt_id}/results` | Get results | `training:read:*` |
| `GET` | `/my-attempts` | My exam attempts | `training:read:own` |

#### 8.5.6 Certificate Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/certificates` | List certificates | `training:read:*` |
| `GET` | `/certificates/{certificate_id}` | Get certificate | `training:read:*` |
| `POST` | `/certificates/issue` | Issue certificate | `training:certificate:issue` |
| `GET` | `/certificates/{certificate_id}/download` | Download certificate | `training:read:*` |
| `GET` | `/my-certificates` | My certificates | `training:read:own` |

#### 8.5.7 Training Content Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/courses/{course_id}/content` | List course content | `training:read:all` |
| `POST` | `/courses/{course_id}/content` | Upload content | `training:update:all` |
| `GET` | `/content/{content_id}` | Get content | `training:read:all` |
| `PUT` | `/content/{content_id}` | Update content | `training:update:all` |
| `DELETE` | `/content/{content_id}` | Delete content | `training:delete:all` |

#### Request/Response Schemas

**POST /courses**

Request:
```json
{
  "title": "Information Security Fundamentals",
  "description": "Basic security awareness training",
  "category": "COMPLIANCE",
  "durationHours": 4,
  "isMandatory": true,
  "passingScore": 80,
  "validityMonths": 12
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Information Security Fundamentals",
    "description": "Basic security awareness training",
    "category": "COMPLIANCE",
    "durationHours": 4,
    "isMandatory": true,
    "passingScore": 80,
    "validityMonths": 12,
    "status": "DRAFT",
    "createdBy": {
      "id": "uuid",
      "name": "Training Admin"
    },
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Course created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /exams/{exam_id}/start**

Response (201):
```json
{
  "success": true,
  "data": {
    "attemptId": "uuid",
    "examId": "uuid",
    "examTitle": "Security Fundamentals Assessment",
    "startedAt": "2026-01-16T10:30:00Z",
    "timeLimit": 60,
    "expiresAt": "2026-01-16T11:30:00Z",
    "questions": [
      {
        "id": "uuid",
        "questionNumber": 1,
        "questionText": "What is the primary purpose of encryption?",
        "questionType": "MULTIPLE_CHOICE",
        "options": [
          { "id": "a", "text": "To speed up data transfer" },
          { "id": "b", "text": "To protect data confidentiality" },
          { "id": "c", "text": "To compress data" },
          { "id": "d", "text": "To backup data" }
        ],
        "points": 10
      }
    ],
    "totalQuestions": 20,
    "totalPoints": 100
  },
  "message": "Exam started",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

---

### 8.6 expense-module

**Base Path**: `/api/v1/expenses`

#### 8.6.1 Expense Request Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/requests` | List expense requests | `expense:read:*` |
| `POST` | `/requests` | Create expense request | `expense:create:own` |
| `GET` | `/requests/{request_id}` | Get expense request | `expense:read:*` |
| `PUT` | `/requests/{request_id}` | Update expense request | `expense:update:own` |
| `DELETE` | `/requests/{request_id}` | Delete expense request | `expense:delete:own` |
| `POST` | `/requests/{request_id}/submit` | Submit for approval | `expense:update:own` |
| `POST` | `/requests/{request_id}/approve` | Approve request | `expense:approve:*` |
| `POST` | `/requests/{request_id}/reject` | Reject request | `expense:approve:*` |
| `GET` | `/my-requests` | My expense requests | `expense:read:own` |
| `GET` | `/pending-approval` | Requests pending my approval | `expense:approve:*` |

#### 8.6.2 Expense Item Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/requests/{request_id}/items` | List items | `expense:read:*` |
| `POST` | `/requests/{request_id}/items` | Add item | `expense:update:own` |
| `PUT` | `/requests/{request_id}/items/{item_id}` | Update item | `expense:update:own` |
| `DELETE` | `/requests/{request_id}/items/{item_id}` | Delete item | `expense:update:own` |

#### 8.6.3 Receipt Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/requests/{request_id}/receipts` | List receipts | `expense:read:*` |
| `POST` | `/requests/{request_id}/receipts` | Upload receipt | `expense:update:own` |
| `GET` | `/receipts/{receipt_id}` | Download receipt | `expense:read:*` |
| `DELETE` | `/receipts/{receipt_id}` | Delete receipt | `expense:update:own` |

#### 8.6.4 Category Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/categories` | List categories | `expense:read:own` |
| `POST` | `/categories` | Create category | `FINANCE_ADMIN` |
| `PUT` | `/categories/{category_id}` | Update category | `FINANCE_ADMIN` |
| `DELETE` | `/categories/{category_id}` | Delete category | `FINANCE_ADMIN` |

#### 8.6.5 Payment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/payments` | List payments | `expense:read:all` |
| `POST` | `/payments` | Record payment | `FINANCE_ADMIN` |
| `GET` | `/payments/{payment_id}` | Get payment | `expense:read:*` |
| `PUT` | `/payments/{payment_id}` | Update payment | `FINANCE_ADMIN` |

#### 8.6.6 Report Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/reports/summary` | Expense summary | `expense:read:*` |
| `GET` | `/reports/by-category` | Expenses by category | `expense:read:*` |
| `GET` | `/reports/by-employee` | Expenses by employee | `expense:read:all` |
| `GET` | `/reports/export` | Export expenses | `expense:export:all` |

#### Request/Response Schemas

**POST /requests**

Request:
```json
{
  "title": "Client Meeting Travel - January",
  "description": "Travel expenses for client meeting in Delhi",
  "expenseDate": "2026-01-15"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestNumber": "EXP-2026-00001",
    "title": "Client Meeting Travel - January",
    "description": "Travel expenses for client meeting in Delhi",
    "expenseDate": "2026-01-15",
    "status": "DRAFT",
    "totalAmount": 0,
    "currency": "INR",
    "requester": {
      "id": "uuid",
      "name": "John Doe"
    },
    "items": [],
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Expense request created",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /requests/{request_id}/items**

Request:
```json
{
  "categoryId": "uuid",
  "description": "Flight Mumbai to Delhi",
  "amount": 8500.00,
  "currency": "INR",
  "receiptRequired": true
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category": {
      "id": "uuid",
      "name": "Travel - Air"
    },
    "description": "Flight Mumbai to Delhi",
    "amount": 8500.00,
    "currency": "INR",
    "hasReceipt": false,
    "receiptRequired": true,
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Expense item added",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

#### Expense Request State Machine

```
          ┌────────┐
          │ DRAFT  │
          └───┬────┘
              │ submit
              ▼
        ┌───────────┐
        │ SUBMITTED │
        └─────┬─────┘
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
┌──────────┐    ┌──────────┐
│ APPROVED │    │ REJECTED │
└────┬─────┘    └──────────┘
     │
     ▼
┌──────────┐
│  PAID    │
└──────────┘
```

---

### 8.7 complaint-module

**Base Path**: `/api/v1/complaints`

#### 8.7.1 Complaint Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List complaints | `complaint:read:*` |
| `POST` | `/` | Create complaint | `complaint:create:all` |
| `GET` | `/{complaint_id}` | Get complaint | `complaint:read:*` |
| `PUT` | `/{complaint_id}` | Update complaint | `complaint:update:assigned` |
| `POST` | `/{complaint_id}/assign` | Assign complaint | `complaint:update:assigned` |
| `POST` | `/{complaint_id}/escalate` | Escalate complaint | `complaint:escalate:all` |
| `POST` | `/{complaint_id}/resolve` | Resolve complaint | `complaint:resolve:assigned` |
| `POST` | `/{complaint_id}/reopen` | Reopen complaint | `complaint:update:assigned` |
| `GET` | `/my-complaints` | Complaints I created | `complaint:read:own` |
| `GET` | `/assigned-to-me` | Complaints assigned to me | `complaint:read:assigned` |

#### 8.7.2 Complaint Action Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{complaint_id}/actions` | List actions | `complaint:read:*` |
| `POST` | `/{complaint_id}/actions` | Add action | `complaint:update:assigned` |
| `PUT` | `/{complaint_id}/actions/{action_id}` | Update action | `complaint:update:assigned` |

#### 8.7.3 Complaint Attachment Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/{complaint_id}/attachments` | List attachments | `complaint:read:*` |
| `POST` | `/{complaint_id}/attachments` | Upload attachment | `complaint:update:*` |
| `DELETE` | `/{complaint_id}/attachments/{attachment_id}` | Delete attachment | `complaint:update:*` |

#### 8.7.4 Category Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/categories` | List categories | `complaint:read:own` |
| `POST` | `/categories` | Create category | `SYSTEM_ADMIN` |
| `PUT` | `/categories/{category_id}` | Update category | `SYSTEM_ADMIN` |
| `DELETE` | `/categories/{category_id}` | Delete category | `SYSTEM_ADMIN` |

#### 8.7.5 SLA Configuration Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/sla` | List SLA configurations | `complaint:configure:sla` |
| `POST` | `/sla` | Create SLA config | `complaint:configure:sla` |
| `PUT` | `/sla/{sla_id}` | Update SLA config | `complaint:configure:sla` |
| `DELETE` | `/sla/{sla_id}` | Delete SLA config | `complaint:configure:sla` |

#### 8.7.6 Escalation Rule Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/escalation-rules` | List escalation rules | `complaint:configure:sla` |
| `POST` | `/escalation-rules` | Create rule | `complaint:configure:sla` |
| `PUT` | `/escalation-rules/{rule_id}` | Update rule | `complaint:configure:sla` |
| `DELETE` | `/escalation-rules/{rule_id}` | Delete rule | `complaint:configure:sla` |

#### 8.7.7 Report Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/reports/sla-compliance` | SLA compliance report | `complaint:read:all` |
| `GET` | `/reports/by-category` | Complaints by category | `complaint:read:all` |
| `GET` | `/reports/aging` | Aging report | `complaint:read:all` |

#### Request/Response Schemas

**POST /**

Request:
```json
{
  "title": "Service quality issue",
  "description": "Client reported delay in response times",
  "categoryId": "uuid",
  "priority": "HIGH",
  "clientName": "ABC Corporation",
  "clientContact": "+919876543210",
  "clientEmail": "client@abc.com"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "complaintNumber": "CMP-2026-00001",
    "title": "Service quality issue",
    "description": "Client reported delay in response times",
    "category": {
      "id": "uuid",
      "name": "Service Quality"
    },
    "priority": "HIGH",
    "status": "OPEN",
    "clientName": "ABC Corporation",
    "clientContact": "+919876543210",
    "clientEmail": "client@abc.com",
    "sla": {
      "responseHours": 4,
      "resolutionHours": 24,
      "escalationHours": 12,
      "responseDueAt": "2026-01-16T14:30:00Z",
      "resolutionDueAt": "2026-01-17T10:30:00Z"
    },
    "createdBy": {
      "id": "uuid",
      "name": "John Doe"
    },
    "assignedTo": null,
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Complaint created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

#### Complaint State Machine

```
           ┌────────┐
           │  OPEN  │
           └───┬────┘
               │ assign
               ▼
         ┌───────────┐
    ┌────│ ASSIGNED  │────┐
    │    └─────┬─────┘    │
    │          │          │
escalate       │work    escalate
    │          ▼          │
    │   ┌────────────┐    │
    │   │IN_PROGRESS │    │
    │   └──────┬─────┘    │
    │          │          │
    │    ┌─────┴─────┐    │
    │    │           │    │
    │    ▼           ▼    │
    │ ┌──────┐  ┌────────┐│
    │ │PEND- │  │RESOLVED││
    │ │ING   │  └────┬───┘│
    │ └──┬───┘       │    │
    │    │     reopen│    │
    │    └─────┬─────┘    │
    │          │          │
    ▼          ▼          ▼
┌─────────────────────────────┐
│         ESCALATED           │
└─────────────────────────────┘
                │
                ▼
          ┌──────────┐
          │  CLOSED  │
          └──────────┘
```

---

### 8.8 approval-module

**Base Path**: `/api/v1/approvals`

#### 8.8.1 Workflow Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/workflows` | List workflows | `approval:read:all` |
| `POST` | `/workflows` | Create workflow | `SYSTEM_ADMIN` |
| `GET` | `/workflows/{workflow_id}` | Get workflow | `approval:read:all` |
| `PUT` | `/workflows/{workflow_id}` | Update workflow | `SYSTEM_ADMIN` |
| `DELETE` | `/workflows/{workflow_id}` | Delete workflow | `SYSTEM_ADMIN` |
| `POST` | `/workflows/{workflow_id}/activate` | Activate workflow | `SYSTEM_ADMIN` |
| `POST` | `/workflows/{workflow_id}/deactivate` | Deactivate workflow | `SYSTEM_ADMIN` |

#### 8.8.2 Approval Step Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/workflows/{workflow_id}/steps` | List steps | `approval:read:all` |
| `POST` | `/workflows/{workflow_id}/steps` | Add step | `SYSTEM_ADMIN` |
| `PUT` | `/workflows/{workflow_id}/steps/{step_id}` | Update step | `SYSTEM_ADMIN` |
| `DELETE` | `/workflows/{workflow_id}/steps/{step_id}` | Delete step | `SYSTEM_ADMIN` |
| `PUT` | `/workflows/{workflow_id}/steps/reorder` | Reorder steps | `SYSTEM_ADMIN` |

#### 8.8.3 Approval Instance Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/instances` | List instances | `approval:read:*` |
| `POST` | `/instances` | Create instance | Internal use |
| `GET` | `/instances/{instance_id}` | Get instance | `approval:read:*` |
| `GET` | `/instances/{instance_id}/history` | Get decision history | `approval:read:*` |
| `GET` | `/my-pending` | Pending my approval | `approval:read:own` |
| `GET` | `/my-requests` | My approval requests | `approval:read:own` |

#### 8.8.4 Approval Decision Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `POST` | `/instances/{instance_id}/approve` | Approve | Assigned approver |
| `POST` | `/instances/{instance_id}/reject` | Reject | Assigned approver |
| `POST` | `/instances/{instance_id}/delegate` | Delegate | Assigned approver |
| `POST` | `/instances/{instance_id}/request-info` | Request more info | Assigned approver |

#### 8.8.5 Delegation Rule Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/delegations` | List my delegations | `approval:read:own` |
| `POST` | `/delegations` | Create delegation | `approval:update:own` |
| `PUT` | `/delegations/{delegation_id}` | Update delegation | `approval:update:own` |
| `DELETE` | `/delegations/{delegation_id}` | Delete delegation | `approval:update:own` |

#### Request/Response Schemas

**POST /workflows**

Request:
```json
{
  "name": "Expense Approval Workflow",
  "description": "Multi-level expense approval based on amount",
  "entityType": "EXPENSE_REQUEST",
  "isActive": true,
  "steps": [
    {
      "stepOrder": 1,
      "name": "Manager Approval",
      "approverType": "REPORTING_MANAGER",
      "isRequired": true,
      "timeoutHours": 48
    },
    {
      "stepOrder": 2,
      "name": "Finance Approval",
      "approverType": "ROLE",
      "approverRoleId": "uuid-finance-admin",
      "isRequired": true,
      "condition": "amount > 10000",
      "timeoutHours": 72
    }
  ]
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Expense Approval Workflow",
    "description": "Multi-level expense approval based on amount",
    "entityType": "EXPENSE_REQUEST",
    "isActive": true,
    "steps": [
      {
        "id": "uuid",
        "stepOrder": 1,
        "name": "Manager Approval",
        "approverType": "REPORTING_MANAGER",
        "isRequired": true,
        "timeoutHours": 48
      },
      {
        "id": "uuid",
        "stepOrder": 2,
        "name": "Finance Approval",
        "approverType": "ROLE",
        "approverRole": {
          "id": "uuid-finance-admin",
          "name": "Finance Admin"
        },
        "isRequired": true,
        "condition": "amount > 10000",
        "timeoutHours": 72
      }
    ],
    "createdAt": "2026-01-16T10:30:00Z"
  },
  "message": "Workflow created successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**POST /instances/{instance_id}/approve**

Request:
```json
{
  "comments": "Approved. Receipts verified.",
  "attachments": []
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "instanceId": "uuid",
    "decision": "APPROVED",
    "stepName": "Manager Approval",
    "decidedBy": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "decidedAt": "2026-01-16T11:00:00Z",
    "comments": "Approved. Receipts verified.",
    "nextStep": {
      "stepName": "Finance Approval",
      "approver": {
        "id": "uuid",
        "name": "Finance Admin"
      }
    },
    "status": "PENDING_NEXT_APPROVAL"
  },
  "message": "Approval recorded",
  "timestamp": "2026-01-16T11:00:00Z",
  "requestId": "uuid"
}
```

---

### 8.9 notification-module

**Base Path**: `/api/v1/notifications`

#### 8.9.1 Notification Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/` | List my notifications | Authenticated |
| `GET` | `/{notification_id}` | Get notification | Own notification |
| `POST` | `/{notification_id}/read` | Mark as read | Own notification |
| `POST` | `/mark-all-read` | Mark all as read | Authenticated |
| `DELETE` | `/{notification_id}` | Delete notification | Own notification |
| `GET` | `/unread-count` | Get unread count | Authenticated |

#### 8.9.2 Preference Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `GET` | `/preferences` | Get my preferences | Authenticated |
| `PUT` | `/preferences` | Update preferences | Authenticated |

#### 8.9.3 WebSocket Endpoint

| Protocol | Endpoint | Description |
|----------|----------|-------------|
| `WS` | `/ws/notifications` | Real-time notifications |

#### 8.9.4 Internal Endpoints (Module-to-Module)

| Method | Endpoint | Description | Caller |
|--------|----------|-------------|--------|
| `POST` | `/internal/send` | Send notification | Internal modules |
| `POST` | `/internal/broadcast` | Broadcast to group | Internal modules |

#### Request/Response Schemas

**GET /**

Response (200):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "TASK_ASSIGNED",
        "title": "New Task Assigned",
        "message": "You have been assigned to 'Implement user authentication'",
        "metadata": {
          "entityType": "TASK",
          "entityId": "uuid",
          "actionUrl": "/tasks/uuid"
        },
        "isRead": false,
        "createdAt": "2026-01-16T10:30:00Z"
      },
      {
        "id": "uuid",
        "type": "APPROVAL_REQUIRED",
        "title": "Expense Approval Required",
        "message": "John Doe submitted an expense request for Rs. 15,000",
        "metadata": {
          "entityType": "EXPENSE_REQUEST",
          "entityId": "uuid",
          "actionUrl": "/expenses/requests/uuid"
        },
        "isRead": true,
        "createdAt": "2026-01-15T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  },
  "message": "Notifications retrieved",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**PUT /preferences**

Request:
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "preferences": {
    "TASK_ASSIGNED": { "inApp": true, "email": true },
    "TASK_DUE_SOON": { "inApp": true, "email": false },
    "TASK_OVERDUE": { "inApp": true, "email": true },
    "APPROVAL_REQUIRED": { "inApp": true, "email": true },
    "APPROVAL_DECISION": { "inApp": true, "email": true },
    "LEAVE_APPROVED": { "inApp": true, "email": true },
    "COMPLAINT_ASSIGNED": { "inApp": true, "email": false },
    "SLA_BREACH_WARNING": { "inApp": true, "email": true }
  }
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "emailNotifications": true,
    "pushNotifications": true,
    "preferences": { ... },
    "updatedAt": "2026-01-16T10:30:00Z"
  },
  "message": "Preferences updated",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

#### Notification Types

| Type | Trigger | Modules |
|------|---------|---------|
| `TASK_ASSIGNED` | Task assigned to user | task-module |
| `TASK_DUE_SOON` | Task due within 24 hours | task-module (Celery) |
| `TASK_OVERDUE` | Task past due date | task-module (Celery) |
| `TASK_STATUS_CHANGED` | Task status updated | task-module |
| `TASK_COMMENT_ADDED` | Comment on assigned task | task-module |
| `APPROVAL_REQUIRED` | Approval pending | approval-module |
| `APPROVAL_DECISION` | Approval approved/rejected | approval-module |
| `LEAVE_SUBMITTED` | Leave request submitted (to manager) | hr-module |
| `LEAVE_APPROVED` | Leave approved | hr-module |
| `LEAVE_REJECTED` | Leave rejected | hr-module |
| `COMPLAINT_ASSIGNED` | Complaint assigned | complaint-module |
| `COMPLAINT_ESCALATED` | Complaint escalated | complaint-module |
| `SLA_BREACH_WARNING` | SLA breach imminent | complaint-module (Celery) |
| `SLA_BREACHED` | SLA breached | complaint-module (Celery) |
| `EXPENSE_APPROVED` | Expense approved | expense-module |
| `EXPENSE_REJECTED` | Expense rejected | expense-module |
| `TRAINING_ENROLLED` | Enrolled in training | training-module |
| `TRAINING_REMINDER` | Training session reminder | training-module (Celery) |
| `CERTIFICATE_ISSUED` | Certificate issued | training-module |

---

### 8.10 storage-module

**Base Path**: `/api/v1/storage`

#### 8.10.1 File Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| `POST` | `/upload` | Upload file | Authenticated |
| `POST` | `/upload/multipart/init` | Init multipart upload | Authenticated |
| `POST` | `/upload/multipart/{upload_id}/part` | Upload part | Authenticated |
| `POST` | `/upload/multipart/{upload_id}/complete` | Complete multipart | Authenticated |
| `POST` | `/upload/multipart/{upload_id}/abort` | Abort multipart | Authenticated |
| `GET` | `/files/{file_id}` | Get file metadata | Access to entity |
| `GET` | `/files/{file_id}/download` | Get download URL | Access to entity |
| `DELETE` | `/files/{file_id}` | Delete file | Own file or Admin |

#### 8.10.2 Internal Endpoints

| Method | Endpoint | Description | Caller |
|--------|----------|-------------|--------|
| `POST` | `/internal/validate` | Validate file access | Internal modules |
| `POST` | `/internal/cleanup` | Cleanup orphaned files | Celery scheduler |

#### Request/Response Schemas

**POST /upload**

Request (multipart/form-data):
```
file: <binary>
entityType: TASK_ATTACHMENT
entityId: uuid
description: Project specification document
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "spec.pdf",
    "originalFilename": "Project Specification v2.pdf",
    "mimeType": "application/pdf",
    "size": 1548576,
    "entityType": "TASK_ATTACHMENT",
    "entityId": "uuid",
    "uploadedBy": {
      "id": "uuid",
      "name": "John Doe"
    },
    "uploadedAt": "2026-01-16T10:30:00Z",
    "url": "/api/v1/storage/files/uuid/download"
  },
  "message": "File uploaded successfully",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

**GET /files/{file_id}/download**

Response (200):
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://minio.mindflow.local/bucket/path/file.pdf?signature=...",
    "expiresAt": "2026-01-16T11:30:00Z",
    "filename": "Project Specification v2.pdf"
  },
  "message": "Download URL generated",
  "timestamp": "2026-01-16T10:30:00Z",
  "requestId": "uuid"
}
```

#### Entity Types for File Association

| Entity Type | Module | Description |
|-------------|--------|-------------|
| `TASK_ATTACHMENT` | task-module | Task file attachments |
| `TASK_COMMENT_ATTACHMENT` | task-module | Comment attachments |
| `MINDMAP_NODE_ATTACHMENT` | mindmap-module | Node attachments |
| `EXPENSE_RECEIPT` | expense-module | Expense receipts |
| `COMPLAINT_ATTACHMENT` | complaint-module | Complaint evidence |
| `TRAINING_CONTENT` | training-module | Course materials |
| `EMPLOYEE_DOCUMENT` | hr-module | Employee documents |
| `CANDIDATE_RESUME` | hr-module | Candidate resumes |

---

## 9. Inter-Module Communication

### 9.1 Synchronous Communication (Direct Calls)

Within the modular monolith, modules communicate via direct function calls:

| Caller | Callee | Purpose |
|--------|--------|---------|
| task-module | hr-module | Validate assignee exists and is active |
| task-module | storage-module | Upload/download attachments |
| task-module | notification-module | Send assignment notifications |
| mindmap-module | task-module | Link/unlink tasks to nodes |
| expense-module | hr-module | Get requester's reporting manager |
| expense-module | approval-module | Initiate approval workflow |
| expense-module | storage-module | Upload receipts |
| complaint-module | hr-module | Get escalation hierarchy |
| complaint-module | task-module | Create task from complaint |
| complaint-module | notification-module | Send SLA alerts |
| training-module | hr-module | Validate trainees |
| training-module | storage-module | Upload content |
| training-module | notification-module | Send reminders |
| approval-module | hr-module | Get approver from hierarchy |
| approval-module | notification-module | Notify approvers |
| All modules | auth-module | Validate JWT, check permissions |

### 9.2 Asynchronous Communication (Event-Driven)

Using Redis pub/sub and Celery for background tasks:

| Event | Publisher | Subscribers | Purpose |
|-------|-----------|-------------|---------|
| `task.created` | task-module | notification-module | Notify assignees |
| `task.status_changed` | task-module | notification-module | Notify watchers |
| `task.overdue` | Celery scheduler | notification-module, task-module | Mark overdue, notify |
| `leave.requested` | hr-module | approval-module, notification-module | Start approval, notify manager |
| `leave.decided` | approval-module | hr-module, notification-module | Update balance, notify employee |
| `expense.submitted` | expense-module | approval-module, notification-module | Start approval, notify |
| `expense.decided` | approval-module | expense-module, notification-module | Update status, notify |
| `complaint.created` | complaint-module | notification-module | Notify assignee |
| `complaint.sla_warning` | Celery scheduler | notification-module | SLA breach warning |
| `complaint.escalated` | complaint-module | notification-module | Notify escalation target |
| `training.enrolled` | training-module | notification-module | Confirm enrollment |
| `training.session_reminder` | Celery scheduler | notification-module | Session reminder |
| `approval.pending` | approval-module | notification-module | Notify approver |
| `approval.decided` | approval-module | originating module | Callback with decision |

### 9.3 Event Payload Schema

```json
{
  "eventId": "uuid",
  "eventType": "task.created",
  "timestamp": "2026-01-16T10:30:00Z",
  "tenantId": "uuid",
  "userId": "uuid",
  "entityType": "TASK",
  "entityId": "uuid",
  "payload": {
    // Event-specific data
  },
  "metadata": {
    "correlationId": "uuid",
    "source": "task-module"
  }
}
```

---

## 10. Security Review Against Threat Model

### 10.1 STRIDE Threat Mitigation

| Threat Category | Threat | API Mitigation |
|-----------------|--------|----------------|
| **Spoofing** | SP-001: Credential theft | Strong password policy, JWT with short expiry, secure token storage |
| **Spoofing** | SP-002: Session hijacking | HTTPOnly cookies, secure flag, token rotation on refresh |
| **Spoofing** | SP-003: Token forgery | HS256 signing with secure secret, token validation on every request |
| **Tampering** | TP-001: Parameter manipulation | Input validation, Pydantic schemas, authorization checks |
| **Tampering** | TP-002: SQL injection | Parameterized queries via SQLAlchemy ORM, no raw SQL |
| **Tampering** | TP-003: Request body tampering | JSON schema validation, content-type enforcement |
| **Repudiation** | RP-001: Unauthorized actions | Comprehensive audit logging, immutable audit trail |
| **Repudiation** | RP-002: Log tampering | Separate audit storage, append-only design |
| **Info Disclosure** | ID-001: Sensitive data exposure | No PII in URLs, masked response fields, TLS everywhere |
| **Info Disclosure** | ID-002: Error information leakage | Generic error messages, detailed errors in logs only |
| **Info Disclosure** | ID-003: Unauthorized data access | RBAC checks, RLS enforcement, scope validation |
| **Denial of Service** | DOS-001: Resource exhaustion | Rate limiting (Kong), pagination limits, request size limits |
| **Denial of Service** | DOS-002: Slow queries | Query timeouts, indexed lookups, pagination |
| **Elevation of Privilege** | EOP-001: Role bypass | Server-side role validation, no client trust |
| **Elevation of Privilege** | EOP-002: Tenant boundary crossing | RLS on all queries, tenant_id in JWT, validation |
| **Elevation of Privilege** | EOP-003: Hierarchy bypass | Server-side hierarchy validation for all scoped operations |

### 10.2 API Security Checklist

| Control | Implementation |
|---------|----------------|
| **Authentication** | JWT with 15-min expiry, refresh token rotation |
| **Authorization** | RBAC with three-dimensional permissions (module:action:scope) |
| **Input Validation** | Pydantic models for all requests, strict type checking |
| **Output Encoding** | JSON serialization, no HTML in API responses |
| **Rate Limiting** | Kong rate limiting: 100 req/min per user, 1000 req/min per tenant |
| **Logging** | Structured logging with correlation IDs, no PII in logs |
| **Error Handling** | Generic client messages, detailed internal logging |
| **TLS** | TLS 1.2+ required, HSTS enabled |
| **CORS** | Whitelist allowed origins, credentials restricted |
| **Content Security** | Content-Type validation, file upload restrictions |

### 10.3 Sensitive Endpoints

| Endpoint | Sensitivity | Additional Controls |
|----------|-------------|---------------------|
| `POST /auth/login` | HIGH | Rate limit: 5/min per IP, account lockout after 5 failures |
| `POST /auth/password/*` | HIGH | Rate limit: 3/min per user, email verification |
| `POST /auth/users` | HIGH | Admin only, audit logged |
| `DELETE /auth/users/*` | CRITICAL | Super Admin only, soft delete, audit logged |
| `GET /hr/employees` | MEDIUM | PII fields masked based on permission scope |
| `GET /hr/payroll/*` | HIGH | Finance Admin only, audit logged |
| `POST /storage/upload` | MEDIUM | File type validation, size limits, virus scan (future) |
| `GET /*/export` | HIGH | Audit logged, rate limited, watermarked |

---

## 11. API Versioning Strategy

### 11.1 Version Format

```
/api/v{major}/{module}/{resource}

Example: /api/v1/hr/employees
```

### 11.2 Versioning Rules

| Rule | Description |
|------|-------------|
| **Major version** | Breaking changes (removed endpoints, changed response structure) |
| **Header versioning** | Not used; URL versioning only |
| **Deprecation** | Minimum 6 months notice before removal |
| **Parallel support** | Two major versions supported concurrently |

### 11.3 Breaking vs Non-Breaking Changes

**Breaking (requires version bump)**:
- Removing an endpoint
- Removing a required field from response
- Changing field data type
- Changing authentication mechanism

**Non-Breaking (same version)**:
- Adding new endpoints
- Adding optional request parameters
- Adding new fields to response
- Adding new error codes

### 11.4 Deprecation Headers

```
Deprecation: true
Sunset: Sat, 16 Jul 2026 00:00:00 GMT
Link: </api/v2/resource>; rel="successor-version"
```

---

## Approval Record

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Product Owner** | _________________ | _________________ | _________________ |
| **Tech Lead** | _________________ | _________________ | _________________ |
| **Security Reviewer** | _________________ | _________________ | _________________ |

---

## Appendix A: Pydantic Schema Reference

### A.1 Common Schemas

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from uuid import UUID
from enum import Enum

T = TypeVar('T')

class PaginationMeta(BaseModel):
    page: int
    page_size: int = Field(alias="pageSize")
    total_items: int = Field(alias="totalItems")
    total_pages: int = Field(alias="totalPages")
    has_next: bool = Field(alias="hasNext")
    has_previous: bool = Field(alias="hasPrevious")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    pagination: PaginationMeta

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: str

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    message: str
    timestamp: datetime
    request_id: UUID = Field(alias="requestId")
```

### A.2 Auth Module Schemas

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class LoginResponse(BaseModel):
    access_token: str = Field(alias="accessToken")
    refresh_token: str = Field(alias="refreshToken")
    token_type: str = Field(alias="tokenType", default="Bearer")
    expires_in: int = Field(alias="expiresIn")
    user: "UserSummary"

class UserSummary(BaseModel):
    id: UUID
    email: EmailStr
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    roles: List[str]
    tenant_id: UUID = Field(alias="tenantId")

class CreateUserRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(alias="firstName", min_length=1, max_length=100)
    last_name: str = Field(alias="lastName", min_length=1, max_length=100)
    password: str = Field(min_length=12, max_length=128)
    roles: List[str]
    tenant_id: UUID = Field(alias="tenantId")

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword", min_length=12, max_length=128)
```

### A.3 HR Module Schemas

```python
class AddressSchema(BaseModel):
    line1: str = Field(max_length=255)
    line2: Optional[str] = Field(max_length=255, default=None)
    city: str = Field(max_length=100)
    state: str = Field(max_length=100)
    postal_code: str = Field(alias="postalCode", max_length=20)
    country: str = Field(max_length=100)

class EmploymentType(str, Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"

class CreateEmployeeRequest(BaseModel):
    user_id: UUID = Field(alias="userId")
    employee_code: str = Field(alias="employeeCode", max_length=20)
    first_name: str = Field(alias="firstName", min_length=1, max_length=100)
    last_name: str = Field(alias="lastName", min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^\+[1-9]\d{1,14}$")
    date_of_birth: date = Field(alias="dateOfBirth")
    date_of_joining: date = Field(alias="dateOfJoining")
    position_id: UUID = Field(alias="positionId")
    department_id: UUID = Field(alias="departmentId")
    reporting_manager_id: Optional[UUID] = Field(alias="reportingManagerId", default=None)
    employment_type: EmploymentType = Field(alias="employmentType")
    address: Optional[AddressSchema] = None

class LeaveRequestCreate(BaseModel):
    leave_type_id: UUID = Field(alias="leaveTypeId")
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")
    reason: str = Field(max_length=1000)
    is_half_day: bool = Field(alias="isHalfDay", default=False)
    contact_number: Optional[str] = Field(alias="contactNumber", pattern=r"^\+[1-9]\d{1,14}$", default=None)
```

### A.4 Task Module Schemas

```python
class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TaskStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"

class TaskOriginType(str, Enum):
    MANUAL = "MANUAL"
    MIND_MAP = "MIND_MAP"
    COMPLAINT = "COMPLAINT"
    TRAINING = "TRAINING"

class CreateTaskRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(max_length=10000, default=None)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.NOT_STARTED
    expected_completion_date: Optional[date] = Field(alias="expectedCompletionDate", default=None)
    assignee_ids: List[UUID] = Field(alias="assigneeIds", default=[])
    labels: List[str] = Field(default=[])
    parent_task_id: Optional[UUID] = Field(alias="parentTaskId", default=None)
    origin_type: TaskOriginType = Field(alias="originType", default=TaskOriginType.MANUAL)
    origin_id: Optional[UUID] = Field(alias="originId", default=None)

class UpdateTaskStatusRequest(BaseModel):
    status: TaskStatus
    comment: Optional[str] = Field(max_length=1000, default=None)
```

---

## Appendix B: Rate Limiting Configuration

| Endpoint Pattern | Rate Limit | Window | Scope |
|------------------|------------|--------|-------|
| `POST /auth/login` | 5 | 1 minute | Per IP |
| `POST /auth/password/*` | 3 | 1 minute | Per user |
| `POST /storage/upload` | 20 | 1 minute | Per user |
| `GET /*/export` | 5 | 1 minute | Per user |
| All authenticated endpoints | 100 | 1 minute | Per user |
| All tenant endpoints | 1000 | 1 minute | Per tenant |

---

## Appendix C: Webhook Events (Future)

Reserved for Phase 2+ external integrations:

| Event | Payload |
|-------|---------|
| `task.created` | Task details |
| `task.completed` | Task details with completion info |
| `expense.approved` | Expense details with amount |
| `complaint.escalated` | Complaint details with escalation info |
| `training.completed` | Enrollment with completion status |

---

## 12. Approval Record

### 12.1 Phase Gate Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 3 – API Contract & Integration Design | COMPLETE - APPROVED | 2026-01-16 |

### 12.2 Task Completion Summary

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Define endpoints per service | COMPLETE |
| 3.2 | Define request schemas | COMPLETE |
| 3.3 | Define response schemas | COMPLETE |
| 3.4 | Define validation rules | COMPLETE |
| 3.5 | Define authorization checks | COMPLETE |
| 3.6 | Define error handling standards | COMPLETE |
| 3.7 | Review APIs against threat model | COMPLETE |
| 3.8 | Freeze API contracts | COMPLETE |

### 12.3 Deliverable Summary

- **Total Endpoints**: 136+
- **Service Modules**: 10
- **Pydantic Schemas**: Appendix A
- **Authorization Matrix**: Section 7
- **Rate Limiting**: Appendix B
- **STRIDE Review**: Section 10

### 12.4 Approval Signatures

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| Product Owner | PO | APPROVED | 2026-01-16 | All API requirements met |
| Technical Lead | Builder | APPROVED | 2026-01-16 | API contracts frozen |

---

**Document Status**: COMPLETE - Product Owner Approved (2026-01-16)

**Next Phase**: Phase 3.5 – Frontend Architecture Design (Cannot begin until Phase 3 is CLOSED)

---

**END OF API_CONTRACT.md**
