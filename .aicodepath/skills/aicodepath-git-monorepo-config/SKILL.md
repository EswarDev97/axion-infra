---
name: aicodepath-git-monorepo-config
description: >
  Configure Git repository structure for monorepo development with multiple
  environments (develop, staging, production). Sets up branch strategy, protection
  rules, Git hooks, and team collaboration workflows. Use when users mention:
  Git setup, branch strategy, monorepo Git configuration, version control workflow,
  branch protection, Git hooks, team collaboration, PR workflows, or multi-environment
  Git structure.
tags:
  - git
  - monorepo
  - version-control
  - branch-strategy
  - ci-cd
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep
argument-hint: "[--discover-services] [--setup-hooks] [--full-setup]"
disable-model-invocation: false
---

# Git Monorepo Configuration

Configure Git repository structure for monorepo development with environment branches (develop, staging, main), branch protection rules, Git hooks, service discovery, and team workflow documentation.

**Phase restriction**: This skill is designed for **PRE-FLIGHT** and **INCEPTION** phases of the AICodePath workflow. Run this before deployment configuration.

**Integration**: Creates `services.yaml` consumed by the `aicodepath-gcp-monorepo-deploy` skill.

---

## Infrastructure Cost Model

Before setup, present this approach and ask the user to confirm:

```
Recommended branch-to-infrastructure mapping (cost-optimised):

  develop  →  Local machine only (no cloud cost)
               - Run services directly: node/python/go
               - OR: docker-compose up (optional)
               - aicodepath-docs/ committed here — team sees AIDLC progress
               - aicodepath-docs/ NEVER promoted to staging or main

  staging  →  Docker Compose on a single low-cost VM or local staging server
               - Single docker-compose.yml with all services
               - No managed cloud services — postgres in a container
               - Estimated cost: $0–$20/month (or free if using local machine)

  main     →  GCP production (Cloud Run + managed services)
               - Full GCP stack via aicodepath-gcp-monorepo-deploy
               - All resources named and cost-controlled

This approach eliminates cloud cost for develop and significantly
reduces staging cost vs running full Cloud Run per branch.

Do you want to proceed with this model? (yes / no / modify)
```

Wait for user response before continuing.

---

## Quick Start

```
set up git for my monorepo
```

The skill auto-detects your repository state and guides you through setup.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Full monorepo setup | "set up git for my monorepo" |
| Branch strategy | "create environment branches" |
| Git hooks | "add git hooks to prevent production accidents" |
| Service discovery | "detect services in my monorepo" |
| Workflow docs | "generate git workflow documentation" |

---

## What This Skill Does

- Creates and configures environment branches (develop, staging, main)
- Sets `develop` as the default branch
- Enforces PR-only commits to all environment branches
- Commits `aicodepath-docs/` on develop (team sees AIDLC progress); blocks it from staging/main via pre-push hook + CI workflow
- Generates CI workflow to fail PRs that include `aicodepath-docs/` changes targeting staging or main
- Sets up branch protection rules (GitHub CLI, GitLab API, or manual instructions)
- Installs Git hooks (pre-push, pre-commit, commit-msg)
- Detects services in monorepo and creates service manifest
- Generates team workflow documentation
- Configures Git for optimal monorepo performance

## What This Skill Does NOT Do

- Deploy code to infrastructure (use `aicodepath-gcp-monorepo-deploy`)
- Configure CI/CD tools
- Set up cloud resources
- Create Docker configurations

---

## Capability 1: Branch Strategy Setup

### Step 1.1: Analyze Current Branches

Check existing branches:
```bash
git branch -a
git branch -r
git remote get-url origin 2>/dev/null || echo "no remote"
```

Identify current branch, existing environment branches, feature branches, orphaned branches. Output analysis showing what exists and what's missing.

### Step 1.2: Plan Branch Creation

