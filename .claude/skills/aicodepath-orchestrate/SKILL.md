---
name: aicodepath-orchestrate
description: Execute approved implementation plans — parallel tasks with dependency-aware scheduling during CONSTRUCTION.
argument-hint: "[start|pause|resume|status]"
user-invocable: true
allowed-tools: Read, Bash, Agent
---

# AICodePath Orchestration

Execute implementation units in dependency order with concurrent agent sessions.

<HARD-GATE>
Do NOT start orchestration without:
1. An approved design from `/aicodepath-brainstorm`
2. A written plan from `/aicodepath-write-plan`
3. Units defined in the database

Starting without a plan produces uncoordinated output that fails GICL quality gates.
</HARD-GATE>

---

## Orchestrate vs Subagent-Dev — Choose the Right Tool

`/aicodepath-orchestrate` is a first-class execution path from `/aicodepath-write-plan`. After the plan is saved, `write-plan` Step 13a loads units via:
```bash
node .aicodepath/bin/aicodepath.js orchestrate load --clear
node .aicodepath/bin/aicodepath.js orchestrate plan   # verify topological order
```

| Situation | Use | Why |
|-----------|-----|-----|
| Plan routed here by `aicodepath-plan-analyst` (units auto-loaded in Step 13a) | `/aicodepath-orchestrate` | First-class path — units already in DB |
| Units are defined in the DB with hard/soft dependencies | `/aicodepath-orchestrate` | DAG-aware scheduling, DB-tracked progress |
| You have a markdown plan file, no DB session | `/aicodepath-subagent-dev` | Executes from plan file directly |
| Single complex unit needing review loops | `/aicodepath-subagent-dev` | Two-stage review (spec + quality) per unit |
| Many units with cross-unit dependencies | `/aicodepath-orchestrate` | Handles blocking/soft dependency types automatically |

Using orchestrate without DB units results in an empty run. If `orchestrate plan` shows 0 units, re-run Step 13a or use `/aicodepath-subagent-dev` instead.

---

## Commands

```bash
/aicodepath-orchestrate start    # Begin parallel execution of all ready units
/aicodepath-orchestrate pause    # Stop after current units complete (no new starts)
/aicodepath-orchestrate resume   # Continue from paused state
/aicodepath-orchestrate status   # Show units by status and active agents
```

---

## Agent-Aware Dispatch

Each unit in the DB has an `assigned_agent` column populated when the plan is loaded from `tasks.md`. The orchestrator uses this value to route work to the right specialist.

**How it flows:**

1. `write-plan` assigns specialist agents in the `Agent` column of `tasks.md`
2. When units are loaded into the DB, `assigned_agent` is set from that column
3. `unit-orchestrator.js` preserves any pre-assigned specialist — it only writes a generic fallback name (`Coder`, `Builder`, etc.) if `assigned_agent` is NULL
4. `session-runner.js` injects a role instruction into the unit prompt: `You are operating as a <agent-name> specialist. Apply your full domain expertise.`

**Before starting orchestration**, verify specialist agents are set:

```bash
# Check assigned_agent values for the session
node -e "
const db = require('better-sqlite3')(require('./.aicodepath/lib/path-resolver').getDbPath());
db.prepare('SELECT name, assigned_agent FROM units WHERE session_id = ?').all('default').forEach(u =>
  console.log(u.name, '->', u.assigned_agent || '(unassigned)')
);
"
```

If all units show `(unassigned)`, re-run `/aicodepath-write-plan` to ensure the `Agent` column is populated in `tasks.md`, then reload units into the DB before starting orchestration.

---

## Configuration

```json
// .aicodepath/config.json
{
  "orchestration": {
    "maxConcurrency": 3,
    "retryFailedUnits": true,
    "maxRetries": 2,
    "pauseOnFailure": false
  }
}
```

| Option | Default | When to change |
|--------|---------|----------------|
| `maxConcurrency` | 3 | Reduce to 1 for rate-limited APIs; increase if units are independent I/O-bound tasks |
| `pauseOnFailure` | false | Set `true` when units have tight dependencies — a silent failure can corrupt downstream units |
| `maxRetries` | 2 | Increase for units that call flaky external APIs; keep at 0 for units with side effects |

---

## Dependency Types

- **blocks** (hard): Downstream unit will not start until this completes successfully. Use for shared data models, schema changes, or interfaces that downstream units import.
- **soft**: Advisory only — downstream proceeds even if this fails. Use for "nice to have" context, documentation units, or parallel feature work.

**Non-obvious failure mode**: `pauseOnFailure: false` with hard dependencies means a failed unit causes all its downstream dependents to block indefinitely — they wait forever for a unit that will never succeed. If a unit fails, either fix and retry, or manually mark it complete to unblock downstream.

---

## Handling Failures

| Failure scenario | What to do |
|-----------------|-----------|
| Unit fails after maxRetries | Investigate logs, fix the issue, then `orchestrate resume` |
| Cycle detected in dependency graph | Identify which unit's dependency to break — usually the most recently added one |
| Unit hangs (no progress for >5 min) | Run `orchestrate status` to confirm, then `orchestrate pause` and investigate the agent session |
| All units blocked | A "blocks" dependency failed — fix or manually skip the blocking unit |

---

## NEVER

- **NEVER** start orchestration without first verifying units exist in the DB with `orchestrate status`.
- **NEVER** set `pauseOnFailure: false` when units have hard "blocks" dependencies without a monitoring plan — silent downstream blocking is hard to detect.
- **NEVER** use orchestrate as a substitute for subagent-dev on a plan that hasn't been loaded into the DB — it will show 0 units and exit silently.
- **NEVER** increase `maxConcurrency` above the number of available agent slots — excess agents queue without error, giving the appearance of parallelism but running serially.
- **NEVER** announce "implementation complete" when the last unit finishes — unit completion means the code exists, not that it meets quality standards. The completion chain (GICL → verify → acceptance → checkpoint) is what makes it complete.

---

## After All Units Complete

When `orchestrate status` shows all units as DONE, execute the completion chain in order:

1. `/aicodepath-gicl-start` — if not already run per unit; score ≥ 90 required before proceeding
2. `/aicodepath-verify` — Four-Question Self-Check with fresh evidence
3. `/aicodepath-commit` — batch boundary commit; updates `active-worktree.json` and plan's Branch Lifecycle
4. `/aicodepath-acceptance` — Sprint-level gate: all criteria must PASS
5. `/aicodepath-checkpoint` — Only after acceptance reports 0 FAILs (requires clean worktree)

<HARD-GATE>
Do NOT announce implementation complete without running the full completion chain.
All units DONE ≠ implementation complete. Evidence gates must pass first.
</HARD-GATE>

---

## See Also

- `/aicodepath-subagent-dev` — Execute plan without DB session
- `/aicodepath-write-plan` — Create the plan and units first
- `/aicodepath-gicl-start` — Quality loop after units complete
