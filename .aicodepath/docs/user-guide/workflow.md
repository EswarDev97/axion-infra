# AIDLC Workflow Guide

The AI-Driven Development Life Cycle (AIDLC) guides every task through four phases. Do not skip phases.

---

## Phase Overview

```
PRE-FLIGHT → INCEPTION → CONSTRUCTION → OPERATIONS
```

| Phase | Purpose | Key Skills |
|-------|---------|-----------|
| PRE-FLIGHT | Verify environment, gather requirements | preflight, requirements |
| INCEPTION | Design and plan before any code | brainstorm, write-plan, confidence-check |
| CONSTRUCTION | TDD implementation with quality gates | tdd, gicl-start, verify |
| OPERATIONS | Deploy, monitor, maintain | gcp-monorepo-deploy, debug, checkpoint |

---

## The 8-Step Skill Chain

Every significant task follows this chain. Skills enforce quality gates between steps.

```
1. /aicodepath-knowledge       Read planning/tasks/knowledge
2. /aicodepath-brainstorm      Design before any code (HARD-GATE)
3. /aicodepath-write-plan      TDD-first implementation plan
4. /aicodepath-confidence-check Verify confidence ≥ 70%
5. /aicodepath-tdd             Test-first implementation (HARD-GATE)
6. /aicodepath-gicl-start      Quality loop until score ≥ 90
7. /aicodepath-verify          Evidence-based completion check
8. /aicodepath-checkpoint      Save progress, update tasks.md
```

**HARD-GATEs block you from writing code until prerequisite steps are complete.** This is intentional — skipping design leads to rework.

---

## Starting a New Feature

### Step 1: Session start
When you open Claude Code, `session-start-hook.js` automatically:
- Injects the `using-aicodepath` skill context
- Checks for a recent checkpoint to resume

### Step 2: Load knowledge
```
/aicodepath-knowledge
```
Reads `aicodepath-docs/adr-log.md`, `tasks.md`, and `knowledge.md` to restore context without re-reading the full codebase.

### Step 3: Brainstorm design
```
/aicodepath-brainstorm
```
Explores design options before implementation. Produces a design summary written to `aicodepath-docs/adr-log.md`. **No code is written at this step.**

### Step 4: Write the plan
```
/aicodepath-write-plan
```
Creates a detailed, TDD-first implementation plan. Breaks work into units. Updates the active task file in `aicodepath-docs/task/`.

### Step 5: Confidence check
```
/aicodepath-confidence-check
```
Self-assessment across 5 dimensions (requirements, design, environment, risks, test strategy). Must score ≥ 70% to proceed. If below threshold, identifies what to clarify first.

### Step 6: TDD implementation
```
/aicodepath-tdd
```
Red-Green-Refactor cycle. **Tests must be written first.** Every unit of code must have a failing test before implementation begins.

### Step 7: GICL quality loop
```
/aicodepath-gicl-start
```
Iterative quality improvement until score ≥ 90:
- Tests (35%)
- Guidelines compliance (20%)
- Architecture (15%)
- Duplication (20%)
- Authenticity (10%)

### Step 8: Verify completion
```
/aicodepath-verify
```
Four-Question Self-Check:
1. Does it match the original requirement?
2. Are all tests passing? (show output)
3. Is the score ≥ 90?
4. Are there no known regressions?

Must show actual command output as evidence — "it should work" is not acceptable.

### Step 9: Checkpoint
```
/aicodepath-checkpoint
```
Saves current state to `aicodepath-docs/checkpoints/`. Updates `tasks.md` with completion status.

---

## Resuming After a Break

```
/aicodepath-resume
```

Restores phase, quality gate state, active unit, and pending tasks from the last checkpoint. Use at the start of every session after the first.

---

## Phase Transitions

Announce phase transitions explicitly:
- "Design approved → invoking `/aicodepath-write-plan` for implementation plan"
- "Plan ready → invoking `/aicodepath-tdd` to start implementation"
- "Implementation done → invoking `/aicodepath-verify` to confirm completion"

The `pre-flight-check.js` hook fires on every user prompt and enforces phase-appropriate behavior.

---

## Checking Status

```
/aicodepath-status
```

Shows current phase, GICL score, active unit, quality gate state, and recommended next action.

---

## Working with the Knowledge Files

Three files persist context across sessions:

| File | Purpose | Updated by |
|------|---------|-----------|
| `aicodepath-docs/adr-log.md` | ADRs, design decisions | brainstorm, write-plan skills |
| `aicodepath-docs/task/` | Task status and assignments (per-sprint files) | write-plan, checkpoint skills |
| `aicodepath-docs/knowledge.md` | Lessons learned, patterns | GICL learn phase, learn skill |

Read all three at session start via `/aicodepath-knowledge`.

---

## Skipping Steps (When Acceptable)

Some tasks are simple enough to skip full ceremony:

| Task type | Acceptable shortcuts |
|-----------|---------------------|
| Bug fix (< 20 lines) | Skip brainstorm; use debug → tdd → verify |
| Config change | Skip tdd; use verify |
| Documentation only | Skip everything except verify |
| Hotfix in OPERATIONS | Start at step 5 (tdd); checkpoint immediately after |

**When in doubt, run the full chain.** The overhead is low; the rework from skipping is not.
