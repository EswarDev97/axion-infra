---
name: aicodepath-specify
description: >
  Use when generating structured feature specifications from design docs or reverse-engineering output — produces .specify/ directory with feature specs, status markers, and constitution. Triggered by: "create specs", "generate specifications", "spec this feature", "write feature spec", after brainstorm or reverse-engineer.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, TaskCreate, TaskGet, TaskList, TaskUpdate
argument-hint: "<source: design-doc|RE-docs|brainstorm> [--format speckit|markdown] [--scope all|gaps-only]"
---

# AICodePath Specify

Generate structured feature specifications from brainstorm designs, reverse-engineering documents, or requirements.

## Before You Start — Three Questions

1. **What is the source of truth?** Design docs, RE docs, and user stories often disagree. The source you read first becomes your baseline — contradictions in later sources become `[NEEDS CLARIFICATION]` markers, not silent overwrites.
2. **Is this additive or complete?** If `.specify/` already exists, you're updating — never downgrade a COMPLETE status without evidence. If creating fresh, you own the full inventory.
3. **What's the downstream consumer?** `/aicodepath-gap-analysis` needs acceptance criteria to be testable. `/aicodepath-write-plan` needs effort estimates. `/aicodepath-acceptance` needs checkbox-style criteria. Write for the consumer.

## Process

### Step 1: Identify Source Material

| Source | Location | Action |
|--------|----------|--------|
| Brainstorm design | `aicodepath-docs/plan/*-design.md` | Extract features from design sections |
| Design docs (ADR-006) | `aicodepath-docs/design/*-design.md` | Design docs created after 2026-04-03 (post-ADR-006) |
| RE documents | `aicodepath-docs/reverse-engineering/` | Extract from functional-specification.md |
| Requirements PRD | `docs/requirements/` | Extract from user stories |
| Direct input | User's message | Parse features from description |

If multiple sources exist, read all and cross-reference. Flag contradictions.

### Step 2: Create Constitution and Feature Specs

**MANDATORY — READ ENTIRE FILE `references/feature-spec-template.md` (~80 lines)** before generating any spec. It contains the feature template, status markers, priority definitions, and constitution template.

1. Generate `.specify/constitution.md` from project principles
2. For each identified feature, create `.specify/features/F{NNN}-{kebab-case-name}.md`
3. Assign status by scanning codebase with `Glob` and `Grep`:
   - COMPLETE: all acceptance criteria met + tests exist
   - PARTIAL: some criteria met
   - MISSING: no implementation evidence
   - STUB: file exists but returns placeholder data

### Step 3: Validate and Index

1. Invoke `/aicodepath-validate-guidelines` on generated specs — catches quality issues (vague acceptance criteria, missing priorities)
2. Generate `.specify/README.md` with status summary table and feature index

### Step 3b: Seed the CR Number

Before handing off to any skill that writes artifacts (`/aicodepath-write-plan`, `/aicodepath-write-design`, `/aicodepath-gap-analysis`), seed a sprint-wide Change Request identifier so every downstream row in `artifacts` / `units` links to the same sprint. This mirrors the contract in `/aicodepath-brainstorm` for the PM-driven flow.

**Format**: `CR-YYYY-MM-DD-<topic-slug>` (e.g. `CR-2026-04-18-opus-4-7-alignment`).

**Computation**:

```js
const ISO_DATE = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
const crNumber = "CR-" + ISO_DATE + "-" + slugify(topic); // kebab-case topic from the source-material title
```

`slugify(topic)` lowercases the spec topic, replaces whitespace + punctuation with `-`, and strips leading / trailing hyphens.

**Source of `topic`**: the title of the design doc / RE document / requirements PRD read in Step 1. If multiple source documents are in play, use the primary (source-of-truth) title.

**Passing to downstream skills**: write into session-state via `session-state-manager` under the key `cr_number` so `/aicodepath-write-plan`, `/aicodepath-write-design`, and `lib/plan-loader.js` all read the same identifier:

```js
const { SessionStateManager } = require('./lib/session-state-manager');
new SessionStateManager().setState('cr_number', crNumber);
```

If the specify run is updating an existing `.specify/` directory, reuse the existing CR (read it from session-state first); only seed a new CR when starting a fresh spec set. Without this step, `ArtifactWriter` falls back to `CR-LEGACY`.

### Step 4: Handoff

Announce completion and offer next steps:
- `/aicodepath-gap-analysis` → compare specs against code
- `/aicodepath-write-plan` → convert MISSING/PARTIAL specs into task units
- `/aicodepath-acceptance` → use acceptance criteria as sprint gates

## Updating Existing Specs

If `.specify/` already exists:
1. Read existing specs and their statuses
2. Only add new features or update changed ones
3. Log changes in `.specify/CHANGELOG.md`
4. Present diff summary to user before writing

## NEVER

- **NEVER downgrade a COMPLETE status without evidence** — if the spec says COMPLETE but you can't find the code, the code may have moved, not disappeared. Search harder before downgrading.
- **NEVER write acceptance criteria as vague statements** — "Works correctly" is not testable. Every criterion must be verifiable: "Returns 200 with JSON body containing `user_id` field". Vague criteria propagate to `/aicodepath-gap-analysis` where they become false gaps.
- **NEVER derive user stories from implementation** — "As a developer, I want a UserService class" is a design decision, not a user story. Stories describe user-visible outcomes. Implementation artifacts are Technical Notes.
- **NEVER create features with duplicate scope** — F001: "User Authentication" and F005: "Login Flow" overlap. Overlapping specs cause double-counting in gap analysis and conflicting acceptance criteria.
- **NEVER set priority without explicit criteria** — P0/P1/P2/P3 must map to the priority table. "Seems important" is not a priority assignment — check if the system works without it (P0) or is degraded (P1).
- **NEVER skip effort estimation** — even rough S/M/L/XL helps `/aicodepath-write-plan` sequence tasks. An unestimated spec is a scheduling black hole.
- **NEVER generate specs without reading the codebase** — specs from docs alone miss partial implementations. Always Glob/Grep for implementation evidence before assigning status.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| All features marked MISSING despite code existing | Grep patterns too narrow | Expand search: function names, route patterns, class names |
| Duplicate features | Extracted from overlapping sources | Deduplicate by scope; merge acceptance criteria |
| Acceptance criteria untestable | Copied from vague PRD | Rewrite as specific assertions with expected values |
| Status conflicts between sources | Design doc says COMPLETE, code says PARTIAL | Trust code, flag in `[NEEDS CLARIFICATION]` |

## Reference Files

| File | Load when |
|------|-----------|
| `references/feature-spec-template.md` (~80 lines) | **MANDATORY** — before generating any spec in Step 2 |
