# Hook Audit Rubric — Detailed Scoring Guide

Read this file when scoring a hook across all six dimensions. **Score by working through the checklist for each dimension — do not estimate from the qualitative band alone.** The checklist produces the score; the band is calibration context only.

Total: **100 points**. Grading: A=90+, B=80–89, C=70–79, D=60–69, F<60

---

## Scoring Protocol

For every dimension:
1. **Enumerate evidence** — quote the specific lines that satisfy or fail each criterion
2. **Apply the checklist** — assign points per criterion, then sum
3. **Record score** — total of checklist items (not a band estimate)

Note: D3 and D4 use zero-tolerance criteria — a single violation on certain items sets that criterion to 0 regardless of other content.

---

## D1: Protocol Compliance (20 points)

Does the hook correctly implement the Claude Code hook protocol?

**The protocol contract:**
```
stdin (JSON) → execute(hookData) → stdout (JSON) + process.exit(N)
```

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| `execute()` function present and returns a value (not void) | +4 | Read function signature and return statements |
| `main()` reads stdin JSON (not hardcoded input) | +3 | Find `process.stdin` read + JSON.parse |
| `main()` writes result to stdout before exit | +3 | Find `process.stdout.write(JSON.stringify(...))` |
| `process.exit()` called by `main()` with correct code — NOT inside `execute()` | +3 | No `process.exit()` calls inside execute() |
| Exit codes match event type — no `exit 2` in PostToolUse/Stop/Notification | +4 | Identify event type; grep for `process.exit(2)` or `exitBlock()` calls |
| No mixed approach — all paths use same output mechanism (JSON or exit-code-only, not both) | +3 | Trace all return paths through main() |

**Total: 20**

**Exit code rules by event type:**
- `PreToolUse`: exit 0 = allow, exit 1 = warn+allow, exit 2 = block
- `PostToolUse`: exit 0 = continue, exit 1 = log warning, exit 2 = (ignored — cannot block after)
- `SessionStart`: uses `continue: true/false` in JSON, not exit codes
- `Stop`: exit 0 only (cannot block)
- Never use exit 2 in hooks that cannot block (PostToolUse, Stop, Notification)

