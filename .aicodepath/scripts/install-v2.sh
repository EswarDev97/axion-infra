#!/bin/bash

# AICodePath v2.0 Installation Script
# Installs AICodePath v2 structure into a project directory
#
# Usage:
#   install-v2.sh [target-dir] [--prd /path/to/prd.md] [--non-interactive]
#
# Examples:
#   install-v2.sh .
#   install-v2.sh /path/to/project --prd ./requirements.md
#   install-v2.sh . --prd docs/PRD.pdf --non-interactive

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory containing this script (source directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
TARGET_PROJECT="."
PRD_PATH_ARG=""
NON_INTERACTIVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --prd)
            PRD_PATH_ARG="$2"
            shift 2
            ;;
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
        *)
            TARGET_PROJECT="$1"
            shift
            ;;
    esac
done

# Resolve target project to absolute path
TARGET_PROJECT="$(cd "$TARGET_PROJECT" && pwd)"

# Required directories to copy
REQUIRED_DIRS=(
    "bin"            # CLI tools (aicodepath.js)
    "commands"       # CLI command implementations
    "hooks"
    "rules"
    "guidelines"
    "lib"
    "scripts"
    "db"
    "templates"      # Contains dashboard and other project templates
    "state-templates"
    "skills"
    "generators"     # Python-based visual memory generators (AST/tree-sitter)
    "api"            # Dashboard API server
)
# Note: "dashboard" moved to .aicodepath/templates/dashboard/ in v2.1

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AICodePath v2.0 Installation Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Function to print status messages
print_status() {
    local message=$1
    echo -e "${CYAN}→${NC} $message"
}

print_success() {
    local message=$1
    echo -e "${GREEN}✓${NC} $message"
}

print_warning() {
    local message=$1
    echo -e "${YELLOW}⚠${NC} $message"
}

print_error() {
    local message=$1
    echo -e "${RED}✗${NC} $message"
}

# Validate source directory
print_status "Validating source directory..."
echo -e "  Source: ${BLUE}$SOURCE_ROOT${NC}"

if [ ! -d "$SOURCE_ROOT" ]; then
    print_error "Source directory not found: $SOURCE_ROOT"
    exit 1
fi

# Check all required directories exist in source
missing_dirs=()
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$SOURCE_ROOT/$dir" ]; then
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -gt 0 ]; then
    print_error "Missing required source directories:"
    for dir in "${missing_dirs[@]}"; do
        echo -e "  ${RED}✗${NC} $dir"
    done
    exit 1
fi

print_success "All required source directories found"

# Validate target directory
print_status "Validating target directory..."
echo -e "  Target: ${BLUE}$TARGET_PROJECT${NC}"

if [ ! -d "$TARGET_PROJECT" ]; then
    print_error "Target directory not found: $TARGET_PROJECT"
    exit 1
fi

if [ "$SOURCE_ROOT" = "$TARGET_PROJECT" ]; then
    print_error "Source and target directories are the same!"
    print_warning "This script is meant to install AICodePath into a separate project."
    exit 1
fi

print_success "Target directory validated"
echo

# Create .aicodepath directory
print_status "Creating .aicodepath directory structure..."
AICODEPATH_DIR="$TARGET_PROJECT/.aicodepath"

if [ -d "$AICODEPATH_DIR" ]; then
    print_warning ".aicodepath directory already exists"
    read -p "  Overwrite existing installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Installation cancelled by user"
        exit 1
    fi
    print_status "Backing up existing .aicodepath..."
    BACKUP_DIR="$TARGET_PROJECT/.aicodepath.backup.$(date +%Y%m%d%H%M%S)"
    mv "$AICODEPATH_DIR" "$BACKUP_DIR"
    print_success "Backup created at: $BACKUP_DIR"
fi

mkdir -p "$AICODEPATH_DIR"
print_success "Created .aicodepath directory"

# Copy all required directories
echo
print_status "Copying AICodePath directories..."

for dir in "${REQUIRED_DIRS[@]}"; do
    print_status "  Copying $dir..."
    cp -r "$SOURCE_ROOT/$dir" "$AICODEPATH_DIR/"
    print_success "  $dir copied"
done

# Create empty agents directory
print_status "Creating agents directory..."
mkdir -p "$AICODEPATH_DIR/agents"
print_success "Created agents directory"

# Copy config.json and version file
echo
print_status "Copying configuration files..."

if [ -f "$SOURCE_ROOT/config.json" ]; then
    cp "$SOURCE_ROOT/config.json" "$AICODEPATH_DIR/"
    print_success "config.json copied"
else
    print_error "config.json not found in source"
    exit 1
fi

if [ -f "$SOURCE_ROOT/version" ]; then
    cp "$SOURCE_ROOT/version" "$AICODEPATH_DIR/"
    print_success "version file copied"
