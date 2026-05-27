#!/bin/bash
#
# AICodePath Dashboard Status Script
#
# Shows the status of API server and Dashboard dev server
#
# Usage:
#   bash .aicodepath/scripts/dashboard-status.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AICodePath Dashboard Status                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo

# Check API server
API_PID=$(lsof -ti:3888 2>/dev/null || echo "")
if [ -n "$API_PID" ]; then
    API_STATUS="${GREEN}Running${NC}"
    API_INFO="(PID: $API_PID)"

    # Check health endpoint
    if curl -s http://localhost:3888/api/health >/dev/null 2>&1; then
        API_HEALTH="${GREEN}✓ Healthy${NC}"
    else
        API_HEALTH="${RED}✗ Not responding${NC}"
    fi
else
    API_STATUS="${RED}Not running${NC}"
    API_INFO=""
    API_HEALTH="${YELLOW}N/A${NC}"
fi

# Check Dashboard
DASHBOARD_PID=$(lsof -ti:3899 2>/dev/null || echo "")
if [ -n "$DASHBOARD_PID" ]; then
    DASHBOARD_STATUS="${GREEN}Running${NC}"
    DASHBOARD_INFO="(PID: $DASHBOARD_PID)"
else
    DASHBOARD_STATUS="${RED}Not running${NC}"
    DASHBOARD_INFO=""
fi

echo -e "${BLUE}API Server (port 3888):${NC}"
echo -e "  Status: $API_STATUS $API_INFO"
echo -e "  Health: $API_HEALTH"
echo -e "  URL:    http://localhost:3888"
echo

echo -e "${BLUE}Dashboard (port 3899):${NC}"
echo -e "  Status: $DASHBOARD_STATUS $DASHBOARD_INFO"
echo -e "  URL:    http://localhost:3899"
echo

# Check if .env.aicodepath exists
if [ -f ".env.aicodepath" ]; then
    PORT=$(grep "^PORT=" .env.aicodepath 2>/dev/null | cut -d'=' -f2)
    if [ -n "$PORT" ]; then
        echo -e "${BLUE}Configuration:${NC}"
        echo -e "  API Port: $PORT (from .env.aicodepath)"
        echo
    fi
fi

# Show logs location
echo -e "${BLUE}Logs:${NC}"
echo -e "  API:       .aicodepath/logs/api-server.log"
echo -e "  Dashboard: .aicodepath/logs/dashboard.log"
echo

# Commands
echo -e "${BLUE}Commands:${NC}"
if [ -n "$API_PID" ] || [ -n "$DASHBOARD_PID" ]; then
    echo -e "  Stop:    bash .aicodepath/scripts/stop-dashboard.sh"
else
    echo -e "  Start:   bash .aicodepath/scripts/start-dashboard.sh"
fi
echo
