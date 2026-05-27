---
name: aicodepath-visual-memory
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[--type class|er|flowchart|sequence|all] [--scope global|module]"
description: Generate and manage architectural diagrams — ER, class, C4, sequence diagrams for visual codebase understanding.
---

# AICodePath Visual Memory

## Diagram Type Selection

Before generating anything, ask: **What decision does this diagram need to support?**

| Question | Generate This | Skip This |
|----------|--------------|-----------|
| "What tables exist and how are they linked?" | ER diagram | class diagram |
| "How do domain objects relate in code?" | Class diagram | ER diagram |
| "What happens at runtime in this flow?" | Sequence (LLM-based only) | flowchart |
| "What are the decision points in a process?" | Flowchart | sequence diagram |
| "How does this codebase fit together overall?" | C4 context | class diagram |
| "I want to understand everything" | ER + one other | all types simultaneously |

**Non-obvious rule**: Start with ER if the codebase is data-heavy. Start with flowchart if it's service-heavy. Class diagrams are only valuable for codebases with rich domain models — if the classes are mostly DTOs, controllers, and configs, a class diagram will teach nothing.

### Before generating — expert judgment checklist

> **Scope of this checklist**: These questions apply to the decision of **whether to generate**. They do not govern what to include — once generation is decided, completeness is the default.

Answer these before writing a single line:

| Question | If no → |
|----------|---------|
| **Purpose**: Can you name the specific decision this diagram enables? | Skip — if you can't name it, offer the user 3 common decisions: "What tables exist and how are they linked?", "How do these services interact at runtime?", "What states can this entity be in?" |
| **Necessity**: Does this require a diagram, or can reading the source answer it faster? | Read the code — field lists and single-file logic don't need diagrams |
| **Longevity**: Will it stay accurate longer than it takes to generate and maintain? | Defer — rapidly-changing modules need stability before diagramming |
| **Audience**: Will the reader learn something they couldn't get from a README or code comment? | Skip — if a README would do, write a README |

**The map is not the territory**: Diagrams are simplified models. When a diagram contradicts the code, the code is always correct. A diagram that conflicts with source has negative value — it injects false context.

**Corollary**: A missing diagram is neutral. A wrong diagram is harmful. When in doubt, don't generate.

---

## Diagram Selection Expert Judgment

### When class diagrams add signal vs. noise

Generate a class diagram when: the codebase has inheritance hierarchies, domain entities with behavior, or complex service relationships.

Skip a class diagram when: the candidate classes are config objects, DTOs, repositories with no logic, or flat data containers. These produce diagrams that look complete but reveal nothing about the architecture.

**The test**: Would a new developer look at this diagram and understand something they couldn't have read from a README? If no — skip it.

### Class diagram generation — read source first

Before assigning any class member attributes, methods, or relationships, **read each candidate source file**. Do not infer members from:
- `package.json` or `yarn.lock` (lists installed packages, not what code actually imports)
- File names or directory names
- Any dependency manifest or lock file

A package listed in `package.json` may be installed but unused by a given component. Inferring attributes from it produces plausible-looking but wrong diagrams that mislead future sessions.

**Required per class**:
1. Read the actual source file (`.ts`, `.tsx`, `.py`, `.java`, etc.)
2. Identify only imports that are actually used in the file body
3. List only exported members (properties, methods, state variables) that exist in the source
4. Do not add members based on what "should" be there given the class name

### When sequence diagrams are feasible

Sequence diagrams require LLM-based analysis — not static import graph traversal. Before generating:
1. Identify the specific execution path (a single user action, API call, or event)
2. Read the relevant method bodies, not just the class file headers
3. Trace actual call order, including conditionals and async boundaries

If you cannot trace the actual call order from code, ask the user to describe the flow before generating.

---

## Sync Strategy

Choose sync strategy before writing the diagram to disk:

| Diagram Type | Sync | Why |
|-------------|------|-----|
| ER | Eager | Schema changes are unambiguous and unrecoverable if diagram drifts |
| Flowchart (global) | Eager | Entry-point changes break the whole mental model |
| Class | Lazy | Domain models evolve slowly; slight staleness tolerable |
| Sequence | Lazy | LLM regen is expensive; mark stale, regenerate on demand |
| Journey | Manual | Driven by requirements, not code changes |

**Non-obvious**: Eager sync on sequence diagrams feels right but creates a trap. Every file save triggers full LLM regen — 30–60 seconds of latency per save, thousands of tokens per day for an active codebase. The diagram will also be slightly wrong on each intermediate save. Mark sequence diagrams stale instead; let the developer decide when the flow has actually stabilized.

---

