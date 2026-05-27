#!/bin/bash
# =============================================================================
# AICodePath Hook Testing Script
# Tests all registered hooks to ensure they're working correctly
# =============================================================================

set -e

# Detect project root
if [ -d ".aicodepath" ]; then
    PROJECT_ROOT=$(pwd)
elif [ -n "$1" ]; then
    PROJECT_ROOT="$1"
else
    echo "Error: Run this script from project root or provide path as argument"
    echo "Usage: $0 [project-path]"
    exit 1
fi

HOOKS_DIR="$PROJECT_ROOT/.aicodepath/hooks"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AICodePath Hook Testing Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Project: $PROJECT_ROOT${NC}"
echo

# Test counter
PASSED=0
FAILED=0
SKIPPED=0

# Function to test a hook
test_hook() {
    local hook_name=$1
    local hook_file="$HOOKS_DIR/$hook_name"
    local test_data=$2
    local description=$3

    if [ -n "$description" ]; then
        echo -e "${CYAN}  Testing: $description${NC}"
    fi
    echo -n "  $hook_name... "

    if [ ! -f "$hook_file" ]; then
        echo -e "${RED}MISSING${NC}"
        ((FAILED++))
        return 1
    fi

    # Test if hook is executable
    if [ ! -x "$hook_file" ]; then
        chmod +x "$hook_file" 2>/dev/null || true
    fi

    # Run the hook with test data
    if echo "$test_data" | node "$hook_file" > /tmp/hook_test_output.json 2>&1; then
        local exit_code=$(cat /tmp/hook_test_output.json | jq -r '.exit_code // 0' 2>/dev/null || echo "0")

        if [ "$exit_code" -eq 0 ] || [ "$exit_code" -eq 1 ]; then
            echo -e "${GREEN}PASS${NC} (exit: $exit_code)"
            ((PASSED++))
            return 0
        else
            echo -e "${RED}FAIL${NC} (exit: $exit_code)"
            cat /tmp/hook_test_output.json | head -10
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}ERROR${NC}"
        if [ -f /tmp/hook_test_output.json ]; then
            cat /tmp/hook_test_output.json | head -10
        fi
        ((FAILED++))
        return 1
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install with: sudo apt-get install jq  # Ubuntu/Debian"
    echo "           or: brew install jq         # macOS"
    exit 1
fi

# Test SessionStart hook
echo -e "\n${YELLOW}━━━ 1. SessionStart Hooks ━━━${NC}"
test_hook "session-start-hook.js" '{
  "sessionId": "test-session-'"$(date +%s)"'",
  "projectPath": "'"$PROJECT_ROOT"'",
  "timestamp": "'"$(date -Iseconds)"'"
}' "Initializes workflow state and knowledge base"

# Test UserPromptSubmit hook
echo -e "\n${YELLOW}━━━ 2. UserPromptSubmit Hooks ━━━${NC}"
test_hook "pre-flight-check.js" '{
  "userPrompt": "test prompt for validation",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Validates environment and dependencies"

# Test PermissionRequest hook
echo -e "\n${YELLOW}━━━ 3. PermissionRequest Hooks ━━━${NC}"
test_hook "permission-request-hook.js" '{
  "tool": "Bash",
  "command": "git status",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Evaluates command safety and permissions"

# Test PreToolUse hooks
echo -e "\n${YELLOW}━━━ 4. PreToolUse Hooks (Validators) ━━━${NC}"
test_hook "guideline-validator.js" '{
  "tool": "Write",
  "file_path": "/tmp/test-guideline.js",
  "content": "const foo = \"test\"; console.log(foo);",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Validates code against project guidelines"

test_hook "api-validator.js" '{
  "tool": "Write",
  "file_path": "/tmp/api-test.js",
  "content": "app.get(\"/api/users\", (req, res) => { res.json(users); });",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Validates API design patterns"

test_hook "architecture-validator.js" '{
  "tool": "Write",
  "file_path": "/tmp/arch-test.js",
  "content": "class UserService { constructor(db) { this.db = db; } }",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Validates architectural patterns"

test_hook "data-validator.js" '{
  "tool": "Write",
  "file_path": "/tmp/data-test.js",
  "content": "const schema = { type: \"object\", properties: { name: { type: \"string\" } } };",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Validates data models and schemas"

