---
name: aicodepath-write-plan
description: Create a TDD-first implementation plan with bite-sized tasks after design approval.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, TodoWrite
argument-hint: "<design doc path or feature name>"
---

# AICodePath Implementation Plan Writing

Turn an approved design into a precise, executable implementation plan with TDD-integrated tasks.

Every task completes in 2–5 minutes. Every task has a failing test step before any production code step.

<HARD-GATE>
Do NOT start implementation until:
1. The plan has been reviewed task-by-task
2. The user has confirmed the approach
3. Every task has a "write failing test" step before "write implementation" step
</HARD-GATE>

<HARD-GATE>
Do NOT skip `/aicodepath-classify-component` regardless of how the feature is described.
"It's just frontend" and "we already know what to build" are rationalization patterns —
security and test component types apply to every feature, and agent assignments
require the taxonomy output. Skipping silently drops specialist routing.
</HARD-GATE>

## Before Drafting Tasks — Ask Yourself

Before writing a single task title, answer these three questions:

1. **What can go wrong at implementation time that I can prevent at plan time?**
   Multi-file tasks, circular dependencies, and vague DoDs all cause rework. Fix them now, not at task 8.

2. **Which tasks are actually spikes in disguise?**
   If you'd write "should work" in the step, there's an unknown hiding there.
   Read `references/spike-guide.md` when ANY task involves unfamiliar tech or uncertain effort (~40 lines).

3. **Are the agents assigned, or will the swarm-lead guess?**
   Every task with a Construction Phase agent assigned is a task that won't be misrouted.
   Tasks with `Agent: —` will be executed by the swarm-lead directly — fine for docs, wrong for domain-specific work.

---

## Plan Structure

### tasks.md — Machine-Readable Format

When writing the task file, use the **7-column table format** for machine readability. Write to `aicodepath-docs/task/YYYY-MM-DD-<topic>-tasks.md` (the authoritative task location).

```markdown
# Tasks: <Feature Name>

| Task | Agent | Content | DoD | Depends | Batch | Status |
|------|-------|---------|-----|---------|-------|--------|
| Add JWT generation | aicodepath-backend-architect | Implement `generateToken(payload)` in `src/auth/jwt.ts` | `npm test src/auth/jwt` exits 0; token decodes to original payload | — | 1 | TODO |
| Add token validation | aicodepath-backend-architect | Implement `validateToken(token)` with expiry check | All 4 test cases pass; invalid token returns null not throws | Task 1 | 2 | TODO |
```

**DoD validation** — reject vague DoD before finalizing:
- ❌ "looks good" / "tests pass" / "seems right" → NOT ACCEPTABLE
- ✅ `` `npm test src/auth/jwt` exits 0 and all 4 assertions pass ``
- ✅ `` `curl -X POST /auth/refresh` returns 401 with `{"error":"expired"}` ``

### Plan Document Header

```markdown
# Implementation Plan: <Feature Name>

**Goal**: One sentence describing what this plan achieves
**Design doc**: `aicodepath-docs/design/YYYY-MM-DD-<topic>-design.md`
**Estimated tasks**: N
**Tech stack**: <list what you're using>

## Architecture Notes
<Brief reminder of key architectural decisions from design>

## Recommended Agents
> Populated from `/aicodepath-classify-component` — do not edit manually.

### Design Phase
- ⟶ **<agent>** — <role>

### Plan Phase
- ⟶ **<agent>** — <role>

### Construction Phase
- ⟶ **<agent>** — <role>

## Tasks
```

### Task Format

```markdown
### Task N: <Specific action verb + what>

**Why**: One sentence connecting this task to the goal
**Agent**: <agent-name from Construction Phase recommendations, or `—` if no specialist needed>
**Reviewer**: <optional — second agent to review output; use when task spans two domains>

**Steps**:
1. Write failing test: `<exact test name and file path>`
   ```bash
   <command to run to verify test fails>
   ```
2. Verify test fails (expected: <what failure message should say>)
3. Write implementation: `<exact file path>`
   - Exactly what to write (key logic, not "implement X")
4. Verify all tests pass:
   ```bash
   <command to run full test suite>
   ```
5. Commit: `git commit -m "<conventional commit message>"`

**Done when**: `<specific, verifiable success condition>`
```

### Multi-Domain Task Patterns

