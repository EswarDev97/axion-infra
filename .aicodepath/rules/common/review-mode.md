# Review Mode Context

## When Active

During `/aicodepath-review` skill execution and any code review activities.

## Priority Order

1. Correctness
2. Security
3. Performance
4. Maintainability

## Behavioral Bias

- Read thoroughly. Do not skim.
- Check every branch and edge case.
- Produce severity-ranked findings.
- Lead with the most critical issue.

## Checklist

Review in this order:

1. Logic errors
2. Edge cases
3. Error handling
4. Injection / XSS vulnerabilities
5. N+1 / unbounded queries
6. Naming and readability
7. Test coverage gaps

## Does NOT Override

The existing 4-perspective review structure (A-D grading) defined in the
`aicodepath-review` skill. This mode supplements, not replaces, the
structured review.
