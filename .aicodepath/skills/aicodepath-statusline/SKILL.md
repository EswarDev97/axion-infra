---
name: aicodepath-statusline
description: Configure the Claude Code terminal statusline — phase, context usage, cost, duration, and custom fields.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: ""
---

# AICodePath Statusline Setup

Configure the terminal statusline that shows AICodePath workflow state, session cost, duration, and context usage. The two most critical expert knowledge areas are the **POSIX vs bash** constraint and the **two-line display pattern** — getting either wrong produces silently broken or truncated output.

---

## The POSIX Constraint (Most Important)

**Claude Code runs statusline commands with `sh` (POSIX shell), NOT `bash`.**

This means bash-specific syntax in the `settings.json` statusLine command will silently fail or produce empty output — no error, just a blank statusline.

| Syntax | In bash | In sh (POSIX) | Use instead |
|--------|---------|---------------|-------------|
| `${var:0:5}` | substring | broken | `echo "$var" \| cut -c1-5` |
| `str+="text"` | append | broken | `str="${str}text"` |
| `echo -e "\033[..."` | ANSI color | broken | `printf '%b' "\033[..."` |
| `for ((i=0;i<n;i++))` | C-style loop | broken | `while [ $i -lt $n ]` |

**External scripts** (`.sh` files with `#!/bin/bash` shebang) are exempt — they run as bash. Only the inline `statusLine.command` in `settings.json` must be POSIX.

---

## Initial Setup

```bash
node .aicodepath/scripts/statusline-setup.js
```

This detects your OS, checks for `jq`/Python, copies the scripts to `~/.aicodepath/`, and prints the exact settings block to add to `~/.claude/settings.json`. Run once per machine (not per project).

**Scripts that get installed:**
| File | Purpose |
|------|---------|
| `.aicodepath/scripts/statusline.sh` | Main bash script — two-line display |
| `.aicodepath/scripts/statusline.py` | Python alternative (no jq required) |
| `.aicodepath/scripts/statusline.ps1` | Windows PowerShell |
| `.aicodepath/scripts/statusline-kb-query.js` | Reads AICodePath phase from DB |
| `.aicodepath/scripts/provider-data-extractor.js` | stdin JSON → provider detection → normalized JSON; called by statusline scripts |
| `.aicodepath/lib/providers/` | Adapter directory — one file per provider (anthropic-adapter.js, zai-adapter.js) |

The generated settings entry:
```json
// ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "/absolute/path/.aicodepath/scripts/statusline.sh",
    "padding": 0
  }
}
```

Use an **absolute path** — relative paths fail silently. The optional `padding` field adds horizontal spacing (characters) beyond the interface's built-in spacing.

---

## Available Data Fields

Claude Code pipes this JSON to your script via stdin on every assistant message:

| Field | Description |
|-------|-------------|
| `model.display_name` | Current model name (e.g. "Opus", "Sonnet") |
| `workspace.current_dir` | Current working directory |
| `workspace.project_dir` | Directory where Claude Code was launched |
| `cost.total_cost_usd` | Cumulative session cost in USD |
| `cost.total_duration_ms` | Total wall-clock time since session started (ms) |
| `cost.total_api_duration_ms` | Time spent waiting for API responses only (ms) |
| `cost.total_lines_added` | Lines of code added this session |
| `cost.total_lines_removed` | Lines of code removed this session |
| `context_window.used_percentage` | Pre-calculated % of context window used (input tokens only) |
| `context_window.remaining_percentage` | Pre-calculated % remaining |
| `context_window.context_window_size` | Max context size (200k default, 1M for extended) |
| `context_window.current_usage.cache_read_input_tokens` | Cache hits this call (efficiency signal) |
| `exceeds_200k_tokens` | `true` when total tokens exceed 200k (fixed threshold) |
| `rate_limits.five_hour.used_percentage` | % of 5-hour rate limit consumed (Pro/Max only) |
| `rate_limits.seven_day.used_percentage` | % of 7-day rate limit consumed (Pro/Max only) |
| `rate_limits.five_hour.resets_at` | Unix epoch when 5h window resets |
| `session_id` | Unique session identifier |
| `session_name` | Custom name set via `--name` or `/rename` (absent if unset) |
| `worktree.name` | Active worktree name (present only in `--worktree` sessions) |
| `worktree.branch` | Git branch of the worktree |
| `agent.name` | Active agent name when running with `--agent` (absent otherwise) |
| `vim.mode` | `NORMAL` or `INSERT` when vim mode is enabled (absent otherwise) |
| `version` | Claude Code version |

**Fields that may be absent** (not present in JSON): `session_name`, `vim`, `agent`, `worktree`, `rate_limits`.
**Fields that may be `null`**: `context_window.current_usage` (before first API call), `used_percentage` early in session.

Always use `// 0` or `// empty` fallbacks in jq, `.get('field', 0) or 0` in Python.

---

## Two-Line Display

Each `printf '%b\n'` or `echo` statement produces a **separate row** in the status area. Use this to pack more information without truncation.

**Current AICodePath layout** (implemented in `.aicodepath/scripts/statusline.sh`):

```
Line 1: [Sonnet] 📁 aicodepath-tool | 🌿 main +2 ~5 | 🔀 worktree | 🤖 agent | CONSTRUCTION
Line 2: ████████░░ 45% | $0.0042 | ⏱ 8m 23s (API: 45s) | +156 -23
```

**To modify the statusline**, edit `.aicodepath/scripts/statusline.sh` directly. The script is structured in four sections:
1. **Parse fields** — extract all JSON values from stdin
2. **Line 1** — identity: model, directory, git branch, worktree, agent, AIDLC phase
3. **Line 2** — metrics: context bar, cost, duration, lines changed
4. **Output** — `printf '%b\n' "$LINE1"` then `printf '%b\n' "$LINE2"`

