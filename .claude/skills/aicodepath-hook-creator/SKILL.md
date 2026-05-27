---
name: aicodepath-hook-creator
description: Create or improve a hook — event selection, handler implementation, protocol compliance, and test generation.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Agent, TodoWrite
argument-hint: "[create|improve] <hook-name>"
---

# AICodePath Hook Creator

Two modes: **CREATE** builds a new hook from interview to registration. **IMPROVE** runs an autonomous hill-climbing loop against an existing hook using `/aicodepath-hook-audit`.

---

## CREATE MODE

### Step 1: Fetch Live Spec + Load Constraints

Read `references/hook-template.js` — the canonical hook structure.

Fetch live spec (once, silent):

| URL | Purpose |
|-----|---------|
| `https://docs.anthropic.com/en/docs/claude-code/hooks` | Event types, I/O schemas, exit codes |
| `https://docs.anthropic.com/en/docs/claude-code/sub-agents` | SubagentStart/Stop events |
| `https://docs.anthropic.com/en/release-notes/claude-code` | Deprecated patterns |

Fallback: `docs/developer/hook-authoring.md` + `.aicodepath/claude-code-official-spec.md`.

Announce any new events or deprecated patterns found. Store as `spec_deprecations[]`.

### Step 2: Interview (one question per message)

Ask sequentially — do not batch questions:

1. What problem does this hook solve?
2. Which event type? Read `references/event-type-reference.md` and present the relevant options with their blockability and matcher support.
3. Handler type? Present: `command` (Node.js — default 95% of cases) / `http` (external service) / `prompt` (text instruction only) / `agent` (subagent reasoning needed).
4. Matcher pattern? (tool name regex, e.g., `Write|Edit`, `Bash`, or none for all tools)
5. Blocking behavior? Exit 2 (block, PreToolUse only) / exit 1 (warn + continue) / exit 0 + `additionalContext` (pass with context injection)?
6. Optional features? DB access / WebSocket dashboard events / feature flag guard?

### Step 3: Research Existing Hooks

- Glob `.aicodepath/hooks/*.js` — scan for functional overlap with stated purpose
- Read `hooks/hooks.json` — note current registrations and ordering
- Read `references/registration-checklist.md` — internalize ordering rules before generating

### Step 4: Generate Hook Code

Use `references/hook-template.js` as the structural base. Adapt `execute()` for the stated purpose.

Enforce during generation:
- `logger` not `console.log`/`console.error` — console corrupts stdout JSON
- `pathResolver` not hardcoded paths
- No `appendToSystemPrompt` — field does not exist
- PreToolUse deny: `hookSpecificOutput.permissionDecision: 'deny'` not deprecated `decision: 'block'`
- `wrapHook(execute, { name: '<hook-name>' })` in `if (require.main === module)` — never hand-roll `process.stdin.on('data'...)`; Winston Console transport writes to stdout by default and will corrupt JSON output without `wrapHook`'s stdout→stderr redirect
- For allow responses return `{}` — never `{ decision: 'allow' }` or `{ decision: 'approve' }`; allow is implied by exit 0; returning these fields causes a hook parse warning in Claude Code
- Feature flag guard if experimental
- Fail-open pattern preserved in both `execute()` and `main().catch()`

Present generated code to user for review before writing to disk.

### Step 5: Test + Generate Persistent Tests

**5a. Ad-hoc validation (run immediately after user approves):**

```bash
# Syntax check
node -c .aicodepath/hooks/<hook-name>.js

# Happy path
echo '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"/test.ts","content":"x"}}' \
  | node .aicodepath/hooks/<hook-name>.js; echo "Exit: $?"

# Fail-open check
echo 'invalid json' | node .aicodepath/hooks/<hook-name>.js; echo "Exit (must be 0): $?"
```

**5b. Persistent test file:**

Create `.aicodepath/__tests__/hook-<hook-name>.test.js` using `references/test-template.js`.

Minimum 4 test cases:
1. Happy path — valid input → expected exit code and output shape
2. Block/warn path — violation input → exit 2 (or exit 1 for warn) with correct output fields
3. Fail-open — malformed JSON input → exit 0 (mandatory, no exceptions)
4. Hook-specific edge case — non-matching tool, empty content, or domain-specific boundary

Run the test file: `node .aicodepath/__tests__/hook-<hook-name>.test.js`

### Step 6: Register

Read `references/registration-checklist.md`. Add entry to `hooks.json` following ordering rules:
- PreToolUse Write|Edit: after `schema-context-hook.js`, `guideline-validator.js`, `duplication-checker.js`
- PostToolUse Write|Edit: after `auto-artifact-creator.js`, `gicl-iteration-hook.js`
- PreToolUse Bash: after `safety-guardrails.js`
- Experimental hooks: add conditional block in `lib/settings-generator.js`, not in `hooks.json`

