#!/bin/bash

# AICodePath Installation Validation Script
# Checks for all possible gaps and issues before deployment

# Don't exit on error - we want to see all failures
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"

ERRORS=0
WARNINGS=0
CHECKS=0

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  AICodePath Installation Validation${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo
}

check() {
    ((CHECKS++))
    local name="$1"
    local command="$2"

    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        ((ERRORS++))
        return 1
    fi
}

warn() {
    ((CHECKS++))
    local name="$1"
    local command="$2"

    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $name"
        ((WARNINGS++))
        return 1
    fi
}

print_header

echo -e "${BLUE}1. Source Structure Validation${NC}"
echo "───────────────────────────────────────────────"

# Check all required directories exist
check "hooks/ directory exists" "test -d '$AICODEPATH_ROOT/hooks'"
check "rules/ directory exists" "test -d '$AICODEPATH_ROOT/rules'"
check "guidelines/ directory exists" "test -d '$AICODEPATH_ROOT/guidelines'"
check "lib/ directory exists" "test -d '$AICODEPATH_ROOT/lib'"
check "scripts/ directory exists" "test -d '$AICODEPATH_ROOT/scripts'"
check "db/ directory exists" "test -d '$AICODEPATH_ROOT/db'"
check "templates/ directory exists" "test -d '$AICODEPATH_ROOT/templates'"

# Check critical files
check "config.json exists" "test -f '$AICODEPATH_ROOT/config.json'"
check "version file exists" "test -f '$AICODEPATH_ROOT/version'"

echo
echo -e "${BLUE}2. Template Files Validation${NC}"
echo "───────────────────────────────────────────────"

check "CLAUDE.md.template exists" "test -f '$AICODEPATH_ROOT/templates/CLAUDE.md.template'"
check "claude-settings.json.template exists" "test -f '$AICODEPATH_ROOT/templates/claude-settings.json.template'"
check "claude-skills.json.template exists" "test -f '$AICODEPATH_ROOT/templates/claude-skills.json.template'"

# Check if templates have placeholders
if [ -f "$AICODEPATH_ROOT/templates/CLAUDE.md.template" ]; then
    if grep -q "{{PROJECT_NAME}}" "$AICODEPATH_ROOT/templates/CLAUDE.md.template"; then
        echo -e "${YELLOW}⚠${NC} CLAUDE.md.template has placeholders (need substitution in install script)"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} CLAUDE.md.template has no placeholders"
    fi
    ((CHECKS++))
fi

echo
echo -e "${BLUE}3. Hook Files Validation${NC}"
echo "───────────────────────────────────────────────"

# Check critical hooks exist
check "session-start-hook.js exists" "test -f '$AICODEPATH_ROOT/hooks/session-start-hook.js'"
check "guideline-validator.js exists" "test -f '$AICODEPATH_ROOT/hooks/guideline-validator.js'"
check "api-validator.js exists" "test -f '$AICODEPATH_ROOT/hooks/api-validator.js'"
check "data-validator.js exists" "test -f '$AICODEPATH_ROOT/hooks/data-validator.js'"
check "architecture-validator.js exists" "test -f '$AICODEPATH_ROOT/hooks/architecture-validator.js'"

