# aicodepath-brownfield-readiness

## Purpose

`aicodepath-brownfield-readiness` scores an existing codebase on its readiness to receive AI-assisted development. It delegates to three specialist skills — SOLID health scan, VAPT static analysis, and codebase-onboarding — then aggregates their findings into a single composite readiness score and writes a structured report. The output tells a team whether the codebase is safe to begin AI-assisted feature sprints, or whether remediation work is required first.

---

## Trigger Conditions

Invoke this skill when:

- Reverse-engineering artifacts exist (`aicodepath-docs/inception/reverse-engineering/`) but `aicodepath-docs/brownfield-readiness-report.md` has not yet been generated
- Before the first AI-assisted feature sprint on a brownfield project
- The `inception-skill-suggester` hook surfaces it as a `high`-priority suggestion
- After a significant refactor or major dependency upgrade, to re-baseline readiness
- An onboarding check reveals new contributors cannot navigate the codebase without extensive hand-holding

---

## Scorecard Dimensions

| Dimension | Weight | What Is Assessed |
|-----------|--------|-----------------|
| Regression Safety | 40% | Test coverage, test suite health, presence of integration/e2e tests, ability to detect regressions from AI-generated changes |
| Architecture Health | 35% | SOLID violations, layer separation, coupling metrics, module boundary clarity — scored via `aicodepath-solid-principles` delegation |
| Conventions | 25% | Consistent naming, linting compliance, documented patterns, onboarding friction — scored via `aicodepath-codebase-onboarding` delegation |

---

## Composite Score Thresholds

| Score Range | Rating | Recommended Action |
|-------------|--------|--------------------|
| 80 – 100 | AI-Ready | Proceed to feature sprint; log score in `brownfield-readiness-report.md` |
| 60 – 79 | Caution | Address highest-weight gaps before first sprint; attach remediation list to report |
| 40 – 59 | Not Ready | Block feature sprint; run full remediation roadmap (SOLID refactor + test coverage uplift) |
| 0 – 39 | Critical | Halt AI-assisted work; manual stabilisation required before re-scoring |

---

## Output File

The skill writes its results to:

```
aicodepath-docs/brownfield-readiness-report.md
```

The report contains:

- Composite score and rating
- Per-dimension scores with evidence snippets
- Top 3 remediation actions ranked by impact-to-effort ratio
- Optional full remediation roadmap (generated when score < 60)
- Timestamp and git commit SHA of the scored snapshot

Once this file exists, the `inception-skill-suggester` hook stops suggesting the skill for the current project state.

---

## Integration Points

| Surface | Behaviour |
|---------|-----------|
| `inception-skill-suggester` hook | Suggests skill at `high` priority when `aicodepath-docs/inception/reverse-engineering/` exists and `brownfield-readiness-report.md` does not exist |
| `using-aicodepath` trigger table | Listed under INCEPTION phase brownfield triggers |
| `rules/core/inception.md` | Referenced as a required gate before first CONSTRUCTION sprint on brownfield projects |

---

## Specialist Delegation

The skill orchestrates three sub-skills in sequence:

1. **`aicodepath-solid-principles`** — static SOLID scan across all source modules; feeds Architecture Health dimension
2. **`aicodepath-vapt`** (static-only mode) — dependency vulnerability scan and insecure-defaults check; feeds Regression Safety dimension (security regression risk)
3. **`aicodepath-codebase-onboarding`** — navigability and conventions audit; feeds Conventions dimension

Each delegate returns a normalised 0–100 score. The composite is the weighted sum of the three dimension scores.