else
    print_error "version file not found in source"
    exit 1
fi

if [ -f "$SOURCE_ROOT/package.json" ]; then
    cp "$SOURCE_ROOT/package.json" "$AICODEPATH_DIR/"
    print_success "package.json copied"
else
    print_error "package.json not found in source"
    exit 1
fi

if [ -f "$SOURCE_ROOT/package-lock.json" ]; then
    cp "$SOURCE_ROOT/package-lock.json" "$AICODEPATH_DIR/"
    print_success "package-lock.json copied"
fi

# Copy additional configuration files
echo
print_status "Copying AICodePath configuration files..."

if [ -f "$SOURCE_ROOT/.gitignore" ]; then
    cp "$SOURCE_ROOT/.gitignore" "$AICODEPATH_DIR/"
    print_success ".gitignore copied"
fi

if [ -f "$SOURCE_ROOT/.lsp.json" ]; then
    cp "$SOURCE_ROOT/.lsp.json" "$AICODEPATH_DIR/"
    print_success ".lsp.json copied"
fi

if [ -f "$SOURCE_ROOT/plugin.json" ]; then
    cp "$SOURCE_ROOT/plugin.json" "$AICODEPATH_DIR/"
    print_success "plugin.json copied"
fi

if [ -f "$SOURCE_ROOT/jest.config.js" ]; then
    cp "$SOURCE_ROOT/jest.config.js" "$AICODEPATH_DIR/"
    print_success "jest.config.js copied"
fi

if [ -f "$SOURCE_ROOT/README.md" ]; then
    cp "$SOURCE_ROOT/README.md" "$AICODEPATH_DIR/"
    print_success "README.md copied"
fi

if [ -f "$SOURCE_ROOT/aicodepath-flow.md" ]; then
    cp "$SOURCE_ROOT/aicodepath-flow.md" "$AICODEPATH_DIR/"
    print_success "aicodepath-flow.md copied"
fi

if [ -f "$SOURCE_ROOT/claude-code-official-spec.md" ]; then
    cp "$SOURCE_ROOT/claude-code-official-spec.md" "$AICODEPATH_DIR/"
    print_success "claude-code-official-spec.md copied"
fi

if [ -f "$SOURCE_ROOT/codebase-map.md" ]; then
    cp "$SOURCE_ROOT/codebase-map.md" "$AICODEPATH_DIR/"
    print_success "codebase-map.md copied"
fi

if [ -f "$SOURCE_ROOT/system-diagrams.md" ]; then
    cp "$SOURCE_ROOT/system-diagrams.md" "$AICODEPATH_DIR/"
    print_success "system-diagrams.md copied"
fi

# Create .env.aicodepath in .aicodepath/ folder from template
echo
print_status "Creating .aicodepath/.env.aicodepath configuration..."
if [ -f "$SOURCE_ROOT/.env.template" ]; then
    cp "$SOURCE_ROOT/.env.template" "$AICODEPATH_DIR/.env.aicodepath"
    print_success ".env.aicodepath created from template in .aicodepath/"
else
    # Fallback: create minimal .env.aicodepath
    cat > "$AICODEPATH_DIR/.env.aicodepath" << 'EOF'
# AICodePath Environment Configuration
NODE_ENV=production
AICODEPATH_DEV_MODE=false
AICODEPATH_MAX_CONCURRENCY=3
LOG_LEVEL=info
DASHBOARD_PORT=8080

# For more information, see CLAUDE.md or aicodepath-QUICKSTART.md
EOF
    print_success ".env.aicodepath created with defaults in .aicodepath/"
fi

# Install npm dependencies in .aicodepath/ EARLY (needed by hooks and other steps)
echo
print_status "Installing npm dependencies in .aicodepath/..."
if [ -f "$AICODEPATH_DIR/package.json" ]; then
    cd "$AICODEPATH_DIR"
    if npm install --quiet 2>/dev/null; then
        print_success "npm dependencies installed in .aicodepath/"
        cd "$TARGET_PROJECT"
    else
        print_warning "npm install had issues - running with output for diagnostics"
        npm install
        cd "$TARGET_PROJECT"
    fi
else
    print_warning ".aicodepath/package.json not found"
fi

# Write .framework-manifest.json — future updates use this to identify framework-owned files
print_status "Generating .framework-manifest.json..."
MANIFEST_VERSION="$(cat "$AICODEPATH_DIR/version" 2>/dev/null || echo "unknown")"
{ cd "$AICODEPATH_DIR" && find . -type f | grep -v './node_modules' | sort | \
  python3 -c "import sys,json; files=[l.strip().lstrip('./') for l in sys.stdin]; \
  print(json.dumps({'version':'$MANIFEST_VERSION','source':'install-v2.sh','framework_files':files},indent=2))" \
  > .framework-manifest.json; }
print_success ".framework-manifest.json written"

