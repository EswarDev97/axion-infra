---
name: aicodepath-brownfield-readiness
description: Audit brownfield codebase AI-readiness — scored report across regression safety, architecture health, and conventions.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[path to analyze, defaults to project root]"
---

# aicodepath-brownfield-readiness

Synthesis orchestrator that audits a brownfield codebase across three dimensions and produces a scored AI-Readiness Report with an optional remediation plan. This skill does NOT modify code — it reads, measures, and reports.

---

## Expected Behaviors

**Behavior 1** — When invoked on a brownfield project, produces a scored report with 3 dimensions (Regression Safety, Architecture Health, Conventions & Navigability), a composite score, and a threshold label.

**Behavior 2** — When `score < 60`, prompts the user: "Score is X/100. Generate remediation tasks for `/aicodepath-write-plan`?" If yes, invokes `/aicodepath-write-plan` with P0+P1 items pre-loaded.

**Behavior 3** — When `aicodepath-docs/onboarding-guide.md` exists, reads it and skips re-running `/aicodepath-codebase-onboarding`. The onboarding-guide content is used as the codebase context baseline.

---

> **Prerequisite**: If the code-graph has been built, run `/aicodepath-code-graph` Step 1 first to verify the index is populated. Brownfield analysis queries (`callers_of`, `impact_radius`) benefit from a populated graph — without it, all call-graph traversals silently return empty.

## Step 1 — Prerequisites Check

Check what onboarding context already exists:

```bash
ls aicodepath-docs/onboarding-guide.md 2>/dev/null && echo "ONBOARDING_EXISTS" || echo "ONBOARDING_MISSING"
ls aicodepath-docs/inception/reverse-engineering/ 2>/dev/null && echo "RE_EXISTS" || echo "RE_MISSING"
```

Decision tree:
- If `aicodepath-docs/onboarding-guide.md` exists → Read it. Use as codebase context. **Skip onboarding**.
- Else if `aicodepath-docs/inception/reverse-engineering/` exists → Read RE artifacts. Use as codebase context. **Skip onboarding**.
- Else → Run `/aicodepath-codebase-onboarding` first. Wait for it to complete. Then proceed.

---

## Step 2 — Specialist Delegation (3 Parallel Tracks)

Execute all three tracks. Each track feeds a scoring dimension.

### Track A — Architecture Health (feeds Architecture Health score)

Run SOLID analysis on the top 10 files by line count:

```bash
# Find top 10 source files by LOC
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" \
  -exec wc -l {} + 2>/dev/null | sort -rn | head -11 | tail -10
```

Then invoke `/aicodepath-solid-principles --auto-scan` targeting those 10 files.

Record from the SOLID output:
- Count of God classes detected (classes > 300 LOC with > 10 methods)
- Count of OCP violations (switch/if chains > 5 cases checking type/status)
- Count of SRP violations
- Count of DIP violations (hardcoded `new` on concrete classes in business logic)

### Track B — Security/Debt (secondary input to Architecture Health)

Run `/aicodepath-vapt` in static-only mode (no network probing):
```
/aicodepath-vapt --mode static-only
```

Record: count of HIGH/CRITICAL findings that indicate structural debt (not just config issues).

### Track C — Regression Safety (feeds Regression Safety score)

```bash
# Count test files
find . -type f \( -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" -o -name "test_*" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l

# Count source files (non-test)
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" \
  ! -name "*.test.*" ! -name "*.spec.*" ! -name "*_test.*" | wc -l

# Check for coverage config
ls .nycrc .nycrc.json .c8rc jest.config.* coverage/.coverage pytest.ini setup.cfg \
   .coveragerc pyproject.toml 2>/dev/null | head -1

# Check for CI with coverage step
grep -rl "coverage\|lcov\|codecov" .github/ .circleci/ .travis.yml Makefile 2>/dev/null | head -1
```

---

## Step 3 — Score Calculation

### Regression Safety Score (0–100)

| Condition | Points |
|-----------|--------|
| 0 test files found | 0 (stop — this dimension scores 0) |
| test-to-source ratio ≥ 0.5 | 80 |
| test-to-source ratio 0.2–0.49 | 50 |
| test-to-source ratio 0.05–0.19 | 25 |
| test-to-source ratio < 0.05 | 10 |
| Coverage config file present | +20 |
| CI pipeline runs coverage | +0 (already counted in config) |

