# AxionPCS Authentication & RBAC Model

## Overview

AxionPCS uses a JWT-based authentication system with role-based access control (RBAC). The system is designed to be multi-tenant ready and supports hierarchical permissions.

## Authentication Flow

### 1. Login Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────┐     ┌─────────┐
│  User   │────▶│  Frontend   │────▶│   API   │────▶│  Redis  │
│         │     │  (Next.js)  │     │ Gateway │     │(Session)│
└─────────┘     └─────────────┘     └─────────┘     └─────────┘
     │                │                   │               │
     │  1. Login      │                   │               │
     │  Credentials   │                   │               │
     │───────────────▶│                   │               │
     │                │  2. POST          │               │
     │                │  /api/v1/auth/    │               │
     │                │  login            │               │
     │                │──────────────────▶│               │
     │                │                   │  3. Validate  │
     │                │                   │  credentials  │
     │                │                   │  (PostgreSQL) │
     │                │                   │               │
     │                │                   │  4. Generate  │
     │                │                   │  JWT tokens   │
     │                │                   │               │
     │                │                   │  5. Store     │
     │                │                   │  refresh token│
     │                │                   │──────────────▶│
     │                │                   │               │
     │                │  6. Return tokens │               │
     │                │◀──────────────────│               │
     │  7. Set        │                   │               │
     │  cookies       │                   │               │
     │◀───────────────│                   │               │
```

### 2. Token Structure

#### Access Token (JWT)
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "tenantId": "tenant-uuid",
    "roles": ["EMPLOYEE", "MANAGER"],
    "permissions": ["employees:read", "leave:approve"],
    "iat": 1704067200,
    "exp": 1704068100,
    "iss": "axionpcs"
  }
}
```

- **Expiry**: 15 minutes
- **Storage**: HttpOnly cookie + Authorization header support
- **Refresh**: Via refresh token

#### Refresh Token
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "token": "random-secure-string",
  "expiresAt": "2024-01-08T00:00:00Z"
}
```

- **Expiry**: 7 days
- **Storage**: HttpOnly cookie + Redis for validation
- **Rotation**: New refresh token on each use

### 3. Token Refresh Flow

```
POST /api/v1/auth/refresh
Cookie: refreshToken=<token>

Response:
{
  "accessToken": "new-jwt-token",
  "expiresIn": 900
}
```

### 4. Logout Flow

```
POST /api/v1/auth/logout
Cookie: accessToken=<token>

Actions:
1. Revoke refresh token in database
2. Add access token to Redis blacklist (TTL = remaining expiry)
3. Clear cookies
```

---

## Role-Based Access Control (RBAC)

### System Roles

| Role | Description | Scope |
|------|-------------|-------|
| `SUPER_ADMIN` | Platform administrator | Global |
| `HR_ADMIN` | HR department head | Tenant |
| `MANAGER` | Department/team manager | Department/Team |
| `EMPLOYEE` | Regular employee | Self |
| `PUBLIC_USER` | Public website visitor | Public APIs only |

### Role Hierarchy

```
SUPER_ADMIN
    │
    └── HR_ADMIN
            │
            ├── MANAGER
            │       │
            │       └── EMPLOYEE
            │
            └── EMPLOYEE

PUBLIC_USER (separate, no hierarchy)
```

### Permission Structure

Permissions follow the pattern: `module:action` or `module:action:scope`

#### Modules
- `employees` - Employee management
- `departments` - Department management
- `attendance` - Attendance tracking
- `leave` - Leave management
- `payroll` - Payroll processing
- `documents` - Document management
- `roles` - Role & permission management
- `settings` - System settings
- `analytics` - Reports & analytics
- `careers` - Job postings & applications

#### Actions
- `create` - Create new records
- `read` - View records
- `update` - Modify records
- `delete` - Remove records
- `approve` - Approve requests
- `export` - Export data

#### Scopes
- `self` - Own records only
- `team` - Team/subordinates
- `department` - Entire department
- `all` - All records (tenant-wide)

### Default Role Permissions

#### SUPER_ADMIN
```
All permissions on all modules (*)
```

#### HR_ADMIN
```
employees:*
departments:*
attendance:*
leave:*
payroll:*
documents:*
roles:read
roles:assign
settings:read
settings:update
analytics:*
careers:*
```

#### MANAGER
```
employees:read:team
employees:update:team
attendance:read:team
attendance:update:team
leave:read:team
leave:approve:team
documents:read:team
analytics:read:team
```

#### EMPLOYEE
```
employees:read:self
employees:update:self (limited fields)
attendance:read:self
attendance:create:self (check-in/out)
leave:read:self
leave:create:self
leave:cancel:self
documents:read:self
documents:upload:self
payroll:read:self
```

#### PUBLIC_USER
```
careers:read (public job listings)
contact:create (submit inquiries)
announcements:read (public announcements)
```

---

## Permission Checking

### Middleware Implementation

```typescript
// api-gateway/src/middlewares/authorize.ts

