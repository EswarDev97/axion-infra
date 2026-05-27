#!/bin/bash
#
# AICodePath Dashboard Startup Script
#
# Starts both the API server (port 3888) and Dashboard dev server (port 3899)
#
# Usage:
#   bash .aicodepath/scripts/start-dashboard.sh

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
echo -e "${BLUE}║     AICodePath Dashboard Startup               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Check if services are already running
API_PID=$(lsof -ti:3888 2>/dev/null || echo "")
DASHBOARD_PID=$(lsof -ti:3899 2>/dev/null || echo "")

if [ -n "$API_PID" ]; then
    echo -e "${YELLOW}⚠ API server already running on port 3888 (PID: $API_PID)${NC}"
    echo -e "  Use 'bash .aicodepath/scripts/stop-dashboard.sh' to stop it first"
    exit 1
fi

if [ -n "$DASHBOARD_PID" ]; then
    echo -e "${YELLOW}⚠ Dashboard already running on port 3899 (PID: $DASHBOARD_PID)${NC}"
    echo -e "  Use 'bash .aicodepath/scripts/stop-dashboard.sh' to stop it first"
    exit 1
fi

# Check if .env.aicodepath exists
if [ ! -f ".env.aicodepath" ]; then
    echo -e "${YELLOW}⚠ .env.aicodepath not found, creating with defaults...${NC}"
    if [ -f ".aicodepath/bin/aicodepath.js" ]; then
        node .aicodepath/bin/aicodepath.js init
    else
        echo -e "${RED}Error: aicodepath CLI not found${NC}"
        exit 1
    fi
fi

# Start API server in background
echo -e "${BLUE}[1/2]${NC} Starting API server on port 3888..."
nohup node .aicodepath/api/server.js > .aicodepath/logs/api-server.log 2>&1 &
API_PID=$!
echo "$API_PID" > .aicodepath/logs/api-server.pid

# Wait for API server to start
sleep 2

# Check if API server started successfully
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}✗ API server failed to start${NC}"
    echo -e "  Check logs: tail -f .aicodepath/logs/api-server.log"
    exit 1
fi

# Verify API is responding
if curl -s http://localhost:3888/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API server started successfully (PID: $API_PID)${NC}"
else
    echo -e "${RED}✗ API server not responding${NC}"
    kill $API_PID 2>/dev/null
    exit 1
fi

# Check if dashboard node_modules exists
DASHBOARD_DIR="aicodepath-docs/dashboard"
if [ ! -d "$DASHBOARD_DIR/node_modules" ]; then
    echo -e "${YELLOW}⚠ Dashboard dependencies not installed${NC}"
    echo -e "${BLUE}  Installing dependencies...${NC}"
    cd "$DASHBOARD_DIR"
    npm install --silent
    cd "$PROJECT_ROOT"
fi

# Start dashboard dev server in background
echo -e "${BLUE}[2/2]${NC} Starting dashboard dev server on port 3899..."
cd "$DASHBOARD_DIR"
nohup npm run dev > ../../.aicodepath/logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "$DASHBOARD_PID" > ../../.aicodepath/logs/dashboard.pid
cd "$PROJECT_ROOT"

# Wait for dashboard to start
sleep 3

# Check if dashboard started successfully
if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
    echo -e "${RED}✗ Dashboard failed to start${NC}"
    echo -e "  Check logs: tail -f .aicodepath/logs/dashboard.log"
    # Kill API server too
    kill $API_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ Dashboard started successfully (PID: $DASHBOARD_PID)${NC}"
echo
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Dashboard Services Started Successfully!     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}Services:${NC}"
echo -e "  📡 API Server:    ${GREEN}http://localhost:3888${NC} (PID: $API_PID)"
echo -e "  🎨 Dashboard:     ${GREEN}http://localhost:3899${NC} (PID: $DASHBOARD_PID)"
echo
echo -e "${BLUE}Logs:${NC}"
echo -e "  API:       tail -f .aicodepath/logs/api-server.log"
echo -e "  Dashboard: tail -f .aicodepath/logs/dashboard.log"
echo
echo -e "${BLUE}Commands:${NC}"
echo -e "  Stop:   bash .aicodepath/scripts/stop-dashboard.sh"
echo -e "  Status: bash .aicodepath/scripts/dashboard-status.sh"
echo
echo -e "${YELLOW}→ Open http://localhost:3899 in your browser${NC}"
echo