After editing, test immediately:
```bash
echo '{"model":{"display_name":"Sonnet"},"context_window":{"used_percentage":45},"cost":{"total_cost_usd":0.0042,"total_duration_ms":503000,"total_api_duration_ms":45000,"total_lines_added":156,"total_lines_removed":23}}' | bash ~/.aicodepath/statusline.sh
```

Test with a z.ai fixture to verify provider detection:
```bash
cat .aicodepath/__tests__/fixtures/statusline/test-zai.json | bash ~/.aicodepath/statusline.sh
```
Expected: line 1 shows `GLM-4.7`, no `5h:` or `7d:` rate-limit segment on line 2.

---

## Cost and Duration Fields

| Field | What it measures | Use case |
|-------|-----------------|----------|
| `cost.total_cost_usd` | Total API spend this session | Session budget tracking |
| `cost.total_duration_ms` | Wall-clock time (session start → now) | Total session length |
| `cost.total_api_duration_ms` | Time blocked waiting for API | API latency vs thinking time split |
| `cost.total_lines_added` | Lines added across all file writes | Productivity signal |
| `cost.total_lines_removed` | Lines removed | Code churn awareness |

**Wall-clock vs API latency**: `total_duration_ms - total_api_duration_ms` = time spent reading, planning, and local tool execution (not billable wait).

---

## Recommended Additional Fields

These fields are available but not in the default AICodePath statusline. Add them based on workflow needs:

### Rate Limit Usage (Pro/Max subscribers only)
```bash
FIVE_H=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
WEEK=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
# Only render if present (field absent for API key users)
[ -n "$FIVE_H" ] && echo "Rate: 5h=$(printf '%.0f' $FIVE_H)% 7d=$(printf '%.0f' $WEEK)%"
```
Useful for: preventing rate limit surprises mid-session.

### Context Overflow Warning
```bash
EXCEEDS=$(echo "$input" | jq -r '.exceeds_200k_tokens // false')
[ "$EXCEEDS" = "true" ] && WARNING=" ⚠️ >200k" || WARNING=""
```
Useful for: alerting before context degrades.

### Cache Efficiency
```bash
CACHE_READ=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')
```
Useful for: verifying prompt caching is working (high `cache_read` = cost savings).

### Vim Mode
```bash
VIM=$(echo "$input" | jq -r '.vim.mode // empty')
[ -n "$VIM" ] && VIM_DISPLAY=" [${VIM}]" || VIM_DISPLAY=""
```
Useful for: vim mode users who want mode visible in the status area.

---

## Inline vs External Script

| Approach | When to use | Key constraint |
|----------|------------|----------------|
| Inline command | Simple one-liner (model + %) | Must be POSIX-compatible |
| External `.sh` script | Colors, multi-line, cost, git | Can use `#!/bin/bash`; POSIX restrictions don't apply |

For two-line display with colors and cost tracking, **always use an external script**.

---

## Caching Slow Operations

The script runs after every assistant message. `git status` is slow on large repos — cache it:

```bash
CACHE_FILE="/tmp/statusline-git-cache"   # FIXED name — never use $$ or PID
CACHE_MAX_AGE=5  # seconds

cache_is_stale() {
  [ ! -f "$CACHE_FILE" ] || \
  [ $(( $(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0) )) -gt $CACHE_MAX_AGE ]
}
```

**NEVER** use `$$` or `process.pid` for the cache filename — each invocation is a new process, so the cache is never reused.

---

## Debugging a Broken Statusline

| Symptom | Cause | Fix |
|---------|-------|-----|
| Statusline blank | Path is relative or script not executable | Use absolute path; `chmod +x statusline.sh` |
| Shows literal `${var:0:5}` | Bash substring syntax in inline command | Replace with `cut -c1-5` |
| ANSI codes print as text | `echo -e` in inline command | Use `printf '%b'` |
| Values never update | Script reads stale cache | Delete `/tmp/statusline-git-cache` |
| Wrong context % | Manual token math | Use pre-calculated `used_percentage` field |
| Only one line shows | Two `printf` calls in inline command | Move to external `.sh` script |
| Cost shows 0 | `cost` object null before first response | Use `// 0` fallback in jq |
| `rate_limits` absent | API key user (not Pro/Max) | Field only present for subscribers |
| Skipped with "workspace trust" message | Trust dialog not accepted | Restart Claude Code and accept trust prompt |
| Cost shows `$0.0000` for z.ai | `zai-adapter.js` not copied to `~/.aicodepath/lib/providers/` | Expected: cost segment absent. Check that `zai-adapter.js` is copied to `~/.aicodepath/lib/providers/` and returns `null` for `cost_usd`. |
| Rate limit segment missing for z.ai | z.ai does not expose rate limits | Expected behavior — z.ai does not expose rate limits. Segment is intentionally omitted when `rate_limits.five_hour` is null. |

Run `claude --debug` to see the exit code and stderr from the first statusline invocation.

---

## NEVER

- **NEVER** use bash-specific syntax in the inline `statusLine.command` — it runs under `sh` and fails silently.
- **NEVER** use a relative path in `settings.json` — statusline runs from a different working directory.
- **NEVER** use `echo -e` in inline commands for ANSI codes — use `printf '%b'` instead.
- **NEVER** use `$$` or any process identifier as a cache filename — each invocation is a new process.
- **NEVER** calculate context % manually from raw token fields — use `used_percentage` (input tokens only, pre-calculated).
- **NEVER** put two-line display in an inline command — use an external script for multi-line output.
