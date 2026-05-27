# CLAUDE.md Update Guidelines

## Core Principle

Only add information that will genuinely help future Claude sessions. The context window is precious — every line must earn its place.

---

## What TO Add

### 1. Commands/Workflows Discovered

```markdown
## Build

`npm run build:prod` - Full production build with optimization
`npm run build:dev` - Fast dev build (no minification)
```

Why: Saves future sessions from discovering these again.

### 2. Gotchas and Non-Obvious Patterns

```markdown
## Gotchas

- Tests must run sequentially (`--runInBand`) due to shared DB state
- `yarn.lock` is authoritative; delete `node_modules` if deps mismatch
```

Why: Prevents repeating debugging sessions.

### 3. Package Relationships

```markdown
## Dependencies

The `auth` module depends on `crypto` being initialized first.
Import order matters in `src/bootstrap.ts`.
```

Why: Architecture knowledge that is not obvious from code.

### 4. Testing Approaches That Worked

```markdown
## Testing

For API endpoints: Use `supertest` with the test helper in `tests/setup.ts`
Mocking: Factory functions in `tests/factories/` (not inline mocks)
```

Why: Establishes patterns that work.

### 5. Configuration Quirks

```markdown
## Config

- `NEXT_PUBLIC_*` vars must be set at build time, not runtime
- Redis connection requires `?family=0` suffix for IPv6
```

Why: Environment-specific knowledge.

### 6. AICodePath-Specific Additions

For AICodePath projects, also capture:

- New critical development rules discovered (e.g., a new field that is silently ignored)
- File placement conventions that tripped up the session
- Hook output field gotchas
- Path resolver patterns that were needed
- New agents or skills added (update the taxonomy or directory)

```markdown
## Critical Development Rules

### 5. Always update agent-taxonomy.md when adding agents

When adding a new agent, add a row to
`.aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md`
```

---

## What NOT to Add

### 1. Obvious Code Info

Bad:
```markdown
The `UserService` class handles user operations.
```

The class name already tells us this.

### 2. Generic Best Practices

Bad:
```markdown
Always write tests for new features.
Use meaningful variable names.
```

This is universal advice, not project-specific.

### 3. One-Off Fixes

Bad:
```markdown
We fixed a bug in commit abc123 where the login button did not work.
```

Will not recur; clutters the file.

### 4. Verbose Explanations

Bad:
```markdown
The authentication system uses JWT tokens. JWT (JSON Web Tokens) are
an open standard (RFC 7519) that defines a compact and self-contained
way for securely transmitting information between parties as a JSON
object. In our implementation, we use the HS256 algorithm which...
```

Good:
```markdown
Auth: JWT with HS256, tokens in `Authorization: Bearer <token>` header.
```

### 5. Task Status or Session-Scoped Notes

Bad:
```markdown
Currently implementing the payment module (in progress).
```

Task status belongs in `aicodepath-docs/task/`, not CLAUDE.md. CLAUDE.md contains durable facts, not session state.

---

## Diff Format for Updates

For each suggested change:

### 1. Identify the File and Location

```
File: ./CLAUDE.md
Section: Commands (new section after ## Architecture)
```

### 2. Show the Change

```diff
 ## Architecture
 ...

+## Commands
+
+| Command | Purpose |
+|---------|---------|
+| `npm run dev` | Dev server with HMR |
+| `npm run build` | Production build |
+| `npm test` | Run test suite |
```

### 3. Explain Why

> **Why this helps:** The build commands were not documented, causing
> confusion about how to run the project. This saves future sessions
> from needing to inspect `package.json`.

---

## Where to Route Each Addition (AICodePath Projects)

When working in an AICodePath project, route additions to the most specific file:

| Information type | Target file |
|-----------------|-------------|
| Project-level commands (init, diagnostics) | `CLAUDE.md` |
| AIDLC phases, skill chain | `CLAUDE.md` |
| File placement rules, path-resolver, logger | `.aicodepath/CLAUDE.md` |
| Valid/invalid hook output fields | `.aicodepath/CLAUDE.md` |
| New gotcha about framework internals | `.aicodepath/CLAUDE.md` |
| Contributor CLI commands (init-db, validate-structure) | `.aicodepath/DEVELOPER-GUIDE.md` |
| New step in "Quick Task Reference" | `.aicodepath/DEVELOPER-GUIDE.md` |
| Pre-commit checklist item | `.aicodepath/DEVELOPER-GUIDE.md` |
| Personal/local preferences | `.claude.local.md` |

---

## Validation Checklist

Before finalizing an update, verify:

- [ ] Each addition is project-specific (not generic advice)
- [ ] No task status or session-scoped notes
- [ ] Commands are verified to exist and work
- [ ] File paths are accurate
- [ ] Would a new Claude session find this helpful?
- [ ] Is this the most concise way to express the info?
- [ ] For AICodePath projects: routed to the right file (CLAUDE.md vs .aicodepath/CLAUDE.md vs DEVELOPER-GUIDE.md)
