# Guidelines Index

**Purpose**: This directory contains JSON-based validation rules that define quality standards for code, architecture, security, and design artifacts in AICodePath.

**Usage**: Guidelines are automatically enforced during the GICL (Governed Iterative Construction Loop) via validation hooks. Agents should design artifacts that comply with these guidelines.

---

## Overview

| Category | Files | Total Rules | Validation Scope |
|----------|-------|-------------|------------------|
| Security | 1 | 30+ | All code, auth, crypto |
| Architecture | 1 | 25+ | System design, patterns |
| API Design | 1 | 20+ | REST, GraphQL, OpenAPI |
| Data Modeling | 1 | 15+ | Database schemas, migrations |
| Code Quality | 2 | 40+ | Standards, linting, complexity |
| DevOps | 1 | 15+ | Docker, K8s, CI/CD |
| Testing | 1 | 20+ | Coverage, assertions, mocks |
| Observability | 1 | 10+ | Logging, metrics, tracing |
| Specialized | 5 | 30+ | AI/ML, Mobile, Search, Types |

**Total**: 14 guideline files, 200+ validation rules

---

## Guidelines by Discipline

### 🔒 Security

#### `security-rules.json`
**Description**: Security rules to prevent common vulnerabilities - OWASP Top 10 and more

**Categories**:
- Secrets Management (no hardcoded credentials)
- Authentication & Authorization (JWT, OAuth, session security)
- Cryptography (strong algorithms, key management)
- Input Validation (SQL injection, XSS, command injection)
- Security Headers (CSP, HSTS, X-Frame-Options)
- Secure Dependencies (vulnerability scanning)
- Data Protection (encryption at rest/transit)

**Used By Agents**:
- security-engineer
- security
- compliance-auditor
- backend-architect

**Validates**:
- All source code files
- Authentication implementations
- API endpoints
- Configuration files

**Example Rules**:
```json
{
  "id": "no-hardcoded-secrets",
  "pattern": "(password|secret|api_key)\\s*[:=]\\s*['\"][^'\"]{8,}['\"]",
  "severity": "error",
  "message": "Hardcoded secret detected - use environment variables"
}
```

---

### 🏗️ Architecture & Design

#### `architecture-rules.json`
**Description**: Architectural principles, design patterns, and code organization standards

**Categories**:
- SOLID Principles (SRP, OCP, LSP, ISP, DIP)
- Design Patterns (Factory, Strategy, Observer, etc.)
- Code Organization (layering, separation of concerns)
- Dependency Management (circular dependencies, coupling)
- Error Handling (try-catch patterns, error propagation)

**Used By Agents**:
- architect
- backend-architect
- frontend-architect
- mobile-architect
- refactoring-expert

**Validates**:
- System design documents
- Component architecture
- Class/module structure

**Key Principles**:
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- KISS (Keep It Simple, Stupid)
- Single Responsibility Principle
- Open/Closed Principle

---

### 🌐 API Design

#### `api-design-rules.json`
**Description**: REST API, GraphQL, and API specification standards

**Categories**:
- REST Principles (resource naming, HTTP methods, status codes)
- GraphQL Schema Design (types, queries, mutations)
- API Versioning (URL, header, content negotiation)
- Error Responses (consistent format, error codes)
- Pagination (offset, cursor-based)
- Rate Limiting (headers, throttling)
- Documentation (OpenAPI, Swagger)

**Used By Agents**:
- api-designer
- backend-architect
- frontend-architect

**Validates**:
- API endpoint definitions
- OpenAPI specifications
- GraphQL schemas
- API documentation

**Example Standards**:
- Use nouns for resources: `/users`, not `/getUsers`
- HTTP methods: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)

---

### 💾 Data Modeling

#### `data-modeling-rules.json`
**Description**: Database schema design, normalization, and migration standards

**Categories**:
- Normalization (1NF, 2NF, 3NF, BCNF)
- Primary Keys (UUID vs auto-increment, composite keys)
- Foreign Keys (constraints, cascade rules)
- Indexing Strategy (B-tree, hash, covering indexes)
- Data Types (appropriate sizing, precision)
- Migrations (versioning, rollback support)
- Audit Logging (created_at, updated_at, deleted_at)

**Used By Agents**:
- database-architect
- backend-architect
- data-scientist

