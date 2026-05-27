# Hook Authoring Guide

Hooks are Node.js scripts that Claude Code executes at lifecycle events. They communicate via stdin/stdout JSON.

---

## Protocol

```
stdin → JSON hook data
stdout → JSON response
exit code → 0 (pass) | 1 (warn, allow) | 2 (block)
```

**Input (stdin):**
```json
{
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.js", "content": "..." },
  "hook_event_name": "PreToolUse"
}
```

**Output (stdout):**
```json
{
  "decision": "block",
  "reason": "Error: SQL injection risk detected"
}
```

---

## Hook Template

```javascript
#!/usr/bin/env node
'use strict';

const { exitSuccess, exitBlock, exitWarning } = require('./lib/exit-codes');
const logger = require('../lib/logger');

async function execute(hookData) {
  const { tool_name, tool_input } = hookData;

  // Your logic here
  if (someViolation) {
    return exitBlock('Violation message explaining what to fix');
  }

  if (someWarning) {
    return exitWarning('Warning message — code will still be written');
  }

  return exitSuccess();
}

// Main entry point
async function main() {
  let hookData;
  try {
    const input = require('fs').readFileSync('/dev/stdin', 'utf8');
    hookData = JSON.parse(input);
  } catch (err) {
    logger.error('Failed to parse hook input', { error: err.message, context: 'my-hook' });
    process.exit(0); // Always fail open
  }

  const result = await execute(hookData);
  if (result) {
    process.stdout.write(JSON.stringify(result) + '\n');
  }
  process.exit(result?.exitCode ?? 0);
}

main().catch(err => {
  logger.error('Hook error', { error: err.message, context: 'my-hook' });
  process.exit(0); // Fail open — never block on internal errors
});
```

---

## Exit Code Reference

| Exit Code | Meaning | Output |
|-----------|---------|--------|
| `0` | Pass — continue normally | Optional `additionalContext` |
| `1` | Warn — allow but show message | `systemMessage` or `reason` |
| `2` | Block — halt tool execution | `decision: "block"`, `reason` |

---

## Output Fields by Hook Type

### PreToolUse

```json
{
  "decision": "block",
  "reason": "Error message shown to user"
}
```

```json
{
  "hookSpecificOutput": {
    "additionalContext": "Schema context injected into Claude's next response"
  }
}
```

### SessionStart

```json
{
  "continue": true,
  "systemMessage": "Session context message"
}
```

```json
{
  "hookSpecificOutput": {
    "additionalContext": "Content injected into Claude's context"
  }
}
```

### UserPromptSubmit

```json
{
  "hookSpecificOutput": {
    "additionalContext": "Role/context to inject before Claude sees the prompt"
  }
}
```

### PostToolUse, PostToolUseFailure, Stop, PreCompact, SessionEnd

Output is optional. Use `systemMessage` to show messages. Exit 0 to pass silently.

---

## Registering a Hook

Add to `.aicodepath/hooks/hooks.json` under the appropriate event:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.js",
            "statusMessage": "Running my check..."
          }
        ]
      }
    ]
  }
}
```

Then regenerate `settings.json`:

```bash
node .aicodepath/bin/aicodepath.js init
```

---

## Hook Event Reference

| Event | Matcher options | Common use |
|-------|----------------|------------|
| `SessionStart` | none | Inject skill context, load diagrams |
| `UserPromptSubmit` | none | Pre-flight checks, role activation |
| `PermissionRequest` | none | Custom permission logic |
| `PreToolUse` | `Write\|Edit`, `Bash`, etc. | Validate before writes; inject schema |
| `PostToolUse` | `Write\|Edit`, `Bash` | GICL scoring, artifact creation, skill suggestions |
| `PostToolUseFailure` | none | Log failures, suggest alternatives |
| `Stop` | none | Session checkpointing |
| `PreCompact` | none | Save state before context compression |
| `SessionEnd` | none | Cleanup, summary generation |
| `Notification` | none | External alerts |

---

## Utility Libraries

| Library | Import | Purpose |
|---------|--------|---------|
| `path-resolver` | `require('../lib/path-resolver')` | Resolve project/DB/hook paths |
| `logger` | `require('../lib/logger')` | Structured logging (never console.log) |
| `exit-codes` | `require('./lib/exit-codes')` | `exitSuccess()`, `exitBlock()`, `exitWarning()` |
| `ws-emitter` | `require('./lib/ws-emitter')` | Emit WebSocket events to dashboard |
| `feature-flags` | `require('../lib/feature-flags')` | Check if feature is enabled |
| `hook-context` | `require('../lib/hook-context')` | Unified HookContext facade (lazy DB, logging, storage) |

---

## WebSocket Events

To emit dashboard updates from a hook:

```javascript
const wsEmitter = require('./lib/ws-emitter');

// After your logic
await wsEmitter.emitAgentUpdate({
  agent: 'my-hook',
  status: 'complete',
  message: 'Check passed'
});
```

Available emit methods: `emitAgentUpdate`, `emitLog`, `emitPhaseChange`, `emitProgress`, `emitGiclSessionStart`, `emitGiclIterationComplete`, `emitCostUpdate`

---

## Common Patterns

### Fail-open on errors

Always catch errors and exit 0 (pass). A broken hook must never block the user permanently.

```javascript
main().catch(err => {
  logger.error('Unexpected error', { error: err.message, context: 'my-hook' });
  process.exit(0); // Fail open
});
```

### Feature flag guard

```javascript
const { isEnabled } = require('../lib/feature-flags');

if (!isEnabled('my_feature')) {
  process.exit(0);
}
```

### Lazy DB access

```javascript
let db;
function getDb() {
  if (!db) {
    const pathResolver = require('../lib/path-resolver');
    const Database = require('better-sqlite3');
    db = new Database(pathResolver.getDbPath());
  }
  return db;
}
```

---

## Ordering Rules

For `PreToolUse Write|Edit`, hooks run in registration order:

1. `schema-context-hook.js` — must be first (injects schema context)
2. `guideline-validator.js` — validates content
3. `duplication-checker.js` — checks for duplication

For `PostToolUse Write|Edit`:

1. `auto-artifact-creator.js` — must be first (creates DB records that gicl-iteration-hook queries)
2. `gicl-iteration-hook.js` — quality scoring
3. Skill suggesters — recommendations only (exit 0 always)
