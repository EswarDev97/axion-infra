# Workflow Rules Index

**Purpose**: This directory contains Markdown-based workflow orchestration rules that guide Claude through the AI-Guided Development Path (AICodePath) methodology.

**Usage**: Rules are loaded by Claude during workflow execution to provide step-by-step guidance for creating artifacts through inception, construction, and operations phases.

---

## Overview

| Phase | Workflows | Purpose |
|-------|-----------|---------|
| **Inception** | 8 workflows | Planning, requirements, analysis |
| **Construction** | 28 workflows | Design, implementation, testing |
| **Operations** | 2 workflows | Deployment, tracking |
| **Common** | 23 workflows | Cross-phase utilities, setup |
| **Infrastructure** | 1 workflow | IaC automation |
| **Core** | 1 workflow | Master orchestrator |

**Total**: 63 workflow rules

---

## Master Orchestrator

### `core-workflow.md`

**Purpose**: Entry point that determines which phase and workflow to execute based on context

**Flow**:
```
User Request
      ↓
core-workflow.md (analyze request)
      ↓
  ┌───┴───┐
  │       │
PRE-FLIGHT│
  │       │
  ├───────┼────────┬────────┐
  │       │        │        │
INCEPTION│   CONSTRUCTION  OPERATIONS
  │       │        │        │
  └───────┴────────┴────────┘
```

**Responsibilities**:
- Detect workspace type (greenfield vs brownfield)
- Identify current phase
- Route to appropriate workflow
- Manage phase transitions

---

## Phase 1: Inception (Planning & Requirements)

**Purpose**: Gather requirements, understand existing systems, plan implementation

### 1.1 Workspace Setup

#### `workspace-detection.md`
**Purpose**: Detect project type, tech stack, and existing structure

**Triggers**: First time in project, or explicit workspace analysis request

**Outputs**: `aicodepath-docs/inception/workspace-analysis.md`

**Related Agents**: architect

---

#### `reverse-engineering.md`
**Purpose**: Analyze existing codebase (brownfield projects)

**Triggers**: Existing code detected

**Steps**:
1. Identify tech stack
2. Map architecture
3. Inventory components
4. Document dependencies

**Outputs**:
- `aicodepath-docs/inception/reverse-engineering/architecture.md`
- `aicodepath-docs/inception/reverse-engineering/component-inventory.md`
- `aicodepath-docs/inception/reverse-engineering/technology-stack.md`

**Related Agents**: architect, backend-architect, frontend-architect

**Related Guidelines**: `architecture-rules.json`

---

### 1.2 Requirements Gathering

#### `requirements-analysis.md`
**Purpose**: Extract and clarify functional and non-functional requirements

**Steps**:
1. Load existing requirements (if any)
2. Ask clarifying questions (via AskUserQuestion)
3. Create requirements document
4. Verify with user

**Outputs**: `aicodepath-docs/inception/requirements/requirements.md`

**Related Agents**: architect, qa

**Related Guidelines**: `coding-standards.json` (for clarity)

---

#### `application-design.md`
**Purpose**: High-level application architecture and technology decisions

**Steps**:
1. Review requirements
2. Design system components
3. Choose technologies
4. Document decisions (ADRs)

**Outputs**:
- `aicodepath-docs/inception/designs/application-design.md`
- `aicodepath-docs/inception/decisions/adr-*.md`

**Related Agents**: architect, backend-architect, database-architect

**Related Guidelines**: `architecture-rules.json`

---

### 1.3 Planning

#### `user-stories.md`
**Purpose**: Generate user stories from requirements

**Steps**:
1. Create personas
2. Generate stories (As a... I want... So that...)
3. Prioritize stories
4. Estimate complexity

**Outputs**:
- `aicodepath-docs/inception/user-stories/personas.md`
- `aicodepath-docs/inception/user-stories/stories.md`

**Related Agents**: ux-designer, qa