## Context Loading — What to Inject

When loading diagrams into session context, rank by relevance, not by completeness:

```
Token budget formula:
  Available = Context window − already used tokens
  Diagram budget = Available × 30%  (cap: 1500–5000 tokens)
  Selection: rank diagrams by relevance to current task, load top 1–2
```

**Ranking heuristic** (apply in order):
1. Diagrams tagged with keywords matching the current feature/module
2. ER diagram if the task touches data models or DB queries
3. Class diagram if the task touches service layer
4. Flowchart if the task touches entry points or controllers
5. Sequence diagrams: only if the task is explicitly about an API flow

Never load all types simultaneously. Five diagrams at 600 tokens each consume 3000 tokens — that's 30% of a 100k context window taken by static documentation before a single source file is read.

**Do NOT load diagrams** when: user is asking a `--status` check only, task is a single-file edit with no cross-module dependencies, or all available diagrams are marked stale.

---

## Staleness Response Protocol

When source code changes and a diagram may be stale:

| Staleness signal | Action |
|-----------------|--------|
| Schema file changed (migration, Prisma, entity) | Immediately regenerate ER; mark class as stale |
| Entry-point or controller modified | Immediately regenerate global flowchart |
| Service method changed | Mark sequence diagrams as stale |
| Requirements doc updated | Mark journey as stale |
| Any change to a stale diagram's source | Do NOT load stale diagram into context — delete or regenerate first |

**The hard rule**: A stale diagram loaded silently is worse than no diagram. It injects false architectural context that Claude reasons from. If uncertain whether a diagram reflects current code, mark it stale and exclude it from context loading until regenerated.

---

## Completeness Contract

When generation is decided, **include ALL objects of the relevant type** by default.

- For ER diagrams: all tables in all schemas, including lookup/reference tables
- If the diagram would be too large to read (ER exceeds ~15 tables per schema), ask the user — but **always present the complete (all-tables) option explicitly first**: *"Found N tables. Options: (A) complete diagram with all N tables, (B) one ERD per schema, (C) focus on a specific schema. Recommended: A."* The density warning should inform the user, not pre-decide for them. Default to option A unless the user explicitly chooses otherwise.
- **When user explicitly asks to filter** (e.g., "skip the lookup tables"): explain why they matter before complying — *"Lookup tables define FK constraints. Omitting them may show broken relationships. I can still filter — should I note the omission in the diagram frontmatter?"* Then comply if user confirms, and record excluded objects in the diagram's `excluded_objects` frontmatter field.

## Storage

```
aicodepath-docs/memory/
├── index.json              # File-system mirror — NOT authoritative
├── global/                 # Project-wide diagrams
│   ├── er/, class/, flowcharts/, sequence/, journey/
└── units/{unit-name}/      # Unit-specific diagrams
```

**Authoritative store**: SQLite `visual_diagrams` table in `aicodepath-docs/aicodepath.db`
**Mirror only**: `index.json` and `.md` files — `visual-memory-loader` reads from the DB, not from `index.json`

DB tables: `visual_diagrams` (content + metadata), `diagram_entity_links`, `diagram_history`

### After Writing a Diagram — DB Persist (MANDATORY)

After every diagram `.md` file is written to disk, run the backfill script to sync file system → SQLite:

```bash
node .aicodepath/scripts/backfill-visual-memory-db.js
```

This script reads `index.json` and all `.md` files, then upserts each diagram into `visual_diagrams`. Diagrams not in the DB are **invisible** to context loading, staleness detection, and session restore — the `.md` file existing on disk is not sufficient.

**When invoked after `aicodepath-diagrams` wrote files**: always run this immediately after the diagram file write, before returning control to the user.

**Output to verify success**: look for `✓ Inserted` or `⏭️ Skipped (already in database)` lines — any `❌ Error` line means the diagram was not persisted and must be investigated.

To check current DB state at any time:
```bash
node .aicodepath/lib/visual-memory-writer.js list
```

### Diagram Frontmatter Requirements (all diagram types)

Every generated diagram file MUST include a frontmatter header for audit and traceability:

```yaml
---
diagram_type: er|class|sequence|flowchart|c4-context|c4-container|state|journey
generated_at: 2026-03-17T15:30:00Z
source_files:
  - db/migrations/001_init.sql       # ER: migration files
  - src/models/User.ts               # class: entity/model files
  - src/controllers/AuthController.ts # sequence: traced method files
source_type: migrations|prisma|orm_entities|pg_dump|source_analysis|manual
confidence: 0.92
---
```

