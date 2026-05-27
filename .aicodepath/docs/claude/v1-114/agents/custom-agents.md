# Claude Code Custom Agents: Slash Commands + Agent Defs + CLAUDE.md

**Source**: https://claudefa.st/blog/guide/agents/custom-agents
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Three Complementary Approaches

1. **Slash commands** (`.claude/commands/`) — invoked on-demand via `/project:command-name`.
2. **Agent definitions** (`.claude/agents/`) — persistent sub-agents with YAML frontmatter
   that the orchestrator spawns automatically.
3. **CLAUDE.md instructions** — always-active behaviors shaping every interaction.

> "Commands are prompts you invoke manually for specific workflows. Agent definitions
> configure persistent sub-agents that Claude's Task tool can spawn during orchestration."

## Quick Start

Create `.claude/commands/code-review.md` with checks for readability, duplicated logic, error
handling, and security concerns — invocable in ~2 minutes.

## YAML Frontmatter for Agents

| Field | Purpose |
|-------|---------|
| `name` | Agent identity for Task invocations |
| `model` | Override default model selection |
| `allowedTools` | Restrict available tools (`Read`, `Grep`, `Bash`, `Edit`, `Write`) |
| `description` | Agent purpose |

Also supports `disallowedTools` for denying specific tools (e.g. force a validator to be
read-only by disallowing `Edit` and `Write`).

## Common Mistakes

- **Overly broad scope** → superficial results
- **Missing output format** specifications → inconsistent reporting
- **Granting write access to read-only validation agents** → defeats their purpose
- **Repeating CLAUDE.md content** in individual commands → wastes tokens

## Decision Framework

| Need | Use |
|------|-----|
| Repeated workflow (3+ times weekly) | Slash command |
| Orchestration auto-spawns specialists | Agent definition |
| Universal behavioral rules | CLAUDE.md |
| Complex domain workflows | Skills (separate mechanism) |