# Check if hooks have shebang
hooks_with_shebang=0
hooks_without_shebang=0
for hook in "$AICODEPATH_ROOT/hooks"/*.js; do
    if [ -f "$hook" ]; then
        if head -1 "$hook" | grep -q "^#!/"; then
            ((hooks_with_shebang++))
        else
            ((hooks_without_shebang++))
            echo -e "${YELLOW}⚠${NC} $(basename "$hook") missing shebang"
        fi
    fi
done

if [ $hooks_without_shebang -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All hooks have shebang"
else
    echo -e "${YELLOW}⚠${NC} $hooks_without_shebang hooks missing shebang"
    ((WARNINGS++))
fi
((CHECKS++))

# Check if hooks are executable
hooks_executable=0
hooks_not_executable=0
for hook in "$AICODEPATH_ROOT/hooks"/*.js; do
    if [ -f "$hook" ]; then
        if [ -x "$hook" ]; then
            ((hooks_executable++))
        else
            ((hooks_not_executable++))
        fi
    fi
done

if [ $hooks_not_executable -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} $hooks_not_executable hooks not executable (install script should chmod +x)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} All hooks are executable"
fi
((CHECKS++))

echo
echo -e "${BLUE}4. Script Files Validation${NC}"
echo "───────────────────────────────────────────────"

check "install-v2.sh exists" "test -f '$AICODEPATH_ROOT/scripts/install-v2.sh'"
check "install-v2.sh is executable" "test -x '$AICODEPATH_ROOT/scripts/install-v2.sh'"
check "init-knowledge-base.sh exists" "test -f '$AICODEPATH_ROOT/scripts/init-knowledge-base.sh'"
check "validate-environment.sh exists" "test -f '$AICODEPATH_ROOT/scripts/validate-environment.sh'"

# Check install-v2.sh for critical operations
if [ -f "$AICODEPATH_ROOT/scripts/install-v2.sh" ]; then
    warn "install-v2.sh handles CLAUDE.md placeholders" "grep -q 'sed.*PROJECT_NAME\|envsubst' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
    check "install-v2.sh makes hooks executable" "grep -qE 'hooks.*chmod|chmod.*hooks' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
    warn "install-v2.sh handles .gitignore" "grep -q 'gitignore' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
    warn "install-v2.sh installs npm dependencies" "grep -q 'npm install' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
fi

echo
echo -e "${BLUE}5. Database Schema Validation${NC}"
echo "───────────────────────────────────────────────"

check "schema.sql exists" "test -f '$AICODEPATH_ROOT/db/schema.sql'"

if [ -f "$AICODEPATH_ROOT/db/schema.sql" ]; then
    # Check for critical tables
    check "schema has artifacts table" "grep -q 'CREATE TABLE.*artifacts' '$AICODEPATH_ROOT/db/schema.sql'"
    check "schema has workflow_state table" "grep -q 'CREATE TABLE.*workflow_state' '$AICODEPATH_ROOT/db/schema.sql'"
    check "schema has audit_log table or view" "grep -qE 'CREATE (TABLE|VIEW).*audit_log' '$AICODEPATH_ROOT/db/schema.sql'"
fi

echo
echo -e "${BLUE}6. Guideline Files Validation${NC}"
echo "───────────────────────────────────────────────"

check "coding-standards.json exists" "test -f '$AICODEPATH_ROOT/guidelines/coding-standards.json'"
check "api-design-rules.json exists" "test -f '$AICODEPATH_ROOT/guidelines/api-design-rules.json'"
check "architecture-rules.json exists" "test -f '$AICODEPATH_ROOT/guidelines/architecture-rules.json'"

# Validate JSON syntax
if command -v jq >/dev/null 2>&1; then
    json_valid=0
    json_invalid=0
    for json_file in "$AICODEPATH_ROOT/guidelines"/*.json; do
        if [ -f "$json_file" ]; then
            if jq empty "$json_file" 2>/dev/null; then
                ((json_valid++))
            else
                ((json_invalid++))
                echo -e "${RED}✗${NC} $(basename "$json_file") invalid JSON"
            fi
        fi
    done

    if [ $json_invalid -eq 0 ]; then
        echo -e "${GREEN}✓${NC} All guideline JSON files are valid"
    else
        echo -e "${RED}✗${NC} $json_invalid invalid JSON files"
        ((ERRORS++))
    fi
    ((CHECKS++))
fi

echo
echo -e "${BLUE}7. Dependency Checks${NC}"
echo "───────────────────────────────────────────────"

warn "Node.js available" "command -v node"
warn "npm available" "command -v npm"
warn "sqlite3 available" "command -v sqlite3"
warn "jq available" "command -v jq"
warn "git available" "command -v git"

echo
echo -e "${BLUE}7b. Python Dependencies (Visual Memory Generators)${NC}"
echo "───────────────────────────────────────────────"

# Check Python 3 availability
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Python 3 available (v$PYTHON_VERSION)"

    # Check minimum version (3.8+)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f2)
    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        echo -e "${GREEN}✓${NC} Python version >= 3.8 (required for generators)"
    else
        echo -e "${YELLOW}⚠${NC} Python version < 3.8 (generators may not work)"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Python 3 not available (visual memory generators will be disabled)"
    ((WARNINGS++))
fi
((CHECKS++))

# Check pip availability
if command -v pip3 >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} pip3 available"
else
    echo -e "${YELLOW}⚠${NC} pip3 not available (cannot install Python dependencies)"
    ((WARNINGS++))
fi
((CHECKS++))

# Check Python generators directory exists
if [ -d "$AICODEPATH_ROOT/generators" ]; then
    echo -e "${GREEN}✓${NC} generators/ directory exists"

    # Check requirements.txt
    if [ -f "$AICODEPATH_ROOT/generators/requirements.txt" ]; then
        echo -e "${GREEN}✓${NC} generators/requirements.txt exists"

        # Check if critical Python packages are installed
        if command -v python3 >/dev/null 2>&1; then
            # Check pydantic
            if python3 -c "import pydantic" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} pydantic installed"
            else
                echo -e "${YELLOW}⚠${NC} pydantic not installed (run: pip3 install -r .aicodepath/generators/requirements.txt)"
                ((WARNINGS++))
            fi

            # Check typer
            if python3 -c "import typer" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} typer installed"
            else
                echo -e "${YELLOW}⚠${NC} typer not installed"
                ((WARNINGS++))
            fi

            # Check tree-sitter (optional but recommended)
            if python3 -c "import tree_sitter" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} tree-sitter installed (TypeScript/JSX parsing enabled)"
            else
                echo -e "${YELLOW}⚠${NC} tree-sitter not installed (TypeScript/JSX parsing disabled)"
                ((WARNINGS++))
            fi

            # Check sqlparse
            if python3 -c "import sqlparse" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} sqlparse installed (SQL schema parsing enabled)"
            else
                echo -e "${YELLOW}⚠${NC} sqlparse not installed (SQL schema parsing disabled)"
                ((WARNINGS++))
            fi
        fi
    else
        echo -e "${YELLOW}⚠${NC} generators/requirements.txt not found"
        ((WARNINGS++))
    fi
    ((CHECKS++))

    # Test Python generator CLI
    if command -v python3 >/dev/null 2>&1; then
        if python3 -m generators --help >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Python generators CLI working"
        else
            echo -e "${YELLOW}⚠${NC} Python generators CLI not working (dependencies may be missing)"
            ((WARNINGS++))
        fi
        ((CHECKS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} generators/ directory not found (visual memory advanced features disabled)"
    ((WARNINGS++))
fi
((CHECKS++))

# Check if package.json dependencies are reasonable
if [ -f "$AICODEPATH_ROOT/../package.json" ]; then
    check "package.json has better-sqlite3" "grep -q 'better-sqlite3' '$AICODEPATH_ROOT/../package.json'"
    check "package.json has commander" "grep -q 'commander' '$AICODEPATH_ROOT/../package.json'"
fi

echo
echo -e "${BLUE}8. Path Resolution Validation${NC}"
echo "───────────────────────────────────────────────"

check "path-resolver.js exists" "test -f '$AICODEPATH_ROOT/lib/path-resolver.js'"

if [ -f "$AICODEPATH_ROOT/lib/path-resolver.js" ]; then
    # Test path-resolver
    if command -v node >/dev/null 2>&1; then
        if node -e "const pr = require('$AICODEPATH_ROOT/lib/path-resolver'); console.log(pr.getAicodePathRoot());" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} path-resolver.js works"
        else
            echo -e "${RED}✗${NC} path-resolver.js has errors"
            ((ERRORS++))
        fi
        ((CHECKS++))
    fi
fi

echo
echo -e "${BLUE}9. Documentation Validation${NC}"
echo "───────────────────────────────────────────────"

warn "README.md exists" "test -f '$AICODEPATH_ROOT/../README.md'"
warn "activation guide exists" "test -f '$AICODEPATH_ROOT/../docs/guides/activation-and-initialization.md'"
warn "installation flow guide exists" "test -f '$AICODEPATH_ROOT/../docs/guides/installation-flow.md'"

echo
echo -e "${BLUE}10. Edge Case Handling${NC}"
echo "───────────────────────────────────────────────"

# Check install script handles edge cases
if [ -f "$AICODEPATH_ROOT/scripts/install-v2.sh" ]; then
    check "install script checks source != target" "grep -q 'SOURCE_ROOT.*TARGET_PROJECT' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
    check "install script handles existing .aicodepath" "grep -q 'aicodepath.*already exists' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
    check "install script backs up existing files" "grep -q 'backup\|Backup' '$AICODEPATH_ROOT/scripts/install-v2.sh'"
fi

echo
echo "═══════════════════════════════════════════════"
echo -e "${BLUE}Validation Summary${NC}"
echo "═══════════════════════════════════════════════"
echo -e "Total checks: $CHECKS"
echo -e "${GREEN}Passed: $((CHECKS - ERRORS - WARNINGS))${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo -e "${RED}Fix $ERRORS critical issues before deployment${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ VALIDATION PASSED WITH WARNINGS${NC}"
    echo -e "${YELLOW}Review $WARNINGS warnings before deployment${NC}"
    exit 0
else
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}Ready for deployment!${NC}"
    exit 0
fi
