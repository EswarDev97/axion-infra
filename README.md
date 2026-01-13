# AxionPCS - HR Management Platform

A comprehensive, multi-tenant SaaS platform combining a public company website with a full-featured Human Resource Management System (HRMS).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX                                 │
│                   (Reverse Proxy)                           │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Frontend     │ │   API Gateway   │ │   AI Services   │
│   (Next.js 14)  │ │   (Node.js)     │ │   (FastAPI)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
           │               │                    │
           └───────────────┼────────────────────┘
                           │
┌─────────────────┬────────┴────────┬─────────────────┐
│   PostgreSQL    │     Redis       │     MinIO       │
│    (Database)   │    (Cache)      │   (Storage)     │
└─────────────────┴─────────────────┴─────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for AI services development)

### Development Setup

1. **Clone and setup environment:**
```bash
cp api-gateway/.env.example api-gateway/.env
cp frontend/.env.example frontend/.env
cp ai-services/.env.example ai-services/.env
```

2. **Start infrastructure services:**
```bash
docker-compose up -d postgres redis minio minio-init
```

3. **Run database migrations:**
```bash
cd api-gateway
npm install
npx prisma migrate dev
npx prisma db seed
```

4. **Start all services (development):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production Deployment

```bash
docker-compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| API Gateway | 3001 | Node.js REST API |
| AI Resume Parser | 8001 | Resume parsing service |
| AI Document Classifier | 8002 | Document classification |
| AI HR Analytics | 8003 | HR analytics and insights |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache & sessions |
| MinIO | 9000/9001 | Object storage |
| Nginx | 80/443 | Reverse proxy |

## Project Structure

```
axion-infra/
├── frontend/                 # Next.js 14 frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── (public)/     # Public website
│   │   │   ├── (app)/        # HRMS dashboard
│   │   │   └── (auth)/       # Auth pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities & API client
│   │   └── contexts/         # React contexts
│   └── Dockerfile
│
├── api-gateway/              # Node.js backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── middlewares/      # Express middlewares
│   │   └── config/           # Configuration
│   ├── prisma/               # Database schema
│   └── Dockerfile
│
├── ai-services/              # Python AI microservices
│   ├── resume-parser/        # Resume parsing
│   ├── document-classifier/  # Document classification
│   ├── hr-analytics/         # HR analytics
│   └── shared/               # Shared utilities
│
├── nginx/                    # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
│
├── docs/                     # Documentation
│   ├── API_DESIGN.md
│   ├── AUTH_RBAC.md
│   └── ARCHITECTURE.md
│
└── docker-compose.yml        # Docker orchestration
```

## HRMS Modules

### Employee Management
- Employee profiles & lifecycle
- Department hierarchy
- Reporting structure
- Organization chart

### Attendance
- Check-in/check-out
- Geolocation tracking
- Attendance reports
- Team attendance view

### Leave Management
- Leave types & policies
- Leave balance tracking
- Approval workflows
- Leave calendar

### Payroll
- Salary structures
- Payroll processing
- Payslip generation
- Tax calculations

### Documents
- Document storage (MinIO)
- AI-powered classification
- Version control
- Access control

### Roles & Permissions
- Role-based access control
- Custom permissions
- Hierarchical roles

## Authentication & Security

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Rate limiting
- Audit logging

See [AUTH_RBAC.md](docs/AUTH_RBAC.md) for details.

## API Documentation

Base URL: `/api/v1`

### Public Endpoints (No Auth)
- `GET /public/careers` - Job listings
- `POST /public/careers/:slug/apply` - Job application
- `POST /public/contact` - Contact form

### Protected Endpoints
- `GET /employees` - List employees
- `POST /attendance/check-in` - Check in
- `POST /leave/apply` - Apply for leave
- `GET /payroll/my` - View payslips

See [API_DESIGN.md](docs/API_DESIGN.md) for complete API documentation.

## Environment Variables

### Frontend
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### API Gateway
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret
MINIO_ENDPOINT=minio
```

### AI Services
```env
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=minio:9000
```

## Multi-Tenant Support

The platform supports multi-tenancy:
- Data isolation via `tenant_id`
- Tenant-specific configurations
- Subdomain routing support
- Custom domains (future)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - AxionPCS
