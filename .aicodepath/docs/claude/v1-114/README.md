# Claude Code v1.114 / Opus 4.7 Reference Pack

**Created**: 2026-04-18
**Purpose**: Reference snapshot of Claude Code documentation around the Opus 4.7 release, as used by the AICodePath framework for v2.12.x planning.
**Location**: `.aicodepath/docs/claude/v1-114/`

---

## ⚠️ Important Provenance Notes — Read First

### 1. Version label "v1.114"

The user-supplied label **"v1.114"** does **not** match any version actually published on
`https://code.claude.com/docs/en/changelog`. The changelog on that page begins with
**v2.1.113 (April 17, 2026)** — released one day before these docs were assembled — and proceeds
backward through the v2.1.x series. No v1.x version of Claude Code is listed.

**Opus 4.7 (the model) shipped in Claude Code v2.1.111** (April 16, 2026). Everything in this
reference pack describes behavior compatible with **Claude Code v2.1.108 – v2.1.113** and
**Claude Opus 4.7**. The folder name `v1-114` is kept only because it was the user's
chosen label; treat it as a codename, not a real version.

### 2. Mixed sources — official vs third-party fan-site

One URL (`code.claude.com/docs/en/changelog`) is Anthropic-official. The rest of the supplied URLs
point to **`claudefa.st`**, which is an independent **third-party fan-site** that markets a paid
product called *"ClaudeFast Code Kit v5.2 — Agentic Orchestration Kit for Claude Code"*.

These fan-site pages **blend** real Anthropic best-practice guidance with promotional content
for the ClaudeFast product. Throughout these docs:

- Content attributable to Anthropic/Claude Code behavior is preserved and marked with
  `(Anthropic)` where clear.
- ClaudeFast-v5.2-specific claims (pipeline features, slash commands like `/team-plan`,
  `/team-build`, Code Kit architecture, etc.) are marked `(ClaudeFast v5.2 — third-party)`
  because they are **NOT** native Claude Code behavior.
- The **AICodePath framework has its own equivalents** to most ClaudeFast concepts. Don't
  import ClaudeFast commands as if they were Anthropic-native.

### 3. Extraction fidelity

These pages were fetched via `WebFetch`, which passes HTML through a summariser model.
**Roughly half the fetches came back verbatim; the rest came back as condensed summaries.**
Each file in this pack lists the source URL and marks fidelity as either `[VERBATIM]` or
`[SUMMARISED BY WEBFETCH — verify against source]`.

---

## Contents

```
.aicodepath/docs/claude/v1-114/
├── README.md                       ← this file
├── changelog.md                    ← v2.1.108 – v2.1.113 from code.claude.com [VERBATIM]
├── opus-4-7-best-practices.md      ← Opus 4.7 migration + effort levels + task budgets
├── settings-reference.md           ← Full settings.json schema, env vars, scope hierarchy
├── examples-templates.md           ← 10 prompt templates (summary)
├── development/
│   ├── agentic-engineering-best-practices.md   ← Anthropic URL redirected; no content
│   ├── code-review.md              ← Claude Code Review service
│   ├── claude-code-channels.md     ← Telegram/Discord/iMessage plugin channels
│   ├── permission-management.md    ← 5 permission modes
│   ├── auto-mode.md                ← Auto mode classifier + decision order
│   ├── feedback-loops.md           ← Tight-loop iteration pattern
│   ├── todo-workflows.md           ← TodoWrite as instruction mirror
│   ├── task-management.md          ← Native TaskCreate/Get/Update/List
│   ├── project-templates.md        ← /init + CLAUDE.md conventions
│   └── usage-optimization.md       ← Pricing, ccusage, model switching
├── performance/
│   ├── deep-thinking-techniques.md ← think/ultrathink triggers
│   ├── speed-optimization.md       ← Model selection / context / prompts
│   ├── fast-mode.md                ← 2.5x Opus 4.6 priority infra
│   └── efficiency-patterns.md      ← Permutation frameworks
└── agents/
    ├── agent-fundamentals.md       ← 5 agent approaches
    ├── async-workflows.md          ← Ctrl+B backgrounding + /tasks
    ├── sub-agent-best-practices.md ← Parallel vs sequential vs background
    ├── sub-agent-design.md         ← Split tasks across specialists
    ├── task-distribution.md        ← 7-agent feature pattern
    ├── team-orchestration.md       ← Builder-validator pattern
    ├── agent-teams.md              ← Native Agent Teams (experimental)
    ├── agent-teams-controls.md     ← Display modes, delegate, hooks
    ├── agent-teams-use-cases.md    ← 10 prompt templates
    ├── agent-teams-best-practices.md ← Team size, file boundaries, limits
    ├── agent-teams-workflow.md     ← 7-step plan-to-production pipeline
    ├── custom-agents.md            ← Slash cmds / agent defs / CLAUDE.md
    ├── agent-patterns.md           ← 6 orchestration patterns
    └── human-like-agents.md        ← Personality injection
```

---

## Key Takeaways Relevant to AICodePath

These are the facts worth carrying into framework changes. Each has a pointer back to the
source file in this pack.

