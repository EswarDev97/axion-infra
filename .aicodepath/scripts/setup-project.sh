#!/bin/bash
# AICodePath Project Setup Script
# Sets up AICodePath in a project directory
#
# Usage:
#   # From your project directory:
#   /path/to/.aicodepath/scripts/setup-project.sh
#
#   # Or with custom central installation path:
#   /path/to/.aicodepath/scripts/setup-project.sh /custom/path/.aicodepath

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_AICODEPATH_CENTRAL="$(dirname "$SCRIPT_DIR")"
AICODEPATH_CENTRAL="${1:-$DEFAULT_AICODEPATH_CENTRAL}"
PROJECT_DIR="$(pwd)"

echo -e "${CYAN}=== AICodePath Project Setup ===${NC}"
echo ""
echo -e "Project directory:    ${BLUE}$PROJECT_DIR${NC}"
echo -e "AICodePath central:   ${BLUE}$AICODEPATH_CENTRAL${NC}"
echo ""

# Verify AICodePath central installation exists
if [ ! -d "$AICODEPATH_CENTRAL" ]; then
    echo -e "${RED}Error: AICodePath central installation not found at $AICODEPATH_CENTRAL${NC}"
    echo ""
    echo "Please install AICodePath centrally first:"
    echo "  git clone https://github.com/febrahim-driod/aicodepath-tool.git ~/.aicodepath"
    echo ""
    echo "Or run the installation script:"
    echo "  ./scripts/install-central.sh"
    exit 1
fi

# Check if already set up
if [ -e "$PROJECT_DIR/.aicodepath" ]; then
    echo -e "${YELLOW}Warning: .aicodepath already exists in this project${NC}"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    rm -rf "$PROJECT_DIR/.aicodepath"
fi

# Step 1: Create symlink
echo -e "${YELLOW}Creating symlink to central installation...${NC}"
ln -s "$AICODEPATH_CENTRAL" "$PROJECT_DIR/.aicodepath"
echo -e "${GREEN}✓ Symlink created${NC}"
echo ""

# Step 2: Update .gitignore
echo -e "${YELLOW}Updating .gitignore...${NC}"

# Function to add to .gitignore if not present
add_to_gitignore() {
    local pattern=$1
    local gitignore_file="$PROJECT_DIR/.gitignore"

    # Create .gitignore if it doesn't exist
    if [ ! -f "$gitignore_file" ]; then
        echo "# AICodePath" > "$gitignore_file"
        echo "$pattern" >> "$gitignore_file"
        echo -e "${GREEN}✓ Created .gitignore and added $pattern${NC}"
        return
    fi

    # Check if pattern already exists
    if grep -qxF "$pattern" "$gitignore_file"; then
        echo -e "${BLUE}  $pattern already in .gitignore${NC}"
        return
    fi

    # Add pattern to .gitignore
    echo "" >> "$gitignore_file"
    echo "# AICodePath" >> "$gitignore_file"
    echo "$pattern" >> "$gitignore_file"
    echo -e "${GREEN}✓ Added $pattern to .gitignore${NC}"
}

add_to_gitignore ".aicodepath"
echo ""

# Step 3: Create project directories
echo -e "${YELLOW}Creating project directories...${NC}"
mkdir -p "$PROJECT_DIR/.aicodepath-overrides/guidelines"
mkdir -p "$PROJECT_DIR/.aicodepath-overrides/rules"
mkdir -p "$PROJECT_DIR/.aicodepath-overrides/hooks"
mkdir -p "$PROJECT_DIR/aicodepath-docs"
echo -e "${GREEN}✓ Created .aicodepath-overrides/ and aicodepath-docs/${NC}"
echo ""

# Step 4: Create CLAUDE.md if it doesn't exist
if [ ! -f "$PROJECT_DIR/CLAUDE.md" ]; then
    echo -e "${YELLOW}Creating CLAUDE.md...${NC}"
    cat > "$PROJECT_DIR/CLAUDE.md" << 'EOF'
# Project Instructions

This project uses the AICodePath (AI-Guided Development Path) workflow.

## AICodePath Configuration
- Central rules: `.aicodepath/rules/`
- Project overrides: `.aicodepath-overrides/` (if any)
- Generated artifacts: `aicodepath-docs/`

## Workflow
Follow the AICodePath workflow defined in `.aicodepath/rules/core-workflow.md`

Load and execute all AICodePath rules from the `.aicodepath/rules/` directory.
EOF
    echo -e "${GREEN}✓ Created CLAUDE.md${NC}"
else
    echo -e "${BLUE}  CLAUDE.md already exists, skipping${NC}"
fi
echo ""

# Step 5: Initialize knowledge base
echo -e "${YELLOW}Initialize knowledge base?${NC}"
echo "This will create aicodepath-docs/aicodepath.db for tracking workflow artifacts."
read -p "Initialize now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash "$AICODEPATH_CENTRAL/scripts/init-knowledge-base.sh"
else
    echo -e "${YELLOW}Skipped. Run later with:${NC}"
    echo "  .aicodepath/scripts/init-knowledge-base.sh"
fi
echo ""

# Summary
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${CYAN}Project structure:${NC}"
echo "  .aicodepath/           → symlink to central installation"
echo "  .aicodepath-overrides/ → project-specific overrides"
echo "  aicodepath-docs/       → generated artifacts and tracking"
echo "  CLAUDE.md              → instructions for Claude"
echo "  .gitignore             → excludes .aicodepath/"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Review and customize CLAUDE.md if needed"
echo "  2. Add any project-specific guidelines to .aicodepath-overrides/guidelines/"
echo "  3. Start using AICodePath with Claude Code!"
echo ""
echo -e "${YELLOW}Tip:${NC} The aicodepath-docs/ directory contains project artifacts."
echo "     You can choose to commit it to version control or add it to .gitignore."
echo ""