**Validation command:**
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.js","content":"x"}}' | node hooks/my-hook.js
echo "Exit: $?"
```

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 16–20 | Perfect: execute()+main(), stdin JSON parse, stdout JSON write, exit codes match event type |
| 11–15 | Correct structure with minor deviations |
| 6–10 | Has structure but wrong approach |
| 0–5 | Missing execute() or main(), or no stdin parsing |

---

## D2: Error Resilience (20 points)

Does the hook fail open and never permanently block the user?

**The golden rule:** A hook crash must never permanently block a user. When in doubt, exit 0.

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Outer safety net: `main().catch(err => { ...; process.exit(0); })` | +5 | Find `.catch()` on main() call with `process.exit(0)` |
| stdin `JSON.parse` inside `try/catch` | +4 | Find try/catch wrapping the parse call |
| Optional `require()` calls inside `try/catch` (DB, WS, optional libs) | +3 | Any require that could fail at runtime is wrapped |
| No `process.exit(1)` or `process.exit(2)` inside any catch block | +4 | Grep all catch blocks for non-zero exits |
| Defensive property access (`?.` or explicit null checks) on hookData fields | +2 | Find `?.` or `if (!x)` guards before property access |
| Graceful degradation when DB not initialized (log warning + return exitSuccess) | +2 | Find try/catch around DB init or require |

**Total: 20**

**Validation commands:**
```bash
# Test malformed input — must exit 0
echo 'not-json' | node hooks/my-hook.js; echo "Exit (must be 0): $?"
# Test empty input — must exit 0
echo '' | node hooks/my-hook.js; echo "Exit (must be 0): $?"
```

**Red flags** (set criterion to 0 if found):
- `process.exit(1)` or `process.exit(2)` inside any catch block — permanently blocks user on error
- `JSON.parse(input)` without try/catch — malformed stdin crashes hook
- `require('./lib/optional-dep')` at top-level without try/catch — module-not-found crashes hook
- No outer catch on `main().catch(...)` — unhandled promise rejection kills process

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 16–20 | Fail-open everywhere; malformed input gracefully handled; lazy-loaded deps |
| 11–15 | Fail-open in main() but execute() may throw uncaught errors |
| 6–10 | Some try/catch but catch block calls process.exit(2) or re-throws |
| 0–5 | No error handling; unhandled exception crashes hook |

---

## D3: Library Compliance (15 points)

Does the hook use the correct AICodePath libraries and import patterns?

### Scoring Checklist

**Zero-tolerance items** — any violation on these sets that criterion to 0:

| Criterion | Points | Verification command |
|-----------|--------|----------------------|
| No `console.log` / `console.error` / `console.warn` calls (use `logger`) | +5 | `grep -n "console\." hooks/my-hook.js` → must return empty |
| No hardcoded paths — no `'aicodepath-docs/'`, no `process.cwd()` | +4 | `grep -n "aicodepath-docs\|process\.cwd" hooks/my-hook.js` → must return empty |
| Uses exit-codes.js helpers (`exitSuccess`, `exitBlock`, `exitWarning`) — not magic numbers | +3 | `grep "exitSuccess\|exitBlock\|exitWarning" hooks/my-hook.js` → must find matches |
| Correct require paths: `./lib/` for hooks/lib, `../lib/` for core | +3 | `grep "require\(" hooks/my-hook.js` — no `../../lib/`, no `./exit-codes` (missing `lib/`) |

**Total: 15**

**Correct require paths from hooks/ directory:**
```javascript
// Hook utilities (hooks/lib/)
const { exitSuccess, exitBlock, exitWarning } = require('./lib/exit-codes');
const wsEmitter = require('./lib/ws-emitter');

// Core libraries (one level up from hooks/)
const logger = require('../lib/logger');
const pathResolver = require('../lib/path-resolver');
const { isEnabled } = require('../lib/feature-flags');
```

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 12–15 | Perfect: logger, pathResolver, exit-codes.js, correct require paths |
| 8–11 | Uses logger and pathResolver but missing exit-codes.js or wrong require paths |
| 4–7 | Uses some libs but still has console calls or hardcoded paths |
| 0–3 | Uses console.log/error throughout, hardcoded paths, no exit-codes.js |

---

## D4: Output Field Validity (15 points)

Does the hook return only valid fields for its event type?

### Scoring Checklist

**Zero-tolerance item** — instant D4 = 0 if found:

| Criterion | Points | Verification command |
|-----------|--------|----------------------|
| No `appendToSystemPrompt` anywhere (field does not exist in spec) | +5 | `grep "appendToSystemPrompt" hooks/my-hook.js` → must return empty |
| No top-level `decision: "block"` or `decision: "approve"` (deprecated PreToolUse pattern) | +3 | `grep "decision:" hooks/my-hook.js` — must not be at top level |
| `additionalContext` nested under `hookSpecificOutput` (not top-level) | +3 | `grep -A2 "additionalContext" hooks/my-hook.js` — verify nesting |
| Only valid fields returned for this event type | +4 | Cross-check all returned fields against table below |

**Total: 15**

**Valid output fields by event type:**

| Event | Valid Output Fields |
|-------|---------------------|
| SessionStart | `continue` (bool), `stopReason` (string), `suppressOutput` (bool), `systemMessage`, `hookSpecificOutput.additionalContext` |
| PreToolUse | `hookSpecificOutput.additionalContext`, `hookSpecificOutput.permissionDecision` ("allow"/"deny"), `systemMessage` |
| PostToolUse | `hookSpecificOutput.additionalContext`, `systemMessage` |
| Stop | `hookSpecificOutput.stopReason`, `systemMessage` |
| Any | `systemMessage` (shown to user) |

**Valid output examples:**
```javascript
// PreToolUse — inject context
return { exitCode: 0, hookSpecificOutput: { additionalContext: 'Schema: ...' } };

