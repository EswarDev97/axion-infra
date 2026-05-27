---
name: aicodepath-swarm
description: >
  Use when executing complex parallel work that benefits from multiple specialized agents — orchestrates Claude Code Agent Teams for CONSTRUCTION phase tasks that can run concurrently. Triggered by: "use agent teams", "parallel agents", "swarm", multi-service implementations, tasks that naturally decompose into independent units.
user-invocable: true
allowed-tools: [Read, Bash, Write, Glob, Grep, Task]
argument-hint: "[form|run|status|disband] [--pattern parallel|pipeline|swarm|review] [--phase auto]"
---

# AICodePath Swarm Orchestration

Coordinate multi-agent teams using Claude Code's experimental Agent Teams feature, integrated with AICodePath's 24 specialized agents, DAG-based unit orchestration, and AIDLC workflow phases.

## Prerequisites

This skill requires Claude Code's experimental Agent Teams feature:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

If Agent Teams is not available, the skill falls back to `/aicodepath-orchestrate`.

---

## Commands

### `/aicodepath-swarm form`
Compose and spawn a team based on current AIDLC phase and task context.

**Arguments**:
- `--pattern <parallel|pipeline|swarm|review>` - Override orchestration pattern (default: auto from phase)
- `--phase <PRE-FLIGHT|INCEPTION|CONSTRUCTION|OPERATIONS>` - Override phase detection
- `--agents <agent1,agent2,...>` - Specify exact agents to include

**What it does**:
1. Check Agent Teams availability (feature gate)
2. Detect current AIDLC phase from session state
3. Compose team using phase defaults + task scoring from AgentRegistry
4. Create swarm_teams record in database
5. Spawn teammates with agent-specific personas via TeammateTool
6. Emit `team_formation` WebSocket event to dashboard
7. Return team summary

### `/aicodepath-swarm run`
Convert AICodePath units to team tasks and start coordinated execution.

**What it does**:
1. Sync units from database to Claude Code task files via SwarmBridge — when reading tasks.md rows for unit conversion, extract the Agent column value and carry it in the unit spec; swarm workers use this value to route each unit to the correct specialist rather than inferring domain from task content
2. Translate DAG dependencies into `blockedBy` references
3. Start the 5-second sync loop to keep DB and dashboard in sync
4. Teammates automatically pick up tasks from the shared task list

### `/aicodepath-swarm status`
Show team health, member statuses, and task progress.

**Output includes**:
- Team name, pattern, and phase
- Member status grid (spawning/active/idle/shutdown)
- Task progress (pending/in-progress/completed/failed)
- Sync loop health

### `/aicodepath-swarm disband`
Gracefully shutdown teammates and clean up team resources.

**What it does**:
1. Signal all teammates to finish current task and stop
2. Run final sync to capture last task statuses
3. Stop the sync loop
4. Update swarm_teams status to 'disbanded'
5. Emit `team_update` with disbanded status

---

## Orchestration Patterns

### Parallel Specialists (CONSTRUCTION default)
Independent agents working on separate units simultaneously. Best for large feature implementations where units have minimal interdependence.

**Team**: backend-architect, frontend-architect, test-engineer, database-architect, security-engineer
**Behavior**: Each teammate gets exclusive file ownership. Work proceeds independently.

### Pipeline (INCEPTION default)
Sequential handoff between specialists. Each step's output feeds the next step's input.

**Team**: architect -> api-designer -> database-architect -> security-engineer
**Behavior**: Tasks have explicit `blockedBy` dependencies. Each agent waits for upstream completion.

### Swarm (large backlogs)
Self-organizing agents claiming from a shared task pool. Best when you have many small, independent tasks.

**Team**: Up to 5 agents based on task scoring
**Behavior**: Agents claim unclaimed tasks. TeammateIdle hook reassigns idle agents.

### Research + Implementation (OPERATIONS default)
Two-phase approach: read-only research first, then implementation based on findings.

**Team**: sre-engineer, devops-architect, performance-engineer
**Behavior**: Phase 1 is research-only. Phase 2 implements recommendations.

---

## Phase-to-Team Mapping

| Phase | Default Pattern | Default Team (max 5) |
|-------|----------------|---------------------|
| PRE-FLIGHT | Research | architect, devops-architect |
| INCEPTION | Pipeline | architect, api-designer, database-architect, security-engineer |
| CONSTRUCTION | Parallel | backend-architect, frontend-architect, test-engineer, database-architect, security-engineer |
| OPERATIONS | Research+Impl | sre-engineer, devops-architect, performance-engineer |

