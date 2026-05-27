# Event Type Reference — Claude Code Hook Events

Quick-reference for all hook event types as of March 2026. When in doubt, fetch the live spec:
https://docs.anthropic.com/en/docs/claude-code/hooks

---

## Event Summary Table

| Event | Matcher | Blockable | When It Fires |
|-------|---------|-----------|---------------|
| SessionStart | No | No | When a Claude Code session begins |
| UserPromptSubmit | No | Yes (exit 2) | After user submits a message, before Claude responds |
| PreToolUse | Yes (tool name) | Yes (exit 2) | Before Claude calls any tool |
| PermissionRequest | No | Yes (exit 2) | When Claude requests a permission |
| PostToolUse | Yes (tool name) | No | After a tool call succeeds |
| PostToolUseFailure | Yes (tool name) | No | After a tool call fails |
| Notification | No | No | When Claude sends a notification |
| SubagentStart | No | No | When a subagent is launched |
| SubagentStop | No | No | When a subagent completes |
| Stop | No | No | When Claude finishes generating a response |
| TeammateIdle | No | No | When a teammate agent has no pending work |
| TaskCompleted | No | No | When a task (worktree task) completes |
| InstructionsLoaded | No | No | After CLAUDE.md and instructions are loaded |
| ConfigChange | No | No | When settings.json changes |
| WorktreeCreate | No | No | When a git worktree is created |
| WorktreeRemove | No | No | When a git worktree is removed |
| PreCompact | No | No | Before context window compaction |
| PostCompact | No | No | After context window compaction |
| Elicitation | No | No | When Claude requests structured input from user |
| ElicitationResult | No | No | When user responds to an elicitation |
| SessionEnd | No | No | When a Claude Code session ends |

---

## Expanded Detail: Common Events

### PreToolUse

The most frequently used event. Fires before any tool invocation. This is where validation, blocking, and context injection happen.

**When it fires:** Before `Write`, `Edit`, `Bash`, `Read`, `WebSearch`, or any other tool call.

**Matcher support:** Yes. Use tool names or pipe-delimited patterns:
- `"matcher": "Write"` — only Write tool
- `"matcher": "Write|Edit"` — Write or Edit
- `"matcher": "Bash"` — only Bash tool
- No matcher field — fires for ALL tools

**Blockable:** Yes. Exit code 2 prevents the tool from running.

**Key stdin fields:**
```json
{
  "hook_event_name": "PreToolUse",
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "file content here"
  }
}
```

For Bash tool: `tool_input.command` instead of `file_path`/`content`.
For Edit tool: `tool_input.file_path`, `tool_input.old_string`, `tool_input.new_string`.

**Valid output fields:**
```javascript
// Inject context (Claude sees this before calling the tool)
return {
  exitCode: 0,
  hookSpecificOutput: {
    additionalContext: 'Schema context: ...'
  }
};

// Block with explanation
return {
  exitCode: 2,
  hookSpecificOutput: {
    permissionDecision: 'deny'
  },
  systemMessage: 'Blocked: violation found. Fix X before proceeding.'
};

// Pass through with no output
return { exitCode: 0 };
```

**Common use cases:** Schema injection, guideline validation, safety guardrails, duplication detection.

---

### PostToolUse

Fires after a tool completes successfully. Cannot block (exit 2 is ignored). Useful for scoring, observability, and artifact creation.

**When it fires:** After successful completion of any tool call.

**Matcher support:** Yes, same pattern as PreToolUse.

**Blockable:** No. Exit codes other than 0 are treated as warnings only.

**Key stdin fields:**
```json
{
  "hook_event_name": "PostToolUse",
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "written content"
  },
  "tool_response": {
    "success": true,
    "output": "File written successfully"
  }
}
```

**Valid output fields:**
```javascript
// Inject feedback into Claude's context
return {
  exitCode: 0,
  hookSpecificOutput: {
    additionalContext: 'GICL Score: 87/100. Improve: reduce duplication.'
  }
};
```

**Common use cases:** GICL scoring, artifact creation, test running, skill suggestions, WebSocket dashboard events.

---

### SessionStart

Fires once when a Claude Code session begins. Used to inject persistent context (skills, state, welcome messages).