# Create docs/requirements directory
echo
print_status "Creating documentation directories..."
mkdir -p "$TARGET_PROJECT/docs/requirements"
mkdir -p "$TARGET_PROJECT/docs/architecture"
mkdir -p "$TARGET_PROJECT/docs/api"

# Copy README template to docs/requirements
if [ -f "$AICODEPATH_DIR/templates/docs-requirements-README.md" ]; then
    cp "$AICODEPATH_DIR/templates/docs-requirements-README.md" "$TARGET_PROJECT/docs/requirements/README.md"
    print_success "Documentation directories created with README"
else
    print_success "Documentation directories created"
fi

# Copy AICodePath documentation to target project
echo
print_status "Copying AICodePath documentation..."
SOURCE_PARENT="$(dirname "$SOURCE_ROOT")"

if [ -f "$SOURCE_PARENT/README.md" ]; then
    cp "$SOURCE_PARENT/README.md" "$TARGET_PROJECT/aicodepath-README.md"
    print_success "Copied README.md → aicodepath-README.md"
fi

if [ -f "$SOURCE_PARENT/QUICKSTART.md" ]; then
    cp "$SOURCE_PARENT/QUICKSTART.md" "$TARGET_PROJECT/aicodepath-QUICKSTART.md"
    print_success "Copied QUICKSTART.md → aicodepath-QUICKSTART.md"
fi

if [ -f "$SOURCE_PARENT/USER_GUIDE.md" ]; then
    cp "$SOURCE_PARENT/USER_GUIDE.md" "$TARGET_PROJECT/aicodepath-USER_GUIDE.md"
    print_success "Copied USER_GUIDE.md → aicodepath-USER_GUIDE.md"
fi

# Handle PRD/Requirements (optional interactive prompt or --prd argument)
echo
print_status "Checking for Product Requirements Document (PRD)..."
PRD_SECTION=""
PRD_FILE_COPIED=""

# Check if PRD was provided via command-line argument
if [ -n "$PRD_PATH_ARG" ] && [ -f "$PRD_PATH_ARG" ]; then
    # Copy PRD to docs/requirements/
    PRD_FILENAME=$(basename "$PRD_PATH_ARG")
    cp "$PRD_PATH_ARG" "$TARGET_PROJECT/docs/requirements/$PRD_FILENAME"
    PRD_FILE_COPIED="docs/requirements/$PRD_FILENAME"
    print_success "PRD copied to docs/requirements/$PRD_FILENAME"

    # Generate PRD section for CLAUDE.md
    PRD_SECTION="### Product Requirements Document\n\n**Location:** \`@docs/requirements/$PRD_FILENAME\`\n\n**Quick Start:**\n\`\`\`\nReview @docs/requirements/$PRD_FILENAME and start inception phase\n\`\`\`"

