# Employee Module Error Fix Summary

**Date:** January 25, 2026
**Module:** Employee Management
**Status:** Resolved

---

## Executive Summary

During the implementation and testing of the Employee module, three critical issues were identified and resolved. This document summarizes each issue, the root cause analysis, the fix applied, and lessons learned for proactive fixes across other modules.

---

## Issue #1: ERR-FIX-006 - SQLAlchemy Async Relationship Loading

### Problem Description
When clicking "Create Employee", the application threw an error:
```
greenlet_spawn has not been called; can't call await_only() here.
Was IO attempted in an unexpected place?
```

### Root Cause
SQLAlchemy's async engine was attempting to lazy-load relationships (position, department, manager) after `db.refresh()` was called. In async SQLAlchemy, lazy loading triggers a synchronous database call inside an async context, which is not allowed.

The problematic pattern:
```python
await self.db.commit()
await self.db.refresh(employee)  # This triggers lazy loading of relationships
return employee  # Accessing employee.position, etc. fails
```

### Fix Applied
Replaced `db.refresh()` with explicit re-fetch using `selectinload()` for eager loading:

```python
await self.db.commit()
# Re-fetch with eager-loaded relationships
stmt = select(Employee).where(Employee.id == employee.id).options(
    selectinload(Employee.position),
    selectinload(Employee.department),
    selectinload(Employee.manager)
)
result = await self.db.execute(stmt)
return result.scalar_one()
```

### Files Modified
| Service | File | Functions Fixed |
|---------|------|-----------------|
| HR Service | `backend/services/hr/services/employee_service.py` | `create_employee()`, `update_employee()` |
| HR Service | `backend/services/hr/services/department_service.py` | `create()`, `update()` |
| HR Service | `backend/services/hr/services/position_service.py` | `create()`, `update()` |
| HR Service | `backend/services/hr/services/leave_service.py` | `create_leave_request()`, `update_leave_request()` |
| Task Service | `backend/services/task/services/task_service.py` | `create()`, `update()` |
| Expense Service | `backend/services/expense/services/expense_service.py` | `create()`, `update()` |

---

## Issue #2: ERR-FIX-007 - Server-Side Fetch Authentication & URL Configuration

### Problem Description
After successfully creating an employee (201 response), navigating to the employee detail page showed a 404 error.

### Root Cause Analysis
Four issues were identified:

