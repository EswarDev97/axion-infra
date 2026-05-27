---
name: aicodepath-code-graph
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep
argument-hint: "[build|reindex|query <tool> <args>]"
description: Build or query the AST-based code graph — index, re-index, or trace call-graph relationships.
---

# AICodePath Code Graph

## Mental model — read before anything else

The graph is a **static snapshot** built from AST parsing. Call edges are resolved at parse time, not at runtime. This means:
- Dynamic dispatch, reflection, plugin hooks, and runtime-registered callbacks do **not** appear as edges
- Cross-language calls via subprocess or IPC do **not** appear
- Tests using dynamic runners (jest.each, pytest.parametrize) do **not** generate static edges

When results are empty: likely dynamic dispatch, cross-language IPC, or unindexed external library — not a graph bug.

---

## Before querying, ask yourself

1. **Do I have the `qualified_name`?** → If not, run `search_entities` first. Bare names silently match the wrong entity when multiple files define the same name.
2. **Am I assessing change impact?** → Use `impact_radius`, not `callers_of`. Impact radius includes transitive effects across hops; callers_of only shows direct callers.
3. **Did the user mention tests?** → Warn upfront if dynamic test frameworks are suspected — `tests_for` only finds tests with direct static call edges.
4. **Is the repo large (>500 entities)?** → Warn before calling `visualize_graph(scope="full")` without a `max_nodes` cap — the browser will freeze.
5. **Is this the first run?** → Check Step 1 first. Auto-indexing does NOT cover fresh clones — only commits/pulls/merges trigger the git hook.

**Why the step order is non-negotiable:**
- Querying before Step 1 confirms entities > 0 → all tools silently return empty (looks like "no callers found", actually means "no data")
- Using bare names before `search_entities` → silently matches the wrong entity (looks like correct results, is wrong)
- Presenting the rebuild menu before acting → prevents multi-minute data wipes the user didn't intend

---

## Step 1 — Check DB state

```bash
python3 -c "
import sqlite3, os
db = os.path.join('aicodepath-docs', 'aicodepath.db')
if not os.path.exists(db):
    print('DB missing — run build first')
else:
    conn = sqlite3.connect(db)
    e = conn.execute('SELECT COUNT(*) FROM code_entities').fetchone()[0]
    r = conn.execute('SELECT COUNT(*) FROM code_relations').fetchone()[0]
    conn.close()
    print(f'Entities: {e}, Relations: {r}')
    if e == 0:
        print('Empty — run build first')
"
```

| DB state | Action |
|----------|--------|
| Missing or empty | Proceed to Step 2A (first build) |
| Has data, skill invoked again | Proceed to Step 2B (ask user) |
| Has data, invoked by onboarding/preflight | Run `diff-reindex` silently, report stats |

> **Coverage check**: After building, verify graph coverage before querying:
> - `git ls-files | wc -l` → total tracked files
> - Query: `SELECT COUNT(*) FROM entities WHERE type='file'` → indexed files
> - If indexed < 50% of tracked: run `build_or_update_graph` with `full_reindex: true`
> - Low coverage (< 50%) means queries will miss most of the codebase — graph results
>   will be incomplete and may produce incorrect architecture recommendations.

---

## Step 2A — First build (DB missing or empty)

Run without asking — there's nothing to preserve:

```
build_or_update_graph(path=".", mode="index")
```

Expected output: `{ "indexed": N, "skipped": M, "entities": X, "relations": Y, "resolved": Z }`

Proceed to Step 3 once `entities > 0`.

---

## Step 2B — Re-invocation (DB already has data)

<HARD-GATE>
Always present the A/B/C choice menu before executing any rebuild operation — even if the user explicitly says "rebuild from scratch" or "full reindex". The menu prevents accidental multi-minute data wipes on large repos. The user's phrasing is not confirmation; the menu is confirmation.
</HARD-GATE>

**Always present this choice to the user:**

```
The code graph already has <N> entities and <R> relations.

How would you like to proceed?

[A] Update (default) — re-index only files changed since last run. Fast (~seconds).
    Recommended for: normal development, after commits, to pick up recent changes.

[B] Full rebuild — clear all data and re-parse everything. Slow (~minutes for large repos).
    Recommended for: after a major refactor, renamed directories, or if the graph seems stale.

[C] Skip — graph is current, go straight to queries.
```

Wait for user input. Default to **[A]** if the user just presses Enter or says "yes"/"proceed".

| Choice | Mode |
|--------|------|
| A | `build_or_update_graph(path=".", mode="diff-reindex")` |
| B | `build_or_update_graph(path=".", mode="reindex")` |
| C | Skip to Step 3 |

---

## Step 3 — Query the graph

<HARD-GATE>
Do NOT call any query tool before Step 1 confirms entities > 0 — all traversal tools silently return empty on an empty DB (looks like "no callers found", means "no data indexed").
</HARD-GATE>

### Token budget — `max_results` and truncation metadata

`callers_of`, `callees_of`, and `impact_radius` all support a `max_results` parameter (default: 50). Every response includes:
- `total_found` — full result count before truncation
- `returned` — how many were actually returned
- `truncated` — boolean; `true` means results were capped

When `truncated` is `true`, tell the user and suggest narrowing with `max_depth`/`max_hops` or inspecting a subgraph.

### callers_of — who calls this entity?
```
callers_of(entity_name="MyFunction", max_depth=3, max_results=50)
```
Returns: `{ callers: [{ qualified_name, name, entity_type, language, file_path, depth }], total_found, returned, truncated }`.
Use when: understanding usage, planning a refactor, or finding all call sites.

