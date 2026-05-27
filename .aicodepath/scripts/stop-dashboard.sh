#!/bin/bash
#
# AICodePath Dashboard Stop Script
#
# Stops both the API server and Dashboard dev server
#
# Usage:
#   bash .aicodepath/scripts/stop-dashboard.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Find project root
if [ -f ".aicodepath/config.json" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -f "../.aicodepath/config.json" ]; then
    PROJECT_ROOT="$(cd .. && pwd)"
else
    echo -e "${RED}Error: Must run from project root or .aicodepath directory${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AICodePath Dashboard Shutdown              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

STOPPED_COUNT=0

# Stop API server
API_PID=$(lsof -ti:3888 2>/dev/null || echo "")
if [ -n "$API_PID" ]; then
    echo -e "${BLUE}Stopping API server (PID: $API_PID)...${NC}"
    kill $API_PID 2>/dev/null || kill -9 $API_PID 2>/dev/null
    sleep 1

    # Verify stopped
    if ! kill -0 $API_PID 2>/dev/null; then
        echo -e "${GREEN}✓ API server stopped${NC}"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
        rm -f .aicodepath/logs/api-server.pid
    else
        echo -e "${RED}✗ Failed to stop API server${NC}"
    fi
else
    echo -e "${YELLOW}ℹ API server not running${NC}"
fi

# Stop Dashboard
DASHBOARD_PID=$(lsof -ti:3899 2>/dev/null || echo "")
if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${BLUE}Stopping dashboard (PID: $DASHBOARD_PID)...${NC}"
    kill $DASHBOARD_PID 2>/dev/null || kill -9 $DASHBOARD_PID 2>/dev/null
    sleep 1

    # Verify stopped
    if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo -e "${GREEN}✓ Dashboard stopped${NC}"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
        rm -f .aicodepath/logs/dashboard.pid
    else
        echo -e "${RED}✗ Failed to stop dashboard${NC}"
    fi
else
    echo -e "${YELLOW}ℹ Dashboard not running${NC}"
fi

echo
if [ $STOPPED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Stopped $STOPPED_COUNT service(s)${NC}"
else
    echo -e "${YELLOW}ℹ No services were running${NC}"
fi
echo
