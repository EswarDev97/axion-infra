---
name: aicodepath-agent-eval
description: Benchmark or compare AI agents — YAML task definitions, worktree isolation, judge types, and head-to-head metrics.
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
argument-hint: "benchmark <agent> | compare <agent-a> <agent-b>"
---

# Agent Eval — Head-to-Head Agent Benchmarking

Evaluate and compare AI agents with structured task definitions, isolated execution environments, and multiple judge types.

**Key insight**: Agents are non-deterministic. A single run tells you nothing about reliability. Run 3+ trials to establish statistical confidence.

---

## YAML Task Definitions

Define eval tasks in a portable YAML format:

```yaml
eval_suite: auth-feature
description: "Evaluate agent capability on authentication tasks"
trials: 5
timeout_per_task: 120

tasks:
  - id: jwt-endpoint
    name: "Implement JWT authentication endpoint"
    description: |
      Create a POST /auth/login endpoint that accepts
      username and password, validates against a user store,
      and returns a signed JWT token.
    setup_files:
      - src/models/user.ts
      - tests/auth/test_login.py
    judge: pytest
    judge_config:
      test_file: tests/auth/test_login.py
      timeout: 60
    tags: [api, security, medium]

  - id: refresh-token
    name: "Implement token refresh endpoint"
    description: |
      Create a POST /auth/refresh endpoint that accepts
      a refresh token and returns a new access token.
    setup_files:
      - src/auth/jwt.ts
    judge: composite
    judge_config:
      judges:
        - type: pytest
          test_file: tests/auth/test_refresh.py
          weight: 0.7
        - type: grep
          pattern: "httpOnly.*true"
          file: src/auth/jwt.ts
          weight: 0.3
    tags: [api, security, medium]
```

### Task Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the task |
| `name` | Yes | Human-readable task name |
| `description` | Yes | Full task description given to the agent |
| `setup_files` | No | Files that should exist before the agent starts |
| `judge` | Yes | `pytest` \| `grep` \| `llm` \| `composite` |
| `judge_config` | Yes | Judge-specific configuration |
| `tags` | No | Categorization for filtering and reporting |
| `timeout` | No | Per-task timeout in seconds (default: 120) |

---

## Git Worktree Isolation

Each eval run gets its own git worktree — no interference between parallel runs:

```bash
# Create isolated worktrees for each trial
for trial in $(seq 1 $NUM_TRIALS); do
    git worktree add "eval-run-$trial" HEAD
done

# Run agent in each worktree
for trial in $(seq 1 $NUM_TRIALS); do
    cd "eval-run-$trial"
    run_agent "$TASK_FILE"
    grade_output "$TASK_FILE"
    cd ..
done

# Cleanup
for trial in $(seq 1 $NUM_TRIALS); do
    git worktree remove "eval-run-$trial" --force
done
```

**Why worktrees**:
- Each run starts from the exact same codebase state
- No cached state, no leftover files from previous runs
- Parallel execution is safe — no file conflicts
- Easy cleanup with `git worktree remove`

---

## Judge Types

### Pytest Judge

Run a test suite. Pass/fail based on exit code. Most reliable:

```yaml
judge: pytest
judge_config:
  test_file: tests/eval_task.py
  timeout: 60
  args: "--tb=short -q"
```

```bash
cd eval-run-$trial
pytest $test_file --tb=short -q
GRADE=$?  # 0 = PASS, 1 = FAIL
```

### Grep Judge

Check for specific patterns in output files. Good for structural checks:

```yaml
judge: grep
judge_config:
  pattern: "parameterized"
  file: "src/db/queries.ts"
  inverse: false  # true = pattern must NOT be found
```

```bash
if grep -q "$pattern" "$file"; then
    GRADE=0  # PASS
else
    GRADE=1  # FAIL
fi
```

### LLM-as-Judge

Use a separate model to evaluate output quality:

```yaml
judge: llm
judge_config:
  model: claude-opus-4-6-20250514  # MUST differ from agent model
  rubric: |
    Rate the code on:
    1. Correctness (0-5): Does it implement the spec?
    2. Security (0-5): Are there vulnerabilities?
    3. Style (0-5): Does it follow conventions?
    Pass threshold: all dimensions >= 3
  output_schema:
    correctness: int
    security: int
    style: int
    pass: bool
```

