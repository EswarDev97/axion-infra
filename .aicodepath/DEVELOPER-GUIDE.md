<!-- GENERATED FROM TEMPLATE — DO NOT EDIT. Run `acp init --render-docs` to regenerate. -->
<!-- TEMPLATE SOURCE — DO NOT edit this as a final doc. Run 'acp init --render-docs' to regenerate DEVELOPER-GUIDE.md. -->
# AICodePath Developer Guide

Quick reference for contributors working on the AICodePath framework.

For full details, see `.aicodepath/docs/developer/`.

---

## Platform Requirements

Linux / macOS: full support. Windows: partial — Node.js hooks work natively, `.sh` scripts require WSL 2 or Git Bash.

**Common requirements:** Node.js 18+, `python3` (or `AICODEPATH_PYTHON`), Claude Code installed.

See `docs/developer/platform-notes.md` for Windows-specific fallbacks and cross-platform coding rules (`platform-utils.js`, `os.tmpdir()`, no hardcoded paths).

---

## First Steps

```bash
# Initialize (creates symlinks, settings.json, DB, MCP config)
node .aicodepath/bin/aicodepath.js init

# Install git hooks
bash .aicodepath/scripts/install-git-hooks.sh

# Validate structure
bash .aicodepath/scripts/validate-structure.sh

# Test
node .aicodepath/bin/aicodepath.js --help
```

---

## Critical Rules

### Spec First
Before implementing any hook, skill, or agent behavior, use the live docs — not the local snapshot:

| Surface | URL |
|---------|-----|
| Hooks reference | https://docs.anthropic.com/en/docs/claude-code/hooks |
| Hooks quickstart | https://docs.anthropic.com/en/docs/claude-code/hooks-guide |
| Skills | https://docs.anthropic.com/en/docs/claude-code/skills |
| Slash commands | https://docs.anthropic.com/en/docs/claude-code/slash-commands |
| Agents | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| Prompting best practices | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices |
| Changelog | https://docs.anthropic.com/en/release-notes/claude-code |

Offline fallback: `.aicodepath/claude-code-official-spec.md` (hooks only, February 2026 snapshot).

---

## Quick Task Reference

### Add a hook
1. Create `.aicodepath/hooks/my-hook.js` (see `docs/developer/hook-authoring.md`)
2. Add entry to BOTH `.aicodepath/hooks/hooks.json` AND `.aicodepath/templates/claude-settings.json.template`, then run `node .aicodepath/bin/aicodepath.js init` to regenerate `settings.json`

### Add a skill
1. Create `.aicodepath/skills/my-skill/SKILL.md` (see `docs/developer/skill-authoring.md`)
2. Run `node .aicodepath/bin/aicodepath.js init` to create symlink in `.claude/skills/`

### Add an agent
1. Create `.aicodepath/agents/my-agent.md` (see `docs/developer/agent-authoring.md`)
2. Run `node .aicodepath/bin/aicodepath.js init` to create symlink in `.claude/agents/`
3. Verify: `node .aicodepath/bin/aicodepath.js agent list`

### Refactoring

When renaming a widely-imported module, create a re-export shim at the old path before updating importers:

```javascript
// old-module-name.js — re-export shim
module.exports = require('./new-module-name');
```

This preserves backward compatibility for external tools, scripts, and any consumer not tracked in the codebase. Mass-rename without a shim breaks all external references silently.

### Add a guideline rule
1. Edit the appropriate `.aicodepath/guidelines/*.json` file (see `docs/developer/guideline-authoring.md`)
2. Test for false positives: `node .aicodepath/__tests__/guideline-validator-false-positives.test.js`

### Add a DB migration
1. Create `.aicodepath/db/migrations/0NN_description.sql`
2. Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
3. Run `node .aicodepath/bin/aicodepath.js init-db` to apply (or `bash .aicodepath/scripts/init-knowledge-base.sh` on Unix)

---

## Pre-Commit Checklist

- [ ] Files in `.aicodepath/` (not root)
- [ ] Using `path-resolver.js` (no hardcoded paths)
- [ ] Using `logger` (no `console.error`)
- [ ] Updated `codebase-map.md` for new files
- [ ] Ran `validate-structure.sh`
- [ ] Tested: `node .aicodepath/bin/aicodepath.js --help`

---

## Authoring Guides

| Topic | File |
|-------|------|
| Writing hooks | `docs/developer/hook-authoring.md` |
| Writing skills | `docs/developer/skill-authoring.md` |
| Writing agents | `docs/developer/agent-authoring.md` |
| Writing guideline rules | `docs/developer/guideline-authoring.md` |

---

## Version History

Current: **2.12.0** — 109 agents, 103 skills, 43 hooks.

Full release history: `.aicodepath/docs/CHANGELOG.md`.
