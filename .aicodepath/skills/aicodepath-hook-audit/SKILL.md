---
name: aicodepath-hook-audit
description: Evaluate hook quality — scores protocol compliance, error handling, and integration across 6 dimensions.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebFetch
argument-hint: "[hook-name or path or 'all']"
---

# AICodePath Hook Audit

Scores a hook (or all hooks) across 6 dimensions: protocol compliance, error resilience, library compliance, output field validity, registration, and code quality. Outputs a letter-graded report.

## Step 1: Resolve Target

**Single hook** — resolve path:
- Bare name (`my-hook`) → `.aicodepath/hooks/my-hook.js`
- Relative path → resolve from project root
- Absolute path → use as-is

**Batch ("all")** — Glob `.aicodepath/hooks/*.js`, excluding anything inside `hooks/lib/`.

## Step 2: Fetch Live Spec (silent)

Fetch these pages and hold content in memory as `spec_context`:

| URL | Purpose |
|-----|---------|
| `https://docs.anthropic.com/en/docs/claude-code/hooks` | Event types, I/O schemas, exit codes, valid output fields |
| `https://docs.anthropic.com/en/release-notes/claude-code` | Deprecated patterns and breaking changes |

Fallback if fetch fails: `.aicodepath/claude-code-official-spec.md` + `docs/developer/hook-authoring.md`. Log warning and continue — never block on fetch failure.

**Purpose:** D4 (Output Field Validity) cannot be scored accurately without knowing the current valid field names. Always attempt the live fetch.

## Step 3: Load Rubric

Read `aicodepath-hook-creator/references/audit-rubric.md` before scoring any dimension. The rubric defines exact point ranges, red flags, green flags, and evaluation questions for all six dimensions.

This step is mandatory. Never score without the rubric loaded.

## Step 4: Score Each Dimension

Use all three validation methods below. Each covers different dimensions — do not substitute one for another.

### Functional validation (D1, D2, D4)

```bash
# Syntax check
node -c .aicodepath/hooks/<hook>.js

# Happy path — verify exit 0 and JSON output
echo '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"/test.ts","content":"x"}}' \
  | node .aicodepath/hooks/<hook>.js
echo "Exit: $?"

# Fail-open check — malformed input must exit 0
echo 'invalid json' | node .aicodepath/hooks/<hook>.js
echo "Exit (must be 0): $?"
```

### Static analysis (D3, D4, D6)

```bash
# Library violations
grep -n "console\.\(log\|error\|warn\)" .aicodepath/hooks/<hook>.js
grep -n "aicodepath-docs/\|process\.cwd()" .aicodepath/hooks/<hook>.js

# Deprecated output fields
grep -n "appendToSystemPrompt" .aicodepath/hooks/<hook>.js
grep -n "decision.*block\|decision.*approve\|decision.*allow" .aicodepath/hooks/<hook>.js
# decision:'approve' and decision:'allow' are not valid hook output fields — allow is implied by
# exit 0 (spec §1.5); returning them causes a hook parse warning on every invocation

# Wrong nesting
grep -n "additionalContext" .aicodepath/hooks/<hook>.js
# Flag if not immediately preceded by hookSpecificOutput on same or previous line

# Hand-rolled stdin/stdout (D3 violation — must use wrapHook instead)
grep -n "process\.stdin\.on" .aicodepath/hooks/<hook>.js
# Flag any match: Winston Console transport writes to stdout by default; without wrapHook's
# stdout→stderr redirect, logger calls before the final JSON.stringify corrupt the output

# Code quality
grep -n "console\." .aicodepath/hooks/<hook>.js
grep -n "new WebSocket\|new ws\.Server" .aicodepath/hooks/<hook>.js
```

### Registration check (D5)

```bash
grep "<hook-name>" .aicodepath/hooks/hooks.json
grep "<hook-name>" .claude/settings.json
```

Also verify ordering: for `PreToolUse Write|Edit`, hook must appear after `schema-context-hook.js`, `guideline-validator.js`, and `duplication-checker.js`. For `PostToolUse Write|Edit`, hook must appear after `auto-artifact-creator.js` and `gicl-iteration-hook.js`.

