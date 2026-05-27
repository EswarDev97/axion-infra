---
name: aicodepath-search-first
description: Enforce ranked search before building — codebase, Context7, registry, then WebSearch with ≥80% match gate.
user-invocable: true
allowed-tools: [Read, Grep, Glob, Bash, WebSearch]
argument-hint: "search for <what you need>"
---

# Search-First — Research Before Building

Mandatory Step 0 before any implementation: search for existing solutions before writing new code.

Integrates with `rules/construction/research-first.md` — this skill is the executable workflow for that rule.

---

## Why Search First

- 70% of "new" features have existing implementations somewhere in the codebase, a library, or a well-known pattern
- Building net-new when a proven solution exists wastes time and introduces untested code
- The cost of searching (5-10 minutes) is always less than the cost of building + debugging (hours)

---

## Ranked Search Strategy

Execute in order. Stop when a ≥80% functionality match is found:

### Level 1: Codebase Search (always start here)

Search the current project for existing implementations:

```bash
# Search for similar functions/classes
grep -rn "functionName\|ClassName" src/

# Search for similar file names
find . -name "*auth*" -o -name "*login*"

# Search for similar patterns
grep -rn "pattern you need" --include="*.ts" --include="*.js"
```

**Check first**: utilities, helpers, shared modules, base classes, existing services.

### Level 2: Context7 MCP (library APIs)

Verify library APIs before assuming method signatures:

```
1. mcp__plugin_context7_context7__resolve-library-id (find library)
2. mcp__plugin_context7_context7__query-docs (get actual docs)
3. Use verified API surface — never assume signatures
```

**Mandatory** per AICodePath MCP Integration pattern. Prevents hallucinating library APIs.

### Level 3: Package Registry

Search for maintained packages that solve the problem:

| Language | Registry | Command |
|----------|----------|---------|
| JavaScript | npm | `npm search <keyword>` |
| Python | PyPI | `pip search <keyword>` or search pypi.org |
| Rust | crates.io | `cargo search <keyword>` |
| Go | pkg.go.dev | search pkg.go.dev |

**Criteria for adopting a package**:
- Actively maintained (commits within 6 months)
- Reasonable download count / stars
- No known security vulnerabilities
- License compatible with your project

### Level 4: WebSearch (last resort)

Search for prior art and known patterns:

- GitHub code search for similar implementations
- Stack Overflow for known solutions
- Technical blogs for established patterns

---

## Decision Gate

After searching, decide:

| Match Level | Decision | Action |
|-------------|----------|--------|
| ≥80% match | **Reuse** | Use the existing solution directly |
| 50-79% match | **Adapt** | Fork/extend the existing solution |
| <50% match | **Build** | Write new code (document why nothing matched) |

**The 80% rule**: Prefer a proven approach over net-new code when ≥80% of the required functionality is already available. The remaining 20% can be extended — don't rebuild the 80%.

---

## Output Format

Document your search decision before proceeding:

```markdown
### Search-First Result

**Searched for**: <what you needed>
**Level reached**: <1-4>

| Level | Source | Result |
|-------|--------|--------|
| 1. Codebase | `grep -rn "auth" src/` | Found `src/auth/jwt.ts` — 60% match |
| 2. Context7 | `jsonwebtoken` docs | Confirmed API: `jwt.sign()`, `jwt.verify()` |
| 3. Package | npm `passport-jwt` | 90% match — handles JWT + strategies |
| 4. WebSearch | — | Skipped (Level 3 match found) |

**Decision**: Adapt — use `passport-jwt` for JWT strategy, extend with custom claims
**Rationale**: Package handles token verification, refresh, and strategy patterns. Only custom claims logic (~20%) needs new code.
```

---

## When to Skip Search-First

- Pure business logic with no library dependency
- Config-only changes (env vars, feature flags, settings)
- Test-only changes (new assertions, fixture updates)
- Bug fixes where the fix location is already known

---

## Process

1. **Identify** — What specific capability do you need?
2. **Search** — Walk through Levels 1-4 in order
3. **Evaluate** — Does any result meet the ≥80% threshold?
4. **Decide** — Reuse, Adapt, or Build
5. **Document** — Record the search result and decision
6. **Proceed** — Start implementation with the chosen approach

---

## NEVER

<HARD-GATE>
- **NEVER** skip codebase search (Level 1) — the most common duplicate code comes from not knowing what already exists in your own project. `grep` takes seconds and prevents hours of redundant work.
- **NEVER** assume a library API signature without verifying via Context7 or official docs — hallucinated method signatures are the #1 cause of "it should work" bugs. Verify before using.
- **NEVER** adopt a package without checking maintenance status — an unmaintained package is a future vulnerability. Check last commit date, open issues, and security advisories.
- **NEVER** build net-new when a ≥80% match exists — the remaining 20% is almost always cheaper to extend than rebuilding the full 100%. Document why nothing matched if you choose to build.
- **NEVER** skip documenting the search decision — without documentation, the next developer (or future you) will search again or unknowingly build a third implementation of the same thing.
</HARD-GATE>
