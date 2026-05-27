# Agents — Architecture & Infrastructure

Covers: `aicodepath-architect`, `aicodepath-backend-architect`, `aicodepath-frontend-architect`, `aicodepath-mobile-architect`, `aicodepath-devops-architect`, `aicodepath-api-designer`, `aicodepath-database-architect`

All architecture agents are **read-only for code** — they design, they do not implement. They write to `aicodepath-docs/construction/{unit-name}/` directories only.

---

## aicodepath-architect

**File:** `.aicodepath/agents/aicodepath-architect.md`
**Description:** High-level technical direction, architecture pattern selection, system design. Reviews requirements, defines component boundaries and API contracts, creates design artifacts.

**Tools:** Read, Write, Glob, Grep (no Bash)

**Key capabilities:**
- Architecture pattern selection (monolith vs microservices, event-driven, DDD, CQRS)
- Communication pattern selection (sync/async, pub-sub, saga)
- Deployment pattern selection (K8s, PaaS, serverless)
- Resilience pattern selection (circuit breaker, bulkhead, retry)
- NFR analysis (Performance, Security, Reliability)

**Deliverables:**
- `aicodepath-docs/construction/{unit}/functional-design/system-design.md`
- `aicodepath-docs/inception/decisions/adr-YYYY-MM-DD-title.md`

**Guideline references:** `architecture-rules.json`
**Workflow rules:** `rules/construction/functional-design.md`, `rules/construction/nfr-design.md`

---

## aicodepath-backend-architect

**File:** `.aicodepath/agents/aicodepath-backend-architect.md`
**Description:** Design scalable, maintainable backend systems with well-defined service boundaries and API contracts.

**Tools:** Read, Glob, Grep, Write, Edit (no Bash)

**Key capabilities:**
- Service architecture (monolith vs microservices)
- API contract design (REST/GraphQL with OpenAPI)
- Database technology selection (SQL, NoSQL, vector DB)
- Message queue integration design
- Caching strategy (Redis, Memcached)
- Auth flows (JWT, OAuth)
- Observability design (logging, metrics, tracing)

**Deliverables:**
- `aicodepath-docs/construction/{unit}/functional-design/backend-architecture.md`
- OpenAPI specifications
- Service dependency documentation

**Guideline references:** `api-design-rules.json`, `architecture-rules.json`, `security-rules.json`

---

## aicodepath-frontend-architect

**File:** `.aicodepath/agents/aicodepath-frontend-architect.md`
**Description:** Use when building React, Vue, or UI components, designing component hierarchies, managing frontend state, or reviewing CSS/TypeScript — enforces component design patterns and performance best practices.

**Tools:** Read, Glob, Grep, Write, Edit (no Bash)

**Key capabilities:**
- Framework selection (React, Vue, Angular)
- Component hierarchy and composition patterns
- State management strategy (Redux, MobX, Zustand, Pinia, Context API)
- Routing structure and navigation flows
- Code splitting and lazy loading
- Performance optimization (memoization, virtualization)
- API integration patterns (REST, GraphQL, WebSockets)
- Styling approach (CSS Modules, Tailwind, Styled Components)
- Accessibility (a11y), Web Vitals (LCP, FID, CLS)

**Deliverables:**
- `aicodepath-docs/construction/{unit}/functional-design/frontend-architecture.md`
- Component tree with data flow diagrams
- State management architecture spec

**Guideline references:** `architecture-rules.json`, `coding-standards.json`

---

## aicodepath-mobile-architect

**File:** `.aicodepath/agents/aicodepath-mobile-architect.md`
**Description:** Design scalable, performant mobile applications with platform-appropriate architecture, offline capabilities, and optimized user experiences across iOS, Android, and cross-platform frameworks.

**Key capabilities:**
- Platform selection (iOS native, Android native, React Native, Flutter)
- Offline-first architecture
- State management for mobile (MobX-State-Tree, Redux, Riverpod)
- Platform-specific UX patterns (navigation, gestures)
- Push notification and background sync architecture
- App performance optimization (bundle size, startup time)

**Deliverables:**
- `aicodepath-docs/construction/{unit}/functional-design/mobile-architecture.md`

**Guideline references:** `mobile-design-rules.json`, `architecture-rules.json`

---

## aicodepath-devops-architect

**File:** `.aicodepath/agents/aicodepath-devops-architect.md`
**Description:** Design robust CI/CD pipelines, container orchestration, and infrastructure automation.

**Key capabilities:**
- CI/CD pipeline design (GitHub Actions, Cloud Build, Jenkins)
- Container orchestration (Kubernetes, Docker Compose)
- Infrastructure as Code (Terraform, Pulumi)
- Secret management (Vault, Secret Manager, SSM)
- Environment strategy (dev/staging/prod isolation)
- Monitoring and alerting design

**Deliverables:**
- `aicodepath-docs/construction/{unit}/cicd-design/`
- `aicodepath-docs/construction/{unit}/infrastructure-design/`

**Guideline references:** `devops-rules.json`, `observability-rules.json`

---

## aicodepath-api-designer

**File:** `.aicodepath/agents/aicodepath-api-designer.md`
**Description:** Design well-structured, versioned APIs with clear contracts, consistent error handling, and backward compatibility.

**Key capabilities:**
- REST API design with proper HTTP semantics
- GraphQL schema design
- API versioning strategies (URL vs header)
- Error response standardization (RFC 7807 Problem Details)
- Pagination patterns (cursor-based, offset, keyset)
- Rate limiting and throttling design
- OpenAPI/Swagger specification authoring
- Backward compatibility guarantees

**Guideline references:** `api-design-rules.json`

---

## aicodepath-database-architect

**File:** `.aicodepath/agents/aicodepath-database-architect.md`
**Description:** Design efficient, scalable database schemas with proper data modeling and integrity constraints.

**Key capabilities:**
- Relational schema design (normalization, indexes, constraints)
- NoSQL data modeling (document, key-value, graph)
- Vector database design for ML/AI features
- Migration strategy and rollback planning
- Query optimization and index design
- Data partitioning and sharding strategies

**Deliverables:**
- `aicodepath-docs/construction/{unit}/database-design/`
- SQL migration files with rollback scripts

**Guideline references:** `data-modeling-rules.json`, `database-operations-rules.json`
