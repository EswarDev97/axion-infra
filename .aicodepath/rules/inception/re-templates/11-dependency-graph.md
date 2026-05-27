# Dependency Graph — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: SKIP — shallow route covers docs 1–5 only
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.
If `re_route` = `brownfield-shallow`: stop here, do not generate this document.

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

Output file: `aicodepath-docs/inception/reverse-engineering/11-dependency-graph.md`
Visual output: `aicodepath-docs/inception/reverse-engineering/11-dependency-graph.html`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__impact_radius` and `mcp__aicodepath-code-graph__visualize_graph` are available, call:

```
mcp__aicodepath-code-graph__impact_radius(changed_files=["<all top-level source modules>"], max_depth=2)
mcp__aicodepath-code-graph__visualize_graph(scope="full", max_nodes=200)
```

The `impact_radius` call with all source modules as `changed_files` effectively maps the full internal dependency graph from both directions. The `visualize_graph` call generates an interactive HTML file — save its output to `aicodepath-docs/inception/reverse-engineering/11-dependency-graph.html`.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Internal Dependency Graph [DATA SOURCE: graph|llm-only]

**Graph path**: From `impact_radius` and `visualize_graph` results, summarize the complete internal module dependency graph. Report:
- Total node count (modules/files in graph)
- Total edge count (dependency relationships)
- Average fan-out (how many dependencies each module has on average)
- Average fan-in (how widely each module is used on average)
- The `visualize_graph` HTML output is saved as `11-dependency-graph.html` for interactive exploration

**LLM-only path**: Reconstruct the dependency graph from import statements by traversing files recursively. Use the following approach:
1. Start from entry point files
2. For each file, record its imports that reference internal modules (not node_modules or standard library)
3. Build an adjacency list representation
4. Report the most heavily imported modules (high fan-in) and modules with the most dependencies (high fan-out)

Report the top 10 most depended-upon modules (highest fan-in) and the top 10 most dependent modules (highest fan-out).

---

#### Section 2: External Package Dependency Inventory [DATA SOURCE: llm-only]

From package manifest files (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `pom.xml`):

Categorize all external dependencies:

**Production dependencies** (shipped with the application):
| Package | Version Pinned | Category | Purpose |
|---------|---------------|----------|---------|

**Development dependencies** (build/test only, not shipped):
| Package | Version Pinned | Category | Purpose |
|---------|---------------|----------|---------|

Categories: Framework, ORM/Database, Auth, HTTP Client, Queue, Logging, Validation, Utility, Testing, Build, Linting, Type Checking, Monitoring, Cloud SDK

Identify:
- Total production dependency count
- Total transitive dependency count (if lock file exists: `package-lock.json`, `poetry.lock`, `Cargo.lock`)
- Whether a lock file is committed (reproducible builds)

---

#### Section 3: Circular Dependency Detection [DATA SOURCE: graph|llm-only]

**Graph path**: From `impact_radius` data, identify any cycles in the dependency graph (Module A → Module B → Module A, or longer cycles). List each cycle found.

**LLM-only path**: From the adjacency list built in Section 1, run a cycle detection pass (DFS with back-edge detection). Report any cycles found.

For each cycle:
```
**Cycle N**: ModuleA → ModuleB → ModuleC → ModuleA
- Files involved: [list]
- Risk: Circular imports prevent clean module boundaries and can cause initialization errors
- Recommended break point: [suggest which direction to invert]
```

If no cycles found: state "No circular dependencies detected."

---

#### Section 4: Dependency Stability Analysis [DATA SOURCE: llm-only]

Assess the stability of the internal dependency structure using the Stable Dependencies Principle:

- **Stable modules** (high fan-in, low fan-out): Core utilities, base classes, shared interfaces — these are depended upon heavily and should change rarely
- **Instable modules** (low fan-in, high fan-out): Concrete implementations, feature modules — these change frequently and should depend on stable abstractions

Flag violations: Is any stable module (high fan-in) also highly instable (high fan-out)? These are risky coupling points.

For external dependencies, flag:
- Packages pinned to exact versions (reproducible but requires manual updates)
- Packages using wide version ranges (`>=1.0`, `*`) — unpredictable breaking changes risk
- Packages with known deprecation notices in their README or NPM/PyPI page

---

#### Section 5: Outdated and Vulnerable Dependencies [DATA SOURCE: llm-only]

From available information (lock files, package manifests, any `npm audit` / `pip audit` / `cargo audit` output committed to the repo):

Identify:
- Packages that are multiple major versions behind current (e.g., React 16 when v19 is current)
- Packages with known security advisories (check if `dependabot` alerts or `snyk` reports are present in the repo)
- Abandoned packages (last release > 2 years ago with no active maintenance signals)
- Packages with extremely large transitive dependency trees (bundle size risk for frontend)

Produce a dependency health table:
| Package | Current Version | Latest Version | Security Advisory | Action |
|---------|----------------|---------------|------------------|--------|

---

#### Section 6: Dependency Graph Summary and Recommendations

Synthesize findings across all sections:

1. **Graph health score**: Rate the internal dependency structure (Clean/Acceptable/Concerning/Critical) based on cycle count, fan-in/fan-out distribution, and SDP violations
2. **External dependency health**: Rate as (Healthy/Moderate Risk/High Risk) based on outdated packages, missing lock file, and vulnerability exposure
3. **Top 3 structural recommendations**: Which dependency relationships should be refactored first to improve maintainability?
4. **Top 3 package update priorities**: Which external packages are most urgent to update?

Include a link to `11-dependency-graph.html` for interactive graph exploration (if generated by `visualize_graph`).

Set `data_source` in frontmatter to `graph` if `impact_radius` or `visualize_graph` were used, otherwise `llm-only`.
