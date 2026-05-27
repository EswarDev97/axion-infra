---
name: aicodepath-review
description: 4-perspective code or plan review — A-D grading with APPROVE/REQUEST_CHANGES, covering quality, security, and scope creep.
user-invocable: true
allowed-tools: Read, Glob, Grep, Agent, Skill
argument-hint: "<code | plan | scope> [--depth light|standard|strict] [--task <task-id>] [--native]"
---

# AICodePath Review

Structured review skill producing A-D grades and APPROVE/REQUEST_CHANGES decisions.
Delegates to the `aicodepath-code-reviewer` agent for detailed analysis.

## Review Modes

| Mode | Trigger | What It Reviews |
|------|---------|-----------------|
| `code` | `/aicodepath-review code` | Source files changed in current task |
| `plan` | `/aicodepath-review plan` | tasks.md or adr-log.md for quality |
| `scope` | `/aicodepath-review scope` | Current tasks.md vs adr-log.md for creep |

Default: `code` review of unstaged + staged changes.

## Depth Levels

| Level | When | Coverage |
|-------|------|----------|
| `light` | Quick checks, hotfixes | Security + correctness only |
| `standard` | Default, feature work | All 4 perspectives |
| `strict` | Architecture, security-sensitive | All 4 + extra scrutiny on critical paths |

**Plan-specific depth behavior:**

| Level | Plan Review Coverage |
|-------|---------------------|
| `light` | Skip plan review — not meaningful for plans |
| `standard` | In-skill 5-criteria assessment (default) |
| `strict` | 3-lens validation: spawn plan-critic + plan-analyst agents + in-skill structural checks |

## Code Review Process

### Step 1 — Gather Context
```
Read: aicodepath-docs/adr-log.md  (original requirements)
Read: aicodepath-docs/task/          (active task file being reviewed)
Glob: recent changed files         (what was actually modified)
```

### Step 2 — Spawn Reviewer Agent
```
Invoke: aicodepath-code-reviewer agent
Provide:
  - List of files to review
  - Task description / acceptance criteria
  - Review depth level
  - Any known risk areas
```

### Step 2b — SOLID Design Perspective (5th perspective)

After the reviewer agent completes, run a SOLID scan as the 5th review perspective:

```
Invoke: /aicodepath-solid-principles --auto-scan
Target: all changed source files (same set as Step 2)
```

Add SOLID findings to the review output under `### SOLID Design`:

| Health | Merge? |
|--------|--------|
| A (85-100) | Proceed |
| B (70-84) | Proceed with note |
| C (50-69) | Add Medium violations to REQUEST_CHANGES list |
| D (< 50) | Automatic REQUEST_CHANGES — block merge |

For `standard` depth: run SOLID scan on all changed files.
For `light` depth: skip SOLID scan.
For `strict` depth: run SOLID scan AND `--fix-plan` if score < 85.

### Step 2c — VAPT Security Perspective (6th perspective)

For `strict` depth: run `/aicodepath-vapt` in static-only mode on all changed files.
For `standard` depth: run `/aicodepath-vapt` only if changed files include auth, api,
  or security paths (pattern: `auth/`, `api/`, `security/`, `middleware/`, `routes/`).
For `light` depth: skip VAPT scan.

Add findings under `### VAPT Security`:

| OWASP Score | Merge? |
|-------------|--------|
| 0 critical/high findings | Proceed |
| Any critical finding | Automatic REQUEST_CHANGES — block merge |
| High findings only | Add to REQUEST_CHANGES list |

### Step 2d — Error Observability Perspective (7th perspective)

For `strict` depth: always run.
For `standard` depth: run if changed files match patterns: `*service*`, `*repository*`, `*middleware*`, `*controller*`, `*handler*`.
For `light` depth: skip.

```
Invoke: aicodepath-silent-failure-hunter agent
Target: all changed source files (same set as Step 2)
```

Add findings under `### Error Observability`:

| Finding | Action |
|---------|--------|
| Any CRITICAL finding | Automatic REQUEST_CHANGES |
| HIGH findings | Add to REQUEST_CHANGES list |
| MEDIUM findings | Non-blocking suggestions |

### Step 2e — Test Completeness Perspective (8th perspective)

For `strict` depth: always run.
For `standard` depth: run if any test files are in the diff OR any service/repository files changed without corresponding test changes.
For `light` depth: skip.

```
Invoke: aicodepath-test-completeness-analyzer agent
Target: changed source files + corresponding test files in diff
```

Add findings under `### Test Completeness`:

| Rating | Action |
|--------|--------|
| Gaps rated 8-10 | Automatic REQUEST_CHANGES |
| Gaps rated 5-7 | Add to REQUEST_CHANGES list |
| Gaps rated 1-4 | Non-blocking suggestions |

### Step 3 — Interpret Grade

| Grade | Action |
|-------|--------|
| A | Mark task DONE, proceed to verify |
| B | Share suggestions, mark DONE (suggestions are non-blocking) |
| C | Implement REQUEST_CHANGES before marking done |
| D | Block task, create fix proposals, escalate if 3rd D in a row |

### Step 4 — Handle REQUEST_CHANGES

For each critical/major finding:
1. Create fix proposal via `lib/fix-proposal-manager.js:createProposal()`
2. Classify: auto-fixable (formatting, imports) vs manual fix required
3. Auto-fix: apply directly if `autoFixable=true`
4. Manual fix: add to the active task file in `aicodepath-docs/task/` as `{task}.{seq}.fix` entry
5. Re-run review after fixes applied

**Escalation path** (3 consecutive REQUEST_CHANGES):
- Mark original task BLOCKED
- Create fix task in the active task file in `aicodepath-docs/task/`: `BLOCKED: [task-id] — Review fix required`
- Notify via systemMessage

## Plan Review Process

### Step 1 — Read Plan
```
Read: active task file in aicodepath-docs/task/ or adr-log.md
```

### Step 2 — Assess 5 Criteria

| Criterion | Green | Red |
|-----------|-------|-----|
| **Clarity** | Tasks have specific verbs and measurable outcomes | "Handle X", "Deal with Y", vague descriptions |
| **Feasibility** | All dependencies available, tech stack compatible | Unknown APIs, missing infra, circular deps |
| **Dependencies** | Depends column accurate, no cycles | Missing deps, A depends on B depends on A |
| **Acceptance** | DoD is Yes/No decidable with specific test/command | "looks good", "seems right", "user happy" |
| **Value** | Directly solves stated requirement | Gold plating, scope expansion, "nice to haves" |

### Step 3 — Output Plan Grade

Same A-D grading as code review. Vague DoD → automatic C grade.

### Spike Detection
Tasks touching unfamiliar tech, new integrations, or unknown APIs → flag as SPIKE candidates:
```
SPIKE recommended: [task description]
Reason: [new technology / unknown API / complex integration]
```

### Step 4 — Strict Depth: 3-Lens Validation (plan mode only)

When `/aicodepath-review plan --depth strict` is invoked, run three additional lenses after the standard 5-criteria assessment. Each lens produces its own PASS / PASS WITH CONDITIONS / FAIL verdict.

**Lens 1 — Critic (spawn `aicodepath-plan-critic` agent)**:
```
Invoke: aicodepath-plan-critic agent
Provide:
  - Plan file path (in `aicodepath-docs/plan/`)
  - Tasks table from active task file in aicodepath-docs/task/
  - Original requirements or design doc
Expect: APPROVE / REQUEST_CHANGES with findings table
```
The critic performs adversarial pre-mortem — it looks for what will go wrong, not what looks good.

**Lens 2 — Analyzer (spawn `aicodepath-plan-analyst` agent)**:
```
Invoke: aicodepath-plan-analyst agent
Provide:
  - Plan file path
  - Tasks table
  - Team size (1 = solo, N = parallel)
Expect: Effort breakdown, dependency graph, risk scores, execution mode recommendation
```
The analyzer produces quantitative analysis — effort sizing (XS-XL), risk scoring (1-5), critical path identification, and wave groupings for parallel execution.

**Lens 3 — Review (in-skill structural checks)**:

Run these checks directly — no agent needed:

| Check | Passes when | Fails when |
|-------|-------------|------------|
| Branch Lifecycle present | `## Branch Lifecycle` section exists in plan | Missing or placeholder-only with no batch entries |
| Sprint Acceptance HARD GATE present | `## Sprint Acceptance` section exists with checklist | Missing entirely |
| Tech stack consistency | All task file paths use project's stack (grep plan for file extensions) | Plan references `.py` files in a Node.js project (or vice versa) |
| Agent assignments valid | Agent names in tasks match entries in `agent-taxonomy.md` | Unknown agent name or `—` on a domain-specific task |
| External deps identified | Any external API, library, or service is named explicitly | Vague "call the API" without naming which one |
| Test strategy covers critical path | Tasks on the critical path have TDD steps | Critical path task missing "write failing test" step |

**Strict Verdict Logic:**

