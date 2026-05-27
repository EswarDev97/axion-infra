---
name: aicodepath-mcp-builder
description: Build or improve MCP servers in TypeScript or Python — connects LLMs to external services.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, WebSearch, WebFetch, Agent, TodoWrite
argument-hint: "[new|improve] <server-name>"
---

# AICodePath MCP Builder

Build high-quality MCP (Model Context Protocol) servers that enable LLMs to accomplish real-world tasks against external APIs. Quality is measured not by API coverage alone — but by how accurately an LLM can answer realistic questions using only your server's tools.

## Mode Detection

**`new`** — Start at Phase 1 (PRE-FLIGHT).

**`improve`** — Skip to CLIMB LOOP directly:
1. Run `scripts/evaluation.py` against the existing server → establish baseline accuracy
2. If baseline = 0%: server is likely broken (auth failure, crash) → diagnose before looping
3. Jump to **Phase 5: CLIMB LOOP** with existing evaluation XML

---

## Phase 1: PRE-FLIGHT — Research & Planning

### 1.1 Understand the Target API

Before planning tools, answer these — the answers determine your tool count, shape your schemas, and prevent the #1 accuracy failure (tool returns wrong fields for the question):

- **Pagination**: cursor-based or offset? What's the max page size? (→ shapes your pagination helper signature)
- **Auth scope**: API key vs OAuth? Token expiry? (→ determines if you need token refresh logic)
- **Field density**: Does the list endpoint return full objects or summaries? (→ if summaries: you need a detail endpoint per item, which means more tool calls per question)
- **Rate limits**: requests/min? (→ determines if CLIMB LOOP can run full eval quickly or needs throttle)

### 1.2 Study MCP Protocol

Fetch the MCP sitemap first, then specific pages with `.md` suffix:

```
Start: https://modelcontextprotocol.io/sitemap.xml
Key pages: specification overview, transport mechanisms, tool definitions
```

### 1.3 Load Framework Docs via Context7

**Read [📋 MCP Best Practices](./references/mcp_best_practices.md) now** — universal naming, pagination, transport, and security standards.

Then fetch SDK docs using Context7:

```
1. mcp__plugin_context7_context7__resolve-library-id("<sdk name>")
2. mcp__plugin_context7_context7__query-docs(<library-id>, topic="tool registration")
3. Implement using verified method signatures only
```

- TypeScript: resolve `@modelcontextprotocol/sdk` → query tool registration + Zod schemas
- Python: resolve `mcp` or `fastmcp` → query tool registration + Pydantic models

**Fallback only if Context7 unavailable:**
- TypeScript: WebFetch `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`
- Python: WebFetch `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`

For language-specific patterns, load:
- TypeScript: [⚡ TypeScript Guide](./references/node_mcp_server.md)
- Python: [🐍 Python Guide](./references/python_mcp_server.md)

### 1.4 Plan Tool List

