# Design Mode Templates

Use these when running Design Mode to propose a new agentic harness from scratch. Each template encodes which primitives belong in Day One / Week One / Month One for a given product type, with Claude Code reference anchors so the user can read the canonical implementation.

## How to use

1. Identify the product type from the user's request (chat assistant, coding agent, customer-support bot, code-review bot, autonomous research agent, scheduled task runner, etc.)
2. Match it to the closest template below (or compose from multiple if the product is hybrid)
3. Output a markdown plan at `aicodepath-docs/harness-design/<product-type>.md` containing:
   - Day One primitives (build first, before any user can use the system)
   - Week One primitives (build second, before scaling)
   - Month One items (build third, when the product hits production volume)
   - For each primitive: the bar, the CC reference anchor, and a sketch of how this product type should implement it

## Universal minimum (any agentic product)

These primitives are non-negotiable for any system that calls an LLM in a loop:

| Day One slot | Primitive | Why universal |
|---|---|---|
| 1 | Tool Registry Metadata-First (#1) | Without static enumeration, you cannot debug, document, or migrate |
| 2 | Session Persistence (#3) | Crashes happen; users will not retype |
| 3 | Token Budget (#5) | Runaway agents are an existential risk |
| 4 | Structured Streaming Events (#6) | Required for any kind of observability |
| 5 | System Event Logger (#7) | Required for any kind of debugging or audit |

The remaining 7 primitives vary by product type.

## Template A — Coding Agent (writes/edits files)

Examples: Claude Code, Cursor, Aider, Cody, custom code-gen tools.

**Day One (8)**: Universal minimum + #2 (Permission Tiers — coding agents touch the filesystem) + #4 (Workflow State — multi-turn refactors) + #8 (Verification Harness — must verify changes compile/test).

**Week One (4)**: #9 (Tool Pool Assembly — many tools, must subset) + #10 (Transcript Compaction — long sessions are normal) + #11 (Permission Audit — needed for trust) + #12 compound (Doctor + StagedBoot + StopReason + Provenance — diagnostic surface).

**Month One**: Agent type system (specialist agents per language/task), memory aging (knowledge.md style), skills framework, hooks architecture, multi-agent coordination.

**CC reference for the whole template**: aicodepath-tool itself (10/12 STRONG) is the closest open implementation. Read `cc-source-map.md` for per-primitive Claude Code anchors.

## Template B — Conversational Assistant (chat-only, no file ops)

Examples: customer support bots, knowledge-base assistants, FAQ bots.

**Day One (6)**: Universal minimum + #4 (Workflow State — multi-turn conversations have phases like greeting → diagnosis → resolution).

**Week One (3)**: #10 (Transcript Compaction — chat sessions get long) + #12c (Stop Reason — for handoff to human) + #12d (Provenance — for citation of knowledge sources).

**Month One**: Skipped — chat-only products often don't need #2/#11 (no destructive tool calls), #8 (no code to verify), or #9 (small fixed toolset).

## Template C — Autonomous Research Agent (long-running, multi-step)

Examples: deep research bots, data analysis agents, autonomous experiment runners.

**Day One (8)**: Universal minimum + #4 (Workflow State — research has explicit phases) + #8 (Verification Harness — must verify findings) + #11 (Permission Audit — autonomous decisions need accountability).

**Week One (4)**: #9 (Tool Pool Assembly — many search/analysis tools) + #10 (Transcript Compaction — research sessions are very long) + #12a (Doctor — long sessions need health checks) + #12d (Provenance — every claim must trace to a source).

**Month One**: Agent type system (specialist explore/plan/execute roles), memory provenance with aging, multi-agent coordination for parallel research.

## Template D — Scheduled Task Runner (cron-style, no human in loop)

Examples: nightly report generators, scheduled data pipelines, autonomous monitors.

**Day One (8)**: Universal minimum + #4 (Workflow State — must be idempotent across reruns) + #8 (Verification Harness — no human to catch errors) + #11 (Permission Audit — fully autonomous).

**Week One (4)**: #2 (Permission Trust Tiers — destructive ops without human gate need strict tiering) + #12a (Doctor — runs unattended) + #12b (Staged Boot — fail fast in CI) + #12c (Stop Reason — exit codes matter for orchestrators).

**Month One**: Hooks architecture (so external systems can react to runs), analytics (so trends are visible), config migrations.

## Template E — Multi-Agent Swarm (parallel workers + coordinator)

Examples: aicodepath-tool's swarm mode, distributed code generation, parallel research.

**Day One (8)**: Universal minimum + #2 (Permission Tiers — workers must not exceed coordinator's authority) + #4 (Workflow State — coordinator must track which worker is on which task) + #11 (Permission Audit — per-worker accountability is the whole reason swarms are scary).

**Week One (4)**: #9 (Tool Pool Assembly — workers get role-specific subsets) + #10 (Transcript Compaction — coordinator context must stay lean) + #12c (Stop Reason — workers need to report back why they stopped) + #12d (Provenance — coordinator must know which worker generated which artifact).

**Month One**: Agent type system (specialist worker roles), multi-agent coordination protocols, hooks for worker lifecycle events.

**Special note**: swarms are the highest-risk product type. Add a per-worker permission ledger BEFORE Week One — it's not optional like elsewhere.

## Output format for Design Mode

Generate `aicodepath-docs/harness-design/<product-type>.md` with this structure:

```markdown
# Harness Design — <Product Type>
**Generated**: <ISO timestamp>
**Template base**: <A | B | C | D | E | hybrid>

## Day One — Build First
| # | Primitive | Why for this product | CC reference | Implementation sketch |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Week One — Build Second
...

## Month One — Build Third
...

## Sequencing rationale
<Why this order specifically; what depends on what>

## Risks if you skip
<What breaks if you ship without each tier>

## Reference reading
<Which CC source files to study before implementing>
```

The implementation sketch column should NOT be a complete design — it should be a 2-3 sentence pointer to the CC reference + the most relevant function/file in aicodepath-tool (if applicable) so the reader can study a working example.

## When the user's product doesn't fit a template

If the request doesn't match A-E:
1. Compose from multiple templates (e.g., "code review bot" = Coding Agent template B for the code-touching parts + Conversational Assistant template A for the comment generation parts)
2. Always start from the universal minimum (the 5 primitives every product needs)
3. Add Week One primitives based on the highest-risk operation the product performs
4. Cite the CC anchor for every primitive proposed — never propose a primitive without telling the reader where to read the canonical implementation

## What NOT to do in Design Mode

- **Never** propose all 12 primitives as Day One. The product won't ship.
- **Never** propose primitives without sequencing them. "Build all 12" is not a plan.
- **Never** copy-paste this template — adapt the rationale to the specific product.
- **Never** invent new primitives. Stick to Nate's 12. Extensions should go in Month One.
- **Never** propose Month One items before Day One is complete. The whole point of the tier system is sequencing.
