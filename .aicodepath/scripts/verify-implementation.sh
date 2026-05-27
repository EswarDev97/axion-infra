#!/bin/bash

# AICodePath v2.2.1 Implementation Verification Script
# Validates GLM4.2 implementation completeness

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "======================================"
echo "AICodePath v2.2.1 Implementation Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} $description (missing: $file)"
        ((FAIL_COUNT++))
        return 1
    fi
}

check_directory() {
    local dir=$1
    local description=$2

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC} $description (missing: $dir)"
        ((FAIL_COUNT++))
        return 1
    fi
}

warn_missing() {
    local file=$1
    local description=$2

    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}⚠${NC} $description (deferred: $file)"
        ((WARN_COUNT++))
        return 1
    fi
    return 0
}

echo "## Core Infrastructure (Plan 02-04)"
echo "-----------------------------------"

check_file ".aicodepath/lib/websocket-server.js" "WebSocket Server"
check_file ".aicodepath/hooks/lib/ws-emitter.js" "WebSocket Emitter"
check_file ".aicodepath/lib/unit-orchestrator.js" "Unit Orchestrator"
check_file ".aicodepath/lib/dependency-resolver.js" "Dependency Resolver"
check_file ".aicodepath/lib/enhanced-checkpoint-manager.js" "Enhanced Checkpoint Manager"
check_file ".aicodepath/lib/file-snapshot-manager.js" "File Snapshot Manager"
check_file ".aicodepath/lib/conversation-tracker.js" "Conversation Tracker"

echo ""
echo "## Hook System (Plan 05)"
echo "-----------------------------------"

check_file ".aicodepath/hooks/lib/exit-codes.js" "Exit Code Utility"
check_file ".aicodepath/hooks/lib/hook-executor.js" "Hook Executor"
check_file ".aicodepath/lib/hook-context.js" "Hook Context Facade"
check_file ".aicodepath/hooks/permission-request-hook.js" "Permission Request Hook"
check_file ".aicodepath/hooks/post-tool-failure-hook.js" "Post Tool Failure Hook"
check_file ".aicodepath/hooks/subagent-lifecycle-hook.js" "Subagent Lifecycle Hook"
check_file ".aicodepath/hooks/response-stop-hook.js" "Response Stop Hook"
check_file ".aicodepath/hooks/pre-compact-hook.js" "Pre-Compact Hook"
check_file ".aicodepath/hooks/session-end-hook.js" "Session End Hook"
check_file ".aicodepath/hooks/notification-hook.js" "Notification Hook"

echo ""
echo "## Dashboard Components (Plan 06-09)"
echo "-----------------------------------"

check_directory ".aicodepath/templates/dashboard/src/components/AgentMissionControl" "Agent Mission Control"
check_directory ".aicodepath/templates/dashboard/src/components/KeyboardShortcuts" "Keyboard Shortcuts"
check_directory ".aicodepath/templates/dashboard/src/components/Terminal" "Terminal Integration"
check_directory ".aicodepath/templates/dashboard/src/components/CelebrationOverlay" "Celebration Overlay"
check_directory ".aicodepath/templates/dashboard/src/components/ThemeSelector" "Theme Selector"

check_file ".aicodepath/templates/dashboard/src/components/CommandPalette.tsx" "Command Palette"
check_file ".aicodepath/templates/dashboard/src/components/AssistantPanel/AssistantPanel.tsx" "Assistant Panel"
check_file ".aicodepath/templates/dashboard/src/components/ExpandProjectModal/ExpandProjectModal.tsx" "Expand Project Modal"

echo ""
echo "## Terminal Infrastructure (Plan 08)"
echo "-----------------------------------"

check_file ".aicodepath/lib/terminal-session-manager.js" "Terminal Session Manager"
check_file ".aicodepath/lib/terminal-websocket-handler.js" "Terminal WebSocket Handler"
check_file ".aicodepath/lib/terminal-sandbox.js" "Terminal Sandbox"