---

## Implementation Instructions

When the user invokes `/aicodepath-swarm`, parse the command and arguments:

### For `form`:

```javascript
const { isAgentTeamsAvailable, getSwarmStatus } = require('.aicodepath/lib/swarm-availability-checker');
const { SwarmTeamComposer } = require('.aicodepath/lib/swarm-team-composer');
const AgentRegistry = require('.aicodepath/lib/agent-registry');
const AgentLoader = require('.aicodepath/lib/agent-loader');

// 1. Check availability
const status = getSwarmStatus();
if (!status.available) {
  // Fall back to /aicodepath-orchestrate
  console.log(status.message);
  return;
}

// 2. Load agents and compose team
const loader = new AgentLoader();
const agents = await loader.loadAll();
const registry = new AgentRegistry();
registry.register(agents);

const composer = new SwarmTeamComposer(registry);
const team = composer.composeTeam(taskDescription, {
  pattern: options.pattern,
  phase: options.phase,
});

// 3. Spawn teammates using TeammateTool
// Each teammate gets a persona prompt from composer.buildSpawnPrompt()
for (const member of team.members) {
  const prompt = composer.buildSpawnPrompt(member.agent, {
    teamName: team.teamName,
    pattern: team.pattern,
    role: member.role,
    taskScope: member.agent.description,
  });
  // Use Task tool to spawn teammate with prompt
}
```

### For `run`:

```javascript
const { SwarmBridge } = require('.aicodepath/lib/swarm-bridge');

// 1. Initialize bridge
const bridge = new SwarmBridge(db, teamName);

// 2. Sync units to task files
await bridge.syncUnitsToTasks(sessionId);

// 3. Start sync loop (keeps dashboard updated)
bridge.startSyncLoop(5000);
```

### For `status`:

Read from `swarm_teams`, `swarm_team_members`, and `swarm_task_mapping` tables.
Display formatted status of team, members, and task progress.

### For `disband`:

```javascript
// 1. Stop sync loop
bridge.stopSyncLoop();

// 2. Final sync
await bridge.syncTasksToUnits(sessionId);

// 3. Update team status
db.prepare('UPDATE swarm_teams SET status = ?, disbanded_at = datetime("now") WHERE team_name = ?')
  .run('disbanded', teamName);

// 4. Emit WebSocket event
wsEmitter.emitTeamUpdate({ teamName, status: 'disbanded' });
```

---

## Graceful Degradation

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not set:
1. Display a clear message explaining the requirement
2. Suggest setting the environment variable
3. Offer to run `/aicodepath-orchestrate` as an alternative
4. Do NOT attempt to spawn teammates

---

## Dashboard Integration

The swarm skill integrates with the existing dashboard through:

1. **AgentMissionControl**: Teammates appear as standard agent cards via `agent_update` events
2. **OrchestratorStatus**: Shows team name and pattern when a swarm is active
3. **ActivityFeed**: Team formation and member activities appear in the timeline
4. **CelebrationOverlay**: Task completions trigger celebration animations

Three additional WebSocket event types provide team-level awareness:
- `team_formation` - Team created with members and pattern
- `team_update` - Team status/progress changes
- `team_member_status` - Individual member status changes

---

## Database Tables

The skill uses three tables (migration 006):
- `swarm_teams` - Team definitions with pattern, phase, and status
- `swarm_team_members` - Individual agent assignments with role and task counts
- `swarm_task_mapping` - Links between AICodePath units and Claude Code task files

---

## Error Handling

| Error | Behavior |
|-------|----------|
| Agent Teams not available | Clear message + fallback to /aicodepath-orchestrate |
| Team already active | Show existing team status, offer to disband first |
| Teammate spawn fails | Log error, continue with remaining teammates, reduce team size |
| Sync loop error | Log warning, retry on next interval |
| No units to sync | Skip sync, log info message |
| Database not initialized | Run migration 006 automatically |

---

## Pre-Spawn Checklist

Run ALL applicable checks before spawning any batch of workers. Workers receiving wrong inputs cost more to fix than the checks cost to run.

### 1. Verify files on disk (always)
```bash
ls <expected-output-directory>
```
Plan file task statuses (DONE/TODO) are unreliable — files marked DONE may not exist on disk. Disk state is authoritative; plan file status is advisory. Confirm target files are absent (creation tasks) or present (modification tasks) before spawning.

