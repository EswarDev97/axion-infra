# AxionPCS API Design Document

## Base URL Structure

```
Production: https://api.axionpcs.com/api/v1
Development: http://localhost:3001/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

---

## Public Website APIs

### Contact

#### Submit Contact Inquiry
```
POST /api/v1/public/contact
```
**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "phone": "string",
  "company": "string",
  "subject": "string (required)",
  "message": "string (required)",
  "type": "GENERAL | SALES | SUPPORT | PARTNERSHIP | CAREERS"
}
```
**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Thank you for contacting us. We'll get back to you soon."
  }
}
```

### Careers (Public)

#### List Job Postings
```
GET /api/v1/public/careers
```
**Query Parameters:**
- `department` - Filter by department slug
- `location` - Filter by location
- `type` - Filter by employment type
- `search` - Search in title/description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "senior-software-engineer",
      "title": "Senior Software Engineer",
      "department": { "id": "uuid", "name": "Engineering" },
      "location": "Remote",
      "employmentType": "FULL_TIME",
      "experienceMin": 5,
      "experienceMax": 8,
      "skills": ["Node.js", "React", "PostgreSQL"],
      "publishedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 25 }
}
```

#### Get Job Posting Details
```
GET /api/v1/public/careers/:slug
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "senior-software-engineer",
    "title": "Senior Software Engineer",
    "description": "Full job description...",
    "requirements": "Requirements...",
    "responsibilities": "Responsibilities...",
    "department": { "id": "uuid", "name": "Engineering" },
    "location": "Remote",
    "employmentType": "FULL_TIME",
    "experienceMin": 5,
    "experienceMax": 8,
    "salaryMin": 80000,
    "salaryMax": 120000,
    "showSalary": true,
    "skills": ["Node.js", "React", "PostgreSQL"],
    "benefits": ["Health Insurance", "Remote Work"],
    "publishedAt": "2024-01-15T00:00:00Z"
  }
}
```

#### Submit Job Application
```
POST /api/v1/public/careers/:slug/apply
```
**Request (multipart/form-data):**
```
firstName: string (required)
lastName: string (required)
email: string (required)
phone: string
resume: file (required, PDF/DOC/DOCX)
coverLetter: string
linkedIn: string
portfolio: string
source: string
```
**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Application submitted successfully"
  }
}
```

### Public Announcements
```
GET /api/v1/public/announcements
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Company Event",
      "content": "Details...",
      "type": "EVENT",
      "publishedAt": "2024-01-10T00:00:00Z"
    }
  ]
}
```

---

## Authentication APIs

### Register (Public Users)
```
POST /api/v1/auth/register
```
**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phone": "string"
}
```
**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "message": "Verification email sent"
  }
}
```

### Login
```
POST /api/v1/auth/login
```
**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "tenantSlug": "string (optional, for multi-tenant)"
}
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["EMPLOYEE"],
      "permissions": ["employees:read", "leave:create"]
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 900
  }
}
```

### Refresh Token
```
POST /api/v1/auth/refresh
```
**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 900
  }
}
```

### Logout
```
POST /api/v1/auth/logout
```
**Headers:** `Authorization: Bearer <token>`
**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

### Forgot Password
```
POST /api/v1/auth/forgot-password
```
**Request Body:**
```json
{
  "email": "string (required)"
}
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "message": "Password reset instructions sent" }
}
```

### Reset Password
```
POST /api/v1/auth/reset-password
```
**Request Body:**
```json
{
  "token": "string (required)",
  "password": "string (required)"
}
```
**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "message": "Password reset successful" }
}
```

### Verify Email
```
POST /api/v1/auth/verify-email
```
**Request Body:**
```json
{
  "token": "string (required)"
}
```
**Response:** `200 OK`