## Step 5: Calculate Grade and Generate Report

### Single hook report

```
## Hook Audit Report: <hook-name>

Spec fetch: [live | fallback]

| Dimension                    | Score | Max | Notes |
|------------------------------|-------|-----|-------|
| D1 Protocol Compliance       |       |  20 |       |
| D2 Error Resilience          |       |  20 |       |
| D3 Library Compliance        |       |  15 |       |
| D4 Output Field Validity     |       |  15 |       |
| D5 Registration & Integration|       |  15 |       |
| D6 Code Quality              |       |  15 |       |
| **Total**                    |       | 100 | **[A/B/C/D/F]** |

Grade scale: A=90+, B=80–89, C=70–79, D=60–69, F<60

### Critical Issues (exit 0 violations, deprecated fields, missing registration)

### Top 3 Improvements
1.
2.
3.
```

### Batch report (all hooks)

```
## Hook Audit Summary (N hooks)

| Hook | D1 | D2 | D3 | D4 | D5 | D6 | Total | Grade |
|------|----|----|----|----|----|-----|-------|-------|

### Grade Distribution
A: N  B: N  C: N  D: N  F: N

### Systemic Issues (appear in 3+ hooks)
```

## HARD-GATEs

```
<HARD-GATE>
Do NOT score any dimension without reading audit-rubric.md first (Step 3).
Do NOT skip the live spec fetch — D4 output field validity depends on current field names.
Do NOT skip functional validation for D1 and D2 — static analysis alone misses runtime failures.
Do NOT score D5 without checking both hooks.json AND .claude/settings.json.
Do NOT produce an empty report — always output scores even if all zeros.
</HARD-GATE>
```

## NEVER

- Never infer D2 (error resilience) from source reading alone — pipe malformed input and verify exit 0
- Never skip the ordering check in D5 — a hook registered in the wrong position scores D5 max 7
- Never conflate "hook file exists" with "hook is registered" — both must be true for full D5 score
- Never use `appendToSystemPrompt` as a valid field in D4 assessment — it does not exist in the spec
- Never accept `decision: 'allow'` or `decision: 'approve'` as valid in D4 — these are not valid hook output fields; deduct D4 points for any hook that returns them
- Never award full D3 score to a hook with a hand-rolled `process.stdin.on('data'...)` loop — it must use `wrapHook()` from `./lib/hook-wrapper` to prevent logger stdout pollution

---

## Wiring Check (non-scored)

After completing the scored audit, verify hook registration completeness. These checks are not included in the score — they are binary pass/fail gates.

| Check | Command | Expected |
|-------|---------|----------|
| hooks.json registration | `grep "<hook-name>" .aicodepath/hooks/hooks.json` | exit 0 (found) |
| settings.json regenerated | `grep "<hook-name>" .claude/settings.json` | exit 0 (found) |
| codebase-map.md updated | `grep "<hook-name>" .aicodepath/codebase-map.md` | exit 0 (found) |

Report: "Wiring: PASS" (all three present) or "Wiring: FAIL — missing: [list]".

---

## Primitive Compliance Check (mandatory — single-hook mode)

After the scored audit and wiring check complete, invoke the harness evaluator against the hook file:

```
/aicodepath-harness-eval evaluate --scope=asset .aicodepath/hooks/<hook-name>.js
```

Rationale: the 6-dimension score above checks whether the hook is *well-made* (protocol compliance, error resilience, code quality). The harness evaluator checks whether the hook *correctly implements the agentic primitives it participates in*. A hook can score Grade A on the quality rubric while still failing primitive #11 (e.g., if a new permission hook doesn't write to the `permission_audit` trail). The two checks are orthogonal — run both.

**Output format**: append a "Primitive Compliance" section to the audit report with one row per applicable primitive (only those the asset matcher identified), showing verdict + evidence summary. If any primitive verdicts PARTIAL or MISSING, include it in the "Critical Issues" section.

**Batch mode exception**: skip this step when auditing `all` hooks — invoking harness-eval per hook for a batch of 40 is excessive. Instead, recommend a single `/aicodepath-harness-eval evaluate --scope=full` run at the end of the batch report.