**Validates**:
- Database schema definitions
- Migration scripts
- ERD diagrams
- SQL queries

**Best Practices**:
- Always use surrogate primary keys (id)
- Apply 3NF minimum (denormalize only with justification)
- Add indexes for foreign keys
- Use consistent naming: `table_name`, `column_name`

---

### 📝 Code Quality

#### `coding-standards.json`
**Description**: Code formatting, naming conventions, complexity limits, and readability standards

**Categories**:
- Naming Conventions (camelCase, PascalCase, snake_case)
- Code Complexity (cyclomatic, cognitive complexity limits)
- Function Length (max lines, parameters)
- Code Duplication (DRY violations)
- Comments & Documentation (when/how to comment)
- Magic Numbers (use constants)

**Used By Agents**:
- code-reviewer
- refactoring-expert
- All agents (general standard)

**Validates**:
- All source code

**Thresholds**:
- Cyclomatic Complexity: ≤ 10 per function
- Cognitive Complexity: ≤ 15 per function
- Function Length: ≤ 50 lines
- Parameters: ≤ 5 per function

#### `linting-rules.json`
**Description**: Language-specific linting rules and code formatting standards

**Covers**:
- JavaScript/TypeScript: ESLint rules
- Python: PEP 8, Black, Flake8
- Java: Checkstyle, PMD
- Go: golint, gofmt

---

### 🧪 Testing

#### `testing-standards.json`
**Description**: Test coverage, assertions, mocking, and test organization standards

**Categories**:
- Test Coverage (minimum thresholds)
- Test Organization (arrange-act-assert, given-when-then)
- Assertions (expect vs assert, matchers)
- Mocking Strategy (when to mock, test doubles)
- Test Naming (descriptive, consistent)
- Edge Cases (boundary conditions, error paths)

**Used By Agents**:
- test-engineer
- qa
- code-reviewer

**Validates**:
- Test files
- Test coverage reports

**Requirements**:
- Unit Tests: ≥ 80% coverage
- Integration Tests: Cover critical paths
- E2E Tests: Cover user journeys
- Test Naming: `test_should_<expected>_when_<condition>`

---

### 🔍 Observability

#### `observability-rules.json`
**Description**: Logging, metrics, tracing, and monitoring standards

**Categories**:
- Structured Logging (JSON format, log levels)
- Metrics Collection (counters, gauges, histograms)
- Distributed Tracing (trace IDs, span context)
- Error Tracking (stack traces, context)
- Performance Monitoring (latency, throughput)
- Alerting (thresholds, runbooks)

**Used By Agents**:
- sre-engineer
- observability-engineer
- devops-architect

**Validates**:
- Logging configurations
- Metric definitions
- Tracing setup

**Standards**:
- Log Levels: DEBUG, INFO, WARN, ERROR, FATAL
- Metrics Format: Prometheus-compatible
- Trace Headers: W3C Trace Context standard

---

### ⚙️ DevOps

#### `devops-rules.json`
**Description**: Docker, Kubernetes, CI/CD, and infrastructure as code standards

**Categories**:
- Dockerfile Best Practices (multi-stage, layer caching)
- Kubernetes Manifests (resource limits, health checks)
- CI/CD Pipelines (stages, caching, secrets)
- Infrastructure as Code (Terraform, Pulumi)
- Container Security (image scanning, non-root users)

**Used By Agents**:
- devops-architect
- sre-engineer
- backend-architect

**Validates**:
- Dockerfiles
- Kubernetes YAML
- CI/CD configuration
- Terraform files

**Best Practices**:
- Multi-stage Docker builds
- Resource limits: memory, CPU
- Health checks: liveness, readiness
- Secrets: never in images or configs

---

### 🤖 Specialized Guidelines

#### `ai-implementation-rules.json`
**Description**: Machine learning, model training, and AI implementation standards

**Used By Agents**:
- data-scientist
- ml-engineer

**Covers**:
- Model Selection (bias-variance tradeoff)
- Feature Engineering (normalization, encoding)
- Training (validation split, hyperparameters)
- Evaluation (metrics, cross-validation)
- Deployment (model versioning, A/B testing)

#### `mobile-design-rules.json`
**Description**: iOS and Android mobile app design and development standards

**Used By Agents**:
- mobile-architect
- ux-designer
- ui-designer