Cap at 100. If 0 test files, score = 0.

### Architecture Health Score (0–100)

Start at 100. Apply deductions:

| Finding | Deduction |
|---------|-----------|
| Each God class detected | -15 |
| Each OCP violation | -8 |
| Each SRP violation | -6 |
| Each DIP violation (hardcoded `new`) | -5 |
| Each HIGH/CRITICAL VAPT structural finding | -4 |

Floor at 0.

### Conventions & Navigability Score (0–100)

| Condition | Points |
|-----------|--------|
| README.md present at root | +20 |
| Entry points documented in README or onboarding-guide | +20 |
| Naming consistency: scan 20 files, >80% follow consistent case convention (camelCase/snake_case) | +40 |
| Naming consistency: 60–80% consistent | +25 |
| Naming consistency: <60% consistent | +10 |
| Inline comments in >50% of functions in top 5 files by LOC | +20 |

Cap at 100.

### Composite Score

```
composite = (regression_safety * 0.40) + (architecture_health * 0.35) + (conventions * 0.25)
```

Round to nearest integer.

### Threshold Labels

| Range | Label |
|-------|-------|
| 80–100 | AI-ready |
| 60–79 | Conditionally ready |
| 40–59 | Fragile |
| 0–39 | High risk |

---

## Step 4 — Report Synthesis

Classify each finding by priority:

**P0 — Block AI coding until fixed**
- Missing test suite for any module that will be modified
- God class that is the target of the AI-assisted feature
- CRITICAL VAPT finding in business logic

**P1 — Fix before first sprint**
- Test-to-source ratio < 0.2 in modules under change
- Undocumented entry points
- OCP violations in modules under change

**P2 — Fix during sprints**
- Low inline comment density
- Naming inconsistencies
- DIP violations in non-critical paths

Write the report to `aicodepath-docs/brownfield-readiness-report.md`:

```markdown
# AI-Readiness Report — <project-name>
Generated: <date>

## Composite Score: X/100 — <threshold label>

| Dimension               | Score | Grade |
|-------------------------|-------|-------|
| Regression Safety       | XX    | X     |
| Architecture Health     | XX    | X     |
| Conventions & Navigability | XX | X     |

### Score Rationale
- Regression Safety (40% weight): [explain key driver]
- Architecture Health (35% weight): [explain key driver]
- Conventions & Navigability (25% weight): [explain key driver]

## P0 — Block AI coding until fixed
- [ ] [finding with file reference]

## P1 — Fix before first sprint
- [ ] [finding with file reference]

## P2 — Fix during sprints
- [ ] [finding with file reference]
```

Grade mapping: 80–100=A, 65–79=B, 50–64=C, 35–49=D, 0–34=F

---

## Step 5 — Remediation Handoff (Conditional)

Present the score to the user:

```
Score is X/100 — <label>.

P0 items: N | P1 items: N | P2 items: N

Generate remediation tasks for /aicodepath-write-plan? (yes/no)
```

If user answers **yes**:
- Collect all P0 and P1 items from the report
- Format them as task descriptions
- Invoke `/aicodepath-write-plan` with those items as the pre-formed task list

If score < 60, add this advisory:
> "This codebase is in Fragile or High Risk state. AI coding without remediation will compound existing problems. Strongly recommend completing P0+P1 items before starting feature sprints."

If user answers **no** (or score ≥ 60 and user skips):
- Confirm the report has been saved to `aicodepath-docs/brownfield-readiness-report.md`
- Suggest: "Run `/aicodepath-brownfield-readiness` again after each remediation sprint to track score improvement."

---

## Integration Points

- **Hook**: `inception-skill-suggester.js` suggests this skill when `reverseEngDir` exists and `brownfield-readiness-report.md` does not
- **Rule**: `inception.md` step 4.5 prompts this scan after RE completion
- **Skill directory**: `using-aicodepath/SKILL.md` Implementation table lists this skill for brownfield audit triggers
- **Handoff**: Feeds into `/aicodepath-write-plan` for remediation planning

---

## Constraints

- Not a mandatory gate — never blocks the user from proceeding
- Not part of the main 15-step skill chain — brownfield-conditional utility only
- Does not modify any source files — read-only analysis
- Report file at `aicodepath-docs/brownfield-readiness-report.md` is the only write output
