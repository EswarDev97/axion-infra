# Attendance Module — Technical Documentation

> **Project**: MindFlow HRMS (AxionPCS)
> **Date**: 2026-03-31
> **Phase**: 1 — Analysis & Documentation
> **Scope**: Complete analysis of existing Attendance module, gaps, and improvement plan

---

## Table of Contents

1. [Current Attendance Workflow Diagram](#1-current-attendance-workflow-diagram)
2. [Existing Database Tables and Fields](#2-existing-database-tables-and-fields)
3. [Existing API Endpoints](#3-existing-api-endpoints)
4. [Service Layer — Business Logic](#4-service-layer--business-logic)
5. [Current Role Permissions](#5-current-role-permissions)
6. [Current UI Behavior](#6-current-ui-behavior)
7. [Identified Gaps and Missing Features](#7-identified-gaps-and-missing-features)
8. [Recommended Improvements — Phase 2 Plan](#8-recommended-improvements--phase-2-plan)

---

## 1. Current Attendance Workflow Diagram

### 1.1 Employee Check-In/Check-Out Flow

```
Employee opens "My Attendance" page
        |
        v
AttendancePageClient mounts (view = 'my')
        |
        v
AttendanceCheckInOut component loads
        |
        v
Calls attendanceService.getTodayStatus()
  -> GET /attendance/me/today
        |
        v
+---------------------------------------------+
|  Server: get_today_status(tenant_id, emp_id) |
|  Query: attendance_records WHERE              |
|    employee_id = X AND date = TODAY           |
+---------------------------------------------+
        |
        v
  +---------------------+
  | todayRecord = null?  |
  +---------+-----------+
            |
    +-------+--------+
    v                v
  NULL           Record exists
    |                |
    v           +----+----------+
Show CHECK IN   |               |
button          v               v
          checkIn exists?   checkIn is NULL
          checkOut NULL?         |
               |                 v
               v            Show CHECK IN
         Show CHECK OUT     button
         button
               |
               v
         checkOut exists?
               |
         +-----+------+
         v             v
       NULL          Exists
         |             |
         v             v
   Show CHECK OUT  Show "Day Complete"
   button          badge (green)
```

### 1.2 Check-In Action Flow

```
Employee clicks [Check In]
        |
        v
Frontend: attendanceService.checkIn()
  -> POST /attendance/check-in { notes? }
        |
        v
API Gateway proxy -> HR Service /api/v1/hr/attendance/check-in
        |
        v
Backend: attendance_service.check_in()
        |
        +- 1. Validate employee is ACTIVE
        +- 2. Check duplicate (same employee + same date)
        |     -> If exists: raise AttendanceDuplicateException
        +- 3. Get attendance config (office_start_time, grace_period)
        +- 4. Determine status:
        |     IF check_in_time > office_start_time + grace_period -> LATE
        |     ELSE -> PRESENT
        +- 5. Create AttendanceRecord:
        |     { employee_id, date, check_in, status, notes, tenant_id }
        +- 6. Log audit: ATTENDANCE_CHECK_IN
        +- 7. Return record
        |
        v
Frontend: Update todayRecord state -> Re-render UI
```

### 1.3 Check-Out Action Flow

```
Employee clicks [Check Out]
        |
        v
Frontend: attendanceService.checkOut()
  -> POST /attendance/check-out { notes? }
        |
        v
Backend: attendance_service.check_out()
        |
        +- 1. Validate employee exists
        +- 2. Find today's record with check_in (no check_out)
        |     -> If not found: raise AttendanceNotFoundException
        +- 3. Record check_out timestamp
        +- 4. Calculate work_hours = (check_out - check_in) in decimal hours
        +- 5. Auto-detect HALF_DAY:
        |     IF work_hours < half_day_hours threshold -> status = HALF_DAY
        +- 6. Append notes (if provided)
        +- 7. Log audit: ATTENDANCE_CHECK_OUT
        +- 8. Return updated record
        |
        v
Frontend: Update todayRecord state -> Show "Day Complete"
```

### 1.4 Role-Based View Flow

```
AttendancePageClient loads
        |
        v
Read user roles/permissions from authStore
        |
        v
Generate available tabs:
        |
        +- "My Attendance" -> Always visible (all roles)
        |
        +- "Team Attendance" -> Visible IF:
        |     hasAnyRole(['MANAGER']) OR hasPermission('hr:read:subordinates')
        |
        +- "All Attendance" -> Visible IF:
              hasAnyRole(['SUPER_ADMIN','HR_ADMIN']) OR hasPermission('hr:read:all')
        |
        v
Based on selected tab, AttendanceList renders with mode:
        |
        +- mode='my'   -> GET /attendance/me      (own records only)
        +- mode='team'  -> GET /attendance/team    (subordinates via manager_id)
        +- mode='all'   -> GET /attendance         (all records, filtered by backend)
```

---

## 2. Existing Database Tables and Fields

### 2.1 `attendance_records` Table (Source of truth: SQLAlchemy)

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | UUID | PK | `gen_random_uuid()` | Primary key |
| `tenant_id` | UUID | FK -> tenants(id), NOT NULL, indexed | -- | Multi-tenant isolation |
| `employee_id` | UUID | FK -> employees(id), NOT NULL, indexed | -- | Employee reference |
| `date` | DATE | NOT NULL, indexed | -- | Attendance date |
| `check_in` | TIMESTAMPTZ | nullable | NULL | Check-in timestamp |
| `check_out` | TIMESTAMPTZ | nullable | NULL | Check-out timestamp |
| `work_hours` | NUMERIC(4,2) | nullable | NULL | Calculated total hours |
| `status` | VARCHAR(20) | NOT NULL | `'PRESENT'` | Attendance status |
| `notes` | TEXT | nullable | NULL | Optional notes |
| `created_by` | UUID | nullable | NULL | User who created record |
| `updated_by` | UUID | nullable | NULL | User who last updated |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last update time |

**Unique Constraint**: `(tenant_id, employee_id, date)` -- One record per employee per day.

**Indexes**: `tenant_id`, `employee_id`, `date`, `(tenant_id, date)`.

**Status Values**: `PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `ON_LEAVE`, `HOLIDAY`, `WORK_FROM_HOME`

**File**: `backend/services/hr/models/attendance.py` (lines 36-111)

### 2.2 `attendance_config` Table

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | UUID | PK | `gen_random_uuid()` | Primary key |
| `tenant_id` | UUID | FK -> tenants(id), UNIQUE | -- | One config per tenant |
| `office_start_time` | TIME | NOT NULL | `09:00:00` | Office start time |
| `office_end_time` | TIME | NOT NULL | `18:00:00` | Office end time |
| `grace_period_minutes` | INTEGER | NOT NULL | `15` | Grace period for lateness |
| `min_work_hours` | NUMERIC(4,2) | NOT NULL | `8.00` | Full-day work hours |
| `half_day_hours` | NUMERIC(4,2) | NOT NULL | `4.00` | Half-day threshold |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | -- |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | -- |

**File**: `backend/services/hr/models/attendance_config.py` (lines 18-71)

### 2.3 `audit_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who performed action |
| `action` | VARCHAR | Action type (e.g., `ATTENDANCE_CHECK_IN`) |
| `entity` | VARCHAR | Entity type (e.g., `attendance`) |
| `entity_id` | UUID | Entity record ID |
| `old_data` | JSONB | Previous state (nullable) |
| `new_data` | JSONB | New state |
| `ip_address` | VARCHAR | Client IP (nullable) |
| `user_agent` | VARCHAR | Client user agent (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp |

**File**: Migration `backend/alembic/versions/20260331_010000_attendance_enhancements.py` (lines 56-69)

### 2.4 Related Tables

#### `employees` (Key Fields for Attendance)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenant isolation |
| `user_id` | UUID | FK -> users(id) |
| `employee_code` | VARCHAR(50) | Unique per tenant |
| `first_name` | VARCHAR(100) | -- |
| `last_name` | VARCHAR(100) | -- |
| `department_id` | UUID | FK -> departments(id) |
| `manager_id` | UUID | FK -> employees(id) (self-referential) |
| `status` | VARCHAR(20) | ACTIVE, TERMINATED, etc. |
| `is_deleted` | BOOLEAN | Soft delete flag |

**File**: `backend/services/hr/models/employee.py` (lines 52-200)

#### `departments` (Key Fields for Filtering)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Multi-tenant isolation |
| `name` | VARCHAR(100) | Department name |
| `code` | VARCHAR(50) | Unique per tenant |
| `manager_id` | UUID | FK -> employees(id) |
| `parent_id` | UUID | FK -> departments(id) (hierarchy) |
| `is_active` | BOOLEAN | Active flag |

**File**: `backend/services/hr/models/department.py` (lines 36-125)

---

## 3. Existing API Endpoints

### 3.1 Self-Service Endpoints (Any Authenticated User)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/attendance/me/today` | `get_today_status` | Get today's attendance status |
| `GET` | `/attendance/me` | `get_my_attendance` | Get own attendance history (startDate, endDate filters) |
| `POST` | `/attendance/check-in` | `check_in` | Record check-in (auto-detect PRESENT/LATE) |
| `POST` | `/attendance/check-out` | `check_out` | Record check-out (auto-detect HALF_DAY) |

### 3.2 Team Endpoints (Manager: `hr:read:subordinates`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/attendance/team` | `list_team_attendance` | List team attendance (direct reports + self) |

### 3.3 Admin Endpoints (HR Admin / Super Admin: `hr:read:all`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/attendance` | `list_attendance` | List all attendance with filters |
| `GET` | `/attendance/{record_id}` | `get_attendance_record` | Get single record |
| `GET` | `/attendance/report` | `generate_report` | Generate attendance summary report |
| `POST` | `/attendance/bulk-import` | `bulk_import` | Import attendance records (`hr:create:all`) |
| `POST` | `/attendance/mark-absent` | `mark_absent` | Auto-mark absent for a date (`hr:create:all`) |
| `GET` | `/attendance/config` | `get_config` | Get attendance configuration (`hr:read:all`) |
| `PUT` | `/attendance/config` | `update_config` | Update attendance configuration (`hr:update:all`) |

### 3.4 Request/Response Schemas

**Check-In Request**:
```json
{
  "employeeId": "uuid (optional, defaults to current user)",
  "notes": "string (optional)"
}
```

**Check-Out Request**:
```json
{
  "employeeId": "uuid (optional)",
  "notes": "string (optional)"
}
```

**Attendance Record Response**:
```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "employeeName": "John Doe",
  "date": "2026-03-31",
  "checkIn": "2026-03-31T09:05:00Z",
  "checkOut": "2026-03-31T18:10:00Z",
  "workHours": 9.08,
  "status": "PRESENT",
  "notes": null,
  "tenantId": "uuid",
  "createdAt": "2026-03-31T09:05:00Z",
  "updatedAt": "2026-03-31T18:10:00Z"
}
```

**Paginated List Response**:
```json
{
  "items": [ "...AttendanceRecordResponse[]" ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Report Response**:
```json
{
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "totalEmployees": 45,
  "summary": [
    {
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "employeeCode": "EMP001",
      "departmentName": "Engineering",
      "totalDays": 22,
      "presentDays": 19,
      "absentDays": 1,
      "lateDays": 2,
      "leaveDays": 0,
      "halfDays": 0,
      "totalWorkHours": 171.5,
      "averageWorkHours": 8.5
    }
  ]
}
```

**File**: `backend/services/hr/api/attendance.py` (lines 16-62 for schemas, 72-551 for endpoints)

---

## 4. Service Layer -- Business Logic

### 4.1 Core Methods

**File**: `backend/services/hr/services/attendance_service.py`

| Method | Lines | Purpose |
|--------|-------|---------|
| `get_or_create_config(tenant_id)` | 46-67 | Get or create default attendance config |
| `update_config(tenant_id, ...)` | 69-96 | Update attendance config |
| `check_in(tenant_id, employee_id, notes, actor_user_id)` | 102-155 | Record check-in |
| `check_out(tenant_id, employee_id, notes, actor_user_id)` | 157-214 | Record check-out |
| `get_today_status(tenant_id, employee_id)` | 220-235 | Get today's record |
| `get_my_attendance(tenant_id, employee_id, start_date, end_date)` | 237-260 | Get own history |
| `get_attendance_record(record_id, tenant_id)` | 266-284 | Get single record |
| `list_attendance(tenant_id, pagination, filters...)` | 286-332 | Paginated list (admin) |
| `list_team_attendance(tenant_id, manager_employee_id, pagination, filters...)` | 334-393 | Team-only list (manager) |
| `bulk_import(tenant_id, records)` | 399-479 | Bulk import |
| `generate_report(tenant_id, start_date, end_date, dept_id, emp_id)` | 485-555 | Summary report |
| `mark_absent(tenant_id, target_date, actor_user_id)` | 561-614 | Auto-mark absent |

### 4.2 Auto-Detection Logic

**Late Detection** (`_determine_checkin_status`, lines 620-641):
```
IF check_in_time > (office_start_time + grace_period_minutes):
    status = "LATE"
ELSE:
    status = "PRESENT"
```

**Half-Day Detection** (in `check_out`, lines 199-208):
```
IF work_hours < half_day_hours:
    status = "HALF_DAY"
```

**Absent Detection** (`mark_absent`, lines 561-614):
```
For target_date:
  IF weekday (not Saturday/Sunday):
    FOR each ACTIVE employee:
      IF no attendance_record exists for target_date:
        CREATE record with status = "ABSENT"
        notes = "Auto-marked absent (no attendance record)"
```

### 4.3 Team Filtering Logic (lines 334-393)

```python
# Get direct reports
subordinate_ids = SELECT employee.id FROM employees
  WHERE manager_id = manager_employee_id
    AND tenant_id = tenant_id
    AND is_deleted = False

# Include manager's own ID
subordinate_ids.append(manager_employee_id)

# Filter attendance to only these employee IDs
WHERE attendance_records.employee_id IN (subordinate_ids)
```

### 4.4 Audit Logging (`_log_audit`, lines 663-690)

All attendance mutations are logged:
- `ATTENDANCE_CHECK_IN`: When an employee checks in
- `ATTENDANCE_CHECK_OUT`: When an employee checks out
- `ATTENDANCE_MARK_ABSENT`: When bulk absent marking runs

Each log captures: `user_id`, `action`, `entity`, `entity_id`, `new_data`, `timestamp`.

---

## 5. Current Role Permissions

### 5.1 System Roles

| Role | Code | Scope |
|------|------|-------|
| Super Admin | `SUPER_ADMIN` | Bypasses all permission checks. Full system access. |
| System Admin | `SYSTEM_ADMIN` | Tenant-level administrative access. |
| HR Admin | `HR_ADMIN` | Full HR module access across all employees. |
| Manager | `MANAGER` | Team/subordinate access only. |
| Department Head | `DEPARTMENT_HEAD` | Department-level access. |
| Employee | `EMPLOYEE` | Own data access only. |

### 5.2 Attendance Permission Mapping

| Permission | Granted To | Used In |
|-----------|-----------|---------|
| `hr:read:all` | SUPER_ADMIN, HR_ADMIN | List all attendance, reports, config, single record |
| `hr:read:subordinates` | MANAGER | Team attendance, single record (own team only) |
| `hr:create:all` | SUPER_ADMIN, HR_ADMIN | Bulk import, mark absent |
| `hr:update:all` | SUPER_ADMIN, HR_ADMIN | Update attendance config |
| _(no permission needed)_ | All authenticated users | getTodayStatus, getMyAttendance, checkIn, checkOut |

### 5.3 Backend Permission Enforcement

| Endpoint | Guard | Behavior |
|----------|-------|----------|
| `GET /me/today` | `get_current_user` | Any authenticated user, own data only |
| `GET /me` | `get_current_user` | Any authenticated user, own data only |
| `POST /check-in` | `get_current_user` | Any authenticated user, own data only |
| `POST /check-out` | `get_current_user` | Any authenticated user, own data only |
| `GET /team` | `require_any_permission(["hr:read:all", "hr:read:subordinates"])` | Manager sees subordinates only |
| `GET /` (list) | `require_any_permission(["hr:read:all", "hr:read:subordinates"])` | Role-based filtering in handler |
| `GET /report` | `require_permission("hr:read:all")` | HR Admin / Super Admin only |
| `POST /bulk-import` | `require_permission("hr:create:all")` | HR Admin / Super Admin only |
| `POST /mark-absent` | `require_permission("hr:create:all")` | HR Admin / Super Admin only |
| `GET /config` | `require_permission("hr:read:all")` | HR Admin / Super Admin only |
| `PUT /config` | `require_permission("hr:update:all")` | HR Admin / Super Admin only |

### 5.4 Frontend Permission Enforcement

| UI Element | Condition |
|-----------|-----------|
| "My Attendance" tab | Always visible |
| "Team Attendance" tab | `hasAnyRole(['MANAGER'])` OR `hasPermission('hr:read:subordinates')` |
| "All Attendance" tab | `hasAnyRole(['SUPER_ADMIN','HR_ADMIN'])` OR `hasPermission('hr:read:all')` |
| Check-In/Check-Out widget | Rendered only on "My Attendance" view |
| Department filter | "All Attendance" view only |
| Employee filter | "Team" and "All" views |
| Status filter | All views |

---

## 6. Current UI Behavior

### 6.1 Component Hierarchy

```
Dashboard (/dashboard)
+-- DashboardStats (shows "Present Today" count -- currently mocked)
+-- AttendanceWidget (quick check-in/out from dashboard)
|   +-- Current date display
|   +-- Status icon (not_started / working / completed)
|   +-- Check In time | Check Out time | Total Hours grid
|   +-- Action button or "Day Complete" badge
+-- LeaveWidget
+-- QuickActions (links to /dashboard/attendance?action=overtime)

Attendance Page (/dashboard/attendance)
+-- AttendancePageClient
    +-- Tab Navigation (My | Team | All -- role-based)
    +-- AttendanceCheckInOut (my view only)
    |   +-- Real-time clock (updates every 1 second)
    |   +-- Today's status display
    |   +-- Check In / Check Out / Day Complete button
    +-- Date Range Filters (start date, end date)
    +-- AttendanceList (mode-based)
        +-- Filter Row (department, employee, status -- based on mode)
        +-- DataTable (date, employee, check-in, check-out, hours, status, notes)
        +-- Pagination

Employee Detail (/dashboard/employees/[id])
+-- EmployeeAttendance tab
    +-- Summary Cards (present, late, absent, half-day counts)
    +-- Date Range Filters
    +-- DataTable with pagination
```

### 6.2 AttendanceCheckInOut Widget Behavior

**File**: `frontend/src/components/attendance/AttendanceCheckInOut.tsx`

1. On mount: calls `attendanceService.getTodayStatus()` to fetch today's record
2. Starts interval timer: updates `currentTime` state every 1000ms (real-time clock)
3. Conditional rendering:
   - `canCheckIn = !todayRecord || !todayRecord.checkIn` -> Show "Check In" button
   - `canCheckOut = todayRecord?.checkIn && !todayRecord?.checkOut` -> Show "Check Out" button
   - `isComplete = todayRecord?.checkIn && todayRecord?.checkOut` -> Show "Day Complete" badge
4. On Check In: calls `attendanceService.checkIn()`, updates `todayRecord` state
5. On Check Out: calls `attendanceService.checkOut()`, updates `todayRecord` state
6. Shows error alert if API call fails

### 6.3 AttendanceList Modes

**File**: `frontend/src/components/attendance/AttendanceList.tsx`

| Mode | API Called | Filters Shown | Employee Column |
|------|-----------|---------------|-----------------|
| `my` | `getMyAttendance()` | Date range only | Hidden |
| `team` | `listTeam()` | Employee, Status, Date range | Shown |
| `all` | `list()` | Department, Employee, Status, Date range | Shown |

### 6.4 Status Badge Colors

| Status | Color | Badge Variant |
|--------|-------|---------------|
| PRESENT | Green | `success` |
| ABSENT | Red | `error` |
| LATE | Yellow | `warning` |
| HALF_DAY | Blue | `info` |
| ON_LEAVE | Gray | `neutral` |
| HOLIDAY | Gray | `neutral` |
| WORK_FROM_HOME | Blue | `info` |

---

## 7. Identified Gaps and Missing Features

### 7.1 Backend Gaps

| # | Gap | Current State | Impact |
|---|-----|---------------|--------|
| G1 | **No LATE status in Prisma enum** | Prisma `AttendanceStatus` enum lacks `LATE`. SQLAlchemy has it. | API Gateway reads may miss LATE records or fail on enum validation |
| G2 | **No scheduled absent marking** | `mark_absent` exists but must be triggered manually via API | Employees not marked absent automatically at end of day |
| G3 | **No overtime calculation** | Prisma schema has `overtimeHours` column; SQLAlchemy model does not | Overtime is never calculated or stored |
| G4 | **No geolocation tracking** | Prisma schema has `location` (JSON) column; not used in service | No location-based attendance verification |
| G5 | **Department-level filtering for managers** | Manager team query only uses `manager_id` (direct reports) | Department heads cannot see all department members, only direct reports |
| G6 | **No attendance correction/edit API** | No endpoint to correct attendance records (HR admin) | HR cannot fix incorrect check-in/out times |
| G7 | **DashboardStats "Present Today" is mocked** | Hardcoded value `142` with `91%` | Dashboard shows fake attendance stats |

### 7.2 Frontend Gaps

| # | Gap | Current State | Impact |
|---|-----|---------------|--------|
| G8 | **No attendance summary stats on "My" view** | Only check-in/out widget + history table | Employee cannot see monthly present/absent/late counts |
| G9 | **No export functionality** | No CSV/Excel export for attendance data | HR cannot export for payroll processing |
| G10 | **No attendance calendar view** | Only table/list view | No visual monthly calendar showing attendance patterns |
| G11 | **No real-time team status** | Team view only shows historical records | Manager cannot see who is currently checked in today |
| G12 | **No weekly/monthly summary view** | Only per-record list | No aggregated summary for quick overview |

### 7.3 Compliance and Security Gaps

| # | Gap | Impact |
|---|-----|--------|
| G13 | **Audit logs don't capture IP address/user agent** | Service method signature doesn't pass request context to `_log_audit` |
| G14 | **No data retention policy** | Attendance records stored indefinitely without cleanup |
| G15 | **No attendance data in user data export** | DPDP Act compliance requires attendance data in export |

---

## 8. Recommended Improvements -- Phase 2 Plan

### 8.1 Priority 1 -- Core Feature Completion

| Task | Details | Files to Modify |
|------|---------|-----------------|
| **Add LATE to Prisma enum** | Add `LATE` to `AttendanceStatus` enum in Prisma schema | `api-gateway/prisma/schema.prisma` |
| **Add overtimeHours to SQLAlchemy** | Add `overtime_hours` column to `attendance_records` model; calculate when `work_hours > min_work_hours` | `backend/services/hr/models/attendance.py`, `attendance_service.py` |
| **Attendance correction API** | New `PUT /attendance/{id}` endpoint for HR admin to edit records | `backend/services/hr/api/attendance.py`, `attendance_service.py` |
| **Fix DashboardStats** | Replace mocked "Present Today" with real API call | `frontend/src/components/dashboard/DashboardStats.tsx` |
| **Employee summary stats** | Add monthly summary cards (present/absent/late/half-day) on "My Attendance" view | `frontend/src/components/attendance/AttendanceCheckInOut.tsx` or new component |

### 8.2 Priority 2 -- Manager/HR Enhancements

| Task | Details | Files to Modify |
|------|---------|-----------------|
| **Real-time team status** | New endpoint `GET /attendance/team/today` returning today's status for all subordinates | Backend API + new frontend component |
| **Department-level access** | Extend `list_team_attendance` to include all department members when user is department head | `attendance_service.py` |
| **Export to CSV** | New endpoint `GET /attendance/export` returning CSV; frontend download button | Backend + AttendanceList component |
| **Weekly/monthly summary view** | Frontend summary cards + sparkline charts for attendance patterns | New frontend component |

### 8.3 Priority 3 -- Automation and UX

| Task | Details |
|------|---------|
| **Scheduled absent marking** | Cron job / Celery task to run `mark_absent` daily at configurable time |
| **Attendance calendar view** | Visual calendar component showing month view with color-coded days |
| **Notification on late** | Push notification to manager when employee checks in late |
| **Geolocation recording** | Capture browser geolocation on check-in (optional, configurable) |

### 8.4 Priority 4 -- Compliance

| Task | Details |
|------|---------|
| **IP/User-Agent in audit logs** | Pass request context through to `_log_audit` calls |
| **Include attendance in data export** | Add attendance records to DPDP data export endpoint |
| **Data retention policy** | Configurable retention period; archival/purge job |

---

## Appendix A -- Key File Reference

### Backend

| File | Purpose |
|------|---------|
| `backend/services/hr/models/attendance.py` | AttendanceRecord SQLAlchemy model |
| `backend/services/hr/models/attendance_config.py` | AttendanceConfig model |
| `backend/services/hr/models/employee.py` | Employee model (manager_id, department_id) |
| `backend/services/hr/models/department.py` | Department model (hierarchy, manager) |
| `backend/services/hr/services/attendance_service.py` | All attendance business logic |
| `backend/services/hr/api/attendance.py` | API endpoints and schemas |
| `backend/shared/dependencies.py` | Auth middleware, permission guards |
| `backend/shared/security.py` | JWT creation/validation |
| `backend/alembic/versions/20260331_010000_attendance_enhancements.py` | Migration |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/app/(app)/dashboard/attendance/page.tsx` | Attendance page (server component) |
| `frontend/src/app/(app)/dashboard/attendance/AttendancePageClient.tsx` | Attendance page (client component) |
| `frontend/src/components/attendance/AttendanceCheckInOut.tsx` | Check-in/out widget with live clock |
| `frontend/src/components/attendance/AttendanceList.tsx` | Attendance table with mode-based filtering |
| `frontend/src/components/dashboard/AttendanceWidget.tsx` | Dashboard attendance widget |
| `frontend/src/components/dashboard/DashboardStats.tsx` | Dashboard stats (has mocked attendance count) |
| `frontend/src/components/employees/EmployeeAttendance.tsx` | Employee detail attendance tab |
| `frontend/src/services/hr/hrService.ts` | Attendance API client methods (lines 237-289) |
| `frontend/src/services/hr/types.ts` | Attendance TypeScript interfaces (lines 249-294) |
| `frontend/src/stores/authStore.ts` | Auth store with permission helpers |
| `frontend/src/contexts/AuthContext.tsx` | Auth context with role/permission checking |

### API Gateway

| File | Purpose |
|------|---------|
| `api-gateway/prisma/schema.prisma` | Prisma schema (read-only view) |
| `api-gateway/src/routes/attendance.routes.ts` | Proxy routes to HR service |
