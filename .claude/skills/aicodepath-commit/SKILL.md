---
name: aicodepath-commit
description: Commit at a batch boundary — stages work, updates active-worktree.json and Branch Lifecycle.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: ""
---

# AICodePath Commit

Batch-boundary commit gate. Ensures code is committed at every batch boundary so work is never orphaned in uncommitted worktrees.

**A batch boundary is reached when ALL tasks in the current batch (listed under the active batch heading in the active task file in `aicodepath-docs/task/`) are marked `[complete]`.** This skill MUST NOT run on a partial batch.

This is NOT a general-purpose git tool — use `/aicodepath-git` for branch management, conflict resolution, and history investigation. This skill is specifically for the structured commit step in the AIDLC workflow.

```
/aicodepath-verify → /aicodepath-commit → /aicodepath-learn → /aicodepath-checkpoint
```

<HARD-GATE>
Do NOT skip this skill at batch boundaries. Checkpointing without committing is the root cause of orphaned worktree code. The checkpoint-guard hook will block checkpoint writes if uncommitted changes exist.

Do NOT invoke this skill mid-task. Before proceeding, read the active task file in `aicodepath-docs/task/`. If any task in the current batch is still `[in-progress]`, exit immediately:
> "Batch not complete — [N] task(s) still in progress. Complete all tasks before committing."
Fixing git state (detached HEAD, lock files) is separate from the commit gate — fix the git issue first, then return here when the batch is actually done.
</HARD-GATE>

---

## 8-Step Commit Flow

### Step 1 — Detect Active Worktree

Read `aicodepath-docs/state/active-worktree.json`:
- If exists: use `worktree_path` as the commit directory
- If missing: use the project root (cwd) as fallback

### Step 2 — Check Git Status

Run `git status --porcelain` in the active directory.
- If clean (empty output): report "Nothing to commit — working tree is clean." and exit. This is not a failure.

### Step 3 — Stage Relevant Files

Stage all modified and new files relevant to the current batch:
```bash
git add -A
```

**Hard confirmation gate**: If `git status --short` shows **more than 50 files**, this is a mandatory hold — not a suggestion:
1. Show the full file list to the user
2. Output: `HOLD — {N} files staged. This batch is large. Review the list above.`
3. Ask the user to choose ONE of:
   - `[A] Confirm` — they have reviewed every file and all belong in this batch
   - `[B] Split` — proceed with splitting guidance (see below)
4. Do NOT proceed, offer a "force" path, or continue without an explicit choice from the user.

**If user chooses [B] Split:**
- Run `git reset HEAD` to unstage everything
- Help the user identify logical partitions (by feature area or layer, not file count)
- Guide them through `git add <files>` per partition and commit each separately
- Do NOT create a single large commit as a fallback

### Step 4 — Compose Commit Message

Format: `feat(batch-N): T1-T4 — <brief description of what was implemented>`

- `N` = current batch number (read from the active task file in `aicodepath-docs/task/`)
- Task range = tasks completed in this batch
- Description = one-line summary of the batch's purpose

### Step 5 — Execute Commit

```bash
git commit -m "<message>"
```

Capture and display the commit hash from the output.

**If `git commit` exits non-zero:**
- Display the full error output verbatim — do not summarize or truncate it
- Do NOT retry automatically
- Do NOT suggest `--no-verify`, `--no-gpg-sign`, or any bypass flag
- Diagnose the cause from the error and give ONE concrete resolution:
  - Pre-commit hook rejection → "The hook flagged [issue]. Resolve it in [file], then re-run this skill."
  - Index lock (`fatal: Unable to create .git/index.lock`) → "Another git process is running. Run: `rm -f .git/index.lock`, then re-run."
  - Detached HEAD → "Re-attach HEAD first: `git checkout <branch>`. Do not commit from detached HEAD."
  - Nothing to commit → Return to Step 2 (clean state, already handled)
- Exit the skill after diagnosis. The user resolves the issue, then re-invokes `/aicodepath-commit`.

### Step 6 — Update active-worktree.json

If `aicodepath-docs/state/active-worktree.json` exists, update these fields:
```json
{
  "last_commit": "<commit-hash>",
  "last_commit_at": "<ISO-8601 timestamp>",
  "batches_since_commit": 0,
  "status": "clean"
}
```

### Step 7 — Update Plan Branch Lifecycle

Read the active plan document from `aicodepath-docs/plan/` (the canonical plan directory):
1. Find the `## Branch Lifecycle` section
2. Tick the commit entry for the current batch with the commit hash:
   ```
   - [x] Commit: Batch N — T1-T4 (hash: abc1234)
   ```

If no Branch Lifecycle section exists, skip this step and output:
```
[aicodepath-commit] WARNING: No Branch Lifecycle section found in plan — skipping tick.
Consider adding one via /aicodepath-worktree.
```

### Step 8 — Announce Commit Summary

```
COMMITTED: Batch {N}
  Hash    : {commit-hash}
  Branch  : {branch-name}
  Files   : {count} files changed
  Tasks   : T{start}-T{end}
  Worktree: {path} (status: clean)
```

---

## Swarm Mode Rules

| Role | Commit behavior |
|------|----------------|
| **Worker** | Implements tasks only — NEVER runs `git commit`. Workers write code and report DONE. |
| **Lead** | Runs `/aicodepath-commit` after ALL workers in a batch complete and results are merged. |
| **Solo** | Runs `/aicodepath-commit` at every batch boundary before proceeding to the next batch. |

---

## NEVER

- **NEVER** commit without prior verification — `/aicodepath-verify` must pass before this skill runs. Committing unverified code defeats the quality gate.
- **NEVER** skip the plan update (Step 7) — the Branch Lifecycle section is the durable record that survives session breaks. Without it, the next session cannot determine what was committed.
- **NEVER** let a worker agent run this skill in swarm mode — workers do not own the git index. Concurrent commits from workers cause index lock conflicts and partial commits.
- **NEVER** commit generated artifacts (`aicodepath-docs/aicodepath.db`, `node_modules/`, `.env`) — these are gitignored for a reason. If `git add -A` stages them, your `.gitignore` is broken.
- **NEVER** amend the previous commit instead of creating a new one — amending rewrites history and can destroy the previous batch's commit if the session has context from prior work.
