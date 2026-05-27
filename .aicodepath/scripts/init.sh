#!/bin/bash
# AICodePath Session Initialization Script
# Run at the start of each new context window to quickly resume work
#
# Usage: ./scripts/init.sh [project_root]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="${1:-.}"
AICODEPATH_STATE_DIR="$PROJECT_ROOT/aicodepath-docs"

echo -e "${CYAN}=== AICodePath Session Initialization ===${NC}"
echo -e "Project: ${BLUE}$PROJECT_ROOT${NC}"
echo -e "Time: $(date -Iseconds)"
echo ""

# Function to safely parse JSON
parse_json() {
    local file=$1
    local query=$2
    if command -v jq &> /dev/null && [ -f "$file" ]; then
        jq -r "$query" "$file" 2>/dev/null || echo "N/A"
    else
        echo "N/A"
    fi
}

# Check for existing state files
echo -e "${YELLOW}Checking State Files...${NC}"
echo ""

# 1. Context State
if [ -f "$AICODEPATH_STATE_DIR/context-state.json" ]; then
    echo -e "${GREEN}✓ Context State Found${NC}"
    PHASE=$(parse_json "$AICODEPATH_STATE_DIR/context-state.json" '.workflow.phase')
    STAGE=$(parse_json "$AICODEPATH_STATE_DIR/context-state.json" '.workflow.stage')
    STATUS=$(parse_json "$AICODEPATH_STATE_DIR/context-state.json" '.workflow.status')
    RESUME_FILE=$(parse_json "$AICODEPATH_STATE_DIR/context-state.json" '.resumePoint.file')
    RESUME_STEP=$(parse_json "$AICODEPATH_STATE_DIR/context-state.json" '.resumePoint.step')

    echo -e "  Phase:  ${CYAN}$PHASE${NC}"
    echo -e "  Stage:  ${CYAN}$STAGE${NC}"
    echo -e "  Status: ${CYAN}$STATUS${NC}"
    if [ "$RESUME_FILE" != "N/A" ] && [ "$RESUME_FILE" != "" ]; then
        echo -e "  Resume: ${CYAN}$RESUME_FILE${NC} (Step: $RESUME_STEP)"
    fi
    echo ""
else
    echo -e "${YELLOW}! No context state found - fresh session${NC}"
    echo ""
fi

# 2. Implementation Status
if [ -f "$AICODEPATH_STATE_DIR/implementation-status.json" ]; then
    echo -e "${GREEN}✓ Implementation Status Found${NC}"
    CURRENT_UNIT=$(parse_json "$AICODEPATH_STATE_DIR/implementation-status.json" '.currentUnit')
    CURRENT_STAGE=$(parse_json "$AICODEPATH_STATE_DIR/implementation-status.json" '.currentStage')
    COMPLETED=$(parse_json "$AICODEPATH_STATE_DIR/implementation-status.json" '.completedSteps | length')
    PENDING=$(parse_json "$AICODEPATH_STATE_DIR/implementation-status.json" '.pendingSteps | length')

    echo -e "  Current Unit:  ${CYAN}$CURRENT_UNIT${NC}"
    echo -e "  Current Stage: ${CYAN}$CURRENT_STAGE${NC}"
    echo -e "  Progress:      ${GREEN}$COMPLETED completed${NC}, ${YELLOW}$PENDING pending${NC}"

    # Check for blockers
    BLOCKERS=$(parse_json "$AICODEPATH_STATE_DIR/implementation-status.json" '.blockers | length')
    if [ "$BLOCKERS" != "0" ] && [ "$BLOCKERS" != "N/A" ]; then
        echo -e "  ${RED}⚠ BLOCKERS: $BLOCKERS issue(s) detected${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}! No implementation status found${NC}"
    echo ""
fi

# 3. Test Status
if [ -f "$AICODEPATH_STATE_DIR/tests.json" ]; then
    echo -e "${GREEN}✓ Test Status Found${NC}"
    TOTAL=$(parse_json "$AICODEPATH_STATE_DIR/tests.json" '.summary.total')
    PASSED=$(parse_json "$AICODEPATH_STATE_DIR/tests.json" '.summary.passed')
    FAILED=$(parse_json "$AICODEPATH_STATE_DIR/tests.json" '.summary.failed')
    COVERAGE=$(parse_json "$AICODEPATH_STATE_DIR/tests.json" '.coverage.lines')

    echo -e "  Total:    $TOTAL tests"
    echo -e "  Passed:   ${GREEN}$PASSED${NC}"
    if [ "$FAILED" != "0" ] && [ "$FAILED" != "N/A" ]; then
        echo -e "  Failed:   ${RED}$FAILED${NC}"
        echo ""
        echo -e "  ${RED}Failing Tests:${NC}"
        parse_json "$AICODEPATH_STATE_DIR/tests.json" '.failures[] | "    - \(.file): \(.test)"' 2>/dev/null || true
    else
        echo -e "  Failed:   ${GREEN}0${NC}"
    fi
    if [ "$COVERAGE" != "N/A" ] && [ "$COVERAGE" != "0" ]; then
        echo -e "  Coverage: ${CYAN}$COVERAGE%${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}! No test status found${NC}"
    echo ""
fi

# 4. AICodePath State (markdown)
if [ -f "$AICODEPATH_STATE_DIR/aicodepath-state.md" ]; then
    echo -e "${GREEN}✓ AICodePath State (Markdown) Found${NC}"
    # Count checkboxes
    COMPLETED_TASKS=$(grep -c '\[x\]' "$AICODEPATH_STATE_DIR/aicodepath-state.md" 2>/dev/null || echo "0")
    PENDING_TASKS=$(grep -c '\[ \]' "$AICODEPATH_STATE_DIR/aicodepath-state.md" 2>/dev/null || echo "0")
    echo -e "  Completed: ${GREEN}$COMPLETED_TASKS tasks${NC}"
    echo -e "  Pending:   ${YELLOW}$PENDING_TASKS tasks${NC}"
    echo ""
fi

# 5. Git Status
echo -e "${YELLOW}Git Status:${NC}"
if git -C "$PROJECT_ROOT" rev-parse --git-dir > /dev/null 2>&1; then
    BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current)
    LAST_COMMIT=$(git -C "$PROJECT_ROOT" log -1 --format="%h %s" 2>/dev/null || echo "No commits")
    UNCOMMITTED=$(git -C "$PROJECT_ROOT" status --porcelain | wc -l)

    echo -e "  Branch:      ${CYAN}$BRANCH${NC}"
    echo -e "  Last Commit: $LAST_COMMIT"
    if [ "$UNCOMMITTED" -gt 0 ]; then
        echo -e "  Uncommitted: ${YELLOW}$UNCOMMITTED file(s)${NC}"
    fi
else
    echo -e "  ${YELLOW}Not a git repository${NC}"
fi
echo ""

# Summary
echo -e "${CYAN}=== Ready to Continue ===${NC}"
echo ""
echo "To resume the AICodePath workflow, you can:"
echo "  1. Say 'Resume workflow' to continue from last checkpoint"
echo "  2. Say 'Show status' for detailed progress"
echo "  3. Say 'Run tests' to check current test status"
echo ""