---

#### `units-generation.md`
**Purpose**: Break down features into implementation units

**Steps**:
1. Analyze user stories
2. Identify logical units
3. Define unit boundaries
4. Map dependencies

**Outputs**: `aicodepath-docs/inception/plans/units-of-work.md`

**Related Agents**: architect

---

#### `workflow-planning.md`
**Purpose**: Create workflow execution plan

**Outputs**: `aicodepath-docs/inception/plans/workflow-plan.md`

---

#### `sprint-planning.md`
**Purpose**: Organize units into sprints

**Outputs**: `aicodepath-docs/inception/plans/sprint-plan.md`

---

## Phase 2: Construction (Design & Build)

**Purpose**: Detailed design, code generation, testing

### 2.1 Environment & Strategy

#### `environment-strategy.md`
**Purpose**: Define repository, branching, and environment promotion strategy

**Steps**:
1. Repository strategy (mono repo vs multi-repo)
2. Branching strategy (GitFlow, trunk-based, GitHub Flow)
3. Environment promotion (dev → staging → prod)
4. Feature flags
5. Configuration management

**Outputs**:
- `aicodepath-docs/construction/environment-strategy/repository-strategy.md`
- `aicodepath-docs/construction/environment-strategy/branching-strategy.md`
- `aicodepath-docs/construction/environment-strategy/promotion-workflow.md`

**Related Agents**: devops-architect

**Related Guidelines**: `devops-rules.json`

---

#### `gap-analysis.md`
**Purpose**: Analyze gaps in existing implementations (brownfield)

**Outputs**: `aicodepath-docs/construction/{unit-name}/gap-analysis/gap-analysis.md`

**Related Agents**: architect, code-reviewer

---

### 2.2 Functional Design

#### `functional-design.md`
**Purpose**: Detailed business logic design

**Steps**:
1. Define domain entities
2. Document business rules
3. Create business logic model
4. Define validation rules

**Outputs**: `aicodepath-docs/construction/{unit-name}/functional-design/domain-entities.md`

**Related Agents**: architect, backend-architect

**Related Guidelines**: `architecture-rules.json`, `data-modeling-rules.json`

---

#### `nfr-requirements.md`
**Purpose**: Define non-functional requirements (performance, security, scalability)

**Outputs**: `aicodepath-docs/construction/{unit-name}/nfr-requirements/nfr-requirements.md`

**Related Agents**: performance-engineer, security-engineer, sre-engineer

---

#### `nfr-design.md`
**Purpose**: Design solutions for NFRs

**Outputs**: `aicodepath-docs/construction/{unit-name}/nfr-design/nfr-design.md`

**Related Agents**: performance-engineer, sre-engineer

---

### 2.3 Data & Storage

#### `database-design.md`
**Purpose**: Relational database schema design

**Steps**:
1. Extract entities from functional design
2. Apply normalization (3NF minimum)
3. Define constraints and indexes
4. Create migration scripts

**Outputs**:
- `aicodepath-docs/construction/{unit-name}/database-design/schema-design.md`
- `aicodepath-docs/construction/{unit-name}/database-design/migrations/`

**Related Agents**: database-architect

**Related Guidelines**: `data-modeling-rules.json`

---

#### `nosql-design.md`
**Purpose**: NoSQL database design (MongoDB, DynamoDB, etc.)

**Outputs**: `aicodepath-docs/construction/{unit-name}/nosql-design/collection-design.md`

**Related Agents**: database-architect, backend-architect

---

#### `vector-database-design.md`
**Purpose**: Vector database design for semantic search (Pinecone, Weaviate, etc.)

**Outputs**: `aicodepath-docs/construction/{unit-name}/vector-db-design/vector-schema.md`

**Related Agents**: data-scientist, ml-engineer

**Related Guidelines**: `ai-implementation-rules.json`, `search-rules.json`

---

