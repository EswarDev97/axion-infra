---
name: aicodepath-codebase-onboarding
description: Onboard to an unfamiliar codebase — stack detection, entry points, flow tracing, and convention cataloging.
user-invocable: true
allowed-tools: [Read, Glob, Grep, Bash]
argument-hint: ""
---

# Codebase Onboarding

Structured first-contact exploration for brownfield codebases. Produces a persistent onboarding guide that can be referenced in future sessions instead of re-exploring from scratch.

**Output file**: `aicodepath-docs/onboarding-guide.md`

---

## Step 1: Stack Detection

Identify runtime, language, frameworks, and build system from manifest files:

```bash
# Node.js / JS
cat package.json | grep -E '"name"|"version"|"dependencies"' | head -20

# Python
cat pyproject.toml requirements.txt setup.py 2>/dev/null | head -30

# Go
cat go.mod | head -10

# Java / Kotlin
cat build.gradle build.gradle.kts pom.xml 2>/dev/null | head -20

# Rust
cat Cargo.toml | head -15
```

**Record**:
- Primary language(s) + version
- Web framework (Express, FastAPI, Spring Boot, Gin, Actix, etc.)
- Database (Postgres, MySQL, MongoDB, SQLite, etc.)
- Build/test tools (Gradle, Maven, Cargo, pytest, Jest, etc.)
- CI/CD (GitHub Actions, GitLab CI, Jenkinsfile)

---

## Step 2: Structure Mapping

Map the top-level directory layout:

```bash
find . -maxdepth 2 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.*"
```

**Classify each top-level directory**: source, tests, docs, config, scripts, build artifacts, migrations.

---

## Step 3: Entry Point Identification

Find the primary runtime entry points:

| Stack | Entry Point Pattern |
|-------|---------------------|
| Node.js | `main` in package.json → `index.js` / `server.js` / `app.js` |
| Python | `__main__.py`, `main.py`, `app.py`, `manage.py` |
| Go | `main.go` in `cmd/` or root |
| Java/Kotlin | Class with `public static void main` or `@SpringBootApplication` |
| Rust | `src/main.rs` |

Read the entry point to understand initialization order (config load → DB connect → route registration → listen).

---

## Step 4: Key Flow Tracing

Trace the most important user-facing request path end-to-end:

1. **HTTP layer** — router → controller/handler
2. **Service layer** — business logic, validation
3. **Data layer** — repository/DAO → database query
4. **Response** — serialization → HTTP response

For async codebases: trace the event loop / message queue consumer path.

Note: trace with `Grep` — search for endpoint patterns, then read only the relevant files.

---

## Step 5: Convention Cataloging

Document the patterns the team uses consistently:

- **Naming**: snake_case / camelCase / PascalCase per layer
- **Error handling**: exceptions, Result types, error middleware
- **Auth pattern**: JWT in header, session cookie, API key
- **Config loading**: dotenv, environment variables, config files
- **Logging**: logger library, log levels, structured vs string
- **Test location**: co-located (`*.test.ts`) or separate (`tests/`)
- **Migrations**: numbered SQL files, ORM auto-migrate, manual

---

## Step 6: Gotcha Inventory

Identify non-obvious hazards before coding:

- **Build prerequisites**: must run `npm install` / `pip install` before tests pass
- **Environment requirements**: `.env.example` fields that must be set
- **Port conflicts**: known hard-coded ports to avoid
- **Test isolation**: tests that leave state (no teardown), tests requiring a running DB
- **Monorepo gotchas**: symlinks, shared packages, build order dependencies
- **Known broken areas**: TODO/FIXME comments in critical paths, skipped tests

```bash
# Find broken/skipped tests
grep -r "\.skip\|xdescribe\|xit\|@Ignore\|pytest.mark.skip" --include="*.ts" --include="*.js" --include="*.py" --include="*.java" -l

# Find TODOs/FIXMEs in source
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.java" --include="*.rs" --include="*.kt" -l | head -10
```

---

## Step 7: Write Onboarding Guide

Write the findings to `aicodepath-docs/onboarding-guide.md` in this structure:

```markdown
# Onboarding Guide: <project-name>

Generated: <date>

## Stack
- Language: ...
- Framework: ...
- Database: ...
- Tests: ...

## Directory Layout
<table or bullet list>

## Entry Point
<file path + initialization sequence>

## Key Request Flow
<end-to-end path with file:line references>

## Conventions
<bullet list>

## Gotchas
<bullet list — non-obvious hazards>
```

---

## Step 8: Build Code Graph

After the onboarding guide is written, build the AST code graph so call-chain queries are available from the first session.

Invoke `/aicodepath-code-graph` — it will check the DB state and guide through indexing automatically.

If `/aicodepath-code-graph` is unavailable, run directly:
```bash
python3 .aicodepath/generators/parsers/ast_parser.py --index . \
  --db-path aicodepath-docs/aicodepath.db
```

The graph enables `callers_of`, `callees_of`, `impact_radius`, and `tests_for` queries via MCP for the rest of the session.

---

## Integration

- Run at session start for brownfield projects instead of ad-hoc exploration
- Reference `aicodepath-docs/onboarding-guide.md` in future sessions via `/aicodepath-knowledge`
- Update when significant architecture changes occur

<HARD-GATE>
Do NOT start implementing features in an unfamiliar codebase before completing at least Steps 1–4.
Working without a mental model of the architecture leads to misplaced code, wrong abstraction layers, and broken conventions.
</HARD-GATE>