### Get Current User
```
GET /api/v1/auth/me
```
**Headers:** `Authorization: Bearer <token>`
**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "url",
    "roles": ["HR_ADMIN"],
    "permissions": ["employees:*", "leave:*"],
    "employee": {
      "id": "uuid",
      "employeeCode": "EMP001",
      "department": { "id": "uuid", "name": "HR" },
      "designation": "HR Manager"
    }
  }
}
```

---

## HRMS APIs (Protected)

### Employees

#### List Employees
```
GET /api/v1/employees
```
**Permissions Required:** `employees:read`
**Query Parameters:**
- `search` - Search by name, email, code
- `department` - Filter by department ID
- `status` - Filter by employment status
- `type` - Filter by employment type
- `manager` - Filter by manager ID
- `page`, `limit` - Pagination
- `sortBy`, `sortOrder` - Sorting

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeCode": "EMP001",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@company.com",
        "avatar": "url"
      },
      "department": { "id": "uuid", "name": "Engineering" },
      "designation": "Software Engineer",
      "employmentType": "FULL_TIME",
      "employmentStatus": "ACTIVE",
      "dateOfJoining": "2023-01-15"
    }
  ],
  "meta": { ... }
}
```

#### Get Employee Details
```
GET /api/v1/employees/:id
```
**Permissions Required:** `employees:read` or self

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeCode": "EMP001",
    "user": { ... },
    "department": { ... },
    "manager": { ... },
    "designation": "Software Engineer",
    "employmentType": "FULL_TIME",
    "employmentStatus": "ACTIVE",
    "dateOfJoining": "2023-01-15",
    "dateOfBirth": "1990-05-20",
    "gender": "MALE",
    "personalEmail": "john.personal@email.com",
    "workEmail": "john@company.com",
    "personalPhone": "+91-9876543210",
    "currentAddress": { ... },
    "emergencyContact": { ... },
    "leaveBalances": [ ... ],
    "documents": [ ... ]
  }
}
```

#### Create Employee
```
POST /api/v1/employees
```
**Permissions Required:** `employees:create`
**Request Body:**
```json
{
  "email": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phone": "string",
  "departmentId": "uuid",
  "managerId": "uuid",
  "designation": "string (required)",
  "employmentType": "FULL_TIME",
  "dateOfJoining": "2024-01-15",
  "dateOfBirth": "1990-05-20",
  "gender": "MALE",
  "personalEmail": "string",
  "currentAddress": { ... },
  "bankDetails": { ... },
  "roleIds": ["uuid"]
}
```
**Response:** `201 Created`

#### Update Employee
```
PUT /api/v1/employees/:id
```
**Permissions Required:** `employees:update`
**Request Body:** (partial update supported)

#### Delete Employee (Soft)
```
DELETE /api/v1/employees/:id
```
**Permissions Required:** `employees:delete`

#### Get Employee Org Chart
```
GET /api/v1/employees/org-chart
```
**Response:** Hierarchical employee structure

---

### Departments

#### List Departments
```
GET /api/v1/departments
```
**Permissions Required:** `departments:read`

#### Get Department
```
GET /api/v1/departments/:id
```

#### Create Department
```
POST /api/v1/departments
```
**Permissions Required:** `departments:create`
**Request Body:**
```json
{
  "name": "string (required)",
  "code": "string (required)",
  "description": "string",
  "managerId": "uuid",
  "parentId": "uuid"
}
```

#### Update Department
```
PUT /api/v1/departments/:id
```
**Permissions Required:** `departments:update`

#### Delete Department
```
DELETE /api/v1/departments/:id
```
**Permissions Required:** `departments:delete`

---

### Attendance

#### Get My Attendance
```
GET /api/v1/attendance/my
```
**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `month` - Month (1-12)
- `year` - Year

#### Check In
```
POST /api/v1/attendance/check-in
```
**Request Body:**
```json
{
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "notes": "string"
}
```

#### Check Out
```
POST /api/v1/attendance/check-out
```
**Request Body:**
```json
{
  "location": { ... },
  "notes": "string"
}
```

#### List Team Attendance (Manager)
```
GET /api/v1/attendance/team
```
**Permissions Required:** `attendance:read_team` or Manager role

#### List All Attendance (HR)
```
GET /api/v1/attendance
```
**Permissions Required:** `attendance:read_all`

#### Update Attendance (HR)
```
PUT /api/v1/attendance/:id
```
**Permissions Required:** `attendance:update`

#### Bulk Mark Attendance
```
POST /api/v1/attendance/bulk
```
**Permissions Required:** `attendance:create`
**Request Body:**
```json
{
  "date": "2024-01-15",
  "records": [
    { "employeeId": "uuid", "status": "PRESENT", "checkIn": "09:00", "checkOut": "18:00" }
  ]
}
```

#### Get Attendance Report
```
GET /api/v1/attendance/report
```
**Permissions Required:** `attendance:read_all`
**Query Parameters:**
- `startDate`, `endDate` - Date range
- `departmentId` - Filter by department
- `format` - `json` | `csv` | `pdf`

---

### Leave Management

#### List Leave Types
```
GET /api/v1/leave/types
```

#### Get My Leave Balance
```
GET /api/v1/leave/balance
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "leaveType": { "id": "uuid", "name": "Casual Leave", "code": "CL" },
      "year": 2024,
      "allocated": 12,
      "used": 3,
      "pending": 1,
      "available": 8
    }
  ]
}
```

#### Get My Leaves
```
GET /api/v1/leave/my
```
**Query Parameters:**
- `status` - Filter by status
- `year` - Filter by year

#### Apply for Leave
```
POST /api/v1/leave/apply
```
**Request Body:**
```json
{
  "leaveTypeId": "uuid (required)",
  "startDate": "2024-01-20 (required)",
  "endDate": "2024-01-22 (required)",
  "reason": "string",
  "document": "file (optional)"
}
```

#### Cancel Leave
```
POST /api/v1/leave/:id/cancel
```

#### Get Pending Approvals (Manager/HR)
```
GET /api/v1/leave/approvals
```
**Permissions Required:** `leave:approve` or Manager role

#### Approve Leave
```
POST /api/v1/leave/:id/approve
```
**Permissions Required:** `leave:approve` or Manager role
**Request Body:**
```json
{
  "notes": "string (optional)"
}
```

#### Reject Leave
```
POST /api/v1/leave/:id/reject
```
**Permissions Required:** `leave:approve` or Manager role
**Request Body:**
```json
{
  "reason": "string (required)"
}
```

#### Get Leave Calendar
```
GET /api/v1/leave/calendar
```
**Query Parameters:**
- `month`, `year` - Calendar month
- `departmentId` - Filter by department

---

### Payroll

#### Get My Payslips
```
GET /api/v1/payroll/my
```
**Query Parameters:**
- `year` - Filter by year

#### Download Payslip
```
GET /api/v1/payroll/my/:id/download
```

#### List All Payroll (HR)
```
GET /api/v1/payroll
```
**Permissions Required:** `payroll:read`

#### Generate Payroll
```
POST /api/v1/payroll/generate
```
**Permissions Required:** `payroll:create`
**Request Body:**
```json
{
  "month": 1,
  "year": 2024,
  "employeeIds": ["uuid"] // Optional, all if not specified
}
```

#### Process Payroll
```
POST /api/v1/payroll/process
```
**Permissions Required:** `payroll:process`
**Request Body:**
```json
{
  "month": 1,
  "year": 2024
}
```

#### Update Payroll
```
PUT /api/v1/payroll/:id
```
**Permissions Required:** `payroll:update`

#### Get/Update Salary Structure
```
GET /api/v1/payroll/salary-structure/:employeeId
PUT /api/v1/payroll/salary-structure/:employeeId
```
**Permissions Required:** `payroll:manage_salary`

---

### Documents

#### List My Documents
```
GET /api/v1/documents/my
```

#### Upload Document
```
POST /api/v1/documents/upload
```
**Request (multipart/form-data):**
```
file: file (required)
type: DocumentType (required)
category: string
description: string
employeeId: uuid (HR only)
```

#### Download Document
```
GET /api/v1/documents/:id/download
```

#### Delete Document
```
DELETE /api/v1/documents/:id
```

#### List All Documents (HR)
```
GET /api/v1/documents
```
**Permissions Required:** `documents:read_all`

---

### Roles & Permissions

#### List Roles
```
GET /api/v1/roles
```
**Permissions Required:** `roles:read`

#### Get Role with Permissions
```
GET /api/v1/roles/:id
```

#### Create Role
```
POST /api/v1/roles
```
**Permissions Required:** `roles:create`
**Request Body:**
```json
{
  "name": "string (required)",
  "slug": "string (required)",
  "description": "string",
  "permissionIds": ["uuid"]
}
```

#### Update Role
```
PUT /api/v1/roles/:id
```
**Permissions Required:** `roles:update`

#### Delete Role
```
DELETE /api/v1/roles/:id
```
**Permissions Required:** `roles:delete`

#### List All Permissions
```
GET /api/v1/permissions
```
**Permissions Required:** `roles:read`

#### Assign Role to User
```
POST /api/v1/users/:userId/roles
```
**Permissions Required:** `roles:assign`
**Request Body:**
```json
{
  "roleIds": ["uuid"]
}
```

---

### AI Services Integration

#### Parse Resume
```
POST /api/v1/ai/parse-resume
```
**Request (multipart/form-data):**
```
file: file (required, PDF/DOC/DOCX)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["JavaScript", "React", "Node.js"],
    "experience": [
      {
        "company": "Tech Corp",
        "title": "Software Engineer",
        "startDate": "2020-01",
        "endDate": "2023-06",
        "description": "..."
      }
    ],
    "education": [...],
    "totalExperienceYears": 3.5
  }
}
```

#### Classify Document
```
POST /api/v1/ai/classify-document
```
**Request (multipart/form-data):**
```
file: file (required)
```
**Response:**
```json
{
  "success": true,
  "data": {
    "type": "PAYSLIP",
    "confidence": 0.95,
    "extractedData": { ... }
  }
}
```

#### HR Analytics
```
GET /api/v1/ai/analytics/dashboard
```
**Permissions Required:** `analytics:read`
**Response:**
```json
{
  "success": true,
  "data": {
    "headcount": {
      "total": 150,
      "byDepartment": [...],
      "trend": [...]
    },
    "attrition": {
      "rate": 5.2,
      "trend": [...],
      "riskEmployees": [...]
    },
    "attendance": {
      "avgAttendanceRate": 94.5,
      "trend": [...]
    },
    "leave": {
      "utilizationRate": 65,
      "byType": [...]
    }
  }
}
```

---

## Admin APIs

### Tenant Management (Super Admin)

#### List Tenants
```
GET /api/v1/admin/tenants
```

#### Create Tenant
```
POST /api/v1/admin/tenants
```
**Request Body:**
```json
{
  "name": "string (required)",
  "slug": "string (required)",
  "domain": "string",
  "plan": "STARTER",
  "adminEmail": "string (required)",
  "adminFirstName": "string (required)",
  "adminLastName": "string (required)"
}
```

#### Update Tenant
```
PUT /api/v1/admin/tenants/:id
```

#### Deactivate Tenant
```
POST /api/v1/admin/tenants/:id/deactivate
```

---

## Webhooks (Future)

```
POST /api/v1/webhooks/attendance
POST /api/v1/webhooks/biometric
```

---

## Rate Limiting

| Endpoint Type | Rate Limit |
|--------------|------------|
| Public APIs | 100 req/min |
| Auth APIs | 20 req/min |
| Protected APIs | 500 req/min |
| File Upload | 10 req/min |
| AI Services | 30 req/min |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
