# Claude Opus 4.7 Best Practices: Detailed Plans Win

**Source**: https://claudefa.st/blog/guide/development/opus-4-7-best-practices
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM — with ClaudeFast v5.2 product plugs kept inline so you can see which claims are third-party]

> **Provenance note**: This article mixes Anthropic's public Opus 4.7 guidance with the
> `claudefa.st` authors' own product ("ClaudeFast Code Kit v5.2"). Content in **bold-italic**
> below marks ClaudeFast-v5.2-specific product claims that are NOT native Claude Code. Any
> commands like `/team-plan`, `/build`, `/team-build`, Code Kit pipeline, skills architecture,
> and CodeStats are **ClaudeFast product features**, not Anthropic-native.

---

Opus 4.7's biggest shift is not raw intelligence. It is literalism. The model does exactly what
you tell it, which punishes vague prompts and rewards detailed plans. Boris Cherny from
Anthropic put it plainly: "it took a few days for me to learn how to work with it effectively."
Most users will notice the same thing. Prompts that produced clean output on 4.6 now generate
narrower, more literal results unless you restructure how you brief the model.

## What Actually Changed for Practitioners

The headline benchmark numbers for Opus 4.7 are useful, but four behavioral changes matter more
for day-to-day Claude Code work:

- **Stricter instruction-following.** Opus 4.7 interprets instructions more literally than 4.6.
  Notion found it was the first model to pass their implicit-need tests. The flip side is that
  prompts relying on the model to fill in context now underperform.
- **More selective subagent spawning.** The default favors doing work in one response over
  fanning out. If you want parallelization, say so explicitly.
- **Adaptive thinking.** Fixed thinking budgets are gone. The model decides how long to reason
  based on context. You influence it by prompting: "think carefully before responding" for more,
  "prioritize responding quickly" for less.
- **New `xhigh` default.** The effort scale now runs `low`, `medium`, `high`, `xhigh`, `max`.
  Claude Code defaults to `xhigh`, which sits between `high` and `max` and gives most of the
  reasoning depth without the full cost of `max`.

Anthropic's framing: treat Claude like a capable engineer you are delegating to, not a pair
programmer you are chatting with. Front-load intent, constraints, acceptance criteria, and file
paths. Batch your questions. Every user turn adds reasoning overhead.

## The Detailed Plan Is the New Prompt

The single biggest leverage point for 4.7 is a well-scoped plan. Anthropic is explicit about
this: include intent, constraints, acceptance criteria, and relevant file paths in the first
turn. Stricter instruction-following means a plan with 12 acceptance criteria produces 12
checked items. A plan with vague intent produces a vague implementation.

***ClaudeFast v5.2 — third-party.*** *The `/team-plan` → `/build` pipeline in ClaudeFast v5.2
auto-detects session type (Development, Debugging, Migration, Review, TDD, Research, Growth,
Repo-Port) and loads the matching protocol with tailored quality gates. The output is a plan
file in `.claude/tasks/` that captures intent and scope boundaries, relevant files with line
numbers, acceptance criteria per task, specialist agent assignments, and verification steps
before completion.*

Three patterns from the post that map to Opus 4.7 work regardless of toolkit:

- **Mandatory plan reading.** Every sub-agent dispatched must read the full plan file as its
  first action. Literal interpretation means sub-agents drift without the full context.
- **Verification before completion.** Sub-agents verify their work against acceptance criteria
  before marking tasks complete. Intuit described this as "catching its own logical faults
  during the planning phase."
- **Assumption surfacing.** Moderate and complex tasks should state key assumptions before
  implementing. When multiple valid approaches exist, present options rather than choosing
  silently. 4.7 will choose silently only when given permission to.

## Opus 4.7 Effort Levels

Opus 4.7 has five effort levels: `low`, `medium`, `high`, `xhigh`, and `max`. Claude Code
defaults to `xhigh`. Switch mid-session with `/effort <level>`.

