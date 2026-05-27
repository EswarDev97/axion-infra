# Docker Design (Per-Unit)

**Purpose**: Design containerization strategy with multi-stage builds, environment-specific optimizations, security hardening, and registry management

**Execute IF**:
- Application will be containerized
- Docker/container deployment required
- Local development with containers needed
- Registry management required
- Kubernetes deployment planned

**Skip IF**:
- Serverless-only deployment (Lambda, Cloud Functions)
- No containerization planned
- Docker configuration already exists and unchanged

## Prerequisites
- Infrastructure Design complete (deployment targets known)
- Environment Strategy complete (environments defined)
- NFR Requirements complete (resource constraints known)

---

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load `aicodepath-docs/construction/environment-strategy/` artifacts
- Load `aicodepath-docs/construction/{unit-name}/infrastructure-design/`
- Load `aicodepath-docs/construction/{unit-name}/nfr-requirements/`
- Load `aicodepath-docs/inception/tech-stack-decisions.md`

### 1.2 Gather Container Requirements

Create `aicodepath-docs/construction/{unit-name}/docker-design/docker-questions.md`:

```markdown
# Docker Design Questions: [Unit Name]

## Question 1: Target Runtime Environment
What is the target runtime environment?

A) **Kubernetes** (EKS/GKE/AKS/OpenShift)
B) **Container orchestration** (ECS, Cloud Run, Azure Container Apps)
C) **Docker Compose** (local/simple deployments)
D) **Hybrid** (K8s for prod, Compose for dev)
E) **Other** (describe below)

[Answer]:

---

## Question 2: Base Image Strategy
What base image strategy is preferred?

A) **Distroless** (minimal, secure, Google-recommended for production)
   - Pros: Smallest attack surface, no shell, ~10-50MB
   - Cons: Hard to debug, limited tooling

B) **Alpine** (small, lightweight, musl libc)
   - Pros: Small (~5MB base), includes shell, package manager
   - Cons: musl compatibility issues, some native deps fail

C) **Debian Slim** (compatible, small)
   - Pros: Full glibc compatibility, well-tested
   - Cons: Larger (~80MB base)

D) **Official Language Images** (node:20-slim, python:3.11-slim)
   - Pros: Maintained by language teams, includes tooling
   - Cons: Larger, may include unnecessary packages

[Answer]:

---

## Question 3: Security Scanning Requirements
What security scanning is required?

A) **Full** (Trivy + Snyk + SBOM generation)
B) **Standard** (Trivy vulnerability scanning)
C) **Minimal** (base image CVE check only)
D) **None** (internal use only)

[Answer]:

---

## Question 4: Multi-Architecture Support
Is multi-architecture support needed?

A) **Yes** (amd64 + arm64 for M1/M2 Macs and ARM servers)
B) **AMD64 only** (x86_64)
C) **ARM64 only** (Apple Silicon, Graviton)

[Answer]:

---

## Question 5: Image Size Target
What is the target image size?

A) **Minimal** (< 50MB production)
B) **Standard** (< 100MB production)
C) **Acceptable** (< 200MB production)
D) **No constraint**

[Answer]:
```

---

## Step 2: Create Multi-Stage Build Design

Create `aicodepath-docs/construction/{unit-name}/docker-design/dockerfile-design.md`:

```markdown
# Dockerfile Design: [Unit Name]

## Build Strategy

### Multi-Stage Build Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Stage 1: DEPS                                │
│  - Install production dependencies only                          │
│  - npm ci --only=production                                      │
│  - Output: node_modules (prod only)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Stage 2: BUILDER                             │
│  - Install all dependencies (including dev)                      │
│  - Build/compile application                                     │
│  - Output: dist/, build/ artifacts                               │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PRODUCTION    │  │    STAGING      │  │   DEVELOPMENT   │
│   distroless    │  │     alpine      │  │    full node    │
│   < 100MB       │  │    < 150MB      │  │    < 500MB      │
│   no shell      │  │    with shell   │  │    hot reload   │
│   non-root      │  │    debug tools  │  │    dev tools    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Dockerfile Template

### Node.js/TypeScript

```dockerfile
# syntax=docker/dockerfile:1.4

