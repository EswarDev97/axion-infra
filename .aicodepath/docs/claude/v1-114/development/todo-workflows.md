# Claude Code Todo Lists: Instruction Mirror Pattern

**Source**: https://claudefa.st/blog/guide/development/todo-workflows
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

> NOTE: This page covers the legacy `TodoWrite` tool. The current native replacement is the
> Task tool suite (`TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`) documented in
> `task-management.md`. Both can coexist; `CLAUDE_CODE_ENABLE_TASKS=false` reverts to the old
> TODO list.

## Core Premise

Use todos as **"instruction mirrors"** to confirm Claude understands requirements before
implementation begins.

## Problem / Solution

- **Problem**: Claude sometimes misses steps or executes tasks out of order, creating
  uncertainty about instruction clarity.
- **Solution**: Add "create a todo list first" to complex requests. The checklist displays
  Claude's interpretation, enabling early detection of misunderstandings.
- **Real-time updates**: Todos update dynamically as work progresses and as users provide
  mid-task corrections, preserving completed items while adjusting pending tasks.

## Practical Patterns

- Replace vague items ("Style the navigation bar") with specific measurements and properties.
- Organize work into phases with explicit dependencies.
- Use numbered lists when sequence order matters critically.
- Implement quality checkpoints covering order, completeness, detail level, and clarity.

## Workflow Integration

Request instructions → ask for detailed todos → review alignment → refine as needed → proceed.

> "Perfect todo alignment means perfect instruction clarity."

Checklists become validation mechanisms for communication precision.