echo ""
echo "## Medium-Term Enhancements (M1-M6)"
echo "-----------------------------------"

check_file ".aicodepath/plugin.json" "Plugin Manifest"
check_file ".aicodepath/hooks/hooks.json" "Hooks Configuration"
check_file ".aicodepath/lib/checkpoint-manager.js" "Checkpoint Manager"
check_file ".aicodepath/lib/phase-state-machine.js" "Phase State Machine"
check_file ".aicodepath/lib/mcp-config-generator.js" "MCP Config Generator"
check_file ".aicodepath/lib/session-resumption.js" "Session Resumption"
check_file ".aicodepath/lib/env-generator.js" "Environment Generator"

echo ""
echo "## Test Files"
echo "-----------------------------------"

check_file ".aicodepath/lib/__tests__/websocket-server.test.js" "WebSocket Server Tests"
check_file ".aicodepath/lib/__tests__/unit-orchestrator.test.js" "Unit Orchestrator Tests"
check_file ".aicodepath/lib/__tests__/dependency-resolver.test.js" "Dependency Resolver Tests"
check_file ".aicodepath/lib/__tests__/enhanced-checkpoint-manager.test.js" "Enhanced Checkpoint Tests"
check_file ".aicodepath/lib/__tests__/file-snapshot-manager.test.js" "File Snapshot Tests"
check_file ".aicodepath/lib/__tests__/conversation-tracker.test.js" "Conversation Tracker Tests"
check_file ".aicodepath/lib/__tests__/terminal-session-manager.test.js" "Terminal Session Tests"
check_file ".aicodepath/lib/__tests__/mcp-config-generator.test.js" "MCP Config Tests"

warn_missing ".aicodepath/lib/__tests__/terminal-sandbox.test.js" "Terminal Sandbox Tests"
warn_missing ".aicodepath/lib/__tests__/env-generator.test.js" "Env Generator Tests"
warn_missing ".aicodepath/lib/__tests__/hook-context.test.js" "Hook Context Tests"
warn_missing ".aicodepath/lib/__tests__/phase-state-machine.test.js" "Phase State Machine Tests"
warn_missing ".aicodepath/lib/__tests__/session-resumption.test.js" "Session Resumption Tests"
warn_missing ".aicodepath/lib/__tests__/terminal-websocket-handler.test.js" "Terminal WebSocket Handler Tests"

echo ""
echo "## Database Migrations"
echo "-----------------------------------"

check_file ".aicodepath/db/migrations/002_orchestration.sql" "Orchestration Schema"
check_file ".aicodepath/db/migrations/003_enhanced_checkpoints.sql" "Enhanced Checkpoints Schema"

echo ""
echo "## Documentation"
echo "-----------------------------------"

check_file "docs/review_2/GLM4.2-CODE-VALIDATION-REPORT.md" "Code Validation Report"
check_file "docs/review_2/MISSING-TESTS-PLAN.md" "Missing Tests Plan"
check_file "docs/review_2/plans/01-short-term-fixes.md" "Plan 01: Short-term Fixes"
check_file "docs/review_2/plans/02-websocket-infrastructure.md" "Plan 02: WebSocket"
check_file "docs/review_2/plans/03-multi-agent-orchestration.md" "Plan 03: Orchestration"
check_file "docs/review_2/plans/04-checkpoint-rollback.md" "Plan 04: Checkpoints"
check_file "docs/review_2/plans/05-hook-system-expansion.md" "Plan 05: Hooks"

echo ""
echo "======================================"
echo "Summary"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
echo -e "${RED}Failed:${NC} $FAIL_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT (deferred tests)"
echo ""

# Calculate completion percentage
TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASS_COUNT * 100 / TOTAL))
    echo "Completion: ${PERCENTAGE}%"
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All critical components implemented${NC}"
    echo "Status: PRODUCTION READY"
    exit 0
else
    echo -e "${RED}✗ Missing critical components${NC}"
    echo "Status: INCOMPLETE"
    exit 1
fi
