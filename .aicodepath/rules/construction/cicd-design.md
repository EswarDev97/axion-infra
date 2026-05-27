# CI/CD Pipeline Design (Per-Unit)

**Purpose**: Design GitHub Actions workflows with enterprise-grade quality gates, security scanning, and multi-environment deployment automation

**Execute IF**:
- Automated build/test/deploy required
- GitHub repository in use
- Multi-environment deployment needed
- Quality gates enforcement required

**Skip IF**:
- Manual deployment only
- CI/CD already configured and unchanged
- No automation required

## Prerequisites
- Docker Design complete
- Environment Strategy complete
- Kubernetes Design complete (if K8s deployment)
- Observability Design complete

---

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load `aicodepath-docs/construction/{unit-name}/docker-design/`
- Load `aicodepath-docs/construction/environment-strategy/`
- Load `aicodepath-docs/construction/{unit-name}/kubernetes-design/`
- Load `aicodepath-docs/construction/{unit-name}/observability-design/`

### 1.2 Gather CI/CD Requirements

Create `aicodepath-docs/construction/{unit-name}/cicd-design/cicd-questions.md`:

```markdown
# CI/CD Design Questions: [Unit Name]

## Question 1: Deployment Strategy
What is the deployment approach?

A) **GitOps** (ArgoCD/FluxCD watches repo, pulls changes)
B) **Push-based** (CI pipeline deploys directly to cluster)
C) **Hybrid** (GitOps for prod, push for lower environments)
D) **Manual** (CI builds artifacts, manual deployment)

[Answer]:

---

## Question 2: Quality Gates
What quality gates are required?

A) **Full** (unit >80%, integration, security, performance)
B) **Standard** (unit >70%, security scan)
C) **Minimal** (build and basic tests)
D) **Custom** (describe below)

[Answer]:

---

## Question 3: Security Scanning
What security scanning is required?

A) **Full** (SAST, SCA, container scan, secrets scan, SBOM)
B) **Standard** (SCA + container scan)
C) **Minimal** (secrets scan only)
D) **None**

[Answer]:
```

---

## Step 2: Create Pipeline Architecture

Create `aicodepath-docs/construction/{unit-name}/cicd-design/pipeline-architecture.md`:

```markdown
# Pipeline Architecture: [Unit Name]

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PR PIPELINE                                  │
│  Trigger: Pull Request to main/develop                              │
├─────────────────────────────────────────────────────────────────────┤
│  Lint → Unit Test → Build → Security Scan → Integration Test        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN PIPELINE                                 │
│  Trigger: Push to main branch                                       │
├─────────────────────────────────────────────────────────────────────┤
│  [PR Pipeline] → Push Image → Deploy Dev → Smoke Test → Notify     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      RELEASE PIPELINE                                │
│  Trigger: Git tag (v*.*.*)                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Build Release → Push Release Image → Generate SBOM → Update GitOps │
│  → [Manual Gate] → Deploy Staging → E2E Tests                       │
│  → [Manual Gate] → Deploy Production → Post-Deploy Validation       │
└─────────────────────────────────────────────────────────────────────┘
```

## Quality Gate Matrix

| Gate | Metric | Threshold | Blocking |
|------|--------|-----------|----------|
| Unit Test Coverage | Line coverage | >= 80% | Yes |
| Branch Coverage | Branch coverage | >= 70% | Yes |
| Critical CVEs | Security vulnerabilities | 0 | Yes |
| High CVEs | Security vulnerabilities | 0 | Yes |
| Lint Errors | ESLint/Prettier | 0 | Yes |
| Build Time | Total duration | < 15 min | No |
| Image Size | Production image | < 100 MB | No |
```

---

## Step 3: Create GitHub Actions Workflows

Create `aicodepath-docs/construction/{unit-name}/cicd-design/workflows/`:

### pr.yml - Pull Request Pipeline

```yaml
name: PR Pipeline

on:
  pull_request:
    branches: [main, develop]
    paths-ignore:
      - '**.md'
      - 'docs/**'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  REGISTRY: harbor.company.com
  IMAGE_NAME: myapp/api

