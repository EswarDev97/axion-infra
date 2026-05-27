# Skills — Core Workflow Chain

The 8-step skill chain is the primary AIDLC workflow. Skills must be invoked in order. Never skip a step — each gate prevents wasted work.

```
knowledge → brainstorm → write-plan → confidence-check → tdd → gicl-start → verify → checkpoint
```

---

## Step 1: /aicodepath-knowledge

**When:** At the start of every session, before any other action.

**What it does:**
- Reads `aicodepath-docs/adr-log.md` — ADRs, design decisions, open questions
- Reads the active task file in `aicodepath-docs/task/` — current sprint, task status, blockers
- Reads `aicodepath-docs/knowledge.md` — lessons learned, patterns to follow/avoid
- Restores context without re-reading the entire codebase

**Output:** Summary of where you left off and what to work on next.

**Updates triggers:**
- INCEPTION complete → update `planning.md`
- CONSTRUCTION starts/ends → update `tasks.md`
- GICL learn phase → update `knowledge.md`

---

## Step 2: /aicodepath-brainstorm

**When:** Before any new feature, component, API, or significant code change.

**HARD-GATE:** No code may be written until brainstorm design is approved.

**What it does:**
1. Invokes `/aicodepath-classify-component` to load matching design guidelines
2. Explores multiple design approaches (at least 3)
3. Evaluates tradeoffs (complexity, maintainability, performance, security)
4. Documents the chosen approach with rationale
5. Writes design summary to `aicodepath-docs/adr-log.md`
6. Presents design for user approval

**Design is approved when:** User explicitly confirms OR design meets all classify-component checklist items.

---

## Step 3: /aicodepath-write-plan

**When:** After brainstorm design is approved.

**What it does:**
1. Decomposes the approved design into TDD-first implementation tasks
2. Each task is bite-sized (1-2 hours max)
3. Tasks ordered by dependency (what must exist before what)
4. Each task specifies: the failing test to write first, the code to make it pass
5. Writes plan to the active task file in `aicodepath-docs/task/`
6. Creates units in the DB for orchestration

**Plan format:**
```
Unit: <feature-name>
  Task 1: Write failing test for [specific behavior]
  Task 2: Implement [specific code] to make test pass
  Task 3: Refactor [specific thing] to improve quality
```

---

## Step 4: /aicodepath-confidence-check

**When:** Before implementing any non-trivial solution.

**What it does:**
Self-assesses confidence across 5 dimensions:

| Dimension | Weight | What it checks |
|-----------|--------|----------------|
| Requirements clarity | 25% | Are requirements unambiguous and complete? |
| Technical approach | 25% | Is the implementation approach proven and understood? |
| Dependency knowledge | 20% | Are all libraries/APIs understood and documented? |
| Test coverage plan | 20% | Is there a clear plan for what to test? |
| Risk identification | 10% | Are the top 3 failure modes identified? |

**Gate:** Confidence ≥ 70% required to proceed. Below 70% → identify gaps, research, re-assess.

**Uses:** `lib/confidence-checker.js` for scoring. Records low-confidence patterns to `lib/reflexion-learner.js` for cross-session learning.

---

## Step 5: /aicodepath-tdd

**When:** Writing any feature or bug fix.

**Iron Law:** No production code exists before a failing test.

**Red-Green-Refactor cycle:**

1. **Red:** Write the smallest failing test for the next behavior
2. **Green:** Write the minimum code to make it pass (no extras)
3. **Refactor:** Improve structure without changing behavior (tests still pass)

**Repeat until the plan is complete.**

**Anti-patterns blocked:**
- Writing code then tests after ("test-after")
- Writing multiple tests before any code ("over-planning")
- Skipping the refactor step ("cowboy green")

---

## Step 6: /aicodepath-gicl-start

**When:** Starting a quality-driven implementation session.

**What it does:**
1. Creates a GICL session in the DB (via `lib/gicl-session-manager.js`)
2. Detects file complexity (trivial/simple/moderate/complex/very_complex by LOC)
3. Starts the quality loop — each iteration runs the GICL hook
4. Loop continues until score ≥ 90 or stopping conditions met

**Score components:**
| Component | Weight |
|-----------|--------|
| Tests | 35% |
| Guidelines | 20% |
| Architecture | 15% |
| Duplication | 20% |
| Authenticity | 10% |

**Stop conditions:** score ≥ 90, max iterations reached, regression > 10 pts, stalled 3 iterations.

**At the end:** Writes lessons to `aicodepath-docs/knowledge.md`.

---

## Step 7: /aicodepath-verify

**When:** Before claiming work is done, fixed, passing, or complete.

**HARD-GATE:** Never claim "done" without running verification and showing evidence.

**Four-Question Self-Check:**
1. Have I run the tests and do they pass? (show output)
2. Have I run the linter and are there no errors? (show output)
3. Does the feature work end-to-end? (show demonstration)
4. Are there any regressions? (show before/after comparison)

**Evidence required:** Actual command output, not assertions. "Should work" does not qualify.

---

## Step 8: /aicodepath-checkpoint

**When:** After completing each significant unit of work, before risky operations.

**What it does:**
1. Saves current state: phase, stage, active unit, quality gates, notes
2. Creates `aicodepath-docs/checkpoints/<timestamp>.json`
3. Updates `aicodepath-docs/checkpoints/latest.json` symlink
4. Updates the active task file in `aicodepath-docs/task/` with completed status

**Checkpoint contains:**
```json
{
  "phase": "CONSTRUCTION",
  "stage": "implementation",
  "unit": "user-auth",
  "quality_gates": { "tests_passing": true, "gicl_score": 92 },
  "notes": "Auth complete, starting profile feature next",
  "timestamp": "2026-03-07T10:30:00Z"
}
```

**Used by:** `session-start-hook.js` to detect recent sessions and show resume summaries.
