#!/bin/bash
# update-dashboard-config.sh
# Sync dashboard configuration from template to installed project
# Useful when template changes need to be applied to existing installations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AICodePath Dashboard Config Updater          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Check if running from installed project or template
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == *"/aicodepath-tool/.aicodepath/scripts"* ]]; then
  echo -e "${RED}✗ Error: This script must be run from an INSTALLED project${NC}"
  echo -e "${YELLOW}  Usage: bash .aicodepath/scripts/update-dashboard-config.sh${NC}"
  exit 1
fi

# Find template source — prefer AICODEPATH_TOOL_ROOT env var, then walk up from SCRIPT_DIR
if [[ -n "$AICODEPATH_TOOL_ROOT" ]]; then
  TEMPLATE_SOURCE="$AICODEPATH_TOOL_ROOT/.aicodepath/templates/dashboard/vite.config.ts"
else
  # Heuristic: look for aicodepath-tool adjacent to current install root
  CANDIDATE="$(dirname "$(dirname "$SCRIPT_DIR")")/aicodepath-tool/.aicodepath/templates/dashboard/vite.config.ts"
  TEMPLATE_SOURCE="$CANDIDATE"
fi
if [[ ! -f "$TEMPLATE_SOURCE" ]]; then
  echo -e "${RED}✗ Error: Template source not found.${NC}"
  echo -e "${YELLOW}  Set AICODEPATH_TOOL_ROOT to the aicodepath-tool repository path and retry.${NC}"
  echo -e "${YELLOW}  Example: AICODEPATH_TOOL_ROOT=~/workspace/aicodepath-tool bash .aicodepath/scripts/update-dashboard-config.sh${NC}"
  exit 1
fi

# Find installed dashboard config
INSTALLED_CONFIG="$SCRIPT_DIR/../../aicodepath-docs/dashboard/vite.config.ts"
if [[ ! -f "$INSTALLED_CONFIG" ]]; then
  echo -e "${RED}✗ Error: Installed dashboard config not found at $INSTALLED_CONFIG${NC}"
  exit 1
fi

# Create backup
BACKUP_DIR="$SCRIPT_DIR/../../aicodepath-docs/dashboard/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/vite.config.ts.$(date +%Y%m%d_%H%M%S).backup"
cp "$INSTALLED_CONFIG" "$BACKUP_FILE"
echo -e "${BLUE}📦 Created backup: $BACKUP_FILE${NC}"

# Extract port from template
TEMPLATE_API_PORT=$(grep -A 1 "'/api':" "$TEMPLATE_SOURCE" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")
TEMPLATE_WS_PORT=$(grep -A 2 "'/ws':" "$TEMPLATE_SOURCE" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")

# Extract port from installed config
INSTALLED_API_PORT=$(grep -A 1 "'/api':" "$INSTALLED_CONFIG" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")
INSTALLED_WS_PORT=$(grep -A 2 "'/ws':" "$INSTALLED_CONFIG" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")

echo -e "${BLUE}Current configuration:${NC}"
echo -e "  API Port:       $INSTALLED_API_PORT"
echo -e "  WebSocket Port: $INSTALLED_WS_PORT"
echo
echo -e "${BLUE}Template configuration:${NC}"
echo -e "  API Port:       $TEMPLATE_API_PORT"
echo -e "  WebSocket Port: $TEMPLATE_WS_PORT"
echo

if [[ "$INSTALLED_API_PORT" == "$TEMPLATE_API_PORT" && "$INSTALLED_WS_PORT" == "$TEMPLATE_WS_PORT" ]]; then
  echo -e "${GREEN}✓ Configuration is already up-to-date!${NC}"
  exit 0
fi

# Update configuration
echo -e "${YELLOW}→ Updating configuration...${NC}"
sed -i "s|target: 'http://localhost:$INSTALLED_API_PORT'|target: 'http://localhost:$TEMPLATE_API_PORT'|g" "$INSTALLED_CONFIG"
sed -i "s|target: 'ws://localhost:$INSTALLED_WS_PORT'|target: 'ws://localhost:$TEMPLATE_WS_PORT'|g" "$INSTALLED_CONFIG"

# Verify changes
UPDATED_API_PORT=$(grep -A 1 "'/api':" "$INSTALLED_CONFIG" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")
UPDATED_WS_PORT=$(grep -A 2 "'/ws':" "$INSTALLED_CONFIG" | grep "target:" | sed -E "s/.*localhost:([0-9]+).*/\1/")

if [[ "$UPDATED_API_PORT" == "$TEMPLATE_API_PORT" && "$UPDATED_WS_PORT" == "$TEMPLATE_WS_PORT" ]]; then
  echo -e "${GREEN}✓ Configuration updated successfully!${NC}"
  echo
  echo -e "${BLUE}Updated configuration:${NC}"
  echo -e "  API Port:       $UPDATED_API_PORT"
  echo -e "  WebSocket Port: $UPDATED_WS_PORT"
  echo
  echo -e "${YELLOW}→ Restart dashboard services to apply changes:${NC}"
  echo -e "  bash .aicodepath/scripts/stop-dashboard.sh"
  echo -e "  bash .aicodepath/scripts/start-dashboard.sh"
else
  echo -e "${RED}✗ Configuration update failed!${NC}"
  echo -e "${YELLOW}→ Restoring backup...${NC}"
  cp "$BACKUP_FILE" "$INSTALLED_CONFIG"
  echo -e "${GREEN}✓ Backup restored${NC}"
  exit 1
fi
