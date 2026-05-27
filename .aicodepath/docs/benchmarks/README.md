# AICodePath Benchmarks

This directory documents benchmark rubrics and evaluation results for the AICodePath framework.

---

## Benchmark Dimensions

### 1. Skill Effectiveness
Measured by `/aicodepath-skill-audit`:

| Dimension | Max Points | What It Measures |
|-----------|-----------|-----------------|
| Trigger Precision | 15 | Does the skill fire when and only when it should? |
| Instruction Completeness | 15 | Are all steps documented? |
| Tool Constraint Accuracy | 10 | Are allowed-tools correctly scoped? |
| Hard Gate Coverage | 15 | Are blocking conditions explicit? |
| Output Format | 10 | Is expected output described? |
| Anti-Pattern Coverage | 15 | Are failure modes documented? |
| Knowledge Delta | 20 | Does it teach non-obvious information? |
| Rationale Quality | 20 | Are decisions justified? |

### 2. GICL Quality Score Distribution
Target distribution for production projects:

| Score Range | Interpretation |
|-------------|---------------|
| 90–100 | GICL complete — proceed to verify |
| 75–89 | Minor issues — 1–2 more iterations |
| 60–74 | Moderate issues — refactoring needed |
| <60 | Major issues — consider effortLevel: high |

### 3. Hook Latency
Acceptable latency targets per hook category:

| Category | Target | Measured How |
|----------|--------|-------------|
| SessionStart | <500ms | Time to first additionalContext output |
| PreToolUse | <200ms | Must not block user interaction |
| PostToolUse | <1000ms | Async operations acceptable |

---

## Evidence Scoring

### Static Evidence (before execution)
- Code present and syntactically valid: +1
- Tests written first (TDD order): +1
- No stubs or TODOs in implementation: +1

### Executed Evidence (after verification)
- All tests pass: +2
- Build succeeds: +2
- No guideline violations: +1
- GICL score ≥90: +2

Maximum possible: 10 points. Score ≥7 required before claiming task complete.

---

## Running Benchmarks

```bash
# Validate all skills have required SKILL.md fields
bash .aicodepath/scripts/validate-structure.sh

# Run all tests
for f in .aicodepath/__tests__/*.test.js; do node "$f"; done

# GICL score check
node .aicodepath/lib/gicl-session-manager.js active
```
