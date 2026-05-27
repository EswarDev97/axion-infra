# Claude Code Agent Teams: Advanced Controls

**Source**: https://claudefa.st/blog/guide/agents/agent-teams-controls
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Display Modes

- **In-Process Mode (default)** — all teammates run in main terminal with keyboard navigation.
  Switch with `Shift+Up/Down`, view individual sessions with `Enter`.
- **Split Pane Mode** — each teammate gets its own terminal pane.
  Requires **tmux or iTerm2**. "NOT supported in VS Code's integrated terminal, Windows
  Terminal, or Ghostty."

## Delegate Mode

`Shift+Tab` activates delegate mode:

> "Restricts the lead to coordination-only tools: spawning teammates, messaging, shutting
> them down, and managing tasks."

Prevents the team lead from doing implementation work instead of coordinating.

## Plan Approval Workflow

Teammates can work in read-only **plan mode** before implementation:

1. Teammate creates a plan
2. Lead reviews and approves/rejects
3. On approval, teammate begins implementation

Valuable "when teammates are working on shared infrastructure, touching database schemas, or
making changes that are expensive to reverse."

## Quality Gates via Hooks

Two hooks support team workflows:

- **`TeammateIdle`** — assigns follow-up tasks when a teammate finishes early
- **`TaskCompleted`** — prevents task completion until quality criteria are met (tests pass,
  linting succeeds)

## Token Cost

> "A 3-teammate team running for 30 minutes will use roughly 3–4× the tokens of a single
> session doing the same work sequentially."

## CLAUDE.md Optimization for Teams

1. Define module boundaries with clear file ownership.
2. Keep project context short and operational.
3. Specify verification methods (tests, linting, build commands).
