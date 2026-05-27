# Construction Gap Analysis

**Type**: Optional Pre-Construction Stage
**Trigger**: Before each major construction module (brownfield projects)
**Behavior**: Prompt user → Execute if accepted → Generate targeted recommendations

---

## Overview

Gap Analysis is an **optional, targeted analysis stage** that runs before specific construction modules in brownfield projects. It bridges the findings from Reverse Engineering with the requirements of each construction module, ensuring that new implementations:

1. Leverage existing code and patterns where appropriate
2. Identify gaps between current state and desired state
3. Avoid duplication and conflicts with existing implementations
4. Follow established project conventions

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSTRUCTION PLANNING                             │
│         (Construction modules identified from requirements)          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GAP ANALYSIS PROMPT                               │
│   "Would you like to run gap analysis for {module}?"                │
│                                                                      │
│   Options:                                                           │
│   • Yes - Full Analysis (recommended for complex modules)            │
│   • Yes - Quick Scan (basic compatibility check)                     │
│   • No - Skip (proceed directly to construction)                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
      │ Full Analysis │    │  Quick Scan   │    │     Skip      │
      │               │    │               │    │               │
      │ - Deep scan   │    │ - Pattern     │    │ - Proceed     │
      │ - Statistics  │    │   check only  │    │   with        │
      │ - Reuse map   │    │ - Basic       │    │   warning     │
      │ - Conflicts   │    │   conflicts   │    │               │
      └───────────────┘    └───────────────┘    └───────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSTRUCTION MODULE                               │
│              (With gap analysis context if provided)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Gap Analysis Trigger Points

| Construction Module | Gap Analysis Focus | Key Checks |
|--------------------|--------------------|------------|
| **Database Design** | Schema gaps, existing tables, ORM patterns | Missing entities, relationship gaps, migration history |
| **API Gateway Design** | Endpoint coverage, existing routes, middleware | Missing endpoints, inconsistent patterns, auth gaps |
| **Auth Design** | Security gaps, existing auth flows, token patterns | Auth coverage, permission gaps, session handling |
| **Caching Design** | Cache candidates, hot paths, existing cache | Cacheable operations, cache key patterns, TTL needs |
| **Search Design** | Search requirements, existing implementations | Search coverage, indexing gaps, query patterns |
| **Message Queue Design** | Async operations, existing queue usage | Event candidates, queue patterns, retry handling |
| **AI Implementation** | AI readiness, data availability, existing integrations | Data quality, integration points, cost analysis |
| **Observability Design** | Monitoring gaps, existing logging/metrics | Coverage gaps, blind spots, alert needs |

---

## Gap Analysis Output

### Output Location
```
aicodepath-docs/construction/{unit}/gap-analysis/
├── {module}-gaps.md              # Identified gaps
├── {module}-recommendations.md   # Suggested approaches
├── {module}-reuse.md            # Code to leverage
└── {module}-conflicts.md        # Potential conflicts
```

### Gap Report Template

```markdown
# {Module} Gap Analysis Report

## Executive Summary
- **Gap Score**: {0-100} (higher = more gaps to address)
- **Reuse Opportunities**: {count}
- **Potential Conflicts**: {count}
- **Recommendation**: {proceed/review/refactor first}

## Current State
### Existing Implementations
- List of relevant existing code
- Coverage percentage
- Quality assessment

### Missing Components
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| ... | High/Medium/Low | Simple/Medium/Complex | ... |

## Gap Details

### Critical Gaps (Must Address)
1. **Gap**: {description}
   - **Impact**: {what breaks without it}
   - **Recommendation**: {how to address}

### Important Gaps (Should Address)
1. **Gap**: {description}
   - **Impact**: {limitations if not addressed}
   - **Recommendation**: {suggested approach}

### Minor Gaps (Nice to Have)
1. **Gap**: {description}
   - **Recommendation**: {optional enhancement}

## Reuse Opportunities

### Code to Leverage
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| ... | file:line | Extend/Import/Adapt |

### Patterns to Follow
- List established patterns from codebase
- Naming conventions to maintain
- Architectural patterns in use

## Conflict Analysis

### Potential Conflicts
| New Implementation | Existing Code | Risk | Mitigation |
|-------------------|---------------|------|------------|
| ... | ... | High/Medium/Low | ... |

### Breaking Changes
- List any changes that could break existing functionality
- Migration strategy if needed

## Recommendations

### Implementation Order
1. {First step}
2. {Second step}
3. ...

### Pre-requisites
- [ ] {Required before starting}
- [ ] {Dependency to resolve}

### Estimated Effort
- Without gap analysis findings: {estimate}
- With reuse opportunities: {reduced estimate}
```

---

## Module-Specific Analysis

### Database Design Gap Analysis

**Scan Focus**:
- Existing database schema
- ORM entities/models
- Migration history
- Query patterns

**Gap Checks**:
```
□ Missing tables for new requirements
□ Missing columns on existing tables
□ Missing indexes for query patterns
□ Missing foreign key relationships
□ Inconsistent naming conventions
□ Missing audit columns (created_at, updated_at)
□ Missing soft delete support where needed
□ N+1 query patterns in existing code
```

**Reuse Identification**:
- Existing base entity classes
- Established migration patterns
- Query builder utilities
- Repository patterns

---

### API Gateway Design Gap Analysis

