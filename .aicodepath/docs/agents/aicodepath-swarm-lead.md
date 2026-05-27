# aicodepath-swarm-lead

**Pack**: `planning` | **Model**: sonnet

## When to Use
Orchestrating parallel implementation across multiple specialist agents — when a plan has Agent field assignments, task count exceeds solo capacity, or tasks need pipeline coordination.

## Triggers
Swarm orchestration, parallel agents, multi-agent execution, agent delegation, swarm execution, pipeline coordination.

## Key Capabilities
- Reads `Agent` field from tasks.md; delegates to named specialists via Task tool
- File ownership assignment per agent — prevents merge conflicts
- Dependency ordering: checks `Depends` column before spawning; never starts blocked tasks early
- DoD verification: runs exact DoD command (exit 0 + assertion count); never accepts self-report
- Max 5 simultaneous Task tool invocations; cost tracking per agent

## Domain Keywords
`swarm-orchestration`, `parallel-agents`, `multi-agent`, `agent-delegation`, `swarm-execution`, `agent-swarm`

## Collaborates With
`aicodepath-plan-analyst`, all domain specialist agents