#### `s3-storage-design.md`
**Purpose**: Object storage design (S3, Azure Blob, GCS)

**Outputs**: `aicodepath-docs/construction/{unit-name}/storage-design/s3-bucket-design.md`

**Related Agents**: devops-architect, cloud-architect

---

#### `caching-design.md`
**Purpose**: Caching strategy (Redis, Memcached)

**Outputs**: `aicodepath-docs/construction/{unit-name}/caching-design/cache-strategy.md`

**Related Agents**: backend-architect, performance-engineer

---

### 2.4 Infrastructure & Services

#### `message-queue-design.md`
**Purpose**: Message queue design (Kafka, RabbitMQ, SQS)

**Outputs**: `aicodepath-docs/construction/{unit-name}/message-queue-design/queue-architecture.md`

**Related Agents**: backend-architect, queue-architect

---

#### `search-design.md`
**Purpose**: Search architecture (Elasticsearch, Algolia)

**Outputs**: `aicodepath-docs/construction/{unit-name}/search-design/search-architecture.md`

**Related Agents**: search-architect, backend-architect

**Related Guidelines**: `search-rules.json`

---

#### `api-gateway-design.md`
**Purpose**: API gateway design (Kong, AWS API Gateway, etc.)

**Outputs**: `aicodepath-docs/construction/{unit-name}/api-gateway-design/gateway-config.md`

**Related Agents**: api-designer, backend-architect

**Related Guidelines**: `api-design-rules.json`

---

### 2.5 Security & Auth

#### `auth-design.md`
**Purpose**: Authentication and authorization design

**Steps**:
1. Choose auth method (OAuth, JWT, session)
2. Design authorization model (RBAC, ABAC)
3. Secret management strategy
4. Threat modeling

**Outputs**:
- `aicodepath-docs/construction/{unit-name}/auth-design/auth-architecture.md`
- `aicodepath-docs/construction/{unit-name}/auth-design/threat-model.md`

**Related Agents**: security-engineer, backend-architect, compliance-auditor

**Related Guidelines**: `security-rules.json`

---

#### `secrets-management.md`
**Purpose**: Secrets management (Vault, AWS Secrets Manager)

**Outputs**: `aicodepath-docs/construction/{unit-name}/secrets-design/secrets-strategy.md`

**Related Agents**: security-engineer, devops-architect

**Related Guidelines**: `security-rules.json`, `devops-rules.json`

---

### 2.6 Observability

#### `observability-design.md`
**Purpose**: Logging, metrics, tracing, and alerting design

**Outputs**: `aicodepath-docs/construction/{unit-name}/observability-design/observability-strategy.md`

**Related Agents**: sre-engineer, observability-engineer

**Related Guidelines**: `observability-rules.json`

---

### 2.7 DevOps & Deployment

#### `infrastructure-design.md`
**Purpose**: Cloud infrastructure design (VPC, networking, etc.)

**Outputs**: `aicodepath-docs/construction/{unit-name}/infrastructure-design/infrastructure.md`

**Related Agents**: devops-architect, cloud-architect, network-architect

---

#### `docker-design.md`
**Purpose**: Dockerfile design and containerization strategy

**Outputs**:
- `aicodepath-docs/construction/{unit-name}/docker-design/Dockerfile`
- `aicodepath-docs/construction/{unit-name}/docker-design/docker-compose.yml`

**Related Agents**: devops-architect

**Related Guidelines**: `devops-rules.json`

---

#### `kubernetes-design.md`
**Purpose**: Kubernetes manifests and orchestration

**Outputs**: `aicodepath-docs/construction/{unit-name}/kubernetes-design/k8s-manifests/`

**Related Agents**: devops-architect

**Related Guidelines**: `devops-rules.json`

---

#### `cicd-design.md`
**Purpose**: CI/CD pipeline design

**Outputs**: `aicodepath-docs/construction/cicd-design/pipeline-design.md`