Determine branches needed:
- **develop**: Default branch. Local development only. All features branch from here. `aicodepath-docs/` is committed here — team can track AIDLC progress. Never promoted to staging or main.
- **staging**: Docker-compose staging environment. Requires PR from develop.
- **main**: GCP production. Requires PR from staging.

For existing repos:
- If `master` exists, ask to rename to `main`
- If `dev` exists, ask to rename to `develop`
- If branches exist with different names, ask to standardize
- Preserve existing work, don't force

### Step 1.3: Create Environment Branches

Create missing branches:
```bash
CURRENT=$(git branch --show-current)

# develop is the base — create from current if missing
if ! git show-ref --verify --quiet refs/heads/develop; then
    git checkout -b develop
fi

# staging branches from develop
if ! git show-ref --verify --quiet refs/heads/staging; then
    git checkout develop
    git checkout -b staging
fi

# main is production — branches from staging
if ! git show-ref --verify --quiet refs/heads/main; then
    if git show-ref --verify --quiet refs/heads/master; then
        git branch -m master main
    else
        git checkout staging
        git checkout -b main
    fi
fi

git checkout $CURRENT
```

### Step 1.4: Set Up Branch Tracking

Push branches and configure upstream:
```bash
git push -u origin develop
git push -u origin staging
git push -u origin main
```

### Step 1.5: Set develop as Default Branch

```bash
# GitHub
gh repo edit --default-branch develop

# GitLab — provide manual instruction if gh not available
```

Confirm to user: **develop is the default branch**. All PRs target develop unless explicitly promoting to staging or main.

---

## Capability 2: aicodepath-docs Branch Isolation

`aicodepath-docs/` is committed and tracked on `develop` so the whole team can see AIDLC workflow progress (plans, tasks, knowledge, checkpoints, visual memory). It must NOT propagate to `staging` or `main`.

### Step 2.1: Ensure aicodepath-docs is tracked on develop

Do NOT add `aicodepath-docs/` to the root `.gitignore`. It must be committed on develop.

Only ignore these in `.gitignore`:
```gitignore
# AICodePath
.env.aicodepath
.aicodepath/node_modules/
.aicodepath/logs/
```

### Step 2.2: Add staging/main blocking via .gitattributes

Add to `.gitattributes` so Git's default merge behavior never carries `aicodepath-docs/` forward:
```gitattributes
# aicodepath-docs: develop-only — excluded from exports and release archives
aicodepath-docs/ export-ignore
```

The actual branch protection is enforced by the pre-push hook and CI check (Steps 2.3 and 2.4), not by gitignore.

### Step 2.3: Add pre-push guard

The pre-push hook (installed in Capability 3) checks the diff between what's being pushed and the target branch. If `aicodepath-docs/` files appear in the diff when pushing to `staging` or `main`, the push is blocked.

### Step 2.4: Add CI check for PRs targeting staging/main

Generate `.github/workflows/protect-aicodepath-docs.yml`:

```yaml
name: Block aicodepath-docs in staging/main PRs

on:
  pull_request:
    branches:
      - staging
      - main

jobs:
  check-aicodepath-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for aicodepath-docs changes
        run: |
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep '^aicodepath-docs/' || true)
          if [ -n "$CHANGED" ]; then
            echo "ERROR: aicodepath-docs/ changes detected in PR targeting ${{ github.base_ref }}"
            echo ""
            echo "aicodepath-docs/ is develop-only. It records AIDLC workflow progress"
            echo "and must not be promoted to staging or main."
            echo ""
            echo "Changed files:"
            echo "$CHANGED"
            echo ""
            echo "To fix: remove these files from your PR branch before merging."
            echo "  git diff --name-only HEAD origin/${{ github.base_ref }} | grep '^aicodepath-docs/' | xargs git checkout origin/${{ github.base_ref }} --"
            exit 1
          fi
          echo "OK: No aicodepath-docs/ changes in this PR."
```

### Step 2.5: PR promotion guide