# ==============================================================================
# Stage 1: Dependencies (production only)
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies after build
RUN npm prune --production

# ==============================================================================
# Stage 3: Production (Distroless)
# ==============================================================================
FROM gcr.io/distroless/nodejs20-debian12 AS production

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root user (distroless has nonroot user built-in)
USER nonroot:nonroot

# Expose port
EXPOSE 3000

# Health check not available in distroless - handled by K8s probes

# Start application
CMD ["dist/main.js"]

# ==============================================================================
# Stage 4: Staging (Alpine with debug capabilities)
# ==============================================================================
FROM node:20-alpine AS staging
WORKDIR /app

# Install debugging tools
RUN apk add --no-cache curl wget

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set environment
ENV NODE_ENV=staging
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]

# ==============================================================================
# Stage 5: Development (Full tooling)
# ==============================================================================
FROM node:20-alpine AS development
WORKDIR /app

# Install development tools
RUN apk add --no-cache curl wget git

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=development
ENV PORT=3000

# Expose port and debug port
EXPOSE 3000 9229

# Use nodemon for hot reload
CMD ["npm", "run", "dev"]
```

### Python/FastAPI

```dockerfile
# syntax=docker/dockerfile:1.4

# ==============================================================================
# Stage 1: Builder
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==============================================================================
# Stage 2: Production
# ==============================================================================
FROM python:3.11-slim AS production

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY ./app ./app

# Create non-root user
RUN useradd -r -u 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ==============================================================================
# Stage 3: Development
# ==============================================================================
FROM python:3.11-slim AS development

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dev dependencies
RUN pip install --no-cache-dir pytest pytest-cov httpx

COPY . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

## Environment-Specific Targets

| Target | Base Image | Use Case | Size Target | Features |
|--------|------------|----------|-------------|----------|
| `production` | distroless | Production deployment | < 100MB | No shell, minimal surface |
| `staging` | alpine | Pre-prod testing | < 150MB | Shell, curl for debugging |
| `development` | full | Local development | < 500MB | Hot reload, all tools |
```

---

## Step 3: Create Docker Compose Configuration

Create `aicodepath-docs/construction/{unit-name}/docker-design/docker-compose-design.md`:

```markdown
# Docker Compose Design: [Unit Name]

## Local Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ==========================================================================
  # Application Service
  # ==========================================================================
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: ${PROJECT_NAME:-myapp}-api
    volumes:
      - .:/app
      - /app/node_modules  # Prevent overwriting node_modules
    ports:
      - "${API_PORT:-3000}:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:postgres@db:5432/${DB_NAME:-myapp_dev}
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=debug
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    restart: unless-stopped

  # ==========================================================================
  # Database Service
  # ==========================================================================
  db:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME:-myapp}-db
    environment:
      POSTGRES_DB: ${DB_NAME:-myapp_dev}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-myapp_dev}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: unless-stopped

  # ==========================================================================
  # Redis Service
  # ==========================================================================
  redis:
    image: redis:7-alpine
    container_name: ${PROJECT_NAME:-myapp}-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: unless-stopped

  # ==========================================================================
  # Optional: Monitoring Stack
  # ==========================================================================
  prometheus:
    image: prom/prometheus:latest
    container_name: ${PROJECT_NAME:-myapp}-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"
    networks:
      - app-network
    profiles:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: ${PROJECT_NAME:-myapp}-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - app-network
    profiles:
      - monitoring

volumes:
  postgres_data:
  redis_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

## Testing Environment

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  app-test:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgres://postgres:postgres@db-test:5432/myapp_test
    depends_on:
      db-test:
        condition: service_healthy
    command: npm run test:ci

  db-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 2s
      retries: 5
    tmpfs:
      - /var/lib/postgresql/data  # Use tmpfs for faster tests
