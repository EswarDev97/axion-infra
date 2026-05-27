---
name: aicodepath-work
description: Execute implementation tasks — auto-detects solo/parallel/swarm mode from pending task count.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, TaskCreate, TaskUpdate, TaskGet, TaskList
argument-hint: "<all | task-number | task-range> [--solo | --parallel N | --swarm] [--no-commit] [--no-tdd] [--no-simplify]"
---

# AICodePath Work

Unified execution skill that auto-selects the right execution mode (solo/parallel/swarm) based on how many pending tasks exist in the active task file in `aicodepath-docs/task/`.

## Auto Mode Detection

Count pending tasks in `tasks.md` using `lib/auto-mode-detector.js`:

| Pending Tasks | Mode | Execution |
|--------------|------|-----------|
| 1 | **solo** | Direct TDD implementation, no orchestration overhead |
| 2–3 | **parallel** | Task tool with worker separation, one worker per task |
| 4+ | **swarm** | Agent Teams orchestration via `/aicodepath-swarm` |

**Explicit overrides always win** over auto-detection:

| Flag | Mode Override |
|------|--------------|
| `--solo` | Force solo regardless of task count |
| `--parallel N` | Force parallel with N workers |
| `--swarm` | Force Agent Teams orchestration |
| `--no-commit` | Skip auto-commit after implementation |
| `--no-tdd` | Skip TDD requirement (emergency use only) |
| `--no-simplify` | Skip `/simplify` step after implementation |

## Effort Scoring

Before executing any task, calculate effort score using `lib/effort-scorer.js` to recommend the appropriate **Claude Code effort level** (low / medium / high):

| Factor | Condition | Points |
|--------|-----------|--------|
| File count | ≥4 files to be modified | +1 |
| Critical dirs | Task touches `hooks/`, `lib/`, `security/`, `auth/`, `core/` | +1 |
| Keywords | Task description contains architecture, security, design, migration, refactor | +1 |
| Failure history | Same task failed before (reflexion-learner) | +2 |
| Explicit marker | `[high-effort]` in task definition | +3 |

**Score → Effort Level**:

| Score | Level | Symbol | Claude Code Setting |
|-------|-------|--------|-------------------|
| 0 | low | ○ | `effortLevel: "low"` or `CLAUDE_CODE_EFFORT_LEVEL=low` |
| 1–2 | medium | ◐ | `effortLevel: "medium"` (default) |
| ≥3 | high | ● | `effortLevel: "high"` or `CLAUDE_CODE_EFFORT_LEVEL=high` |

When score ≥ 3, include effort guidance in the task context. Claude Code's effort level controls thinking depth — configure via `/model` slider, settings.json `effortLevel`, or `CLAUDE_CODE_EFFORT_LEVEL` env var.

> **Note**: `[ultrathink]` is accepted as a legacy alias for `[high-effort]`.

## Execution Flows

### Solo Mode (1 task)

```
1. Read tasks.md — find target task
2. Mark task WIP
3. Calculate effort score → show indicator (○/◐/●)
4. If score ≥3: include effort guidance from `buildEffortGuidance('high')` in context
5. Invoke /aicodepath-tdd (Red → Green → Refactor)
6. Run /simplify (unless --no-simplify)
7. Auto-commit (unless --no-commit)
8. Mark task DONE [git-hash]
9. Update tasks.md
```

### Parallel Mode (2–3 tasks)

```
1. Read tasks.md — identify target tasks; extract `Agent` column value for each task alongside ID, content, DoD, Depends, Batch
2. Calculate effort per task
3. Mark all tasks WIP
4. Spawn N Task tool workers (one per task)
   - Each worker gets isolated context
   - High-effort tasks include effort guidance in spawn prompt
5. Workers run concurrently via Task tool
6. Collect results — verify all tasks pass
7. Merge results, run full test suite
8. Auto-commit if all pass
9. Mark tasks DONE
```

Worker spawn prompt template:

If task `Agent` ≠ `—` and Agent value is present, dispatch as `Task(subagent_type: "{agent_name}", prompt: ...)`:
```
{effort_guidance}
You are {agent_name}, a specialist invoked for this task. Apply your full domain expertise.

You are implementing task: {task_description}

Files to modify: {file_list}

Constraints:
- TDD: write failing test first
- Do not touch files outside your task scope
- Report: DONE or BLOCKED with reason
```

If task `Agent` = `—` or Agent value is absent, use generic dispatch (existing behavior):
```
{effort_guidance}
You are implementing task: {task_description}

Files to modify: {file_list}

Constraints:
- TDD: write failing test first
- Do not touch files outside your task scope
- Report: DONE or BLOCKED with reason
```

`{effort_guidance}` is populated by `buildEffortGuidance(level, score)` — empty for low, advisory text for medium/high.

### Swarm Mode (4+ tasks)

Delegate to `/aicodepath-swarm` with the task list extracted from `tasks.md`.

```
1. Extract all pending tasks from tasks.md
2. Run Phase 0: Planning Discussion (planner + critic)
3. Delegate to /aicodepath-swarm with task breakdown
4. Monitor via TeammateIdle/TaskCompleted signals
5. Merge and verify on completion
```

## Task Argument Parsing

| Argument | Behavior |
|---------|----------|
| `all` | Execute all pending tasks in tasks.md |
| `1` | Execute task #1 only |
| `2-4` | Execute tasks #2 through #4 |
| _(none)_ | Auto-detect: execute all pending tasks |

## State Machine

Valid transitions enforced:

```
idle → initialized → planning → executing → verifying → done
                                          ↓
                                      blocked (if 3 consecutive failures)
```

Cannot jump states. Cannot go `idle → executing` without planning.

## Failure Escalation

After 3 consecutive test/build failures on a task:
1. Auto-stop execution
2. Generate fix proposal saved to `aicodepath-docs/pending-fix-proposals.jsonl`
3. Show escalation message: "Task {id} escalated after 3 failures — fix proposal created"
4. Mark task BLOCKED in tasks.md

User resolves via: `/aicodepath-debug` or manual fix, then re-run `/aicodepath-work {task-id}`.

## Integration

```
/aicodepath-write-plan → /aicodepath-work → /aicodepath-verify → /aicodepath-checkpoint
```

`/aicodepath-work` is the CONSTRUCTION phase entry point. It assumes:
- A plan exists in `tasks.md` (from `/aicodepath-write-plan`)
- Design is approved (from `/aicodepath-brainstorm`)
- Confidence ≥70 (from `/aicodepath-confidence-check`)

## NEVER

- **NEVER** skip the effort score calculation before spawning workers — the effort guidance is injected only if the score is calculated first. Without scoring, high-complexity tasks run without the effort recommendation and may produce lower-quality output. Set `CLAUDE_CODE_EFFORT_LEVEL=high` manually if auto-detection is unavailable.
- **NEVER** use `--no-tdd` except in documented emergencies — the TDD constraint exists because tests-after produces untested edge cases. If you skip TDD, document why in tasks.md.
- **NEVER** mark a task DONE without running the test suite — "should work" is not evidence. Run tests, show output, then mark done.
- **NEVER** run parallel or swarm mode for a single task — the orchestration overhead (~2x cost) is only justified when tasks are truly parallel. Check task count before choosing mode.
