#!/bin/bash
# AICodePath Central Installation Script
# Installs AICodePath to a central location and provides project setup instructions
#
# Usage: ./scripts/install-central.sh [install_dir]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="${1:-$HOME/.aicodepath}"
REPO_URL="https://github.com/febrahim-driod/aicodepath-tool.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}=== AICodePath Central Installation ===${NC}"
echo ""

# Check if running from repo or fresh install
# Support both v1 (scripts in root) and v2 (.aicodepath/scripts) structures
if [[ "$SCRIPT_DIR" == *".aicodepath/scripts"* ]]; then
    # V2 structure
    SOURCE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
    INSTALL_TYPE="local"
    echo -e "${BLUE}Running from local repository (v2 structure)${NC}"
elif [ -d "$SCRIPT_DIR/../rules" ]; then
    # V1 structure
    SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
    INSTALL_TYPE="local"
    echo -e "${BLUE}Running from local repository (v1 structure)${NC}"
else
    echo -e "${BLUE}Will clone from: $REPO_URL${NC}"
    INSTALL_TYPE="remote"
fi

echo -e "Install location: ${CYAN}$INSTALL_DIR${NC}"
echo ""

# Confirm installation
read -p "Proceed with installation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Install or update
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Existing installation found. Updating...${NC}"
    if [ "$INSTALL_TYPE" = "remote" ]; then
        cd "$INSTALL_DIR"
        git pull origin main
    else
        # Copy from local source
        rsync -av --exclude='.git' --exclude='aicodepath-docs' "$SOURCE_DIR/" "$INSTALL_DIR/"
    fi
    echo -e "${GREEN}✓ Updated existing installation${NC}"
else
    echo -e "${YELLOW}Installing AICodePath...${NC}"
    if [ "$INSTALL_TYPE" = "remote" ]; then
        git clone "$REPO_URL" "$INSTALL_DIR"
    else
        mkdir -p "$INSTALL_DIR"
        rsync -av --exclude='.git' --exclude='aicodepath-docs' "$SOURCE_DIR/" "$INSTALL_DIR/"
    fi
    echo -e "${GREEN}✓ Installation complete${NC}"
fi

# Make scripts executable
chmod +x "$INSTALL_DIR/scripts/"*.sh 2>/dev/null || true

echo ""
echo -e "${CYAN}=== Installation Complete ===${NC}"
echo ""
echo -e "${GREEN}AICodePath installed to:${NC} $INSTALL_DIR"
echo ""
echo -e "${YELLOW}To use in a new project:${NC}"
echo ""
echo -e "${GREEN}Option A - Automated Setup (Recommended):${NC}"
echo "  1. Navigate to your project:"
echo "     cd ~/workspace/your-project"
echo ""
echo "  2. Run the setup script:"
echo "     $INSTALL_DIR/scripts/setup-project.sh"
echo ""
echo -e "${GREEN}Option B - Manual Setup:${NC}"
echo "  1. Navigate to your project:"
echo "     cd ~/workspace/your-project"
echo ""
echo "  2. Create symlink to central installation:"
echo "     ln -s $INSTALL_DIR .aicodepath"
echo ""
echo "  3. Create project-specific overrides (optional):"
echo "     mkdir -p .aicodepath-overrides/guidelines"
echo "     mkdir -p .aicodepath-overrides/hooks"
echo ""
echo "  4. Create CLAUDE.md with project instructions:"
cat << 'EOF'
     cat > CLAUDE.md << 'CLAUDE_EOF'
# Project Instructions

This project uses the AICodePath (AI-Guided Development Path) workflow.

## AICodePath Configuration
- Central rules: `.aicodepath/rules/`
- Project overrides: `.aicodepath-overrides/` (if any)
- Generated artifacts: `aicodepath-docs/`

## Workflow
Follow the AICodePath workflow defined in `.aicodepath/rules/core-workflow.md`

Load and execute all AICodePath rules from the `.aicodepath/rules/` directory.
CLAUDE_EOF
EOF
echo ""
echo "  5. Add to git (optional):"
echo "     echo '.aicodepath' >> .gitignore  # If using symlink"
echo "     git add CLAUDE.md .aicodepath-overrides"
echo ""
echo -e "${GREEN}Setup complete! Start using AICodePath with Claude Code.${NC}"
echo ""