**When it fires:** At the start of every Claude Code session, before any user interaction.

**Matcher support:** No.

**Blockable:** Yes — set `continue: false` to abort session start (rare, use with caution).

**Key stdin fields:**
```json
{
  "hook_event_name": "SessionStart",
  "session_id": "abc123"
}
```

**Valid output fields:**
```javascript
// Inject skill content at session start (most common use)
return {
  continue: true,
  hookSpecificOutput: {
    additionalContext: 'Skill content or session context...'
  }
};

// Stop session (only use for critical pre-flight failures)
return {
  continue: false,
  stopReason: 'Database not initialized. Run: bash .aicodepath/scripts/init-knowledge-base.sh'
};

// Suppress Claude's output (used with additionalContext injection)
return {
  continue: true,
  suppressOutput: false,  // true = suppress Claude's initial greeting
  hookSpecificOutput: {
    additionalContext: 'Context injected silently...'
  }
};
```

**Common use cases:** Injecting `using-aicodepath` skill content, loading checkpoint state, session initialization.

---

### Stop

Fires when Claude finishes generating a response. Cannot block. Used for checkpointing, metrics, and cleanup.

**When it fires:** After Claude completes each response.

**Matcher support:** No.

**Blockable:** No.

**Key stdin fields:**
```json
{
  "hook_event_name": "Stop",
  "session_id": "abc123",
  "stop_reason": "end_turn"
}
```

**Valid output fields:**
```javascript
return {
  exitCode: 0,
  hookSpecificOutput: {
    stopReason: 'Response processed. Checkpoint saved.'
  }
};
```

**Common use cases:** Auto-checkpointing, session metrics, dashboard updates, cleanup of temporary state.

---

## Handler Types

| Type | When to Use | Example |
|------|-------------|---------|
| `command` | Node.js scripts, shell scripts — most common | `"command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.js"` |
| `http` | External service integration, remote validation | `"url": "http://localhost:8080/hook"` |
| `prompt` | Simple text instructions without code | `"prompt": "Always check X before Y"` |
| `agent` | Complex multi-step validation requiring subagent | `"agent": "my-validator-agent"` |

**When to choose `command` (default):** Any time you need to run logic, read files, query a DB, or make decisions. This is the right choice 95% of the time.

**When to choose `http`:** You have a sidecar service running (e.g., a linting server) and want hooks to call it. Adds network dependency — fragile if service is down.

**When to choose `prompt`:** The "hook" is really just a reminder or instruction to Claude, not a validation. Use sparingly — no enforcement capability.

**When to choose `agent`:** The validation is too complex for a single hook and benefits from Claude's reasoning capabilities. Slow and expensive — use only for high-value checks.

---

## Deprecated Patterns

### PreToolUse: Top-level `decision` field

**Deprecated (do not use):**
```javascript
// ❌ Old pattern — top-level decision field
return { decision: 'block', reason: 'Validation failed' };
return { decision: 'approve' };
```

**Current (use this):**
```javascript
// ✅ Current pattern — hookSpecificOutput.permissionDecision
return {
  exitCode: 2,
  hookSpecificOutput: { permissionDecision: 'deny' },
  systemMessage: 'Blocked: explain what to fix'
};

// Allow explicitly (usually just return exitSuccess() instead)
return {
  exitCode: 0,
  hookSpecificOutput: { permissionDecision: 'allow' }
};
```

### `appendToSystemPrompt` field

**Never existed — silently ignored:**
```javascript
// ❌ This field does not exist in the spec
return { appendToSystemPrompt: 'Context...' };
```

**Use `additionalContext` instead:**
```javascript
// ✅ Correct — nested under hookSpecificOutput
return {
  exitCode: 0,
  hookSpecificOutput: { additionalContext: 'Context...' }
};
```

### Top-level `additionalContext`

**Wrong nesting:**
```javascript
// ❌ additionalContext at top level is not recognized
return { exitCode: 0, additionalContext: 'Context...' };
```

**Must be nested:**
```javascript
// ✅ Correct nesting
return { exitCode: 0, hookSpecificOutput: { additionalContext: 'Context...' } };
```
