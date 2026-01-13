# MindFlow Technology Stack

---

## GOVERNANCE

> **This document is the authoritative technology reference for MindFlow Phase 1.**

- This file is a **scoped subset** of `Tech_stack_Overview.md` (INSPECTAONE reference stack).
- Omissions are **intentional** and reflect Phase 1 scope constraints.
- Deviations from this document require **explicit approval** and must be documented.
- Status: **FROZEN** per SDLC.md

---

## 1. APPLICATION ARCHITECTURE

### Overall System Architecture

MindFlow follows a **microservices architecture** with the following characteristics:

- **10 independent microservices** organized by domain
- **Event-driven communication** using Redis Pub/Sub and Celery
- **API Gateway pattern** for request routing, authentication, and load balancing
- **Multi-tenant** with PostgreSQL Row-Level Security (RLS)

### High-Level Component Interaction

```
                    +-------------------------------------+
                    |        Kong API Gateway             |
                    |      (Port 8000/8001/8002)          |
                    +----------------+--------------------+
                                     |
        +----------------------------+----------------------------+
        |                            |                            |
        v                            v                            v
+---------------+         +---------------+         +---------------+
|  Auth Service |         |  HR Service   |         | Task Service  |
|   (8101)      |         |   (8102)      |         |   (8103)      |
+---------------+         +---------------+         +---------------+
        |                            |                            |
        +----------------------------+----------------------------+
                                     |
                    +----------------+----------------+
                    v                v                v
              +----------+   +----------+   +----------+
              |PostgreSQL|   |  Redis   |   |  MinIO   |
              |  (5432)  |   | (6379)   |   |(9000/01) |
              +----------+   +----------+   +----------+
```

### API Gateway

| Component | Specification |
|-----------|---------------|
| Preferred Gateway | Kong 3.4+ (Alpine) |
| Proxy Port | 8000 |
| Admin Port | 8001 |
| Manager Port | 8002 |
| Alternative | Equivalent gateway requires explicit approval |

### Service Categories

**Core Services (10):**
| Service | Port | Responsibility |
|---------|------|----------------|
| auth-service | 8101 | Authentication, RBAC, tenant management |
| hr-service | 8102 | Positions, hierarchy, employees, attendance, leave |
| task-service | 8103 | Task management, sub-tasks, dependencies |
| mindmap-service | 8104 | Mind maps, nodes, templates |
| training-service | 8105 | Courses, sessions, exams, certificates |
| expense-service | 8106 | Expense requests, approvals, payments |
| complaint-service | 8107 | Complaints, SLA, escalation |
| approval-service | 8108 | Generic approval workflows |
| notification-service | 8109 | Real-time notifications, WebSocket |
| storage-service | 8110 | File uploads, MinIO abstraction |

---

## 2. FRONTEND

### Frameworks and Languages

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type-safe JavaScript |
| React | 18.x | UI component library |

### State Management Approach

- **Zustand** - Lightweight client state management
- **TanStack React Query** - Server state management and data fetching

### UI Libraries and Design Systems

| Library | Purpose |
|---------|---------|
| Tailwind CSS | Utility-first CSS framework |
| Lucide React | Icon library |
| React Hook Form | Form state management |
| Zod | Schema validation |

### Platform Targets

| Target | Status |
|--------|--------|
| Web | Primary target via Next.js (Phase 1) |
| PWA | OUT OF SCOPE for Phase 1; may be enabled in future |
| Offline-first | OUT OF SCOPE for Phase 1 |
| Mobile | OUT OF SCOPE for Phase 1 |

---

## 3. BACKEND

### Programming Languages

| Language | Version | Usage |
|----------|---------|-------|
| Python | 3.11+ | All microservices |

### Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.109+ | REST API framework |
| Uvicorn | Latest | ASGI server |
| Pydantic | 2.5+ | Data validation and serialization |
| SQLAlchemy | 2.0+ | ORM and database abstraction |

### API Style

- **REST API** - Primary API style across all services
- **OpenAPI/Swagger** - Automatic documentation generation
- **WebSockets** - Real-time notifications (notification-service)

### Authentication and Authorization Mechanisms

| Component | Implementation |
|-----------|----------------|
| Token Type | JWT (JSON Web Tokens) |
| Algorithm | HS256 |
| Access Token TTL | 30 minutes |
| Refresh Token TTL | 7 days |
| Password Hashing | bcrypt via passlib |
| Multi-Tenancy | Row Level Security (RLS) |
| Role-Based Access | RBAC with user roles |

---

## 4. DATABASES AND STORAGE

### Database Types

| Type | Technology | Version | Purpose |
|------|------------|---------|---------|
| SQL (Primary) | PostgreSQL | 16 | Primary data store |
| In-Memory Cache | Redis | 7 (Alpine) | Caching, sessions, queues |

### PostgreSQL Configuration

- **Multi-tenant architecture** with Row Level Security (RLS)
- **Async connections** via asyncpg
- **Schema migrations** via Alembic
- **UUID primary keys** across all tables

### Redis Usage

| Database | Purpose |
|----------|---------|
| DB 0 | Default/session management |
| DB 1 | Celery broker (task queue) |
| DB 2 | Celery results backend |
| DB 3 | Application cache |

### File/Document Storage

| Technology | Purpose |
|------------|---------|
| MinIO | S3-compatible object storage (primary) |

### MinIO Configuration

- **API Port**: 9000
- **Console Port**: 9001
- **Buckets**: Per-tenant or prefixed paths
- **Features**: Versioning, access control

---

## 5. BACKGROUND JOBS & SCHEDULING

