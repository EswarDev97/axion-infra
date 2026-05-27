---
name: aicodepath-reverse-engineer
description: >
  Use when performing structured reverse engineering of an existing codebase — produces 11 comprehensive documents covering functional specs, data architecture, integration points, technical debt, and more. Triggered by: "reverse engineer", "document this codebase", "RE this project", "understand this system", brownfield INCEPTION phase.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, Skill, TodoWrite
argument-hint: "<path-to-codebase> [--path greenfield|brownfield] [--scope full|focused]"
---

# AICodePath Reverse Engineer

Structured reverse engineering that produces 11 comprehensive documents from any codebase, integrated into AICodePath's INCEPTION phase.

<HARD-GATE>
Do NOT skip any of the 11 documents. If a concern does not apply (e.g., no UI), explicitly write "N/A — no UI layer detected" in that document rather than omitting it. Omitted documents create blind spots that surface during CONSTRUCTION as rework.
</HARD-GATE>

## Before You Start — Three Questions

1. **Who will consume these docs?** The same agent in a later phase? A human architect? A different team? This determines greenfield (tech-agnostic for migration) vs brownfield (tech-prescriptive for maintenance).
2. **What does the team already know?** If this is a team's own codebase, they know business-context.md — spend less time there, more on technical-debt and integration-points where blind spots live.
3. **What's the downstream action?** If feeding into `/aicodepath-specify`, focus on feature completeness markers. If feeding into `/aicodepath-brainstorm`, focus on decision-rationale and integration-points.

## Dual-Path Routing

| Path | Focus | Output Style | When |
|------|-------|-------------|------|
| **Greenfield** | Business logic only (tech-agnostic) | WHAT the system does | Planning to rebuild in a different stack |
| **Brownfield** | Business logic + technical implementation | WHAT and HOW | Working on the existing codebase |

Default to **brownfield**. Ask the user explicitly — do not infer.

## Process

### Step 1: Invoke Classification and Initial Scan

1. Invoke `/aicodepath-classify-component` with the target codebase path — this surfaces which specialist agents to delegate to in Step 2
2. Perform rapid scan: tech stack, directory structure, entry points, architecture patterns, scale (files, LOC, services)
3. Write `analysis-summary.md` → present to user for confirmation before deep dive

### Step 2: Generate 11 Documents

**MANDATORY — READ ENTIRE FILE `references/doc-templates.md` (~120 lines)** before generating any document. It contains content requirements and per-document quality checklists.

Write all documents to `aicodepath-docs/reverse-engineering/`.

**Agent delegation** — spawn parallel agents for independent document batches:
- **Batch 1** (independent, spawn via Agent tool): Docs 1, 3, 4, 7, 10
  - Use `subagent_type: "feature-dev:code-explorer"` for deep code tracing
- **Batch 2** (depends on data analysis): Docs 2, 5, 8
  - For Doc 8: spawn `aicodepath-frontend-architect` agent if UI detected
- **Batch 3** (depends on full picture): Docs 6, 9, 11
  - For Doc 6: invoke `/aicodepath-validate-guidelines` to get systematic tech debt list

### Step 3: Generate Summary Index and Pin Commit

1. Create `aicodepath-docs/reverse-engineering/README.md` — table of all 11 docs, tech stack, statistics, path used, commit hash
2. Pin current HEAD: `git rev-parse HEAD > aicodepath-docs/reverse-engineering/.pinned-commit`

### Step 4: AIDLC Integration Handoff

1. Invoke `/aicodepath-knowledge` — import ADRs into `adr-log.md`, patterns into `knowledge.md`
2. Offer next step:
   - `/aicodepath-specify` → generate feature specs from RE docs
   - `/aicodepath-brainstorm` → design a new feature using RE as context
   - `/aicodepath-gap-analysis` → compare RE docs against actual code

## Incremental Refresh

When RE docs exist and `.pinned-commit` is present:
1. Diff current HEAD against pinned: `git diff <pinned>..HEAD --name-only`
2. Categorize changed files by which document they affect
3. Only regenerate affected sections — not full docs
4. Update `.pinned-commit`

## NEVER

- **NEVER infer architecture from import statements alone** — runtime call order, middleware chains, and DI containers mean imports don't reflect actual execution flow. Trace entry points instead.
- **NEVER document TODO/FIXME comments as IMPLEMENTED features** — these are aspirational, not actual. Mark as STUB or PARTIAL.
- **NEVER copy README marketing language into functional-specification** — READMEs describe intent; code describes reality. Extract from code, verify against README.
- **NEVER skip integration-points.md for "simple" apps** — even single-service apps have external dependencies (auth providers, email, payment). "Simple" apps with undocumented integrations cause the worst production failures.
- **NEVER generate observability docs from logging code alone** — logging ≠ observability. Check for metrics, tracing, alerting, and health checks separately.
- **NEVER mix greenfield and brownfield content in the same doc** — if the user chose greenfield, every framework-specific reference is a contamination that limits their technology choices.
- **NEVER treat absence of tests as "not applicable"** — empty test-documentation.md is a finding, not a skip. Document what coverage gaps exist.
- **NEVER generate docs without file:line references** — claims without locations are unverifiable. Every "the system does X" must point to where.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Docs describe outdated behavior | `.pinned-commit` is stale | Run incremental refresh |
| Missing integration points | Scanned `src/` only | Also scan `config/`, `.env*`, `docker-compose*`, `infra/` |
| Feature marked IMPLEMENTED but broken | Status inferred from file existence | Check test results, not just file presence |
| RE takes too long on large codebase | Scanning all files sequentially | Use `--scope focused` and agent parallelization |
| Greenfield docs contain framework specifics | Path not applied consistently | Grep output docs for framework names before delivery |

## Reference Files

| File | Load when |
|------|-----------|
| `references/doc-templates.md` (~120 lines) | **MANDATORY** — before generating any document in Step 2 |
