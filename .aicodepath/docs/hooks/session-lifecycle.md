# Hooks — Session Lifecycle

Covers: `SessionStart` (3 hooks), `SessionEnd`, `PreCompact`, `Stop`, `Notification`, `WorktreeRemove`

---

## session-start-hook.js

**Event:** `SessionStart`
**File:** `.aicodepath/hooks/session-start-hook.js`

**What it does:**
1. Reads `.aicodepath/skills/using-aicodepath/SKILL.md` (the meta-skill that establishes AIDLC workflow rules)
2. Checks `aicodepath-docs/checkpoints/latest.json` for a resume summary (only if < 24 hours old)
3. Returns both as `additionalContext` so Claude has the AIDLC rules active from the first message

**Design principles:**
- Fast path (< 50ms): reads two files only
- Fail-safe: any error → pass through silently, never blocks a session
- No DB init (lazy init happens on first GICL operation)

**Output:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>... using-aicodepath skill content ...</EXTREMELY_IMPORTANT>"
  },
  "message": "AICodePath active — AIDLC workflow and skill activation rules loaded."
}
```

**Resume summary format** (appended when checkpoint < 24h old):
```
## Session Resume Available
**Previous session** (Nh ago): Phase=CONSTRUCTION, Stage=implementation
**Unit**: <unit-name>
Use `/aicodepath-resume` for full details or to restore state.
```

---

## visual-memory-loader.js

**Event:** `SessionStart`
**File:** `.aicodepath/hooks/visual-memory-loader.js`

**What it does:**
1. Checks if `aicodepath-docs/memory/index.json` exists (skips silently if not initialized)
2. Calculates a dynamic token budget (reserves 70% for conversation)
3. Queries relevant diagrams based on context (minimum relevance score: 10)
4. Writes ER diagrams to `.claude/rules/schema-context.md` for native Claude Code auto-loading
5. Returns `systemMessage` for user feedback only

**Key behavior:**
- Does NOT use `appendToSystemPrompt` (invalid field in Claude Code spec)
- Uses `VisualMemoryQuery` (`lib/visual-memory-query.js`) for context-aware selection
- Skips stale diagrams by default (`includeStale: false`)
- Silently passes through if visual memory not yet initialized

**Output:**
```json
{
  "success": true,
  "message": "Loaded N relevant diagrams (ER, Class, Sequence)"
}
```

---

## session-auto-cleanup.js

**Event:** `SessionStart`
**File:** `.aicodepath/hooks/session-auto-cleanup.js`

**Purpose:** Prune stale state at session start so the next session begins with a clean slate.

**Only runs on:** `startup` and `resume` session triggers (skips `clear` and `compact`).

**Three cleanup operations:**

| Operation | Threshold | Action |
|-----------|-----------|--------|
| Stale GICL sessions | > 24h with non-terminal status | Set status = `stopped`, reason = `stale_auto_closed_session_start` |
| Old fix proposals | > 7 days with status = `pending` | Set status = `expired` |
| Agent-inbox messages | > 48h | Delete from JSONL files |

**Output (when items cleaned):**
```json
{
  "continue": true,
  "hookSpecificOutput": {
    "additionalContext": "> **Session cleanup**: Closed 2 stale GICL sessions (>24h inactive); Pruned 5 old agent-inbox messages (>48h)"
  }
}
```

**Output (nothing to clean):**
```json
{ "continue": true }
```

**Fail-safe:** All three operations are independent and non-fatal — a DB error in GICL cleanup does not prevent inbox cleanup from running.

---

## session-end-hook.js

**Event:** `SessionEnd`
**File:** `.aicodepath/hooks/session-end-hook.js`

**Input:**
```json
{
  "reason": "user_quit | timeout | error | complete",
  "session_duration_ms": 12345,
  "total_tokens_used": 50000,
  "tools_called_count": 42
}
```

**What it does:**
1. Saves a session-end checkpoint via `lib/checkpoint-manager.js` (if available)
2. Updates `SessionStateManager` with final state (if available)
3. Emits WebSocket `session_end` event via `hooks/lib/ws-emitter.js`
4. Logs session summary (duration, tokens, tools)

**Output:**
```json
{
  "cleanup_performed": true
}
```

**Fail-safe:** All dependencies (`checkpoint-manager`, `session-state-manager`) loaded with `try/catch` — hook works without them.

---

## pre-compact-hook.js

**Event:** `PreCompact`
**File:** `.aicodepath/hooks/pre-compact-hook.js`

**Input:**
```json
{
  "current_tokens": 150000,
  "max_tokens": 200000,
  "messages_count": 45,
  "oldest_message_age_minutes": 120
}
```

**What it does:**
1. Saves a checkpoint before compaction so context can be recovered
2. Optionally returns `preserve_messages` indices for important messages
3. Emits WebSocket `pre_compact` event
4. Can return a `custom_summary` to guide the compaction

**Output:**
```json
{
  "preserve_messages": [0, 1, 5],
  "custom_summary": "Optional custom summary text"
}
```

---

## response-stop-hook.js

**Event:** `Stop`
**File:** `.aicodepath/hooks/response-stop-hook.js`

**Input:**
```json
{
  "reason": "end_turn | max_tokens | stop_sequence | error",
  "tokens_used": 5000,
  "response_time_ms": 3500,
  "tools_called": ["Write", "Read", "Bash"]
}
```

**What it does:**
1. On `max_tokens`: emits WebSocket warning and optionally signals continuation
2. On `end_turn`: saves checkpoint at natural response boundaries
3. Updates session state with response metrics
4. Emits WebSocket `response_stop` event

**Output:**
```json
{
  "continue": false
}
```

---

## notification-hook.js

**Event:** `Notification`
**File:** `.aicodepath/hooks/notification-hook.js`

**Input:**
```json
{
  "notification_type": "info | warning | error | success",
  "message": "Reading file...",
  "context": {}
}
```

**What it does:**
1. Checks message against `SUPPRESS_PATTERNS` (e.g. verbose file-read notices)
2. Enhances important notifications with additional context
3. Emits WebSocket `notification` event for dashboard display

**Output:**
```json
{
  "suppress": false,
  "modified_message": "Optional replacement message"
}
```

**Suppress patterns** include:
- `/^Reading file/` — too verbose for routine operations
- Other configurable patterns based on notification type

---

## worktree-lifecycle.js

**Event:** `WorktreeRemove` (registered by default) and `WorktreeCreate` (opt-in only)
**File:** `.aicodepath/hooks/worktree-lifecycle.js`

### WorktreeRemove (registered)

Cleans up AICodePath state when a git worktree is removed.

**Input:**
```json
{ "worktree_path": "/path/to/worktree", "session_id": "abc123", "hook_event_name": "WorktreeRemove" }
```

**What it does:**
1. Reads `.aicodepath-worktree` metadata file from removed worktree (if present)
2. Removes all agent-inbox JSONL entries belonging to that session
3. Emits `worktree_removed` trace to `agent-trace.jsonl`
4. Emits `worktree_removed` event via `session-broadcast.js`

Non-blocking — all operations wrapped in try/catch.

### WorktreeCreate (opt-in only — not registered by default)

**WARNING:** Registering `WorktreeCreate` replaces Claude Code's default git worktree creation behavior. Only register if you want AICodePath to control where worktrees are placed.

**What it does:**
1. Creates git worktree at `.claude/worktrees/<name>/`
2. Writes `.aicodepath-worktree` metadata file in the worktree
3. **Prints absolute worktree path to stdout** (required by Claude Code spec)
4. Emits trace + broadcast events

**To enable:** Add to `WorktreeCreate` section in `hooks/hooks.json` and re-run `aicodepath init`.