When promoting develop → staging, instruct team to strip aicodepath-docs/ changes from the PR:

```bash
# When creating staging PR from develop, remove aicodepath-docs/ from the diff:
git checkout -b promote/develop-to-staging develop
git diff origin/staging...HEAD -- aicodepath-docs/ | \
  git apply --reverse --index 2>/dev/null || true
git checkout origin/staging -- aicodepath-docs/ 2>/dev/null || \
  git rm -r --cached aicodepath-docs/ 2>/dev/null || true
git commit -m "chore: promote develop → staging (aicodepath-docs excluded)"
# Then open PR from promote/develop-to-staging → staging
```

Document this in `docs/GIT_WORKFLOW.md` under "Promotion Flow".

---

## Capability 3: Git Hooks Installation

### Step 3.1: Create Hooks Directory

```bash
mkdir -p .githooks
git config core.hooksPath .githooks
```

### Step 3.2: Install pre-push Hook

Create `.githooks/pre-push`:

```bash
#!/bin/bash
# pre-push: Safety checks before pushing to environment branches
#
# aicodepath-docs/ is committed on develop (team sees AIDLC progress).
# It must NEVER be included in pushes to staging or main.

BRANCH=$(git branch --show-current)

# Block aicodepath-docs changes from staging and main
if [[ "$BRANCH" == "staging" || "$BRANCH" == "main" ]]; then
    while read local_ref local_sha remote_ref remote_sha; do
        # remote_sha is 0000... if the branch doesn't exist remotely yet
        if [[ "$remote_sha" == "0000000000000000000000000000000000000000" ]]; then
            # New branch: check all commits against develop base
            BASE=$(git merge-base HEAD origin/develop 2>/dev/null || git rev-list --max-parents=0 HEAD)
        else
            BASE=$remote_sha
        fi

        CHANGED=$(git diff --name-only "$BASE" "$local_sha" 2>/dev/null | grep "^aicodepath-docs/" || true)
        if [ -n "$CHANGED" ]; then
            echo "ERROR: aicodepath-docs/ changes found in commits being pushed to ${BRANCH}."
            echo ""
            echo "       aicodepath-docs/ is develop-only. It records AIDLC workflow progress"
            echo "       and must not be promoted to ${BRANCH}."
            echo ""
            echo "       Affected files:"
            echo "$CHANGED" | sed 's/^/         /'
            echo ""
            echo "       To fix, reset aicodepath-docs/ to the ${BRANCH} state:"
            echo "         git diff --name-only origin/${BRANCH}...HEAD | grep '^aicodepath-docs/' | xargs git checkout origin/${BRANCH} -- 2>/dev/null"
            echo "         git commit -m 'chore: exclude aicodepath-docs from ${BRANCH}'"
            exit 1
        fi
    done
fi

# All changes to staging and main must come via PR — warn on direct push
if [[ "$BRANCH" == "main" ]]; then
    echo "WARNING: Pushing directly to main (production)."
    echo "         All production changes should go through PRs from staging."
    read -p "Continue? (yes/no): " confirm
    [[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 1; }
fi

if [[ "$BRANCH" == "staging" ]]; then
    echo "INFO: Pushing to staging. Ensure changes were reviewed via PR from develop."
fi

exit 0
```

```bash
chmod +x .githooks/pre-push
```

### Step 3.3: Install pre-commit Hook

Create `.githooks/pre-commit`:

