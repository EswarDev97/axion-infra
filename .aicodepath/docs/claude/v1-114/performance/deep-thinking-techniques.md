# Claude Code Deep Thinking Techniques

**Source**: https://claudefa.st/blog/guide/performance/deep-thinking-techniques
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

> NOTE: With Opus 4.7, fixed thinking budgets are gone. Thinking is adaptive — the model
> decides how long to reason based on context. See `opus-4-7-best-practices.md`. The trigger
> phrases described here still work as prompt-side nudges.

## Core Concept

Adding trigger phrases like `"think harder"`, `"ultrathink"`, or `"think step by step"` signals
Claude to engage deeper analysis. These are natural-language cues, not special commands —
"the difference between a quick glance and careful examination."

## Three-Level Performance Stack

- **Level 1** — Thinking trigger phrases alone for complex tasks.
- **Level 2** — Thinking phrases combined with planning mode for structured analysis.
- **Level 3** — Revision engine using "multiple critique rounds to push performance further."

## Practical Applications

Three scenarios: complex debugging, architecture decisions, and comprehensive code reviews —
each framed to leverage extended thinking.

## Configuration

- Persistent thinking via `settings.json` → `alwaysThinkingEnabled: true`.
- Token allocation via `MAX_THINKING_TOKENS` env var (default 31,999).
- Note: extended thinking may impact prompt caching efficiency for repetitive patterns.

## Cost Efficiency

Maximizing current models through thinking techniques often beats immediate model upgrades
for cost.

## Opus 4.7 Update

On Opus 4.7, `thinking={"type": "enabled", "budget_tokens": N}` returns **400**. Use
`thinking={"type": "adaptive", "display": "summarized"}` instead. The trigger-phrase approach
still works — use "think carefully before responding" for more reasoning, or "prioritize
responding quickly" for less.