| Level | Use case | Cost | Example |
|-------|----------|------|---------|
| `low` | Classification, extraction, formatting, grammar fixes | Lowest | "Tag these 50 support tickets by intent" |
| `medium` | General questions, short summaries, docs lookups | Low | "Summarize this ADR in 200 words" |
| `high` | Most intelligence-sensitive work, API callers not on Claude Code | Moderate | Default for Messages API apps doing real reasoning |
| `xhigh` | Coding, multi-step reasoning, agentic work, trade-off analysis | High | Refactors, design reviews |
| `max` | Correctness-critical evals, benchmark iteration, hardest algorithms | Highest | Final-pass review on shipping code |

> Hex's CTO: "low-effort Opus 4.7 is roughly equivalent to medium-effort Opus 4.6."

A practical phase-by-phase recipe:

| Phase | Effort | Why |
|-------|--------|-----|
| Planning | `xhigh` | Plan quality compounds into every execution step |
| Execution | `high` | Specialist agents working from clear plans |
| Verification | `xhigh` | Catching drift before it ships |
| Exploratory / docs | `medium` | Cost-sensitive, low-stakes |
| Deep evals | `max` | Worth the cost for correctness-critical work |

Existing users without a manually set effort level were auto-upgraded to `xhigh` when 4.7
shipped.

The updated tokenizer is worth noting. Same input may map to roughly 1.0 to 1.35× more tokens
than 4.6 depending on content type.

## Task Budgets: Capping Agent Spend in Opus 4.7

Task budgets are Opus 4.7's soft token ceiling for an entire agentic loop — thinking + tool
calls + tool results + final output. The model sees a running countdown and uses it to
prioritize. Public beta. Minimum budget: 20,000 tokens. Beta header: `task-budgets-2026-03-13`.

```python
response = client.beta.messages.create(
    model="claude-opus-4-7",
    max_tokens=128000,
    output_config={
        "effort": "xhigh",
        "task_budget": {"type": "tokens", "total": 128000},
    },
    betas=["task-budgets-2026-03-13"],
    messages=[
        {"role": "user", "content": "Review this codebase and propose a refactor plan."}
    ],
)
```

- `task_budget` is a **suggestion the model sees, not a hard cap**.
- `max_tokens` is the **hard per-request cap**; the model is not aware of it.
- Use `task_budget` when you want the model to self-moderate.
- Use `max_tokens` as a ceiling to prevent runaway spend.

