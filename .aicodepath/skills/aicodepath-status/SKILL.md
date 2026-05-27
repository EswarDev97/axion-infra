---
name: aicodepath-status
description: Check current workflow phase, quality gate state, and blockers — recommends the right next action.
version: 1.1.0
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[--detailed] [--artifacts]"
---

# AICodePath Status

Show phase, quality gates, and recommended next action. The key expert value here is **interpreting** the output — raw status is data, but what to do about it requires judgment.

---

## Active Worktree Check

Before any other status output, check for an active worktree:

1. Read `aicodepath-docs/state/active-worktree.json` — if missing, skip this section
2. Run `git status --porcelain` in `worktree_path`
3. Read `batches_since_commit` from the JSON

**If dirty OR `batches_since_commit > 0`:**
```
ACTIVE WORKTREE: <branch>
  Path          : <worktree_path>
  Status        : DIRTY — <N> uncommitted files
  Last commit   : <last_commit or "none"> (<batches_since_commit> batches ago)
  Action        : Run /aicodepath-commit before proceeding
```

**If clean AND `batches_since_commit == 0`:**
```
ACTIVE WORKTREE: <branch>
  Path   : <worktree_path>
  Status : CLEAN
```

This makes dirty worktrees visible from the session after the one that created them — preventing the orphaned-code scenario where uncommitted work is invisible until someone manually checks.

---

## Reading the Status Output

### Phase + Score → Action Map

| Phase | Score | Interpretation | Recommended Action |
|-------|-------|---------------|--------------------|
| CONSTRUCTION | ≥90 | Quality gate passed | Run `/aicodepath-verify` then commit |
| CONSTRUCTION | 70–89 | Within range, improving | Continue GICL iterations |
| CONSTRUCTION | <70 | Below threshold | Do NOT push — identify lowest-scoring component |
| CONSTRUCTION | Score dropped >10pts | Regression | Rewind to last checkpoint before score drop |
| INCEPTION | Blockers present | Gate-violation | Blockers must resolve before CONSTRUCTION starts |
| INCEPTION | Blockers are "soft warnings" | Not blocking | Review but may proceed |
| PRE-FLIGHT | Failed checks | Environment broken | Fix before any other work |
| OPERATIONS | — | Post-implementation | Run deploy or verification workflow |

**Non-obvious rule**: A CONSTRUCTION score of 0 usually means the DB session is not active, not that all code is wrong. Check with `node .aicodepath/lib/gicl-session-manager.js active` before panicking.

### Blockers vs Soft Warnings

Status output lists both blockers and warnings. They require different responses:

- **Blockers** (gate-violations): Cannot advance phase without resolving. Examples: failing tests, missing required artifacts, schema validation errors.
- **Soft warnings**: Informational. Examples: coverage below ideal threshold, unused exports detected. Log them but do not stop work.

Never treat a warning as a blocker — it causes unnecessary process stalls.

---

## Commands

```bash
node .aicodepath/bin/aicodepath.js status              # overview
node .aicodepath/bin/aicodepath.js status --detailed   # full breakdown with per-unit scores
node .aicodepath/bin/aicodepath.js status --artifacts  # include generated artifact listing
```

---

## Common Status Anomalies

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Phase shows CONSTRUCTION but no active unit | Session not started or DB stale | Run `/aicodepath-gicl-start` |
| Quality score shows 100 with no tests run | Tests component unmeasured (defaults to 100) | Run test suite first |
| Blockers list is non-empty but from a prior phase | Phase state not advanced after completion | Run phase transition command |
| Status shows wrong phase after resuming | `aicodepath-state.md` is stale (>24h) | Run `/aicodepath-resume` to re-sync |
| Artifacts list is empty | Scan path wrong or docs not yet generated | Check `aicodepath-docs/` exists |

---

## NEVER

- **NEVER** push to a shared branch when CONSTRUCTION score is <90 — the quality gate exists precisely to catch this.
- **NEVER** assume a score of 100 means all dimensions are verified — unmeasured dimensions default to 100, which inflates the total.
- **NEVER** ignore a phase blocker by advancing manually — blockers exist because downstream work makes wrong assumptions without them resolved.
- **NEVER** run status as a substitute for reading the active task file in `aicodepath-docs/task/` — status shows state, the task file shows intent.

---

## See Also

- `/aicodepath-gicl-start` — Start or resume a quality iteration session
- `/aicodepath-verify` — Formal verification before claiming done
- `/aicodepath-checkpoint list` — View available restore points
