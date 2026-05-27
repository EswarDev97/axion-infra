# Claude Code Sub-Agents: Parallel vs Sequential Patterns

**Source**: https://claudefa.st/blog/guide/agents/sub-agent-best-practices
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Three Execution Patterns

- **Parallel execution** — for 3+ unrelated tasks or independent domains with no shared state.
  Dispatch across frontend, backend, and database simultaneously.
- **Sequential execution** — when tasks have dependencies (B needs A's output) or involve
  shared files/state. Common chains: schema → API → frontend.
- **Background execution** — for research/analysis tasks (not file modifications) where
  results aren't blocking current work.

## Configuration Strategy

- Add routing rules to `CLAUDE.md` so the central AI makes smart delegation decisions
  automatically.
- **"Parallel only works when agents touch different files"** — requires clear domain
  boundaries.
- Optimize cost: set `CLAUDE_CODE_SUBAGENT_MODEL` to Sonnet for sub-agents while main session
  stays on Opus.

## Critical Success Factor

> "Invocation quality" is the primary failure point.

Vague instructions waste sub-agent potential. Good invocations provide specific context, file
references, and explicit success criteria rather than broad commands like "Fix
authentication."

## Opus 4.7 Note

Opus 4.7 is **more selective** about subagent spawning. Default favors single-response work.
If you want parallelization, state the fan-out pattern explicitly.
