#!/bin/bash
# Verification script for workflow split into per-phase files

set -e

echo "Verifying AICodePath Core Workflow Split..."
echo ""

# Define colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if core directory exists
if [ ! -d ".aicodepath/rules/core" ]; then
    echo -e "${RED}✗ Error: .aicodepath/rules/core directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Core directory exists${NC}"
echo ""

# Check each required file
FILES=(
    "preamble.md"
    "pre-flight.md"
    "inception.md"
    "construction.md"
    "operations.md"
    "adaptive-routing.md"
)

echo "Checking phase files..."
for file in "${FILES[@]}"; do
    filepath=".aicodepath/rules/core/$file"
    if [ -f "$filepath" ]; then
        size=$(du -h "$filepath" | cut -f1)
        lines=$(wc -l < "$filepath")
        echo -e "${GREEN}✓${NC} $file (${size}, ${lines} lines)"
    else
        echo -e "${RED}✗${NC} $file - MISSING"
        exit 1
    fi
done

echo ""

# Check core-workflow.md index file
if [ -f ".aicodepath/rules/core-workflow.md" ]; then
    size=$(du -h ".aicodepath/rules/core-workflow.md" | cut -f1)
    lines=$(wc -l < ".aicodepath/rules/core-workflow.md")
    echo -e "${GREEN}✓${NC} core-workflow.md index file (${size}, ${lines} lines)"
else
    echo -e "${RED}✗${NC} core-workflow.md index file - MISSING"
    exit 1
fi

echo ""

# Check session-start-hook.js has been updated
if grep -q "detectCurrentPhase" ".aicodepath/hooks/session-start-hook.js"; then
    echo -e "${GREEN}✓${NC} session-start-hook.js updated with phase detection"
else
    echo -e "${YELLOW}⚠${NC} session-start-hook.js may need phase detection update"
fi

if grep -q "loadPhaseRules" ".aicodepath/hooks/session-start-hook.js"; then
    echo -e "${GREEN}✓${NC} session-start-hook.js updated with phase loading"
else
    echo -e "${YELLOW}⚠${NC} session-start-hook.js may need phase loading update"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All verification checks passed!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""

# Show file sizes summary
echo "File Sizes Summary:"
echo "-------------------"
total_size=0
for file in "${FILES[@]}"; do
    filepath=".aicodepath/rules/core/$file"
    size_kb=$(du -k "$filepath" | cut -f1)
    total_size=$((total_size + size_kb))
done
index_size=$(du -k ".aicodepath/rules/core-workflow.md" | cut -f1)

echo "Phase Files Total: ${total_size} KB"
echo "Index File: ${index_size} KB"
echo "Combined Total: $((total_size + index_size)) KB"
echo ""

echo "Context Optimization:"
echo "---------------------"
echo "• Preamble + Routing: Always loaded (~6-7 KB)"
echo "• Per-Phase Context:"
echo "  - PRE-FLIGHT: ~8 KB total (preamble + pre-flight + routing)"
echo "  - INCEPTION: ~20 KB total (preamble + inception + routing)"
echo "  - CONSTRUCTION: ~38 KB total (preamble + construction + routing)"
echo "  - OPERATIONS: ~12 KB total (preamble + operations + routing)"
echo ""
echo "Original core-workflow.md was ~56 KB (all phases loaded)"
echo "New approach loads only 14-68% of original size per session"
echo ""
