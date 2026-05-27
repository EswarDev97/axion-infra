---
name: aicodepath-diagrams
description: >
  Use when the user asks to draw, create, generate, visualize, or regenerate any diagram — sequence diagrams, ERDs, flowcharts, C4 context/container diagrams, class diagrams, state machines, git graphs, gantt charts. Triggers: "draw a diagram", "create diagram", "sequence diagram", "ERD", "entity relationship", "flowchart", "C4 diagram", "c4 container", "c4 context", "class diagram", "state machine", "visualize", "diagram the architecture", "show the flow", "mermaid diagram", "regenerate ERD". Also use during functional-design, database-design, nfr-design, and auth-design phases when diagrams are required.
version: 2.0.0
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Skill
argument-hint: "[--type sequence|class|flow|erd|state|c4-context|c4-container]"
---

# AICodePath Diagrams

## Invocation Workflow

When this skill is invoked:

1. **Determine diagram type** — use the selection table below; apply non-obvious distinctions if type is ambiguous
2. **Read `references/templates.md`** — MANDATORY before generating any Mermaid output
3. **Collect source files** — ERD: follow the ERD source resolution order below; sequence: ask user to describe execution path if not provided
4. **Generate with syntax check** — verify all edge nodes declared, arrow syntax valid for type, special chars quoted
5. **If output doesn't render** — follow the troubleshooting table at the bottom of this file
6. **Invoke `/aicodepath-visual-memory`** — after every successful diagram write, invoke this skill to register the diagram in the `visual_diagrams` DB table. Pass the file path, diagram type, source files, and confidence score from the frontmatter. Without this step the diagram file is orphaned — invisible to context loading, staleness detection, and session restore.

---

## Before Generating Any Diagram

Ask yourself these three questions first — they prevent the most common diagram failures:

1. **Who is the audience?** An executive needs C4-context (system boundary only). A developer needs C4-container or ERD. A QA engineer needs a sequence diagram with error paths included.
2. **What decision does this diagram support?** If you can't name the decision, the diagram is likely decorative — consider whether prose serves better.
3. **Will prose serve better?** A 3-step flow is clearer as a numbered list. Generate a diagram only when spatial relationships, parallel paths, or entity connections are the point.

## Before Choosing a Diagram Type

Ask yourself: **What am I communicating, and to whom?**

| Question | Answer → Diagram Type | Non-obvious distinction |
|----------|-----------------------|------------------------|
| "How do actors/services interact at runtime?" | `sequence` | Shows WHO calls WHO — not what steps happen. Requires reading actual method bodies, not inferred from imports |
| "What are the steps and decision points in a process?" | `flowchart` | Shows WHAT steps happen — no actors, no message passing. Never use to show service-to-service calls |
| "What does the data model look like?" | `erd` | Pure data relationships, no behavior. Read schema files first — never hallucinate tables |
| "How does the entire system fit in its environment?" | `c4-context` | For executives: system boundary + external people/systems only |
| "What services/databases are inside the system?" | `c4-container` | For developers: internal services, databases, queues. Use when the user needs internal architecture detail |
| "What are the classes and their relationships?" | `class` | Only for domain models with behavior/inheritance — skip for DTOs, configs, repositories with no logic |
| "What states can this entity be in?" | `state` | Entity lifecycle (pending→paid→shipped). Use flowchart for a process not owned by a single entity |
| "What branches exist and how do they merge?" | `git` | |
| "What's the timeline and dependencies?" | `gantt` | |
| "Show all AICodePath components and their connections", "interconnection diagram", "component map", "visualize skills/hooks/agents" | Use `/aicodepath-interconnection-diagram` instead | This produces an interactive standalone HTML file — not a Mermaid diagram. Route to the dedicated skill. |

---

## Diagram Templates

**MANDATORY — READ ENTIRE FILE before generating any diagram:**
[`references/templates.md`](references/templates.md)

Contains complete Mermaid syntax, tested examples, and rendering pitfalls for all 10 types.

**Do NOT load** `references/templates.md` for: answering questions about which diagram type to use — the tables in this file are sufficient.

### Quick Syntax Reference

