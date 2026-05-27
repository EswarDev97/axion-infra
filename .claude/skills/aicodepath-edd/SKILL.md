---
name: aicodepath-edd
description: Define AI/agent evals — EDD with capability vs regression evals, grader types, and pass@k metrics.
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
argument-hint: "define eval | run eval | capability check"
---

# Eval Harness — Eval-Driven Development (EDD)

Define pass/fail criteria BEFORE coding. Evals are to AI agents what tests are to traditional code.

**Key insight**: "If you can't eval it, you can't improve it."

---

## Two Eval Types

### Capability Evals

"Can the agent do X?" — Tests new functionality. May have softer thresholds.

```markdown
## Eval: generate-api-endpoint
**Type**: capability
**Metric**: pass@3 ≥ 90%
**Grader**: code (pytest)

Agent should generate a working REST endpoint given a spec.
```

### Regression Evals

"Does the agent still do X correctly?" — Guards against regressions. Must be strict.

```markdown
## Eval: sql-injection-prevention
**Type**: regression
**Metric**: pass^3 = 100%
**Grader**: code (grep)

Agent must NEVER generate raw SQL string concatenation with user input.
```

---

## 3 Grader Types

### Code-Based Graders

Deterministic. Preferred for regression evals. Use pytest, grep, regex, exit codes:

```bash
# Pytest grader — pass if tests pass
pytest tests/eval_auth.py --tb=short
echo "Grade: $?"  # 0 = pass, 1 = fail

# Grep grader — pass if pattern found/absent
grep -q 'parameterized' output.sql && echo "PASS" || echo "FAIL"

# Schema grader — pass if output matches JSON schema
python -c "import jsonschema; jsonschema.validate(output, schema)"
```

### Model-Based Graders

Use a separate LLM to evaluate output quality. Always use structured output:

```python
grading_prompt = """
Rate the following code review on a scale of 1-5:
- Accuracy: Are the findings correct?
- Completeness: Are important issues identified?
- Actionability: Are suggestions specific and implementable?

Output JSON: {"accuracy": N, "completeness": N, "actionability": N, "pass": bool}
"""

# Key: Use a DIFFERENT model than the agent being evaluated
# Agent uses Sonnet → Grade with Opus (or vice versa)
```

**Rules for model-based graders**:
- Always use structured output (JSON schema) — not free-form text
- Always use a different model than the agent being graded
- Define explicit rubric criteria — never ask "is this good?"
- Run 3+ grading passes and take majority vote

### Human Graders

Expert review for subjective quality. Use when automated grading is insufficient:

- UI/UX quality assessments
- Documentation clarity
- Architectural decision quality
- Creative content evaluation

Track inter-rater reliability (Cohen's kappa ≥ 0.7 for acceptable agreement).

---

## Metrics

### pass@k — At Least One Succeeds

Use for capability evals. "Can the agent do it at all?"

```
pass@k = P(at least 1 of k trials passes)

Example: pass@3 = 90%
→ 90% of eval tasks have at least 1 passing run out of 3 attempts
→ Agent can do the task, even if not every time
```

### pass^k — All Must Succeed

Use for regression evals on critical paths. "Is it reliable?"

```
pass^k = P(all k trials pass)

Example: pass^3 = 100%
→ 100% of eval tasks pass in ALL 3 attempts
→ Agent is consistently correct — no regressions
```

### Supporting Metrics

| Metric | Formula | Use For |
|--------|---------|---------|
| Cost per eval | Σ token costs per run | Budget comparison |
| Wall time | end - start per run | Latency assessment |
| Consistency | 1 - (std_dev / mean) | Reliability measure |

---

## Recommended Thresholds

| Eval Type | Metric | Threshold | Rationale |
|-----------|--------|-----------|-----------|
| Capability (new feature) | pass@3 | ≥ 90% | Agent can do it reliably enough |
| Regression (critical path) | pass^3 | = 100% | No regressions tolerated |
| Regression (non-critical) | pass@1 | ≥ 95% | High reliability, some tolerance |
| Cost efficiency | cost delta | < 20% increase | New capability shouldn't break budget |

---

## Eval Definition Format

Standard markdown format for portable eval definitions:

```markdown
## Eval: <descriptive-name>

**Type**: capability | regression
**Grader**: code | model | human
**Metric**: pass@k where k=<N> | pass^k where k=<N>
**Threshold**: <percentage>
**Tags**: [<domain>, <complexity>, <priority>]

### Task Description
<What the agent must do — specific, unambiguous>

### Input
<Exact input provided to the agent — prompt, files, context>

### Expected Output
<What constitutes a passing result — specific criteria>

### Grading Script
```bash
<Command to run for automated grading>
# Exit 0 = PASS, Exit 1 = FAIL
```

### Notes
<Edge cases, known limitations, historical context>
```

---

## Process: Define → Baseline → Implement → Eval → Iterate

1. **Define** — Write eval specs BEFORE implementation. If you can't define what "done" looks like, you're not ready to build.

2. **Baseline** — Run evals against the current state. Record pass rates, cost, and time. This is your floor.

3. **Implement** — Build the feature/agent improvement.

4. **Eval** — Run the full eval suite (3+ trials per task):
   ```bash
   for trial in 1 2 3; do
       git worktree add eval-trial-$trial HEAD
       cd eval-trial-$trial
       run_agent_on_task $task_file
       grade_output $task_file
       cd ..
   done
   ```

5. **Iterate** — If evals fail:
   - Capability eval fails → improve the agent/prompt
   - Regression eval fails → you broke something, fix before proceeding
   - Cost threshold exceeded → optimize or downgrade model

6. **Ship** — Only ship when:
   - All regression evals pass^3 = 100%
   - All capability evals pass@3 ≥ 90%
   - Cost within 20% of baseline

---

## Relationship to GICL

GICL and EDD are complementary, not competing:

| Dimension | GICL | EDD |
|-----------|------|-----|
| **When** | During implementation (construction-time) | Before/after implementation (eval-time) |
| **What it scores** | Code quality (tests, guidelines, architecture, duplication, auth) | Agent capability (can it solve this class of problem?) |
| **Question** | "Is this code well-written?" | "Can this agent solve this type of task?" |
| **Scope** | Single implementation session | Cross-session capability benchmark |
| **Threshold** | Score ≥ 90 to pass | pass@k ≥ 90% for capability |

**Use both**: GICL during development to ensure code quality. EDD for acceptance criteria to ensure the agent can reliably handle the task class.

---

## NEVER

<HARD-GATE>
- **NEVER** define evals after implementation — evals defined post-hoc are biased toward confirming what was built rather than testing what was intended. EDD requires eval-first.
- **NEVER** use a single trial to judge agent capability — agents are non-deterministic. A single pass is luck; a single fail is noise. Always run 3+ trials for statistical confidence.
- **NEVER** use the same model as both agent and grader — the grader may have the same blind spots. Use a different model or, better, a deterministic code-based grader.
- **NEVER** use pass@k for critical regression tests — pass@k means "at least one passes," which tolerates failures. Critical paths must use pass^k (all must pass) to ensure reliability.
- **NEVER** skip the baseline step — without a baseline, you can't distinguish improvement from noise. Record current pass rates before making changes.
</HARD-GATE>
