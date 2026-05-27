# Troubleshooting

Common issues and how to fix them.

---

## Diagnostics First

Before anything else, run the full health check:

```
/aicodepath-diagnostics
```

This checks hooks, skills, DB, MCP config, and environment in one pass and suggests fixes.

---

## Hooks Not Firing

**Symptoms:** No "Validating guideline compliance..." status messages. No GICL feedback after writes.

**Cause 1: settings.json not generated**
```bash
node .aicodepath/bin/aicodepath.js init
cat .claude/settings.json  # Verify hooks appear with absolute paths
```

**Cause 2: Hook paths are wrong**
```bash
# Check that paths in settings.json point to existing files
cat .claude/settings.json | grep "command" | head -5
ls .aicodepath/hooks/session-start-hook.js  # Should exist
```

**Cause 3: CLAUDE_PLUGIN_ROOT not resolved**
The `init` command resolves `${CLAUDE_PLUGIN_ROOT}` to absolute paths. If you moved the project directory after init, re-run init:
```bash
node .aicodepath/bin/aicodepath.js init
```

---

## Skills Not Loading

**Symptom:** `/aicodepath-brainstorm` returns "skill not found" or similar.

```bash
# Check symlinks
ls -la .claude/skills/

# If symlinks are broken or missing, re-run init
node .aicodepath/bin/aicodepath.js init

# Verify skill file exists
ls .aicodepath/skills/aicodepath-brainstorm/SKILL.md
```

---

## DB Errors

**Symptom:** "Failed to connect to database", "table not found", or similar.

**Re-initialize the database:**
```bash
bash .aicodepath/scripts/init-knowledge-base.sh
```

**If DB is corrupted:**
```bash
# Back up and recreate
mv aicodepath-docs/aicodepath.db aicodepath-docs/aicodepath.db.bak
bash .aicodepath/scripts/init-knowledge-base.sh
```

**Check DB path:**
```bash
node -e "const p = require('./.aicodepath/lib/path-resolver'); console.log(p.getDbPath())"
```

Set `AICODEPATH_DB_PATH` env var to override if the default path is wrong.

---

## GICL Score Always 0

**Cause 1: No active GICL session**
GICL lite mode runs for files without an active session. To get full scores:
```
/aicodepath-gicl-start
```

**Cause 2: DB unavailable**
See DB Errors section above.

**Cause 3: GICL disabled**
```bash
node .aicodepath/bin/aicodepath.js features list | grep gicl
# If disabled:
node .aicodepath/bin/aicodepath.js features enable gicl
```

---

## Guideline Validator Blocking Legitimate Code

**Symptom:** Write blocked with `exit 2` on code that should be allowed.

**Step 1: Identify which rule triggered**
The block message includes the rule ID. Check `.aicodepath/docs/guidelines/` for the rule's intent.

**Step 2: Check for false positives**
```bash
# Run false-positive tests
node .aicodepath/__tests__/guideline-validator-false-positives.test.js
```

**Step 3: Bypass for chicken-and-egg situations**
To write a fix for a broken hook, use `node -e` via Bash tool to bypass the Write hook:
```bash
node -e "
const fs = require('fs');
fs.writeFileSync('.aicodepath/hooks/my-hook.js', \`your content\`);
"
```

**Step 4: For legitimate stubs in non-test code**
Add to the file:
```javascript
// aicodepath: allow-stub
```

---

## Session Resume Not Working

**Symptom:** `/aicodepath-resume` says no checkpoint found.

```bash
# Check if checkpoints exist
ls aicodepath-docs/checkpoints/
cat aicodepath-docs/checkpoints/latest.json

# If missing, checkpoints were never created — start fresh
/aicodepath-knowledge
```

---

## Visual Memory Not Loading

**Symptom:** No diagram context in Claude's responses; schema-related hallucinations.

```bash
# Regenerate diagrams
/aicodepath-visual-memory --type all

# Verify schema context file
cat .claude/rules/schema-context.md | head -20

# Check visual_memory feature flag
node .aicodepath/bin/aicodepath.js features list | grep visual_memory
```

---

## Dashboard Not Starting

**Symptom:** `node .aicodepath/bin/aicodepath.js dashboard start` fails or shows no data.

```bash
# Check if port 3899 is in use
lsof -i :3899

# Try different port
AICODEPATH_PORT=3900 node .aicodepath/bin/aicodepath.js dashboard start

# Check dashboard logs
cat .aicodepath/logs/dashboard.log
```

For development mode with hot reload:
```bash
cd .aicodepath/templates/dashboard
npm install
npm run dev  # Uses Vite dev server, proxies API to port 3888
```

---

## Swarm Not Working

**Symptom:** `/aicodepath-swarm` says feature unavailable.

```bash
# Check feature flag
node .aicodepath/bin/aicodepath.js features info swarm

# Enable swarm
node .aicodepath/bin/aicodepath.js features enable swarm

# Also requires this env var in Claude Code settings
echo "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
```

---

## Statusline Shows Wrong Values

**Symptom:** Statusline shows `N/A` or incorrect phase/score.

The statusline command runs with `sh` (POSIX shell), not `bash`. Check for bash-specific syntax:
- No `${var:0:len}` — use `echo "$var" | cut -c1-N`
- No `for ((i=0; i<n; i++))` — use `while [ $i -lt $n ]`
- No `str+="text"` — use `str="${str}text"`

```
/aicodepath-statusline
```

Skill provides guided configuration and POSIX-compatible examples.

---

## Performance: Hooks Running Slowly

**Symptom:** Every write takes 5+ seconds due to hook validation.

**Disable expensive hooks temporarily:**
```bash
node .aicodepath/bin/aicodepath.js features disable duplication_checker
node .aicodepath/bin/aicodepath.js features disable schema_context
```

**Re-enable after your session:**
```bash
node .aicodepath/bin/aicodepath.js features enable duplication_checker
node .aicodepath/bin/aicodepath.js features enable schema_context
```

---

## Getting More Help

```
/aicodepath-help
```

Contextual help based on current phase and what you're trying to do.

```
/aicodepath-diagnostics
```

Full environment health check with specific fix suggestions.

For issues with AICodePath itself (not your project), check `.aicodepath/logs/` for structured error logs.