| Type | Key Shape/Syntax | Common Rendering Trap |
|------|-----------------|----------------------|
| `flowchart` | `{text}` decision, `([text])` terminal | Link labels with commas/colons break: use `a -- "label, here" --> b` not `a -->|label, here| b` |
| `sequence` | `->>` request, `-->>` response, `autonumber` | Participant names with spaces must be quoted: `participant "Order Service"` |
| `class` | `-->` assoc, `*--` composition, `--|>` inherit | Method signatures with parentheses in class labels cause parse errors — omit parens |
| `erd` | `\|\|--o{` 1-to-many, mark `PK`/`FK` | Attribute names with hyphens or spaces silently fail — use camelCase |
| `state` | `[*]` start/end, label transitions | Transition labels with colons need quoting |
| `c4-context` | `Person()`, `System()`, `System_Ext()` | Diagram type is `C4Context` (case-sensitive) — `c4context` silently fails |
| `c4-container` | `Container()`, `ContainerDb()` | Must include `Container_Boundary()` wrapper or containers render as floating boxes |
| `git` | `gitGraph`, `commit id:`, `merge`, `tag:` | `mainBranchName` config must be wrapped in `'gitGraph': {}` — bare config key is silently ignored |
| `gantt` | sections, `after <id>` dependencies | Task IDs with spaces break dependency references — use camelCase IDs |
| `pie` | `showData`, 3-7 categories max | More than 7 categories produces unreadable legend overlap |

---

## NEVER

- **NEVER** generate a sequence diagram from static code analysis alone — sequence diagrams show runtime call order, which can't be reliably inferred from imports or class structure. A service that imports another doesn't necessarily call it in every flow. Ask for runtime context or ask the user to describe the execution path first.
- **NEVER** put more than 15-20 nodes in a flowchart or 5-7 participants in a sequence diagram — beyond these limits, Mermaid rendering becomes cluttered and unreadable. Split complex flows into multiple focused diagrams.
- **NEVER** use a C4 context diagram when the user needs C4 container detail — C4 context shows system-level boundaries (people + systems), C4 container shows internal architecture (services, databases, queues). Using context when container is needed hides the architectural information the user actually needs.
- **NEVER** generate an ERD diagram without reading actual schema files — hallucinated table structures and relationships are worse than no diagram. Always read SQL migrations, Prisma schema, or ORM entity files first.
- **NEVER** output raw Mermaid without verifying the syntax compiles — broken Mermaid renders as raw text with no visual output. Check: all nodes referenced in edges are declared, arrows use valid syntax for the diagram type, special characters in labels are quoted.
- **NEVER** decide C4 level by complexity — decide by audience and purpose. A diagram showing many services is still `c4-context` if it shows external systems. `c4-container` is for internal decomposition of a single system.
- **NEVER** use pipes `|` in flowchart link labels without quoting — `a -->|some, text| b` silently fails if the label contains commas, colons, or parentheses. Use `a -- "some, text" --> b` instead.
- **NEVER** silently filter schema objects when generating an ER diagram — lookup tables define FK constraints and domain behavior. Even when the user asks to skip them, explain the FK implication first, then comply if they confirm, and record excluded objects in `excluded_objects` frontmatter.
- **NEVER** write a diagram file without a frontmatter header containing `diagram_type`, `generated_at`, and `source_files` — a diagram with no source provenance cannot be audited, diff-checked for staleness, or reliably regenerated.
- **NEVER** skip Step 6 (invoking `/aicodepath-visual-memory`) after writing a diagram — the file exists on disk but is invisible to the visual memory system, context loading, and staleness detection. A diagram that isn't registered is as good as lost between sessions.

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

### ERD Completeness Contract

> **This checklist governs whether to generate. It does not govern what to include — once generation is decided, completeness is the default.**

When generating an ER diagram, include **ALL tables in ALL schemas**, including lookup/reference tables, by default.

**When user explicitly asks to filter** (e.g., "skip the lookup tables"): explain the implication first — *"Lookup tables define FK constraints. Omitting them may show broken relationships. Should I proceed with the filtered scope and note the omissions in the diagram frontmatter?"* — then comply if user confirms, recording excluded objects in `excluded_objects` frontmatter.

If ER would exceed ~15 tables per schema, ask: *"Found N tables. Generate per-schema ERDs, or focus on a specific schema?"* — do not decide unilaterally.