```bash
#!/bin/bash
# pre-commit: Quality checks before commit
# NOTE: aicodepath-docs/ is ALLOWED on develop (records AIDLC progress).
#       The pre-push hook prevents it from reaching staging or main.

BRANCH=$(git branch --show-current)

# Warn (not block) if committing aicodepath-docs/ on a branch above develop
if [[ "$BRANCH" == "staging" || "$BRANCH" == "main" ]]; then
    if git diff --cached --name-only | grep -q "^aicodepath-docs/"; then
        echo "ERROR: aicodepath-docs/ must not be committed to ${BRANCH}."
        echo "       aicodepath-docs/ is develop-only. Remove from staging:"
        echo "         git reset HEAD aicodepath-docs/"
        exit 1
    fi
fi

# Check for debug statements
if git diff --cached --name-only | xargs grep -l "console\.log\|debugger\|binding\.pry\|pdb\.set_trace" 2>/dev/null; then
    echo "WARNING: Debug statements detected. Remove before committing to environment branches."
fi

# Check for large files (>10MB)
large_files=$(git diff --cached --name-only | while read f; do
    size=$(git cat-file -s ":$f" 2>/dev/null || echo 0)
    [ "$size" -gt 10485760 ] && echo "$f ($((size/1048576))MB)"
done)
if [ -n "$large_files" ]; then
    echo "ERROR: Large files detected (>10MB): $large_files"
    exit 1
fi

# Secrets detection
if git diff --cached -U0 | grep -qiE "(password|secret|api_key|token)\s*=\s*['\"][^'\"]{8,}['\"]"; then
    echo "ERROR: Potential secret detected in staged changes."
    exit 1
fi

exit 0
```

```bash
chmod +x .githooks/pre-commit
```

### Step 3.4: Install commit-msg Hook

Create `.githooks/commit-msg`:

```bash
#!/bin/bash
# commit-msg: Conventional commits enforcement

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "ERROR: Commit message must follow Conventional Commits format."
    echo "       Format: <type>(<scope>): <description>"
    echo "       Types:  feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo "       Example: feat(auth): add JWT refresh token endpoint"
    exit 1
fi
exit 0
```

```bash
chmod +x .githooks/commit-msg
```

---

## Capability 4: Branch Protection Rules

### Step 4.1: Determine Repository Platform

Detect platform from remote URL (GitHub, GitLab, Bitbucket).

### Step 4.2: GitHub Protection Rules

**All environment branches require PRs — no direct commits.**

```bash
# develop: default branch, 1 approval required, status checks enforced
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# staging: 2 approvals, enforce on admins
gh api repos/:owner/:repo/branches/staging/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci", "integration-tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# main: 2 approvals, signed commits, enforce on admins, code owner review
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci", "integration-tests", "security-scan"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_signatures": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Show user a summary table:

```
Branch Protection Summary:
─────────────────────────────────────────────────────
Branch     | PR Required | Approvals | Enforce Admins | Signed Commits
develop    | YES         | 1         | No             | No
staging    | YES         | 2         | YES            | No
main       | YES         | 2         | YES            | YES
─────────────────────────────────────────────────────
Direct commits to develop, staging, and main: BLOCKED
```

### Step 4.3: GitLab Protection Rules

Apply via GitLab API with appropriate access levels per branch. Show equivalent table.

### Step 4.4: Manual Instructions

If automation isn't possible, provide step-by-step manual instructions for GitHub/GitLab UI.

---

## Capability 5: Service Discovery

### Step 5.1: Scan Repository Structure

Detect services by looking for package managers and build files at max depth 3:
- **Node.js**: `package.json`
- **Python**: `requirements.txt`, `pyproject.toml`, `setup.py`
- **Go**: `go.mod`
- **Java**: `pom.xml`, `build.gradle`

```bash
bash .aicodepath/skills/aicodepath-git-monorepo-config/scripts/detect-services.sh
```

### Step 5.2: Generate Service Manifest

Creates `services.yaml` with:
- Repository info (platform, branch names, default branch: develop)
- Infrastructure model (develop=local, staging=docker-compose, main=gcp)
- Detected services (name, path, type, has_dockerfile, dependencies)
- Workflow configuration (branch protection, hooks status)

Include docker-compose reference per service for staging:
```yaml
repository:
  platform: github
  default_branch: develop
  branches:
    develop:
      infrastructure: local
      aicodepath_docs: committed   # team sees AIDLC progress; never promoted to staging/main
    staging:
      infrastructure: docker-compose
      compose_file: docker-compose.staging.yml
    main:
      infrastructure: gcp
      gcp_project: <prod-project-id>

