# Hooks — UserPromptSubmit

Covers: `pre-flight-check.js`, `plan-role-activator.js`

UserPromptSubmit hooks fire when the user submits a message, before Claude processes it. They can inject context that shapes Claude's response.

---

## pre-flight-check.js

**Event:** `UserPromptSubmit`
**File:** `.aicodepath/hooks/pre-flight-check.js`

**Purpose:** Verify that required Claude Code plugins and MCP servers are installed before the workflow begins. Informs Claude about missing dependencies so it can guide the user.

**Required plugins checked:**
| Plugin ID | Purpose |
|-----------|---------|
| `frontend-design@claude-plugins-official` | UI component generation |
| `github@claude-plugins-official` | GitHub integration |
| `context7@claude-plugins-official` | Up-to-date library docs |
| `code-review@claude-plugins-official` | Code review automation |
| `commit-commands@claude-plugins-official` | Git commit helpers |
| `feature-dev@claude-plugins-official` | 7-phase feature development |
| `pr-review-toolkit@claude-plugins-official` | PR analysis |

**Auto-detected language plugins:**
| Language | Indicator files | Plugin |
|----------|----------------|--------|
| TypeScript/JS | `tsconfig.json`, `package.json`, `*.ts` | `typescript@claude-plugins-official` |
| Python | `requirements.txt`, `setup.py`, `*.py` | `python@claude-plugins-official` |
| Go | `go.mod`, `go.sum` | `go@claude-plugins-official` |
| Rust | `Cargo.toml` | `rust@claude-plugins-official` |

**Optional plugins:** `linear@claude-plugins-official` (issue tracking)

**Output (all good):**
```json
{ "success": true }
```

**Output (missing plugins):**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "PRE-FLIGHT WARNING: Missing plugins detected:\n- github@claude-plugins-official: GitHub integration\n\nInstall via Claude Code settings before proceeding."
  }
}
```

**Note:** This hook is non-blocking — it informs rather than stops execution. The `/aicodepath-preflight` skill is the blocking version with full validation.

---

## plan-role-activator.js

**Event:** `UserPromptSubmit`
**File:** `.aicodepath/hooks/plan-role-activator.js`

**Purpose:** Detect when a user starts a new task or phase, read the active plan to extract current task keywords, match them against agent role `triggers` frontmatter, and inject the best-fit agent role as `additionalContext`.

**Phase-start signal detection patterns:**
```
Task ID references:  /\b[A-Z]\d*-\d+\b/   (e.g. P2-1, D-1, B-3)
Task boundaries:     "start task", "next task", "begin task"
Implementation:      "let's implement", "implement the"
Planning:            "write plan", "write a plan"
Requirements:        "requirements for", "begin requirements"
Design:              "design the"
```

**How it works:**
1. Checks user prompt against phase-start patterns
2. If matched, reads `aicodepath-docs/plan/` for the active plan
3. Extracts current task keywords from plan
4. Scans `.aicodepath/agents/*.md` files for matching `triggers` frontmatter
5. Injects the best-match agent's instructions as `additionalContext`
6. Tracks injected roles per session to avoid re-injecting

**Output:**
```json
{
  "hookSpecificOutput": {
    "additionalContext": "## Active Role: Backend Architect\n\n[agent instructions...]"
  }
}
```

**No-op conditions:**
- Prompt doesn't match any phase-start pattern
- No active plan found
- Role already injected this session
- No matching agent found for current task

---

## Adding New UserPromptSubmit Hooks

See `developer/hook-authoring.md` for the full pattern. Key points for UserPromptSubmit:

1. Read from `hookData.prompt` (the user's message text)
2. Use `hookSpecificOutput.additionalContext` to inject information
3. Keep processing fast (< 200ms) — users feel this latency
4. Always fail-safe — never block on dependency errors
