---
name: aicodepath-rewind
description: Restore session to a previous checkpoint — for failed directions, GICL regression, or hard-to-reverse changes.
argument-hint: "[checkpoint-id] [--mode code|conversation|both]"
user-invocable: true
allowed-tools: Read, Bash
---

# Rewind to Checkpoint

Restore to a previous safe state. The key expert decision is choosing the right **mode** — rewinding too much loses work; rewinding too little leaves you with a broken state.

---

## Before You Rewind

Run these two steps first — skipping them is the most common rewind mistake:

```bash
# 1. Check for uncommitted work that won't be captured in any checkpoint
git status

# 2. Inspect the checkpoint BEFORE restoring to it
node .aicodepath/bin/aicodepath.js checkpoint show <chk_id>
```

If `git status` shows modified files that aren't in the checkpoint's tracked list, they will be overwritten silently. Stash or commit them first.

---

## Choosing the Right Mode

| Situation | Mode | Why |
|-----------|------|-----|
| Bad implementation — code is wrong but the conversation analysis was correct | `--mode code` | Preserves the reasoning; only rolls back files |
| Claude hallucinated facts about the codebase and built on bad assumptions | `--mode conversation` | Clears the bad context; keeps your file progress |
| Both code and reasoning are wrong; starting fresh on a task | `--mode both` (default) | Full restore — use this when in doubt |
| GICL score regressed >10 points from a prior iteration | `--mode code` | Target the specific iteration checkpoint, not session start |

**The non-obvious rule**: `--mode both` on a checkpoint older than 2 hours will produce a larger diff than expected — every file that changed since then gets overwritten, including files you edited manually outside Claude Code. Always use `checkpoint show` to confirm scope.

---

## Commands

### Rewind Files Only

```bash
node .aicodepath/bin/aicodepath.js rewind chk_abc123 --mode code
```

### Rewind Conversation Only

```bash
node .aicodepath/bin/aicodepath.js rewind chk_abc123 --mode conversation
```

### Rewind Both (Full Restore)

```bash
node .aicodepath/bin/aicodepath.js rewind chk_abc123
```

### List Available Checkpoints

```bash
node .aicodepath/bin/aicodepath.js checkpoint list
```

---

## After Rewinding

1. Run `git status` to confirm which files changed
2. Run `node .aicodepath/bin/aicodepath.js status` to verify phase/stage is consistent
3. If rewinding mid-GICL, re-run the score check — the session record still exists in the DB even if the files are restored

---

## NEVER

- **NEVER** rewind without first running `git status` — uncommitted files not tracked by the checkpoint will be overwritten silently with no recovery path.
- **NEVER** use `--mode both` on a checkpoint older than 2 hours without reading `checkpoint show` first — the diff will be unexpectedly large.
- **NEVER** rewind inside a worktree while the main tree has an active operation — the worktree's file references become orphaned and the DB session pointer drifts.
- **NEVER** assume a rewind fixed a hallucinated assumption — use `--mode conversation` to also clear the bad context, otherwise Claude will re-apply the same wrong reasoning.
- **NEVER** rewind as a substitute for understanding what went wrong. If you don't know why the code failed, rewind + retry will fail the same way.

---

## See Also

- `/aicodepath-checkpoint list` — Find available checkpoint IDs
- `/aicodepath-checkpoint show <id>` — Inspect before restoring
- `/aicodepath-status` — Verify session state after rewind