**ER additional requirement**: also enumerate `db_objects` in frontmatter — tables by schema, views, functions, triggers, indexes. This makes staleness detection unambiguous.

### ERD Source Resolution Order

When generating an ERD, resolve the schema source in this order:

1. **Schema files in repo** — SQL migrations (`db/migrations/*.sql`), Prisma (`schema.prisma`), ORM entities (TypeORM `*.entity.ts`, SQLAlchemy models). Read these with `Read`/`Glob`/`Grep`. Preferred — version-controlled, matches code.
2. **No schema files found** — Ask: *"No schema files found. Can you run one of these and share the output file?"*
   ```bash
   # PostgreSQL
   pg_dump --schema-only -d <dbname> > /tmp/schema.sql
   # MySQL
   mysqldump --no-data <dbname> > /tmp/schema.sql
   # SQLite
   sqlite3 <file.db> .schema > /tmp/schema.sql
   ```
   Then read `/tmp/schema.sql`. **Do NOT ask for a connection URL** — credentials must not be shared in conversation.
3. **User provides a dump file path** — Read it directly.

### Multi-Schema ERD Strategy

When the database has multiple schemas (e.g., `public`, `billing`, `audit`):

**Do NOT** generate one flat ERD — it will exceed the 15-20 node limit and cross-schema FK references will break Mermaid parsing (undeclared nodes in edges).

**Instead, generate three outputs:**

1. **Schema map** (flowchart or C4-container style) — one box per schema, arrows for cross-schema FK dependencies with cardinality label
2. **Per-schema ERD** — one `erDiagram` per schema, internal tables and FKs only
3. **Cross-schema reference table** (markdown) — lists every FK that crosses a schema boundary:

| From | FK Column | References | Constraint |
|------|-----------|------------|------------|
| `billing.invoices` | `user_id` | `public.users.id` | cascade delete |

Ask before generating: *"Found schemas: [list]. Generate schema map + per-schema ERDs, or focus on one schema?"*

<HARD-GATE>
Do NOT generate an ERD without first reading schema files or a dump produced by the user. Never ask for a DB connection URL — credentials must not appear in conversation.
Do NOT generate a sequence diagram from imports or class structure alone — ask for runtime flow context first.
Do NOT include cross-schema FK edges inside a per-schema ERD — they reference undeclared nodes and silently break Mermaid rendering. Use the cross-schema reference table instead.
</HARD-GATE>

---

## Integration with AICodePath Workflows

| Workflow | Diagram Type | Key Constraint |
|----------|-------------|---------------|
| `functional-design.md` | sequence, flowchart | Sequence requires user to describe execution order — cannot infer from static code |
| `database-design.md` | erd | Must read actual schema files before generating |
| `nfr-design.md` | c4-context, c4-container | Use context for system scope diagram; container for internal service architecture |
| `auth-design.md` | sequence, state | Sequence for API auth flows, state for token/session lifecycle |
| `api-gateway-design.md` | c4-container | Shows gateway + downstream services + databases with protocols labeled |

---

## Troubleshooting

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Diagram renders as raw text | Syntax error or wrong type keyword | (1) Verify first-line keyword is correct and case-sensitive: `flowchart TD`, `sequenceDiagram`, `erDiagram`, `C4Context`, `C4Container`; (2) check all nodes referenced in edges are declared; (3) quote special chars in labels |
| "No diagram type detected" | Type keyword missing or misspelled | First line must be the exact type keyword — `C4Context` not `c4context`, `erDiagram` not `erdDiagram` |
| ERD attributes fail silently | Hyphens or spaces in attribute names | Rename all ERD attributes to camelCase — `orderId` not `order-id` or `order id` |
| C4 containers render as floating boxes | Missing boundary wrapper | Add `Container_Boundary(sys, "System Name") { ... }` around all Container/ContainerDb entries |
| gitGraph config ignored | Config not wrapped correctly | Use `%%{init: {'gitGraph': {'mainBranchName': 'main'}}}%%` on the line before `gitGraph` |
| Participant name breaks sequence | Spaces in participant name | Quote all participant names with spaces: `participant "Order Service"` |
| Gantt dependencies not resolving | Task ID contains spaces | All task IDs must be camelCase — `taskId` not `task id` — in both definition and `after` reference |