services:
  - name: api
    path: ./api
    type: nodejs
    has_dockerfile: true
    port: 3000
  - name: worker
    path: ./worker
    type: python
    has_dockerfile: true
    port: null
```

---

## Capability 6: Docker Compose for Staging

Generate `docker-compose.staging.yml` as a low-cost staging environment:

```yaml
# docker-compose.staging.yml
# Staging environment — run on a single VM or local staging machine
# Cost: $0 if run locally, ~$10-20/mo on a small VM

version: '3.9'

networks:
  staging-net:
    name: ${PROJECT_NAME:-myapp}-staging
    driver: bridge

volumes:
  db-data:
    name: ${PROJECT_NAME:-myapp}-staging-db
  redis-data:
    name: ${PROJECT_NAME:-myapp}-staging-redis

services:
  # Add one block per service detected
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    image: ${PROJECT_NAME:-myapp}/api:staging
    container_name: ${PROJECT_NAME:-myapp}-api-staging
    networks:
      - staging-net
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      NODE_ENV: staging
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME:-myapp}-db-staging
    networks:
      - staging-net
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: ${PROJECT_NAME:-myapp}-redis-staging
    networks:
      - staging-net
    volumes:
      - redis-data:/data
    restart: unless-stopped
```

**Startup/stop commands for staging:**
```bash
# Start staging
docker compose -f docker-compose.staging.yml up -d

# Stop staging (preserves data volumes)
docker compose -f docker-compose.staging.yml stop

# Stop and remove everything (CAUTION: destroys data)
docker compose -f docker-compose.staging.yml down -v
```

---

## Capability 7: Team Workflow Documentation

### Step 7.1: Create Git Workflow Guide

Generate `docs/GIT_WORKFLOW.md`:

```markdown
# Git Workflow

## Branch Strategy

```
main (production — GCP)
  ↑ PR only (2 approvals)
staging (staging — docker-compose)
  ↑ PR only (2 approvals)
develop (local — default branch)
  ↑ PR only (1 approval)
feature/your-feature
```

## Environment → Infrastructure Mapping

| Branch  | Infrastructure         | Cost        |
|---------|------------------------|-------------|
| develop | Local (your machine)   | Free        |
| staging | Docker Compose         | ~$0-20/mo   |
| main    | GCP Cloud Run          | Pay-per-use |

## Daily Workflow

1. Branch from develop: `git checkout -b feature/my-feature develop`
2. Develop locally using AICodePath workflow
3. Push feature branch: `git push -u origin feature/my-feature`
4. Open PR → develop (1 approval required)
5. After merge, PR → staging for integration testing (2 approvals)
6. After staging validation, PR → main for production (2 approvals)

## AICodePath Artifacts (aicodepath-docs/)

`aicodepath-docs/` is committed on `develop` so the whole team can
see AIDLC workflow progress: plans, tasks, knowledge, checkpoints,
and visual memory diagrams.