| # | Finding | Source |
|---|---------|--------|
| 1 | **Opus 4.7 is literal.** Prompts that worked on 4.6 by implicit inference underperform on 4.7. Detailed plans with explicit file paths, constraints, and acceptance criteria win. | `opus-4-7-best-practices.md` |
| 2 | **Five effort levels exist**: `low`, `medium`, `high`, `xhigh`, `max`. Claude Code defaults to `xhigh` on Opus 4.7. Switch with `/effort <level>`. | `opus-4-7-best-practices.md`, `changelog.md` (v2.1.111) |
| 3 | **Extended-thinking budgets removed on 4.7.** `thinking={"type": "enabled", "budget_tokens": N}` returns 400. Use `thinking={"type": "adaptive", "display": "summarized"}`. | `opus-4-7-best-practices.md` |
| 4 | **Sampling params removed on 4.7.** `temperature`, `top_p`, `top_k` return 400. Strip before migrating. | `opus-4-7-best-practices.md` |
| 5 | **Tokenizer change.** Same input encodes 1.0–1.35× more tokens than 4.6. Re-baseline via `v1/messages/count_tokens`. | `opus-4-7-best-practices.md` |
| 6 | **Task budgets (public beta).** Beta header `task-budgets-2026-03-13`. `output_config.task_budget` is a **soft suggestion** the model sees; `max_tokens` is the hard cap. Minimum 20k tokens. | `opus-4-7-best-practices.md` |
| 7 | **Subagent selectivity.** 4.7 defaults to single-response work. You must tell it explicitly to fan out. | `opus-4-7-best-practices.md`, `agents/sub-agent-best-practices.md` |
| 8 | **Auto mode is a real permission mode.** Classifier (Sonnet 4.6) runs before each action. Blocks 3-in-a-row or 20-total = fallback to manual. Not configurable. | `development/auto-mode.md` |
| 9 | **Auto mode drops broad allow rules** (`Bash(*)`, `Bash(python*)`, `Agent`) on entry. Narrow rules carry. Broad rules restore on exit. | `development/auto-mode.md` |
| 10 | **Native Task tools** replaced the old TodoWrite: `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`. Persist in `~/.claude/tasks/`. Shared across sessions via `CLAUDE_CODE_TASK_LIST_ID`. | `development/task-management.md` |
| 11 | **Agent Teams is an experimental native feature** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Mesh messaging between teammates, shared task list, local state in `~/.claude/teams/`. Different from Task-tool subagents. | `agents/agent-teams.md` |
| 12 | **Channels plugin** connects Claude Code to Telegram / Discord / iMessage via MCP. Requires Bun + `--channels` flag + allowlist-mode pairing. v2.1.80+. | `development/claude-code-channels.md` |
| 13 | **Settings hierarchy (5 scopes)**: Managed > CLI > Local > Project > User. Managed can lock everything via `allowManagedHooksOnly` / `allowManagedPermissionRulesOnly`. | `settings-reference.md` |
| 14 | **`/ultrareview`** (cloud parallel multi-agent PR review) shipped in v2.1.111. Pro/Max get 3 free runs. | `changelog.md` |
| 15 | **`/less-permission-prompts`** skill proposes a prioritized allowlist by scanning your transcripts for safe read-only calls. v2.1.111. | `changelog.md` |
| 16 | **Cache-TTL envs.** `ENABLE_PROMPT_CACHING_1H` opts into 1-hour TTL. `FORCE_PROMPT_CACHING_5M` forces 5-minute. | `changelog.md` (v2.1.108) |
| 17 | **Valid hook output fields** unchanged from previous docs; `appendToSystemPrompt` still does not exist. Use `hookSpecificOutput.additionalContext`. | (Cross-ref to existing `.aicodepath/CLAUDE.md`) |

---

## Source URLs (as supplied by user)

Changelog (Anthropic official):
- https://code.claude.com/docs/en/changelog

Development (third-party fan-site):
- https://code.claude.com/blog/guide/development/agentic-engineering-best-practices [REDIRECTS — no content available]
- https://claudefa.st/blog/guide/development/opus-4-7-best-practices
- https://claudefa.st/blog/guide/development/code-review
- https://claudefa.st/blog/guide/development/claude-code-channels
- https://claudefa.st/blog/guide/development/permission-management
- https://claudefa.st/blog/guide/development/auto-mode
- https://claudefa.st/blog/guide/development/feedback-loops
- https://claudefa.st/blog/guide/development/todo-workflows
- https://claudefa.st/blog/guide/development/task-management
- https://claudefa.st/blog/guide/development/project-templates
- https://claudefa.st/blog/guide/development/usage-optimization
- https://claudefa.st/blog/guide/settings-reference

Performance (third-party fan-site):
- https://claudefa.st/blog/guide/performance/deep-thinking-techniques
- https://claudefa.st/blog/guide/performance/speed-optimization
- https://claudefa.st/blog/guide/performance/fast-mode
- https://claudefa.st/blog/guide/performance/efficiency-patterns

Agents (third-party fan-site):
- https://claudefa.st/blog/guide/agents/agent-fundamentals
- https://claudefa.st/blog/guide/agents/async-workflows
- https://claudefa.st/blog/guide/agents/sub-agent-best-practices
- https://claudefa.st/blog/guide/agents/sub-agent-design
- https://claudefa.st/blog/guide/agents/task-distribution
- https://claudefa.st/blog/guide/agents/team-orchestration
- https://claudefa.st/blog/guide/agents/agent-teams
- https://claudefa.st/blog/guide/agents/agent-teams-controls
- https://claudefa.st/blog/guide/agents/agent-teams-use-cases
- https://claudefa.st/blog/guide/agents/agent-teams-best-practices
- https://claudefa.st/blog/guide/agents/agent-teams-workflow
- https://claudefa.st/blog/guide/agents/custom-agents
- https://claudefa.st/blog/guide/agents/agent-patterns
- https://claudefa.st/blog/guide/agents/human-like-agents

Example templates (third-party fan-site):
- https://claudefa.st/blog/guide/examples-templates
