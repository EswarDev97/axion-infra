# Business Overview — RE Template

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

Output file: `aicodepath-docs/inception/reverse-engineering/01-business-overview.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__file_summary` is available, call it on each detected entry point file:

```
mcp__aicodepath-code-graph__file_summary(file_path="<main entry file>")
mcp__aicodepath-code-graph__file_summary(file_path="<secondary entry file if present>")
mcp__aicodepath-code-graph__search_entities(query="main handler index app", limit=20)
```

Entry points to probe (check existence in order): `main.py`, `app.py`, `index.js`, `index.ts`, `server.js`, `server.ts`, `src/main.*`, `src/app.*`, `cmd/main.go`, `Program.cs`, `Application.java`.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Application Purpose [DATA SOURCE: graph|llm-only]

**Graph path**: From `file_summary` output on entry points, extract module-level docstrings, class descriptions, and top-level comments. Synthesize a 2–4 sentence plain-English statement of what the application does.

**LLM-only path**: Read `README.md`, `package.json` (description field), `pyproject.toml` (description), `Cargo.toml`, or any top-level documentation file. Infer the application domain and purpose from directory names, file names, and any comments in entry-point files. Write a 2–4 sentence statement of what this codebase appears to do.

**Output format**:
> This system is a [type of application] that [core function]. It serves [target users/systems] by [primary value delivered].

---

#### Section 2: Core Domain Concepts [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` results and `file_summary` entity lists, identify the 5–10 most frequently referenced class/type names. These are likely the core domain models. List each with a one-line description inferred from its name and the files that reference it.

**LLM-only path**: Scan top-level directories and key source files. Identify recurring nouns in file names, class names, and function names. These represent the domain vocabulary. List 5–10 domain concepts with inferred descriptions.

**Output format**: Bulleted list — `**ConceptName**: inferred meaning and role in the system`

---

#### Section 3: Key User Workflows [DATA SOURCE: llm-only]

Identify 3–6 primary workflows the system supports. Derive these from:
- Route/endpoint names (CRUD verbs, resource names)
- CLI command names
- State machine transitions found in code
- Test scenario names (e.g., `test_user_can_checkout`)
- Feature flags or module names

For each workflow, write:
```
**Workflow N: [Name]**
- Trigger: [what initiates it]
- Steps: [brief ordered list]
- Outcome: [what the system produces or changes]
```

---

#### Section 4: Business Constraints and Rules [DATA SOURCE: llm-only]

Scan for hardcoded constraints: validation rules, business logic conditionals, configuration limits, SLA comments, compliance references (GDPR, HIPAA, PCI-DSS). List any found with their file location.

If none are evident from code inspection, state: "No explicit business rules identified from static analysis. Recommend stakeholder interviews."

---

#### Section 5: Summary Assessment

Write a paragraph synthesizing sections 1–4. Note any gaps (e.g., "Domain concepts are well-named but workflows are implicit — recommend reviewing test suite for workflow coverage").

Set `data_source` in frontmatter to `graph` if MCP tools were used for any section, otherwise `llm-only`.