**Rules**: Always use a different model than the agent being evaluated. Always use structured output (JSON schema). Run 3+ grading passes and take majority vote.

### Composite Judge

Combine multiple judges with weights:

```yaml
judge: composite
judge_config:
  judges:
    - type: pytest
      test_file: tests/eval_task.py
      weight: 0.6
    - type: grep
      pattern: "async"
      file: src/handler.ts
      weight: 0.2
    - type: llm
      model: claude-opus-4-6-20250514
      rubric: "Is the error handling comprehensive?"
      weight: 0.2
  pass_threshold: 0.7  # weighted score >= 0.7 to pass
```

---

## Metrics

| Metric | Formula | Use For |
|--------|---------|---------|
| Pass Rate | N_pass / K_total | Overall reliability |
| Cost (USD) | Σ token costs per run | Budget comparison |
| Wall Time (s) | end - start per run | Latency comparison |
| Consistency | std_dev(scores) across runs | Reliability |
| Cost-Adjusted Pass Rate | pass_rate / avg_cost | Efficiency |

### Minimum Trial Count

| Trials | Confidence Level | Use For |
|--------|-----------------|---------|
| 3 | Directional signal | Quick comparison |
| 5 | Reasonable confidence | Standard benchmarks |
| 10 | High confidence | Critical decisions |

Always report **mean ± std_dev** across trials.

---

## Eval Report Format

```markdown
## Agent Eval Report

**Suite**: auth-feature
**Date**: 2026-03-26
**Trials**: 5 per agent

### Results

| Metric | Agent A (Sonnet) | Agent B (Opus) |
|--------|-----------------|----------------|
| Pass Rate | 4/5 (80%) | 5/5 (100%) |
| Avg Cost | $0.42 ± $0.08 | $0.67 ± $0.12 |
| Avg Time | 45s ± 8s | 62s ± 15s |
| Consistency (σ) | 0.12 | 0.04 |
| Cost-Adj Pass Rate | 1.90 | 1.49 |

### Verdict

**Highest reliability**: Agent B (100% pass rate, lowest variance)
**Most cost-effective**: Agent A (higher cost-adjusted pass rate)
**Recommendation**: Agent B for production (reliability > cost)

### Per-Task Breakdown

| Task | Agent A | Agent B |
|------|---------|---------|
| jwt-endpoint | 5/5 ✅ | 5/5 ✅ |
| refresh-token | 3/5 ⚠️ | 5/5 ✅ |
| rbac-middleware | 4/5 ✅ | 5/5 ✅ |

### Failure Analysis

Agent A failed `refresh-token` in trials 2 and 4:
- Trial 2: Missing httpOnly flag on refresh cookie
- Trial 4: Token rotation not implemented
```

---

## Process

1. **Define** — Write YAML task definitions with clear specs and judges
2. **Set up** — Create worktrees for isolation
3. **Run** — Execute agent on each task, 3+ trials per task:
   ```bash
   for task in tasks; do
       for trial in 1 2 3; do
           git worktree add "eval-$task-$trial" HEAD
           cd "eval-$task-$trial"
           run_agent "$task"
           grade_output "$task" > "results/$task-$trial.json"
           cd ..
       done
   done
   ```
4. **Grade** — Apply judges to each trial's output
5. **Aggregate** — Calculate pass rates, costs, times per agent
6. **Report** — Generate comparison report with per-task breakdown
7. **Clean up** — Remove all worktrees

---

## NEVER

<HARD-GATE>
- **NEVER** judge agent capability from a single trial — a single pass is luck, a single fail is noise. Agents are non-deterministic. Run 3+ trials minimum for any meaningful signal.
- **NEVER** use the same model as both agent and grader — the grader may have the exact same blind spots as the agent. Use a different model or a deterministic code-based judge.
- **NEVER** run eval trials without git worktree isolation — shared state between trials contaminates results. Trial 2 may pass only because trial 1 left behind files.
- **NEVER** report pass rate without variance — "80% pass rate" from 5 trials means very different things depending on whether the variance is 0.04 or 0.40. Always report mean ± std_dev.
- **NEVER** compare agents on pass rate alone — a 100% pass rate at $5/run is worse than 95% at $0.10/run for non-critical tasks. Use cost-adjusted pass rate for efficiency comparisons.
</HARD-GATE>
