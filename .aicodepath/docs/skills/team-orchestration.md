# Skills — Team Orchestration

---

## /aicodepath-swarm

**When:** Executing complex parallel work that benefits from multiple specialized agents.

**Requires:** `swarm` feature flag enabled (`isEnabled('swarm')` → `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

**What it does:**
1. Analyzes the task and decomposes into agent-assignable units
2. Selects orchestration pattern:
   - **parallel** — independent tasks run simultaneously
   - **pipeline** — tasks chain sequentially with output feeding next
   - **swarm** — dynamic task assignment as agents complete work
   - **review** — code/design goes through sequential reviewers
3. Forms a team from the 22 agent roster based on task requirements
4. `aicodepath-swarm-lead` coordinates the team
5. Progress tracked via WebSocket events (`team_formation`, `team_update`, `team_member_status`)

**Pattern auto-selection:**
| Phase | Default pattern |
|-------|----------------|
| PRE-FLIGHT | pipeline |
| INCEPTION | parallel |
| CONSTRUCTION | swarm |
| OPERATIONS | review |

**Limits:** Max 5 teammates (configurable in `config.json`). Polling sync every 5 seconds.

**Graceful degradation:** When `swarm` feature is disabled, falls back to sequential execution with the same agents.

**Requires Claude Code Agent Teams feature** — experimental. Enable with environment variable.

---

## /aicodepath-subagent-dev

**When:** Executing an approved implementation plan in parallel — dispatches tasks to fresh subagents with two-stage review.

**What it does:**
1. Reads the implementation plan from the active task file in `aicodepath-docs/task/`
2. Groups tasks by dependency level (tasks at the same level run in parallel)
3. Dispatches each group to a fresh subagent with full context
4. First-stage review: each subagent's output reviewed automatically
5. Second-stage review: integration test across all subagent outputs
6. Merges results into main branch

**When to use vs /aicodepath-swarm:**
- `subagent-dev` — structured plan execution, known tasks, dependency-ordered
- `swarm` — dynamic work, unknown scope, needs agent coordination

---

## /aicodepath-orchestrate

**When:** You have a written plan with units in the DB and are ready for CONSTRUCTION — not for planning or ad-hoc coding.

**What it does:**
1. Reads units from the DB (created by `/aicodepath-write-plan`)
2. Resolves dependencies between units (topological sort via `lib/dependency-resolver.js`)
3. Executes units with configurable concurrency (default: 3 parallel)
4. Retries failed units with timeout management
5. Emits real-time progress via WebSocket

**Configuration:**
```javascript
// From lib/unit-orchestrator.js
maxConcurrentAgents: 3,
retryAttempts: 2,
unitTimeoutMs: 300000  // 5 minutes
```

**Unit status flow:**
```
pending → in_progress → completed
                    ↓
                  failed → retrying → completed/failed
```

**Dashboard:** Unit statuses visible in real-time on the Kanban view (port 3899).

---

## /aicodepath-batch

**When:** Processing multiple repositories or services in parallel — ecosystem-wide analysis, RE, or spec generation.

**Pre-flight checks (3 questions):**
1. Are all repos cloned locally? (Remote repos must be cloned before processing — agents cannot clone during a run)
2. What operation fits all repos? (`analyze` is safe for any; `reverse-engineer` takes 5–15 min per repo)
3. What parallelism budget? (`--parallel 3` is safe; higher = faster but more resource-intensive)

**Operations:**
| Operation | What it does |
|-----------|-------------|
| `analyze` | Codebase analysis — stack, patterns, debt |
| `reverse-engineer` | Full 11-document RE per repo |
| `specify` | Generate `.specify/` from existing RE docs |
| `gap-analysis` | Compare specs to code per repo |

**Arguments:**
```
/aicodepath-batch <repo-list> --operation analyze --parallel 3
/aicodepath-batch discovery-report.md --operation reverse-engineer
```

**Output:** Per-repo result files + aggregate summary in `aicodepath-docs/batch-results/`.

---

## /aicodepath-autonomous-loops

**Status:** Reference-only skill (`user-invocable: false`) — taxonomy for selecting the right loop architecture.

**The 6 loop patterns:**

| Pattern | What it is | AICodePath skill |
|---------|-----------|-----------------|
| Sequential REPL | One task → execute → observe → next | `/aicodepath-tdd` (single cycle) |
| Iterative Hill-Climb | Evaluate → score → mutate → repeat until threshold | `/aicodepath-gicl-start` |
| Parallel Fan-Out | Spawn N workers → collect results | `/aicodepath-swarm` |
| Reflexion Loop | Fail → analyze → improve → retry | `/aicodepath-debug` |
| Pipeline | Task chain with input→output handoff | `/aicodepath-orchestrate` |
| Autonomous Research | Propose → test → keep/discard → repeat | `/aicodepath-model-training` |

**Decision matrix:** Choose based on task type, whether output is deterministic, and whether parallelism is safe.
