# INSPECTAONE Technology Stack Overview

This document provides a comprehensive overview of the technology stack used in the INSPECTAONE platform, a production-grade microservices system for vehicle inspection and insurance claim processing.

---

## 1. APPLICATION ARCHITECTURE

### Overall System Architecture

INSPECTAONE follows a **microservices architecture** with the following characteristics:

- **19+ independent microservices** organized into mandatory core services and optional enhancement services
- **Service consolidation pattern** reducing complexity by grouping related functionality
- **Event-driven communication** using message queues and async task processing
- **API Gateway pattern** with Kong for request routing, authentication, and load balancing

### High-Level Component Interaction

```
                    ┌─────────────────────────────────────┐
                    │          Kong API Gateway           │
                    │    (Port 8000/8001/8002)            │
                    └───────────────┬─────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Auth Service │         │  Job Service  │         │ Storage Svc   │
│   (8101)      │         │   (8102)      │         │   (8104)      │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │PostgreSQL│   │  Redis   │   │  MinIO   │
              │  (5432)  │   │ (6379)   │   │(9000/01) │
              └──────────┘   └──────────┘   └──────────┘
```

### Service Categories

**Mandatory Core Services (6):**
- auth-service (Port 8101)
- job-service (Port 8102)
- storage-service (Port 8104)
- business-service (Port 8120) - Consolidated
- platform-service (Port 8121) - Consolidated
- mobile-api-service (Port 8112)

**Optional Services (8):**
- ai-service (Port 8103)
- ml-service (Port 8109)
- analytics-service (Port 8117)
- payment-service (Port 8110)
- workflow-service (Port 8111)
- integration-service (Port 8113)
- iot-service (Port 8118)
- backup-service (Port 8119)

---

## 2. FRONTEND

### Frameworks and Languages

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.0.4 | React framework with App Router |
| TypeScript | 5.3.3 | Type-safe JavaScript |
| React | 18.x | UI component library |

### State Management Approach

- **Zustand 4.4.7** - Lightweight state management
- **TanStack React Query 5.12.0** - Server state management and data fetching
- **Dexie** - IndexedDB wrapper for offline data persistence

### UI Libraries and Design Systems

| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 3.3.6 | Utility-first CSS framework |
| Lucide React | Latest | Icon library |
| TailwindCSS Forms | Latest | Form styling plugin |
| React Hook Form | 7.49.0 | Form state management |
| Zod | Latest | Schema validation |

### Platform Targets

- **Web** - Primary target via Next.js
- **Progressive Web App (PWA)** - Enabled via next-pwa 5.6.0
- **Offline Support** - IndexedDB with Dexie for offline-first capabilities

### Frontend Directory Structure

```
/apps/web/src
├── /app          - Next.js 14 App Router (22 routes/pages)
├── /components   - React components (17 directories)
├── /hooks        - Custom React hooks
├── /lib          - Utilities and helpers
├── /types        - TypeScript interfaces
└── /__tests__    - Unit tests
```

---

## 3. BACKEND

### Programming Languages

| Language | Version | Usage |
|----------|---------|-------|
| Python | 3.11+ | All microservices |

### Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.104 - 0.109 | REST API framework |
| Uvicorn | Latest | ASGI server |
| Pydantic | 2.5+ | Data validation and serialization |
| SQLAlchemy | 2.0.23+ | ORM and database abstraction |

### API Style

- **REST API** - Primary API style across all services
- **OpenAPI/Swagger** - Automatic documentation generation
- **WebSockets** - Real-time communication support in job-service

### API Documentation Endpoints

| Service | Documentation URL |
|---------|-------------------|
| Auth Service | http://localhost:8101/docs |
| Job Service | http://localhost:8102/docs |
| Business Service | http://localhost:8120/docs |
| Platform Service | http://localhost:8121/docs |
| Storage Service | http://localhost:8104/docs |

### Authentication and Authorization Mechanisms

| Component | Implementation |
|-----------|----------------|
| Token Type | JWT (JSON Web Tokens) |
| Algorithm | HS256 |
| Access Token TTL | 30 minutes |
| Refresh Token TTL | 7 days |
| Password Hashing | bcrypt via passlib |
| Two-Factor Auth | Supported |
| Multi-Tenancy | Row Level Security (RLS) |
| Role-Based Access | RBAC with user roles |
| Token Storage | HttpOnly secure cookies |

