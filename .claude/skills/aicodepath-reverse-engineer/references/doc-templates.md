# Reverse Engineering Document Templates

## 11 Documents — Content Guide

### Document 1: `functional-specification.md`
**Content**: Business logic, user-facing features, workflows, and requirements.
- List every feature with status: IMPLEMENTED / PARTIAL / STUB
- Map user journeys and workflows
- Extract business rules from code (validation logic, state machines, calculations)
- Greenfield path: Omit framework details, focus on domain logic

### Document 2: `data-architecture.md`
**Content**: Data models, schemas, API contracts, and data flow.
- Database schemas (tables, columns, relationships, indexes)
- ORM/model definitions with field types
- API request/response shapes (REST endpoints, GraphQL schemas)
- Data flow diagrams (input → processing → storage → output)
- Greenfield path: Abstract to entity-relationship level, omit ORM specifics

### Document 3: `integration-points.md`
**Content**: External services, APIs, third-party dependencies.
- Every external HTTP call, SDK usage, or service integration
- Authentication methods per integration (API keys, OAuth, certificates)
- Data exchanged with each integration (request/response samples)
- Failure modes and retry strategies currently implemented
- Environment variables required per integration

### Document 4: `configuration-reference.md`
**Content**: All configuration options and environment variables.
- Every env var with description, type, default, and where it's used
- Config files (YAML, JSON, TOML) with schema documentation
- Feature flags and their effects
- Per-environment differences (dev/staging/prod)

### Document 5: `operations-guide.md`
**Content**: Deployment, scaling, and operational requirements.
- Build process and commands
- Deployment targets (cloud services, containers, serverless)
- Scaling characteristics (horizontal/vertical, bottlenecks)
- Health checks and readiness probes
- Backup and disaster recovery procedures

### Document 6: `technical-debt-analysis.md`
**Content**: Code quality issues with impact/effort matrix.
- Each debt item: description, location (file:line), severity, effort to fix
- Impact/effort matrix (quick wins, strategic investments, low-priority)
- Dependency freshness (outdated packages, EOL frameworks)
- Security vulnerabilities from dependency audit
- Greenfield path: Focus on business logic debt, not framework debt

### Document 7: `observability-requirements.md`
**Content**: Monitoring, logging, alerting, and tracing.
- Current logging patterns (what's logged, what's missing)
- Metrics being collected (or should be)
- Alerting rules and thresholds
- Distributed tracing setup
- Error tracking and reporting

### Document 8: `visual-design-system.md`
**Content**: UI/UX patterns, components, and accessibility.
- Component inventory (buttons, forms, modals, layouts)
- Design tokens (colors, typography, spacing)
- Responsive breakpoints and mobile patterns
- Accessibility compliance level (WCAG status)
- Mark N/A if no UI layer exists

### Document 9: `test-documentation.md`
**Content**: Testing strategy, coverage, and gaps.
- Test types present (unit, integration, e2e, performance)
- Coverage percentage per module (if measurable)
- Test framework and runner configuration
- Critical paths with no test coverage (gaps)
- Test data management approach

### Document 10: `business-context.md`
**Content**: Product vision, user personas, and competitive context.
- Product purpose and target audience
- User personas (extracted from code: roles, permissions, user types)
- Key business metrics the system tracks
- Competitive differentiators visible in code

### Document 11: `decision-rationale.md`
**Content**: Architecture Decision Records and technology choices.
- Why this tech stack was chosen (evidence from code and config)
- Trade-offs visible in the implementation
- Patterns adopted and why (inferred from usage)
- Known compromises (TODO/HACK/FIXME comments, workarounds)

## Output Structure

```
aicodepath-docs/reverse-engineering/
├── README.md                        # Index with stats and commit pin
├── .pinned-commit                   # Git SHA for incremental refresh
├── analysis-summary.md              # Quick scan results (Step 1)
├── functional-specification.md      # Doc 1
├── data-architecture.md             # Doc 2
├── integration-points.md            # Doc 3
├── configuration-reference.md       # Doc 4
├── operations-guide.md              # Doc 5
├── technical-debt-analysis.md       # Doc 6
├── observability-requirements.md    # Doc 7
├── visual-design-system.md          # Doc 8
├── test-documentation.md            # Doc 9
├── business-context.md              # Doc 10
└── decision-rationale.md            # Doc 11
```

## Per-Document Quality Checklist

- [ ] Every claim references a file:line location
- [ ] Status markers used (IMPLEMENTED / PARTIAL / STUB)
- [ ] Greenfield/brownfield path consistently applied
- [ ] No framework-specific details in greenfield docs
- [ ] Sections link to related docs (e.g., data-architecture links to integration-points)
