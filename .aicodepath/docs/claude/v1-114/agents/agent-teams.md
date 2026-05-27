# Claude Code Agent Teams (Experimental Native Feature)

**Source**: https://claudefa.st/blog/guide/agents/agent-teams
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> **Experimental feature** shipped with Opus 4.6. Enable via
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Different from the DIY builder-validator
> pattern — see `team-orchestration.md`.

## Quick Win

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Then tell Claude:

```
Create an agent team to refactor the payment module. Spawn three teammates:
one for the API layer, one for the database migrations, one for test coverage.
Have them coordinate through the shared task list.
```

Claude creates a **team lead**, spawns three independent teammates, and coordinates their
work through a shared task list and direct messaging. Each teammate owns their scope.

## What Agent Teams Are

Lets you orchestrate teams of Claude Code sessions working together on a shared project. One
session is the **team lead**. Coordinates, assigns tasks, synthesizes results. **Teammates**
work independently in their own context windows and **communicate directly with each other**.

**Key difference from subagents — communication.** Subagents run within a single session and
can only report results back to the main agent. They can't message each other. Agent Teams
removes that bottleneck entirely. Teammates message each other, claim tasks from a shared
list, and work through problems collaboratively.

> Subagents are contractors you send on separate errands. Agent Teams is a project team
> sitting in the same room, each working on their piece while staying in sync through
> conversation.

## Why It Matters

1. Native integration beats bolted-on solutions — shared task list, mailbox, teammate
   lifecycle are built into Claude Code's core.
2. Multi-agent paradigm is maturing — muscle memory now = edge later.
3. Complex projects demand collaboration, not just parallelism.

## When to Use

Agent Teams add coordination overhead and use significantly more tokens. Best when teammates
operate independently on distinct scopes **while** benefiting from communication.

**Strong use cases:**

- **Research and review** — investigate different aspects, share/challenge findings
- **New modules or features** — each owns a separate component
- **Debugging with competing hypotheses** — test theories in parallel, disprove each other
- **Cross-layer coordination** — frontend/backend/tests changes, each owned
- **Debate and consensus** — architectural decisions
- **Large-scale inventory or classification** — divide data, process independently

**Skip Agent Teams for:**

- Sequential tasks, same-file edits, tight dependencies — use single session or subagents
- Independent parallelizable changes with no coordination — simpler to use `/batch`

## Subagents vs Agent Teams

| Feature | Subagents | Agent Teams |
|---------|-----------|-------------|
| Context | Own window, results summarized back to caller | Own window, fully independent |
| Communication | Report results back to the main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Best for | Focused tasks where only the result matters | Complex work requiring discussion |
| Token cost | Lower | Higher: each teammate is a separate Claude instance |
| Use case examples | Code review, file analysis, research | Multi-component features, debates, cross-layer refactors |
| Setup required | None (built-in) | Environment variable to enable |
| Communication pattern | Hub-and-spoke (all through main agent) | Mesh (any teammate to any teammate) |

## Step-by-Step: Your First Agent Team

**Step 1: Enable**

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or in `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Step 2: Describe task + structure**

```
Create an agent team to review our authentication system. Spawn three teammates:
- Security reviewer: audit for vulnerabilities, check token handling
- Performance analyst: profile response times, identify bottlenecks
- Test coverage checker: verify edge cases, find untested paths
Have them share findings and coordinate through the task list.
```

**Step 3: Watch and steer**

Claude creates the team lead (your main session), spawns teammates, distributes work.
Keyboard: **Shift+Up/Down** to select teammates, **Ctrl+T** for task list, **Enter** to view a
session, **Escape** to interrupt.

**Step 4: Clean up**

```
Ask all teammates to shut down, then clean up the team.
```

Always use the lead to clean up. Shut down all teammates first, since the lead won't clean up
while teammates are still running.

## Architecture

| Component | Purpose |
|-----------|---------|
| **Team Lead** | Your main Claude Code session. Creates team, spawns teammates, assigns tasks, synthesizes. |
| **Teammates** | Separate Claude Code instances. Own context window. |
| **Shared Task List** | Central work queue all agents can see. States (pending/in-progress/completed). Supports dependencies. |
| **Mailbox** | Messaging between agents. |

**Local state:**

- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

**Teammate context on spawn**: same project context as a regular Claude Code session
(`CLAUDE.md`, MCP servers, skills) + spawn prompt from lead. **Lead's conversation history
does NOT carry over.**

**Communication**: automatic message delivery, idle notifications, shared task list, direct
messages (to one teammate), broadcasts (to all teammates, used sparingly).

**Permissions**: teammates start with lead's permission settings. Can change individual
teammate modes after spawning, not at spawn time.

## Token Economics

A 3-teammate team uses roughly **3–4× the tokens** of a single session doing the same work
sequentially. Time savings on complex tasks more than justify cost when the coordination
pattern fits.

## Related

- `agent-teams-controls.md` — display modes, delegate mode, plan approval, hooks, task assignment
- `agent-teams-use-cases.md` — 10+ prompt templates
- `agent-teams-best-practices.md` — practices, plan mode behavior, troubleshooting, limitations
- `agent-teams-workflow.md` — 7-step plan-to-production pipeline