jobs:
  # ==========================================================================
  # Lint
  # ==========================================================================
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier
        run: npm run format:check

  # ==========================================================================
  # Test
  # ==========================================================================
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          fail_ci_if_error: true
          threshold: 80%

  # ==========================================================================
  # Build
  # ==========================================================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          push: false
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:pr-${{ github.event.pull_request.number }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ==========================================================================
  # Security Scan
  # ==========================================================================
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
          ignore-unfixed: true

      - name: Run Snyk
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
```

### main.yml - Main Branch Pipeline

```yaml
name: Main Pipeline

on:
  push:
    branches: [main]
    paths-ignore:
      - '**.md'

env:
  NODE_VERSION: '20'
  REGISTRY: harbor.company.com
  IMAGE_NAME: myapp/api

jobs:
  build-and-push:
    name: Build and Push
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      version: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Harbor
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.HARBOR_USERNAME }}
          password: ${{ secrets.HARBOR_PASSWORD }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=main-
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan pushed image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ github.sha }}
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: development
    steps:
      - uses: actions/checkout@v4

      - name: Update K8s manifests
        run: |
          cd k8s/overlays/dev
          kustomize edit set image api=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ github.sha }}

      - name: Deploy to dev cluster
        uses: azure/k8s-deploy@v4
        with:
          namespace: myapp-dev
          manifests: |
            k8s/overlays/dev
          images: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ github.sha }}

      - name: Run smoke tests
        run: |
          sleep 30
          ./scripts/smoke-test.sh https://api-dev.company.com

      - name: Notify on success
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployed main-${{ github.sha }} to development"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### release.yml - Release Pipeline

```yaml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*.*.*'

env:
  NODE_VERSION: '20'
  REGISTRY: harbor.company.com
  IMAGE_NAME: myapp/api

jobs:
  release:
    name: Build Release
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Get version
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Harbor
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.HARBOR_USERNAME }}
          password: ${{ secrets.HARBOR_PASSWORD }}

      - name: Build and push release
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }}
          artifact-name: sbom-${{ steps.version.outputs.version }}.spdx.json

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            sbom-*.spdx.json

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: release
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Update GitOps repo
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITOPS_TOKEN }}
          repository: company/myapp-gitops
          branch: release/${{ needs.release.outputs.version }}
          title: 'Release ${{ needs.release.outputs.version }} to staging'
          body: |
            Automated PR to deploy ${{ needs.release.outputs.version }} to staging.
          commit-message: 'chore: update staging to ${{ needs.release.outputs.version }}'

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [release, deploy-staging]
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.release.outputs.version }} to production"
          # ArgoCD sync or direct deployment

      - name: Post-deployment validation
        run: ./scripts/validate-deployment.sh https://api.company.com
```

---

## Step 4: Create Quality Gates Configuration

Create `aicodepath-docs/construction/{unit-name}/cicd-design/quality-gates.md`:

```markdown
# Quality Gates Configuration

## Branch Protection Rules

```yaml
# Required for main branch
main:
  required_status_checks:
    strict: true
    contexts:
      - lint
      - test
      - build
      - security
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  enforce_admins: true
  required_linear_history: true
```

## Required Secrets

| Secret | Scope | Purpose |
|--------|-------|---------|
| HARBOR_USERNAME | Organization | Container registry |
| HARBOR_PASSWORD | Organization | Container registry |
| SNYK_TOKEN | Organization | Security scanning |
| GITOPS_TOKEN | Repository | GitOps PR creation |
| SLACK_WEBHOOK | Repository | Notifications |
| KUBECONFIG_DEV | Environment: development | K8s deployment |
| KUBECONFIG_STAGING | Environment: staging | K8s deployment |
| KUBECONFIG_PROD | Environment: production | K8s deployment |

## GitHub Environments

| Environment | URL | Protection Rules |
|-------------|-----|------------------|
| development | https://api-dev.company.com | None |
| staging | https://api-staging.company.com | Required reviewers |
| production | https://api.company.com | Required reviewers + 30min wait |
```

---

## Step 5: Update Progress and Present Completion

```markdown
# CI/CD Design Complete: [Unit Name]

CI/CD design has defined:
- **Workflows**: PR, Main, Release pipelines
- **Quality Gates**: Coverage >80%, no critical CVEs
- **Environments**: dev / staging / prod with protection
- **Security**: Trivy, Snyk, TruffleHog scanning

> **REVIEW REQUIRED:**
> Please examine CI/CD at: `aicodepath-docs/construction/{unit-name}/cicd-design/`

> **WHAT'S NEXT?**
> **Request Changes** - Modify CI/CD design
> **Continue** - Proceed to **Code Generation** or **Deployment**
```

---

## Step 6: Wait for Explicit Approval

---

## References

- Docker Design: `rules/construction/docker-design.md`
- Kubernetes Design: `rules/construction/kubernetes-design.md`
- Environment Strategy: `rules/construction/environment-strategy.md`
- DevOps Guidelines: `guidelines/devops-rules.json`