### 2. DB introspection (repository/schema tasks)
For any task writing repositories or schemas, run against the live database for every table in scope:
```bash
psql -c "\d <schema>.<table>"
```
Never rely on design docs, handoffs, or plan files for column names — these describe intended state, not actual DB state. Embed the verified column list in each worker prompt.

### 3. Read actual repository source (API endpoint tasks)
For any task writing endpoint files that call repositories, read each relevant repository source file and embed verified function signatures in worker prompts. Task briefs frequently diverge from actual signatures (parameter order, names, extra required args).

### 4. Schema-owner ordering (parallel workers with shared schemas)
When one worker (W_schemas) owns schema files (Pydantic, TypeScript interfaces) imported by other workers, instruct W_schemas explicitly:
> "Write ALL schema files FIRST — this unblocks Worker X imports. Then proceed to your repository tasks."
Place this as the first instruction in W_schemas' prompt.

### 5. Frontend dep verification (frontend tasks)
Check target `package.json` for every package referenced in task briefs. If missing: install before spawning (`pnpm add <pkg>`) or include the install command as the first instruction in the worker prompt.

### 6. Worktree path injection (when active worktree exists)
If `aicodepath-docs/state/active-worktree.json` exists, read it and inject `worktree_path` explicitly into every worker prompt — never assume `cwd` is the implementation target.
```bash
cat aicodepath-docs/state/active-worktree.json  # → { worktree_path, branch }
```

### 7. Permission mode for background workers (always)
Spawn ALL background workers with `mode:auto` (i.e. `mode: "auto"` in the Task tool call):
- `mode:auto` pre-approves declared tools before the worker starts
- Without it, Write/Edit calls hit a permission gate with no user available to approve
- The background safety classifier still reviews protected-directory writes
- For foreground workers (pipeline pattern): `mode:auto` is still recommended but permission prompts fall through to the user if needed

---

## Batch Completion Sequence

After ALL workers in a batch report completion, execute the following steps **without waiting for user instruction** — this is part of the standard batch flow, not an optional step.

**Strict order — do not reorder:**

1. **Mark tasks DONE** — update every completed task in the active plan file (in `aicodepath-docs/plan/` for plans created after ADR-006, or `aicodepath-docs/plan/` for legacy plans) (change TODO → DONE)
2. **Run `/aicodepath-commit`** — stage, commit, update `active-worktree.json` and plan's Branch Lifecycle section. In swarm mode, only the **lead** runs this — workers never commit.
3. **Run `/aicodepath-learn`** — extract lessons into `aicodepath-docs/knowledge.md` and append any new signals to `aicodepath-docs/preferences/project-preferences.json`
4. **Create checkpoint** — `node .aicodepath/bin/aicodepath.js checkpoint create` (captures learn output). Requires clean worktree (enforced by checkpoint-guard hook).
5. **Write handoff document** — create `aicodepath-docs/handoffs/YYYY-MM-DD-HHmmss-batch-N-complete.md` containing:
   - Batch N summary: tasks completed, agents used, files written
   - Next batch tasks, assignments, and agent recommendations
   - Current AIDLC phase and workflow state
   - Checkpoint ID from step 4