---

## 4. MOBILE APPLICATION

### Platform

- **Cross-platform** - Android, iOS, and Web support via single codebase

### Frameworks and SDKs

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.0 | Development platform and tooling |
| React | 19.1.0 | UI library |
| React Navigation | native-stack | Navigation framework |
| React Native Reanimated | 4.1.1 | Animations |
| React Native SVG | 15.12.1 | Vector graphics |

### Device Feature Usage

| Feature | SDK | Version |
|---------|-----|---------|
| Camera | expo-camera | 17.0.0 |
| Location/GPS | expo-location | 17.0.1 |
| Secure Storage | expo-secure-store | 13.0.2 |
| File System | expo-file-system | 19.0.0 |
| Screen Orientation | expo-screen-orientation | Latest |
| Async Storage | @react-native-async-storage | Latest |

### Mobile Capabilities

- Offline-first architecture with sync capabilities
- Photo and video capture for inspections
- GPS/location tracking
- Secure authentication token storage
- Real-time synchronization with backend

---

## 5. DATABASES AND STORAGE

### Database Types

| Type | Technology | Version | Purpose |
|------|------------|---------|---------|
| SQL (Primary) | PostgreSQL | 16 | Primary data store |
| In-Memory Cache | Redis | 7 (Alpine) | Caching, sessions, queues |

### PostgreSQL Configuration

- **Multi-tenant architecture** with Row Level Security (RLS)
- **Async connections** via asyncpg 0.29.0
- **Schema migrations** via Alembic 1.12+
- **Connection pooling** - 10-20 connections per service
- **UUID primary keys** across all tables
- **Lookup tables** for categorical data (no VARCHAR enums)

### Redis Usage

| Database | Purpose |
|----------|---------|
| DB 0 | Default/session management |
| DB 1 | Celery broker (task queue) |
| DB 2 | Celery results backend |
| DB 3 | Application cache (TTL: 300s) |

### File/Image/Video Storage

| Technology | Purpose |
|------------|---------|
| MinIO | S3-compatible object storage (primary) |
| AWS S3 | Cloud storage option with CloudFront CDN |
| Local Filesystem | Development/fallback option |

### MinIO Configuration

- **API Port**: 9000
- **Console Port**: 9001
- **Buckets**: Documents, images, videos, backups
- **Features**: Versioning, lifecycle policies

---

## 6. AI / ML / IMAGE PROCESSING

### AI Service Providers

| Provider | Library/SDK | Purpose |
|----------|-------------|---------|
| OpenAI | openai 1.6.1 | GPT models for damage assessment |
| Google | google-generativeai 0.3.2 | Generative AI capabilities |
| Anthropic | anthropic 0.8.1 | Claude integration |
| AWS Bedrock | boto3 | AWS-hosted AI models |

### Image Processing Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| Pillow | 10.1 - 10.2 | Image manipulation |
| OpenCV | opencv-python-headless | Computer vision |
| ffmpeg-python | Latest | Video processing |

### AI/ML Capabilities

- **Damage Detection** - AI-powered vehicle damage assessment
- **Image Classification** - Categorizing inspection images
- **Cost Estimation** - LLM-based repair cost estimates
- **Photo Quality Validation** - Automated image quality checks
- **Multi-Provider Support** - Failover between AI providers

### Inference Approach

- **Server-side inference** - All AI processing occurs on backend services
- **ai-service** (Port 8103) - Primary AI processing service
- **ml-service** (Port 8109) - Model management and training pipelines

### ML Service Features

- Model versioning and management
- Training pipeline orchestration
- Annotation management for training data
- Prediction serving
- Model deployment workflows

---

## 7. CLOUD / INFRASTRUCTURE

### Hosting Environment

- **Containerized deployment** using Docker
- **Multi-cloud capable** architecture

### Cloud Providers and Services

| Provider | Services Used |
|----------|---------------|
| AWS | S3, SES (email), SNS (SMS), Bedrock (AI), EC2 |
| Google Cloud | Maps API, Generative AI |
| Self-hosted Options | MinIO, PostgreSQL, Redis, Vault |

### Container Orchestration

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 20.10+ | Service containerization |
| Docker Compose | 2.0+ | Local development orchestration |

