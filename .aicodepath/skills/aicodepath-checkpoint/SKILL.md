---
name: aicodepath-checkpoint
description: Create and manage session checkpoints — safe recovery and rollback before risky changes or large refactors.
argument-hint: "[list|show|compare|create] [options]"
user-invocable: true
allowed-tools: Read, Bash
---

# Checkpoint Management

Create and inspect session recovery points. The key expert insight is **timing** — checkpoints taken before destructive operations are valuable; checkpoints taken after are not.

---

## Pre-condition: Clean Working Tree

Before creating any checkpoint:

1. Check `git status --porcelain` in the active worktree (read `aicodepath-docs/state/active-worktree.json` for path, fallback to project root)
2. If uncommitted changes exist:
   > **BLOCKED**: Cannot checkpoint — {N} uncommitted files.
   > Run `/aicodepath-commit` first, then retry.
3. If clean: proceed to checkpoint creation.

This pre-condition is also enforced by the `checkpoint-guard-hook.js` (PreToolUse Write on `checkpoints/`). The skill instruction tells Claude the workflow; the hook blocks the file write at tool level as defense-in-depth.

---

## When to Create a Manual Checkpoint

Automatic checkpoints fire at stage transitions, but manual checkpoints matter in these non-obvious situations:

| Situation | Why checkpoint NOW (not after) |
|-----------|-------------------------------|
| About to touch >3 files in one operation | Changes become entangled — individual file rollback is impossible |
| Before any dependency update | `package.json` + lockfile changes are hard to separate from code changes |
| Before a schema migration | DB state diverges from code state; partial rollback is dangerous |
| Before deleting or moving files | Deletions are not tracked by default in some editors; checkpoint captures content |
| Before a GICL iteration that will rewrite a large module | Score regression may require full restore, not just a git revert |
| Before context window approaches limit | Checkpoint state survives context compaction — conversation history compacts, but file state in DB does not |

**The timing asymmetry**: "before" gives you a restore point. "after" only gives you a record.

---

## Checkpoint vs Commit: The Decision

These are not substitutes — they serve different recovery granularities:

| Situation | Action | Why |
|-----------|--------|-----|
| Change is atomic, tested, deployable | `git commit` | Permanent; survives DB reset; shareable |
| Files not yet tracked by git AND mid-session | checkpoint | Captures untracked state git misses |
| Pre-risky operation (matches the 5 situations above) | checkpoint THEN commit | Belt and suspenders for irreversible ops |
| Session ending, all tasks done | retrospective → checkpoint → commit | Retrospective makes the checkpoint meaningful |
| Post-risky operation (already done) | `git commit` only | Checkpoint after is a record, not a restore point |

**Before creating a manual checkpoint, ask yourself:**
1. Am I *before* or *after* the risky operation? (before = restore point; after = record only)
2. Does this match one of the 5 situations in the table above?
3. Have I committed recently enough that git history is covered independently?

## Before Creating a Checkpoint (Mid-Session)

For mid-session and pre-risky-operation checkpoints (not session-end):

> Have you updated `aicodepath-docs/knowledge.md` with lessons from this session?
> Run `/aicodepath-knowledge` if any of the following apply:
> - A non-obvious bug was discovered
> - An architectural decision was made
> - A GICL failure pattern was resolved
> - A task was added or status changed in tasks.md
>
> Skip if this is a pre-risky-operation checkpoint with no new lessons to record.

This is advisory — it does not block checkpoint creation.
For session-end retrospective requirements, see `## Session End: Retrospective Before Checkpoint` below.

---

## Commands

### Create Manual Checkpoint

```bash
node .aicodepath/bin/aicodepath.js checkpoint create --message "Before auth refactor"
```

Name it by what you're about to do, not what you just did. A message like "Before extracting UserService from AuthController" is actionable at restore time; "refactored auth" is not.

### List Checkpoints

```bash
node .aicodepath/bin/aicodepath.js checkpoint list
```

Shows checkpoint ID, timestamp, phase/stage, and tracked file count. If the list is empty after a session, check that the DB is initialised — run `bash .aicodepath/scripts/init-knowledge-base.sh`.

