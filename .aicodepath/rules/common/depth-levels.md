# Adaptive Depth

**Purpose**: Explain how AICodePath adapts detail level to problem complexity

## Core Principle

**When a stage executes, ALL its defined artifacts are created. The "depth" refers to the level of detail and rigor within those artifacts, which adapts to the problem's complexity.**

## Stage Selection vs Detail Level

### Stage Selection (Binary)
- **Workflow Planning** decides: EXECUTE or SKIP for each stage
- **If EXECUTE**: Stage runs and creates ALL its defined artifacts
- **If SKIP**: Stage doesn't run at all

### Detail Level (Adaptive)
- **Simple problems**: Concise artifacts with essential detail
- **Complex problems**: Comprehensive artifacts with extensive detail
- **Model decides**: Based on problem characteristics, not prescriptive rules

## Factors Influencing Detail Level

The model considers these factors when determining appropriate detail:

1. **Request Clarity**: How clear and complete is the user's request?
2. **Problem Complexity**: How intricate is the solution space?
3. **Scope**: Single file, component, multiple components, or system-wide?
4. **Risk Level**: What's the impact of errors or omissions?
5. **Available Context**: Greenfield vs brownfield, existing documentation
6. **User Preferences**: Has user expressed preference for brevity or detail?
7. **Budget Constraints**: For AI/database, cost considerations may limit depth
8. **Sprint Timeline**: Agile iterations may require focused depth

## Example: Requirements Analysis Artifacts

**All scenarios create the same artifacts**:
- `requirement-verification-questions.md` (if needed)
- `requirements.md`

**Note**: User's initial request is captured in `audit.md` (no separate user-intent.md needed)

**Detail level varies by complexity**:

### Simple Scenario (Bug Fix)
- **requirement-verification-questions.md**: necessary clarifying questions
- **requirements.md**: Concise functional requirement, minimal sections

### Complex Scenario (System Migration)
- **requirement-verification-questions.md**: Multiple rounds, 10+ questions
- **requirements.md**: Comprehensive functional + non-functional requirements, traceability, acceptance criteria

## Example: Database Design Artifacts

**All scenarios create the same artifacts**:
- `schema-design.md`
- `migrations/`
- `index-strategy.md`
- `audit-logging.md`
- `cost-analysis.md`

**Detail level varies by complexity**:

### Simple Scenario (Single Table Addition)
- **schema-design.md**: Basic table definition, minimal relationships
- **index-strategy.md**: Essential indexes only
- **cost-analysis.md**: Brief storage estimate

### Complex Scenario (Multi-Database System)
- **schema-design.md**: Full ERD, all relationships, normalization analysis
- **migrations/**: Versioned migration files with rollback procedures
- **index-strategy.md**: Comprehensive indexing with performance projections
- **audit-logging.md**: Full audit trail design with compliance considerations
- **cost-analysis.md**: Detailed TCO with scaling projections

## Example: AI Implementation Artifacts

**All scenarios create the same artifacts**:
- `model-selection.md`
- `cost-analysis.md`
- `prompt-templates/`
- `rag-architecture.md` (if applicable)
- `agent-design.md` (if applicable)

**Detail level varies by complexity**:

### Simple Scenario (Single LLM Call)
- **model-selection.md**: Basic model choice with rationale
- **cost-analysis.md**: Simple per-call cost estimate
- **prompt-templates/**: Single prompt template

### Complex Scenario (Multi-Agent RAG System)
- **model-selection.md**: Tiered model strategy, fallback options, benchmarks
- **cost-analysis.md**: Detailed token projections, caching strategy, cost optimization
- **prompt-templates/**: Multiple templates with versioning, A/B testing strategy
- **rag-architecture.md**: Full retrieval pipeline, embedding choice, chunking strategy
- **agent-design.md**: Agent orchestration, tool definitions, state management

## Example: Sprint Planning Artifacts

**All scenarios create the same artifacts**:
- `sprint-backlog.md`
- `velocity-estimates.md`
- `sprint-goals.md`

**Detail level varies by complexity**:

### Simple Scenario (Small Team, Short Sprint)
- **sprint-backlog.md**: Basic story list with points
- **velocity-estimates.md**: Simple capacity calculation
- **sprint-goals.md**: Single sprint goal

### Complex Scenario (Large Team, Multiple Sprints)
- **sprint-backlog.md**: Detailed story breakdown, dependencies, assignments
- **velocity-estimates.md**: Historical velocity, confidence intervals, risk factors
- **sprint-goals.md**: Multiple aligned goals, success criteria, metrics

## Guiding Principle for Model

**"Create exactly the detail needed for the problem at hand - no more, no less."**

- Don't artificially inflate simple problems with unnecessary detail
- Don't shortchange complex problems by omitting critical detail
- Let problem characteristics drive detail level naturally
- All required artifacts are always created when stage executes
- Consider cost implications for AI and database decisions
- Balance thoroughness with sprint timeline constraints
