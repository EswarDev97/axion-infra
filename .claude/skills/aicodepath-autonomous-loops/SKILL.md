---
name: aicodepath-autonomous-loops
description: Taxonomy of 6 autonomous AI loop patterns with decision matrix — pick the right loop for multi-step tasks.
user-invocable: false
allowed-tools: []
argument-hint: ""
---

# Autonomous Loop Patterns

Reference taxonomy of the 6 autonomous loop architectures available in AICodePath, with a decision matrix for selecting the right pattern and an explicit mapping to the AICodePath skill that implements each.

---

## The 6 Loop Patterns

### 1. Sequential REPL Loop

**What it is**: One task → execute → observe output → next task. Linear pipeline.

**When to use**:
- Tasks with hard sequential dependencies (migration must precede query, compile must precede test)
- Single-agent, low complexity
- <5 steps

**AICodePath skill**: `/aicodepath-tdd` (test → implement → verify per step)

---

### 2. REPL (Read-Eval-Print Loop)

**What it is**: Iterative refinement loop. Write code → run → observe error → fix → repeat until green.

**When to use**:
- Debugging a specific failing test
- Getting a CLI tool to produce correct output
- Prototype-then-harden workflows

**AICodePath skill**: `/aicodepath-gicl-start` (GICL loop: score → fix → re-score until ≥90)

---

### 3. Continuous PR Loop

**What it is**: Autonomous PR factory. Select task from backlog → implement → create PR → select next.

**When to use**:
- Sprint execution with pre-planned tasks.md
- Tasks are independent (no shared file writes)
- Each task maps 1:1 to a PR

**AICodePath skill**: `/aicodepath-work` (auto-detects mode; drives tasks.md → PR creation)

---

### 4. Parallel Wave Loop

**What it is**: Fan-out N independent workers simultaneously → wait for all → merge results.

**When to use**:
- N independent tasks (language rule sets, independent modules)
- ~50% throughput gain over sequential
- No shared file writes among workers

**Risk**: Write race on shared files (using-aicodepath/SKILL.md, codebase-map.md). Pre-allocate stubs or serialize final merge.

**AICodePath skill**: `/aicodepath-swarm` or `/aicodepath-subagent-dev`

---

### 5. De-Sloppify Loop

**What it is**: Code review → identify N quality violations → fix each → re-review until clean.

**When to use**:
- GICL score stuck below 70
- Post-implementation quality sweep
- Inherited codebase cleanup

**AICodePath skill**: `/aicodepath-review` → `/aicodepath-validate-guidelines` → `/aicodepath-gicl-start`

---

### 6. DAG (Directed Acyclic Graph) Loop

**What it is**: Tasks with dependency graph. Level-0 tasks run first (in parallel), then Level-1 (depends on Level-0 outputs), then Level-2, etc.

**When to use**:
- Complex multi-module features with inter-layer dependencies
- DB migration → repository → service → controller sequence
- Sprint with mixed independent + dependent tasks

**AICodePath skill**: `/aicodepath-orchestrate` → `/aicodepath-swarm` (level-by-level dispatch)

---

## Decision Matrix

| Characteristic | → Use |
|----------------|-------|
| 1 task, 1 pass | Sequential REPL |
| Iterative fix until green | REPL Loop |
| N independent tasks, each → PR | Continuous PR Loop |
| N independent tasks, finish fast | Parallel Wave Loop |
| N tasks with dependencies | DAG Loop |
| Code quality is failing, loop until clean | De-Sloppify Loop |

---

## Pattern-to-Skill Mapping

| Pattern | Primary Skill | Supporting Skills |
|---------|--------------|-------------------|
| Sequential REPL | `/aicodepath-tdd` | `/aicodepath-verify` |
| REPL | `/aicodepath-gicl-start` | `/aicodepath-debug` |
| Continuous PR | `/aicodepath-work` | `/aicodepath-checkpoint` |
| Parallel Wave | `/aicodepath-swarm` | `/aicodepath-subagent-dev` |
| De-Sloppify | `/aicodepath-review` | `/aicodepath-validate-guidelines`, `/aicodepath-gicl-start` |
| DAG | `/aicodepath-orchestrate` | `/aicodepath-swarm` |

---

## Race Condition Avoidance (Parallel Wave)

When running parallel agents that write to shared files:

1. **Pre-allocate stubs** in the shared file before dispatch (one atomic write)
2. Each agent replaces its own named stub (no append conflicts)
3. Serialize final cleanup/merge step as a single post-wave task

See Sprint 3 Batch 1 for the stub pre-allocation pattern applied to `guideline-validator-false-positives.test.js`.
