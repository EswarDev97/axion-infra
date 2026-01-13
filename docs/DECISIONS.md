# MindFlow – Architectural Decision Records (ADR)

> **Purpose**: This document is the official log of all architectural and technology decisions for the MindFlow project.
> **Governance**: All decisions must be documented here before implementation. This aligns with AGENT.md and the Documentation-First philosophy.
> **Rule**: Decisions are immutable once accepted. Superseding a decision requires a new ADR with status `Deprecated` applied to the original.

---

## ADR Template

```
### ADR-XXX: [Title]

| Field        | Value                          |
|--------------|--------------------------------|
| **ID**       | ADR-XXX                        |
| **Date**     | YYYY-MM-DD                     |
| **Status**   | Proposed / Accepted / Deprecated |
| **Deciders** | [Names or roles]               |

#### Context
[Describe the problem, constraint, or requirement that necessitates this decision.]

#### Decision
[State the decision clearly and unambiguously.]

#### Consequences
[List the implications, trade-offs, and any follow-up actions required.]

#### References
[Link to related documents, PRD sections, or external resources.]
```

---

## Decision Log

---

### ADR-001: Technology Stack Selection for MindFlow Phase 1

| Field        | Value                          |
|--------------|--------------------------------|
| **ID**       | ADR-001                        |
| **Date**     | 2026-01-12                     |
| **Status**   | Accepted                       |
| **Deciders** | Project Owner                  |

#### Context

MindFlow requires a technology stack that supports:
- Multi-tenant SaaS architecture with strict data isolation
- Microservices-based backend for modularity and independent scaling
- Modern, type-safe frontend for maintainability
- Containerized deployment for consistency across environments
- Security-first design with compliance readiness (India: IT Act, DPDP Act 2023)

The stack must be scoped for Phase 1 (Web-only) while allowing future extensibility.

#### Decision

Adopt the technology stack defined in `TECH_STACK.md`, which specifies:

**Backend:**
- Python 3.11+ with FastAPI
- PostgreSQL 16 with Row-Level Security (RLS)
- Redis 7 for caching and Celery task queue
- MinIO for S3-compatible file storage

**Frontend:**
- Next.js 14 with TypeScript 5.x
- Zustand for client state, TanStack React Query for server state
- Tailwind CSS, React Hook Form, Zod

**Infrastructure:**
- Kong API Gateway
- Docker + Docker Compose
- GitHub Actions for CI/CD

**Security Tooling:**
- Bandit (Python security scanning)
- Trivy (container scanning)
- Snyk or equivalent (dependency scanning)

#### Consequences

1. All services must be implemented using the specified stack. No deviations without a new ADR.
2. Mobile (React Native/Expo), AI/ML services, and offline-first capabilities are explicitly excluded from Phase 1.
3. Security scanning tools must be integrated into CI/CD pipelines before Phase 6 (Implementation).
4. Future phases may introduce additional technologies via new ADRs.

#### References

- [TECH_STACK.md](TECH_STACK.md)
- [Tech_stack_Overview.md](Tech_stack_Overview.md) (Reference source)
- [SDLC.md](SDLC.md) – Task 0.2

---

### ADR-002: Microservices Architecture Pattern

| Field        | Value                          |
|--------------|--------------------------------|
| **ID**       | ADR-002                        |
| **Date**     | 2026-01-12                     |
| **Status**   | Accepted                       |
| **Deciders** | Project Owner                  |

#### Context

MindFlow is a multi-module platform covering HR, tasks, mind maps, training, expenses, complaints, approvals, notifications, and file storage. The system must:
- Support independent development and deployment of modules
- Enforce strict tenant isolation
- Allow horizontal scaling of high-traffic services
- Enable clear ownership boundaries for each domain

A monolithic architecture would create tight coupling, complicate deployments, and hinder independent scaling.

#### Decision

Adopt a **microservices architecture** with the following characteristics:

1. **10 independent services** organized by business domain:
   - auth-service (8101)
   - hr-service (8102)
   - task-service (8103)
   - mindmap-service (8104)
   - training-service (8105)
   - expense-service (8106)
   - complaint-service (8107)
   - approval-service (8108)
   - notification-service (8109)
   - storage-service (8110)

2. **Communication patterns:**
   - Synchronous: REST API via Kong API Gateway
   - Asynchronous: Redis Pub/Sub and Celery for background tasks

3. **Data isolation:**
   - Each service owns its entities
   - Cross-service queries via API calls only (no shared database access)
   - Multi-tenancy enforced via `tenant_id` and PostgreSQL RLS

4. **API Gateway:**
   - Kong handles routing, authentication, and rate limiting
   - All external traffic enters through the gateway

#### Consequences

1. Each service must have clearly defined responsibility boundaries (SDLC Phase 1, Task 1.2).
2. Inter-service communication must be explicitly designed and documented.
3. Shared database access between services is prohibited.
4. Service-to-service authentication must be implemented for internal API calls.
5. Operational complexity increases; monitoring and observability are mandatory (Prometheus, ELK, Sentry).
6. Database schema design (Phase 2) must respect entity ownership per service.

#### References

- [TECH_STACK.md](TECH_STACK.md) – Section 1: Application Architecture
- [SDLC.md](SDLC.md) – Phase 1: System Architecture Design
- [PRD.md](PRD.md) – Module definitions

---

**END OF ADR LOG**
