# Component Inventory — RE Template

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

Output file: `aicodepath-docs/inception/reverse-engineering/03-component-inventory.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__search_entities` and `mcp__aicodepath-code-graph__file_summary` are available, call:

```
mcp__aicodepath-code-graph__search_entities(query="*", entity_type=None, limit=20)
mcp__aicodepath-code-graph__search_entities(query="service manager handler controller", limit=20)
mcp__aicodepath-code-graph__search_entities(query="repository store dao adapter", limit=20)
```

Then for each top-level module directory, call:
```
mcp__aicodepath-code-graph__file_summary(file_path="<module_dir>/__init__.py")
mcp__aicodepath-code-graph__file_summary(file_path="<module_dir>/index.ts")
```
(Use the appropriate entry file for the language.)

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Component Registry [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` results combined with `file_summary` per module, build a table of all significant components (classes, modules, services). For each, record:
- Component name
- Type (Service, Repository, Controller, Model, Utility, Middleware)
- File path
- Public API surface (exported functions/methods count)
- Callers count (fan-in) from graph data

**LLM-only path**: Walk the source directory tree. For each subdirectory, identify it as a component by the presence of an index file, `__init__.py`, or significant source files. Classify by directory name conventions. Estimate public API size by counting exported symbols in index files.

**Output format**: Table with columns `Component | Type | Path | Public API Size | Callers (if known)`

---

#### Section 2: Component Dependency Matrix [DATA SOURCE: graph|llm-only]

**Graph path**: Using `callers_of` and `callees_of` data collected during architecture-map, produce a matrix showing which components depend on which. Mark strong dependencies (3+ call edges) vs. weak (1 edge).

**LLM-only path**: For each component, scan its import statements to identify which other internal components it depends on. Build the matrix from these static imports.

**Output format**:
```
Dependency Matrix (X depends on Y):
         | CompA | CompB | CompC | CompD |
CompA    |   —   |   ✓   |       |   ✓   |
CompB    |       |   —   |   ✓   |       |
CompC    |       |       |   —   |   ✓   |
CompD    |       |       |       |   —   |
```

If more than 10 components, limit to the 10 most significant by callers count.

---

#### Section 3: Component Responsibility Summary [DATA SOURCE: llm-only]

For each component identified in Section 1, write a one-paragraph description covering:
- What business capability it encapsulates
- What it produces or manages
- Which other components it collaborates with

Derive descriptions from: class docstrings, README files within component directories, function names, and test file names.

---

#### Section 4: Orphaned and Utility Components [DATA SOURCE: graph|llm-only]

**Graph path**: From graph data, identify any components with zero callers (orphaned — may be dead code or CLI-only entry points) and any components with zero callees (pure leaf utilities with no internal dependencies).

**LLM-only path**: Identify files not imported by any other file based on grep patterns. Note any `utils/`, `helpers/`, or `shared/` directories that appear to have accumulated miscellaneous code without clear ownership.

List orphaned components and flag them for review. List utility components and assess whether they are cohesive or miscellaneous.

---

#### Section 5: Component Health Assessment

Score each component on three dimensions (High/Medium/Low):
- **Cohesion**: Does it do one thing? (inferred from size and type diversity)
- **Coupling**: How many external dependencies does it have?
- **Testability**: Are there corresponding test files?

Summarize overall component health and highlight the 2–3 components most in need of refactoring attention.

Set `data_source` in frontmatter to `graph` if MCP tools were used, otherwise `llm-only`.