// PreToolUse — deny with message
return { exitCode: 2, hookSpecificOutput: { permissionDecision: 'deny' }, systemMessage: 'Blocked: ...' };

// SessionStart — inject context
return { continue: true, hookSpecificOutput: { additionalContext: 'Welcome back...' } };
```

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 12–15 | Only valid fields, correct nesting, correct values for event type |
| 8–11 | Correct fields but wrong nesting |
| 4–7 | Mostly valid but includes deprecated or silently-ignored fields |
| 0–3 | Uses `appendToSystemPrompt` or wrong field names |

---

## D5: Registration & Integration (15 points)

Is the hook correctly registered and ordered in hooks.json?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Entry in hooks.json with correct event type | +4 | `grep "my-hook" .aicodepath/hooks/hooks.json` |
| Matcher is correct for hook's scope (`Write\|Edit`, `Bash`, `*`, etc.) | +3 | Verify matcher matches the tools hook needs to intercept |
| `statusMessage` present and descriptive | +2 | Read hooks.json entry |
| Ordering rules respected relative to anchor hooks | +3 | See ordering rules below |
| Experimental hooks gated behind feature flag in `settings-generator.js` | +3 | `grep "isEnabled" .aicodepath/lib/settings-generator.js` (N/A = full credit) |

**Total: 15**

**Required ordering for PreToolUse Write|Edit:**
1. `schema-context-hook.js` — MUST be first
2. `guideline-validator.js` — validates against rules
3. `duplication-checker.js` — checks duplication
4. New hook — add AFTER these three

**Required ordering for PostToolUse Write|Edit:**
1. `auto-artifact-creator.js` — MUST be first
2. `gicl-iteration-hook.js` — scoring
3. Skill suggesters and other observers — add after

**Validation commands:**
```bash
# Regenerate settings.json and verify hook appears
node .aicodepath/bin/aicodepath.js init
grep "my-hook" .claude/settings.json
```

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 12–15 | Correct event+matcher, ordering respected, statusMessage present, flags gated |
| 8–11 | Correct registration but ordering violates rules or feature flag missing |
| 4–7 | Registered but wrong matcher, missing statusMessage, or wrong ordering |
| 0–3 | Not registered, or registered under wrong event type |

---

## D6: Code Quality (15 points)

Is execute() focused, testable, and free of anti-patterns?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| `execute()` is focused: no side effects, no `process.exit()` calls inside it | +4 | Grep execute() body for `process.exit`; check for file writes or DB mutations |
| `main()` has no business logic — only: read stdin → call execute() → write stdout → exit | +3 | Read main() body; any conditional logic = partial credit |
| Helper functions extract repeated logic from execute() | +2 | Count distinct helper functions; 0 helpers on complex execute() = 0 pts |
| `logger` calls tagged with `{ context: 'hook-name' }` | +2 | `grep "logger\." hooks/my-hook.js` — all calls must have context tag |
| WebSocket emissions via `wsEmitter.emit()` inside try/catch | +2 | Find ws emissions wrapped in try/catch |
| `async/await` throughout — no mixing with `.then()` chains | +2 | Grep for `.then(` in async functions |

**Total: 15**

**Structure principles:**
- `execute()` — pure logic, testable in isolation, returns a result object
- `main()` — only: read stdin, call execute(), write stdout, call process.exit()
- Helper functions — extract repeated logic from execute()
- WebSocket events — always via `wsEmitter.emit()` inside try/catch

**Good pattern:**
```javascript
async function execute(hookData) {
  const filePath = hookData?.tool_input?.file_path;
  if (!filePath) return exitSuccess();

  const violations = await checkViolations(filePath, hookData.tool_input.content);
  if (violations.length > 0) return buildBlockResult(violations);
  return exitSuccess();
}

async function main() {
  const input = await readStdin();
  let hookData;
  try { hookData = JSON.parse(input); } catch { process.exit(0); }
  const result = await execute(hookData);
  process.stdout.write(JSON.stringify(result));
  process.exit(result?.exitCode ?? 0);
}
main().catch(err => { logger.error('Hook failed', { error: err.message, context: 'my-hook' }); process.exit(0); });
```

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 12–15 | Focused execute(), pure main(), async/await throughout, ws-emitter for WS events |
| 8–11 | Good separation but minor issues (missing context tags, inline WebSocket calls) |
| 4–7 | Some decomposition but side effects mixed with logic |
| 0–3 | execute() is 200-line monolith with side effects in main() |

---

## Quick Reference Scoring Sheet

```
D1: Protocol Compliance            ___/20
  execute() returns value:         ___/4
  main() reads stdin JSON:         ___/3
  main() writes stdout:            ___/3
  process.exit() only in main():   ___/3
  Exit codes match event type:     ___/4
  No mixed output approach:        ___/3

D2: Error Resilience               ___/20
  Outer catch → exit 0:            ___/5
  JSON.parse in try/catch:         ___/4
  Optional requires in try/catch:  ___/3
  No exit(1/2) in catch blocks:    ___/4
  Defensive property access:       ___/2
  Graceful DB degradation:         ___/2

D3: Library Compliance             ___/15
  No console.* calls:              ___/5  (zero-tolerance)
  No hardcoded paths:              ___/4  (zero-tolerance)
  Uses exit-codes.js helpers:      ___/3
  Correct require paths:           ___/3

D4: Output Field Validity          ___/15
  No appendToSystemPrompt:         ___/5  (zero-tolerance)
  No deprecated top-level fields:  ___/3
  additionalContext nested:        ___/3
  Only valid fields for event:     ___/4

D5: Registration & Integration     ___/15
  hooks.json entry correct event:  ___/4
  Matcher correct:                 ___/3
  statusMessage present:           ___/2
  Ordering rules respected:        ___/3
  Experimental flag gated:         ___/3  (N/A = full credit)

D6: Code Quality                   ___/15
  execute() focused, no exit():    ___/4
  main() no business logic:        ___/3
  Helper functions present:        ___/2
  logger has context tags:         ___/2
  WS via ws-emitter try/catch:     ___/2
  async/await consistent:          ___/2

TOTAL:                             ___/100
```

---

## Common Failure Patterns

### Pattern 1: The Crash-Blocker
```
Symptom: Hook throws uncaught error when DB not initialized → process exits non-zero → user blocked
Fix: Wrap require('./lib/db') in try/catch; on failure, log warning and return exitSuccess()
D2 impact: "Graceful DB degradation" criterion = 0 pts.
```

### Pattern 2: The Silent Null
```
Symptom: return { appendToSystemPrompt: '...' } — compiles fine but Claude ignores it
Fix: Use hookSpecificOutput.additionalContext instead
D4 impact: Zero-tolerance → entire D4 = 0 pts.
```

### Pattern 3: The Ordering Violation
```
Symptom: New hook added before schema-context-hook.js → schema not injected when needed
Fix: Add hook entry AFTER the three anchor hooks in hooks.json
D5 impact: "Ordering rules respected" = 0 pts.
```

### Pattern 4: The Escape Route
```
Symptom: catch block calls exitBlock('error occurred') — user permanently blocked on hook failure
Fix: All catch blocks must call exitSuccess() or process.exit(0)
D2 impact: "No exit(1/2) in catch" = 0 pts.
```

### Pattern 5: The Deep Exit
```
Symptom: execute() calls process.exit(2) directly → cannot be unit tested
Fix: Return exitBlock result object; let main() handle process.exit()
D1 impact: "process.exit() only in main()" = 0 pts.
D6 impact: "execute() focused" = 0 pts.
```
