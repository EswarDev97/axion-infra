#!/bin/bash

# ============================================================================
# AxionPCS - Check Service Status
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    AxionPCS Platform                          ║"
echo "║                      Service Status                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if a container is running
check_container() {
    local name=$1
    local container="axionpcs-$name"

    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "running")
        if [ "$status" == "healthy" ] || [ "$status" == "running" ]; then
            echo -e "  ${GREEN}●${NC} $name: ${GREEN}Running${NC}"
            return 0
        else
            echo -e "  ${YELLOW}●${NC} $name: ${YELLOW}$status${NC}"
            return 1
        fi
    else
        echo -e "  ${RED}●${NC} $name: ${RED}Stopped${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected=${3:-200}

    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$status" == "$expected" ]; then
        echo -e "    └─ $url ${GREEN}[$status]${NC}"
    else
        echo -e "    └─ $url ${RED}[$status]${NC}"
    fi
}

echo -e "${BLUE}Infrastructure Services:${NC}"
check_container "postgres"
check_container "redis"
check_container "minio"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-minio$"; then
    check_endpoint "MinIO" "http://localhost:9000/minio/health/live"
fi

echo ""
echo -e "${BLUE}Application Services:${NC}"
check_container "api-gateway"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
    check_endpoint "API Health" "http://localhost:3001/api/v1/health"
fi

check_container "frontend"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-frontend$"; then
    check_endpoint "Frontend" "http://localhost:3000"
fi

echo ""
echo -e "${BLUE}AI Services:${NC}"
check_container "ai-resume-parser"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-ai-resume-parser$"; then
    check_endpoint "Resume Parser" "http://localhost:8001/health"
fi

check_container "ai-document-classifier"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-ai-document-classifier$"; then
    check_endpoint "Document Classifier" "http://localhost:8002/health"
fi

check_container "ai-hr-analytics"
if docker ps --format '{{.Names}}' | grep -q "^axionpcs-ai-hr-analytics$"; then
    check_endpoint "HR Analytics" "http://localhost:8003/health"
fi

echo ""
echo -e "${BLUE}Reverse Proxy:${NC}"
check_container "nginx"

echo ""
echo -e "${BLUE}Docker Resources:${NC}"
echo "  Containers: $(docker ps -q | wc -l) running"
echo "  Images: $(docker images -q | wc -l) total"
echo "  Volumes: $(docker volume ls -q | grep axion | wc -l) (axionpcs)"

echo ""
echo -e "${BLUE}Quick Commands:${NC}"
echo "  Start:  ./scripts/start.sh -d"
echo "  Stop:   ./scripts/stop.sh"
echo "  Logs:   ./scripts/logs.sh [service]"
echo "  Restart: ./scripts/stop.sh && ./scripts/start.sh -d"
