---
name: aicodepath-verify
description: Verify work before claiming done — runs verification commands and shows evidence before any commit.
user-invocable: true
allowed-tools: Bash, Read, Glob
argument-hint: ""
---

# AICodePath Verification Before Completion

## Overview

Claiming work is complete without running verification is wishful thinking, not engineering.

**Core principle:** Evidence before claims. Always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command IN THIS MESSAGE, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status, success, or completion:

1. IDENTIFY — What command proves this claim?
2. RUN — Execute the full command (fresh, complete — not cached)
3. READ — Read full output, check exit code, count failures
4. VERIFY — Does output confirm the claim?
   - If NO: State actual status with evidence of what failed
   - If YES: State claim WITH evidence (paste relevant output)
5. ONLY THEN — Make the claim

Skipping any step = asserting without evidence
```

## Four-Question Self-Check (B2.2)

Before writing any completion message, answer ALL FOUR questions with actual output — not assertions:

```
Q1: Are ALL tests passing?
    → Run: [test command]
    → Show: exact output with pass/fail count
    → NOT acceptable: "yes", "they should", previous run result

Q2: Are ALL requirements met?
    → List every requirement from design/PRD/ticket
    → Mark each: [x] met — how? [evidence] | [ ] not met
    → NOT acceptable: "yes", "mostly", describing what you built

Q3: No assumptions without verification?
    → List any API calls, library behaviors, file paths assumed
    → Show: docs URL or tested result for each assumption
    → NOT acceptable: "I'm confident", "standard behavior"

Q4: Is there evidence in THIS message?
    → Paste: test output, build output, or VCS diff
    → NOT acceptable: "I ran it", "it passed earlier"