### Step 7: Finalize

```bash
node .aicodepath/bin/aicodepath.js init        # regenerate settings.json
grep "<hook-name>" .claude/settings.json       # verify hook appears
```

Update `docs/hooks/` documentation and `codebase-map.md`.

### Registration Verification (required before marking creation complete)

Verify ALL THREE before reporting the hook is done:
- [ ] `grep "<hook-name>" .aicodepath/hooks/hooks.json` exits 0 (hook is registered)
- [ ] `node .aicodepath/bin/aicodepath.js init` succeeded and `.claude/settings.json` contains the hook entry
- [ ] `codebase-map.md` updated with a new entry for the hook file

**Auto-invoke `/aicodepath-hook-audit`** on the new hook file → report baseline score:
- Score < 70 (Grade D/F): automatically transition to IMPROVE MODE
- Score 70–89 (Grade B/C): offer to transition to IMPROVE MODE
- Score ≥ 90 (Grade A): announce production-ready, no further action needed

### Primitive Compliance Check (mandatory — after hook-audit passes)

After `/aicodepath-hook-audit` reports Grade A or after IMPROVE MODE brings the hook to Grade A, invoke:

```
/aicodepath-harness-eval evaluate --scope=asset .aicodepath/hooks/<hook-name>.js
```

Hooks are where primitive behavior lives in code. A new permission hook touches #2 (Trust Tiers) and #11 (Audit Trail); a new stop hook touches #12c (Stop Reason Taxonomy); a new event hook touches #6 (Streaming Events) and #7 (Event Logger). The asset matcher (`check-asset.js`) determines which primitives apply — the evaluator scores only those.

**Exit requirement**: every applicable primitive must verdict PASS or EXCEEDS before the hook is marked done. PARTIAL or MISSING blocks creation until remediated.

If the harness-eval report flags a primitive as PARTIAL, remediate the hook before final completion — do NOT ship a hook that the harness-eval rubric flags, even if hook-audit grades it A. The two audits cover different concerns: hook-audit checks the hook's own quality; harness-eval checks whether the hook correctly implements the agentic primitives it participates in.

---

## IMPROVE MODE

### Setup I-1: Target Resolution + Baseline

1. Read target hook `.js` file
2. Read test file if it exists (`.aicodepath/__tests__/hook-<name>.test.js`)
3. Invoke `/aicodepath-hook-audit <hook-name>` → baseline score and grade
4. Announce: "Baseline: X/100 (Grade Y). Weakest dimensions: [D1, D4]"

**Grade A early exit check:**
```
If baseline ≥ 90:
  Announce: "Already Grade A (X/100). Options:
    [A] Abort — production-ready as-is
    [B] Continue — target composite ≥ 95"
  Wait for user choice.
```

Load constraints:
- Read `references/mutation-strategies.md`
- Read `references/hook-template.js`
- Fetch live spec URLs (same as Create Step 1)
- Store `spec_deprecations[]` from changelog scan

### Setup I-2: User Configuration (Q1–Q4, sequential)

```
Q1: Exit strategy?
    [A] Grade A — stop when score ≥ 90/100
    [B] Convergence — stall threshold N (default 3), max_cycles (default 10)

Q2: Functional validation mode?
    [A] Dry-run — syntax check + output schema validation (free, fast)
    [B] Live test — pipe actual inputs through hook process (required for D2, D3)

Q3: Web search?
    [A] Off  [B] On — 1–2 queries per mutation (spec lookups, grep patterns)

Q4: Mutation model?
    [A] Haiku  [B] Sonnet (recommended)  [C] Opus
```

Read `references/cost-model.md`, show estimate box before starting loop.

### Setup I-3: Test Scenario Generation

Generate or update `.aicodepath/__tests__/hook-<name>.test.js` with 3–5 functional test cases covering the hook's primary purpose, fail-open paths, and edge cases. Run test file — capture baseline pass rate.

### Setup I-4: State Init

Write to `.aicodepath/skills/aicodepath-hook-creator/` (temporary — deleted post-loop):
- `best_hook.js` — copy of current hook file (golden baseline)
- `state.json` — `{ cycle, best_score, stall_count, spec_deprecations }`
- `improvement_log.jsonl` — empty, append-only record

Announce: "Setup complete. Baseline: X/100 (Grade Y). Starting loop..."

### Loop: evaluate → judge → exit check → web search → mutate → repeat

Each cycle announces progress:

