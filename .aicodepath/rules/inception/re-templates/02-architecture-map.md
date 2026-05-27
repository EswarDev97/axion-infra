# Architecture Map — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: INCLUDE
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/02-architecture-map.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__impact_radius` and `mcp__aicodepath-code-graph__callers_of` are available, call:

```
mcp__aicodepath-code-graph__impact_radius(changed_files=["<all top-level source dirs>"], max_depth=2)
mcp__aicodepath-code-graph__callers_of(qualified_name="<main entry point>", max_depth=1)
mcp__aicodepath-code-graph__callers_of(qualified_name="<router or controller module>", max_depth=1)
```

Use the impact_radius result to identify which modules are most widely depended upon (high fan-in) and which are leaf modules (zero fan-in). These reveal the layered architecture.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Architectural Style [DATA SOURCE: graph|llm-only]

**Graph path**: From `impact_radius` output, count distinct layers by grouping files with similar caller/callee depth. Identify whether the graph shows a layered (high depth, low cross-cutting edges), modular monolith (medium depth, high cohesion within directories), microservice (disconnected subgraphs with HTTP boundary nodes), or event-driven (many queue/broker nodes) shape.

**LLM-only path**: Examine directory structure, presence of `docker-compose.yml` (multi-service), `services/` subdirectories, message queue imports, or API gateway configs. Identify the architecture style from these signals.

State the identified architectural style with a confidence level (High/Medium/Low) and the evidence used.

---

#### Section 2: Layer Diagram [DATA SOURCE: graph|llm-only]

**Graph path**: Using fan-in/fan-out data from `impact_radius`, produce a text-based layer diagram showing:
- Presentation/API layer (zero callers, calls everything)
- Service/Application layer (called by API, calls domain and infra)
- Domain layer (pure business logic, minimal external deps)
- Infrastructure layer (DB, cache, queue — called by service layer)

**LLM-only path**: Map directory names to standard architectural layers. Directories named `controllers/`, `routes/`, `api/`, `handlers/` → Presentation. Directories named `services/`, `use-cases/`, `application/` → Application. Directories named `models/`, `domain/`, `entities/` → Domain. Directories named `repositories/`, `db/`, `cache/`, `queue/` → Infrastructure.

**Output format**:
```
┌─────────────────────────────────────┐
│  Presentation / API Layer           │
│  [list key modules]                 │
├─────────────────────────────────────┤
│  Application / Service Layer        │
│  [list key modules]                 │
├─────────────────────────────────────┤
│  Domain Layer                       │
│  [list key modules]                 │
├─────────────────────────────────────┤
│  Infrastructure Layer               │
│  [list key modules]                 │
└─────────────────────────────────────┘
```

---

#### Section 3: Cross-Cutting Concerns [DATA SOURCE: graph|llm-only]

**Graph path**: From `callers_of` on logging, auth middleware, and error handler modules — if they have very high fan-in (called from many places), they are cross-cutting. List them.

**LLM-only path**: Look for modules referenced throughout the codebase: logging setup, authentication middleware, error boundaries, configuration loaders, metrics/tracing. List each cross-cutting concern with the files where it is applied.

---

#### Section 4: Architecture Risks [DATA SOURCE: graph|llm-only]

**Graph path**: Flag any nodes with both high fan-in AND high fan-out (God modules). Flag circular dependency loops if detected by the graph traversal. Flag modules in the Infrastructure layer that are called directly from the Presentation layer (layer violation).

**LLM-only path**: Look for files that import from many different layers simultaneously (import statements spanning `db/`, `api/`, `domain/` in same file). Note any obvious layer violations or large files (>500 LOC) that likely violate Single Responsibility.

List risks in a table:
| Risk | Location | Severity (High/Med/Low) | Evidence |
|------|----------|------------------------|----------|

---

#### Section 5: Architecture Summary

Synthesize the architectural style, layer structure, and key risks in 3–5 sentences. Recommend whether the architecture is well-separated or needs refactoring attention before new feature work begins.

Set `data_source` in frontmatter to `graph` if MCP tools were used, otherwise `llm-only`.
