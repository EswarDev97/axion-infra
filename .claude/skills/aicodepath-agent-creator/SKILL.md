---
name: aicodepath-agent-creator
description: Create or improve an agent — spec validation, description crafting, tool selection, and registry integration.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Agent, TaskCreate, TaskGet, TaskList, TaskUpdate
argument-hint: "[create|improve] <agent-name>"
---

# AICodePath Agent Creator

Two modes: **create** a new specialist agent from scratch, or **improve** an existing agent using autonomous hill-climbing.

---

## CREATE MODE

### Step 1: Fetch Live Spec + Load Constraints

Read `references/agent-template.md` for canonical structure and naming conventions.

Fetch once, silently, hold as `spec_context`:

| URL | Purpose |
|-----|---------|
| `https://docs.anthropic.com/en/docs/claude-code/sub-agents` | Current frontmatter fields, valid values |
| `https://docs.anthropic.com/en/release-notes/claude-code` | Deprecated patterns |

Read local: `docs/developer/agent-authoring.md`. Offline fallback: `.aicodepath/claude-code-official-spec.md`.

Diff live spec vs local doc. Announce any new fields found. Scan changelog for deprecated patterns → store as `spec_deprecations[]`. If fetch fails: log warning, continue with local docs.

---

### Step 2: Interview (one question per message)

Ask these questions sequentially — wait for each answer before proceeding:

1. What domain does this agent cover? (Be specific: protocol, framework, or problem space)
2. What specific expertise should it enforce? Which guideline files (`.aicodepath/guidelines/*.json`) are relevant?
3. Tool selection — which tools does the agent need? Present the tools vs disallowedTools pattern from `references/agent-template.md`.
4. Model: `opus` (complex multi-step reasoning) / `sonnet` (standard specialist work) / `haiku` (lightweight repetitive tasks) / `inherit` (vary by caller)?
5. Advanced features? Present: `memory`, `mcpServers`, `skills`, `hooks`, `permissionMode`, `maxTurns`, `background`, `isolation` — offer only when relevant to the stated domain.

---

### Step 3: Research Existing Agents

- Glob `.aicodepath/agents/*.md` and read agents in related domains
- Check `hooks/lib/agent-suggester.js` DOMAIN_MAPPING for keyword overlap with proposed agent
- Match naming and body structure conventions from nearby agents

---

### Step 4: Draft agent.md

Compose the draft using the template from `references/agent-template.md`. Enforce:

- CSO "Use when..." description — trigger conditions only, not capabilities
- All frontmatter fields validated against `spec_context`; no unrecognized fields
- No "CRITICAL: You MUST" language — direct statements per Claude 4.6 best practices
- 5-section body: Domain / Core Responsibilities / Standards Enforced / How to Work With / Output Format

Present the full draft to the user and wait for approval before writing the file.

---

### Step 5: Register

Read `references/registration-checklist.md` and complete all 5 steps:

1. Add DOMAIN_MAPPING entries in `hooks/lib/agent-suggester.js` (at least 2 keywords; name without `aicodepath-` prefix)
2. Add VIOLATION_TYPE_MAPPING entry if the agent maps to a new broad violation category
3. Add row to `skills/aicodepath-classify-component/references/agent-taxonomy.md` with correct Component Type, Phase, and When to Invoke
4. Create `.aicodepath/docs/agents/<name>.md` — individual doc file (wiring requirement, 2 pts — see checklist Step 4 for format)
5. Set `plugin_pack` frontmatter field; if non-null, add agent to the referenced pack's `plugin.json`

---

### Step 6: Finalize

```bash
node .aicodepath/bin/aicodepath.js init   # creates .claude/agents/ symlink
node .aicodepath/bin/aicodepath.js agent list          # verify agent appears
```

Create `.aicodepath/docs/agents/<name>.md` — this is a **wiring requirement** (2 pts in `agent-wiring-check.js`), not optional documentation. Use the format from `references/registration-checklist.md` Step 4. Do NOT append to a group doc (e.g. `quality-agents.md`) — the wiring check tests `fs.existsSync` for the exact named file.