**Covers**:
- iOS Human Interface Guidelines
- Material Design (Android)
- Touch Targets (44x44px minimum)
- Platform-Specific Patterns

#### `search-rules.json`
**Description**: Search indexing, relevance, and query optimization standards

**Used By Agents**:
- search-architect

**Covers**:
- Elasticsearch best practices
- Index design
- Query optimization
- Relevance tuning

#### `type-design-rules.json`
**Description**: Type system design, type safety, and static analysis standards

**Used By Agents**:
- backend-architect
- frontend-architect

**Covers**:
- TypeScript strict mode
- Type guards and narrowing
- Generic types
- Type inference

#### `project-preferences.json`
**Description**: Project-specific overrides and custom rules

**Purpose**: Allow projects to customize default guidelines

**Usage**:
```json
{
  "overrides": {
    "coding-standards": {
      "max_function_length": 100
    }
  }
}
```

---

## Validation Workflow

### How Guidelines Are Used

```
1. Developer/Claude writes code
      ↓
2. GICL Hook triggered (Write tool)
      ↓
3. Validator loads relevant guidelines
      ↓
4. Code checked against rules
      ↓
5. Violations reported with severity
      ↓
6. Agent suggested for fixes
      ↓
7. Loop continues until PASS
```

### Validation Hooks

Guidelines are enforced by these hooks:
- `.aicodepath/hooks/security-validator.js` → `security-rules.json`
- `.aicodepath/hooks/architecture-validator.js` → `architecture-rules.json`
- `.aicodepath/hooks/code-quality-validator.js` → `coding-standards.json`
- `.aicodepath/hooks/gicl-iteration-hook.js` → All guidelines (orchestrator)

---

## Adding New Guidelines

### File Structure

```json
{
  "$schema": "AICodePath Guideline Schema",
  "version": "1.0.0",
  "description": "Brief description of what this guideline validates",
  "categories": {
    "category_name": {
      "description": "Category description",
      "rules": [
        {
          "id": "unique-rule-id",
          "description": "What this rule checks",
          "pattern": "regex pattern (if applicable)",
          "severity": "error|warning|info",
          "languages": ["*", "javascript", "python", etc.],
          "message": "User-friendly error message"
        }
      ]
    }
  }
}
```

### Severity Levels

- **error**: Must fix before merge (blocks PR)
- **warning**: Should fix (code review comment)
- **info**: Suggestion for improvement

---

## Authority Hierarchy

When multiple sources provide guidance:

1. **Guidelines (JSON)**: AUTHORITY for validation
   - All numeric thresholds are canonical
   - Validation rules are enforced

2. **Workflow Rules**: AUTHORITY for process
   - Define "how to" create artifacts
   - Reference guidelines for validation

3. **Agents**: AUTHORITY for design decisions
   - Provide rationale and context
   - Must comply with guidelines
   - Should follow workflow rules

**Example**:
- **Guideline**: "Password cost factor >= 12" (enforced)
- **Workflow**: "Step 3: Hash passwords with bcrypt"
- **Agent**: "Use bcrypt because it resists brute force attacks. Cost factor should be >= 12 per security guidelines."

---

## Quick Reference

### Find Guideline for Your Task

| Task | Guideline(s) |
|------|-------------|
| Writing authentication code | `security-rules.json` |
| Designing REST API | `api-design-rules.json` |
| Creating database schema | `data-modeling-rules.json` |
| Refactoring code | `architecture-rules.json`, `coding-standards.json` |
| Writing tests | `testing-standards.json` |
| Containerizing app | `devops-rules.json` |
| Adding logging | `observability-rules.json` |
| Building mobile app | `mobile-design-rules.json` |
| Training ML model | `ai-implementation-rules.json` |

### Command Line Usage

```bash
# View guideline contents
cat .aicodepath/guidelines/security-rules.json | jq .

# Run manual validation
node .aicodepath/hooks/security-validator.js <file-path>

# Check all guidelines for a keyword
grep -r "password" .aicodepath/guidelines/*.json
```

---

## Maintenance

**Guideline Owner**: AICodePath Core Team

**Update Frequency**:
- Review quarterly
- Update when new standards emerge
- Community contributions welcome

**Last Updated**: 2026-02-01

**Version**: 1.0.0

---

For workflow orchestration, see: [Rules Index](../rules/README.md)

For agent expertise, see: [Agent Directory](../skills/roles/)
