#!/bin/bash
# AICodePath Dashboard Initialization Script
# Copies dashboard files to target project's aicodepath-docs/dashboard/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect if we're in v2 (.aicodepath/scripts) structure
if [[ "$SCRIPT_DIR" == *".aicodepath/scripts"* ]]; then
    # V2 structure: .aicodepath/scripts
    AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"
    PROJECT_ROOT="$(dirname "$AICODEPATH_ROOT")"
else
    # V1 structure: scripts in project root
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    AICODEPATH_ROOT="$PROJECT_ROOT"
fi

# Find the actual aicodepath-tool directory (where templates live)
# This could be:
# 1. If .aicodepath is a symlink, follow it
# 2. If .aicodepath is a directory, use it
if [ -L "$AICODEPATH_ROOT" ]; then
    TEMPLATE_ROOT="$(readlink -f "$AICODEPATH_ROOT")"
else
    TEMPLATE_ROOT="$AICODEPATH_ROOT"
fi

# Dashboard template is now inside .aicodepath/templates/
DASHBOARD_TEMPLATE="$TEMPLATE_ROOT/templates/dashboard"
DASHBOARD_TARGET="$PROJECT_ROOT/aicodepath-docs/dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AICodePath Dashboard Initialization   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Check if template exists
if [ ! -d "$DASHBOARD_TEMPLATE" ]; then
    echo -e "${RED}Error: Dashboard template not found at $DASHBOARD_TEMPLATE${NC}"
    echo "Please ensure aicodepath-tool is properly installed."
    exit 1
fi

# Create aicodepath-docs directory if needed
if [ ! -d "$PROJECT_ROOT/aicodepath-docs" ]; then
    echo -e "${YELLOW}Creating aicodepath-docs directory...${NC}"
    mkdir -p "$PROJECT_ROOT/aicodepath-docs"
fi

# Check if dashboard already exists
if [ -d "$DASHBOARD_TARGET" ]; then
    echo -e "${YELLOW}Dashboard already exists at $DASHBOARD_TARGET${NC}"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Dashboard initialization cancelled."
        exit 0
    fi
    rm -rf "$DASHBOARD_TARGET"
fi

# Copy dashboard files
echo -e "${BLUE}Copying dashboard files...${NC}"
mkdir -p "$DASHBOARD_TARGET"

# Copy all files except node_modules
rsync -a --exclude 'node_modules' "$DASHBOARD_TEMPLATE/" "$DASHBOARD_TARGET/"

echo -e "${GREEN}✓ Dashboard files copied${NC}"

# Create necessary directories
echo -e "${BLUE}Creating dashboard directories...${NC}"
mkdir -p "$DASHBOARD_TARGET/api"
mkdir -p "$DASHBOARD_TARGET/src"
mkdir -p "$DASHBOARD_TARGET/public"

echo -e "${GREEN}✓ Dashboard directories created${NC}"

# Add dashboard to .gitignore if not already present
echo -e "${BLUE}Updating .gitignore...${NC}"
GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"

add_to_gitignore() {
    local pattern=$1

    # Create .gitignore if it doesn't exist
    if [ ! -f "$GITIGNORE_FILE" ]; then
        echo "# AICodePath Dashboard" > "$GITIGNORE_FILE"
        echo "$pattern" >> "$GITIGNORE_FILE"
        echo -e "${GREEN}✓ Created .gitignore and added $pattern${NC}"
        return
    fi

    # Check if pattern already exists
    if grep -qxF "$pattern" "$GITIGNORE_FILE"; then
        echo -e "${BLUE}  $pattern already in .gitignore${NC}"
        return
    fi

    # Add pattern to .gitignore
    echo "" >> "$GITIGNORE_FILE"
    echo "# AICodePath Dashboard" >> "$GITIGNORE_FILE"
    echo "$pattern" >> "$GITIGNORE_FILE"
    echo -e "${GREEN}✓ Added $pattern to .gitignore${NC}"
}

# Add dashboard node_modules to .gitignore
add_to_gitignore "aicodepath-docs/dashboard/node_modules/"

# Install npm dependencies
echo
echo -e "${BLUE}Installing npm dependencies...${NC}"

if command -v npm >/dev/null 2>&1; then
    cd "$DASHBOARD_TARGET"

    if npm install 2>&1 | tail -10 | grep -q "added\|up to date"; then
        echo -e "${GREEN}✓ npm dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠ npm install encountered some issues${NC}"
        echo -e "You may need to run manually: cd $DASHBOARD_TARGET && npm install"
    fi
else
    echo -e "${YELLOW}⚠ npm not found in PATH${NC}"
    echo -e "Please install Node.js and npm, then run: cd $DASHBOARD_TARGET && npm install"
fi

echo
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Dashboard Initialized!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo
echo -e "Dashboard location: ${BLUE}$DASHBOARD_TARGET${NC}"
echo
echo -e "Next steps (run in separate terminals):"
echo -e "  ${YELLOW}Terminal 1 - Start Dashboard UI:${NC}"
echo -e "    cd $DASHBOARD_TARGET"
echo -e "    npm run dev"
echo -e "    Open ${BLUE}http://localhost:3899${NC} in browser"
echo
echo -e "  ${YELLOW}Terminal 2 - Start API Backend (optional):${NC}"
echo -e "    cd $PROJECT_ROOT"
echo -e "    npm run api"
echo -e "    or: node .aicodepath/api/server.js"
echo -e "    API runs on ${BLUE}http://localhost:3001${NC}"
echo
echo -e "Or use the AICodePath CLI:"
echo -e "  ${YELLOW}acp dashboard${NC} - Launch dashboard (auto-installs if needed)"
echo