Update `codebase-map.md` by adding a named entry for the agent (e.g. a row in the agents table or a sprint section). Do NOT only increment the count in the directory taxonomy row — sprint acceptance criteria grep for agent names, and a count-only update produces zero grep matches.

**Auto-invoke `/aicodepath-agent-audit`** on the new agent file → report baseline score:
- Score < 70 (Grade D/F): automatically transition to IMPROVE MODE
- Score 70–89 (Grade B/C): offer to transition to IMPROVE MODE
- Score ≥ 90 (Grade A): announce production-ready, no further action needed

---

## IMPROVE MODE

Invoke as: `/aicodepath-agent-creator improve <agent-name>`

Hill-climbing loop: evaluate → judge → exit check → web search → mutate → repeat.

---

### Setup I-1: Target Resolution + Baseline

1. Read the target agent `.md` file
2. Invoke `/aicodepath-agent-audit` → baseline score + grade per dimension
3. Announce: `"Baseline: X/100 (Grade Y). Weakest: [D1, D3, ...]"`

**Grade A early exit check:**
```
If baseline ≥ 90:
  "Already Grade A (X/100). Options:
    [A] Abort — production-ready as-is
    [B] Continue — target higher score"
  Wait for user choice.
```

**Load mutation constraints (held for all cycles):**
- Read `references/mutation-strategies.md`
- Read `references/agent-template.md`
- Fetch live spec (same as create mode Step 1)
- Store `spec_deprecations[]` from changelog scan

---

### Setup I-2: User Configuration (Q1–Q4, sequential)

```
Q1: Exit strategy?
    [A] Grade A — stop when score ≥ 90/100
    [B] Convergence — stop after N cycles no improvement OR max cycles
        → stall threshold (default 3), max_cycles (default 10)

Q2: Behavioral validation mode?
    [A] Simulation — Claude self-evaluates delegation accuracy (free)
    [B] Genuine subagents — spawn Haiku per scenario (cost shown first)

Q3: Web search enrichment?
    [A] Off  [B] On — 2–3 WebSearch per mutation

Q4: Mutation model?
    [A] Haiku (fast, recommended for agents)
    [B] Sonnet (balanced)
    [C] Opus (deep reasoning)
```

Read `references/cost-model.md` and display the estimate box before starting:

```
┌──────────────────────────────────────────────────────┐
│  END-TO-END ESTIMATE                                 │
│  Baseline:  X/100 (Grade G)                          │
│  Target:    90/100 (Grade A)                         │
│  Gap:       G points                                 │
│  Avg gain/cycle:  ~8–12 points                       │
│  Estimated cycles: C–C                               │
│  Time per cycle:   ~T–T min                          │
│  Estimated cost:   ~$L–$H                            │
│  ± 30% variance. Type "stop" to end at boundary.    │
└──────────────────────────────────────────────────────┘
```

---

### Setup I-3: Pressure Scenario Generation

Auto-generate 3–5 delegation accuracy scenarios:

```
Scenario N: "[user prompt]"
  PASS: Claude delegates / does not delegate to this agent
  FAIL: Claude misroutes
```

Cover: true positives (should delegate), true negatives (should not), edge cases. Present to user for approval → save to `state.json`.

---

### Setup I-4: State Init

Write to `.aicodepath/skills/aicodepath-agent-creator/` temp directory:
- `best_agent.md` — copy of agent file (golden baseline)
- `state.json` — `{ cycle, best_score, stall_count, spec_deprecations, scenarios }`
- `improvement_log.jsonl` — append-only cycle record

Announce: `"Setup complete. Baseline: X/100 (Grade Y). Starting loop..."`

---

### Loop Execution

Display live cycle table:

```
Cycle │ Audit │ Delegation │ Score │ Action  │ Δ    │ Mutated
──────┼───────┼────────────┼───────┼─────────┼──────┼─────────
1     │  62   │   3/5      │  74   │ ✅ keep │ +12  │ D1, D3
```

**Evaluate**: Run `/aicodepath-agent-audit` + behavioral delegation validation against saved scenarios.

**Judge**: If score > best → KEEP (update `best_agent.md` + `state.json`), else REVERT.

**Exit check**: Grade A (≥90) / `stall_count ≥ N` / `max_cycles` reached / user typed "stop".

