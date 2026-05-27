# Adaptive Phase Routing

## Key Principles

- **Adaptive Execution**: Only execute stages that add value
- **Transparent Planning**: Always show execution plan before starting
- **User Control**: User can request stage inclusion/exclusion
- **Progress Tracking**: Update aicodepath-state.md with executed and skipped stages
- **Complete Audit Trail**: Log ALL user inputs and AI responses in audit.md with timestamps
- **Quality Focus**: Complex changes get full treatment, simple changes stay efficient
- **Content Validation**: Always validate content before file creation
- **NO EMERGENT BEHAVIOR**: Construction phases MUST use standardized 2-option completion messages
- **Guideline Enforcement**: Read and apply guidelines before code generation (see `common/guideline-enforcement.md`)
- **Auto-Commit**: Commit at strategic workflow points after validation (see `common/git-integration.md`)
  Strategic commit points (via `/aicodepath-commit`):
  - After each batch completes
  - After CI/CD design phase
  - After Build and Test phase
  - Before session pause (`/aicodepath-pause` should warn if dirty)
- **Multi-Context Support**: Use state files for session continuity (see `common/multi-context-management.md`)
- **Gap Analysis**: Offer targeted pre-construction analysis for brownfield projects (see `construction/gap-analysis.md`)

## MANDATORY: Plan-Level Checkbox Enforcement

### MANDATORY RULES FOR PLAN EXECUTION
1. **NEVER complete any work without updating plan checkboxes**
2. **IMMEDIATELY after completing ANY step described in a plan file, mark that step [x]**
3. **This must happen in the SAME interaction where the work is completed**
4. **NO EXCEPTIONS**: Every plan step completion MUST be tracked with checkbox updates

### Two-Level Checkbox Tracking System
- **Plan-Level**: Track detailed execution progress within each stage
- **Stage-Level**: Track overall workflow progress in aicodepath-state.md
- **Update immediately**: All progress updates in SAME interaction where work is completed

## Prompts Logging Requirements
- **MANDATORY**: Log EVERY user input with timestamp in audit.md
- **MANDATORY**: Capture user's COMPLETE RAW INPUT exactly as provided (never summarize)
- **MANDATORY**: Log every approval prompt with timestamp before asking the user
- **MANDATORY**: Record every user response with timestamp after receiving it
- Use ISO 8601 format for timestamps (YYYY-MM-DDTHH:MM:SSZ)
- Include stage context for each entry

### Audit Log Format:
```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO timestamp]
**User Input**: "[Complete raw user input - never summarized]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

## Directory Structure

```text
aicodepath-docs/
├── inception/
│   ├── plans/
│   ├── reverse-engineering/
│   ├── requirements/
│   ├── user-stories/
│   ├── sprint-planning/
│   └── application-design/
├── construction/
│   ├── plans/
│   ├── environment-strategy/
│   │   ├── repository-strategy.md
│   │   ├── branching-strategy.md
│   │   ├── promotion-workflow.md
│   │   └── feature-flags.md
│   ├── {unit-name}/
│   │   ├── gap-analysis/           # Per-module gap analysis (brownfield)
│   │   │   ├── {module}-gaps.md
│   │   │   ├── {module}-recommendations.md
│   │   │   ├── {module}-reuse.md
│   │   │   └── {module}-conflicts.md
│   │   ├── functional-design/
│   │   ├── nfr-requirements/
│   │   ├── nfr-design/
│   │   ├── infrastructure-design/
│   │   ├── database-design/
│   │   ├── docker-design/
│   │   │   ├── dockerfile-design.md
│   │   │   ├── docker-compose-design.md
│   │   │   └── image-optimization.md
│   │   ├── kubernetes-design/
│   │   │   ├── base-manifests/
│   │   │   ├── helm-chart/
│   │   │   └── resource-guidelines.md
│   │   ├── mobile-design/
│   │   ├── web-ux-design/
│   │   ├── mobile-ux-design/
│   │   ├── ai-implementation/
│   │   └── code/
│   ├── cicd-design/
│   │   ├── pipeline-architecture.md
│   │   ├── workflows/
│   │   │   ├── pr.yml
│   │   │   ├── main.yml
│   │   │   └── release.yml
│   │   └── quality-gates.md
│   └── build-and-test/
├── operations/
│   ├── deployment/
│   │   ├── rollout-strategy.md
│   │   ├── deployment-runbook.md
│   │   ├── rollback-procedures.md
│   │   ├── validation-scripts/
│   │   └── deployment-status.md
│   └── sprint-tracking/
├── aicodepath-state.md
└── audit.md
```
