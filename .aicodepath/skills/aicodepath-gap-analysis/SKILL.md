---
name: aicodepath-gap-analysis
description: >
  Use when comparing feature specifications against actual code to identify gaps, incomplete implementations, and missing features — produces a prioritized gap report with implementation recommendations. Triggered by: "gap analysis", "what's missing", "compare specs to code", "find gaps", "spec coverage".
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, Skill, TaskCreate, TaskGet, TaskList, TaskUpdate
argument-hint: "[--source .specify/|aicodepath-docs/plan/|aicodepath-docs/design/] [--output aicodepath-docs/gap-report.md]"
---

# AICodePath Gap Analysis

Compare feature specifications against the actual codebase to identify what's missing, what's incomplete, and what needs attention.

## Before You Start — Three Questions

1. **Are the specs current?** If `.specify/` was generated weeks ago, specs may be stale. Check `.specify/CHANGELOG.md` or RE docs' `.pinned-commit`. Stale specs produce false gaps — features built since spec generation show as MISSING.
2. **What counts as "implemented"?** A route registered but returning 501 is a STUB, not PARTIAL. A function with TODO body is a STUB. Tests that pass with mocks only are PARTIAL. Define your threshold before scanning.
3. **What's the audience?** For sprint planning, focus on P0/P1 gaps with effort estimates. For compliance audit, focus on completeness percentage. For tech debt, focus on STUB items.

## Process

### Step 1: Load Specifications

Read specs from these sources (priority order):
1. `.specify/features/F*.md` — structured feature specs (preferred)
2. `aicodepath-docs/plan/*-design.md` — brainstorm design docs (also check `aicodepath-docs/design/*-design.md` for design docs created after ADR-006)
3. `aicodepath-docs/reverse-engineering/functional-specification.md` — RE output

Extract per feature: ID, name, acceptance criteria, expected files/endpoints.

If no specs exist, invoke `/aicodepath-specify` first — gap analysis without specs is guessing.

### Step 2: Scan Codebase for Implementation Evidence

For each feature's acceptance criteria, search with Glob and Grep:

| Evidence Type | Tool | What to Look For |
|--------------|------|-----------------|
| File existence | `Glob` | Expected files, components, modules |
| Function/class presence | `Grep` | Definitions matching feature scope |
| Endpoint registration | `Grep` | Route patterns, controller decorators |
| Test coverage | `Glob` | Test files matching feature name |
| Stub detection | `Read` | TODO/FIXME/placeholder patterns in matched files |

**Agent delegation** — for large spec sets (10+ features), spawn `Explore` agents:
- Split features into batches of 3-4
- Each agent scans independently for implementation evidence
- Merge results by feature ID

### Step 3: Score and Classify

| Score | Status | Criteria |
|-------|--------|----------|
| 100% | COMPLETE | All acceptance criteria met, tests exist |
| 60-99% | PARTIAL | Some criteria met, gaps remain |
| 1-59% | STARTED | Code exists but most criteria unmet |
| 0% | MISSING | No implementation evidence |

Mark ambiguities with `[NEEDS CLARIFICATION]` — these block scoring and must be resolved.

### Step 4: Generate Gap Report

Write `aicodepath-docs/gap-report.md` with:
- Summary table (status counts)
- Completion heat map (feature × score × blocking × effort)
- Per-gap details with file:line evidence
- `[NEEDS CLARIFICATION]` items table
- Priority recommendations (Quick Wins → Strategic → Low Priority)
- Implementation roadmap: Phase 1 (complete partials) → Phase 2 (build P0) → Phase 3 (build P1) → Phase 4 (resolve clarifications)

### Step 5: Handoff

1. Invoke `/aicodepath-knowledge` — save gap findings to knowledge.md
2. Offer explicit next steps:
   - `/aicodepath-write-plan` → convert gaps into task units
   - `/aicodepath-brainstorm` → design missing features (MISSING items)
   - `/aicodepath-requirements` → resolve `[NEEDS CLARIFICATION]` items

## Re-running Gap Analysis

Gap analysis is idempotent. After implementation, re-run to verify:
- Previously MISSING → now STARTED/PARTIAL/COMPLETE
- New gaps discovered during implementation
- Always compare against latest spec version, not cached copy

## NEVER

- **NEVER report a gap without checking for renamed files** — a feature may have been implemented under a different name. Grep for the business logic, not just the expected file name. False gaps waste sprint planning time.
- **NEVER mark COMPLETE without verifying tests pass** — file existence ≠ working feature. If you can't run tests, mark PARTIAL with note "tests not verified".
- **NEVER score acceptance criteria you can't verify** — "good UX" is not verifiable from code. Mark as `[NEEDS CLARIFICATION]` rather than guessing 50%.
- **NEVER compare against stale specs** — if `.pinned-commit` exists and is behind HEAD, warn the user that specs may not reflect current code. Stale comparison → false positives.
- **NEVER list gaps without effort estimates** — a gap without S/M/L/XL effort is unactionable for `/aicodepath-write-plan`. Estimate based on acceptance criteria count and complexity.
- **NEVER conflate "not tested" with "not implemented"** — many features work but have no tests. These are PARTIAL (missing test criterion), not MISSING. False MISSING causes duplicate implementation.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Everything shows MISSING | Grep patterns don't match code conventions | Read one implemented feature to learn naming patterns first |
| Score percentages seem wrong | Acceptance criteria are vague | Tighten criteria in spec first, then re-run |
| Too many `[NEEDS CLARIFICATION]` items | Specs were auto-generated | Run `/aicodepath-requirements` to resolve before re-running |
| Report is too long | Spec set too large | Use `--source` to scope to specific features |