**Why this order is mandatory:**
- Commit before learn — learn captures the committed state, not uncommitted WIP
- Learn before checkpoint — checkpoint must snapshot the updated knowledge.md and preferences
- Checkpoint before handoff — handoff must reference the checkpoint ID (which doesn't exist until step 4)
- Never announce "batch complete" to the user before all five steps are done

<HARD-GATE>
Do NOT report batch completion to the user without first completing all five steps above.
"Batch N is done" is NOT the terminal state. The terminal state is the handoff document written.
</HARD-GATE>

---

## Phase 0: Planning Discussion (Pre-Swarm)

Before spawning workers, run a **Planner + Critic discussion** to validate the task breakdown:

```
1. Planner agent proposes:
   - Task decomposition (which tasks to each worker)
   - File partitioning (which files each agent owns)
   - Dependency graph (any tasks that must run in sequence)
   - Risk areas (files likely to conflict)

2. Critic agent reviews:
   - "Task X and Y both write to config.js — assign to same worker"
   - "Task A depends on Task B's output — not parallelizable"
   - "Worker count of 5 adds 5.5x cost — is 3 workers sufficient?"

3. Lead incorporates feedback → produces final task assignment plan
4. Workers are spawned with the validated plan
```

**Skip Phase 0 with `--no-discussion`** — saves ~20% cost but may produce task conflicts.

**Phase 0 adds ~1.5x base cost** but reduces mid-swarm blockers from dependency conflicts.

## Cost Tracking

Use `lib/swarm-cost-tracker.js` to estimate and track costs before and during swarm:

```javascript
const { estimateSwarmCost, formatCostSummary } = require('./.aicodepath/lib/swarm-cost-tracker');

// Before spawning — show user the cost estimate
const estimate = estimateSwarmCost({
  workers: 3,
  hasDiscussion: true,
  complexity: 'moderate',
});
console.log(formatCostSummary(estimate));
// 💰 ~5.5x base cost (3 workers, with planning discussion) | Est. tokens: 83K in + 28K out | Moderate cost — swarm justified for complex independent tasks
```

**Cost multiplier reference:**

| Configuration | Multiplier | When to Choose |
|--------------|------------|----------------|
| Solo | 1x | 1 task, simple |
| Parallel (2-3 workers) | ~2x | 2-3 independent tasks |
| Swarm no discussion | ~4x | 4+ tasks, simple parallelism |
| Swarm + Phase 0 | ~5.5x | 4+ tasks with dependency risk |

## Agent Inbox Integration

Workers can message each other and the Lead via `lib/agent-inbox.js`:

```javascript
const inbox = require('./.aicodepath/lib/agent-inbox');

// Worker reports completion
inbox.send('worker-1', 'lead', {
  type: 'task_complete',
  content: 'Task 3 done — auth service updated',
  data: { taskId: 3, commitHash: 'abc1234' },
});

// Lead broadcasts to all
inbox.broadcast('lead', {
  type: 'signal',
  content: 'Phase 0 complete — workers may begin',
});

// Worker checks for messages
const messages = inbox.receive('worker-2', { unreadOnly: true });
```

## Session Broadcast

Cross-session events for coordination and audit:

```javascript
const broadcast = require('./.aicodepath/lib/session-broadcast');

// Signal task completion (visible to all sessions)
broadcast.emitTaskCompleted('task-3', { commitHash: 'abc1234' });

// Another session catches up
const recent = broadcast.readEvents({ since: sessionStartTime });
```

---

## Cost Considerations

Each teammate is a separate Claude context window, consuming tokens independently.

- Maximum 5 teammates enforced at all times
- Phase defaults use minimal team sizes (2-5 agents)
- Prefer `parallel` for independent work (fewer coordination messages)
- Disband teams promptly when work is complete
- Monitor token usage via `/aicodepath-status`
- Check cost estimate before spawning: `estimateSwarmCost({ workers, hasDiscussion, complexity })`

---

## NEVER

- **NEVER** use swarm for tasks with a strict sequential dependency chain — if agent B cannot start until agent A finishes, parallel execution creates blocking waits that cost team formation overhead with zero parallelism benefit. Check the dependency graph first; if it's a chain, use `/aicodepath-orchestrate` instead.
- **NEVER** start a swarm session without verifying the `swarm` feature flag is enabled — the feature gates behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and the AICodePath feature flag. When the flag is off, swarm silently falls back to single-agent sequential execution and looks identical in output, so you won't notice until you check logs and see no team was formed.
- **NEVER** assign the same file to multiple agents without an explicit merge protocol — swarm agents write files concurrently with no conflict detection. Last-write-wins silently overwrites earlier work. Either partition work by file boundary or designate a single agent as file owner and route all writes through it.
- **NEVER** use swarm for trivial tasks (≤3 files, ≤1 hour estimate) — team formation, agent startup, coordination messages, and DB sync overhead typically cost 10–20 minutes on its own. For small tasks this overhead exceeds the parallelism benefit; use sequential execution.
- **NEVER** ignore the graceful degradation fallback message — when swarm falls back to `/aicodepath-orchestrate`, output looks identical but was produced serially after spending time trying to form a team. If you expected parallel execution, the fallback means the feature is misconfigured — fix it before the next session rather than silently losing parallelism.
- **NEVER** spawn a background worker without `mode:auto` — file writes silently fail when the permission gate has no user to approve them. The agent reports success but writes nothing, and the main session re-does all the work serially.
