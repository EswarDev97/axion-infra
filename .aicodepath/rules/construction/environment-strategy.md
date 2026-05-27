# Environment Strategy

**Purpose**: Define repository structure, branching strategy, environment promotion workflow, and configuration management for multi-environment deployments

**Execute IF**:
- Multi-environment deployment required (dev/staging/prod)
- Repository strategy needs definition
- Branch workflow needs standardization
- Configuration management strategy needed
- GitOps implementation planned

**Skip IF**:
- Single environment only (local development)
- Environment strategy already defined and unchanged
- Simple prototype/POC with no deployment requirements

## Prerequisites
- Requirements Analysis complete
- Application Design complete (component boundaries known)
- Infrastructure preferences documented

---

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load `aicodepath-docs/inception/requirements/functional-requirements.md`
- Load `aicodepath-docs/inception/application-design.md`
- Load `aicodepath-docs/inception/infrastructure-preferences.md`
- Load existing repository structure (if brownfield project)

### 1.2 Gather Environment Requirements

Create `aicodepath-docs/construction/environment-strategy/environment-questions.md`:

```markdown
# Environment Strategy Questions

## Question 1: Repository Strategy
What is the repository strategy for this project?

A) **Monorepo** (all services in one repository)
   - Benefits: Atomic commits, easier refactoring, shared tooling
   - Challenges: Build times, access control, complexity at scale
   - Best for: Small-medium teams, tightly coupled services

B) **Multi-repo** (separate repository per service)
   - Benefits: Clear ownership, independent deployments, simpler CI per repo
   - Challenges: Cross-repo changes, version management, dependency hell
   - Best for: Large organizations, independent teams, microservices

C) **Monorepo + GitOps Repo** (application code + separate K8s manifests)
   - Benefits: Security separation, clear deployment audit trail
   - Challenges: Two repos to manage, sync complexity
   - Best for: Enterprise teams, strict security requirements

D) **Already established** (describe current structure)

[Answer]:

---

## Question 2: Branching Strategy
What branching strategy is preferred?

A) **Trunk-Based Development** (short-lived branches, frequent merges to main)
   - Best for: CI/CD maturity, small teams, fast iteration
   - Requires: Feature flags for incomplete work, high test coverage

B) **GitFlow** (develop, release, hotfix branches)
   - Best for: Scheduled releases, multiple versions in production
   - Requires: Release management discipline, longer release cycles

C) **GitHub Flow** (main + feature branches only)
   - Best for: Continuous deployment, simple workflow
   - Requires: Automated testing, quick PR reviews

D) **GitLab Flow** (environment branches: main → staging → production)
   - Best for: Multiple environments with different stability requirements
   - Requires: Clear promotion criteria

[Answer]:

---

## Question 3: Environments Required
What environments are required?

A) **Standard** (development, staging, production)
B) **Extended** (development, QA, staging, production)
C) **With Preview** (development, PR previews, staging, production)
D) **Minimal** (development, production only)
E) **Custom** (describe below)

[Answer]:

---

## Question 4: Feature Flags
How should feature flags be managed?

A) **Unleash** (open source, self-hosted, full-featured)
B) **LaunchDarkly** (enterprise SaaS, advanced targeting)
C) **Environment Variables** (simple, no runtime toggle)
D) **Database-backed** (custom implementation)
E) **Not needed** (all features deployed together)

[Answer]:

---

## Question 5: Configuration Management
How should environment-specific configuration be managed?

A) **ConfigMaps + Secrets** (K8s native, simple)
B) **External Secrets Operator** (sync from AWS/GCP/Vault)
C) **Sealed Secrets** (GitOps-friendly encrypted secrets)
D) **HashiCorp Vault** (full secrets management platform)
E) **Environment variables only** (simple, container-based)

[Answer]:
```

---

## Step 2: Create Repository Strategy

Create `aicodepath-docs/construction/environment-strategy/repository-strategy.md`:

### 2.1 Pattern A: Monorepo with Environment Overlays