- `source_files` — every file read to produce the diagram; enables exact staleness detection and reproducible regeneration
- `source_type` — how the source was obtained; `pg_dump` is lower trust than `migrations`
- `confidence` — omit or set `< 0.6` only if generation was unreliable; diagram will not auto-load into context

**ER diagram additional requirement**: also enumerate `db_objects` — tables by schema, views, functions, triggers, indexes.

### Concurrent Access & Index Recovery

| Scenario | Action |
|----------|--------|
| Two sessions generating the same diagram simultaneously | Last write wins — acceptable. On next load, check `generated_at` and use most recent |
| `index.json` missing but diagram files exist | Rebuild index: scan all `.md` files in memory dirs, extract frontmatter, reconstruct index before loading any diagram |
| `index.json` references a file that no longer exists | Remove the stale entry from index; do not attempt to load the missing file |
| Diagram file corrupted (empty or unparseable frontmatter) | Delete and regenerate; do not load partial diagrams into context |

---

## When Generation Fails — Fallback Table

| Problem | Root Cause | Correct Response |
|---------|-----------|-----------------|
| No schema files found | No SQL migrations, Prisma, or ORM entities | Ask user to run `pg_dump --schema-only` and share path; do NOT hallucinate tables |
| No source files match pattern | Glob returned empty | Widen pattern or ask user for correct path; do NOT generate from memory |
| Sequence analysis produces contradictory diagram | Traced two conflicting code paths | Ask user which path to document; generate for one at a time |
| Confidence score < 0.6 | Ambiguous source or incomplete trace | Write diagram with explicit `confidence: low` tag; do NOT auto-load into context |
| Diagram file exists but index.json missing | Incomplete prior generation | Rebuild index from existing files before loading any diagram |
| Stale diagram found with no source files | Source was deleted | Delete the diagram; do NOT regenerate from stale content |

**Key fallback rule**: If generation cannot produce a diagram with confidence ≥ 0.6, it is better to report "could not generate reliably — here is what I found" than to produce a low-quality diagram that loads into every future session.

---

## NEVER

- **NEVER** generate sequence diagrams from static import analysis — imports show dependencies, not call order. A controller that imports AuthService doesn't necessarily call it in every flow, or at all in some paths. Static-only sequence diagrams look authoritative and are wrong. LLM analysis of actual method bodies is required.
- **NEVER** set eager sync on sequence or journey diagrams — eager sync on LLM-based diagram types means full regen on every file save. At 30–60 seconds and thousands of tokens per regen, this stalls the development workflow. It also produces intermediate diagrams representing half-committed changes.
- **NEVER** generate class diagrams for config objects, DTOs, or data containers — `DatabaseConfig`, `AppConfig`, `RedisConfig` mapped in a class diagram adds noise without insight. Class diagrams earn their tokens only for domain models with behavior and inheritance.
- **NEVER** assign class member attributes, methods, or relationships without first reading the actual source file — do not infer members from `package.json`, `yarn.lock`, or any dependency manifest. A package being installed does not mean any given component uses it; inferring members from package presence produces plausible-but-wrong diagrams that inject false architectural context into future sessions.
- **NEVER** load all diagram types simultaneously — context budget is shared with source code. Diagram overload leaves less room for actual files, reducing Claude's ability to reason about the code being modified.
- **NEVER** leave a stale diagram available for context loading — a diagram that silently contradicts the current schema actively misleads. Mark stale immediately on source change. Prefer deletion over silent contradiction.
- **NEVER** generate a sequence diagram without tracing actual method call order — asking "what does the sequence look like?" and inferring from class names is not sufficient. Read the method bodies. If the flow can't be traced from code, ask the user to describe it.
- **NEVER** use a flowchart to show WHO calls WHOM — flowcharts show what steps happen in a process (no actors, no message passing). A flowchart that shows "AuthService → TokenService → UserRepository" is actually a sequence diagram drawn wrong. Use the right diagram type: flowchart for decision logic, sequence for inter-service calls.
- **NEVER** silently filter schema objects when generating an ER diagram — lookup tables define FK constraints and domain behavior. Even when the user asks to skip them, explain the FK implication first, then comply if they confirm. Record excluded objects in `excluded_objects` frontmatter.
- **NEVER** write a diagram file without a frontmatter header containing `diagram_type`, `generated_at`, and `source_files` — a diagram with no source provenance cannot be audited, diff-checked for staleness, or reliably regenerated.
- **NEVER** finish after writing a diagram without running `node .aicodepath/scripts/backfill-visual-memory-db.js` — the `.md` file and `index.json` are only the file-system mirror. The DB is authoritative. A diagram not in `visual_diagrams` is invisible to context loading and session restore, regardless of whether the file exists on disk.