### Show Checkpoint Details

```bash
node .aicodepath/bin/aicodepath.js checkpoint show chk_abc123
```

Shows tracked files with create/modify/delete operations, diff previews, and conversation turn count. Use this before rewinding to confirm the checkpoint has the state you expect.

### Compare Two Checkpoints

```bash
node .aicodepath/bin/aicodepath.js checkpoint compare chk_abc123 chk_def456
```

Useful after a GICL session to audit what changed across iterations. Hash differences in the compare output with no content diff usually means line-ending normalisation — not a real change.

---

## Interpreting Checkpoint Output

| Output symptom | Likely cause | Action |
|----------------|-------------|--------|
| File shows `[Binary file changed]` | Binary file — content not diffable | Restore manually if needed |
| File >10MB shows as skipped | Size limit — content not captured | Commit to git before checkpoint |
| Hash diff but identical content | Line-ending normalisation (CRLF/LF) | Safe to ignore |
| Checkpoint list empty | DB not initialised or wrong DB path | Run `init-knowledge-base.sh` |
| `chk_` ID not found | Pruned (keeps last 50) | Use `git log` as fallback |
| Tracked file count unexpectedly low | Files modified outside Claude Code | Verify with `show` — git is the fallback |

### When Stuck — Diagnostic Paths

| Problem | First check | If that fails |
|---------|------------|---------------|
| `show` returns fewer files than expected | Files modified outside Claude Code aren't tracked | Use `git diff` to see what's outside the checkpoint |
| Rewind restores wrong version | Wrong checkpoint ID used | Run `list` + `show` on target checkpoint to confirm content before rewind |
| Checkpoint list always empty | DB not initialised | Run `init-knowledge-base.sh`; if still empty, check `pathResolver` — wrong DB path |
| Compare shows changes you didn't make | Another process modified files | Check `git log` for commits between checkpoint timestamps |

---

## Session End: Retrospective Before Checkpoint

<HARD-GATE>
When a session completes (all tasks DONE, score ≥90, verified), write the retrospective to `aicodepath-docs/knowledge.md` BEFORE creating the checkpoint. A checkpoint without a retrospective captures files but loses the reasoning — the retrospective is what makes the recovery point meaningful, not just restorable.
</HARD-GATE>

**Read `references/retrospective-format.md` when writing the retrospective** — contains the format template. Do NOT load it for checkpoint create/list/show/compare operations.

**Trigger retrospective when:** session completes successfully, GICL ended early due to repeated failures, a non-obvious bug was discovered, or an architectural decision changed mid-session.

**Skip when:** single-task session with no surprises, pure documentation or config change, session was interrupted.

---

## NEVER

- **NEVER** create a post-change checkpoint without noting that a pre-change checkpoint is more valuable — "before" is a restore point; "after" is only a record. Checkpoint timing is the entire value proposition.
- **NEVER** agree to skip a pre-change checkpoint because "the change is small" or "only 2 files" without evaluating against the 5-situation table — the table, not subjective size, determines checkpoint necessity.
- **NEVER** create a checkpoint as a substitute for committing to git. Checkpoints are session-scoped and pruned after 50. Git is permanent.
- **NEVER** rely on a checkpoint taken >24 hours ago for production rollback — the DB may have been reset or the files may have diverged from the captured state.
- **NEVER** skip the `show` command before rewinding. Verify the checkpoint has the files you expect — a checkpoint with 2 tracked files will not restore files modified outside of Claude Code.
- **NEVER** checkpoint mid-GICL without also noting the current score — a checkpoint without its quality gate state is hard to evaluate at restore time.
- **NEVER** skip the retrospective after a session with 3+ GICL iterations — every repeated failure that goes unrecorded will be repeated in the next session.

---

## See Also

- `/aicodepath-rewind` — Restore to a checkpoint (use `show` first)
- `/aicodepath-status` — View current phase and quality gate state
- `/aicodepath-knowledge` — Read/write adr-log.md, tasks.md, knowledge.md