```markdown
# Repository Strategy: Monorepo

## Directory Structure

```
myapp/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # PR checks
│       ├── cd-dev.yml                # Deploy to dev
│       ├── cd-staging.yml            # Deploy to staging
│       └── cd-prod.yml               # Deploy to prod
├── apps/                             # Application code
│   ├── api/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── worker/
│       ├── src/
│       └── package.json
├── packages/                         # Shared libraries
│   ├── shared/
│   │   ├── src/
│   │   └── package.json
│   ├── database/
│   │   ├── prisma/
│   │   └── package.json
│   └── config/
│       └── package.json
├── k8s/                              # Kubernetes manifests
│   ├── base/                         # Common manifests
│   │   ├── api/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── hpa.yaml
│   │   └── web/
│   │       └── ...
│   └── overlays/                     # Environment-specific
│       ├── dev/
│       │   ├── kustomization.yaml
│       │   └── patch-replicas.yaml
│       ├── staging/
│       │   ├── kustomization.yaml
│       │   └── patch-resources.yaml
│       └── prod/
│           ├── kustomization.yaml
│           ├── patch-replicas.yaml
│           └── patch-resources.yaml
├── docker/                           # Docker configurations
│   └── docker-compose.yml            # Local development
├── scripts/                          # Utility scripts
│   ├── setup.sh
│   └── deploy.sh
├── package.json                      # Root package.json
├── turbo.json                        # Turborepo config (or nx.json)
└── pnpm-workspace.yaml               # Workspace definition
```

## Kustomization Example

```yaml
# k8s/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: myapp-dev

resources:
  - ../../base/api
  - ../../base/web

commonLabels:
  environment: development

patches:
  - patch-replicas.yaml
  - patch-resources.yaml

configMapGenerator:
  - name: api-config
    literals:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - API_BASE_URL=https://api-dev.company.com
```

## Change Detection (Turborepo)

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "deploy": {
      "dependsOn": ["build", "test"],
      "cache": false
    }
  }
}
```
```

### 2.2 Pattern B: App Repo + GitOps Repo

```markdown
# Repository Strategy: App Repo + GitOps Repo

## Application Repository (myapp)

```
myapp/
├── .github/
│   └── workflows/
│       └── ci.yml                    # Build, test, push image
├── src/
│   └── ...
├── Dockerfile
├── package.json
└── README.md
```

## GitOps Repository (myapp-gitops)

```
myapp-gitops/
├── apps/
│   ├── api/
│   │   ├── base/
│   │   │   ├── kustomization.yaml
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── networkpolicy.yaml
│   │   └── overlays/
│   │       ├── dev/
│   │       │   ├── kustomization.yaml
│   │       │   └── values.yaml
│   │       ├── staging/
│   │       │   └── ...
│   │       └── prod/
│   │           └── ...
│   └── web/
│       └── ...
├── infrastructure/
│   ├── argocd/
│   │   └── applications/
│   │       ├── api-dev.yaml
│   │       ├── api-staging.yaml
│   │       └── api-prod.yaml
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/
├── applicationsets/
│   └── myapp.yaml                    # ArgoCD ApplicationSet
└── README.md
```

## ArgoCD ApplicationSet

```yaml
# applicationsets/myapp.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: dev
            namespace: myapp-dev
            cluster: https://kubernetes.default.svc
            syncPolicy: automated
          - environment: staging
            namespace: myapp-staging
            cluster: https://kubernetes.default.svc
            syncPolicy: automated
          - environment: prod
            namespace: myapp-prod
            cluster: https://kubernetes.default.svc
            syncPolicy: manual
  template:
    metadata:
      name: 'myapp-api-{{environment}}'
      namespace: argocd
    spec:
      project: default
      source:
        repoURL: https://github.com/company/myapp-gitops
        targetRevision: HEAD
        path: 'apps/api/overlays/{{environment}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: '{{#eq syncPolicy "automated"}}true{{/eq}}'
          selfHeal: '{{#eq syncPolicy "automated"}}true{{/eq}}'
```
```

---

## Step 3: Create Branching Strategy

Create `aicodepath-docs/construction/environment-strategy/branching-strategy.md`:

```markdown
# Branching Strategy

## Recommended: Trunk-Based Development

```
main (production-ready)
│
├── feature/PROJ-123-user-auth
│   └── (max 2 days lifespan)
│
├── feature/PROJ-124-payment-flow
│   └── (use feature flags for incomplete work)
│
├── fix/PROJ-125-login-bug
│   └── (max 1 day lifespan)
│
└── release/v1.2.0
    └── (only for production hotfixes)
```

### Branch Rules