### Docker Compose Profiles

| Profile | Services Included |
|---------|-------------------|
| base | Infrastructure only |
| core | Infrastructure + mandatory services |
| optional | Enhancement services |
| dev-tools | Development and monitoring tools |
| monitoring | Prometheus + Grafana |
| security | Vault + Sentry |

### Load Balancing and Scalability

- **Kong API Gateway** - Request routing, load balancing, rate limiting
- **Stateless services** - Horizontal scaling capability
- **Health checks** - All services include health endpoints
- **Auto-restart** - Failed containers automatically restart

### Resource Requirements

| Environment | RAM | Disk |
|-------------|-----|------|
| Minimum (Core) | 8 GB | 20 GB |
| Recommended (Full) | 16 GB | 50 GB |
| Production | 32+ GB | 200+ GB SSD |

---

## 8. DEVOPS AND CI/CD

### Build Tools

| Tool | Purpose |
|------|---------|
| Turbo | Monorepo build orchestration |
| Docker | Container image building |
| Make | Development command automation |

### CI/CD Platform

- **GitHub Actions** - Primary CI/CD platform

### Pipeline Configuration

| Workflow | Lines | Purpose |
|----------|-------|---------|
| backend-ci.yml | 10,718 | Python service testing, linting, security |
| frontend-ci.yml | 5,297 | TypeScript/React testing and linting |
| pr-validation.yml | 4,890 | Pre-commit validation |
| deploy-staging.yml | 11,682 | Staging deployment |
| test.yml | 3,407 | Test orchestration |

### Backend CI Pipeline

- Code linting: Black, Flake8, isort, mypy
- Security scanning: Bandit, Trivy, Snyk
- Unit and integration tests: pytest
- Docker build verification
- Code coverage: Codecov

### Frontend CI Pipeline

- ESLint and Prettier formatting
- Jest unit tests
- TypeScript compilation checks
- Playwright E2E tests
- Coverage reporting

### Environment Separation

| Environment | Purpose |
|-------------|---------|
| Development | Local Docker Compose |
| Staging | Pre-production testing |
| Production | Live environment |

### Code Quality Tools

| Tool | Purpose |
|------|---------|
| Black | Python code formatting |
| Flake8 | Python linting (max line: 100) |
| isort | Python import sorting |
| mypy | Python type checking |
| Bandit | Python security scanning |
| ESLint | JavaScript/TypeScript linting |
| Prettier | JavaScript/TypeScript formatting |
| pre-commit | Git hook management |

---

## 9. SECURITY AND COMPLIANCE

### Data Security Practices

| Practice | Implementation |
|----------|----------------|
| Secrets Management | HashiCorp Vault |
| Environment Variables | .env files with secure injection |
| Sensitive Data | Never committed to repository |
| API Keys | Rotated and stored in Vault |

### Encryption

| Type | Implementation |
|------|----------------|
| Password Hashing | bcrypt |
| Token Signing | HS256 JWT |
| Transport | HTTPS/TLS |
| Storage | S3 server-side encryption (optional) |

### Access Control

| Mechanism | Description |
|-----------|-------------|
| JWT Authentication | Token-based API access |
| Role-Based Access Control | RBAC with defined user roles |
| Multi-Tenancy | Row Level Security in PostgreSQL |
| Team Management | Hierarchical team structures |
| Super Admin Portal | Platform administration |

### Security Scanning

| Tool | Purpose |
|------|---------|
| Bandit | Python security vulnerability scanning |
| Trivy | Container image scanning |
| Snyk | Dependency vulnerability scanning |
| ClamAV | Malware scanning for uploads |

### Account Security Features

- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Password complexity requirements
- Two-factor authentication support
- Session timeout management

### Compliance Considerations

- Audit logging via platform-service
- Activity tracking and timestamps
- Data retention policies via backup-service
- PII handling through multi-tenant isolation
- Not explicitly observed: GDPR, HIPAA, or other specific compliance certifications

---

## 10. INTEGRATIONS AND EXTERNAL SERVICES

### Payment Processing

| Provider | Purpose |
|----------|---------|
| Razorpay | Payment processing (primary) |
| Stripe | Payment processing (alternative) |

### Communication Services

