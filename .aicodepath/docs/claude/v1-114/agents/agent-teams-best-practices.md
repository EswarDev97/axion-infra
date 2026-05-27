# Claude Code Agent Teams: Best Practices & Troubleshooting

**Source**: https://claudefa.st/blog/guide/agents/agent-teams-best-practices
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Key Recommendations

Give teammates explicit context:

> "Include task-specific details in the spawn prompt" rather than vague instructions.

Teammates don't inherit conversation history.

## Critical Practices

- **Team size**: 3–5 members to minimize coordination costs.
- **Task sizing**: aim for 5–6 tasks per teammate — creates natural checkpoints.
- **File management**: the most important rule is preventing simultaneous edits.
  **"Break the work so each teammate owns a different set of files"** by defining clear
  directory boundaries in spawn prompts.
- **Operational approach**: delegate mode (`Shift+Tab`) keeps lead focused on coordination.
- **Regular progress checks** with `Ctrl+T` catch problems before they compound.

## Mode Behavior

> "An agent's mode stays fixed for its lifetime"

Cannot be changed mid-execution. Plan mode evaluates on every turn, making it suitable for
design roles but not execution.

## Known Limitations

- No session resumption after `/resume`
- One team per session
- No nested teams
- Split panes require tmux or iTerm2 compatibility

## Recent Updates

Recent versions (through v2.1.45) resolved critical issues with Bedrock/Vertex/Foundry
compatibility and tmux messaging, though the feature **remains experimental**.
