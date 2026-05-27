# Research-First Workflow

## Purpose

Step 0 before any implementation: search before building.
Prevents reinventing the wheel by ensuring existing solutions are discovered
before writing new code.

## Ranked Search Strategy

Execute in order. Stop when a >= 80% functionality match is found.

1. **Codebase search** -- Use Grep/Glob to find existing implementations in the
   current project. Check utilities, helpers, and shared modules first.
2. **Context7 MCP** -- Verify library APIs using `resolve-library-id` then
   `query-docs`. Mandatory per AICodePath MCP Integration pattern.
3. **Package registry** -- Search npm, PyPI, crates.io, or Maven Central for
   maintained packages that solve the problem.
4. **WebSearch** -- GitHub code search, Stack Overflow, and technical blogs for
   prior art and known patterns.

## Decision Gate

Prefer a proven approach over net-new code when >= 80% of the required
functionality is already available. Document the decision with rationale
before proceeding.

## Output Format

Brief note appended to the task or plan:

```
Searched: [what you looked for].
Found: [what matched, or "no match"].
Decision: [build | adapt | reuse] -- [one-line rationale].
```

## When to Skip

- Pure business logic with no library dependency.
- Config-only changes (env vars, feature flags, settings).
- Test-only changes (new assertions, fixture updates).