| Branch Pattern | Purpose | Lifespan | Protection |
|----------------|---------|----------|------------|
| `main` | Production-ready code | Permanent | Protected, requires PR |
| `feature/*` | New features | < 2 days | - |
| `fix/*` | Bug fixes | < 1 day | - |
| `hotfix/*` | Production fixes | < 4 hours | Fast-track review |
| `release/v*` | Release preparation | Until merged | Protected |

### Branch Naming Convention

```
{type}/{ticket-id}-{short-description}

Types:
- feature/ - New features
- fix/ - Bug fixes
- hotfix/ - Urgent production fixes
- refactor/ - Code refactoring
- docs/ - Documentation
- chore/ - Maintenance tasks
- test/ - Test additions

Examples:
- feature/PROJ-123-user-authentication
- fix/PROJ-456-login-validation-error
- hotfix/PROJ-789-security-patch
- refactor/PROJ-012-database-queries
```

### Commit Message Convention (Conventional Commits)

```
{type}({scope}): {description}

[optional body]

[optional footer]
```

| Type | Version Bump | Description |
|------|--------------|-------------|
| `feat` | MINOR | New feature |
| `fix` | PATCH | Bug fix |
| `feat!` or `BREAKING CHANGE` | MAJOR | Breaking change |
| `docs` | - | Documentation |
| `chore` | - | Maintenance |
| `refactor` | - | Code refactoring |
| `test` | - | Test changes |
| `perf` | PATCH | Performance improvement |

### Examples

```bash
# Feature
feat(auth): add OAuth2 login support

# Bug fix
fix(api): resolve race condition in user creation

# Breaking change
feat(api)!: change authentication response format

BREAKING CHANGE: The /auth/login endpoint now returns
{ token, user } instead of just the token string.

# Maintenance
chore(deps): update dependencies to latest versions
```

## Alternative: GitFlow

```
main ──────────────────────────────────────────────►
  │                                    ▲
  │                                    │ (merge)
  ▼                                    │
develop ──────┬─────────┬─────────────┤
              │         │             │
              │         ▼             │
              │    release/1.2.0 ─────┘
              │         │
              ▼         │
    feature/auth        │
              │         │
              └─────────┘
                (merge)
```

Use GitFlow when:
- Multiple versions in production
- Scheduled release cycles
- Separate release management team
```

---

## Step 4: Create Promotion Workflow

Create `aicodepath-docs/construction/environment-strategy/promotion-workflow.md`:

```markdown
# Environment Promotion Workflow

## Promotion Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                                   │
│  Trigger: Push to main                                              │
│  Actions: Build → Test → Push Image → Deploy → Smoke Test           │
│  Approval: Automatic                                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼ (Tag v*.*.* OR Manual)
┌─────────────────────────────────────────────────────────────────────┐
│                         STAGING                                      │
│  Trigger: Git tag OR manual dispatch                                │
│  Actions: Deploy → Integration Tests → E2E Tests → Performance      │
│  Approval: Automatic (with test gates)                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼ (Manual Approval Required)
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                    │
│  Trigger: Manual approval + deployment window                       │
│  Actions: Deploy (Blue-Green/Canary) → Validation → Monitor         │
│  Approval: Required reviewers + wait timer                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Promotion Matrix

| From | To | Trigger | Quality Gates | Rollback Strategy |
|------|----|---------| --------------|-------------------|
| PR | Development | Auto (merge) | Unit tests, lint, security scan | Revert commit |
| Development | Staging | Tag / Manual | Integration tests, coverage > 80% | Previous image |
| Staging | Production | Manual approval | E2E tests, performance baseline | Blue-green swap |

## Quality Gates

### Development Gate
- [ ] All unit tests passing
- [ ] Lint checks passing
- [ ] Security scan (no critical/high CVEs)
- [ ] Build successful
- [ ] Code coverage > 80%

### Staging Gate
- [ ] All development gates passed
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance within baseline (< 10% regression)
- [ ] No new security vulnerabilities

### Production Gate
- [ ] All staging gates passed
- [ ] Change request approved
- [ ] Deployment window confirmed
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Monitoring dashboards ready

## GitHub Environment Configuration

```yaml
# Development Environment
name: development
url: https://api-dev.company.com
protection_rules: []

# Staging Environment
name: staging
url: https://api-staging.company.com
protection_rules:
  - required_reviewers:
      - team-leads

# Production Environment
name: production
url: https://api.company.com
protection_rules:
  - required_reviewers:
      - release-managers
      - security-team
  - wait_timer: 30  # minutes
```

