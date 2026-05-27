---
name: aicodepath-init
description: Initialize AICodePath — creates symlinks, generates settings.json, sets up DB and MCP config.
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[project-name] [--plugin]"
---

# AICodePath Init

Initialize or repair the AICodePath environment. The expert knowledge here is understanding **what init actually sets up** and what can go wrong if it's run at the wrong time or skipped.

---

## What Init Does (and Why It Matters)

| Step | What gets created | Why it matters |
|------|------------------|----------------|
| Symlink skills | `.claude/skills/<name>` → `.aicodepath/skills/<name>/` | Claude Code reads `.claude/`, not `.aicodepath/` |
| Symlink agents | `.claude/agents/<name>` → `.aicodepath/agents/<name>.md` | Same — agents only load from `.claude/agents/` |
| Generate settings | `.claude/settings.json` with absolute hook paths | Relative paths in hook config silently fail |
| Generate MCP config | `.mcp.json` from `config.json` MCP entries | Without this, MCP servers aren't available |
| Create env file | `.env.aicodepath` with documented variables | Without it, DB path and feature flags use defaults |
| Init DB | Runs migrations to create all 42 tables | Without this, GICL sessions and checkpoints fail |

---

## When to Run Init

```bash
node .aicodepath/bin/aicodepath.js init
```

Run init when:
- Setting up on a new machine after `git clone`
- Hooks have stopped firing (settings.json may have stale paths)
- Skills are missing from Claude's list (symlinks may be broken)
- Adding a new hook or skill (run init to register it)
- After changing the project's root directory

**Before running init mid-session**: Check for an active GICL session first.

```bash
node .aicodepath/lib/gicl-session-manager.js active
```

Running init during an active GICL session resets the session pointer in `settings.json`. The DB session is preserved, but the hook loses its reference and the next iteration will create a new session instead of continuing the current one.

---

## Common Init Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| `Cannot find module './lib/path-resolver'` | Wrong working directory | Run from project root, not `.aicodepath/` |
| Symlinks created but skills still missing | Claude Code not restarted | Restart Claude Code to reload symlink registry |
| `settings.json` generated but hooks not firing | Old `settings.json` in `.claude/` was manually edited and merged wrongly | Delete `.claude/settings.json`, re-run init |
| DB init fails with permission error | `aicodepath-docs/` not writable | `chmod -R u+w aicodepath-docs/` |
| MCP config not generated | `config.json` missing `mcpServers` key | Add MCP entries to `config.json` first |

---

## Plugin Mode

```bash
node .aicodepath/bin/aicodepath.js init --plugin
```

Uses `plugin.json` manifest with `${CLAUDE_PLUGIN_ROOT}/` portable paths instead of absolute paths. Use this when distributing the project — absolute paths are machine-specific.

---

## NEVER

- **NEVER** run init with an active GICL session without first completing or pausing the session — the session pointer in `settings.json` gets overwritten.
- **NEVER** manually edit `.claude/settings.json` hook paths — they will be overwritten on the next `init`. Add hooks to `.aicodepath/hooks/` instead and re-run init.
- **NEVER** assume init is idempotent for the DB — running init on an already-initialised DB is safe (uses `CREATE TABLE IF NOT EXISTS`), but running `init-knowledge-base.sh` on an existing DB drops and recreates tables.
- **NEVER** run init from inside `.aicodepath/` — path-resolver uses `process.cwd()` and will resolve paths incorrectly.

---

## See Also

- `/aicodepath-diagnostics` — Verify environment after init
- `/aicodepath-resume` — Resume a prior session after init on a new machine