```

## Usage Commands

```bash
# Start development environment
docker compose up -d

# Start with monitoring stack
docker compose --profile monitoring up -d

# Run tests
docker compose -f docker-compose.test.yml up --abort-on-container-exit

# Build production image
docker build --target production -t myapp:latest .

# Build with build arguments
docker build --target production \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t myapp:latest .

# Run production image locally
docker run -p 3000:3000 --env-file .env.production myapp:latest
```
```

---

## Step 4: Create Image Optimization Guidelines

Create `aicodepath-docs/construction/{unit-name}/docker-design/image-optimization.md`:

```markdown
# Image Optimization Guidelines: [Unit Name]

## Optimization Checklist

### Build Optimization
- [ ] Use multi-stage builds (separate build and runtime)
- [ ] Use `.dockerignore` to exclude unnecessary files
- [ ] Order layers by change frequency (dependencies first)
- [ ] Combine RUN commands with `&&` to reduce layers
- [ ] Use `--no-cache` and clean package manager caches
- [ ] Remove build tools in final stage

### Security Optimization
- [ ] Use specific version tags, not `:latest`
- [ ] Run as non-root user (`USER nonroot` or `USER 1000`)
- [ ] Use read-only filesystem where possible
- [ ] Scan for vulnerabilities with Trivy
- [ ] Use distroless or minimal base images for production
- [ ] Don't store secrets in images

### Runtime Optimization
- [ ] Set appropriate `HEALTHCHECK`
- [ ] Use `tini` or similar init system for signal handling
- [ ] Set resource limits in orchestration
- [ ] Configure graceful shutdown handling

## .dockerignore Template

```
# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Build outputs
dist
build
coverage
.nyc_output

# Git
.git
.gitignore

# IDE
.vscode
.idea
*.swp
*.swo

# Environment files (secrets)
.env
.env.*
!.env.example

# Documentation
*.md
docs
LICENSE

# Docker
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github
.gitlab-ci.yml
Jenkinsfile

# Tests
__tests__
*.test.ts
*.test.js
*.spec.ts
*.spec.js
jest.config.js
cypress