## Version Tagging Strategy

```bash
# Semantic Versioning
MAJOR.MINOR.PATCH

# Tag format
v{MAJOR}.{MINOR}.{PATCH}

# Examples
v1.0.0    # Initial release
v1.1.0    # New feature (minor)
v1.1.1    # Bug fix (patch)
v2.0.0    # Breaking change (major)

# Pre-release tags
v1.2.0-alpha.1
v1.2.0-beta.1
v1.2.0-rc.1
```

## Automated Versioning (semantic-release)

```yaml
# .releaserc.yml
branches:
  - main
  - name: staging
    prerelease: beta
plugins:
  - "@semantic-release/commit-analyzer"
  - "@semantic-release/release-notes-generator"
  - "@semantic-release/changelog"
  - "@semantic-release/github"
```
```

---

## Step 5: Create Feature Flags Strategy

Create `aicodepath-docs/construction/environment-strategy/feature-flags.md`:

```markdown
# Feature Flags Strategy

## Recommended: Unleash (Open Source)

### Flag Categories

| Category | Example | Scope | Lifetime | Use Case |
|----------|---------|-------|----------|----------|
| Release | `new_checkout_flow` | Global | Temporary | Hide incomplete features |
| Ops | `enable_redis_cache` | Per-env | Permanent | Runtime toggles |
| Experiment | `pricing_variant_a` | Percentage | Temporary | A/B testing |
| Permission | `admin_analytics` | User-based | Permanent | Feature access control |
| Kill Switch | `disable_external_api` | Global | Permanent | Emergency off-switch |

### Naming Convention

```
{category}_{feature}_{variant}

Examples:
- release_new_checkout
- ops_redis_cache_enabled
- exp_pricing_variant_a
- perm_admin_dashboard
- kill_payment_gateway
```

### Implementation Pattern

```typescript
// Feature flag service
interface FeatureFlagService {
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>;
  getVariant(flag: string, context?: FlagContext): Promise<string>;
}

interface FlagContext {
  userId?: string;
  environment?: string;
  properties?: Record<string, string>;
}

// Usage in application code
async function processCheckout(cart: Cart, userId: string) {
  const useNewFlow = await featureFlags.isEnabled('release_new_checkout', {
    userId,
    environment: process.env.NODE_ENV
  });

  if (useNewFlow) {
    return newCheckoutFlow(cart);
  }
  return legacyCheckoutFlow(cart);
}
```

### Environment-Specific Flags

| Flag | Development | Staging | Production |
|------|-------------|---------|------------|
| `release_new_checkout` | ON | ON | OFF (10% rollout) |
| `ops_debug_logging` | ON | ON | OFF |
| `exp_pricing_test` | OFF | ON (50%) | OFF |

### Unleash Setup

```yaml
# docker-compose.yml (for local development)
services:
  unleash:
    image: unleashorg/unleash-server:latest
    environment:
      DATABASE_URL: postgres://unleash:unleash@db:5432/unleash
      UNLEASH_URL: http://localhost:4242
    ports:
      - "4242:4242"
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: unleash
      POSTGRES_USER: unleash
      POSTGRES_PASSWORD: unleash
```

### Flag Lifecycle

```
1. CREATE  → Flag created, OFF everywhere
2. DEVELOP → Flag ON in development
3. TEST    → Flag ON in staging (partial rollout)
4. RELEASE → Flag ON in production (gradual rollout)
5. CLEANUP → Flag removed, code cleaned up
```
```

---

## Step 6: Create Configuration Management

Create `aicodepath-docs/construction/environment-strategy/configuration-management.md`:

```markdown
# Configuration Management

## Configuration Hierarchy

```
1. Default values (code)         ← Lowest priority
2. Environment variables
3. ConfigMaps
4. Secrets (encrypted)
5. Feature flags (runtime)       ← Highest priority
```

## Configuration Categories

| Category | Storage | Sensitive | Example |
|----------|---------|-----------|---------|
| Application | ConfigMap | No | LOG_LEVEL, API_TIMEOUT |
| Infrastructure | ConfigMap | No | DATABASE_POOL_SIZE, CACHE_TTL |
| Secrets | K8s Secret / External Secrets | Yes | DATABASE_URL, API_KEYS |
| Feature Config | Feature Flags | No | ENABLE_NEW_FEATURE |