| Outcome | Action |
|---------|--------|
| All 3 lenses PASS | APPROVED — proceed to `/aicodepath-confidence-check` |
| Any lens PASS WITH CONDITIONS | REVISE — address conditions, re-run affected lens |
| Any lens FAIL | REJECT — rewrite plan via `/aicodepath-write-plan` |

The strict verdict overrides the standard A-D grade when present. A plan can score grade A on the standard 5-criteria but still be REJECTED by strict lenses (e.g., missing Branch Lifecycle).

## Scope Review Process

### Step 1 — Compare Files
```
Read: aicodepath-docs/adr-log.md   (original scope)
Read: aicodepath-docs/task/          (current work)
```

### Step 2 — Use Scope Creep Detector
```javascript
const { detectScopeCreep, formatReport } = require('.aicodepath/lib/scope-creep-detector');
const result = detectScopeCreep();
```

### Step 3 — Classify Creep Items

| Quadrant | Impact | Risk | Recommendation |
|----------|--------|------|----------------|
| Required | High | Low | Keep — this is valid scope expansion |
| Needs Spike | High | High | Investigate before committing |
| Recommended | Low | Low | Defer to next phase |
| Avoid | Low | High | Descope immediately |

### Step 4 — Output Report
Include: total task count, creep count, percentage, quadrant table.

## Output Format

All review modes produce output using `templates/output-styles/review-output.md` template:

```
## [Code|Plan|Scope] Review

**Verdict**: APPROVE | REQUEST_CHANGES
**Grade**: A | B | C | D
**Depth**: light | standard | strict
**Files Reviewed**: N files

### [Perspective findings or plan criteria or scope creep table]

### Findings Table
| Severity | Location | Issue | Suggestion | Auto-fixable |

### Recommendations
[Non-blocking suggestions — only for grade B+]

### Memory Updates
[Patterns to remember]
```

## Fix Proposal Integration

When REQUEST_CHANGES is issued:

```javascript
// Each critical/major finding becomes a proposal
const { createProposal } = require('.aicodepath/lib/fix-proposal-manager');
const proposal = createProposal(finding, taskId);
// proposal.id → reference in tasks.md BLOCKED note
```

User can then:
- Implement the fix and re-run `/aicodepath-review`
- `/aicodepath-review --approve-fix <proposal-id>` to close the proposal
- Check pending: `listProposals({ status: 'pending' })`

## `--native` Flag: Delegate to `/ultrareview`

When invoked with `--native`, the review delegates to Claude Code's built-in `/ultrareview` command for a comprehensive multi-perspective analysis:

```
/aicodepath-review code --native
```

**Behavior:**
1. Attempt to invoke `/ultrareview` on the current changeset
2. If `/ultrareview` is available: use its output as the review result, map its verdicts to the A-D grading scale
3. If `/ultrareview` is not available (command not found or errors): fall back to the local 5-perspective review (Steps 2-4 above)

**Fallback path:**
```
try:  /ultrareview → map grades → output
catch: log "ultrareview unavailable, falling back to local review"
       → run standard 5-perspective review (code-reviewer + SOLID + VAPT)
```

The `--native` flag is pass-through — it does not change depth behavior. `--native --depth strict` will use ultrareview but still run the 3-lens strict validation on plan reviews.

## Integration

```
/aicodepath-tdd → (implement) → /aicodepath-review → /aicodepath-verify → /aicodepath-checkpoint
```

`/aicodepath-review` sits between implementation and final verification. It catches issues that
tests alone don't catch (security patterns, performance anti-patterns, accessibility violations).

## NEVER

- **NEVER** auto-approve without reading the actual code — "looks right" is not a review. The agent must read all changed files.
- **NEVER** give grade A when security violations are present — security issues always trigger REQUEST_CHANGES regardless of other scores.
- **NEVER** mark findings as "non-blocking" for hardcoded credentials or SQL injection — these are always critical regardless of context.
- **NEVER** perform plan review without reading adr-log.md first — comparing against requirements is the only way to detect scope creep.
- **NEVER** let the plan-critic lens produce only positive feedback — the critic is adversarial by design. A critic report with zero issues is a sign the critic didn't look hard enough, not that the plan is perfect.
- **NEVER** pass a plan at strict depth without Branch Lifecycle + Sprint Acceptance HARD GATE sections — these sections are the durable contract that survives session breaks. A plan without them will produce orphaned uncommitted work.
- **NEVER** approve vague acceptance criteria at strict depth — "tests pass" without naming the exact command and expected assertion count is not a DoD. Every criterion must be Yes/No decidable by a specific command.
