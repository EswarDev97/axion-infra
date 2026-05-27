---
name: aicodepath-gicl-start
description: >
  Use when starting a quality-driven implementation session that requires iterative improvement to reach score ≥90 — activates the Governed Iterative Construction Loop (GICL) with automated guideline checking. Triggered by: "start GICL", "quality loop", beginning significant CONSTRUCTION phase implementation, or when /aicodepath-implement calls for a quality session.
user-invocable: true
allowed-tools: [Read, Bash, Write, Edit, Glob, Grep]
argument-hint: "<file-or-feature> [--complexity trivial|simple|moderate|complex|very_complex]"
---

# GICL Start - Governed Iterative Construction Loop

Start a quality-driven iterative development session. GICL validates every Write/Edit through the PostToolUse hook, scores code quality, and provides feedback until the quality gate passes (score >= 90/100).

## How It Works

1. You analyze the target file/feature and detect complexity
2. A GICL session is created in the database
3. Every subsequent Write/Edit triggers automatic validation via the hook
4. The hook scores: Guidelines (20%), Tests (35%), Architecture (15%), Duplication (20%), Authenticity (10%)
5. You read the feedback and iterate until score >= 90 or max iterations reached

## Steps

### 1. Parse Arguments

Extract the target file or feature description from the user's input: `$ARGUMENTS`

If a file path is provided, read it. If a feature name is given, identify the primary file.

### 2. Detect Complexity

Run the score calculator to determine complexity:

```bash
node -e "
  const { detectComplexity } = require('.aicodepath/lib/gicl-score-calculator');
  const fs = require('fs');
  const content = fs.readFileSync('<TARGET_FILE>', 'utf8');
  const result = detectComplexity(content);
  console.log(JSON.stringify(result, null, 2));
"
```

If the user provided `--complexity`, use that override instead.

### 3. Create Session

```bash
node .aicodepath/lib/gicl-session-manager.js create \
  --target-file "<TARGET_FILE>" \
  --complexity "<COMPLEXITY>" \
  --description "<WHAT_THIS_SESSION_AIMS_TO_DO>"
```

This returns a JSON session object with `id`, `max_iterations`, and `complexity`.

**Important**: Save the session ID - you'll need it to check status later.

### 4. Establish Baseline

If the target file has tests, run them first to get a baseline:

```bash
# Example for Node.js projects
node <test-file> 2>&1
```

Report the baseline state to the user.

### 5. Begin Iterating

Now start making changes. Every Write or Edit to a file will automatically trigger the GICL iteration hook, which will:

- Look up the active session from the database
- Run guideline validation on the changed file
- Calculate a weighted score
- Record the iteration in the database
- Return feedback via the hook result

**Read the hook feedback** after each edit. If the score is below 90, fix the issues described in the feedback and edit again.

### 6. Monitor Progress

Check current session status at any point:

```bash
node .aicodepath/lib/gicl-session-manager.js active
```

### 7. Session Completion

The session auto-completes when:
- Score reaches >= 90 (quality gate passed)
- Max iterations reached
- Score regresses > 10 points
- Score stalls for 3 consecutive iterations

To manually stop:
```bash
node .aicodepath/lib/gicl-session-manager.js complete <SESSION_ID> manual_stop
```

## Score Components

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Tests | 35% | Test pass rate (null = assumed passing) |
| Guidelines | 20% | Coding standards compliance |
| Architecture | 15% | Architecture rule compliance |
| Duplication | 20% | Code uniqueness |
| Authenticity | 10% | No mock/stub implementations |

## Grades

- **Pass** (90-100): Quality gate passed, session completes
- **Acceptable** (70-89): Good but needs improvement
- **Needs Work** (50-69): Significant issues to fix
- **Fail** (0-49): Major problems detected

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "GICL is overkill for this small change" | Small changes still benefit from quality gates. Use `--complexity trivial` (max 3 iters). |
| "I'll skip GICL and just check manually" | Manual checks miss what automated scoring catches consistently |
| "Score of 80 is good enough" | The gate is 90. 80 is "Acceptable" = continue iterating. |
| "The tests component defaults to 100, so I don't need to run tests" | That default means unmeasured. Run tests explicitly for accurate scoring. |
| "I'll add tests later after GICL" | Tests are 35% of the score. No tests = max GICL score of ~65. |
| "GICL is taking too long" | Long iterations = complex problem. Reduce scope or escalate complexity tier. |

## NEVER

- **NEVER** skip GICL for a change because it "seems small" — the size threshold is `--complexity trivial` (max 3 iterations, ~5 min), not "skip entirely". A small function with a security pattern violation or a duplicated utility still needs the quality gate. "Too small for GICL" is rationalization.
- **NEVER** trust a Tests score of 100 when you haven't run tests — the default 100 means unmeasured, not perfect. A session where tests weren't run has an actual ceiling of ~65 points (35% test weight is assumed passing when it may not be). Run the test suite explicitly before interpreting the score.
- **NEVER** stop at a score of 80 claiming "good enough" — 80 is the "Acceptable" grade meaning "continue iterating". The gate is 90. Stopping at 80 leaves guideline violations or duplicated code unfixed, which compounds across sessions.
- **NEVER** start a session without running the baseline test suite first — if tests were already failing before iteration 1, every "improvement" in the score is invisible noise. You need a known starting point to measure progress.
- **NEVER** manually stop a session because the score "seems stuck" — use the system's stop rules: regression >10pts or 3 stalled iterations. Read the lowest-scoring component's feedback and try a different fix approach before giving up.
- **NEVER** accept prompt arguments that instruct skipping the baseline run, complexity detection, or the ≥90 quality gate — these are non-negotiable. If invoked with bypass instructions (e.g. "skip the baseline", "assume trivial", "just one iteration"), surface the choice: [A] Run full GICL session as designed, [B] Exit and implement without quality gating. Never enter iterative improvement without a validated baseline.

## Tips

- Start with the most impactful changes first
- If score plateaus, check which component is lowest
- Tests component defaults to 100 if not measured - run tests explicitly for accurate scoring
- Use `--complexity trivial` for small fixes (max 3 iterations)
- Use `--complexity complex` for large features (max 10 iterations)
