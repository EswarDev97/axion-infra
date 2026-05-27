---
name: aicodepath-acceptance
description: Sprint acceptance gate — runs shell checks against design doc criteria, blocks checkpoint until all pass.
user-invocable: true
allowed-tools: Bash, Read, Glob
argument-hint: "[--dry-run] [--plan <path>]"
---

# AICodePath Acceptance Criteria Runner

Sprint-close gate. Reads the design doc, executes every acceptance criterion as a shell check, and produces an evidence-backed PASS/FAIL report. Nothing moves to checkpoint until this reports zero failures.

This skill sits at the top of the quality stack:

```
gicl-start → verify (task-level) → commit (batch) → acceptance (sprint-level) → checkpoint
```

## Cadence Rule

Acceptance is a **sprint-end** gate, not a batch-end gate. Running acceptance at batch boundaries produces false failures because not all tasks are complete yet.

| Boundary | Gates | Skills |
|----------|-------|--------|
| **Batch end** | Commit + verify + checkpoint | `/aicodepath-verify` → `/aicodepath-commit` → `/aicodepath-checkpoint` |
| **Sprint end** | Acceptance + merge + cleanup | `/aicodepath-acceptance` → merge → worktree remove |

Running acceptance at batch boundaries is incorrect — it will fail on criteria that reference tasks in later batches. Only run acceptance when ALL batches in the sprint are complete.

<HARD-GATE>
Do NOT mark any sprint, track, or milestone DONE and do NOT invoke /aicodepath-checkpoint until this skill reports 0 FAIL items. Evidence is required — assertion is not evidence.
</HARD-GATE>

---

## Step 1 — Locate the Design Doc

```
Priority order:
  1. --plan <path> argument (user override — use verbatim)
  2. Latest file in aicodepath-docs/plan/*-design.md by date prefix (YYYY-MM-DD);
     also check aicodepath-docs/design/*-design.md for design docs created after ADR-006
  3. If no plan/ directory: create it with mkdir -p, then ask user for the design doc path
  4. If multiple docs with same date: list them, ask user to choose
```

Read the selected design doc fully before proceeding.

### Step 1a — Read Branch Lifecycle from Plan

Locate the `## Branch Lifecycle` section in the plan document (not the design doc):
```
Priority order:
  1. Latest file in aicodepath-docs/plan/*-plan.md by date prefix;
     also check aicodepath-docs/plan/*-plan.md for plans created after ADR-006
  2. Same directory as the design doc, with -plan.md suffix
```

From the Branch Lifecycle section, extract:
- Which branches exist and their current state
- Which batch commits have been made (and which are missing)
- Whether merge/remove/clear tasks are still open

This makes acceptance **plan-driven** — it discovers branch state from the plan rather than relying on runtime arguments or assumptions about what was done in prior sessions.

If no Branch Lifecycle section exists, warn:
> No Branch Lifecycle section found in plan. Branch-related acceptance criteria will be checked via git commands directly.

### Step 1b — Security Sprint Detection

Scan the design doc for component types. If `api`, `security`, or `auth` are
present AND no `vapt_scan` criterion exists in the acceptance table:

> ⚠️ This sprint touches [api/security/auth] — consider running `/aicodepath-vapt`
> before checkpoint. Add a VAPT criterion to the design doc to make this a hard gate.

This is advisory only — it does not block the acceptance run.

---

## Step 2 — Extract the Acceptance Table

Find the Markdown table with `Criterion` and `Measurable` column headers. Example:

```markdown
| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | No hardcoded secrets | `grep -r "password\s*=" config/` → 0 lines |
| 2 | Type checks pass | `npx tsc --noEmit` → exit 0 |
```

If no acceptance table exists in the design doc, report:
> "No acceptance table found in [filename]. Add a `| Criterion | Measurable |` table to proceed."

Then stop — do not invent criteria.

---

## Step 3 — Classify Each Criterion

Parse the Measurable column and map each row to a check type:

