# Hook Registration Checklist

Step-by-step guide for registering a new hook in AICodePath. Work through this top to bottom after writing the hook file.

---

## Step 1: Choose Handler Type

Most hooks are `command` handlers. See event-type-reference.md "Handler Types" section for the full decision table.

| Your hook does... | Handler type |
|-------------------|--------------|
| Runs Node.js logic, reads files, queries DB | `command` |
| Calls an external HTTP service | `http` |
| Is just a text instruction to Claude | `prompt` |
| Needs Claude's reasoning for validation | `agent` |

---

## Step 2: Write the hooks.json Entry

### Command handler (most common)
```json
"PreToolUse": [{
  "matcher": "Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.js",
    "statusMessage": "Running my check...",
    "async": false,
    "timeout": 60
  }]
}]
```

**Field reference:**
- `matcher` — pipe-delimited tool names (`Write|Edit`, `Bash`, `Read`). Omit for all tools.
- `command` — always use `${CLAUDE_PLUGIN_ROOT}/hooks/` prefix. Never use relative or absolute paths.
- `statusMessage` — shown to user during hook execution. Keep it short and present-tense (e.g., "Validating patterns...").
- `async` — `false` (default) means Claude waits. `true` means Claude proceeds while hook runs. Only use `true` for observability hooks that never block.
- `timeout` — seconds before hook is killed. Default: 60. Increase for DB-heavy hooks (max 300).

### HTTP handler
```json
"PreToolUse": [{
  "matcher": "Write",
  "hooks": [{
    "type": "http",
    "url": "http://localhost:8080/validate",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "statusMessage": "Validating against external service..."
  }]
}]
```

### Prompt handler (instruction only, no enforcement)
```json
"PreToolUse": [{
  "hooks": [{
    "type": "prompt",
    "prompt": "Before writing any file, verify the path does not contain sensitive directories."
  }]
}]
```

### Agent handler (subagent validation)
```json
"PreToolUse": [{
  "matcher": "Write",
  "hooks": [{
    "type": "agent",
    "agent": "my-validator-agent",
    "statusMessage": "Running deep validation..."
  }]
}]
```

---

## Step 3: Determine Position in hooks.json

### PreToolUse Write|Edit — REQUIRED ORDER

The following hooks MUST appear in this exact order. Add your hook AFTER all three:

```json
"PreToolUse": [{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/schema-context-hook.js",
      "statusMessage": "Loading schema context..."
    },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/guideline-validator.js",
      "statusMessage": "Validating guideline compliance..."
    },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/duplication-checker.js",
      "statusMessage": "Checking for code duplication..."
    },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/your-new-hook.js",
      "statusMessage": "Running your check..."
    }
  ]
}]
```

**Why this order:**
- `schema-context-hook.js` injects DB schema into Claude's context — must run first so subsequent hooks and Claude have schema available
- `guideline-validator.js` and `duplication-checker.js` are core quality gates — run before domain-specific hooks
- Your hook comes last in this group (unless there is a documented reason to move it)

### PostToolUse Write|Edit — REQUIRED ORDER

```json
"PostToolUse": [{
  "matcher": "Write|Edit",
  "_ordering_note": "auto-artifact-creator MUST be first",
  "hooks": [
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/auto-artifact-creator.js",
      "statusMessage": "Creating artifact entries..."
    },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/gicl-iteration-hook.js",
      "statusMessage": "Running GICL quality gates..."
    },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/your-new-hook.js",
      "statusMessage": "Running your post-write check..."
    }
  ]
}]
```

**Why this order:**
- `auto-artifact-creator.js` creates DB records for the written file — must run first so `gicl-iteration-hook.js` can query them
- `gicl-iteration-hook.js` reads artifact records for scoring — must run after artifact creation
- Skill suggesters and observer hooks always go last (they read results, never write them)

### PreToolUse Bash — no strict ordering constraint

Add after `safety-guardrails.js` to ensure safety checks run first:

```json
"PreToolUse": [{
  "matcher": "Bash",
  "hooks": [
    { "command": "${CLAUDE_PLUGIN_ROOT}/hooks/safety-guardrails.js", ... },
    { "command": "${CLAUDE_PLUGIN_ROOT}/hooks/your-bash-hook.js", ... }
  ]
}]
```

### SessionStart, UserPromptSubmit, Stop — no ordering constraints

Add to the existing hooks array at the end:

```json
"SessionStart": [{
  "hooks": [
    { "command": "...existing-hook..." },
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/your-session-hook.js",
      "statusMessage": "Initializing..."
    }
  ]
}]
```

---

## Step 4: Gate Experimental Hooks (if needed)

If your hook is experimental or tied to a feature flag, add a guard in `lib/settings-generator.js` instead of putting it directly in hooks.json.

**In hooks.json** — do NOT add it directly:
```json
// ❌ Don't add experimental hooks directly to hooks.json
```

**In settings-generator.js** — add a conditional block:
```javascript
// At the appropriate place in the generateSettings() function:
try {
  const { isEnabled } = require('./feature-flags');
  if (isEnabled('my-feature')) {
    // Find the existing PreToolUse Write|Edit matcher group
    const preToolUseWriteGroup = settings.hooks.PreToolUse.find(
      group => group.matcher === 'Write|Edit'
    );
    if (preToolUseWriteGroup) {
      preToolUseWriteGroup.hooks.push({
        type: 'command',
        command: `${pluginRoot}/hooks/my-experimental-hook.js`,
        statusMessage: 'Running experimental check...',
        async: false,
        timeout: 60
      });
    }
  }
} catch (err) {
  // Feature flag unavailable — skip experimental hook
}
```

**Feature flag names** are defined in `.aicodepath/lib/feature-flags.js`. Add your flag there first if it doesn't exist.

---

## Step 5: Regenerate and Verify

```bash
# Regenerate .claude/settings.json from hooks.json template
node .aicodepath/bin/aicodepath.js init

# Verify your hook appears in settings.json
grep "my-hook" .claude/settings.json

# Verify ordering is correct — check your hook appears after the anchors
grep -A 50 '"matcher": "Write|Edit"' .claude/settings.json | grep -n "command"

# Run the hook manually to verify it starts without errors
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts","content":"test"}}' \
  | node .aicodepath/hooks/my-hook.js
echo "Exit code: $?"
```

---

## Step 6: Final Registration Checklist

```
[ ] Hook file exists: .aicodepath/hooks/my-hook.js
[ ] hooks.json entry added with correct event type
[ ] Matcher is correct (Write|Edit, Bash, or omitted for all)
[ ] statusMessage is present and descriptive
[ ] Hook appears AFTER anchor hooks in ordering-sensitive chains
[ ] If experimental: gated in settings-generator.js, not in hooks.json directly
[ ] node .aicodepath/bin/aicodepath.js init regenerates settings.json without errors
[ ] grep confirms hook appears in .claude/settings.json
[ ] Manual pipe test exits 0 for normal input
[ ] codebase-map.md updated with new hook file entry
```
