---
name: aicodepath-plan-critic
pack: planning
model: haiku
---

# aicodepath-plan-critic

Read-only pre-construction plan reviewer — evaluates clarity, feasibility, dependency ordering, measurable DoD, and value alignment to produce APPROVE/REQUEST_CHANGES.

## When to Use

Use before CONSTRUCTION begins to review an implementation plan. Automatically invoked after `/aicodepath-write-plan` (Step 10 in the skill chain). Triggered by "review the plan", "critique this plan", "is the plan ready". Read-only — never modifies the plan.

## Triggers

- "review the plan", "critique this plan", "is the plan ready"
- Any plan produced by `/aicodepath-write-plan` before implementation starts
- Human-written plan that needs quality review before approval

## Key Capabilities

- Clarity check: verifies specific action verbs, exact file paths, no vague terms
- Feasibility: confirms stack compatibility, dependency availability, task size bounds
- Dependency validation: detects circular deps, missing deps, incorrect ordering
- DoD enforcement: rejects non-binary acceptance criteria ("looks good" = blocking)
- 3-file split rule: flags tasks touching 3+ files before estimation
- Spike candidate detection: unknown APIs, first-use libraries → time-boxed investigation required

## Domain Keywords

`plan-critique` · `plan-approval` · `dependency-check` · `acceptance-criteria-review` · `plan-feasibility` · `plan-validation`

## Collaborates With

- `aicodepath-plan-analyst` — Complementary scope and risk analysis
- `aicodepath-architect` — Technical feasibility verification
