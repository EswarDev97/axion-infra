# Reverse Engineering Orchestrator

**Purpose**: Orchestrate the 11 RE templates to analyze an existing codebase and generate structured design artifacts.

**Trigger conditions**:
- Session state `re_route` is set (by preflight detection)
- Brownfield project detected (>5 source files in workspace)
- User has chosen shallow or deep analysis depth

**Skip entirely when**: `re_route == "greenfield"` (≤5 source files — no RE artifacts needed)

---

## Route Branching Logic

Read session state key `re_route` to determine which templates to execute:

```
re_route = "greenfield"        → SKIP all templates, proceed to Requirements Analysis
re_route = "brownfield-shallow" → Execute templates 01–05 only
re_route = "brownfield-deep"   → Execute all 11 templates (01–11)
```

| Route | Condition | Templates Run | Docs Generated |
|-------|-----------|---------------|----------------|
| `greenfield` | ≤5 source files | None | None — skip RE entirely |
| `brownfield-shallow` | >5 files, user chose shallow | 01–05 | 5 documents |
| `brownfield-deep` | >5 files, user chose deep | 01–11 | 11 documents |

If `re_route` is not set, prompt the user:
> "How thorough should the reverse engineering be? (shallow = high-level overview, deep = full analysis)"
> Then set `re_route` accordingly before proceeding.

---

## The 11 RE Templates

All templates live in `.aicodepath/rules/inception/re-templates/`. Each template contains the full instructions for generating its corresponding output document.

### Shallow Route (Templates 01–05)

These five templates provide a high-level understanding of the codebase and are always run for brownfield projects.

| # | Template Path | Output Document | Route |
|---|---------------|-----------------|-------|
| 1 | `.aicodepath/rules/inception/re-templates/01-business-overview.md` | `business-overview.md` | shallow + deep |
| 2 | `.aicodepath/rules/inception/re-templates/02-architecture-map.md` | `architecture-map.md` | shallow + deep |
| 3 | `.aicodepath/rules/inception/re-templates/03-component-inventory.md` | `component-inventory.md` | shallow + deep |
| 4 | `.aicodepath/rules/inception/re-templates/04-tech-stack.md` | `tech-stack.md` | shallow + deep |
| 5 | `.aicodepath/rules/inception/re-templates/05-api-surface.md` | `api-surface.md` | shallow + deep |

### Deep Route (Templates 06–11)

These six templates provide detailed analysis. Run only when `re_route == "brownfield-deep"`, after templates 01–05 complete.

| # | Template Path | Output Document | Route |
|---|---------------|-----------------|-------|
| 6 | `.aicodepath/rules/inception/re-templates/06-data-model.md` | `data-model.md` | deep only |
| 7 | `.aicodepath/rules/inception/re-templates/07-integration-points.md` | `integration-points.md` | deep only |
| 8 | `.aicodepath/rules/inception/re-templates/08-security-posture.md` | `security-posture.md` | deep only |
| 9 | `.aicodepath/rules/inception/re-templates/09-test-coverage.md` | `test-coverage.md` | deep only |
| 10 | `.aicodepath/rules/inception/re-templates/10-deployment-topology.md` | `deployment-topology.md` | deep only |
| 11 | `.aicodepath/rules/inception/re-templates/11-dependency-graph.md` | `dependency-graph.md` | deep only |

---

## Execution Order

### Greenfield — Skip

```
re_route == "greenfield" → STOP. Proceed to Requirements Analysis.
```

No templates are executed. No output directory is created.

### Shallow — Sequential (Templates 01–05)

Execute templates in order. Each must complete before the next begins.

```
Step 1: Read .aicodepath/rules/inception/re-templates/01-business-overview.md   → generate output
Step 2: Read .aicodepath/rules/inception/re-templates/02-architecture-map.md    → generate output
Step 3: Read .aicodepath/rules/inception/re-templates/03-component-inventory.md → generate output
Step 4: Read .aicodepath/rules/inception/re-templates/04-tech-stack.md          → generate output
Step 5: Read .aicodepath/rules/inception/re-templates/05-api-surface.md         → generate output
```

After Step 5, present completion summary to user and wait for approval.

### Deep — Sequential Batches (All 11 Templates)

Phase A (sequential — each informs the next):
```
Step 1: Read .aicodepath/rules/inception/re-templates/01-business-overview.md   → generate output
Step 2: Read .aicodepath/rules/inception/re-templates/02-architecture-map.md    → generate output
Step 3: Read .aicodepath/rules/inception/re-templates/03-component-inventory.md → generate output
Step 4: Read .aicodepath/rules/inception/re-templates/04-tech-stack.md          → generate output
Step 5: Read .aicodepath/rules/inception/re-templates/05-api-surface.md         → generate output
```

