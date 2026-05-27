# Developer Guide — AICodePath Internals

This directory covers how to extend and maintain AICodePath itself.

---

## Quick Setup

```bash
# Initialize (creates symlinks, generates settings.json, sets up DB, MCP config)
node .aicodepath/bin/aicodepath.js init

# Install git hooks (blocks bad commits)
bash .aicodepath/scripts/install-git-hooks.sh

# Validate structure before committing
bash .aicodepath/scripts/validate-structure.sh

# Test your changes
node .aicodepath/bin/aicodepath.js --help
```

---

## Directory Map

| Purpose | Location |
|---------|----------|
| Hooks | `.aicodepath/hooks/` |
| Hook utilities | `.aicodepath/hooks/lib/` |
| Skills | `.aicodepath/skills/<name>/SKILL.md` |
| Agents | `.aicodepath/agents/<name>.md` |
| CLI commands | `.aicodepath/commands/` |
| Core libraries | `.aicodepath/lib/` |
| Scripts | `.aicodepath/scripts/` |
| Guidelines (JSON) | `.aicodepath/guidelines/` |
| Workflow rules (MD) | `.aicodepath/rules/` |
| Phase-specific workflows | `.aicodepath/rules/core/` |
| Templates / Dashboard | `.aicodepath/templates/dashboard/` |
| DB schemas + migrations | `.aicodepath/db/` |
| Logs | `.aicodepath/logs/` |
| Documentation | `.aicodepath/docs/` |

---

## Critical Rules

### 1. All tool files go in `.aicodepath/`

```
✅ .aicodepath/hooks/my-hook.js
✅ .aicodepath/skills/my-skill/SKILL.md
✅ .aicodepath/lib/my-library.js
✅ .aicodepath/commands/my-command.js

❌ hooks/my-hook.js
❌ skills/my-skill/
❌ agents/my-agent.md  (root)
```

### 2. Always use path-resolver.js

```javascript
const pathResolver = require('./lib/path-resolver');
const projectRoot = pathResolver.findProjectRoot();
const dbPath = pathResolver.getDbPath();
const hooksDir = pathResolver.hooks();
const aicodePathRoot = pathResolver.getAicodePathRoot();

// ❌ Never
const dbPath = 'aicodepath-docs/aicodepath.db';
const root = process.cwd();
```

### 3. Always use structured logging

```javascript
const logger = require('./lib/logger');

logger.info('Operation successful', { context: 'my-module', data: {} });
logger.error('Operation failed', { context: 'my-module', error: err.message });

// ❌ Never
console.error('Error');
console.log('Done');
```

### 4. Never use `appendToSystemPrompt`

This field does NOT exist in the Claude Code hook spec and is silently ignored.

**Valid hook output fields:**
- `hookSpecificOutput.additionalContext` — inject context (PreToolUse only)
- `decision` / `reason` — block/allow a tool (PreToolUse only)
- `systemMessage` — display a message to user
- `continue` / `stopReason` / `suppressOutput` — SessionStart only

---

## Authoring Guides

| Topic | File |
|-------|------|
| Writing hooks | `hook-authoring.md` |
| Writing skills | `skill-authoring.md` |
| Writing agents | `agent-authoring.md` |
| Writing guideline rules | `guideline-authoring.md` |

---

## After Making Changes

After adding/modifying any hook, skill, agent, or command, re-run init to update symlinks and `settings.json`:

```bash
node .aicodepath/bin/aicodepath.js init
```

After adding a new DB table, create a migration file:

```bash
# Convention: NNN_description.sql
touch .aicodepath/db/migrations/016_my_feature.sql
```

---

## Pre-Commit Checklist

- [ ] Files in `.aicodepath/` (not root)
- [ ] Using `path-resolver.js` (no hardcoded paths)
- [ ] Using `logger` (no `console.error`)
- [ ] Ran `validate-structure.sh`
- [ ] Tested: `node .aicodepath/bin/aicodepath.js --help`
- [ ] Updated `codebase-map.md` for new files/modules
