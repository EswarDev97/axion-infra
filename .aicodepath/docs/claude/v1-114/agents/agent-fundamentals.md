# Claude Code Agent Fundamentals

**Source**: https://claudefa.st/blog/guide/agents/agent-fundamentals
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Five Core Approaches

Claude Code provides multiple mechanisms for agent-like behavior:

| Approach | Best Use Case | Persistence |
|----------|---------------|-------------|
| Task tool (sub-agents) | Parallel, isolated work | Session only |
| `.claude/agents/` definitions | Persistent specialist agents | Permanent |
| Custom slash commands | Reusable team workflows | Permanent |
| `CLAUDE.md` personas | Project-wide behavior | Permanent |
| Perspective prompting | Quick context shifts | Single request |

## Key Capabilities

- **Sub-agents** spawn mini Claude instances with **isolated context windows** that work
  independently and return results to the orchestrator. You can **background them with
  `Ctrl+B`** to continue working while they execute.
- **Persistent agents** live in `.claude/agents/` as Markdown files with YAML frontmatter.
  They inherit project context from `CLAUDE.md` and can be restricted via permission rules
  in `settings.json`.
- **Slash commands** in `.claude/commands/` create reusable specialists with descriptions and
  allowed tools. Shareable via git; available globally from `~/.claude/commands/`.
- **Sub-agent models** can be controlled via `CLAUDE_CODE_SUBAGENT_MODEL` for cost
  optimization or task-specific reasoning needs.

## Decision Framework

- Sub-agents → parallel execution
- Agent definitions → persistent roles
- Slash commands → repeatable workflows
- `CLAUDE.md` → automatic consistency
- Perspective prompting → one-time analysis

> "Mature Claude Code setups combine all five approaches" for comprehensive orchestration.