When a task spans 2+ component types from `/aicodepath-classify-component` output, apply one of these patterns. **NEVER leave `Agent: —` on a domain-specific task** — `—` is for git, docs, and pure config only.

**Pattern A: Primary + Reviewer** (default for 2-domain tasks, 70/30 split)
One agent owns the implementation. A named reviewer covers the secondary domain during Step 3 Spec Review.
```markdown
**Agent**: aicodepath-frontend-architect
**Reviewer**: aicodepath-ml-engineer
```
`subagent-dev` dispatches to the primary agent as implementer, then routes Step 3 to the reviewer agent.

**Pattern B: Decompose** (equal-weight domains, 50/50 split)
Split into subtasks. Each subtask has exactly ONE agent.
```markdown
### Task 14a: Build GroundSearchSection component structure
**Agent**: aicodepath-frontend-architect
**Done when**: Component renders with correct layout; `npm test GroundSearchSection` exits 0

### Task 14b: Validate AI data rendering in GroundSearchSection
**Agent**: aicodepath-ml-engineer
**Depends**: Task 14a
**Done when**: Grounding cost formula verified; source attribution displays correctly
```

**Pattern C: Pipeline** (domain B validates/extends domain A's output)
Sequential handoff where each stage has a single owner.
```markdown
### Task 5a: Restructure process_message handler — Agent: aicodepath-backend-architect
### Task 5b: Validate grounding logic in process_message — Agent: aicodepath-ml-engineer, Depends: 5a
### Task 5c: Security review of process_message — Agent: aicodepath-security-engineer, Depends: 5a
```

**Detection rule (use during Step 6 — agent assignment)**:
- Domains 70/30 → Pattern A
- Domains 50/50 → Pattern B
- Domain B validates/gates on domain A's output → Pattern C

---

## Checklist

Create a TodoWrite task for each item and complete in order:

0. **Step 0 — Design doc acceptance gate** — before any planning begins, verify:
   ```bash
   # Check design doc exists
   ls aicodepath-docs/design/*<topic>*design*.md 2>/dev/null || echo "NOT FOUND"
   # Check Section 8 present
   grep -l "Section 8" aicodepath-docs/design/*<topic>*design*.md 2>/dev/null || echo "MISSING"
   ```
   - → BLOCKED if no design doc found: redirect to `/aicodepath-write-design` first.
   - → BLOCKED if Section 8 (Acceptance Criteria) is absent from the design doc: return to `/aicodepath-write-design` and add Section 8 before proceeding.
   - → Continue only when BOTH checks pass.

   <HARD-GATE>
   Do NOT proceed past Step 0 without a design doc that contains Section 8 Acceptance Criteria.
   A plan written without a design doc produces tasks that lack traceability to root causes and constraints.
   A plan written without Section 8 criteria cannot be auto-verified by `/aicodepath-acceptance`.
   </HARD-GATE>

1. **Read design doc** — understand the approved architecture and constraints
2. **Classify & validate** — invoke `/aicodepath-classify-component` with the feature topic; validate architectural decisions against returned checklist; BLOCK on ERROR/CRITICAL failures; **write the full `## Recommended Agents` output into the plan document header** (copy Design/Plan/Construction agent list exactly as produced)
   - If classify-component is unavailable: manually classify using the taxonomy in `.aicodepath/skills/aicodepath-classify-component/SKILL.md`, load matching guideline files, and produce the checklist manually before continuing
3. **Inventory existing code** — glob/grep for related files to avoid duplication
4. **Draft task list** — identify all work items (write just the task titles first); flag any task with uncertain tech as a spike candidate
   - 4b. **Pattern B Gate** — before expanding any task, scan each drafted title against the classified component types from Step 2:
     - **Signal: task title contains "and" spanning two different component types** → mandatory split
     - **Signal: 2+ equal-weight component types (50/50 split)** → decompose into `Ta`/`Tb` subtasks NOW; each gets exactly ONE agent; add `Tb depends on Ta` unless truly parallel
     - **Signal: 70/30 domain split** → keep as single task; mark Pattern A (primary agent in Agent column, reviewer in expanded block)
     - **Signal: domain B validates/gates on domain A's output** → Pattern C pipeline; split into sequential subtasks
     - **If uncertain about split type**: default to Pattern B (decompose) — merging later is cheaper than discovering a missed domain at code review
     - ❌ Do NOT move to Step 5 until all 50/50 multi-domain tasks are decomposed into single-agent subtasks
   - 4c. **Assign batch numbers** — assign Batch = wave number from `aicodepath-plan-analyst` output (Wave 1 = no deps, Wave 2 = depends on Wave 1, etc.); if any wave has >5 tasks, split into sub-batches using letter suffixes (1a, 1b); add Batch value to each task row before moving to Step 5
     - **Agent sprint constraint**: if any task creates `.aicodepath/agents/*.md` files, ALL wiring tasks for those agents (DOMAIN_MAPPING, taxonomy row, symlink via `acp init`, `docs/agents/<name>.md`, `plugin.json` entry) MUST be in the same batch as the agent file creation. The pre-commit hook (`pre-commit-agent-check.sh`) runs `acp agent audit --check-wiring` on every staged agent file and exits 1 if any score < 18/18. A batch containing only the agent file will always fail to commit.
5. **Order tasks** — dependencies first, foundational before derived; verify no circular dependencies
6. **Expand each task** — add exact file paths, test commands, commit messages; **assign the `Agent` field** using Construction Phase agents from Step 2; use `—` for pure doc/config tasks; read `references/task-patterns.md` for standard step sequences (~80 lines)
7. **Spike check** — for any flagged task: MANDATORY — READ ENTIRE FILE: `references/spike-guide.md` (~40 lines). Do NOT load during Steps 1–6 or 8–14. Insert a spike task before the implementation task.
8. **TDD audit** — verify EVERY production-code task has "write failing test" before "write implementation"
9. **Review with user** — walk through plan task-by-task before committing
10. **Critic gate** — invoke `aicodepath-plan-critic` agent with the draft plan file; if verdict is REQUEST_CHANGES, address all critical issues before proceeding to save; if APPROVE, continue
    - This is a structured agent gate (5 criteria: clarity, feasibility, deps, DoD measurability, value) — it does NOT duplicate the user review in Step 9, which is a conversational alignment check
    - Blocks on: vague DoD, circular dependencies, tasks touching 3+ files, missing dependency links; any task row with `Agent: —` where Content references domain-specific logic (auth, DB schema, ML inference, API design) → flag for specialist assignment
11. **Save plan** — (a) write to `aicodepath-docs/plan/YYYY-MM-DD-<topic>-plan.md`; (b) write per-sprint task file to `aicodepath-docs/task/YYYY-MM-DD-<topic>-tasks.md` with the full 7-column task table using the same rows as the plan (format: `| Task | Agent | Content | DoD | Depends | Batch | Status |` — required by `plan-loader.js`)

11b. **Persist plan artifact + derived_from link (ArtifactWriter + LinkManager)** — after the plan file is written but **before** the commit in Step 12, record the artifact in the `artifacts` table and link it to the design artifact. Downstream skills (`plan-loader.js` per T12, `/aicodepath-acceptance`, `sprint-history.listSprints`) read these rows.

    Read the `cr_number` from session-state (seeded by `/aicodepath-brainstorm` per T8) and the `design_artifact_id` from session-state (stored by `/aicodepath-write-design` per T10). If no CR is present, `ArtifactWriter` falls back to the `CR-LEGACY` sentinel. If `design_artifact_id` is absent (plan written without a preceding design in this session), skip the link creation but still create the artifact row.

    ```js
    const { SessionStateManager } = require('./lib/session-state-manager');
    const ArtifactWriter = require('./lib/artifact-writer');
    const LinkManager = require('./lib/link-manager');

    const session = new SessionStateManager();
    const crNumber = session.getState('cr_number') || null;
    const designArtifactId = session.getState('design_artifact_id') || null;

    // Wrap the call so the PostToolUse auto-artifact-creator hook does NOT re-enter
    // and create a duplicate row. Two guards (belt and braces, per T2):
    //   1. ACP_SUPPRESS_AUTO_ARTIFACT=1 env var — bypasses the hook entirely
    //   2. metadata.source = 'artifact-writer' — hook also short-circuits on this tag
    process.env.ACP_SUPPRESS_AUTO_ARTIFACT = '1';
    let planArtifactId;
    try {
      const writer = new ArtifactWriter();
      planArtifactId = writer.createArtifact(
        'plan',                                   // artifact_type
        '<topic> — Implementation Plan',          // title
        '',                                       // content (file-backed)
        'aicodepath-docs/plan/YYYY-MM-DD-<topic>-plan.md',
        crNumber,                                 // cr_number (may be null → CR-LEGACY)
        'inception',                              // phase = 'inception' (plan is still authored before CONSTRUCTION transition in Step 12)
        'plan',                                   // stage = 'plan'
        null,                                     // unit (plan is sprint-scoped, not unit-scoped)
        { source: 'artifact-writer', status: 'active' }
      );
      writer.close();

      // derived_from edge: plan → design. Only when both ids exist.
      if (designArtifactId && planArtifactId) {
        const linker = new LinkManager();
        linker.createLink(planArtifactId, designArtifactId, 'derived_from', {
          source: 'artifact-writer'
        });
        linker.close();
      }
    } finally {
      delete process.env.ACP_SUPPRESS_AUTO_ARTIFACT;
    }
    ```

    Store the returned `planArtifactId` in session-state under `plan_artifact_id` so `plan-loader.js` (T12) can stamp every inserted unit with the artifact id and bulk-create `implements` links on insert:

    ```js
    session.setState('plan_artifact_id', planArtifactId);
    ```

12. **Commit plan** — `git commit -m "docs: <topic> implementation plan"`, then transition phase:
    ```bash
    node .aicodepath/lib/kb-writer.js init construction --cr=<CR-number>
    node .aicodepath/commands/phase-state.js register requirements-approved true '{"planFile":"aicodepath-docs/plan/YYYY-MM-DD-<topic>-plan.md"}'
    node .aicodepath/commands/phase-state.js transition CONSTRUCTION
    ```
13. **Scope analysis** — invoke `aicodepath-plan-analyst` agent with the saved plan; it will produce a **5-path decision matrix** (see Output Format in the agent). Before presenting results, run these two constraint checks and pass them to the analyst:
    ```bash
    # Check Agent Teams availability
    echo "Agent Teams: ${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-NOT SET}"
    # Check DB unit count for this session
    node .aicodepath/bin/aicodepath.js orchestrate status 2>/dev/null | head -5
    ```
    After the analyst returns its matrix, **present the full matrix to the user** and wait for one confirmation message: "Proceed with [recommended path]? or override with another path?" — then proceed to Step 13a.
    - This does NOT duplicate Step 5 (task ordering) — Step 5 orders tasks during drafting; analyst maps the dependency graph post-save to produce wave groupings and a quantitative mode recommendation

13a. **[CONDITIONAL — orchestrate path only]** Load units into DB:
    ```bash
    node .aicodepath/bin/aicodepath.js orchestrate load --clear
    node .aicodepath/bin/aicodepath.js orchestrate plan
    ```
    If `orchestrate plan` shows 0 units: warn user and fall back to `/aicodepath-subagent-dev`.
    If units loaded successfully: show the topological plan to the user before proceeding to Step 14.
13.5. **Context Gate** — After plan committed (Step 12), check context window usage:
    - **50–60% (Yellow)**: Append `## Context Gate Note` to plan file with: context %, batch/task to start, exact invocation command. Emit systemMessage recommending `/clear`. Proceed to Step 14.
    - **>60% (Red)**: Invoke `/aicodepath-pause` passing full AIDLC state (phase=CONSTRUCTION, last_skill=aicodepath-write-plan, next_skill=<mode-selected skill>, batch=1, task=1, task_title=<first task title>, plan_file=<path>). Emit: "Context >60%. Pausing — type `/clear` then `/aicodepath-resume` to continue." **STOP. Do not execute Step 14.**
14. **Handoff (TERMINAL STATE)** — execute the path confirmed in Step 13 immediately. For solo/subagent-dev/swarm: execute Batch=1 tasks only. For orchestrate: the batch concept maps to Wave 1 units (those with no dependencies). Note remaining work in the first message.
    - `solo` → invoke `/aicodepath-tdd` for Task 1 NOW
    - `subagent-dev` → invoke `/aicodepath-subagent-dev` NOW
    - `orchestrate` → invoke `/aicodepath-orchestrate start` NOW (units already loaded in Step 13a)
    - `swarm` → invoke `/aicodepath-swarm` NOW

<HARD-GATE>
Do NOT end this skill after saving the plan.
Step 14 (handoff) is MANDATORY — the plan is not complete until execution begins.
"The plan is ready" is NOT a valid terminal state. The terminal state is the first task running.
</HARD-GATE>

## Mandatory Plan Output Sections

Every plan document MUST include these two sections after the tasks table. They are the durable contract that survives session breaks.

### Branch Lifecycle (placeholder — filled by `/aicodepath-worktree`)

```markdown
## Branch Lifecycle
> This section will be populated by /aicodepath-worktree when the
> implementation branch is created. Do not begin implementation
> until this section exists with actual branch details.

- [ ] Worktree created: TBD
- [ ] Commit: Batch 1 — T1-TN
- [ ] ... (one entry per batch from tasks table)
- [ ] Merge feature branch -> main
- [ ] Remove worktree
- [ ] Clear active-worktree.json
```

Generate one commit entry per distinct Batch value in the tasks table. The HARD GATE items (merge, remove, clear) are always present.

### Sprint Acceptance (HARD GATE)

```markdown
## Sprint Acceptance

> HARD GATE — Every item verified with evidence (git hash, test output,
> or explicit confirmation). Applies to ALL sessions. No exceptions.

- [ ] All batch commits confirmed (hashes listed in Branch Lifecycle above)
- [ ] Feature branch merged to main (merge commit hash: ___)
- [ ] git worktree remove confirmed
- [ ] active-worktree.json cleared
- [ ] All tests passing on main (test output attached)
- [ ] Acceptance criteria from design doc verified (one-by-one)
```

For single-file hotfixes where worktree is skipped, worktree-specific items are marked N/A by `/aicodepath-acceptance`.

### Worktree Recommendation

Count distinct files referenced across ALL tasks in the task table combined (not per-task).

If the plan touches **3 or more files** in total:

> This plan modifies [N] files across [M] tasks. Consider running `/aicodepath-worktree`
> before starting implementation to isolate your changes in a clean branch.
> Skip if a worktree already exists for this feature.

If fewer than 3 files total: no worktree recommendation needed.

---

## Task Writing Rules

### Make Tasks Atomic
- One file changed per task when possible
- If a task touches 3+ files, split it
- 2–5 minutes to complete means it's the right size
- "and" in a task name → split the task

### Surgical Changes — File Scope Is the Boundary
Each task's file list is the **only** set of files that may be modified during that task. Any change to a file not listed in the task is out of scope — no drive-by refactoring, no opportunistic cleanup, no style fixes in adjacent code. If you notice something worth fixing outside the task's file list, create a separate task for it. Every changed line must trace directly to the task's stated goal.

### TDD Integration
Every task that writes production code MUST have:
```
Step 1: Write failing test at <path>
Step 2: Verify test fails (see it fail)
Step 3: Write implementation at <path>
Step 4: Verify all tests pass
Step 5: Commit
```

### Sprint-Close Steps (MANDATORY — must be in Steps list, not only in acceptance checklist)

For the **final task of every batch**, add before commit:
```
Step 5: Run /aicodepath-verify — batch quality gate must pass
Step 6: Commit: `git commit -m "..."`
```

For the **final task of the final batch** (sprint close), add:
```
Step 5: Run /aicodepath-verify — all tests pass, no regressions
Step 6: Run /aicodepath-acceptance — all sprint criteria verified one-by-one
Step 7: Commit/merge: `git commit -m "..."` (or PR merge)
```

These steps MUST appear explicitly in the task's `**Steps**` list. Placing them only in the Sprint Acceptance checklist is insufficient — the session may auto-transition before the checklist is reached.

> For standard task patterns (new function, bug fix, refactor, API endpoint, DB migration),
> read `references/task-patterns.md` during Step 6 (~80 lines).
> Do NOT load it during Steps 1–5 or 7–14.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Tasks too large ("implement auth") | Split: "add JWT generation", "add token validation", "add refresh endpoint" |
| No test step | Every production code task MUST have failing test first |
| Vague file paths ("somewhere in src") | Use exact paths: `src/auth/jwt.service.ts` |
| Vague DoD ("tests pass") | Name the exact command: `` `npm test src/auth/jwt` exits 0 `` |
| Missing commit step | Every task ends with a commit |
| Skipping phase transition after plan commit | Run `kb-writer.js init construction`, `phase-state.js register`, `phase-state.js transition CONSTRUCTION` |
| Sprint-close skills only in acceptance checklist | Add `/aicodepath-verify` as an explicit Step in the final task of every batch; add `/aicodepath-acceptance` as an explicit Step in the final task of the final batch |
| All Agent fields left as `—` | Assign Construction Phase agents; `—` is for docs/config tasks only |

---

## NEVER

- **NEVER** skip `/aicodepath-classify-component` because the feature "seems like frontend only" or "we already know what to build" — these are the exact rationalization patterns that cause security gaps and wrong agent assignments. Every feature has security and test implications; the taxonomy run takes 30 seconds and catches what confidence doesn't.

- **NEVER** write a "write failing test" step for a test you already know will pass — a test that passes on first run was never actually failing. Red-Green-Refactor requires seeing red first. If the test passes immediately, you haven't verified that your implementation is what made it pass.

- **NEVER** write a DoD as "tests pass" without naming the exact command and expected assertion — "tests pass" is an undefined set: reviewers can't verify it, swarm-lead can't automate it, and CI can't gate on it. Every DoD must be a Yes/No question answerable by a specific command.

- **NEVER** leave a task that touches 3+ files without splitting it — multi-file tasks create entangled changes that are hard to rollback, hard to review, and produce unclear test coverage boundaries. The "and" signal in a task name is a split indicator, not a scope description.

- **NEVER** finalize the plan without the user walking through it task by task — silent plan approval produces misalignment that surfaces at task 8, not task 1. Walking through forces both parties to find ordering conflicts and missing steps before implementation begins.

- **NEVER** skip the phase transition commands after the plan commit — the state machine stays at INCEPTION without `phase-state.js transition CONSTRUCTION`. GICL sessions won't initialize correctly and `/aicodepath-status` will show wrong phase, causing confusion when hooks fire the wrong validation rules.

- **NEVER** omit the `## Recommended Agents` section from the saved plan document — this section is the bridge between classify-component's output and the swarm-lead's delegation decisions. Without it, agent assignments are inferred at runtime and the wrong specialist is chosen.

- **NEVER** leave every task's `Agent` field as `—` — if all tasks are unassigned the plan produces no delegation and the swarm-lead executes everything itself, defeating the purpose of specialist agents.

- **NEVER** assign `Agent: —` to a domain-specific task just because it spans two component types — use Multi-Domain Task Pattern A (Primary + Reviewer), B (Decompose), or C (Pipeline) instead. `—` is only valid for pure git/docs/config tasks with no domain logic.

- **NEVER** leave `/aicodepath-verify` and `/aicodepath-acceptance` only in the Sprint Acceptance checklist — they must appear as explicit Steps in the final task of each batch (verify) and final task of the final batch (acceptance). Checklist-only placement causes both skills to be skipped when the session auto-transitions before the checklist is reached.

- **NEVER** save the plan and announce "plan complete" without executing Step 14 — saving the plan document is Step 11 of 14+, not the end. The terminal state is execution starting, not the document existing.
- **NEVER** select the orchestrate path without running Step 13a first — `/aicodepath-orchestrate start` with 0 units in the DB will start and immediately report "all units complete" without doing any work. Unit loading is the mandatory gate for this path.
- **NEVER** fall back from orchestrate to subagent-dev silently — if `orchestrate plan` shows 0 units, warn the user explicitly before switching paths. A silent fallback masks a real problem (DB not initialized, tasks.md parse failure).

- **NEVER** split agent file creation and wiring into separate batches in agent sprints — the pre-commit hook runs `acp agent audit --check-wiring` on every staged `.aicodepath/agents/*.md` and exits 1 on any wiring score < 18/18. A batch with only the agent `.md` file (no DOMAIN_MAPPING, no taxonomy row, no `docs/agents/<name>.md`, no `plugin.json` entry) will block at commit and force both batches to be completed before the first commit can land.

- **NEVER** assign Batch=1 to a task that has a `Depends` value pointing to another task — Batch 1 is the parallelism-safe foundation wave where all tasks run concurrently; a dependency inside Batch 1 creates a blocking condition that the subagent-dev worker will hit at runtime. If plan-analyst output shows a task with dependencies in Wave 1, that is a wave-assignment error — fix the batch number before committing the plan.

- **NEVER** move from Step 4 to Step 5 while any drafted task title spans 2+ equal-weight component types without decomposing it — the Pattern B Gate at Step 4b exists precisely to catch these before expansion; a task with "and" across two domains written into the table without splitting will receive a single Agent value and the second domain gets no specialist coverage at all.

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/task-patterns.md` | Step 6 — expanding task steps for standard patterns (~80 lines) |
| `references/spike-guide.md` | Step 7 — any task with uncertain tech or effort (~40 lines) |
