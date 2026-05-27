#!/bin/bash
# Dashboard Implementation Validation Script
# Tests all dashboard components for correct installation and configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$AICODEPATH_ROOT/templates/dashboard"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  AICodePath Dashboard Implementation Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo

# Test 1: Dashboard template exists
echo -e "${BLUE}Test 1: Dashboard Template Structure${NC}"
if [ -d "$TEMPLATE_DIR" ]; then
    echo -e "${GREEN}✓ PASS: Dashboard template exists at $TEMPLATE_DIR${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL: Dashboard template not found at $TEMPLATE_DIR${NC}"
    ((FAIL++))
fi

# Test 2: Required template files exist
echo
echo -e "${BLUE}Test 2: Required Template Files${NC}"
REQUIRED_FILES=(
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "index.html"
    "api/server.cjs"
    "src/App.tsx"
    "src/main.tsx"
    "src/hooks/useDatabase.ts"
    "src/components/KanbanBoard.tsx"
    "src/components/MonitorView.tsx"
    "src/components/DependencyGraph.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$TEMPLATE_DIR/$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
        ((PASS++))
    else
        echo -e "${RED}  ✗ MISSING: $file${NC}"
        ((FAIL++))
    fi
done

# Test 3: API server path configuration
echo
echo -e "${BLUE}Test 3: API Server Database Path${NC}"
if grep -q "path.resolve(__dirname, '../../../aicodepath-docs/aicodepath.db')" "$TEMPLATE_DIR/api/server.cjs"; then
    echo -e "${GREEN}✓ PASS: API server uses correct relative path to database${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL: API server database path incorrect${NC}"
    ((FAIL++))
fi

# Test 4: Vite proxy configuration
echo
echo -e "${BLUE}Test 4: Vite Proxy Configuration${NC}"
if grep -q "target: 'http://localhost:3001'" "$TEMPLATE_DIR/vite.config.ts"; then
    echo -e "${GREEN}✓ PASS: Vite proxy correctly configured for API${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL: Vite proxy configuration incorrect${NC}"
    ((FAIL++))
fi

# Test 5: init-dashboard.sh script path
echo
echo -e "${BLUE}Test 5: init-dashboard.sh Template Path${NC}"
INIT_SCRIPT="$AICODEPATH_ROOT/scripts/init-dashboard.sh"
if [ -f "$INIT_SCRIPT" ]; then
    if grep -q 'DASHBOARD_TEMPLATE="\$TEMPLATE_ROOT/templates/dashboard"' "$INIT_SCRIPT"; then
        echo -e "${GREEN}✓ PASS: init-dashboard.sh uses correct template path${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL: init-dashboard.sh has incorrect template path${NC}"
        echo -e "${YELLOW}  Expected: DASHBOARD_TEMPLATE=\"\$TEMPLATE_ROOT/templates/dashboard\"${NC}"
        echo -e "${YELLOW}  Check line 31 in init-dashboard.sh${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL: init-dashboard.sh not found${NC}"
    ((FAIL++))
fi

# Test 6: dashboard.js launcher script
echo
echo -e "${BLUE}Test 6: Dashboard Launcher Script${NC}"
LAUNCHER_SCRIPT="$AICODEPATH_ROOT/commands/dashboard.js"
if [ -f "$LAUNCHER_SCRIPT" ]; then
    echo -e "${GREEN}✓ PASS: dashboard.js launcher exists${NC}"
    ((PASS++))

    # Check if it uses path-resolver
    if grep -q "pathResolver.findProjectRoot()" "$LAUNCHER_SCRIPT"; then
        echo -e "${GREEN}  ✓ Uses path-resolver for project root${NC}"
        ((PASS++))
    else
        echo -e "${RED}  ✗ Does not use path-resolver${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL: dashboard.js launcher not found${NC}"
    ((FAIL++))
fi

# Test 7: Package.json dependencies
echo
echo -e "${BLUE}Test 7: Package.json Dependencies${NC}"
REQUIRED_DEPS=(
    "react"
    "react-dom"
    "express"
    "better-sqlite3"
    "vite"
    "mermaid"
    "recharts"
)

for dep in "${REQUIRED_DEPS[@]}"; do
    if grep -q "\"$dep\":" "$TEMPLATE_DIR/package.json"; then
        echo -e "${GREEN}  ✓ $dep${NC}"
        ((PASS++))
    else
        echo -e "${RED}  ✗ MISSING: $dep${NC}"
        ((FAIL++))
    fi
done

# Test 8: Hardcoded port validation
echo
echo -e "${BLUE}Test 8: Port Configuration${NC}"
if grep -q "port: 3899" "$TEMPLATE_DIR/vite.config.ts"; then
    echo -e "${GREEN}✓ PASS: Frontend port set to 3899${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARNING: Frontend port not 3899${NC}"
    ((WARN++))
fi

if grep -q "const PORT = process.env.PORT || 3001" "$TEMPLATE_DIR/api/server.cjs"; then
    echo -e "${GREEN}✓ PASS: API port configurable (default 3001)${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARNING: API port not configurable${NC}"
    ((WARN++))
fi

# Test 9: Database endpoints
echo
echo -e "${BLUE}Test 9: API Endpoints${NC}"
REQUIRED_ENDPOINTS=(
    "/api/health"
    "/api/workflow-state"
    "/api/artifacts"
    "/api/visual-memory"
    "/api/overview"
)

for endpoint in "${REQUIRED_ENDPOINTS[@]}"; do
    if grep -q "'$endpoint'" "$TEMPLATE_DIR/api/server.cjs" || grep -q "\"$endpoint\"" "$TEMPLATE_DIR/api/server.cjs"; then
        echo -e "${GREEN}  ✓ $endpoint${NC}"
        ((PASS++))
    else
        echo -e "${RED}  ✗ MISSING: $endpoint${NC}"
        ((FAIL++))
    fi
done

# Test 10: README documentation
echo
echo -e "${BLUE}Test 10: Documentation${NC}"
if [ -f "$TEMPLATE_DIR/README.md" ]; then
    echo -e "${GREEN}✓ PASS: README.md exists${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARNING: README.md missing${NC}"
    ((WARN++))
fi

if [ -f "$TEMPLATE_DIR/DEPLOYMENT.md" ]; then
    echo -e "${GREEN}✓ PASS: DEPLOYMENT.md exists${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ WARNING: DEPLOYMENT.md missing${NC}"
    ((WARN++))
fi

# Summary
echo
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  PASSED:   $PASS${NC}"
echo -e "${RED}  FAILED:   $FAIL${NC}"
echo -e "${YELLOW}  WARNINGS: $WARN${NC}"
echo

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed! Dashboard implementation is valid.${NC}"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Initialize dashboard in a project:"
    echo "     bash .aicodepath/scripts/init-dashboard.sh"
    echo
    echo "  2. Start dashboard:"
    echo "     cd aicodepath-docs/dashboard && npm run dev"
    echo
    echo "  3. Or use launcher:"
    echo "     node .aicodepath/commands/dashboard.js"
    echo
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    echo
    exit 1
fi
