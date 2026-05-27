# aicodepath-test-completeness-analyzer

**Pack**: `quality` | **Model**: sonnet | **Read-only** (disallowedTools: Write, Edit, Bash)

## When to Use
When reviewing code changes for test completeness — behavioral coverage gaps, untested race conditions, missing edge cases, dual-layer safety mechanisms, multi-tenant isolation, and error propagation paths. Invoke proactively when a PR is created or updated.

## Triggers
`test-completeness`, `behavioral-coverage`, `coverage-gap-analysis`, `missing-test-cases`, `regression-risk`, `dual-layer-safety`

## Key Capabilities
- 6-step analysis: map behavioral paths → match to existing tests → identify critical gaps → evaluate test quality → rate each gap 1-10 → produce test scenario inventory
- Severity mapping: CRITICAL (8-10, data loss/security), HIGH (5-7, user-facing errors), MEDIUM (3-4, edge cases), LOW (1-2, optional)
- References `guidelines/testing-standards.json` — descriptive-test-names, arrange-act-assert, no-test-dependencies, minimum-coverage
- Integrated into `/aicodepath-review` at `standard` depth when test files are in the diff and always at `strict` depth

## Domain Keywords
`test-completeness`, `behavioral-coverage`, `coverage-gap-analysis`, `missing-test-cases`, `regression-risk`, `dual-layer-safety`

## Collaborates With
`aicodepath-test-engineer`, `aicodepath-qa`, `aicodepath-silent-failure-hunter`