Before listing tools, ask yourself:
- **What real-world questions will users ask this server?** (→ work backwards from the evaluation questions you'll create)
- **What's the smallest query that still justifies its own tool?** (→ atomic > combined; see granularity rule below)
- **Can the LLM compose two simple tools to answer a complex question, or does complexity demand a specialized tool?** (→ if yes, prefer composition; if multi-step traversal is required, the specialized tool wins)

Preferred stack: **TypeScript** (static typing, broad SDK support, AI models generate it well). Transport: **streamable HTTP** for remote, **stdio** for local.

**Tool granularity rule**: One operation per tool. A tool that searches AND filters AND sorts in one call will be called incorrectly ~40% of the time — agents can't predict which combination applies to the question. Split it.

<HARD-GATE>
Do NOT write any tool implementation code until:
1. Context7 has verified the SDK's tool registration API surface
2. Transport type is decided (stdio vs streamable HTTP)
3. Tool list is written out with action verbs and service prefixes
</HARD-GATE>

---

## Phase 2: CONSTRUCTION — Implementation

Invoke `/aicodepath-tdd` before writing any tool handler. Each tool needs a failing test first.

### 2.1 Project Structure

See the language-specific guide loaded in Phase 1 for `package.json`, `tsconfig.json`, or Python module layout.

### 2.2 Core Infrastructure

**Shared API client** — build only if >3 tools share the same auth/base URL. Otherwise inline per tool; premature abstraction breaks when tools need different retry/timeout settings.

**Response field selection** — never return raw API objects. Select only the fields your evaluation questions will need. Rule: if you don't know which fields an evaluation question needs, return `id`, `name`, and the 3–5 most searchable fields. Add more fields only when an eval question fails due to missing data.

**Pagination** — always return `has_more`, `next_offset`/`next_cursor`, `total_count`. Evaluations ask questions that require paging through dozens of results; without these, the LLM gives up after page 1.

### 2.3 Implement Each Tool

Before implementing each tool, ask yourself:
- **Which evaluation question would fail if this tool's description were slightly wrong?** (→ write the description to answer that question unambiguously)
- **What does the LLM receive when this tool succeeds?** (→ visualize the response; if you can't tell from the response which field holds the answer, the schema needs work)

For every tool, implement in this order — the ordering matters because each step constrains the next:

**1. Input schema** (Zod for TypeScript, Pydantic for Python) — constraints + descriptions + examples in field descriptions

**2. Annotations** — set these explicitly; defaults are wrong for read tools:
```
readOnlyHint:    true  for GET/list/search (enables client caching — reduces tool calls 2–3×)
destructiveHint: true  for delete/archive/modify (warns clients before executing)
idempotentHint:  true  for create-or-update patterns
openWorldHint:   true  for anything that touches external state
```

**3. Tool description** — one sentence, narrow and unambiguous. If two tools could both answer "find X", the description is wrong — rewrite until only one applies.

**4. Implementation** — field-selected response (not raw API object), pagination metadata

**5. Output schema** — define `outputSchema` where possible; use `structuredContent` in responses (TypeScript SDK)

---

## Phase 3: OPERATIONS — Review & Test

### 3.1 What kills evaluation accuracy without failing the build

These pass `npm run build` and MCP Inspector — but cause evaluation failures:

| Silent failure | Why it happens | Fix |
|----------------|---------------|-----|
| Tool returns full API object | LLM gets 40+ fields, picks wrong one for answer | Select only needed fields |
| Two tools with overlapping descriptions | LLM calls the wrong one consistently | Make descriptions mutually exclusive |
| Missing `readOnlyHint: true` on read tools | Client can't cache; 3× tool calls per question, context exhausted | Set annotation correctly |
| Pagination fields missing | LLM stops at page 1, misses the answer | Add `has_more` + `next_offset` |
| Error message says "try again" not "try X" | LLM retries same call, loops, fails | Make errors action-specific |

### 3.2 Build & Test

**TypeScript:**
```bash
npm run build
npx @modelcontextprotocol/inspector
```

**Python:**
```bash
python -m py_compile your_server.py
```

Invoke `/aicodepath-verify` — do not proceed until all checks pass.

<HARD-GATE>
Do NOT proceed to EVALUATION until:
1. `/aicodepath-verify` checklist is complete
2. Build succeeds with no errors
3. MCP Inspector confirms tools are registered with correct schemas
</HARD-GATE>

---

## Phase 4: EVALUATION — Create Test Questions

Load **[✅ Evaluation Guide](./references/evaluation.md)** now.

### 4.1 Explore Content (Read-Only)

Use your MCP server tools with READ-ONLY operations to discover specific content for question creation. Use `limit` parameter (<10) to avoid context overload.

### 4.2 Create 10 QA Pairs

Each question must be:
- **Independent** — no dependency on other questions
- **Read-only** — no write/destructive operations
- **Complex** — requires multiple tool calls, potentially dozens
- **Realistic** — based on real human use cases
- **Verifiable** — single, clear answer via direct string comparison
- **Stable** — answer won't change over time

Output format:
```xml
<evaluation>
  <qa_pair>
    <question>...</question>
    <answer>...</answer>
  </qa_pair>
</evaluation>
```

### 4.3 Verify Answers Yourself

Solve each question using your MCP server before saving. Remove any question requiring write operations.

<HARD-GATE>
Do NOT publish, commit, or hand off the server until:
1. Evaluation XML file exists with ≥10 QA pairs
2. All answers have been verified by solving questions yourself
3. CLIMB LOOP has run for at least 1 cycle
</HARD-GATE>

---

## Phase 5: CLIMB LOOP — Autoresearch Quality Loop

Adapted from `aicodepath-skill-improver`. Drives iterative tool improvement using evaluation accuracy as the quality signal.

**Score = evaluation accuracy** — correct answers / total questions (from `scripts/evaluation.py` output).

### Setup

**Step 1: Run baseline**
```bash
pip install -r scripts/requirements.txt
export ANTHROPIC_API_KEY=<key>
python scripts/evaluation.py -t stdio -c <cmd> -a <server> evaluation.xml
```

- If baseline = 0%: server has a startup or auth failure — fix before looping (check stderr output)
- If baseline = 10–30%: tool descriptions are likely the problem (most common root cause)
- If baseline = 40–60%: schema or response field issues (second most common)
- If baseline ≥ 70%: pagination or edge-case gaps

Parse baseline accuracy. Announce: `"Baseline: X% (Y/10). Starting climb loop..."`

**Step 2: User configuration**

```
Q1: Target accuracy?   (default: 80%)
Q2: Max cycles?        (default: 10)
Q3: Stall threshold?   (default: 3 cycles with no improvement)
Q4: Web search enrichment?
    [A] Off — Claude knowledge only
    [B] On  — 2–3 WebSearch calls per mutation for design patterns
```

Show end-to-end estimate before starting:

```
┌─────────────────────────────────────────────────┐
│  CLIMB LOOP ESTIMATE                            │
│  Baseline accuracy:  X%                         │
│  Target:             80%                        │
│  Gap:                G%                         │
│  Estimated cycles:   C–C                        │
│  Time per cycle:     ~5–10 min                  │
│  Type "stop" at any cycle boundary to exit      │
└─────────────────────────────────────────────────┘
```

### Loop: evaluate → score → judge → diagnose → mutate → repeat

**EVALUATE** — run `scripts/evaluation.py`, capture per-question pass/fail + agent feedback

**SCORE** — parse: `accuracy %`, `tool_calls per question`, `failed questions list`

**JUDGE**
- `accuracy ≥ target` → exit: `ACCURACY_TARGET`
- `no improvement for N cycles` → exit: `STALL`
- `cycles ≥ max_cycles` → exit: `MAX_CYCLES`
- `user types "stop"` → exit: `USER_STOP`

**DIAGNOSE** — for each failed question:
1. Read agent feedback from evaluation report
2. Identify which tool(s) were called
3. Classify failure type:
   - `DESCRIPTION` — tool description unclear or misleading (agent called wrong tool or missed it)
   - `SCHEMA` — missing field, wrong type, bad constraint (agent couldn't pass the right params)
   - `RESPONSE` — too much data, missing field, wrong format (agent got the data but couldn't extract answer)
   - `MISSING_TOOL` — required operation has no tool

**WEB SEARCH** (if enabled) — 2–3 targeted searches per diagnosed failure type

**MUTATE** — apply targeted improvements to failing tools:
- `DESCRIPTION` → rewrite tool description with more precise language; make it mutually exclusive with similar tools
- `SCHEMA` → add missing fields, fix types, add field descriptions/examples
- `RESPONSE` → select fewer fields (if too much data), add missing fields, fix pagination
- `MISSING_TOOL` → implement new tool (requires failing test first via `/aicodepath-tdd`)

Re-run evaluation. If accuracy improves → keep mutation. If drops → revert to previous version.

**ANNOUNCE** — live progress table after each cycle:

```
Cycle │ Accuracy │ Questions │  Delta  │ Mutated Tools
──────┼──────────┼───────────┼─────────┼──────────────────────────
  1   │   60%    │   6/10    │  base   │ —
  2   │   70%    │   7/10    │  +10%   │ github_search_issues
  3   │   70%    │   7/10    │   0%    │ github_get_commit (rev)
  4   │   80%    │   8/10    │  +10%   │ github_list_repos ✅
```

Check for "stop" at each cycle boundary.

### Post-Loop

1. **Finalise** — ensure best-accuracy version of server is active
2. **Run `/aicodepath-verify`** — final checklist confirmation
3. **Commit** — `git commit -m "feat: <server-name> mcp server"`
4. **Record lessons** — append climb loop findings to `aicodepath-docs/knowledge.md`

**Final report:**
```
## MCP Builder Report: <server-name>
Cycles: N | Exit: [ACCURACY_TARGET|STALL|MAX_CYCLES|USER_STOP]
Baseline: X% (Y/10) → Final: X% (Y/10) [+Δ%]
Top improvements: [top 3 tool changes with accuracy gain]
Failing questions remaining: [list if any]
```

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/mcp_best_practices.md` | PRE-FLIGHT starts — naming, pagination, transport, security |
| `references/node_mcp_server.md` | CONSTRUCTION (TypeScript) — project structure, Zod patterns, examples |
| `references/python_mcp_server.md` | CONSTRUCTION (Python) — FastMCP patterns, Pydantic models, examples |
| `references/evaluation.md` | EVALUATION phase starts — question guidelines, XML format, running harness |
| `scripts/evaluation.py` | CLIMB LOOP — run evaluation harness |
| `scripts/connections.py` | CLIMB LOOP — transport connection helpers |
| `scripts/requirements.txt` | CLIMB LOOP setup — `pip install -r scripts/requirements.txt` |

---

## NEVER

- Implement any tool before Context7 has verified the SDK's API surface — wrong method signatures fail silently with no error, producing tools that always return empty
- Build a tool that does two distinct operations — agents pick the wrong intent ~40% of the time; split into two tools with mutually exclusive descriptions
- Return raw API objects from tools — LLMs receive 40+ fields and pick the wrong one; always select only the fields evaluation questions actually need
- Set `readOnlyHint` to false (or omit it) on read/list/search tools — clients disable optimistic caching, doubling or tripling tool calls per question and exhausting context before the answer is found
- Skip the failing test before implementing a new tool — TDD applies to MCP tools too
- Proceed to EVALUATION without running the build and MCP Inspector verification
- Publish or commit without running the CLIMB LOOP at least 1 cycle — unvalidated servers have unknown accuracy
- Remove a failing question from the eval set to inflate accuracy — the question exposes a real tool gap; removing it ships a broken tool
- Revert a mutation without first re-running evaluation to confirm it caused the regression