# Misc
*.log
tmp
temp
.DS_Store
```

## Layer Optimization Techniques

### Before (Inefficient)
```dockerfile
# Bad: Many layers, no caching benefit
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y wget
RUN rm -rf /var/lib/apt/lists/*
```

### After (Optimized)
```dockerfile
# Good: Single layer, with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        wget && \
    rm -rf /var/lib/apt/lists/*
```

## Size Comparison Matrix

| Stage | Base Image | Estimated Size |
|-------|------------|----------------|
| Builder | node:20-alpine | ~400MB |
| Production (distroless) | gcr.io/distroless/nodejs20 | ~80-100MB |
| Production (alpine) | node:20-alpine | ~150-180MB |
| Staging | node:20-alpine + tools | ~200MB |
| Development | node:20 | ~400-500MB |

## Security Scanning

### Trivy Scan Command
```bash
# Scan built image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity CRITICAL,HIGH myapp:latest

# Generate SBOM
trivy image --format spdx-json -o sbom.json myapp:latest

# Exit with error if vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

### GitHub Actions Integration
```yaml
- name: Build and scan
  run: |
    docker build -t myapp:${{ github.sha }} .
    trivy image --exit-code 1 --severity CRITICAL,HIGH myapp:${{ github.sha }}
```
```

---

## Step 5: Create Registry Management Design

Create `aicodepath-docs/construction/{unit-name}/docker-design/registry-management.md`:

```markdown
# Registry Management: [Unit Name]

## Registry Configuration

### Harbor Registry (Open Source - Recommended)

| Environment | Registry URL | Purpose |
|-------------|--------------|---------|
| Development | harbor.local/{project} | Local development |
| Staging | harbor.company.com/{project} | Pre-production |
| Production | harbor.company.com/{project} | Production |

## Image Naming Convention

```
{registry}/{project}/{service}:{tag}

Components:
- registry: Harbor host (harbor.company.com)
- project: Organization/team name (myapp)
- service: Service name (api, web, worker)
- tag: Version identifier

Examples:
harbor.company.com/myapp/api:v1.2.3
harbor.company.com/myapp/api:main-abc1234
harbor.company.com/myapp/api:pr-123-def5678
```

## Tagging Strategy

| Tag Pattern | When Used | Mutable | Retention |
|-------------|-----------|---------|-----------|
| `v{semver}` (v1.2.3) | Release | No | Forever |
| `{branch}-{sha}` (main-abc1234) | CI builds | Yes | 30 days |
| `pr-{num}-{sha}` (pr-123-def) | PR builds | Yes | 7 days |
| `latest` | Latest main build | Yes | N/A |

## CI/CD Tagging Example

```yaml
# GitHub Actions
- name: Docker meta
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: harbor.company.com/myapp/api
    tags: |
      # Semantic versioning from git tag
      type=semver,pattern={{version}}
      type=semver,pattern={{major}}.{{minor}}
      # Branch name + short SHA
      type=ref,event=branch,suffix=-{{sha}}
      # PR number + short SHA
      type=ref,event=pr,prefix=pr-,suffix=-{{sha}}
      # Latest for main branch
      type=raw,value=latest,enable={{is_default_branch}}

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ steps.meta.outputs.tags }}
```

## Retention Policy

### Harbor Project Configuration
```yaml
# Harbor retention policy
retention:
  rules:
    - tag: "v*"
      action: retain
      count: unlimited
    - tag: "main-*"
      action: retain
      count: 10
    - tag: "pr-*"
      action: retain
      days: 7
    - tag: "*"
      action: delete
      days: 30
```

## Image Scanning Integration

### Pre-push Scanning
```bash
# Scan before pushing
trivy image --exit-code 1 --severity CRITICAL harbor.company.com/myapp/api:v1.2.3

# If successful, push
docker push harbor.company.com/myapp/api:v1.2.3
```

### Harbor Automatic Scanning
- Enable "Automatically scan images on push" in Harbor project settings
- Configure vulnerability severity thresholds
- Block deployment of images with critical vulnerabilities
```

---

## Step 6: Update Progress

- Mark Docker design complete in aicodepath-state.md
- Log decisions in audit.md with timestamp
- Update implementation-status.json

---

## Step 7: Present Completion Message

```markdown
# Docker Design Complete: [Unit Name]

Docker design has defined:
- **Build Stages**: [X] stages (deps, builder, production, staging, development)
- **Environment Targets**: dev / staging / prod
- **Base Image**: [distroless/alpine/slim]
- **Production Size**: ~[X] MB
- **Registry**: Harbor with retention policies

Key Artifacts Created:
- `dockerfile-design.md` - Multi-stage Dockerfile templates
- `docker-compose-design.md` - Local development configuration
- `image-optimization.md` - Size and security optimization
- `registry-management.md` - Tagging and retention policies

> **REVIEW REQUIRED:**
> Please examine the Docker design at: `aicodepath-docs/construction/{unit-name}/docker-design/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to Docker design
> **Continue to Next Stage** - Proceed to **Kubernetes Design**
```

---

## Step 8: Wait for Explicit Approval
- User must choose between "Request Changes" or "Continue to Next Stage"
- Log user's response in audit.md

---

## References

- Environment Strategy: `rules/construction/environment-strategy.md`
- Infrastructure Design: `rules/construction/infrastructure-design.md`
- Kubernetes Design: `rules/construction/kubernetes-design.md`
- CI/CD Design: `rules/construction/cicd-design.md`
- DevOps Guidelines: `guidelines/devops-rules.json`
