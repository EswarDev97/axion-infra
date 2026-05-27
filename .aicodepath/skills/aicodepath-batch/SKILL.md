---
name: aicodepath-batch
description: >
  Use when processing multiple repositories or services in parallel — spawns one agent per repo using the swarm infrastructure for ecosystem-wide analysis, reverse engineering, or spec generation. Triggered by: "batch process", "analyze all repos", "process multiple services", "platform-wide audit".
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill, TaskCreate, TaskUpdate, TaskGet, TaskList, TodoWrite
argument-hint: "<repo-list|discovery-report> [--operation analyze|reverse-engineer|specify|gap-analysis] [--parallel N]"
---

# AICodePath Batch Processing

Process multiple repositories or services in parallel by spawning one agent per repo.

## Before You Start — Three Questions

1. **Are all repos cloned locally?** Remote repos must be cloned before batch processing. `gh repo clone` for each — agents can't clone during processing.
2. **What operation fits all repos?** `analyze` is safe for any repo. `reverse-engineer` requires 5-15min per repo. `specify` requires RE docs to exist. Choose based on what you need and what's already done.
3. **What's the parallelism budget?** Each agent consumes a context window. `--parallel 3` is safe for most systems. Higher parallelism = faster but more resource-intensive.

## Process

### Step 1: Build Repo List

Accept from one of these sources:

| Source | How |
|--------|-----|
| Discovery report | Read `aicodepath-docs/ecosystem-discovery.md` — extract CONFIRMED/HIGH repos |
| Direct list | User provides paths |
| Monorepo packages | Parse workspace config (pnpm-workspace.yaml, turbo.json) |
| GitHub org | `gh repo list <org> --limit 50 --json name,url` |

### Step 2: Validate

For each repo, verify with `Bash`:
1. Directory exists and contains source code
2. Git repository initialized (`git -C <path> rev-parse HEAD`)
3. Estimate size (`find <path> -type f | wc -l`)

Present validation table to user — get confirmation before proceeding.

### Step 3: Configure Operation

| Operation | Skill Invoked | Per-Repo Output | Prerequisites |
|-----------|--------------|-----------------|---------------|
| `analyze` | `/aicodepath-analyze` | Analysis report | None |
| `reverse-engineer` | `/aicodepath-reverse-engineer` | 11 RE docs | None |
| `specify` | `/aicodepath-specify` | .specify/ | RE docs exist |
| `gap-analysis` | `/aicodepath-gap-analysis` | Gap report | Specs exist |

If prerequisites aren't met, offer to run the prerequisite operation first or skip that repo.

### Step 4: Spawn Parallel Agents

Use the Agent tool to spawn one agent per repo (up to `--parallel N`):

```
For each batch of N repos:
  Spawn N Agents in parallel:
    - prompt: "Run /aicodepath-{operation} on {repo-path}. Write output to {repo-path}/aicodepath-docs/"
    - isolation: "worktree" (if same repo/monorepo)
    - subagent_type: "general-purpose"
  Wait for batch completion
  Collect results
  Proceed to next batch
```

| `--parallel` | Behavior |
|-------------|----------|
| 1 | Sequential (safest) |
| 3 | Default — balanced |
| N | N concurrent agents |

### Step 5: Generate Batch Report

Write `aicodepath-docs/batch-report.md`:
- Results summary table (repo × status × features × gaps × duration)
- Cross-repo insights: shared patterns, common gaps, dependency map, duplication, systemic debt
- Per-repo detail sections with output paths

### Step 6: Cross-Repo Synthesis

After all repos are processed, analyze cross-cutting concerns:
1. Invoke `/aicodepath-knowledge` — save cross-repo patterns to knowledge.md
2. Spawn an `Explore` agent to find: shared dependencies, common patterns, integration surfaces, duplicated logic

### Step 7: Handoff

Offer next steps:
- `/aicodepath-brainstorm` → cross-repo synthesis informs multi-service design
- `/aicodepath-write-plan` → batch gaps become plan units
- `/aicodepath-cruise-control` → auto-implement gaps across repos

## Monorepo Mode

For monorepos, batch within the same repo:
1. Parse workspace config to find all packages
2. Each agent gets a scoped path (e.g., `packages/user-service/`)
3. Use `isolation: "worktree"` for safe parallel reads
4. Merge results into single batch report at monorepo root

## NEVER

- **NEVER spawn more agents than repos** — one agent per repo, no more. Multiple agents on the same repo cause file contention and duplicate work.
- **NEVER continue if all agents fail** — a batch where every repo fails indicates a systemic issue (wrong operation, missing prerequisites, permission denied). Stop and diagnose.
- **NEVER skip the validation step** — an agent spawned on a non-existent directory wastes the full agent cost and returns nothing useful. Validate before spawning.
- **NEVER merge results without deduplication** — cross-repo synthesis may find the same library or pattern in 10 repos. Report it once with a count, not 10 times.
- **NEVER run `specify` without checking for existing RE docs** — specify requires functional-specification.md as input. Without it, the agent generates specs from thin air, which look real but are hallucinated.
- **NEVER use `--parallel N` > available context budget** — each agent consumes tokens. If total estimated tokens > 80% of budget, reduce parallelism or checkpoint between batches.
- **NEVER assume agent success from exit without checking output** — an agent that completes without error may have produced empty or partial results. Verify output artifacts exist in each repo's `aicodepath-docs/`.

## Error Handling

| Error | Action |
|-------|--------|
| Agent fails on one repo | Log error, continue with remaining repos, mark as FAILED in report |
| Git access denied | Skip repo, mark as SKIPPED (permission) |
| Repo too large (>10K files) | Warn user, offer `--scope focused` |
| All agents fail | Stop batch, diagnose common error pattern |
| Agent produces empty output | Re-run single repo in non-batch mode for diagnostics |

## Resource Awareness

Before spawning, estimate and report:
- Total repos × estimated time per operation = total duration
- Parallelism × context cost per agent = peak resource usage
- Recommend `--parallel 1` for resource-constrained environments