### Task Queue

| Technology | Purpose |
|------------|---------|
| Celery | Async task processing |
| Redis | Celery broker and results backend |

### Scheduled Jobs

- SLA breach detection (complaints)
- Escalation triggers
- Notification digests
- Overdue task reminders

---

## 6. CLOUD / INFRASTRUCTURE

### Container Orchestration

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 20.10+ | Service containerization |
| Docker Compose | 2.0+ | Local development orchestration |

### Resource Requirements

| Environment | RAM | Disk |
|-------------|-----|------|
| Development | 8 GB | 20 GB |
| Production | 16+ GB | 100+ GB SSD |

---

## 7. DEVOPS AND CI/CD

### CI/CD Platform

| Component | Specification |
|-----------|---------------|
| Platform | GitHub Actions (preferred) |
| Alternative | Equivalent CI/CD requires explicit approval |

### Pipeline Requirements

All pipelines MUST enforce:
- Code linting (backend and frontend)
- Unit and integration tests
- Security scanning (see Section 8)
- Docker build verification

### Build Tools

| Tool | Purpose |
|------|---------|
| Docker | Container image building |

### Code Quality Tools

| Tool | Purpose |
|------|---------|
| Black | Python code formatting |
| Flake8 | Python linting |
| isort | Python import sorting |
| mypy | Python type checking |
| ESLint | TypeScript linting |
| Prettier | TypeScript formatting |

---

## 8. SECURITY

### Secrets Management

| Phase | Implementation |
|-------|----------------|
| Phase 1 | Environment variables / Docker secrets |
| Future | HashiCorp Vault or managed secrets service |

**Requirements:**
- Sensitive data MUST NOT be committed to repository
- All secrets MUST be injected at runtime
- .env files are for local development only

### Security Scanning Tools

| Tool | Purpose | Status |
|------|---------|--------|
| Bandit | Python security vulnerability scanning | Required |
| Trivy | Container image scanning | Required |
| Snyk (or equivalent) | Dependency vulnerability scanning | Required |
| ClamAV (or equivalent) | Malware scanning for uploads | Future |

### Encryption

| Type | Implementation |
|------|----------------|
| Password Hashing | bcrypt |
| Token Signing | HS256 JWT |
| Transport | HTTPS/TLS |

### Access Control

| Mechanism | Description |
|-----------|-------------|
| JWT Authentication | Token-based API access |
| Role-Based Access Control | RBAC with defined user roles |
| Multi-Tenancy | Row Level Security in PostgreSQL |

### Account Security

- Account lockout after failed attempts
- Password complexity requirements
- Session timeout management

---

## 9. MONITORING & OBSERVABILITY

### Logging

| Component | Specification |
|-----------|---------------|
| Centralized Logging | ELK-compatible stack (Elasticsearch, Logstash, Kibana) |
| Log Format | Structured JSON (structlog recommended) |

### Metrics and Alerts

| Component | Specification |
|-----------|---------------|
| Metrics Collection | Prometheus-compatible |
| Visualization | Grafana (or equivalent) |
| Health Checks | All services MUST expose /health endpoint |

### Error Tracking

| Component | Specification |
|-----------|---------------|
| Error Tracking | Sentry (or equivalent) |
| Distributed Tracing | Jaeger (future consideration) |

---

## 10. DEPENDENCY SUMMARY

### Backend Dependencies (Python)

| Category | Key Libraries |
|----------|---------------|
| Web Framework | FastAPI, Uvicorn |
| Data Validation | Pydantic 2.5+ |
| Database | SQLAlchemy 2.0+, asyncpg, Alembic |
| Caching | Redis |
| Task Queue | Celery |
| Authentication | python-jose (JWT), passlib, bcrypt |
| HTTP Client | httpx |
| Monitoring | prometheus-client, structlog |

### Frontend Dependencies (Node.js)

| Category | Key Libraries |
|----------|---------------|
| Framework | Next.js 14.x |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Data Fetching | TanStack React Query, Axios |
| Forms | React Hook Form, Zod |
| Icons | Lucide React |

### Infrastructure Components

| Component | Version |
|-----------|---------|
| PostgreSQL | 16 |
| Redis | 7 (Alpine) |
| MinIO | Latest |
| Kong | 3.4+ (Alpine) |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |

---

## 11. LOCKED CONSTRAINTS

The following technologies are **LOCKED** and must not be changed:

1. **Backend**: Python 3.11+ with FastAPI
2. **Frontend**: Next.js 14 with TypeScript
3. **Database**: PostgreSQL 16 with RLS
4. **Cache/Queue**: Redis 7
5. **File Storage**: MinIO
6. **Containerization**: Docker + Docker Compose
7. **API Gateway**: Kong (or approved equivalent)

---

## 12. EXPLICIT EXCLUSIONS (Phase 1)

The following are **intentionally excluded** from Phase 1:

| Category | Items | Rationale |
|----------|-------|-----------|
| Mobile | React Native, Expo | Web-first approach |
| AI/ML | OpenAI, Anthropic, image processing | Not in scope |
| Offline | PWA, IndexedDB, Dexie | No offline-first requirement |
| Payments | Razorpay, Stripe | Domain not applicable |
| External Comms | SMS (Twilio), WhatsApp, Email (SendGrid) | Phase 1 exclusion per SDLC |
| Maps | Google Maps API | Domain not applicable |
| IoT | MQTT, Telematics | Domain not applicable |
| Workflow Engine | Temporal | Celery sufficient for Phase 1 |

---

*Document Status: FROZEN*
*Last Updated: 2026-01-12*
