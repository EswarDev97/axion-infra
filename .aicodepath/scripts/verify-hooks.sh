#!/bin/bash
# Verify AICodePath Hook Configuration
#
# Checks if .claude/settings.json has all required hooks properly configured.
# Run this after installation or if experiencing database population issues.
#
# NOTE: Hooks must be defined INSIDE settings.json, not in a separate hooks.json file.
# This is required by Claude Code - see docs/guides/HOOKS-LOCATION-FIX.md

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(pwd)"
SETTINGS_FILE="$PROJECT_DIR/.claude/settings.json"

echo -e "${BLUE}=== AICodePath Hook Verification ===${NC}"
echo -e "Project: ${BLUE}$PROJECT_DIR${NC}"
echo ""

# Check if settings.json exists
if [ ! -f "$SETTINGS_FILE" ]; then
    echo -e "${RED}✗ FAILED: .claude/settings.json not found${NC}"
    echo ""
    echo "Hooks must be defined in .claude/settings.json (not hooks.json)"
    echo ""
    echo "Run installation first:"
    echo "  .aicodepath/scripts/install-v2.sh ."
    exit 1
fi

echo -e "${GREEN}✓ .claude/settings.json exists${NC}"
echo ""

# Required hooks
REQUIRED_HOOKS=(
    "auto-artifact-creator"
    "gicl-iteration-hook"
)

OPTIONAL_HOOKS=(
    "session-start-hook"
    "pre-flight-check"
    "guideline-validator"
)

# Check for required hooks
echo -e "${YELLOW}Checking required hooks...${NC}"
MISSING_HOOKS=()

for hook in "${REQUIRED_HOOKS[@]}"; do
    if grep -q "$hook" "$SETTINGS_FILE"; then
        echo -e "  ${GREEN}✓${NC} $hook (found)"
    else
        echo -e "  ${RED}✗${NC} $hook (NOT FOUND)"
        MISSING_HOOKS+=("$hook")
    fi
done

echo ""

# Check optional hooks
echo -e "${YELLOW}Checking optional hooks...${NC}"
for hook in "${OPTIONAL_HOOKS[@]}"; do
    if grep -q "$hook" "$SETTINGS_FILE"; then
        echo -e "  ${GREEN}✓${NC} $hook"
    else
        echo -e "  ${BLUE}ℹ${NC} $hook (optional, not configured)"
    fi
done

echo ""

# Verify hook scripts exist
echo -e "${YELLOW}Checking hook scripts...${NC}"
for hook in "${REQUIRED_HOOKS[@]}"; do
    HOOK_SCRIPT="$PROJECT_DIR/.aicodepath/hooks/$hook.js"
    if [ -f "$HOOK_SCRIPT" ]; then
        echo -e "  ${GREEN}✓${NC} $hook.js exists"
    else
        echo -e "  ${RED}✗${NC} $hook.js NOT FOUND"
        MISSING_HOOKS+=("$hook.js script missing")
    fi
done

echo ""

# Summary
if [ ${#MISSING_HOOKS[@]} -eq 0 ]; then
    echo -e "${GREEN}=== VERIFICATION PASSED ===${NC}"
    echo ""
    echo -e "${GREEN}All required hooks are properly configured!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your Claude Code session (hooks load at session start)"
    echo "  2. Create a file in aicodepath-docs/ to test auto-artifact creation"
    echo "  3. Run: sqlite3 aicodepath-docs/aicodepath.db \"SELECT * FROM artifacts\""
    echo ""
else
    echo -e "${RED}=== VERIFICATION FAILED ===${NC}"
    echo ""
    echo -e "${RED}Missing or misconfigured hooks:${NC}"
    for missing in "${MISSING_HOOKS[@]}"; do
        echo "  - $missing"
    done
    echo ""
    echo -e "${YELLOW}To fix this issue:${NC}"
    echo "  1. Read the hooks location fix guide:"
    echo "     docs/guides/HOOKS-LOCATION-FIX.md"
    echo ""
    echo "  2. Option 1: Use template (creates settings.json with hooks):"
    echo "     cp .aicodepath/templates/claude-settings.json.template .claude/settings.json"
    echo ""
    echo "  3. Option 2: Re-run installation:"
    echo "     .aicodepath/scripts/install-v2.sh ."
    echo ""
    echo "  Note: Hooks must be INSIDE settings.json, not in a separate hooks.json file"
    echo ""
    exit 1
fi