It is NOT promoted to `staging` or `main`. Three mechanisms enforce this:
1. **Pre-push hook**: blocks pushes that include aicodepath-docs/ changes to staging/main
2. **CI check** (`.github/workflows/protect-aicodepath-docs.yml`): fails PRs targeting staging/main that include aicodepath-docs/ changes
3. **PR promotion guide**: strip aicodepath-docs/ when creating promote/* branches

`aicodepath-docs/` is NOT in `.gitignore` — it must be tracked on develop.

## Promotion Flow

feature → develop → staging → main

NO direct commits to develop, staging, or main.
ALL changes go through Pull Requests.
```

---

## Capability 8: Monorepo Git Configuration

### Step 8.1: Performance Optimizations

```bash
git config core.sparseCheckout true
git config core.splitIndex true
git config core.fsmonitor true
git config http.postBuffer 524288000
git config core.preloadIndex true
git config protocol.version 2
```

### Step 8.2: Merge Strategy

```bash
git config merge.strategy recursive
git config merge.renameLimit 999999
git config merge.conflictStyle diff3
git config pull.rebase true
```

### Step 8.3: Create .gitattributes

```
* text=auto eol=lf
*.sh text eol=lf
*.bat text eol=crlf
*.png binary
*.jpg binary
*.gif binary
*.ico binary
*.pdf binary
aicodepath-docs/ export-ignore
```

### Step 8.4: Update .gitignore

Ensure comprehensive ignore patterns:

```gitignore
# AICodePath runtime config (NOT aicodepath-docs/ — that is committed on develop)
.env.aicodepath
.aicodepath/node_modules/
.aicodepath/logs/

# Dependencies
node_modules/
.venv/
__pycache__/
*.pyc
vendor/

# Build outputs
dist/
build/
*.egg-info/

# Environment
.env
.env.local
.env.*.local

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

---

## Validation

After setup, run validation:
```bash
bash .aicodepath/skills/aicodepath-git-monorepo-config/scripts/validate-setup.sh
```

Checks: branches exist, `develop` is default, hooks installed, services.yaml present, `aicodepath-docs/` in `.gitignore`, not tracked in git.

---

## Completion Handoff

```
Your repository is configured with:
- Environment branches: develop (default) → staging → main
- Default branch: develop
- All changes require PRs (no direct commits)
- aicodepath-docs/ committed on develop (team sees AIDLC progress)
- aicodepath-docs/ blocked from staging/main by: pre-push hook + CI check + PR guide
- Branch protection rules applied
- Git hooks installed (.githooks/)
- Docker Compose staging config generated
- Service manifest (services.yaml)
- Team workflow documentation (docs/GIT_WORKFLOW.md)

Infrastructure cost model:
  develop  → local (free)
  staging  → docker-compose (~$0-20/mo)
  main     → GCP (pay-per-use)

Next step: Use /aicodepath-gcp-monorepo-deploy for production GCP setup.
```

---

## NEVER

- **NEVER** push `aicodepath-docs/` to staging or main — this directory is committed on develop so the team can track AIDLC progress, but must not propagate upward. The pre-push hook, CI check, and PR promotion guide all enforce this. Do NOT add `aicodepath-docs/` to `.gitignore` — it needs to be committed on develop.
- **NEVER** allow direct commits to `develop`, `staging`, or `main` — all changes go through PRs. Branch protection must block direct pushes before any work starts.
- **NEVER** set `main` as the default branch — `develop` is the default. All PRs from feature branches target `develop`. This prevents accidental PRs directly to production.
- **NEVER** force-push to `staging` or `main` — branch protection must block force-pushes. Use `--force-with-lease` only in emergencies after team confirmation.
- **NEVER** rename `master` to `main` without checking if CI/CD pipelines reference the branch name — audit pipeline configs before renaming.
- **NEVER** push environment branches without branch protection already configured — the window between creating a branch and enabling protection is when accidents happen.
- **NEVER** skip service detection when services.yaml will be consumed by `aicodepath-gcp-monorepo-deploy` — incomplete services.yaml causes partial deployments.

## Error Handling

| Error | Recovery |
|-------|----------|
| Not a Git repository | Offer to `git init` |
| Insufficient permissions for protection rules | Provide manual instructions |
| Both `main` and `master` exist | Ask user which to keep |
| Existing Git hooks found | Offer backup + replace or merge |
| `develop` branch exists as `dev` | Ask to rename, update all CI refs |
| `aicodepath-docs/` found in staging/main PR | Strip via: `git checkout origin/staging -- aicodepath-docs/` then recommit |