# Check if running in interactive mode (not in CI/automated environment)
elif [ -t 0 ] && [ "$NON_INTERACTIVE" = false ]; then
    echo -e "${CYAN}Do you have a PRD or requirements document? (y/N):${NC} "
    read -r HAS_PRD

    if [[ "$HAS_PRD" =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Enter path to PRD file (or press Enter to skip):${NC} "
        read -r PRD_PATH

        if [ -n "$PRD_PATH" ] && [ -f "$PRD_PATH" ]; then
            # Copy PRD to docs/requirements/
            PRD_FILENAME=$(basename "$PRD_PATH")
            cp "$PRD_PATH" "$TARGET_PROJECT/docs/requirements/$PRD_FILENAME"
            PRD_FILE_COPIED="docs/requirements/$PRD_FILENAME"
            print_success "PRD copied to docs/requirements/$PRD_FILENAME"

            # Generate PRD section for CLAUDE.md
            PRD_SECTION="### Product Requirements Document\n\n**Location:** \`@docs/requirements/$PRD_FILENAME\`\n\n**Quick Start:**\n\`\`\`\nReview @docs/requirements/$PRD_FILENAME and start inception phase\n\`\`\`"
        else
            print_warning "PRD file not found or path not provided"
            PRD_SECTION="### Product Requirements Document\n\n**Status:** Not yet provided\n\nPlace your PRD in \`docs/requirements/\` and reference it with:\n\`\`\`\n@docs/requirements/PRD.md\n\`\`\`"
        fi
    else
        PRD_SECTION="### Product Requirements Document\n\n**Status:** Not yet provided\n\nPlace your PRD in \`docs/requirements/\` and reference it with:\n\`\`\`\n@docs/requirements/PRD.md\n\`\`\`"
    fi
else
    # Non-interactive mode - provide default message
    PRD_SECTION="### Product Requirements Document\n\n**Status:** Not yet provided\n\nPlace your PRD in \`docs/requirements/\` and reference it with:\n\`\`\`\n@docs/requirements/PRD.md\n\`\`\`"
fi

# Generate CLAUDE.md from template with placeholder substitution
echo
print_status "Generating CLAUDE.md from template..."

if [ -f "$AICODEPATH_DIR/templates/CLAUDE.md.template" ]; then
    # Backup existing CLAUDE.md if present
    if [ -f "$TARGET_PROJECT/CLAUDE.md" ]; then
        print_warning "CLAUDE.md already exists in target"
        CLAUDE_BACKUP="$TARGET_PROJECT/CLAUDE.md.backup.$(date +%Y%m%d%H%M%S)"
        mv "$TARGET_PROJECT/CLAUDE.md" "$CLAUDE_BACKUP"
        print_success "Backed up existing CLAUDE.md to: $CLAUDE_BACKUP"
    fi

    # Generate values for placeholders
    PROJECT_NAME=$(basename "$TARGET_PROJECT")
    CREATED_DATE=$(date +%Y-%m-%d)
    GENERATED_DATE=$(date +%Y-%m-%d)

    # Copy template and replace placeholders
    cp "$AICODEPATH_DIR/templates/CLAUDE.md.template" "$TARGET_PROJECT/CLAUDE.md"

    # Replace placeholders using sed (portable across Linux and macOS)
    if command -v sed >/dev/null 2>&1; then
        # Use .bak for cross-platform compatibility (macOS requires it)
        sed -i.bak "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$TARGET_PROJECT/CLAUDE.md"
        sed -i.bak "s/{{CREATED_DATE}}/$CREATED_DATE/g" "$TARGET_PROJECT/CLAUDE.md"
        sed -i.bak "s/{{CR_NUMBER}}/N\\/A/g" "$TARGET_PROJECT/CLAUDE.md"
        sed -i.bak "s/{{GENERATED_DATE}}/$GENERATED_DATE/g" "$TARGET_PROJECT/CLAUDE.md"

        # Replace PRD section (requires careful escaping for sed)
        # Using a temporary file approach for complex multi-line replacement
        echo "$PRD_SECTION" > "$TARGET_PROJECT/.prd_section.tmp"
        sed -i.bak "/{{PRD_SECTION}}/r $TARGET_PROJECT/.prd_section.tmp" "$TARGET_PROJECT/CLAUDE.md"
        sed -i.bak "/{{PRD_SECTION}}/d" "$TARGET_PROJECT/CLAUDE.md"
        rm -f "$TARGET_PROJECT/.prd_section.tmp"

        rm -f "$TARGET_PROJECT/CLAUDE.md.bak"
    fi

    print_success "CLAUDE.md generated with project details"
else
    print_warning "CLAUDE.md template not found, using fallback"
    SOURCE_PARENT="$(dirname "$SOURCE_ROOT")"
    if [ -f "$SOURCE_PARENT/CLAUDE.md" ]; then
        cp "$SOURCE_PARENT/CLAUDE.md" "$TARGET_PROJECT/"
        print_success "CLAUDE.md copied from source"
    else
        print_warning "No CLAUDE.md available, skipping"
    fi
fi

# Setup .gitignore
echo
print_status "Setting up .gitignore..."
if [ ! -f "$TARGET_PROJECT/.gitignore" ]; then
    # No .gitignore exists - copy the comprehensive template
    if [ -f "$SOURCE_ROOT/templates/.gitignore.template" ]; then
        cp "$SOURCE_ROOT/templates/.gitignore.template" "$TARGET_PROJECT/.gitignore"
        print_success ".gitignore created from AICodePath template"
    else
        # Fallback: create minimal .gitignore
        cat > "$TARGET_PROJECT/.gitignore" << 'EOF'
# AICodePath Framework (not part of your project code)
aicodepath-docs/
.aicodepath/node_modules/
.aicodepath/logs/
.aicodepath/__tests__/
.aicodepath/.env.aicodepath
.aicodepath.backup.*/
*.db
*.db-journal

# Dependencies
node_modules/
venv/
vendor/

# Build outputs
dist/
build/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
EOF
        print_success ".gitignore created with basic patterns"
    fi
else
    # .gitignore exists - append AICodePath-specific entries if missing
    if ! grep -q "aicodepath-docs" "$TARGET_PROJECT/.gitignore"; then
        cat >> "$TARGET_PROJECT/.gitignore" << 'EOF'

# AICodePath Framework (not part of your project code)
aicodepath-docs/
.aicodepath/node_modules/
.aicodepath/logs/
.aicodepath/__tests__/
.aicodepath/.env.aicodepath
.aicodepath.backup.*/
*.db
*.db-journal
EOF
        print_success ".gitignore updated with AICodePath patterns"
    else
        print_success ".gitignore already configured"
    fi
fi

# Setup .claudeignore
echo
print_status "Setting up .claudeignore..."
if [ ! -f "$TARGET_PROJECT/.claudeignore" ]; then
    # No .claudeignore exists - copy the comprehensive template
    if [ -f "$SOURCE_ROOT/templates/.claudeignore.template" ]; then
        cp "$SOURCE_ROOT/templates/.claudeignore.template" "$TARGET_PROJECT/.claudeignore"
        print_success ".claudeignore created from AICodePath template"
    else
        # Fallback: create minimal .claudeignore
        cat > "$TARGET_PROJECT/.claudeignore" << 'EOF'
# Dependencies
node_modules/**
vendor/**
venv/**

# Build outputs
dist/**
build/**
out/**
*.min.js
*.min.css

# Binary files
*.exe
*.dll
*.so
*.dylib
*.zip
*.tar.gz

# Media files
*.mp4
*.mp3
*.jpg
*.png
*.gif
*.pdf

# Database files
*.db
*.sqlite
*.sqlite3

# Logs
*.log
logs/**

# AICodePath generated files
aicodepath-docs/**
EOF
        print_success ".claudeignore created with basic patterns"
    fi
else
    # .claudeignore exists - append AICodePath-specific entries if missing
    if ! grep -q "aicodepath-docs" "$TARGET_PROJECT/.claudeignore"; then
        cat >> "$TARGET_PROJECT/.claudeignore" << 'EOF'

# AICodePath generated files
aicodepath-docs/**
EOF
        print_success ".claudeignore updated with AICodePath patterns"
    else
        print_success ".claudeignore already configured"
    fi
fi

# Generate package.json if it doesn't exist
echo
if [ ! -f "$TARGET_PROJECT/package.json" ]; then
    print_status "Generating package.json..."

    if [ -f "$AICODEPATH_DIR/templates/package.json.template" ]; then
        # Generate values for placeholders
        PROJECT_NAME=$(basename "$TARGET_PROJECT")

        # Copy template and replace placeholders
        cp "$AICODEPATH_DIR/templates/package.json.template" "$TARGET_PROJECT/package.json"

        # Replace {{PROJECT_NAME}} placeholder
        if command -v sed >/dev/null 2>&1; then
            sed -i.bak "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" "$TARGET_PROJECT/package.json"
            rm -f "$TARGET_PROJECT/package.json.bak"
        fi

        print_success "package.json created with AICodePath dependencies"
        print_status "Run 'npm install' to install dependencies"
    else
        print_warning "package.json template not found, skipping"
    fi
else
    print_status "package.json already exists, skipping"
fi

# Create .claude directory structure
echo
print_status "Creating .claude directory..."
CLAUDE_DIR="$TARGET_PROJECT/.claude"
mkdir -p "$CLAUDE_DIR"

# Create settings.json with hooks (project-level, version-controlled)
# NOTE: Hooks must be INSIDE settings files, not in a separate hooks.json
# Reference: Claude Code documentation on hook file locations
print_status "Creating .claude/settings.json with hooks..."
if [ -f "$SOURCE_ROOT/templates/claude-settings.json.template" ]; then
    cp "$SOURCE_ROOT/templates/claude-settings.json.template" "$CLAUDE_DIR/settings.json"
else
    # Fallback: create settings.json with hooks if template not found
    cat > "$CLAUDE_DIR/settings.json" << 'EOF'
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/session-start-hook.js",
            "statusMessage": "Initializing AICodePath workflow..."
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/pre-flight-check.js",
            "statusMessage": "Running pre-flight checks..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/guideline-validator.js",
            "statusMessage": "Validating guideline compliance..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/api-validator.js",
            "statusMessage": "Validating API design patterns..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/data-validator.js",
            "statusMessage": "Validating database patterns..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/architecture-validator.js",
            "statusMessage": "Validating architecture patterns..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/duplication-checker.js",
            "statusMessage": "Checking for code duplication..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/devops-validator.js",
            "statusMessage": "Validating DevOps configurations..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/iac-validator.js",
            "statusMessage": "Validating infrastructure as code..."
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/pre-commit-validator.js",
            "statusMessage": "Validating git commit..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/auto-artifact-creator.js",
            "statusMessage": "Creating artifact entries..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/gicl-iteration-hook.js",
            "statusMessage": "Running GICL quality gates..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/visual-memory-generator.js",
            "statusMessage": "Generating visual memory..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/construction-skill-suggester.js",
            "statusMessage": "Checking for skill suggestions..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/document-skill-suggester.js",
            "statusMessage": "Checking documentation suggestions..."
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.aicodepath/hooks/inception-skill-suggester.js",
            "statusMessage": "Checking inception suggestions..."
          },
          {
            "type": "command",
            "command": "./.aicodepath/hooks/maintenance-skill-suggester.js",
            "statusMessage": "Checking maintenance suggestions..."
          }
        ]
      }
    ]
  }
}
EOF
fi
print_success ".claude/settings.json created with AICodePath hooks"

# Copy skills (SKILL.md format - Claude Code standard)
print_status "Installing AICodePath skills..."
if [ -d "$SOURCE_ROOT/skills" ]; then
    # Copy skill directories with SKILL.md files
    for skill_dir in "$SOURCE_ROOT/skills"/*; do
        if [ -d "$skill_dir" ]; then
            skill_name=$(basename "$skill_dir")
            if [ ! -d "$AICODEPATH_DIR/skills/$skill_name" ]; then
                cp -r "$skill_dir" "$AICODEPATH_DIR/skills/"
                print_success "Installed skill: $skill_name"
            fi
        fi
    done
    print_success "AICodePath skills installed (SKILL.md format)"

    # Register all skills dynamically
    echo
    print_status "Registering AICodePath skills..."
    if [ -f "$SOURCE_ROOT/scripts/register-skills.js" ]; then
        # Set NODE_PATH so register-skills.js can find dependencies in target project's node_modules
        NODE_PATH="$AICODEPATH_DIR/node_modules" node "$SOURCE_ROOT/scripts/register-skills.js" "$TARGET_PROJECT" 2>&1 | while IFS= read -r line; do
            if [[ "$line" == *"Error"* ]] || [[ "$line" == *"Warning"* ]]; then
                print_warning "$line"
            elif [[ "$line" == *"✅"* ]] || [[ "$line" == *"complete"* ]]; then
                print_success "$line"
            else
                echo "  $line"
            fi
        done

        # Verify registration
        SKILL_COUNT=$(jq '.skills | length' "$TARGET_PROJECT/.claude/skills.json" 2>/dev/null || echo "0")
        SKILL_DIR_COUNT=$(find "$AICODEPATH_DIR/skills" -maxdepth 1 -type d -name "aicodepath-*" | wc -l)

        if [ "$SKILL_COUNT" -gt 0 ]; then
            print_success "Registered $SKILL_COUNT skills in .claude/skills.json"

            if [ "$SKILL_COUNT" -lt "$SKILL_DIR_COUNT" ]; then
                print_warning "Only $SKILL_COUNT of $SKILL_DIR_COUNT skills registered. Check .claude/skills.json"
            fi
        else
            print_warning "Skill registration may have failed. Check .claude/skills.json"
        fi
    else
        print_warning "Skill registration script not found. Using manual configuration."
        print_warning "Skills will need to be registered manually in .claude/skills.json"
    fi
else
    print_warning "Skills directory not found in source. Skipping skills installation."
    print_warning "Skills are optional and can be added later."
fi

# Check for Python dependencies (Visual Memory Generators)
echo
print_status "Checking Python dependencies for Visual Memory generators..."

PYTHON_AVAILABLE=false
PYTHON_DEPS_INSTALLED=false

# Check Python 3 availability
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f2)

    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        print_success "Python 3.$PYTHON_MINOR found (>= 3.8 required)"
        PYTHON_AVAILABLE=true
    else
        print_warning "Python $PYTHON_VERSION found but version 3.8+ required"
        print_warning "Visual Memory advanced generators will be disabled"
    fi
else
    print_warning "Python 3 not found"
    print_warning "Visual Memory advanced generators will be disabled"
    print_warning "Install Python 3.8+ for enhanced diagram generation (85-95% confidence)"
fi

# Check and optionally install Python dependencies
if [ "$PYTHON_AVAILABLE" = true ]; then
    # Check if pip3 is available
    if command -v pip3 >/dev/null 2>&1; then
        print_success "pip3 found"

        # Check if generators requirements.txt exists
        if [ -f "$AICODEPATH_DIR/generators/requirements.txt" ]; then
            # Check if critical packages are installed
            if python3 -c "import fastmcp, networkx, tree_sitter_language_pack" 2>/dev/null; then
                print_success "Python dependencies already installed"
                PYTHON_DEPS_INSTALLED=true
            else
                # Prompt for installation (if interactive)
                if [ -t 0 ] && [ "$NON_INTERACTIVE" = false ]; then
                    echo -e "${CYAN}Install Python dependencies for Visual Memory generators? (Y/n):${NC} "
                    read -r INSTALL_PYTHON_DEPS
                    if [[ ! "$INSTALL_PYTHON_DEPS" =~ ^[Nn]$ ]]; then
                        print_status "Installing Python dependencies..."
                        if pip3 install -r "$AICODEPATH_DIR/generators/requirements.txt" --quiet; then
                            print_success "Python dependencies installed"
                            PYTHON_DEPS_INSTALLED=true
                        else
                            print_warning "Failed to install Python dependencies"
                            print_warning "Run manually: pip3 install -r .aicodepath/generators/requirements.txt"
                        fi
                    else
                        print_warning "Skipped Python dependencies installation"
                        print_warning "Run manually: pip3 install -r .aicodepath/generators/requirements.txt"
                    fi
                else
                    # Non-interactive mode - show instructions
                    print_warning "Python dependencies not installed"
                    print_warning "Run: pip3 install -r .aicodepath/generators/requirements.txt"
                fi
            fi
        else
            print_warning "generators/requirements.txt not found"
            print_warning "Python generators may not be fully available"
        fi
    else
        print_warning "pip3 not found - cannot install Python dependencies"
        print_warning "Install pip3 and run: pip3 install -r .aicodepath/generators/requirements.txt"
    fi
fi

# Store Python availability for later use
echo "$PYTHON_AVAILABLE" > "$AICODEPATH_DIR/.python-available"
echo "$PYTHON_DEPS_INSTALLED" > "$AICODEPATH_DIR/.python-deps-installed"

# Initialize knowledge base
echo
print_status "Initializing knowledge base..."

if [ -f "$AICODEPATH_DIR/scripts/init-knowledge-base.sh" ]; then
    # Make script executable
    chmod +x "$AICODEPATH_DIR/scripts/init-knowledge-base.sh"

    # Run initialization
    cd "$TARGET_PROJECT"
    bash "$AICODEPATH_DIR/scripts/init-knowledge-base.sh"

    print_success "Knowledge base initialized"
else
    print_warning "init-knowledge-base.sh not found, skipping knowledge base initialization"
fi

# Install dashboard npm dependencies if dashboard was initialized
echo
if [ -d "$TARGET_PROJECT/aicodepath-docs/dashboard" ]; then
    print_status "Installing dashboard npm dependencies..."

    if command -v npm >/dev/null 2>&1; then
        cd "$TARGET_PROJECT/aicodepath-docs/dashboard"

        # Check if node_modules already exists
        if [ ! -d "node_modules" ]; then
            if npm install > /dev/null 2>&1; then
                print_success "Dashboard npm dependencies installed"
            else
                print_warning "npm install encountered issues"
                echo "  Run manually: cd $TARGET_PROJECT/aicodepath-docs/dashboard && npm install"
            fi
        else
            print_success "Dashboard dependencies already installed"
        fi
    else
        print_warning "npm not found - dashboard dependencies not installed"
        echo "  Install Node.js and npm, then run: cd $TARGET_PROJECT/aicodepath-docs/dashboard && npm install"
    fi
fi

# Make scripts and hooks executable
echo
print_status "Making scripts and hooks executable..."
find "$AICODEPATH_DIR/scripts" -type f \( -name "*.sh" -o -name "*.js" \) -exec chmod +x {} \;
find "$AICODEPATH_DIR/hooks" -type f -name "*.js" -exec chmod +x {} \;
print_success "Scripts and hooks made executable"

# Initialize AICodePath (settings, symlinks, env, mcp config)
echo
print_status "Initializing AICodePath configuration..."
if [ -f "$AICODEPATH_DIR/bin/aicodepath.js" ]; then
    cd "$TARGET_PROJECT"
    node "$AICODEPATH_DIR/bin/aicodepath.js" init
    print_success "AICodePath initialized"
    print_success "  - Generated .claude/settings.json"
    print_success "  - Created skill symlinks in .claude/skills/"
    print_success "  - Created agent symlinks in .claude/agents/"
    print_success "  - Generated .env.aicodepath"
    print_success "  - Generated .mcp.json"
else
    print_warning "aicodepath CLI not found, running legacy setup..."
    # Fallback to old method
    if [ -f "$AICODEPATH_DIR/scripts/setup-claude-settings.js" ]; then
        node "$AICODEPATH_DIR/scripts/setup-claude-settings.js"
        print_success "Claude Code settings generated (legacy mode)"
        print_warning "Skills and agents not linked - run: node .aicodepath/bin/aicodepath.js init"
    else
        print_error "Installation incomplete - missing both CLI and settings script"
    fi
fi

# Print installation summary
echo
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   AICodePath v2.0 Installation Complete!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo
echo -e "${CYAN}Installation Summary:${NC}"
echo -e "  ✓ Installed to: ${BLUE}$TARGET_PROJECT${NC}"
echo -e "  ✓ Version: ${BLUE}2.0.0${NC}"
echo
echo -e "${CYAN}Created directories:${NC}"
echo -e "  ${GREEN}✓${NC} $TARGET_PROJECT/.aicodepath/    (All AICodePath tooling)"
echo -e "  ${GREEN}✓${NC} $TARGET_PROJECT/.claude/        (Claude Code configuration)"
echo -e "  ${GREEN}✓${NC} $TARGET_PROJECT/aicodepath-docs/ (Knowledge base)"
echo
echo -e "${CYAN}Created files:${NC}"
echo -e "  ${GREEN}✓${NC} CLAUDE.md                        (Workflow guide)"
echo -e "  ${GREEN}✓${NC} .gitignore                       (Version control ignore patterns)"
echo -e "  ${GREEN}✓${NC} .claudeignore                    (Claude Code ignore patterns)"
echo -e "  ${GREEN}✓${NC} package.json                     (Project dependencies)"
echo -e "  ${GREEN}✓${NC} .claude/settings.json            (Project hooks & config)"
echo -e "  ${GREEN}✓${NC} .aicodepath/skills/              (SKILL.md files)"
echo -e "  ${GREEN}✓${NC} aicodepath-docs/aicodepath.db    (Knowledge base)"
echo
echo -e "${CYAN}Python Generators Status:${NC}"
if [ -f "$AICODEPATH_DIR/.python-available" ] && [ "$(cat "$AICODEPATH_DIR/.python-available")" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} Python 3.8+ available"
    if [ -f "$AICODEPATH_DIR/.python-deps-installed" ] && [ "$(cat "$AICODEPATH_DIR/.python-deps-installed")" = "true" ]; then
        echo -e "  ${GREEN}✓${NC} Python dependencies installed"
        echo -e "  ${GREEN}✓${NC} Visual Memory advanced generators enabled (85-95% confidence)"
    else
        echo -e "  ${YELLOW}⚠${NC} Python dependencies not installed"
        echo -e "  ${YELLOW}⚠${NC} Run: ${YELLOW}pip3 install -r .aicodepath/generators/requirements.txt${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Python 3.8+ not available"
    echo -e "  ${YELLOW}⚠${NC} Visual Memory using JS fallback generators (60-70% confidence)"
    echo -e "  ${YELLOW}⚠${NC} Install Python 3.8+ for enhanced diagram generation"
fi
echo

echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Install npm dependencies: ${YELLOW}npm install${NC}"
if [ -f "$AICODEPATH_DIR/.python-deps-installed" ] && [ "$(cat "$AICODEPATH_DIR/.python-deps-installed")" != "true" ]; then
    echo -e "  2. Install Python dependencies: ${YELLOW}pip3 install -r .aicodepath/generators/requirements.txt${NC}"
    echo -e "  3. Review ${BLUE}CLAUDE.md${NC} for workflow overview"
    echo -e "  4. Run pre-flight check: ${YELLOW}node .aicodepath/hooks/pre-flight-check.js${NC}"
    echo -e "  5. Restart Claude Code to activate statusline"
    echo -e "  6. Start using AICodePath with Claude Code!"
else
    echo -e "  2. Review ${BLUE}CLAUDE.md${NC} for workflow overview"
    echo -e "  3. Run pre-flight check: ${YELLOW}node .aicodepath/hooks/pre-flight-check.js${NC}"
    echo -e "  4. Restart Claude Code to activate statusline"
    echo -e "  5. Start using AICodePath with Claude Code!"
fi
echo
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  ${YELLOW}# Validate environment${NC}"
echo -e "  bash .aicodepath/scripts/validate-environment.sh"
echo
echo -e "  ${YELLOW}# Knowledge base query (recommended)${NC}"
echo -e "  node .aicodepath/lib/kb-query.js get-stats       # Database statistics"
echo -e "  node .aicodepath/lib/kb-query.js workflow-progress  # Workflow progress"
echo -e "  node .aicodepath/lib/kb-query.js --help          # All commands"
echo
echo -e "  ${YELLOW}# Direct SQLite queries (advanced)${NC}"
echo -e "  sqlite3 aicodepath-docs/aicodepath.db 'SELECT * FROM v_workflow_progress;'"
echo -e "  sqlite3 aicodepath-docs/aicodepath.db 'SELECT artifact_type, COUNT(*) FROM artifacts GROUP BY artifact_type;'"
echo
echo -e "  ${YELLOW}# Visual Memory generators (Python)${NC}"
echo -e "  python3 -m generators generate --type er --files 'backend/models/*.py'"
echo -e "  python3 -m generators generate --type class --files 'src/**/*.ts'"
echo -e "  python3 -m generators --help                  # All generator commands"
echo
echo -e "${CYAN}Optional: Add npm scripts to package.json${NC}"
echo -e "  Add these scripts for easier knowledge base queries:"
echo -e "  ${YELLOW}\"kb:stats\": \"node .aicodepath/lib/kb-query.js get-stats\"${NC}"
echo -e "  ${YELLOW}\"kb:search\": \"node .aicodepath/lib/kb-query.js search\"${NC}"
echo -e "  ${YELLOW}\"kb:progress\": \"node .aicodepath/lib/kb-query.js workflow-progress\"${NC}"
echo -e "  See ${BLUE}.aicodepath/lib/kb-query-README.md${NC} for full documentation"
echo

# Cleanup temporary marker files
rm -f "$AICODEPATH_DIR/.python-available" "$AICODEPATH_DIR/.python-deps-installed" 2>/dev/null