### callees_of — what does this entity call?
```
callees_of(entity_name="MyFunction", max_depth=3, max_results=50)
```
Returns: same structure with `callees` key. Use when: understanding what a function depends on.

### impact_radius — what changes if this entity changes?
```
impact_radius(entity_name="MyFunction", max_hops=3, max_results=50)
```
Returns: `{ affected: [...], hop_counts: {1: N, 2: M}, total, total_found, returned, truncated }`.
Use when: assessing blast radius before a refactor or API change.

### tests_for — which tests cover this entity?
```
tests_for(entity_name="MyFunction")
```
Returns: test entities that call this entity. Uses `is_test` flag + name patterns (`test_*`, `*_test`, `*Test*`, `*_spec`).

### search_entities — find entities by name
```
search_entities(query="parse", entity_type="function", language="python", limit=20)
```
`entity_type` and `language` are optional filters. Uses FTS5 when available; falls back to substring search. Response includes `search_method` ("fts5" or "substring").

### file_summary — list all entities in a file
```
file_summary(file_path="src/services/UserService.ts")
```
Returns all entities defined in files whose path contains the given substring.

### generate_report — analytics report
```
generate_report()
```
Generates `aicodepath-docs/GRAPH_REPORT.md` with: entity count, relation count, top connected entities (god nodes), language distribution, relation types, cross-file edges, and code module summaries (populated after community detection).
Returns: `{ report_path: "...", status: "ok" }`.
Use when: getting a high-level health check of the codebase graph, or sharing a snapshot with the team.

### list_communities — list detected code modules
```
list_communities()
```
Returns: `{ communities: [{ community_id, size, top_entities, languages }], total }`.
Use when: exploring how the codebase is organized into clusters, or identifying large/isolated modules.
Requires `build_or_update_graph` to have run (community detection runs automatically during build).

### get_community — entities in a specific module
```
get_community(community_id=0)
```
Returns: `{ community_id, entities: [{ qualified_name, name, entity_type, language, file_path }], size, languages }`.
Use `list_communities` first to discover available IDs.

**Community query workflow:**
```
# 1. List all detected modules
list_communities()
# → pick community_id with relevant name/size/language

# 2. Inspect entities in that module
get_community(community_id=2)
# → get full entity list for cross-module impact analysis or refactor scoping
```

### visualize_graph — interactive HTML graph
```
visualize_graph(scope="full", max_nodes=200)
```
Scopes: `full`, `package` (requires `scope_value`), `file` (requires `scope_value`), `impact` (requires comma-separated `scope_value` of qualified names).
Returns path to generated HTML file. Open in browser.

**Scope selection rules (fragile — silent failures without these):**
- `scope="full"` on repos with >500 entities → always set `max_nodes` (browser freeze)
- `scope="package"` / `scope="file"` / `scope="impact"` → always set `scope_value` (empty graph returned silently if omitted)

---

## Step 4 — Interpret results

**Read `references/troubleshooting.md` (~55 lines) when query results are empty, unexpected, or the user asks why something is missing.**
Do NOT load `references/troubleshooting.md` for routine queries that return expected results — only load it when diagnosis is needed.

Quick reference for the most common case:
- **entity not found** → Use `search_entities` first. Qualified name format: `repo:package:file_path:ClassName.method_name`
- **empty tests_for** → Check `_DEFAULT_EXCLUDES` and whether dynamic test runners are in use
- **impact_radius total=0** → Expected for leaf nodes that only call external/unindexed code

---

## NEVER

- **NEVER pass a bare function name to `callers_of`, `callees_of`, `impact_radius`, or `tests_for`** — unqualified names silently match the wrong entity when multiple files define the same name; always resolve via `search_entities` first
- **NEVER run `build_or_update_graph(mode="reindex")` without presenting the Step 2B confirmation menu** — full rebuild wipes all entities and relations and can take several minutes on large repos; users expecting a fast update will lose data unexpectedly
- **NEVER query the graph when Step 1 shows entities = 0** — all traversal tools silently return empty lists on an empty DB; the silence looks like "no callers" but means "no data"
- **NEVER call `visualize_graph(scope="full")` on a repo with more than 500 entities without setting `max_nodes`** — D3.js renders all nodes in the browser at once; large graphs freeze or crash the tab
- **NEVER assume `tests_for` covers tests using dynamic runners** — jest.each, pytest.parametrize, and factory-pattern tests do not generate static call edges and will not appear; inform the user if dynamic frameworks are suspected
- **NEVER trust a `qualified_name` from memory, docs, or inference** — the format encodes repo + package + file_path + class hierarchy, which changes on every rename; always resolve via `search_entities` to get the current form
- **NEVER pass a partial path to `file_summary` that matches multiple files** — it returns entities from ALL matching files as a silent union, with no warning about multiple matches
- **NEVER assume `diff-reindex` is correct after a directory rename or bulk file move** — old paths persist as stale entries; a full `reindex` is required after structural filesystem changes
- **NEVER expect cross-language edges** — the AST parser tracks calls within a language boundary; Python calling TypeScript via subprocess, or Go calling C via CGO, will not appear as graph edges
- **NEVER run `impact_radius` with `max_hops > 5` on a central utility function** — BFS on a high-fan-out node explores exponentially more nodes per hop and may time out on large repos

---

## Reference files

| File | Load when |
|------|-----------|
| `references/troubleshooting.md` | Query returns empty or unexpected results — symptom→cause→fix table, supported languages, auto-indexing details |