Phase B (can run after Phase A completes; 06–09 may run in parallel if context permits):
```
Step 6:  Read .aicodepath/rules/inception/re-templates/06-data-model.md          → generate output
Step 7:  Read .aicodepath/rules/inception/re-templates/07-integration-points.md  → generate output
Step 8:  Read .aicodepath/rules/inception/re-templates/08-security-posture.md    → generate output
Step 9:  Read .aicodepath/rules/inception/re-templates/09-test-coverage.md       → generate output
```

Phase C (depends on Phase B output):
```
Step 10: Read .aicodepath/rules/inception/re-templates/10-deployment-topology.md → generate output
Step 11: Read .aicodepath/rules/inception/re-templates/11-dependency-graph.md    → generate output
```

After Step 11, present completion summary to user and wait for approval.

---

## MCP Graph Server Usage

When the MCP code-graph server is available, use it to accelerate analysis:

- **Templates 02, 03, 11**: Query the graph for dependency relationships and component boundaries
- **Template 07**: Query the graph for cross-service integration edges
- **Template 09**: Query the graph for test-to-source file coverage mapping

### Graceful Degradation

If the MCP graph server is unavailable or returns errors:
1. Log a warning: "MCP graph server unavailable — falling back to static file analysis"
2. Continue with static file analysis (grep, glob, AST inspection)
3. Note in each affected output document: "Graph data unavailable — analysis based on static inspection"
4. Do NOT block or fail the RE phase due to MCP unavailability

---

## Output Structure

All generated documents go to:

```
aicodepath-docs/inception/reverse-engineering/
├── business-overview.md        (from re-templates/01-business-overview.md)
├── architecture-map.md         (from re-templates/02-architecture-map.md)
├── component-inventory.md      (from re-templates/03-component-inventory.md)
├── tech-stack.md               (from re-templates/04-tech-stack.md)
├── api-surface.md              (from re-templates/05-api-surface.md)
├── data-model.md               (from re-templates/06-data-model.md)          [deep only]
├── integration-points.md       (from re-templates/07-integration-points.md)  [deep only]
├── security-posture.md         (from re-templates/08-security-posture.md)    [deep only]
├── test-coverage.md            (from re-templates/09-test-coverage.md)        [deep only]
├── deployment-topology.md      (from re-templates/10-deployment-topology.md) [deep only]
└── dependency-graph.md         (from re-templates/11-dependency-graph.md)    [deep only]
```

Create the output directory before writing any documents:
```
aicodepath-docs/inception/reverse-engineering/
```

---

## Completion Steps

After all applicable templates have been executed:

### 1. Create Timestamp File

Create `aicodepath-docs/inception/reverse-engineering/reverse-engineering-timestamp.md` with:
- Route taken (`greenfield` / `brownfield-shallow` / `brownfield-deep`)
- Templates executed (list by number and name)
- Completion date/time
- Any degraded-mode notes (e.g., MCP unavailable)

### 2. Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`:
- Set `re_complete: true`
- Record `re_route` used
- Record template count executed

### 3. Present Completion Summary to User

```markdown
# Reverse Engineering Complete

**Route**: [brownfield-shallow | brownfield-deep]
**Templates executed**: [N] of 11

**Key Findings:**
- Business context: [1-sentence summary from 01-business-overview.md]
- Architecture: [1-sentence summary from 02-architecture-map.md]
- Components: [count from 03-component-inventory.md]
- Tech stack: [key technologies from 04-tech-stack.md]
- API surface: [endpoint count from 05-api-surface.md]
[deep only:]
- Data model: [entity count from 06-data-model.md]
- Integration points: [count from 07-integration-points.md]
- Security posture: [summary from 08-security-posture.md]
- Test coverage: [percentage from 09-test-coverage.md]
- Deployment: [summary from 10-deployment-topology.md]
- Dependencies: [count from 11-dependency-graph.md]

> **Artifacts**: `aicodepath-docs/inception/reverse-engineering/`

> **WHAT'S NEXT?**
> **Request Changes** — Ask for re-analysis of specific areas
> **Approve & Continue** — Proceed to Requirements Analysis
```

### 4. Wait for User Approval

- **MANDATORY**: Do not proceed to Requirements Analysis until user explicitly approves
- **MANDATORY**: Log user's response in `aicodepath-docs/inception/audit.md`

---

## References

- Legacy RE rule (preserved): `rules/inception/reverse-engineering-legacy.md`
- Requirements Analysis: `rules/inception/requirements-analysis.md`
- Preflight (sets `re_route`): `rules/core/pre-flight.md`
- Template directory: `.aicodepath/rules/inception/re-templates/`
