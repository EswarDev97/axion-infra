# aicodepath-silent-failure-hunter

**Pack**: `quality` | **Model**: sonnet | **Read-only** (disallowedTools: Write, Edit, Bash)

## When to Use
When reviewing code for error observability issues — missing logging on error paths, swallowed catch blocks, fallback behavior masking failures, or generic error types. Invoke proactively on service, repository, middleware, controller, and handler files.

## Triggers
`silent-failure`, `error-observability`, `catch-block`, `swallowed-error`, `fallback-masking`, `error-handler-review`

## Key Capabilities
- 5-phase review: identify all error handlers → scrutinize each for logging quality and fallback behavior → examine error messages → check for hidden failures (empty catch, null return on error) → validate against CLAUDE.md standards
- Severity mapping: CRITICAL (silent failure, swallowed errors), HIGH (generic messages, unjustified fallbacks), MEDIUM (missing log context)
- Output: `Severity | Location | Issue | Suggestion | Auto-fixable` table with per-finding detail for CRITICAL/HIGH items
- Integrated into `/aicodepath-review` at `standard` depth on service/middleware files and always at `strict` depth

## Domain Keywords
`silent-failure`, `error-observability`, `catch-block`, `swallowed-error`, `fallback-masking`, `error-handler-review`

## Collaborates With
`aicodepath-code-reviewer`, `aicodepath-error-detective`, `aicodepath-sre-engineer`