1. **Wrong API Port**: Frontend was calling port 8000 (direct HR service) instead of port 3001 (API Gateway)
2. **Wrong API Path**: Using `/hr/employees` instead of `/employees` (gateway routes don't include service prefix)
3. **No Authentication Headers**: Server-side fetch wasn't forwarding the access token
4. **Cookie Access**: Server components couldn't access browser cookies without using `next/headers`

### Fix Applied
Created a centralized server-side fetch utility:

**New File: `frontend/src/lib/api/server-fetch.ts`**
```typescript
import { cookies } from 'next/headers';

const API_BASE = process.env.API_BASE_URL_INTERNAL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || 'http://localhost:3001/api/v1';

export async function serverFetch<T>(path: string, options = {}): Promise<T | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  // ... error handling
}
```

**Updated: `frontend/src/lib/api/employees.ts`**
```typescript
import { serverFetch, serverFetchList } from './server-fetch';

export async function getEmployee(id: string): Promise<Employee | null> {
  return serverFetch<Employee>(`/employees/${id}`);
}
```

### Files Modified
| Location | File | Change |
|----------|------|--------|
| Frontend | `src/lib/api/server-fetch.ts` | **Created** - Centralized server-side fetch with auth |
| Frontend | `src/lib/api/employees.ts` | Updated to use `serverFetch` |
| Frontend | `src/lib/api/careers.ts` | Added `API_BASE` fallback |
| Frontend | `src/app/(public)/contact/page.tsx` | Added `API_BASE` fallback |

---

## Issue #3: ERR-FIX-008 - Docker Network Connectivity

### Problem Description
Even after ERR-FIX-007, the 404 error persisted. Docker logs showed:
```
Server fetch error: TypeError: fetch failed
  cause: Error: connect ECONNREFUSED ::1:3001
```

### Root Cause
Inside the Docker container, `localhost:3001` refers to the container itself, NOT the API Gateway container. Server-side requests from the Next.js server (running in Docker) couldn't reach the API Gateway.

### Fix Applied
Added a separate environment variable for internal Docker network communication:

**Updated: `docker-compose.yml`**
```yaml
frontend:
  environment:
    - NODE_ENV=production
    - NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1      # Browser requests
    - API_BASE_URL_INTERNAL=http://api-gateway:3001/api/v1       # Server-side requests
```

**Updated: `frontend/src/lib/api/server-fetch.ts`**
```typescript
// Use internal Docker network URL for server-side requests, fallback to public URL
const API_BASE = process.env.API_BASE_URL_INTERNAL
  || process.env.NEXT_PUBLIC_API_BASE_URL
  || 'http://localhost:3001/api/v1';
```

### Files Modified
| Location | File | Change |
|----------|------|--------|
| Root | `docker-compose.yml` | Added `API_BASE_URL_INTERNAL` env var |
| Frontend | `src/lib/api/server-fetch.ts` | Updated to use internal URL first |

---

## Lessons Learned

### Lesson 1: SQLAlchemy Async Requires Eager Loading
**Problem Pattern:** Using `db.refresh()` with relationships in async SQLAlchemy
**Solution Pattern:** Always use `selectinload()` when re-fetching entities with relationships after create/update

**Audit Required For:**
- All `*_service.py` files in `backend/services/*/services/`
- Any function using `db.refresh()` with entities that have relationships
- All `create_*()` and `update_*()` methods

### Lesson 2: Server Components Need Explicit Auth Forwarding
**Problem Pattern:** Server components making API calls without authentication
**Solution Pattern:** Use `cookies()` from `next/headers` to access cookies and forward Authorization headers

**Audit Required For:**
- All files in `frontend/src/lib/api/` that make server-side fetches
- All Server Components that call API endpoints requiring authentication

### Lesson 3: Docker Networking Requires Internal Service Names
**Problem Pattern:** Using `localhost` in Docker environment variables for server-side requests
**Solution Pattern:** Use Docker service names (e.g., `api-gateway`) for container-to-container communication

**Rule:**
- `NEXT_PUBLIC_*` variables → Use `localhost` (browser access)
- Non-prefixed variables → Use Docker service names (server access)

### Lesson 4: API Path Conventions Through Gateway
**Problem Pattern:** Using direct service paths (e.g., `/hr/employees`)
**Solution Pattern:** Use gateway-routed paths (e.g., `/employees`)

**Rule:** Frontend should NEVER call microservices directly. Always go through API Gateway on port 3001.

---

## Proactive Fixes Required for Other Modules

### Backend Services - SQLAlchemy Fix

The following services need audit for the `greenlet_spawn` issue:

| Service | Priority | Relationships to Check |
|---------|----------|----------------------|
| `auth-service` | High | User → Role, User → Tenant |
| `task-service` | High | Task → Assignee, Task → Project |
| `expense-service` | High | Expense → Employee, Expense → Category |
| `training-service` | Medium | Course → Instructor, Enrollment → Employee |
| `complaint-service` | Medium | Complaint → Employee, Complaint → Assignee |
| `approval-service` | Medium | Approval → Requester, Approval → Approver |
| `mindmap-service` | Low | Mindmap → Owner, Node → Parent |
| `notification-service` | Low | Notification → User |
| `report-service` | Low | Report → Creator |
| `storage-service` | Low | Document → Uploader |

**Action:** Search for `db.refresh()` in all service files and replace with eager-loading pattern.

### Frontend - Server-Side Fetch Fix

The following API files need to use `serverFetch`:

| File | Current Status | Action Required |
|------|----------------|-----------------|
| `src/lib/api/employees.ts` | ✅ Fixed | None |
| `src/lib/api/careers.ts` | ⚠️ Uses direct fetch | Migrate to `serverFetch` if used in Server Components |
| `src/services/api/*.ts` | ⚠️ Review needed | Check if any are used in Server Components |

**Action:** Create a checklist of all Server Components and verify they use `serverFetch` for authenticated requests.

### Docker Configuration

Verify these services have proper internal URLs if they make server-to-server calls:

| Service | Env Var to Check |
|---------|------------------|
| API Gateway | `*_SERVICE_URL` variables should use Docker service names |
| HR Service | `AUTH_SERVICE_URL` should be `http://auth-service:8101` |
| All services | No `localhost` references for inter-service communication |

---

## Verification Checklist

- [x] Employee Create works without `greenlet_spawn` error
- [x] Employee Detail page loads after create (no 404)
- [x] Authentication is forwarded in server-side requests
- [x] Docker containers can communicate via internal network
- [ ] Other modules audited for same issues (pending)

---

## Recommendations for Product Owner

1. **Create JIRA tickets** for proactive fixes in other modules
2. **Add to code review checklist:**
   - No `db.refresh()` with relationship entities
   - Server Components must use `serverFetch` with auth forwarding
   - Docker env vars must use service names for internal URLs
3. **Update developer documentation** with these patterns
4. **Add integration tests** that run inside Docker to catch networking issues early

---

*Document prepared by: Claude Code Assistant*
*Review required by: Development Lead, DevOps Lead*
