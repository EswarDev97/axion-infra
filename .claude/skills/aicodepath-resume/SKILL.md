---
name: aicodepath-resume
description: Resume a previous AICodePath session — checks handoffs for AIDLC workflow state, falls back to checkpoint DB.
version: 2.1.0
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[--force <checkpoint_id> | --list | --verbose]"
---

# AICodePath Resume

Restore and continue a previous session. The key expert knowledge is interpreting resume output correctly — a stale resume summary can lead you to continue in the wrong direction.

---

## Before You Trust the Resume Summary

Ask these questions before acting on what the resume shows:

| Question | Why it matters |
|----------|---------------|
| How old is the checkpoint? | <2h: trust it fully. 2–24h: verify quality gate state still holds. >24h: run `/aicodepath-status` to confirm — state may have drifted |
| Does the git log match the checkpoint? | `git log --oneline -5` — if commits were made outside Claude Code, the checkpoint's tracked files are incomplete |
| Is the active GICL session still open? | `node .aicodepath/lib/gicl-session-manager.js active` — a checkpoint from mid-GICL without an active session needs GICL restarted |
| Are the "Suggested Next Actions" still valid? | They were generated at checkpoint time. If the codebase changed since, re-read the active task file in `aicodepath-docs/task/` instead |

---

## Resume Priority Order

**Step 0**: Check for active worktree
```bash
cat aicodepath-docs/state/active-worktree.json 2>/dev/null
```
If present, announce prominently: "**Active worktree detected**: `<worktree_path>` (branch: `<branch>`). All implementation work must happen there — not in the main repo." Continue to Step 1.

**Step 1**: Check `aicodepath-docs/handoffs/` for files < 24h old
```bash
ls -lt aicodepath-docs/handoffs/ | head -5
```
If a recent handoff exists, read it fully.

**Step 2**: If recent handoff found → read it fully
- **Step 2a**: Check for `## AIDLC Workflow State` section
- **Step 2b**: If found → extract `phase`, `next_skill`, `batch`, `task`, `plan_file`
  - Announce: "Restoring AIDLC workflow: Phase=`<phase>`, resuming at `<next_skill>` for Batch `<n>` Task `<n>`: `<title>`"
  - Verify the active task file in `aicodepath-docs/task/`: confirm Batch=N rows exist with Status=TODO
  - IMMEDIATELY invoke the specified next skill with batch/task context
- **Step 2c**: If no `## AIDLC Workflow State` section → present handoff as context; ask user: "Which skill should we invoke next?"

**Step 3**: If no recent handoff → fall back to checkpoint DB (see Checkpoint Age table below)

---

## Checkpoint Age → Recommended Action

| Age | Trust level | First action after resume |
|-----|------------|--------------------------|
| <2 hours | Full — continue directly | Read suggested next actions and proceed |
| 2–24 hours | Partial — verify quality | Run `/aicodepath-status` before implementing |
| >24 hours | Low — verify everything | Read the active task file in `aicodepath-docs/task/` + `adr-log.md` first; run status check |
| >7 days | Minimal | Treat as a new session; use checkpoint only for context |

---

## Batch Resume

When resuming a batched plan, find the active batch:
```bash
grep "Batch=" aicodepath-docs/task/*-tasks.md | grep "TODO"
```
Start from the first task in the lowest-numbered Batch with Status=TODO.

**Note on legacy tasks.md**: The `Batch=` grep only works on plans written after the 6-column format was introduced. For legacy 5-column tasks.md files, the grep returns 0 — fall through to asking the user: "Which task should we start from?"

---

## NEVER

- **NEVER** start implementing from a resume summary without first running `/aicodepath-status` if the checkpoint is >2 hours old — quality gate state may have drifted (DB updated, tests broken, dependencies changed).
- **NEVER** trust the checkpoint's task list as ground truth if `git log` shows commits made outside the AICodePath session — those changes aren't tracked in the checkpoint's file diff and the task status may be wrong.
- **NEVER** use `--force` with a checkpoint older than the latest without reading what changed in between — restoring an old checkpoint while newer files exist can create inconsistent state.
- **NEVER** skip reading the active task file in `aicodepath-docs/task/` on a >24h resume — the task list there reflects the full picture including changes made in prior sessions that the auto-summary may truncate.
- **NEVER** invoke the `next_skill` from `## AIDLC Workflow State` without first verifying the active task file in `aicodepath-docs/task/` has rows with that Batch number and Status=TODO — a handoff written before a plan was created, or before the task file was updated, may reference a non-existent batch and resume into a blocking dependency instead of the first executable task.
- **NEVER** treat the AIDLC Workflow State fields as authoritative if any field still contains `[TODO]` — an incomplete state block means the pause skill didn't finish populating it, and invoking the `next_skill` value will resume into the wrong workflow step. Ask the user which skill to invoke instead.

---

## Technical Notes

- Detection runs at session start automatically — auto-detects checkpoints <24h old
- Manual invoke gives expanded details beyond auto-detection summary
- Checkpoint storage: `aicodepath-docs/checkpoints/` (keeps last 50)
- Session state modules: `checkpoint-manager.js`, `session-resumption.js`, `session-state-manager.js`

---

## See Also

- `/aicodepath-checkpoint list` — Browse all checkpoint IDs
- `/aicodepath-status` — Verify current phase after resuming
- `aicodepath-docs/task/` — Authoritative task files (more reliable than checkpoint summary for long gaps)
