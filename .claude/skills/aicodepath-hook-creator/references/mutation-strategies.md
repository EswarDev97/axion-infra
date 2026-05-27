# Mutation Strategies — Hook Hill-Climbing

Dimension-specific rewrite strategies for improving hook quality scores.
Loaded before each mutation step. Not loaded at every invocation.

---

## Mutation Strategy: TARGETED (not full rewrite)

Identify the 1–2 lowest-scoring dimensions from the audit.
Rewrite ONLY those sections — preserve everything scoring well.

Hooks are code, not prose. Every mutation must produce a syntactically valid Node.js file.
Run `node -c hooks/my-hook.js` before writing. If it fails, do not write the file.

---

## Code Mutation Constraints

These constraints are non-negotiable. Violating them produces a broken hook.

```
PRESERVE:
  ✅ main() entry point structure (stdin read → execute → stdout write → process.exit)
  ✅ Fail-open catch blocks (main().catch → process.exit(0))
  ✅ exit-codes.js import and usage (exitSuccess, exitBlock, exitWarning)
  ✅ logger import and usage
  ✅ All require() paths — never change these without re-testing

ONLY MUTATE:
  ✅ execute() function body and logic
  ✅ Helper functions called by execute()
  ✅ Comments and documentation strings

NEVER:
  ❌ Change require() paths (./lib/ or ../lib/ depth must stay correct)
  ❌ Add console.log() — even temporarily for debugging
  ❌ Remove the outer main().catch() safety net
  ❌ Move process.exit() calls into execute()
  ❌ Change the main() function body structure
```

---

## Dimension-Specific Strategies

### Weak D1 — Protocol Compliance (max 20)

**Goal:** execute()+main() structure, correct stdin/stdout protocol, exit codes match event type.

**Actions when D1 scores low:**
- Add `execute()` function if missing — extract business logic from main() into it
- Add `main()` function if missing — wrap stdin parse → execute → stdout write → process.exit
- Fix `process.stdout.write(JSON.stringify(result) + '\n')` if result is never written to stdout
- Fix exit codes: if hook is PostToolUse, remove any `process.exit(2)` calls (no effect there)
- Fix mixed approaches: if some code paths call `exitBlock()` and others `return { exitCode: 2 }`, unify to return-based approach

**Grep patterns for anti-patterns:**
```bash
# Finds exit(2) in PostToolUse hooks where it has no effect:
grep -n "process.exit(2)" hooks/my-hook.js

# Finds missing stdout write (context injection will silently fail):
grep -n "process.stdout.write" hooks/my-hook.js

# Finds business logic in main() (should be in execute()):
grep -n "tool_input\|file_path\|content" hooks/my-hook.js | grep -v "execute\|hookData"
```

**Validation check:** After mutation, pipe a normal input and verify JSON appears on stdout with exit 0.

---

### Weak D2 — Error Resilience (max 20)

**Goal:** Fail open everywhere. No crash can permanently block a user.

**Actions when D2 scores low:**
- Add outer catch: if `main().catch(err => ...)` is missing, add it with `process.exit(0)`
- Wrap stdin parse in try/catch if it isn't already — malformed JSON must exit 0
- Find all `require()` calls for optional dependencies and wrap in try/catch
- Replace any `process.exit(1)` or `process.exit(2)` in catch blocks with `process.exit(0)`
- Add defensive access: `hookData?.tool_input?.file_path` not `hookData.tool_input.file_path`

**Grep patterns for anti-patterns:**
```bash
# Finds exit(2) in catch blocks (blocks user on error — must be exit 0):
grep -A2 "catch" hooks/my-hook.js | grep "exit(2)\|exit(1)"

# Finds unguarded JSON.parse:
grep -n "JSON.parse" hooks/my-hook.js

# Finds top-level require without try/catch:
grep -n "^const.*require\(" hooks/my-hook.js
```

**Validation check:**
```bash
# Must exit 0 (fail open on malformed input):
echo 'not-json' | node hooks/my-hook.js; echo "Exit: $?"

# Must exit 0 (fail open on empty input):
echo '' | node hooks/my-hook.js; echo "Exit: $?"
```

---

### Weak D3 — Library Compliance (max 15)

**Goal:** logger not console, pathResolver not hardcoded paths, exit-codes.js helpers throughout.

**Actions when D3 scores low:**
- Replace all `console.log(` with `logger.info(`
- Replace all `console.error(` with `logger.error(`
- Replace all `console.warn(` with `logger.warn(`
- Add `{ context: 'my-hook' }` to all logger calls that are missing it
- Replace `'aicodepath-docs/aicodepath.db'` with `pathResolver.getDbPath()`
- Replace `process.cwd()` with `pathResolver.findProjectRoot()`
- Replace `process.exit(0)` with `return exitSuccess()` inside execute()
- Fix require depth if wrong: hooks/lib is `./lib/`, core lib is `../lib/`

**Grep patterns for anti-patterns:**
```bash
# Finds any console usage (ALL must be replaced):
grep -n "console\." hooks/my-hook.js

# Finds hardcoded DB path:
grep -n "aicodepath-docs" hooks/my-hook.js

# Finds process.cwd() usage:
grep -n "process\.cwd()" hooks/my-hook.js

# Finds require with wrong depth (../../lib would be wrong from hooks/):
grep -n "require('../../" hooks/my-hook.js
```