**Related Agents**: devops-architect

**Related Guidelines**: `devops-rules.json`

---

#### `ci-integration.md`
**Purpose**: Integrate AICodePath with CI/CD

**Outputs**: CI configuration files

---

### 2.8 Frontend & Mobile

#### `web-ux-design.md`
**Purpose**: Web UX design (wireframes, user flows)

**Outputs**: `aicodepath-docs/construction/{unit-name}/web-ux-design/`

**Related Agents**: ux-designer, ui-designer

---

#### `mobile-design.md`
**Purpose**: Mobile app architecture design

**Outputs**: `aicodepath-docs/construction/{unit-name}/mobile-design/mobile-architecture.md`

**Related Agents**: mobile-architect

**Related Guidelines**: `mobile-design-rules.json`

---

#### `mobile-ux-design.md`
**Purpose**: Mobile UX design

**Outputs**: `aicodepath-docs/construction/{unit-name}/mobile-ux-design/`

**Related Agents**: ux-designer, mobile-architect

---

### 2.9 AI/ML

#### `ai-implementation.md`
**Purpose**: AI/ML implementation design

**Outputs**: `aicodepath-docs/construction/{unit-name}/ai-implementation/ml-model-design.md`

**Related Agents**: data-scientist, ml-engineer

**Related Guidelines**: `ai-implementation-rules.json`

---

### 2.10 Build & Test

#### `code-generation.md`
**Purpose**: Generate code from designs

**Outputs**: Source code files

**Related Agents**: All specialist agents

**Related Guidelines**: All guidelines (validation during generation)

---

#### `build-and-test.md`
**Purpose**: Build and test artifacts

**Steps**:
1. Generate unit tests
2. Generate integration tests
3. Run tests
4. Check coverage

**Outputs**: Test files, coverage reports

**Related Agents**: test-engineer, qa

**Related Guidelines**: `testing-standards.json`

---

#### `iterative-loop.md`
**Purpose**: GICL iteration loop (quality gates + requirements tracking)

**Process**: Continuous validation and refinement until all criteria met

**Related Agents**: All agents (suggested based on violations)

**Related Guidelines**: All guidelines (validation)

---

## Phase 3: Operations (Deploy & Monitor)

### `deployment.md`
**Purpose**: Deployment planning and execution

**Outputs**:
- `aicodepath-docs/operations/deployment/deployment-plan.md`
- `aicodepath-docs/operations/deployment/rollback-plan.md`

**Related Agents**: devops-architect, sre-engineer

**Related Guidelines**: `devops-rules.json`

---

### `sprint-tracking.md`
**Purpose**: Track sprint progress

**Outputs**: `aicodepath-docs/operations/sprint-tracking/sprint-{number}.md`

---

## Common Utilities (Cross-Phase)

### Setup & Configuration

- **`central-installation.md`**: AICodePath installation and setup
- **`pre-flight-check.md`**: Environment readiness validation
- **`mandatory-plugins.md`**: Required Claude Code plugins
- **`statusline-dashboard.md`**: Status line configuration

### Knowledge Management

- **`knowledge-base.md`**: SQLite database usage
- **`cr-folder-structure.md`**: Change request organization
- **`expertise-capture.md`**: Capture user domain knowledge
- **`terminology.md`**: Project-specific terms

### Quality & Validation

- **`guideline-enforcement.md`**: How guidelines are enforced
- **`content-validation.md`**: Artifact validation
- **`overconfidence-prevention.md`**: Prevent over-confident outputs
- **`damage-control.md`**: Error recovery

### Workflow Management

- **`process-overview.md`**: AICodePath methodology overview
- **`workflow-changes.md`**: Adapting workflows
- **`question-format-guide.md`**: Asking effective questions
- **`session-continuity.md`**: Multi-session workflows
- **`context-rot-prevention.md`**: Keep context fresh
- **`multi-context-management.md`**: Manage context limits
- **`depth-levels.md`**: Control design depth

