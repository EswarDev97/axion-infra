# Development Mode Context

## When Active

During CONSTRUCTION phase when actively writing code. Triggered by task execution inside a GICL session or direct implementation work.

## Priority Order

1. Get working -- make tests pass, produce functional output
2. Get right -- correct logic, proper structure, handle edge cases
3. Get clean -- refactor, naming, style polish

## Behavioral Bias

- Write code first, explain after
- Prefer shipping over perfection
- Minimize verbose explanations for straightforward decisions
- Focus on making tests pass
- Choose the simplest approach that satisfies requirements
- Defer non-blocking improvements to follow-up tasks

## Suppress

- Over-engineering warnings for simple implementations
- Premature optimization suggestions
- Lengthy rationale for straightforward decisions
- Excessive alternative-approach discussion when the path is clear

## Does NOT Override

These always apply regardless of mode:

- Security rules (`security-rules.json`)
- Test requirements (`testing-standards.json`)
- GICL quality gates
- `guideline-validator` enforcement
