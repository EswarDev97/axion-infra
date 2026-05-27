---
name: aicodepath-agent-audit
description: Evaluate agent quality — scores 6 dimensions, outputs letter grade and ranked improvements.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebFetch
argument-hint: "[agent-name or path or 'all']"
---

# AICodePath Agent Audit

Evaluate AICodePath agents against a 6-dimension rubric (100 points total), producing a letter grade and ranked improvement actions.

**MANDATORY**: Read the full rubric before scoring any dimension:
[`aicodepath-agent-creator/references/audit-rubric.md`](../aicodepath-agent-creator/references/audit-rubric.md)

---

## Step 1: Resolve Target

Parse the argument:

- Single agent name (e.g., `security-engineer`) → resolve to `.aicodepath/agents/<name>.md`
- Single path (e.g., `.aicodepath/agents/security-engineer.md`) → use as-is
- `all` or no argument → Glob `.aicodepath/agents/*.md` for batch mode

---

## Step 2: Fetch Live Spec (silent)

Fetch both URLs silently and hold content as `spec_context`:

| URL | Purpose |
|-----|---------|
| `https://docs.anthropic.com/en/docs/claude-code/sub-agents` | Current frontmatter fields, valid values |
| `https://docs.anthropic.com/en/release-notes/claude-code` | Deprecated patterns to flag |

Fallback (if fetch fails): log warning, continue with `.aicodepath/claude-code-official-spec.md` and `docs/developer/agent-authoring.md`.

---

## Step 3: Load Rubric

Read `aicodepath-agent-creator/references/audit-rubric.md` before scoring.

This is MANDATORY — never assign a score without reading the rubric criteria for that dimension.

---

## Step 4: Score Each Dimension

For each agent file, score all 6 dimensions using the rubric:

| # | Dimension | Max | What to check |
|---|-----------|-----|---------------|
| D1 | Spec Compliance | 20 | Frontmatter validity against `spec_context` |
| D2 | Domain Expertise | 20 | Body quality — specific niche, actionable responsibilities, concrete standards, structured output |
| D3 | Tool Appropriateness | 15 | `tools` field scoped correctly; `disallowedTools` present where agent is read-only |
| D4 | Integration Completeness | 15 | Read `agent-suggester.js` DOMAIN_MAPPING + `agent-taxonomy.md` + verify `.claude/agents/` symlink |
| D5 | Description Trigger Accuracy | 15 | Description fires for the right tasks, avoids adjacent agent overlap |
| D6 | Prompting Quality | 15 | No "CRITICAL/MUST/ALWAYS" overuse, no redundancy, direct instructions |

**D4 requires reading actual files** — open `hooks/lib/agent-suggester.js` and `skills/aicodepath-classify-component/references/agent-taxonomy.md` and check `.claude/agents/` with Bash. Never score D4 from memory.

---

## Step 5: Calculate Grade and Generate Report

```
Total = D1 + D2 + D3 + D4 + D5 + D6  (max 100)
```

| Grade | Points | Meaning |
|-------|--------|---------|
| A | 90+ | Production-ready |
| B | 80–89 | Good — minor improvements needed |
| C | 70–79 | Adequate — clear improvement path |
| D | 60–69 | Significant issues |
| F | <60 | Needs fundamental rework |

### Single Agent Report Format

```
## Agent Audit Report: <name>

| Dimension | Score | Max | Notes |
|-----------|-------|-----|-------|
| D1: Spec Compliance | X | 20 | |
| D2: Domain Expertise | X | 20 | |
| D3: Tool Appropriateness | X | 15 | |
| D4: Integration Completeness | X | 15 | |
| D5: Description Trigger Accuracy | X | 15 | |
| D6: Prompting Quality | X | 15 | |
| **Total** | **X** | **100** | **Grade [A/B/C/D/F]** |

### Critical Issues
[ERROR-level items blocking production use]

### Top 3 Improvements (ranked by impact)
1. [Dx] ...
2. [Dx] ...
3. [Dx] ...
```

### Batch Report Format

```
## Agent Audit Summary (N agents)

| Agent | D1 | D2 | D3 | D4 | D5 | D6 | Total | Grade |
|-------|----|----|----|----|----|-----|-------|-------|
| ... |

### Grade Distribution
A: N | B: N | C: N | D: N | F: N

### Systemic Issues (appear in 3+ agents)
[Patterns present across multiple agents]
```

---

## HARD-GATEs

<HARD-GATE>
Do NOT assign scores without reading the rubric first (Step 3).
Do NOT score D4 without reading agent-suggester.js, agent-taxonomy.md, and checking .claude/agents/.
Do NOT skip the live spec fetch — local docs may be missing fields added since the February 2026 snapshot.
Do NOT produce an empty or partial report — every dimension must be scored.
</HARD-GATE>

---

## Integration with improve mode

When invoked from `/aicodepath-agent-creator improve`:
- Return structured dimension scores (D1–D6) as input to mutation targeting
- Lowest-scoring dimensions drive which sections are mutated next cycle

---

## NEVER

- Score a dimension without pointing to specific evidence in the agent file
- Give full marks because an agent "looks well-formatted"
- Assume D4 is complete — always verify with file reads and Bash
- Skip batch agents when argument is `all` — every `.md` file in `.aicodepath/agents/` must be graded

---

## Wiring Check (non-scored)

After completing the scored audit, verify agent wiring completeness. These checks are not included in the score — they are binary pass/fail gates.

| Check | Command | Expected |
|-------|---------|----------|
| agent-taxonomy.md row | `grep -c "<agent-name>" .aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md` | ≥1 |
| using-aicodepath Agents section entry | `grep -c "<agent-name>" .aicodepath/skills/using-aicodepath/SKILL.md` | ≥1 |

Report: "Wiring: PASS" (both present) or "Wiring: FAIL — missing: [list]".

---

## See also — Harness Primitive Compliance (optional recommendation)

Agents participate in primitive #9 (Tool Pool Assembly) via `agent-suggester.js` DOMAIN_MAPPING and `agent-taxonomy.md`. If the Wiring Check above added new DOMAIN_MAPPING entries or new taxonomy rows, consider running:

```
/aicodepath-harness-eval evaluate --scope=primitive 9
```

This runs the full-project check for primitive #9 only — useful after any agent wiring change to verify the new agent is discoverable by the suggester and hasn't introduced duplicate routing keywords. Not mandatory — agents are markdown descriptions, not code, so most primitives don't apply. The suggestion is there to catch the one primitive that does.