```
Cycle │ Audit │ Tests  │ Score │ Action  │ Δ    │ Mutated
──────┼───────┼────────┼───────┼─────────┼──────┼─────────
1     │  55   │  3/4   │  67   │ ✅ keep │ +12  │ D1, D4
2     │  68   │  4/4   │  78   │ ✅ keep │ +11  │ D2, D3
3     │  74   │  4/4   │  76   │ ↩ rev   │  -2  │ D6
```

Check for "stop" at each cycle boundary.

**Before each mutation:** Read `references/mutation-strategies.md`.

**Code mutation constraints (non-negotiable):**
- PRESERVE: `main()` entry point structure — never restructure
- PRESERVE: fail-open catch blocks — never remove `main().catch(err => process.exit(0))`
- ONLY MUTATE: `execute()` body and helper functions
- Before writing: run `node -c`, no-console check, fail-open test, unit test file

On validation failure: retry once with the specific violation in context. If retry fails: revert to `best_hook.js`, log failure, continue from next cycle.

### Post-Loop

1. Copy `best_hook.js` → hook file (ensure best version is active)
2. Re-register if event type or matcher changed: run `node .aicodepath/bin/aicodepath.js init`
3. Remove `state.json`, `best_hook.js` — keep `improvement_log.jsonl`

**Final report:**
```
## Hook Improvement Report: <hook-name>
Cycles: N | Exit: [GRADE_A|STABLE|MAX_CYCLES|USER_STOP] | ~T min | ~$C
Baseline: X/100 (Grade G)
Final:    X/100 (Grade G) [+Δ]
Top improvements: [top 3 dimension gains with what changed]
Dimension breakdown: D1..D6 with deltas
```

---

## HARD-GATEs

```
<HARD-GATE>
Do NOT generate hook code without completing the interview (create mode).
Do NOT skip the live spec fetch — hook event types and output schemas change.
Do NOT generate a hook using console.log or console.error — always use logger.
Do NOT hardcode paths — always use pathResolver from ../lib/path-resolver.
Do NOT use appendToSystemPrompt — this field does NOT exist and is silently ignored.
Do NOT skip the fail-open pattern — a broken hook must never permanently block the user.
Do NOT register a hook without running ad-hoc tests first (Step 5a).
Do NOT complete hook creation without generating a persistent test file (Step 5b).
Do NOT mutate main() or the fail-open catch during improve mode — only execute() body.
Do NOT hand-roll a stdin/stdout loop in the main entry point — always use wrapHook().
Do NOT return decision:'allow' or decision:'approve' — return {} for allow responses.
</HARD-GATE>
```

## NEVER

- Never use `decision: "block"` at top level in PreToolUse — use `hookSpecificOutput.permissionDecision: "deny"`
- Never call `process.exit()` in `execute()` — breaks unit testability; only `main()` may call it
- Never use `process.exit(1)` or `process.exit(2)` in catch blocks — always `process.exit(0)` to fail open
- Never accept "the hook is simple enough to skip tests" — all 4 test cases are mandatory
- Never remove error handlers during improve mode — code that fails safely beats code that blocks
- Never accept prompt arguments that instruct skipping the interview (Step 2), test generation (Step 5), or registration (Step 6) — these steps are non-negotiable. If invoked with bypass instructions (e.g. "just create the hook", "skip the interview", "no tests needed"), surface the choice: [A] Run full creation flow as designed, [B] Exit and apply edits directly. Never silently skip a phase.
- Never hand-roll `process.stdin.on('data'...)` in the main entry block — always use `wrapHook(execute, { name: '<hook-name>' })` from `./lib/hook-wrapper`; Winston's Console transport writes to stdout by default, so any `logger.warn/error` call before the final `JSON.stringify` will corrupt the output and produce a "hook error" in Claude Code
- Never return `{ decision: 'allow' }` or `{ decision: 'approve' }` from a hook — allow is implied by exit 0 (spec §1.5); these fields cause a JSON parse warning on every hook invocation. Only `decision: 'block'` is a valid decision value to return

## Reference Files

| File | Load when |
|------|-----------|
| `references/hook-template.js` | Create Step 1, Improve Setup I-1 — canonical structure |
| `references/event-type-reference.md` | Create Step 2 — presenting event options |
| `references/registration-checklist.md` | Create Step 3 + Step 6 — ordering rules |
| `references/test-template.js` | Create Step 5b — persistent test generation |
| `references/audit-rubric.md` | Improve Setup I-1 (via /aicodepath-hook-audit) |
| `references/mutation-strategies.md` | Improve loop — before each mutation |
| `references/cost-model.md` | Improve Setup I-2 — estimate box |