## Environment-Specific Values

```yaml
# config/base.yaml (defaults - committed)
server:
  port: 3000
  timeout: 30000
logging:
  level: info
  format: json
database:
  pool:
    min: 2
    max: 10
cache:
  ttl: 300
  prefix: myapp

# config/development.yaml (committed)
logging:
  level: debug
database:
  pool:
    min: 1
    max: 5

# config/staging.yaml (committed)
database:
  pool:
    min: 5
    max: 15

# config/production.yaml (committed)
logging:
  level: warn
database:
  pool:
    min: 10
    max: 50
cache:
  ttl: 600
```

## Secrets Management

```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: myapp-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: myapp-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: production/myapp/database
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: production/myapp/auth
        property: jwt_secret
    - secretKey: STRIPE_API_KEY
      remoteRef:
        key: production/myapp/payment
        property: stripe_key
```

## Configuration Loader Pattern

```typescript
// config/loader.ts
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

interface Config {
  server: { port: number; timeout: number };
  logging: { level: string; format: string };
  database: { pool: { min: number; max: number } };
  cache: { ttl: number; prefix: string };
}

function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';
  const configDir = path.join(__dirname, '..', 'config');

  // Load base config
  const baseConfig = yaml.load(
    fs.readFileSync(path.join(configDir, 'base.yaml'), 'utf8')
  ) as Config;

  // Load environment-specific config
  const envConfigPath = path.join(configDir, `${env}.yaml`);
  let envConfig = {};
  if (fs.existsSync(envConfigPath)) {
    envConfig = yaml.load(fs.readFileSync(envConfigPath, 'utf8')) || {};
  }

  // Deep merge configs
  return deepMerge(baseConfig, envConfig);
}

// Environment variable overrides
function applyEnvOverrides(config: Config): Config {
  if (process.env.LOG_LEVEL) {
    config.logging.level = process.env.LOG_LEVEL;
  }
  if (process.env.DATABASE_POOL_MAX) {
    config.database.pool.max = parseInt(process.env.DATABASE_POOL_MAX);
  }
  return config;
}

export const config = applyEnvOverrides(loadConfig());
```

## Required Environment Variables

| Variable | Development | Staging | Production | Source |
|----------|-------------|---------|------------|--------|
| NODE_ENV | development | staging | production | ConfigMap |
| DATABASE_URL | local postgres | RDS staging | RDS prod | Secret |
| JWT_SECRET | dev-secret | random | random | Secret |
| LOG_LEVEL | debug | info | warn | ConfigMap |
| REDIS_URL | local redis | ElastiCache | ElastiCache | Secret |
```

---

## Step 7: Update Progress

- Mark environment strategy questions as complete in aicodepath-state.md
- Log decisions in audit.md with timestamp
- Update implementation-status.json

---

## Step 8: Present Completion Message

```markdown
# Environment Strategy Complete

Environment strategy has defined:
- **Repository Pattern**: [Monorepo / Multi-repo / App + GitOps]
- **Branching Strategy**: [Trunk-Based / GitFlow / GitHub Flow]
- **Environments**: [dev / staging / prod]
- **Feature Flags**: [Unleash / LaunchDarkly / None]
- **Config Management**: [External Secrets / Sealed Secrets / ConfigMaps]

Key Artifacts:
- `repository-strategy.md` - Directory structure and patterns
- `branching-strategy.md` - Branch rules and naming conventions
- `promotion-workflow.md` - Environment promotion gates
- `feature-flags.md` - Feature flag strategy
- `configuration-management.md` - Config and secrets approach

> **REVIEW REQUIRED:**
> Please examine the environment strategy at: `aicodepath-docs/construction/environment-strategy/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to environment strategy
> **Continue to Next Stage** - Proceed to **Docker Design**
```

---

## Step 9: Wait for Explicit Approval
- User must choose between "Request Changes" or "Continue to Next Stage"
- Log user's response in audit.md

---

## References

- Infrastructure Design: `rules/construction/infrastructure-design.md`
- Secrets Management: `rules/construction/secrets-management.md`
- CI/CD Design: `rules/construction/cicd-design.md`
- Docker Design: `rules/construction/docker-design.md`