**Scan Focus**:
- Existing routes and controllers
- Middleware chain
- Request/response patterns
- Authentication implementation

**Gap Checks**:
```
□ Missing endpoints for requirements
□ Inconsistent response formats
□ Missing error handling patterns
□ Missing input validation
□ Missing rate limiting on critical endpoints
□ Missing API versioning
□ Missing OpenAPI documentation
□ Inconsistent authentication application
```

**Reuse Identification**:
- Base controller classes
- Response wrapper utilities
- Validation decorators/middleware
- Error handling middleware

---

### Auth Design Gap Analysis

**Scan Focus**:
- Authentication mechanisms
- Authorization patterns
- Token handling
- Session management

**Gap Checks**:
```
□ Missing auth on protected routes
□ Insufficient role/permission granularity
□ Missing token refresh mechanism
□ Missing logout/token revocation
□ Missing MFA support where needed
□ Missing audit logging for auth events
□ Insecure token storage patterns
□ Missing rate limiting on auth endpoints
```

**Reuse Identification**:
- Auth middleware implementation
- Guard/decorator patterns
- Token service utilities
- Permission checking utilities

---

### Caching Design Gap Analysis

**Scan Focus**:
- Existing cache implementations
- Hot code paths
- Database query patterns
- External API calls

**Gap Checks**:
```
□ Missing cache for expensive operations
□ Missing cache invalidation
□ Inconsistent cache key naming
□ Missing TTL configuration
□ Missing cache-aside implementation
□ Missing cache warming strategy
□ Potential cache stampede issues
□ Missing cache metrics/monitoring
```

**Reuse Identification**:
- Cache wrapper/service
- Cache key generators
- Invalidation patterns
- Cache configuration patterns

---

## Configuration

### Gap Analysis Settings

```json
{
  "gap_analysis": {
    "enabled": true,
    "prompt_behavior": "optional_with_recommendation",
    "default_depth": "full",
    "skip_for_greenfield": true,
    "auto_run_for": ["database", "api", "auth"],
    "thresholds": {
      "critical_gap_count": 5,
      "reuse_opportunity_min": 3,
      "conflict_risk_max": "medium"
    },
    "output": {
      "generate_reports": true,
      "include_code_snippets": true,
      "include_statistics": true
    }
  }
}
```

### Prompt Templates

**Standard Prompt**:
```
Before proceeding with {module} construction, would you like to run gap analysis?

This will:
- Scan existing {related_code} for reuse opportunities
- Identify gaps between current and required functionality
- Check for potential conflicts with existing code
- Generate recommendations for implementation

Options:
1. Yes - Full Analysis (recommended, ~2-5 min)
2. Yes - Quick Scan (basic check, ~30 sec)
3. No - Skip (proceed with construction)
```

**With Statistics**:
```
Gap Analysis available for {module}:

Current codebase statistics:
- {count} existing {entities}
- {coverage}% estimated coverage for requirements
- {count} potential reuse opportunities detected

Run analysis? [Yes/Quick/No]
```

---

## Integration with Workflow

### Pre-Construction Hook

Gap analysis integrates with the construction workflow through a pre-construction check:

```javascript
// Pseudo-code for gap analysis integration
async function preConstructionCheck(unit, module, context) {
  // Skip for greenfield projects unless explicitly requested
  if (context.projectType === 'greenfield' && !context.forceGapAnalysis) {
    return { proceed: true, analysis: null };
  }

  // Determine if gap analysis is recommended
  const recommendation = await assessGapAnalysisNeed(module, context);

  // Prompt user
  const userChoice = await promptForGapAnalysis(module, recommendation);

  if (userChoice === 'skip') {
    return {
      proceed: true,
      analysis: null,
      warning: 'Gap analysis skipped - potential for conflicts or missed reuse'
    };
  }

  // Run analysis
  const analysis = await runGapAnalysis(module, userChoice === 'quick');

  // Generate reports
  await generateGapReports(unit, module, analysis);

  return { proceed: true, analysis };
}
```

### Construction Context Injection

When gap analysis completes, its findings are injected into the construction context:

```markdown
## Construction Context (from Gap Analysis)

### Reuse These Components
- {component}: {location} - {usage guidance}

### Avoid These Conflicts
- {conflict}: {mitigation approach}

### Follow These Patterns
- {pattern}: {example location}

### Address These Gaps
- {gap}: {priority and approach}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gap Analysis Adoption | >70% for brownfield | % of brownfield projects using gap analysis |
| Reuse Rate | >50% identified opportunities used | Actual reuse / identified opportunities |
| Conflict Prevention | <5% construction conflicts | Conflicts caught by analysis / total conflicts |
| Time Savings | >20% vs no analysis | Estimated time saved from reuse |
| False Positive Rate | <10% | Invalid recommendations / total recommendations |

---

## Best Practices

1. **Always run for complex modules** - Database, Auth, and API modules benefit most
2. **Review reuse opportunities** - Don't blindly skip existing patterns
3. **Address critical gaps first** - Prioritize by impact
4. **Document deviations** - If not following recommendations, document why
5. **Update analysis** - Re-run if requirements change significantly
6. **Share findings** - Gap reports help team understand decisions

---

## Related Documents

- [Reverse Engineering](../inception/reverse-engineering.md) - Full codebase analysis
- [Core Workflow](../core-workflow.md) - Overall AICodePath flow
- [Construction Modules](./README.md) - Individual construction guides
