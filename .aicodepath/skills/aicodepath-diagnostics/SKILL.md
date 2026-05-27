---
name: aicodepath-diagnostics
description: Run AICodePath health check — diagnoses hooks, skills, DB, and MCP issues with fix guidance.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash
argument-hint: ""
---

# AICodePath Diagnostics

Run a full system health check, then use this guide to interpret and fix what the output reports. Running the script is trivial — **interpreting the results** is where expert knowledge matters.

---

## Run the Check

```bash
bash .aicodepath/scripts/diagnostics.sh
```

Output uses: `✓ HEALTHY` / `⚠ DEGRADED` / `✗ FAILED`

---

## Interpreting Failures by Component

### Hooks — FAILED or DEGRADED

| Symptom | Non-obvious cause | Fix |
|---------|------------------|-----|
| Hook registered but not firing | Path in `settings.json` is relative, not absolute | Replace with absolute path; re-run `node .aicodepath/bin/aicodepath.js init` |
| Hook fires but produces no output | Exit code 0 — passes silently by design | Add `logger.info()` to confirm execution; check exit code logic |
| Hook fires but blocks everything | Unhandled exception causes exit 2 | Check `.aicodepath/logs/` for stack trace |
| PreToolUse hook skips for some files | `file_patterns` exclusion too broad | Inspect the rule's `file_patterns` array in the guideline JSON |
| Swarm hooks never fire | `isEnabled('swarm')` returns false | Run `node .aicodepath/bin/aicodepath.js features enable swarm` |

**Critical distinction**: Always check `.claude/settings.json` (active config), NOT `hooks.json` at the project root (legacy, ignored).

### Skills — FAILED or not loading

| Symptom | Non-obvious cause | Fix |
|---------|------------------|-----|
| Skill doesn't appear in Claude's list | Symlink in `.claude/skills/` is missing or broken | Run `node .aicodepath/bin/aicodepath.js init` to regenerate symlinks |
| Skill appears but never triggers | `description` field lacks trigger keywords | Update description with specific "Use when..." scenarios |
| Skill triggers but does nothing | `user-invocable: false` in frontmatter | Set `user-invocable: true` |
| Frontmatter parse error | `disable-model-invocation: false---` (delimiter merged into value) | Add newline before closing `---` |

### Database — DEGRADED or FAILED

| Symptom | Cause | Fix |
|---------|-------|-----|
| DB not found | Never initialised | Run `bash .aicodepath/scripts/init-knowledge-base.sh` |
| Schema mismatch | Migrations not run | Run `node .aicodepath/bin/aicodepath.js migrate` |
| FTS5 unavailable | SQLite compiled without FTS5 | Search falls back to LIKE — acceptable degraded mode |
| DB locked | Another process holds write lock | Find and kill the process: `lsof aicodepath-docs/aicodepath.db` |

### MCP Servers — FAILED

MCP connectivity failures are usually config, not network:

1. Check `.mcp.json` exists: `cat .mcp.json`
2. If missing, regenerate: `node .aicodepath/bin/aicodepath.js init`
3. Check the server command resolves: run the `command` from `.mcp.json` manually
4. Verify env vars the server needs are set in `.env.aicodepath`

---

## NEVER

- **NEVER** look at `hooks.json` at project root to diagnose hook issues — it's legacy. The active config is `.claude/settings.json`.
- **NEVER** assume a `⚠ DEGRADED` DB status means data is lost — DEGRADED usually means FTS5 is unavailable (search falls back to LIKE, which still works).
- **NEVER** delete and re-create the DB to fix a schema issue — run migrations first. Re-creation loses all session history.
- **NEVER** diagnose skill-loading issues by checking the `.aicodepath/skills/` directory — check the symlinks in `.claude/skills/` instead. That's what Claude Code reads.

---

## After Fixing

Re-run diagnostics to confirm all components show HEALTHY before resuming work:

```bash
bash .aicodepath/scripts/diagnostics.sh
```

If a component stays DEGRADED after fixing, check `.aicodepath/logs/` for the most recent error trace.
