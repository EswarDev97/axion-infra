---
name: aicodepath-composite-worker
description: Run the full TDD→Implement→Review→Build→Commit cycle for one task — for swarm workers or parallel spawns.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill
argument-hint: "<task-description> [--no-commit] [--no-review]"
---

# AICodePath Composite Worker

Runs the complete implementation cycle for a **single task** in one self-contained agent turn:

```
Red Test → Green Code → Refactor → Self-Review → Build → Commit
```

This skill is the building block used by parallel mode and swarm workers. It assumes design is already approved and the task is clearly defined.

## Execution Sequence

### Step 1 — Parse Task

Read the task definition. Extract:
- Target files to create or modify
- Acceptance criteria / DoD
- Dependencies (must already be done)

If task definition is ambiguous, stop and ask before proceeding.

### Step 2 — Red (Failing Test)

<HARD-GATE>
Do NOT write any production code before a failing test exists.
</HARD-GATE>

```bash
# Write a failing test for the target behaviour
# Run to confirm it fails (not errors — fails)
npm test <test-file> 2>&1 | tail -20
```

If the test errors (import failure, syntax error) rather than failing, fix the test setup first.

### Step 3 — Green (Implementation)

Write the minimal code to make the test pass. No extras, no refactoring yet.

```bash
npm test <test-file> 2>&1 | tail -20
# Must show: 1 passed (or N passed)
```

### Step 4 — Refactor

Improve code clarity without changing behaviour:
- Remove duplication
- Improve naming
- Extract helpers if the function exceeds ~40 lines

Re-run tests after refactor to confirm still green.

### Step 5 — Self-Review

Check for common issues before committing:

| Check | Criterion |
|-------|-----------|
| Security | No hardcoded credentials, no SQL injection, no XSS vectors |
| Completeness | All DoD criteria verifiably met |
| Test coverage | Happy path + at least one edge case covered |
| No stubs | No TODO/FIXME left in production code paths |
| Scope | Only touches files in the task definition |

If any check fails → fix before proceeding. Do NOT skip self-review with `--no-review`.

> `--no-review` skips self-review only for emergency hotfixes in live incidents. Document reason in commit message.

### Step 6 — Build Verification

```bash
# Confirm the full suite still passes (no regressions)
npm test 2>&1 | tail -30

# If TypeScript project
npx tsc --noEmit 2>&1 | head -20
```

Stop and escalate if build fails — do not commit broken code.

### Step 7 — Commit (unless --no-commit)

```bash
git add <task-files>
git commit -m "feat(<scope>): <task summary>

<DoD met: list criteria>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Output the commit hash. Mark task DONE [hash] in tasks.md.

## Failure Handling

| Failure | Action |
|---------|--------|
| Test won't turn green after 3 attempts | Stop, output BLOCKED with diagnosis |
| Build fails after green tests | Investigate regression, fix or stop with BLOCKED |
| Self-review finds security issue | Fix before commit — never skip |
| Scope creep detected | Stop, output BLOCKED, ask for task clarification |

## Output Format

On success:
```
✅ Task complete
Commit: abc1234
Tests: N passed
DoD: [list of criteria met]
```

On failure:
```
🚫 BLOCKED: <reason>
Last error: <error message>
Files modified: <list>
Suggested fix: <diagnosis>
```

## NEVER

- **NEVER** commit with a failing test in the suite — one red test means broken code ships.
- **NEVER** mark DONE without showing the commit hash as evidence.
- **NEVER** touch files outside the task definition — scope creep breaks other workers in parallel mode.
- **NEVER** skip the Red step — green-first code is not TDD and produces untested edge cases.