Rule of thumb: start at 2–3× the tokens a competent human engineer would need to do the task.
If the model hits the ceiling, the prompt is the problem, not the model. Pair budgets with
stop criteria ("stop when tests pass") and fallbacks ("if you can't find X, return Y, don't
guess") or the end-of-budget becomes a hallucination. Anthropic: "too-restrictive task budgets
may lead to less-thorough completion or outright refusal."

For Agent SDK users, `maxBudgetUsd` is the dollar-denominated cousin:

```python
options: {
  maxBudgetUsd: 0.15,
  maxTurns: 5,
}
```

## Subagent Selectivity Is a Feature When Your Plan Is Explicit

Anthropic: "Do not spawn a subagent for work you can complete directly in a single response.
Spawn multiple subagents in the same turn when fanning out across items."

Positive framing outperforms negative on 4.7 — use positive examples of desired voice rather
than "don't do this" instructions. "Spawn a specialist for each of: frontend, backend,
database" outperforms "don't try to do this in one response."

## Auto Mode + xhigh: The Long-Running Combo

Anthropic's recommendation for trusted long-running tasks is auto mode combined with `xhigh`.

Cognition (Devin): 4.7 "works coherently for hours, pushes through hard problems." That
behavior only surfaces when you stop interrupting it mid-flow.

## Migrating Prompts From 4.6

### Breaking API Changes

Three things return a 400 error on Opus 4.7 that worked on 4.6. Strip them before migrating:

```python
# BROKEN on Opus 4.7
response = client.messages.create(
    model="claude-opus-4-7",
    temperature=0,                          # 400: sampling params removed
    top_p=0.95,                             # 400: sampling params removed
    thinking={"type": "enabled", "budget_tokens": 32000},  # 400: extended thinking budgets removed
)

# WORKS on Opus 4.7
response = client.messages.create(
    model="claude-opus-4-7",
    thinking={"type": "adaptive", "display": "summarized"},  # adaptive is the only thinking-on mode
    output_config={"effort": "xhigh"},
)
```

**Silent change**: `thinking.display` now defaults to `"omitted"`. If your product streams
reasoning to users, set `display: "summarized"` explicitly or users will see a long blank pause
before output begins. No error fires, but the UX regresses.

If you were using `temperature=0` for determinism: it never guaranteed identical outputs on
Anthropic's API. Safest migration is to remove the parameter entirely.

### Tokenizer Changes: Expect 1.0–1.35× More Tokens

Opus 4.7 ships with a new tokenizer. Same input encodes into 1.0 to 1.35× as many tokens
depending on content type. List pricing unchanged at $5/$25 per million, but effective cost per
request can rise. Run `v1/messages/count_tokens` on a representative workload before you
migrate. Update `max_tokens` to give additional headroom, particularly on compaction triggers.

### Rewriting Vague Prompts for Literal Interpretation

1. **Convert implicit context to explicit.** If a prompt worked because 4.6 inferred "obviously
   you also want tests," add tests to acceptance criteria for 4.7.
2. **Replace don't-do-this with do-this.** Negative instructions produce unreliable results.
   Positive examples match intent directly.
3. **Be explicit about parallelism.** If you want multiple agents, state the fan-out pattern.
   4.7's default is single-response.
4. **Batch questions into single turns.** Every user turn adds reasoning overhead. Three
   related questions in one turn beats three sequential turns.
5. **Front-load file paths.** The model processes paths literally. Passing
   `apps/web/src/app/(home)/page.tsx` saves two tool calls versus "the homepage file."
6. **Remove scaffolding the model no longer needs.** Prompts with "double-check the slide
   layout before returning" or forced interim status messages can be stripped. Anthropic
   explicitly recommends removing these and re-baselining, since 4.7 now self-verifies and
   emits regular progress updates natively.

## Claude Code Commands That Pair Well With Opus 4.7

Native Claude Code commands (Anthropic):

- `/model claude-opus-4-7` — switches the model for the current session without touching config.
- `/effort xhigh` — overrides default effort mid-session. Drop to `medium` for exploratory work,
  bump to `max` for final-pass review.
- `/ultrareview` — (shipped v2.1.111) spawns four specialist agents in parallel (security, logic,
  performance, style), each reading the diff with its own system prompt. Pro and Max users get
  3 free runs.
- `/rewind` (alias `/undo`) — beats in-place correction when a first attempt goes wrong. Strips
  the failed attempt's tool calls from context and re-prompts with only the learning.

***ClaudeFast v5.2 commands — third-party, NOT native Claude Code:***

- *`/team-plan`, `/build`, `/team-build`* — ClaudeFast Code Kit pipeline.

## FAQ (selected)

**What is xhigh effort in Claude Opus 4.7?** `xhigh` is a new fifth tier between `high` and
`max`. Claude Code defaults to it on every plan. Deeper reasoning than `high` without the full
token cost of `max`. Suited to agentic coding, multi-step reasoning, and trade-off analysis.

**Should I always use xhigh?** No. `xhigh` on trivial work wastes tokens because adaptive
thinking runs longer on ambiguous prompts. Drop to `medium` or `low` for classification,
extraction, formatting, or short summaries.

**How do I set a task budget in Opus 4.7?** Pass the `task-budgets-2026-03-13` beta header and
add `task_budget: {type: "tokens", total: N}` to `output_config`. Minimum is 20,000 tokens.
Soft suggestion, not a hard cap.

**Why are my 4.6 prompts giving worse results on 4.7?** Almost always because 4.6 silently
filled in implicit context and 4.7 does not. Rewrite the prompt with explicit intent, success
criteria, and constraints. Strip `temperature`, `top_p`, `top_k`. If you streamed reasoning,
set `thinking.display: "summarized"`.

**Is the tokenizer change a price increase?** No, list pricing identical. Effective cost per
request can rise 1.0–1.35×. Benchmark your workload with `count_tokens` before migrating.

## Model switch command

```
claude config set model claude-opus-4-7
/effort xhigh
```
