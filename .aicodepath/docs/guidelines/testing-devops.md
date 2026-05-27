# Guidelines — Testing & DevOps

Covers: `testing-standards.json`, `devops-rules.json`, `observability-rules.json`

---

## testing-standards.json

**File:** `.aicodepath/guidelines/testing-standards.json`
**Description:** Testing standards for quality assurance — naming, coverage, and test structure patterns.

**Categories and key rules:**

### naming
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `test-file-naming` | warning | Test files must use `.test.` or `.spec.` naming |
| `test-describe-block` | info | Test files should have `describe` blocks for grouping |
| `test-function-naming` | info | Test functions must use `should`, `when`, or `given` format |

**Note on test-describe-block:** This rule has `file_patterns` to only apply to test files. Historically there was a bug (`file_pattern` vs `file_patterns`) — fixed in v2.5.1.

### coverage
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `minimum-coverage` | warning | Code coverage must meet threshold (default 80%) |
| `branch-coverage` | info | Branch coverage should be ≥ 70% |
| `uncovered-paths` | info | Error paths must have test coverage |

### structure
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `arrange-act-assert` | info | Tests must follow Arrange-Act-Assert pattern |
| `single-assertion` | info | Prefer one assertion per test for clear failures |
| `no-test-logic` | warning | Tests must not contain complex branching logic |

### mocking
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `mock-external-only` | warning | Only mock external dependencies (DB, APIs, filesystem) |
| `no-implementation-mocking` | error | Do not mock the code under test |
| `mock-cleanup-required` | warning | All mocks must be reset/restored after each test |

**Applied to:** Test files only
**File patterns:** `**/*.test.*`, `**/*.spec.*`, `**/__tests__/**`

---

## devops-rules.json

**File:** `.aicodepath/guidelines/devops-rules.json`
**Description:** Docker, CI/CD, and environment configuration standards.

**Categories and key rules:**

### docker
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-latest-tag` | error | Docker images must not use `latest` tag — pin to specific version |
| `non-root-user` | error | Docker containers must not run as root |
| `multi-stage-build` | warning | Production Dockerfiles should use multi-stage builds |
| `no-secrets-in-image` | error | No secrets, credentials, or `.env` files in Docker images |
| `healthcheck-required` | warning | Production containers must have HEALTHCHECK instruction |

### environment
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-env` | error | Environment-specific values (ports, URLs, credentials) must come from env vars |
| `env-validation` | warning | Required env vars must be validated at startup |
| `single-env-file` | warning | For monorepos, use one `.env` at project root |

### ci-cd
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `test-before-deploy` | error | CI pipeline must run tests before any deployment step |
| `lint-before-build` | warning | Linting should run before build step |
| `artifact-versioning` | info | Build artifacts must be versioned (not overwrite previous) |

### infrastructure-as-code
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-cidr` | warning | IP ranges in Terraform must use variables |
| `state-backend-required` | error | Terraform must use remote state backend (not local) |
| `resource-tagging` | info | Cloud resources should have environment, team, and cost-center tags |

**Applied to:** Dockerfile, docker-compose.yml, `.github/workflows/*.yml`, `*.tf`, `*.yaml`

---

## observability-rules.json

**File:** `.aicodepath/guidelines/observability-rules.json`
**Description:** Logging, metrics, and distributed tracing standards.

**Categories and key rules:**

### logging
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `structured-logging` | error | All logs must be structured JSON — no `console.log()` in production |
| `log-levels-correct` | warning | Use appropriate log levels (debug, info, warn, error) |
| `no-sensitive-in-logs` | error | PII, passwords, and tokens must not appear in logs |
| `correlation-id` | warning | Request logs must include a correlation/trace ID |
| `error-context-required` | warning | Error logs must include relevant context (user, operation, inputs) |

### metrics
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `request-metrics` | info | HTTP endpoints should record latency, status code, and request count |
| `business-metrics` | info | Critical business operations should emit custom metrics |
| `histogram-for-latency` | info | Latency measurements must use histograms, not gauges |

### tracing
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `trace-context-propagation` | warning | Distributed calls must propagate trace context (W3C TraceContext) |
| `span-naming` | info | Trace spans must have descriptive names (not generic) |

### alerting
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `symptom-based-alerts` | info | Alerts should be symptom-based (latency, errors) not cause-based (CPU%) |
| `runbook-required` | info | Alerts should link to a runbook |

**Applied to:** All service code files (excluding test files)
