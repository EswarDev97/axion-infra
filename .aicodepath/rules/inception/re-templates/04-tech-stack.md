# Tech Stack — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: INCLUDE
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/04-tech-stack.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__search_entities` is available, call:

```
mcp__aicodepath-code-graph__search_entities(query="import require", entity_type="import", limit=20)
mcp__aicodepath-code-graph__search_entities(query="framework library sdk client", entity_type="import", limit=20)
```

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Language and Runtime [DATA SOURCE: llm-only]

Identify the primary programming language(s) and runtime(s) from:
- File extensions across the source tree (`.py`, `.ts`, `.js`, `.go`, `.rs`, `.java`, `.cs`, `.rb`)
- Runtime version files: `.python-version`, `.nvmrc`, `.node-version`, `go.mod` (Go version), `Cargo.toml` (Rust edition), `pom.xml` (Java version)
- Shebang lines in scripts

For each language/runtime found, record:
- Language name and version (if determinable)
- Primary use (backend, frontend, scripts, build tooling)
- File count in that language (approximate)

---

#### Section 2: Core Frameworks [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities(entity_type="import")` results, identify framework packages. Look for canonical framework imports: `express`, `fastapi`, `django`, `spring`, `rails`, `gin`, `actix`, `nest`, `laravel`, `flask`, `nextjs`, `nuxt`, `angular`, `vue`, `react`.

**LLM-only path**: Read `package.json` (dependencies), `requirements.txt` / `pyproject.toml` (install_requires), `go.mod` (require), `Cargo.toml` (dependencies), `pom.xml` / `build.gradle` (dependencies), `Gemfile`. Extract the top-level framework packages.

For each framework found, record:
| Framework | Version | Role | Notes |
|-----------|---------|------|-------|

---

#### Section 3: Data Layer Technologies [DATA SOURCE: graph|llm-only]

**Graph path**: Search imports for database drivers and ORM packages: `sqlalchemy`, `mongoose`, `prisma`, `typeorm`, `sequelize`, `pg`, `mysql2`, `redis`, `elasticsearch`, `pymongo`, `gorm`, `sqlx`.

**LLM-only path**: Scan dependency files for database-related packages. Also check for connection string patterns in config files or environment variable names containing `DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `PG_HOST`, etc.

For each data technology:
| Technology | Type (RDBMS/NoSQL/Cache/Search) | Version | ORM/Driver Used |
|------------|--------------------------------|---------|----------------|

---

#### Section 4: Infrastructure and DevOps Technologies [DATA SOURCE: llm-only]

Identify from config and infrastructure files:
- **Containerization**: `Dockerfile`, `docker-compose.yml`, `.dockerignore` → Docker version, base images used
- **Orchestration**: `kubernetes/`, `helm/`, `k8s/`, `.kube/` → Kubernetes, Helm charts
- **CI/CD**: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/` → CI platform and pipeline stages
- **Cloud Provider**: terraform files, `serverless.yml`, SAM templates, CDK stacks → AWS/GCP/Azure/Vercel
- **Monitoring**: imports of `prometheus`, `datadog`, `newrelic`, `sentry`, `opentelemetry`
- **Message Queues**: `rabbitmq`, `kafka`, `sqs`, `pubsub`, `nats`, `redis` (pub/sub usage)

---

#### Section 5: Build and Tooling [DATA SOURCE: llm-only]

Identify build tools, linters, formatters, and test frameworks:
- Build: `webpack`, `vite`, `esbuild`, `rollup`, `make`, `gradle`, `maven`, `cargo`
- Linters: `eslint`, `pylint`, `ruff`, `golangci-lint`, `rubocop`, `clippy`
- Formatters: `prettier`, `black`, `gofmt`, `rustfmt`
- Test frameworks: `jest`, `pytest`, `go test`, `rspec`, `junit`, `cargo test`, `vitest`, `mocha`
- Type checking: `typescript`, `mypy`, `pyright`

Record version from config files where available.

---

#### Section 6: Tech Stack Risk Assessment

Evaluate the stack on:
- **Currency**: Are any dependencies end-of-life or significantly outdated (major version behind latest)?
- **Consistency**: Mixed language/framework usage that increases cognitive load?
- **Vendor lock-in**: Cloud-specific SDKs or proprietary services that limit portability?
- **Security concerns**: Known vulnerable versions (check against CHANGELOG or known CVE patterns)?

Provide a summary table:
| Concern | Affected Technology | Severity | Recommended Action |
|---------|-------------------|----------|-------------------|

Set `data_source` in frontmatter to `graph` if MCP import search was used, otherwise `llm-only`.