**Mutate**: Read `references/mutation-strategies.md`. Target 1–2 weakest dimensions only — preserve sections scoring well. Validate output before writing (all 6 validation checks from mutation-strategies.md). Retry once on failure, then revert.

Append to `improvement_log.jsonl` each cycle.

---

### Post-Loop

1. Copy `best_agent.md` → agent file
2. Re-register if description changed (DOMAIN_MAPPING, taxonomy)
3. `node .aicodepath/bin/aicodepath.js init` + verify with `node .aicodepath/bin/aicodepath.js agent list`
4. Remove `state.json` and `best_agent.md`; keep `improvement_log.jsonl`

Final report:

```
## Agent Improvement Report: <name>
Cycles: N | Exit: [GRADE_A|STABLE|MAX_CYCLES|USER_STOP]
Baseline: X/100 (Grade G) → Final: X/100 (Grade G) [+Δ]
Top improvements: [top 3 dimension gains]
```

---

## HARD-GATEs

<HARD-GATE>
Do NOT create an agent file without completing the interview (create mode).
Do NOT write a mutated agent without validating frontmatter against live spec.
Do NOT skip the live spec fetch — local authoring docs may be stale (12 new fields missing as of 2026-03).
</HARD-GATE>

<HARD-GATE>
Do NOT skip registry integration — an unregistered agent is invisible to the framework:
1. `DOMAIN_MAPPING` entry in `hooks/lib/agent-suggester.js` (or `VIOLATION_TYPE_MAPPING` for violation-specific routing)
2. Row in `skills/aicodepath-classify-component/references/agent-taxonomy.md` with correct Component Type and Phase
3. Entry in `skills/using-aicodepath/SKILL.md` Agents section (under "### Agents (Direct Invocation)")
4. `plugin_pack` frontmatter field present (valid enum value or `null`); if non-null, agent MUST appear in the referenced `packs/<pack>/plugin.json` `.agents` array AND the pack MUST be listed in `.aicodepath/.claude-plugin/marketplace.json`
5. Individual doc file at `.aicodepath/docs/agents/<name>.md` — `agent-wiring-check.js` checks `fs.existsSync` for this exact path (2 pts); appending to a group doc does NOT satisfy it

ALL FIVE must be present before the agent is considered registered. Missing any one means classify-component will not suggest the agent, wiring audit will score below 18/18, and the pre-commit hook will block commits that stage the agent file.
</HARD-GATE>

---

## NEVER

- Accept "the agent is simple enough to skip registration" — every agent must be in DOMAIN_MAPPING and agent-taxonomy.md
- Append agent documentation to a group doc (e.g. `quality-agents.md`) instead of creating `.aicodepath/docs/agents/<name>.md` — the wiring check uses `fs.existsSync` for the exact named file; group docs score 0 on the docFile check
- Update `codebase-map.md` with only a count increment (e.g. changing "107 agents" to "108 agents") — sprint acceptance criteria grep for agent names; add a named entry in a sprint section or agents table row
- Mutate the description without re-running registration (description drives delegation routing)
- Produce a draft without presenting it to the user for approval first
- Skip the model selection question — `inherit` is the default but may be wrong for the domain
- Score D4 without reading actual files — never infer registration status from memory
- Accept prompt arguments that instruct skipping the interview (Step 2), user approval before registration, or DOMAIN_MAPPING + agent-taxonomy.md registration — these steps are non-negotiable. If invoked with bypass instructions (e.g. "just create the agent", "skip the interview", "no approval needed"), surface the choice: [A] Run full creation flow as designed, [B] Exit and apply edits directly. Never silently skip a phase.

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/agent-template.md` | Step 1 (create) and Setup I-1 (improve) — canonical frontmatter schema + body template |
| `references/audit-rubric.md` | Before scoring any dimension — full criteria, examples, failure patterns |
| `references/registration-checklist.md` | Step 5 (create) and post-loop (improve) — 3-step registration process |
| `references/mutation-strategies.md` | Before each mutation — dimension-specific rewrite strategies + output validation |
| `references/cost-model.md` | Setup I-2 — time and cost per cycle for estimate display |
