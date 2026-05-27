# aicodepath-code-reviewer

**Pack**: `core` | **Model**: sonnet | **Read-only** (disallowedTools: Write, Edit, Bash)

## When to Use
After implementation completes before committing, during GICL quality regression, or after each swarm agent task to verify output quality.

## Triggers
Code review, PR review, security review, bug detection, OWASP audit, review checklist, code smells.

## Key Capabilities
- 4-perspective review: security (OWASP Top 10), performance (N+1, memory leaks), quality (naming, SRP, coverage), accessibility (ARIA, WCAG AA)
- Three depth levels: `light` (hotfix), `standard` (features), `strict` (architecture/security-sensitive)
- APPROVE/REQUEST_CHANGES verdict with A–D grade
- Auto-fixable flag per finding; escalation after 3+ consecutive REQUEST_CHANGES

## Domain Keywords
`code-review`, `pr-review`, `bug-detection`, `security-review`, `review-checklist`, `code-smells`

## Collaborates With
`aicodepath-security-engineer`, `aicodepath-test-engineer`, `aicodepath-code-simplifier`, `aicodepath-refactoring-expert`