### Development

- **`plugin-development.md`**: Create custom plugins
- **`git-integration.md`**: Git workflow integration
- **`error-handling.md`**: Error handling patterns
- **`welcome-message.md`**: Initial user greeting

---

## Infrastructure

### `infrastructure/terraform.md`
**Purpose**: Terraform/IaC workflow

**Outputs**: Terraform files

**Related Agents**: devops-architect, cloud-architect

---

## Workflow Dependencies

### Typical Greenfield Flow

```
workspace-detection
      ↓
requirements-analysis
      ↓
user-stories
      ↓
units-generation
      ↓
workflow-planning
      ↓
sprint-planning
      ↓
environment-strategy
      ↓
[Per Unit]:
  functional-design
      ↓
  database-design
      ↓
  auth-design (if needed)
      ↓
  infrastructure-design
      ↓
  code-generation
      ↓
  build-and-test
      ↓
  iterative-loop (until pass)
      ↓
deployment
```

### Typical Brownfield Flow

```
workspace-detection
      ↓
reverse-engineering
      ↓
gap-analysis
      ↓
requirements-analysis (enhancements)
      ↓
[Continue as greenfield from user-stories]
```

---

## Workflow-Agent-Guideline Mapping

| Workflow | Primary Agents | Validation Guidelines |
|----------|---------------|----------------------|
| database-design | database-architect | data-modeling-rules.json |
| auth-design | security-engineer | security-rules.json, api-design-rules.json |
| code-generation | All | All guidelines |
| docker-design | devops-architect | devops-rules.json |
| build-and-test | test-engineer, qa | testing-standards.json |
| api-gateway-design | api-designer | api-design-rules.json |
| observability-design | sre-engineer | observability-rules.json |
| ai-implementation | data-scientist, ml-engineer | ai-implementation-rules.json |
| mobile-design | mobile-architect | mobile-design-rules.json |

---

## Authority Hierarchy

When multiple sources provide guidance:

1. **Workflows (this directory)**: AUTHORITY for process
   - Defines step-by-step "how to" create artifacts
   - Orchestrates Claude's actions

2. **Guidelines**: AUTHORITY for validation
   - Referenced by workflows for quality checks
   - See: [Guidelines Index](../guidelines/README.md)

3. **Agents**: AUTHORITY for design decisions
   - Invoked by workflows for expertise
   - See: [Agent Directory](../skills/roles/)

**Example**:
- **Workflow** (database-design.md): "Step 3: Design schema, apply 3NF"
- **Agent** (database-architect): "Use composite indexes for multi-column queries"
- **Guideline** (data-modeling-rules.json): Validates: "All tables have primary key"

---

## Quick Reference

### Find Workflow for Your Task

| Task | Workflow(s) |
|------|------------|
| Start new project | workspace-detection → requirements-analysis |
| Analyze existing code | reverse-engineering → gap-analysis |
| Design database | database-design.md |
| Add authentication | auth-design.md |
| Deploy to production | deployment.md |
| Set up CI/CD | cicd-design.md |
| Add caching | caching-design.md |
| Implement search | search-design.md |
| Train ML model | ai-implementation.md |
| Build mobile app | mobile-design.md |

---

## Customizing Workflows

Workflows can be adapted per project:

1. **Skip unnecessary workflows**: Not all projects need all workflows
2. **Add project-specific workflows**: Create in `.aicodepath/rules/custom/`
3. **Override default behavior**: Use `project-preferences.json`

---

## Maintenance

**Workflow Owner**: AICodePath Core Team

**Update Frequency**:
- Review quarterly
- Update when methodology evolves
- Community contributions welcome

**Last Updated**: 2026-02-01

**Version**: 1.0.0

---

For validation rules, see: [Guidelines Index](../guidelines/README.md)

For agent expertise, see: [Agent Directory](../skills/roles/)