```

**Red flags that trigger self-check:**
- About to write "Done", "Complete", "Fixed", "Working", "Passed"
- About to commit or push
- About to tell the user the task is finished
- GICL iteration just completed

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| "Tests pass" | Test command output showing 0 failures | Previous run, "should pass", partial check |
| "Build succeeds" | Build command exit 0 + output | Linter clean, logs look OK |
| "Bug fixed" | Test reproducing original symptom: PASSES | Code changed, "I think it's fixed" |
| "Linter clean" | Linter output: 0 errors | Checking one file, partial run |
| "Requirements met" | Line-by-line checklist against spec | Tests passing |
| "Feature complete" | GICL score ≥ 90 OR explicit user waiver | Code written, manual test |

## AICodePath Completion Checklist

Before claiming any task complete:

- [ ] Tests run and passing (`npm test` or equivalent — full suite)
- [ ] GICL score ≥ 90 (or user explicitly waived quality gate)
- [ ] No lint errors (run linter for your stack)
- [ ] All requirements from design doc checked off
- [ ] Evidence shown in this message (paste test output, GICL score)
- [ ] If committing: `git diff --staged` reviewed before `git commit`

## Red Flags — STOP

- Using "should", "probably", "seems to work", "I think"
- Expressing satisfaction before running verification ("Great!", "Done!", "That worked!")
- About to commit/push without running tests
- Trusting subagent success reports without verifying VCS diff
- Relying on partial verification ("the main test passes")
- Tired and wanting to be done
- **ANY wording implying success without having run verification IN THIS MESSAGE**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification. Should ≠ evidence. |
| "I'm confident it works" | Confidence is not evidence. |
| "Just this once" | No exceptions. |
| "Linter passed" | Linter ≠ compiler ≠ tests. |
| "Agent said success" | Verify independently with VCS diff. |
| "Partial check is enough" | Partial proves nothing about whole. |
| "I manually tested it" | Manual testing is not reproducible evidence. |
| "GICL is overkill for this" | Small tasks: skip GICL, but still run tests. |

## GICL Integration

For tasks using the GICL loop:

```
GICL score ≥ 90 → Proceed to verify skill
GICL score < 90 → Continue iterating (don't skip to verify)
```

After GICL completes:
1. Show final GICL score
2. Run full test suite (fresh)
3. Show actual test output
4. THEN claim completion

## Evidence Templates

**Tests:**
```
✅ Ran: npm test
   Output: 47/47 tests passing, 0 failures
   [paste relevant section of output]
```

**Build:**
```
✅ Ran: npm run build
   Exit code: 0
   [paste last few lines of output]
```

**Requirements:**
```
✅ Requirements checklist:
   [x] Feature does X — verified by test `test-name`
   [x] Feature handles Y — verified by test `test-name`
   [ ] Edge case Z — NOT verified (known gap, deferred)
```

## NEVER

- **NEVER** claim "it should work now" before running verification — analysis is not evidence; the bug existed within your mental model, which is exactly why you wrote a fix in the first place; "should" is the state before testing, not after
- **NEVER** use a test run from a previous message as verification — environment state, file system contents, and in-flight changes between messages are not stable; "fresh" means run in this message, not "I ran it recently"
- **NEVER** trust a subagent's success report without an independent VCS diff — subagents can report success while having changed the wrong files, failed silently, or committed to the wrong branch; the diff is the only source of truth
- **NEVER** accept partial verification as completion evidence — "the feature test passes" proves nothing about regressions introduced in other modules your change touches; a test suite detects what it covers, not what changed; only the full suite surfaces cross-module regressions
- **NEVER** mentally answer the Q4 self-check without pasting evidence — the self-check exists precisely because the mind answers "yes" confidently before the evidence supports it; if your answer is not pasted output from this message, it is not an answer

## Structured Verification Pipeline

Run this pipeline in order. Each step must produce PASS or FAIL with evidence. Stop on first FAIL — fix before continuing.

### Step 1: Build

```bash
# JavaScript/TypeScript
npm run build  # or tsc --noEmit for type-checking only

# Python
python -m py_compile src/main.py  # or mypy src/

# Go
go build ./...
```

**PASS**: Exit code 0, no errors.
**FAIL**: Any compilation error → fix before proceeding.

### Step 2: Type Check

```bash
# TypeScript
npx tsc --noEmit --strict

# Python
mypy src/ --strict

# Already covered by Step 1 in Go/Rust
```

**PASS**: Zero type errors.
**FAIL**: Any type error → fix before proceeding.

### Step 3: Lint

```bash
# JavaScript/TypeScript
npx eslint src/ --max-warnings=0

# Python
ruff check src/

# Go
golangci-lint run
```

**PASS**: Zero errors, zero warnings.
**FAIL**: Any lint issue → fix or explicitly document why it's acceptable.

### Step 4: Unit Tests

```bash
# Run FULL test suite — not just changed files
npm test          # JavaScript/TypeScript
pytest tests/     # Python
go test ./...     # Go
```

**PASS**: All tests pass, zero failures.
**FAIL**: Any test failure → fix before proceeding. Do NOT skip failing tests.

### Step 5: Debug Audit

Check for debugging artifacts left in code:

```bash
# Search for common debug artifacts
grep -rn 'console\.log\|debugger\|TODO.*REMOVE\|HACK\|FIXME.*temp' src/ || echo "Clean"
```

**PASS**: No debug artifacts found.
**FAIL**: Remove debug code before proceeding.

### Step 6: Git Status

```bash
git status
git diff --stat
```

**PASS**: Only expected files modified; no untracked generated files; no accidental changes.
**FAIL**: Investigate unexpected changes before committing.

### Pipeline Evidence Template

```
✅ Verification Pipeline:
  1. Build:      PASS — tsc exit 0 (0 errors)
  2. Type Check: PASS — 0 type errors
  3. Lint:       PASS — eslint 0 errors, 0 warnings
  4. Tests:      PASS — 47/47 passing, 0 failures
  5. Debug Audit:PASS — no debug artifacts
  6. Git Status: PASS — 3 files modified (expected)
```

---

## After Verification

Once all verification passes:
1. If this is a standalone task (not part of a sprint with `/aicodepath-acceptance` pending):
   → Run `/aicodepath-learn` to extract durable preferences from this session
2. Run `/aicodepath-checkpoint` to save session state
3. Then commit with descriptive message
4. Then claim task complete

The completion announcement: "All verification passed [paste evidence]. Task complete."