| Service | Purpose |
|---------|---------|
| SMTP (Gmail/Corporate) | Email delivery |
| SendGrid | Transactional email |
| AWS SES | Cloud email service |
| MSG91 | SMS delivery |
| Twilio | SMS and voice |
| AWS SNS | Push notifications |
| WhatsApp (Evolution API) | Messaging integration |

### Location and Mapping

| Service | Purpose |
|---------|---------|
| Google Maps API | Geocoding, directions, places |

### Vehicle Data

| Service | Purpose |
|---------|---------|
| VIN Decoder API | Vehicle identification decoding |

### Workflow Orchestration

| Technology | Purpose |
|------------|---------|
| Temporal | Durable workflow execution |
| Celery | Async task processing |
| APScheduler | Scheduled job execution |

### IoT Integration

| Technology | Purpose |
|------------|---------|
| MQTT Broker | IoT device communication |
| Telematics APIs | Vehicle data collection |

### Monitoring and Observability

| Service | Purpose |
|---------|---------|
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |
| Jaeger | Distributed tracing |
| ELK Stack | Log aggregation (Elasticsearch, Logstash, Kibana) |
| Sentry | Error tracking and monitoring |

---

## 11. DEPENDENCY SUMMARY

### Backend Dependencies (Python)

| Category | Key Libraries |
|----------|---------------|
| Web Framework | FastAPI 0.104-0.109, Uvicorn |
| Data Validation | Pydantic 2.5+ |
| Database | SQLAlchemy 2.0.23+, asyncpg 0.29.0, Alembic 1.12+ |
| Caching | Redis 5.0.1, hiredis |
| Task Queue | Celery 5.3.4, Kombu 5.3.4 |
| AI/ML | OpenAI 1.6.1, Anthropic 0.8.1, google-generativeai 0.3.2 |
| Image Processing | Pillow 10.1-10.2, opencv-python-headless, ffmpeg-python |
| Authentication | python-jose (PyJWT), passlib, bcrypt |
| HTTP Client | httpx, aiohttp |
| Communication | Twilio 8.10.0 |
| Scheduling | APScheduler |
| Testing | pytest 7.4.4, pytest-asyncio, pytest-cov |
| Monitoring | prometheus-client, structlog |

### Frontend Dependencies (Node.js)

| Category | Key Libraries |
|----------|---------------|
| Framework | Next.js 14.0.4 |
| Language | TypeScript 5.3.3 |
| Styling | Tailwind CSS 3.3.6 |
| State Management | Zustand 4.4.7 |
| Data Fetching | TanStack React Query 5.12.0, Axios 1.6.2 |
| Forms | React Hook Form 7.49.0, Zod |
| Offline Support | next-pwa 5.6.0, Dexie |
| Testing | Jest 29.7.0, Playwright |
| Icons | Lucide React |

### Mobile Dependencies (React Native)

| Category | Key Libraries |
|----------|---------------|
| Framework | React Native 0.81.5 |
| Platform | Expo 54.0.0 |
| UI | React 19.1.0 |
| Navigation | React Navigation |
| Camera | expo-camera 17.0.0 |
| Location | expo-location 17.0.1 |
| Storage | expo-secure-store 13.0.2, expo-file-system 19.0.0 |
| Animation | React Native Reanimated 4.1.1 |

### Versioning Approach

- **Semantic Versioning** - All dependencies follow semver
- **Lock Files** - package-lock.json (Node.js), requirements.txt pinned versions (Python)
- **Dependency Updates** - Managed through CI/CD security scanning
- **Monorepo Management** - Turbo for coordinated builds and caching

### Infrastructure Components

| Component | Version |
|-----------|---------|
| PostgreSQL | 16 |
| Redis | 7 (Alpine) |
| MinIO | Latest |
| Kong | 3.4 (Alpine) |
| Docker | 20.10+ |
| Docker Compose | 2.0+ |

---

## Document Information

| Attribute | Value |
|-----------|-------|
| Generated | January 2026 |
| Project | INSPECTAONE |
| Architecture | Microservices |
| Primary Language | Python 3.11+ |
| Frontend Framework | Next.js 14 |
| Mobile Framework | React Native / Expo |

---

*This document represents the current technology stack as observed in the INSPECTAONE codebase. Items marked as "Not explicitly observed" indicate areas where implementation details were not found in the analyzed code and configuration files.*
