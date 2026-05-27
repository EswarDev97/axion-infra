#!/bin/bash

# AICodePath System Diagnostics
# Checks hooks, skills, database, and MCP config health.
# Output uses: ✓ HEALTHY / ⚠ DEGRADED / ✗ FAILED

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$AICODEPATH_ROOT")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

healthy()  { echo -e "  ${GREEN}✓ HEALTHY${NC}  $1"; PASS=$((PASS+1)); }
degraded() { echo -e "  ${YELLOW}⚠ DEGRADED${NC} $1"; WARN=$((WARN+1)); }
failed()   { echo -e "  ${RED}✗ FAILED${NC}   $1"; FAIL=$((FAIL+1)); }

echo -e "\n${BOLD}AICodePath Diagnostics${NC}"
echo "Project root: $PROJECT_ROOT"
echo "AICodePath root: $AICODEPATH_ROOT"
echo "--------------------------------------------"

# ── 1. HOOKS ─────────────────────────────────────
echo -e "\n${BOLD}[1] Hooks${NC}"

SETTINGS="$PROJECT_ROOT/.claude/settings.json"
if [ ! -f "$SETTINGS" ]; then
  failed "settings.json not found at .claude/settings.json"
else
  HOOK_COUNT=$(node -e "
    const s = require('$SETTINGS');
    const hooks = s.hooks || {};
    let count = 0;
    for (const event of Object.values(hooks)) {
      if (Array.isArray(event)) count += event.length;
      else if (event && event.hooks) count += event.hooks.length;
    }
    console.log(count);
  " 2>/dev/null || echo "0")
  if [ "$HOOK_COUNT" -eq 0 ]; then
    failed "settings.json exists but contains no hooks"
  else
    healthy "$HOOK_COUNT hook(s) registered in .claude/settings.json"
  fi

  # Check hook files actually exist
  MISSING_HOOKS=$(node -e "
    const fs = require('fs');
    const s = require('$SETTINGS');
    const hooks = s.hooks || {};
    const missing = [];
    for (const [event, items] of Object.entries(hooks)) {
      const list = Array.isArray(items) ? items : (items.hooks || []);
      for (const h of list) {
        const cmd = h.command || '';
        const match = cmd.match(/node\s+([^\s]+\.js)/);
        if (match) {
          const p = match[1].replace('\${CLAUDE_PLUGIN_ROOT}', '$AICODEPATH_ROOT');
          if (!fs.existsSync(p)) missing.push(p);
        }
      }
    }
    console.log(missing.join('\n'));
  " 2>/dev/null || true)
  if [ -n "$MISSING_HOOKS" ]; then
    while IFS= read -r line; do
      failed "Hook file not found: $line"
    done <<< "$MISSING_HOOKS"
  fi
fi

# ── 2. SKILLS ────────────────────────────────────
echo -e "\n${BOLD}[2] Skills${NC}"

SKILLS_SYMLINK_DIR="$PROJECT_ROOT/.claude/skills"
SKILLS_SOURCE_DIR="$AICODEPATH_ROOT/skills"

if [ ! -d "$SKILLS_SYMLINK_DIR" ]; then
  failed ".claude/skills/ directory missing — run: node .aicodepath/bin/aicodepath.js init"
else
  SKILL_COUNT=$(ls "$SKILLS_SYMLINK_DIR" 2>/dev/null | wc -l | tr -d ' ')
  SOURCE_COUNT=$(ls "$SKILLS_SOURCE_DIR" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SKILL_COUNT" -eq 0 ]; then
    failed "No skills found in .claude/skills/ — run: node .aicodepath/bin/aicodepath.js init"
  elif [ "$SKILL_COUNT" -lt "$SOURCE_COUNT" ]; then
    degraded "$SKILL_COUNT/$SOURCE_COUNT skills symlinked — run: node .aicodepath/bin/aicodepath.js init"
  else
    healthy "$SKILL_COUNT skills symlinked in .claude/skills/"
  fi

  # Check for broken symlinks
  BROKEN=$(find "$SKILLS_SYMLINK_DIR" -maxdepth 1 -xtype l 2>/dev/null | wc -l | tr -d ' ')
  if [ "$BROKEN" -gt 0 ]; then
    failed "$BROKEN broken symlink(s) in .claude/skills/ — run: node .aicodepath/bin/aicodepath.js init"
  fi
fi

# ── 3. DATABASE ──────────────────────────────────
echo -e "\n${BOLD}[3] Database${NC}"

DB_PATH="$PROJECT_ROOT/aicodepath-docs/aicodepath.db"
if [ ! -f "$DB_PATH" ]; then
  failed "Database not found — run: bash .aicodepath/scripts/init-knowledge-base.sh"
else
  DB_SIZE=$(du -sh "$DB_PATH" 2>/dev/null | cut -f1)
  TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "ERROR")
  if [ "$TABLE_COUNT" = "ERROR" ]; then
    failed "Database exists but cannot be queried — may be corrupt or locked"
  else
    healthy "Database OK — $TABLE_COUNT tables, $DB_SIZE"
  fi

  # Check FTS5
  FTS5=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name LIKE '%_fts';" 2>/dev/null || echo "0")
  if [ "$FTS5" -eq 0 ]; then
    degraded "FTS5 not available — search falls back to LIKE (still functional)"
  else
    healthy "FTS5 indexes present ($FTS5 virtual tables)"
  fi
fi

# ── 4. MCP ───────────────────────────────────────
echo -e "\n${BOLD}[4] MCP Configuration${NC}"

MCP_PATH="$PROJECT_ROOT/.mcp.json"
if [ ! -f "$MCP_PATH" ]; then
  degraded ".mcp.json not found — run: node .aicodepath/bin/aicodepath.js init"
else
  SERVER_COUNT=$(node -e "
    const m = require('$MCP_PATH');
    const s = m.mcpServers || m.servers || {};
    console.log(Object.keys(s).length);
  " 2>/dev/null || echo "0")
  if [ "$SERVER_COUNT" -eq 0 ]; then
    degraded ".mcp.json exists but has no servers configured"
  else
    healthy "$SERVER_COUNT MCP server(s) configured"
  fi
fi

# ── 5. AGENTS ────────────────────────────────────
echo -e "\n${BOLD}[5] Agents${NC}"

AGENTS_SYMLINK_DIR="$PROJECT_ROOT/.claude/agents"
AGENTS_SOURCE_DIR="$AICODEPATH_ROOT/agents"

if [ ! -d "$AGENTS_SYMLINK_DIR" ]; then
  degraded ".claude/agents/ directory missing — run: node .aicodepath/bin/aicodepath.js init"
elif [ ! -d "$AGENTS_SOURCE_DIR" ]; then
  degraded ".aicodepath/agents/ source directory missing"
else
  AGENT_COUNT=$(ls "$AGENTS_SYMLINK_DIR" 2>/dev/null | wc -l | tr -d ' ')
  healthy "$AGENT_COUNT agent(s) symlinked in .claude/agents/"
fi

# ── SUMMARY ──────────────────────────────────────
echo ""
echo "--------------------------------------------"
TOTAL=$((PASS+WARN+FAIL))
echo -e "${BOLD}Results: $TOTAL checks — ${GREEN}$PASS HEALTHY${NC}, ${YELLOW}$WARN DEGRADED${NC}, ${RED}$FAIL FAILED${NC}"

if [ "$FAIL" -gt 0 ]; then
  echo -e "\nRun with: bash .aicodepath/scripts/diagnostics.sh"
  echo "Then use the diagnostics skill to interpret results."
  exit 1
elif [ "$WARN" -gt 0 ]; then
  exit 0
else
  echo -e "${GREEN}All systems operational.${NC}"
  exit 0
fi