export function authorize(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Set by auth middleware

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Super admin bypasses all checks
    if (user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    // Check if user has required permissions
    const hasPermission = requiredPermissions.every(permission => {
      return checkPermission(user.permissions, permission);
    });

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

function checkPermission(
  userPermissions: string[],
  required: string
): boolean {
  // Check for wildcard
  if (userPermissions.includes('*')) return true;

  // Check for module wildcard (e.g., "employees:*")
  const [module, action] = required.split(':');
  if (userPermissions.includes(`${module}:*`)) return true;

  // Check exact permission
  return userPermissions.includes(required);
}
```

### Route Usage

```typescript
// api-gateway/src/routes/employees.ts

router.get(
  '/',
  authenticate,
  authorize('employees:read'),
  employeeController.list
);

router.post(
  '/',
  authenticate,
  authorize('employees:create'),
  employeeController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('employees:update'),
  employeeController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('employees:delete'),
  employeeController.delete
);
```

### Scope Enforcement

```typescript
// api-gateway/src/services/employee.service.ts

async function getEmployees(user: User, filters: EmployeeFilters) {
  const where: Prisma.EmployeeWhereInput = {
    tenantId: user.tenantId,
  };

  // Scope-based filtering
  if (!hasPermission(user, 'employees:read:all')) {
    if (hasPermission(user, 'employees:read:department')) {
      where.departmentId = user.employee?.departmentId;
    } else if (hasPermission(user, 'employees:read:team')) {
      where.OR = [
        { managerId: user.employee?.id },
        { id: user.employee?.id }
      ];
    } else {
      // Default: self only
      where.id = user.employee?.id;
    }
  }

  return prisma.employee.findMany({ where, ...filters });
}
```

---

## Multi-Tenant Authentication

### Tenant Resolution

1. **Subdomain-based**: `{tenant}.axionpcs.com`
2. **Path-based**: `axionpcs.com/{tenant}/`
3. **Header-based**: `X-Tenant-ID: {tenant-slug}`
4. **Login-time**: User selects tenant if member of multiple

### Tenant Context Middleware

```typescript
// api-gateway/src/middlewares/tenant.ts

export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let tenantSlug: string | undefined;

  // 1. Check subdomain
  const host = req.hostname;
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    tenantSlug = subdomain;
  }

  // 2. Check header
  if (!tenantSlug) {
    tenantSlug = req.headers['x-tenant-id'] as string;
  }

  // 3. Check user context (for authenticated requests)
  if (!tenantSlug && req.user?.tenantId) {
    // Tenant already in JWT
    return next();
  }

  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug, isActive: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    req.tenantId = tenant.id;
    req.tenant = tenant;
  }

  next();
}
```

---

## Session Management

### Redis Session Storage

```
Key: axionpcs:session:{userId}:{sessionId}
Value: {
  "userId": "uuid",
  "deviceInfo": "...",
  "ipAddress": "...",
  "createdAt": "...",
  "lastActivityAt": "..."
}
TTL: 7 days
```

### Concurrent Session Handling

- Default: Allow up to 5 concurrent sessions per user
- Oldest session is invalidated when limit exceeded
- HR Admin can revoke all sessions for a user

### Session Endpoints

```
GET  /api/v1/auth/sessions       - List active sessions
POST /api/v1/auth/sessions/revoke-all  - Revoke all sessions
POST /api/v1/auth/sessions/:id/revoke  - Revoke specific session
```

---

## Security Measures

### Password Security

- Minimum 8 characters
- Hashed with bcrypt (cost factor: 12)
- Password history: Last 5 passwords cannot be reused
- Account lockout: 5 failed attempts = 15-minute lockout

### Token Security

- JWTs signed with HS256 (consider RS256 for production)
- Refresh tokens are random 256-bit strings
- Token blacklisting via Redis
- Short access token expiry (15 minutes)

### Rate Limiting

- Login: 20 requests/minute per IP
- Password reset: 5 requests/hour per email
- API: 100 requests/minute per user

### Audit Logging

All authentication events are logged:
- Login attempts (success/failure)
- Password changes
- Permission changes
- Session management actions

---

## Frontend Integration

### Auth Context

```typescript
// frontend/src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, tenant?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}
```

### Protected Routes

```typescript
// frontend/src/components/ProtectedRoute.tsx

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading]);

  if (isLoading) return <Loading />;
  if (!user) return null;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied />;
  }

  return children;
}
```

### API Client with Auto-Refresh

```typescript
// frontend/src/lib/api/client.ts

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await apiClient.post('/api/v1/auth/refresh');
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Database Seeding

### Initial Permissions

```sql
-- Seed permissions
INSERT INTO permissions (id, name, slug, module, action) VALUES
  -- Employees
  (uuid_generate_v4(), 'Create Employee', 'employees:create', 'employees', 'create'),
  (uuid_generate_v4(), 'Read Employees', 'employees:read', 'employees', 'read'),
  (uuid_generate_v4(), 'Update Employee', 'employees:update', 'employees', 'update'),
  (uuid_generate_v4(), 'Delete Employee', 'employees:delete', 'employees', 'delete'),

  -- Leave
  (uuid_generate_v4(), 'Create Leave', 'leave:create', 'leave', 'create'),
  (uuid_generate_v4(), 'Read Leave', 'leave:read', 'leave', 'read'),
  (uuid_generate_v4(), 'Approve Leave', 'leave:approve', 'leave', 'approve'),
  (uuid_generate_v4(), 'Cancel Leave', 'leave:cancel', 'leave', 'cancel'),

  -- ... more permissions
;
```

### Initial Roles

```sql
-- Seed system roles
INSERT INTO roles (id, tenant_id, name, slug, is_system) VALUES
  (uuid_generate_v4(), NULL, 'Super Admin', 'super-admin', true),
  (uuid_generate_v4(), NULL, 'HR Admin', 'hr-admin', true),
  (uuid_generate_v4(), NULL, 'Manager', 'manager', true),
  (uuid_generate_v4(), NULL, 'Employee', 'employee', true);
```