**Validation check:** `grep -c "console\." hooks/my-hook.js` must return 0.

---

### Weak D4 — Output Field Validity (max 15)

**Goal:** Only valid fields, correct nesting, no deprecated patterns.

**Actions when D4 scores low:**
- Remove any `appendToSystemPrompt` references — replace with `hookSpecificOutput.additionalContext`
- Replace top-level `decision: 'block'` with `hookSpecificOutput.permissionDecision: 'deny'`
- Replace top-level `additionalContext:` with `hookSpecificOutput: { additionalContext: ... }`
- Audit all return statements and check each field name against the event-type-reference.md table
- For SessionStart hooks: use `continue: true` not `exitCode: 0`

**Grep patterns for anti-patterns:**
```bash
# Finds deprecated appendToSystemPrompt:
grep -n "appendToSystemPrompt" hooks/my-hook.js

# Finds deprecated top-level decision field:
grep -n "decision:" hooks/my-hook.js

# Finds additionalContext at wrong nesting level:
grep -n "additionalContext" hooks/my-hook.js
# If result doesn't show "hookSpecificOutput" on same or previous line → wrong nesting
```

**Validation check:** Each `additionalContext` in the file must be preceded by `hookSpecificOutput:` on the same or immediately preceding line.

---

### Weak D5 — Registration & Integration (max 15)

**Goal:** hooks.json entry correct, ordering respected, feature flags gated.

**Actions when D5 scores low:**
- Add entry to hooks.json if missing — follow registration-checklist.md Step 2
- Fix ordering if hook appears before schema-context-hook.js in PreToolUse Write|Edit
- Fix ordering if hook appears before auto-artifact-creator.js in PostToolUse Write|Edit
- Add missing statusMessage
- If hook is experimental, move from hooks.json to settings-generator.js conditional block
- Regenerate settings.json and verify with grep

**Validation commands:**
```bash
# Regenerate
node .aicodepath/bin/aicodepath.js init

# Verify hook registered
grep -c "my-hook" .claude/settings.json

# Verify ordering (schema-context-hook before my-hook in Write|Edit):
grep -n "schema-context-hook\|my-hook" .claude/settings.json | head -20
```

---

### Weak D6 — Code Quality (max 15)

**Goal:** execute() focused and testable, main() protocol-only, logger tagged, WS via emitter.

**Actions when D6 scores low:**
- Extract helper functions if execute() is longer than ~40 lines
- Move any side effects (file writes, DB inserts) from main() into execute() or helpers
- Add `{ context: 'my-hook' }` to all logger calls missing it
- Replace inline WebSocket server creation with `wsEmitter.emit()` calls
- Wrap all wsEmitter calls in try/catch to prevent WS errors from killing the hook
- Remove `async` keyword from execute() if no `await` is used

**Grep patterns for anti-patterns:**
```bash
# Finds logger calls missing context tag:
grep -n "logger\." hooks/my-hook.js | grep -v "context:"

# Finds WebSocket server instantiation (use ws-emitter instead):
grep -n "new WebSocket\|new ws.Server" hooks/my-hook.js

# Finds async execute with no await:
grep -n "async function execute" hooks/my-hook.js
# Then: grep -n "await" hooks/my-hook.js — if no results, remove async keyword
```

**Validation check:** Call execute() directly in a test with mock hookData. It must return a result object without calling process.exit().

---

## Mutation Output Validation Checklist

Run ALL of these before writing the mutated hook file to disk:

```
1. Syntax check:
   node -c hooks/my-hook.js
   → Must exit 0. If non-zero, do NOT write. Fix syntax first.

2. execute() present:
   grep -c "function execute" hooks/my-hook.js
   → Must be ≥ 1

3. main() present with stdin parsing:
   grep -c "function main" hooks/my-hook.js
   → Must be ≥ 1
   grep -c "readFileSync\|stdin" hooks/my-hook.js
   → Must be ≥ 1

4. Fail-open outer catch present:
   grep -c "main().catch" hooks/my-hook.js
   → Must be ≥ 1

5. No console usage:
   grep -c "console\." hooks/my-hook.js
   → Must be 0

6. No hardcoded paths:
   grep -c "aicodepath-docs/\|process\.cwd()" hooks/my-hook.js
   → Must be 0

7. No appendToSystemPrompt:
   grep -c "appendToSystemPrompt" hooks/my-hook.js
   → Must be 0

8. Functional test — normal input exits 0:
   echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts","content":"x"}}' \
     | node hooks/my-hook.js; echo $?
   → Exit code must be 0

9. Functional test — malformed input exits 0:
   echo 'bad' | node hooks/my-hook.js; echo $?
   → Exit code must be 0

10. Run unit tests if they exist:
    node .aicodepath/__tests__/my-hook.test.js
    → Must exit 0
```

**If any check fails:** Fix the issue, re-run the full checklist. Do not write a partial fix.

**If two consecutive mutations both fail the checklist:** Revert to the last known-good version of the hook. Log the failure. Stop the improvement cycle.

---

## Retry Format

When a mutation produces invalid output:

```
"Previous mutation produced an invalid hook:
 [specific violation: e.g., 'console.log found on line 42']
 Regenerate the mutation fixing this violation while preserving all improvements made."
```

Reference the specific grep output or checklist failure to make the retry precise.