# Test PostToolUse hooks
echo -e "\n${YELLOW}━━━ 5. PostToolUse Hooks (GICL & Artifacts) ━━━${NC}"
test_hook "gicl-iteration-hook.js" '{
  "tool": "Write",
  "file_path": "/tmp/gicl-test.js",
  "content": "function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }",
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Git-Integrated Context Learning iteration"

test_hook "auto-artifact-creator.js" '{
  "tool": "Write",
  "file_path": "/tmp/diagram-test.md",
  "content": "# Architecture\n```mermaid\ngraph TD\n  A[Client] --> B[API]\n  B --> C[Database]\n```",
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Auto-generates artifacts from code changes"

test_hook "visual-memory-generator.js" '{
  "tool": "Write",
  "file_path": "/tmp/code-test.py",
  "content": "class User:\n    def __init__(self, name):\n        self.name = name",
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Generates visual memory diagrams"

# Test Skill Suggesters
echo -e "\n${YELLOW}━━━ 6. PostToolUse Hooks (Skill Suggesters) ━━━${NC}"
test_hook "construction-skill-suggester.js" '{
  "tool": "Write",
  "file_path": "/tmp/feature-test.js",
  "content": "export function newFeature() { /* implementation */ }",
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Suggests skills during CONSTRUCTION phase"

test_hook "document-skill-suggester.js" '{
  "tool": "Write",
  "file_path": "/tmp/readme-test.md",
  "content": "# Project Documentation\n\n## Getting Started",
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Suggests documentation skills"

# Test PostToolUseFailure hook
echo -e "\n${YELLOW}━━━ 7. PostToolUseFailure Hooks ━━━${NC}"
test_hook "post-tool-failure-hook.js" '{
  "tool": "Bash",
  "command": "invalid-command-xyz",
  "error": "Command not found: invalid-command-xyz",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Logs and analyzes tool failures"

# Test Subagent hooks
echo -e "\n${YELLOW}━━━ 8. Subagent Lifecycle Hooks ━━━${NC}"
test_hook "subagent-lifecycle-hook.js" '{
  "event": "start",
  "subagentId": "test-agent-'"$(date +%s)"'",
  "agentType": "Explore",
  "task": "Investigate codebase patterns",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Tracks subagent start/stop events"

# Test Stop hook
echo -e "\n${YELLOW}━━━ 9. Response Stop Hook ━━━${NC}"
test_hook "response-stop-hook.js" '{
  "reason": "user_stop",
  "turnsCompleted": 5,
  "partialResponse": "Test response...",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Handles interrupted responses"

# Test PreCompact hook
echo -e "\n${YELLOW}━━━ 10. PreCompact Hook ━━━${NC}"
test_hook "pre-compact-hook.js" '{
  "contextSize": 150000,
  "maxContext": 200000,
  "percentUsed": 75,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Saves checkpoint before context compaction"

# Test SessionEnd hook
echo -e "\n${YELLOW}━━━ 11. SessionEnd Hook ━━━${NC}"
test_hook "session-end-hook.js" '{
  "sessionId": "test-session-'"$(date +%s)"'",
  "duration": 3600,
  "turnsCompleted": 25,
  "success": true,
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Cleanup and session summary"

# Test Notification hook
echo -e "\n${YELLOW}━━━ 12. Notification Hook ━━━${NC}"
test_hook "notification-hook.js" '{
  "type": "info",
  "title": "Test Notification",
  "message": "This is a test notification from hook testing",
  "projectPath": "'"$PROJECT_ROOT"'"
}' "Processes system notifications"

# Summary
echo
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Test Results${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo
echo -e "  ${GREEN}✓ Passed:${NC}  $PASSED"
echo -e "  ${RED}✗ Failed:${NC}  $FAILED"
echo -e "  ${YELLOW}⊘ Skipped:${NC} $SKIPPED"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ All hooks are working correctly!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ✗ Some hooks failed. Check output above.${NC}"
    echo -e "${RED}════════════════════════════════════════════════${NC}"
    echo
    echo "Troubleshooting:"
    echo "  1. Check hook logs: tail -50 $PROJECT_ROOT/.aicodepath/logs/error.log"
    echo "  2. Verify npm dependencies: cd $PROJECT_ROOT/.aicodepath && npm install"
    echo "  3. Check database: ls -lh $PROJECT_ROOT/aicodepath-docs/aicodepath.db"
    echo
    exit 1
fi
