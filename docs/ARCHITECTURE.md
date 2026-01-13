# AxionPCS Platform Architecture

## System Overview

AxionPCS is a multi-tenant SaaS platform combining a public company website with a full-featured Human Resource Management System (HRMS).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGINX (Reverse Proxy)                              │
│  - SSL Termination                                                          │
│  - Rate Limiting                                                            │
│  - Load Balancing                                                           │
│  - Static File Caching                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
           ┌───────┴───────┐               ┌───────┴───────┐
           ▼               ▼               ▼               │
┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│    Frontend     │ │   API Gateway   │ │ AI Services  │◀─┘
│   (Next.js 14)  │ │   (Node.js)     │ │  (FastAPI)   │
│                 │ │                 │ │              │
│ - Public Website│ │ - REST API      │ │ - Resume     │
│ - HRMS Dashboard│ │ - Auth/RBAC     │ │   Parser     │
│ - SSR/SSG       │ │ - Business Logic│ │ - Document   │
│ - Server Comps  │ │ - Validation    │ │   Classifier │
└────────┬────────┘ └────────┬────────┘ │ - Analytics  │
         │                   │          └──────┬───────┘
         │                   │                 │
         │    ┌──────────────┴─────────────────┘
         │    │
         │    ▼
         │  ┌─────────────────────────────────────────────────────────────────┐
         │  │                    SERVICE LAYER                                 │
         │  ├─────────────────┬─────────────────┬─────────────────────────────┤
         │  │   PostgreSQL    │     Redis       │         MinIO               │
         │  │                 │                 │                             │
         │  │ - User Data     │ - Sessions      │ - Documents                 │
         │  │ - HR Records    │ - OTP Codes     │ - Avatars                   │
         │  │ - Audit Logs    │ - Cache         │ - Payslips                  │
         │  │ - Multi-tenant  │ - Rate Limits   │ - Resumes                   │
         │  └─────────────────┴─────────────────┴─────────────────────────────┘
         │
         └──────────▶ API_BASE_URL (http://api-gateway:3001)
```

---

## Component Details

### 1. Frontend (Next.js 14)

**Technology Stack:**
- Next.js 14 with App Router
- React Server Components
- TypeScript
- Tailwind CSS
- React Hook Form + Zod

**Architecture:**

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Public website (no auth)
│   │   │   ├── page.tsx        # Home
│   │   │   ├── about/
│   │   │   ├── careers/
│   │   │   └── contact/
│   │   ├── (app)/              # HRMS Dashboard (auth required)
│   │   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   │   └── dashboard/
│   │   │       ├── page.tsx    # Dashboard home
│   │   │       ├── employees/
│   │   │       ├── departments/
│   │   │       ├── attendance/
│   │   │       ├── leave/
│   │   │       ├── payroll/
│   │   │       ├── documents/
│   │   │       ├── roles/
│   │   │       └── settings/
│   │   ├── (auth)/             # Auth pages
│   │   │   ├── login/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   └── api/                # API routes (if needed)
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── layout/             # Layout components
│   │   ├── forms/              # Form components
│   │   ├── tables/             # Table components
│   │   └── charts/             # Chart components
│   ├── lib/
│   │   ├── api/                # API client functions
│   │   ├── utils/              # Utility functions
│   │   └── validations/        # Zod schemas
│   ├── hooks/                  # Custom React hooks
│   ├── contexts/               # React contexts
│   └── types/                  # TypeScript types
├── public/                     # Static assets
└── next.config.js
```

**Key Features:**
- Route Groups: `(public)`, `(app)`, `(auth)` for layout separation
- Server Components by default (reduces client JS)
- Streaming with Suspense for better UX
- API calls via `API_BASE_URL` environment variable

### 2. API Gateway (Node.js + Express/Fastify)

**Technology Stack:**
- Node.js 18
- Express.js (or Fastify)
- TypeScript
- Prisma ORM
- JWT Authentication

**Architecture:**

```
api-gateway/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── minio.ts
│   │   └── env.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── employee.controller.ts
│   │   ├── department.controller.ts
│   │   ├── attendance.controller.ts
│   │   ├── leave.controller.ts
│   │   ├── payroll.controller.ts
│   │   ├── document.controller.ts
│   │   └── public.controller.ts
│   ├── middlewares/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── tenant.ts
│   │   ├── validate.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── models/                 # Prisma types/extensions
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── employees.routes.ts
│   │   ├── public.routes.ts
│   │   └── ...
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── employee.service.ts
│   │   ├── email.service.ts
│   │   ├── storage.service.ts
│   │   └── ai.service.ts       # AI service integration
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── hash.ts
│   │   └── pagination.ts
│   ├── validators/             # Zod/Joi schemas
│   └── app.ts                  # Express app setup
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

**Key Features:**
- All APIs under `/api/v1/*`
- Stateless design (session in Redis)
- Multi-tenant support via middleware
- Automatic audit logging

### 3. AI Services (Python FastAPI)

**Technology Stack:**
- Python 3.11+
- FastAPI
- spaCy / Transformers
- scikit-learn
- Redis (caching)

**Architecture:**

```
ai-services/
├── resume-parser/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   │   └── resume_parser.py
│   │   ├── routes/
│   │   │   └── parse.py
│   │   └── utils/
│   │       └── extractors.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── document-classifier/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   │   └── classifier.py
│   │   └── routes/
│   │       └── classify.py
│   ├── Dockerfile
│   └── requirements.txt
│
├── hr-analytics/
│   ├── app/
│   │   ├── main.py
│   │   ├── services/
│   │   │   ├── attrition.py
│   │   │   ├── attendance.py
│   │   │   └── headcount.py
│   │   └── routes/
│   │       └── analytics.py
│   ├── Dockerfile
│   └── requirements.txt
│
└── shared/
    ├── utils/
    └── models/
```

**Services:**
1. **Resume Parser**: Extracts structured data from resumes (PDF/DOCX)
2. **Document Classifier**: Categorizes uploaded documents
3. **HR Analytics**: Generates insights, predictions, trends

---

## Data Flow

### Public Website → API Flow

```
User visits /careers
        │
        ▼
Next.js Server Component
        │
        ├── getJobPostings()
        │   └── fetch(`${API_BASE_URL}/api/v1/public/careers`)
        │
        ▼
API Gateway (No Auth Required)
        │
        └── Returns job postings
```

### HRMS → API Flow (Authenticated)

```
User views /dashboard/employees
        │
        ▼
Next.js Server Component
        │
        ├── Check auth cookie
        ├── getEmployees()
        │   └── fetch(`${API_BASE_URL}/api/v1/employees`, {
        │         headers: { Cookie: ... }
        │       })
        │
        ▼
API Gateway
        │
        ├── authenticate middleware
        │   └── Validate JWT from cookie
        ├── authorize middleware
        │   └── Check 'employees:read' permission
        ├── tenant middleware
        │   └── Filter by tenant
        │
        ▼
Employee Service
        │
        └── Prisma query with tenant filter
```

### AI Service Integration

```
User uploads resume for job application
        │
        ▼
Frontend (Client Component)
        │
        └── POST /api/v1/public/careers/{slug}/apply (multipart/form-data)
                │
                ▼
        API Gateway
                │
                ├── Upload file to MinIO
                ├── Call AI Resume Parser
                │   └── POST http://ai-resume-parser:8001/parse
                │       Body: { fileUrl: "minio://..." }
                │
                ▼
        AI Resume Parser
                │
                ├── Download file from MinIO
                ├── Extract text (PyPDF2/python-docx)
                ├── Parse with spaCy NER
                ├── Return structured data
                │
                ▼
        API Gateway
                │
                ├── Store parsed data in JobApplication
                └── Return success response
```

---

## How Company Website and HRMS Share the Same Backend

### Route Structure

```
/api/v1/
├── public/                    # No authentication required
│   ├── contact               # Contact form submission
│   ├── careers               # Job listings
│   ├── careers/:slug         # Job details
│   ├── careers/:slug/apply   # Job application
│   └── announcements         # Public announcements
│
├── auth/                      # Authentication endpoints
│   ├── login
│   ├── logout
│   ├── refresh
│   ├── forgot-password
│   └── reset-password
│
└── [protected routes]         # Require authentication
    ├── employees
    ├── departments
    ├── attendance
    ├── leave
    ├── payroll
    ├── documents
    └── roles
```

### Shared Components

1. **Database**: Single PostgreSQL instance with tenant isolation
2. **Models**: Same Prisma models for both public and private data
3. **Services**: Shared business logic (e.g., job posting service used by both public career page and HR admin)
4. **File Storage**: Same MinIO instance for all uploads

### Frontend Routing

```typescript
// Public website: No auth layout
app/(public)/
├── layout.tsx       // PublicHeader + PublicFooter
├── page.tsx         // Home
├── about/page.tsx
├── careers/page.tsx
└── contact/page.tsx

// HRMS: Auth-protected layout
app/(app)/
├── layout.tsx       // AppSidebar + AppHeader (auth check)
└── dashboard/
    └── ...          // All HRMS pages
```

---

## Multi-Tenant Architecture

### Tenant Identification

1. **Subdomain**: `acme.axionpcs.com` → tenant slug: `acme`
2. **Custom Domain**: `hr.acme.com` → mapped in `tenants.domain`
3. **Header**: `X-Tenant-ID: acme` (for API-only access)

### Data Isolation

```sql
-- Every tenant-scoped table has tenant_id
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- ... other fields
);

-- Index for performance
CREATE INDEX idx_employees_tenant ON employees(tenant_id);

-- Row-level security (optional, for extra safety)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employees
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Tenant Context Flow

```typescript
// Every request goes through tenant middleware
app.use(resolveTenant);

// Service layer always filters by tenant
class EmployeeService {
  async list(tenantId: string, filters: Filters) {
    return prisma.employee.findMany({
      where: {
        tenantId,  // Always filter by tenant
        ...filters
      }
    });
  }
}
```

---

## Security Architecture

### Defense in Depth

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Nginx                                                │
│ - DDoS protection                                            │
│ - Rate limiting (IP-based)                                   │
│ - SSL/TLS termination                                        │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: API Gateway                                          │
│ - JWT validation                                             │
│ - Rate limiting (user-based)                                 │
│ - Input validation (Zod)                                     │
│ - CORS policy                                                │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: Business Logic                                       │
│ - RBAC permission checks                                     │
│ - Tenant isolation                                           │
│ - Audit logging                                              │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: Data Layer                                           │
│ - Encrypted at rest (PostgreSQL)                             │
│ - Encrypted connections (SSL)                                │
│ - Row-level security (optional)                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Docker Services

| Service | Container Name | Port | Depends On |
|---------|---------------|------|------------|
| PostgreSQL | `postgres` | 5432 | - |
| Redis | `redis` | 6379 | - |
| MinIO | `minio` | 9000, 9001 | - |
| API Gateway | `api-gateway` | 3001 | postgres, redis, minio |
| Frontend | `frontend` | 3000 | api-gateway |
| AI Resume Parser | `ai-resume-parser` | 8001 | redis, minio |
| AI Document Classifier | `ai-document-classifier` | 8002 | redis, minio |
| AI HR Analytics | `ai-hr-analytics` | 8003 | postgres, redis |
| Nginx | `nginx` | 80, 443 | frontend, api-gateway |

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    axionpcs-network (bridge)                 │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │ postgres │  │  redis  │  │  minio  │                     │
│  │  :5432   │  │  :6379  │  │  :9000  │                     │
│  └────┬─────┘  └────┬────┘  └────┬────┘                     │
│       │             │            │                          │
│       └─────────────┼────────────┘                          │
│                     │                                       │
│  ┌──────────────────┴───────────────────┐                  │
│  │           api-gateway:3001            │                  │
│  └──────────────────┬───────────────────┘                  │
│                     │                                       │
│       ┌─────────────┼─────────────┐                        │
│       │             │             │                         │
│  ┌────┴────┐  ┌─────┴─────┐  ┌───┴───┐                    │
│  │frontend │  │ai-resume- │  │ai-doc-│                    │
│  │  :3000  │  │  parser   │  │classif│                    │
│  └────┬────┘  │   :8001   │  │ :8002 │                    │
│       │       └───────────┘  └───────┘                    │
│       │                                                    │
│  ┌────┴────────────────────────────────┐                  │
│  │            nginx:80,:443             │                  │
│  └─────────────────────────────────────┘                  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                  Internet
```

---

## Scaling Considerations

### Horizontal Scaling

1. **API Gateway**: Stateless, can scale horizontally behind load balancer
2. **Frontend**: Can run multiple instances (stateless)
3. **AI Services**: Can scale independently based on load
4. **PostgreSQL**: Read replicas for scaling reads
5. **Redis**: Redis Cluster for high availability

### Database Scaling

```
                    ┌─────────────┐
                    │   Primary   │
                    │  PostgreSQL │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌────┴────┐ ┌────┴────┐
        │  Replica  │ │ Replica │ │ Replica │
        │     1     │ │    2    │ │    3    │
        └───────────┘ └─────────┘ └─────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴──────┐
                    │ Connection  │
                    │   Pooler    │
                    │  (PgBouncer)│
                    └─────────────┘
```

### Future Kubernetes Migration

```yaml
# Example K8s deployment structure
deployments/
├── api-gateway/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml          # Horizontal Pod Autoscaler
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
├── ai-services/
│   └── ...
└── ingress.yaml          # Replace Nginx
```

---

## Monitoring & Observability

### Recommended Stack

1. **Metrics**: Prometheus + Grafana
2. **Logging**: ELK Stack or Loki
3. **Tracing**: Jaeger or OpenTelemetry
4. **Error Tracking**: Sentry

### Health Endpoints

```
GET /api/v1/health           # Basic health check
GET /api/v1/health/ready     # Readiness (dependencies OK)
GET /api/v1/health/live      # Liveness (service running)
```

---

## Disaster Recovery

### Backup Strategy

1. **PostgreSQL**: Daily full backup + WAL archiving
2. **Redis**: RDB snapshots every 15 minutes
3. **MinIO**: Bucket versioning + cross-region replication

### Recovery Time Objectives

| Component | RTO | RPO |
|-----------|-----|-----|
| Database | 1 hour | 15 minutes |
| File Storage | 4 hours | 1 hour |
| Application | 15 minutes | 0 (stateless) |