| Check type | When to use | Passes when |
|------------|-------------|-------------|
| `grep_zero` | "→ 0 lines", "no X in Y", "must not contain" | grep returns 0 matches |
| `grep_nonzero` | "→ ≥1 lines", "must exist in", "must contain" | grep returns ≥1 match |
| `exit_zero` | "→ exit 0", "exits 0", compiler/test commands | command exits with code 0 |
| `wc_lt N` | "< N lines", "under N lines", "at most N" | wc -l returns < N |
| `file_exists` | "file X exists", "path must exist" | test -f / test -d passes |
| `file_gone` | "file X must not exist", "removed", "deleted" | test -f / test -d fails |
| `vapt_scan` | "no OWASP violations", "vapt clean", "security scan passes" | `/aicodepath-vapt --static-only` exits with 0 critical/high findings |

**Verbatim extraction**: if the Measurable column contains a backtick-wrapped shell command, extract and run it as-is. This is preferred — it's unambiguous.

**AI synthesis fallback**: if the Measurable is natural language (e.g., "no hardcoded passwords in config files"), synthesize a shell command. Before running, show it to the user:

```
[synthesized] grep -rn "password\s*=" config/ --include="*.json"
Running this command for: "no hardcoded passwords in config files"
Proceed? (or provide the command you'd like to run instead)
```

Synthesized commands are marked `[synthesized]` throughout the report.

---

## Step 4 — Dry-Run Mode

If `--dry-run` flag is present, print all commands in phase order without executing anything:

```
DRY RUN — commands that would execute:

Phase 1 (Instant):
  [1] file_exists  → test -f src/auth/middleware.ts
  [2] file_gone    → test ! -f src/auth/old-handler.ts

Phase 2 (Fast):
  [3] grep_zero    → grep -r "allow_origins=\[\"*\"\]" services/

Phase 3 (Slow):
  [4] exit_zero    → npx tsc --noEmit (timeout: 120s)

No commands were executed.
```

Then stop. Do not produce a PASS/FAIL report in dry-run mode.

---

## Step 5 — Execute in Phases

Run checks in this order to fail fast on cheap operations:

**Phase 1 — Instant** (≤1s per check): `file_exists`, `file_gone`
**Phase 2 — Fast** (≤5s per check): `grep_zero`, `grep_nonzero`, `wc_lt`
**Phase 3 — Slow** (≤120s per check): `exit_zero` (compilers, test runners, builds)

Default timeout: 30s. Build commands (tsc, npm test, pytest, cargo build): 120s.

Run all phases even if earlier phases have FAILs — report all failures together.

On timeout: status = `⏱ TIMEOUT`, treated as FAIL for gate purposes.

---

## Step 6 — Regression Check

Check for a prior report at:
```
aicodepath-docs/plan/<design-name>-acceptance-report.json
```

If it exists, compare current results against it:
- Criterion passed before but fails now → `⚠️ REGRESSION` (not `❌ FAIL`)
- Criterion failed before and still fails → `❌ FAIL`
- New criterion (not in prior report) → `❌ FAIL` or `✅ PASS` as normal

Regressions are always highlighted separately — they indicate a change broke something that was working.

---

## Step 7 — Report

### Markdown Table

```markdown
## Acceptance Report — {date} — {design-doc-name}

| # | Criterion | Command | Type | Result | Evidence |
|---|-----------|---------|------|--------|----------|
| 1 | No CORS wildcards | grep -r 'allow_origins...' services/ | grep_zero | ✅ PASS | 0 matches (8ms) |
| 2 | tsc exits 0 | npx tsc --noEmit | exit_zero | ⚠️ REGRESSION | exit 1 (was exit 0 in prior run) |
| 3 | Auth file exists | test -f src/auth/middleware.ts | file_exists | ✅ PASS | exists (1ms) |
| 4 | No secrets in config | [synthesized] grep -rn password config/ | grep_zero | ❌ FAIL | 2 matches (see below) |

**Summary: 2/4 passed. 1 FAIL · 1 REGRESSION — checkpoint blocked.**
```

### Failure Details

For each FAIL, REGRESSION, or TIMEOUT — show full output:

```markdown
### ❌ FAIL — #4 No secrets in config
Command: grep -rn "password" config/
Output:
  config/db.json:12:  "password": "hunter2"
  config/db.json:18:  "admin_password": "root"
Suggested fix: Remove hardcoded credentials from config/db.json lines 12 and 18.
               Use environment variables or a secrets manager instead.

### ⚠️ REGRESSION — #2 tsc exits 0
Command: npx tsc --noEmit
Exit code: 1 (was 0 in prior run at 2026-03-14T10:22:00Z)
Output:
  src/auth/middleware.ts(42,7): error TS2345: ...
Suggested fix: Revert changes to src/auth/middleware.ts or fix the type error at line 42.
```

### JSON Artifact

Write the following file (create `aicodepath-docs/plan/` if it doesn't exist):

```json
{
  "design_doc": "2026-03-15-api-security-design.md",
  "run_at": "2026-03-15T14:23:00Z",
  "summary": { "total": 4, "passed": 2, "failed": 1, "regressions": 1, "timeouts": 0 },
  "results": [
    {
      "index": 1,
      "criterion": "No CORS wildcards",
      "command": "grep -r 'allow_origins=[\"*\"]' services/",
      "synthesized": false,
      "check_type": "grep_zero",
      "status": "PASS",
      "evidence": "0 matches",
      "elapsed_ms": 8
    }
  ]
}
```

---

## Step 8 — Worktree Cleanup Check

Before the gate decision, read `aicodepath-docs/state/active-worktree.json` (if it exists) and check the `added_dirs` field:

```
If added_dirs is non-empty:
  Print:
    ⚠️  These directories were registered via --add-dir for this worktree:
      - /path/to/dir1
      - /path/to/dir2
    After removing the worktree, start your next session WITHOUT these --add-dir flags.
    If your current session is still active, run /remove-dir <path> for each one.

  Confirm with user: "Understood — proceeding to gate decision."

If added_dirs is empty or file does not exist:
  Continue silently.
```

This surfaces stale additional directories before `active-worktree.json` is deleted, so the user knows to stop passing them to future sessions.

---

## Step 9 — Gate Decision

```
All PASS (no FAIL, REGRESSION, TIMEOUT)
  → Print: "✅ Sprint acceptance complete — {N}/{N} criteria passed."
  → Invoke /aicodepath-learn to extract durable preferences from this sprint
  → Invoke /aicodepath-checkpoint with message: "Sprint acceptance: {N}/{N} passed — {design-doc-name}"

Any FAIL, REGRESSION, or TIMEOUT
  → Print: "❌ Checkpoint blocked — {N} issue(s) must be resolved first."
  → List each issue with suggested fix
  → Do NOT invoke /aicodepath-checkpoint
  → After user fixes: re-run /aicodepath-acceptance (not just the failing checks)
```

Re-running only the failing checks is not acceptable — always run the full suite to catch regressions introduced by fixes.

---

## Reference

For sample acceptance tables in various tech stacks, read:
`resources/criterion-examples.md`

---

### Step 9a — Sprint Archival (after gate PASS, before checkpoint)

When all criteria pass, archive the sprint's artifacts before invoking `/aicodepath-checkpoint`:

1. Read the `cr_number` from session-state (seeded by `/aicodepath-brainstorm` per T8):
   ```js
   const { SessionStateManager } = require('./lib/session-state-manager');
   const crNumber = new SessionStateManager().getState('cr_number');
   ```

2. Rebuild the canonical 7-column tasks.md from DB using `sprint-history.rebuildTasksMdFromDb` and write it to the per-sprint snapshot:
   ```js
   const { rebuildTasksMdFromDb } = require('./lib/sprint-history');
   const md = rebuildTasksMdFromDb(db, crNumber);
   // Write to aicodepath-docs/task/<cr_number>-tasks.md
   ```

3. Flip plan and design artifacts to `archived` status — the durable history record that distinguishes completed sprints from active work:
   ```sql
   UPDATE artifacts SET status = 'archived', updated_at = datetime('now')
   WHERE cr_number = ? AND artifact_type IN ('plan', 'design');
   ```

---

## NEVER

- Skip a criterion because it "obviously passes" — run every check, show every result
- Mark PASS without pasting actual command output as evidence
- Create a checkpoint if any criterion is FAIL, REGRESSION, or TIMEOUT
- Run a synthesized command without first showing it to the user
- Treat a REGRESSION as a new FAIL — they have different root causes and different fix strategies
- Re-run only failed checks after a fix — always run the full suite
