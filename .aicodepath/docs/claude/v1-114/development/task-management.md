# Claude Code Task Management — Native Task Tools

**Source**: https://claudefa.st/blog/guide/development/task-management
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Core Innovation

Anthropic introduced native task management to Claude Code on **January 23, 2025**, replacing
community-built workarounds with built-in persistence and multi-session coordination.

## Four Specialized Tools

- `TaskCreate` — generate tasks with dependencies
- `TaskGet` — retrieve full task details
- `TaskUpdate` — modify status and blockers
- `TaskList` — display all tasks

## Status Lifecycle

Tasks progress `pending → in_progress → completed` and persist in `~/.claude/tasks/` across
sessions.

## Multi-Session Capability

The `CLAUDE_CODE_TASK_LIST_ID` environment variable enables shared task lists across multiple
Claude sessions — e.g., "parallel workstreams: frontend and backend sessions sharing
blockers."

## Practical Application

- Best for complex, multi-step work spanning sessions with dependencies.
- Integrates with the Agent SDK so subagents can claim and complete tasks from shared lists.
- Simple single-file changes don't require this overhead.

## Configuration

- Add task instructions to `CLAUDE.md`.
- Set `CLAUDE_CODE_TASK_LIST_ID` in shell profile for persistent cross-session projects.
- Disable with `CLAUDE_CODE_ENABLE_TASKS=false` to revert to the old TODO list.

## Related Parameters

`TaskUpdate` supports `addBlockedBy: [taskId, ...]` — used heavily in the builder-validator
pattern (see `agents/team-orchestration.md`).
