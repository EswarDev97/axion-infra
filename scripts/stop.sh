#!/bin/bash

# ============================================================================
# AxionPCS - Stop All Services
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    AxionPCS Platform                          ║"
echo "║                   Stopping All Services                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
REMOVE_VOLUMES=false
REMOVE_IMAGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        --rmi)
            REMOVE_IMAGES=true
            shift
            ;;
        --clean)
            REMOVE_VOLUMES=true
            REMOVE_IMAGES=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --volumes   Remove named volumes (DATABASE DATA WILL BE LOST!)"
            echo "  --rmi           Remove images built by docker compose"
            echo "  --clean         Remove both volumes and images (FULL CLEANUP)"
            echo "  -h, --help      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              Stop all containers (preserve data)"
            echo "  $0 -v           Stop and remove volumes (lose data)"
            echo "  $0 --clean      Full cleanup (remove everything)"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build command
COMPOSE_CMD="docker compose"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
if [ -f "docker-compose.override.yml" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.override.yml"
fi

# Build down arguments
DOWN_ARGS="down"

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${RED}WARNING: Volumes will be removed. All data will be lost!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Aborted.${NC}"
        exit 0
    fi
    DOWN_ARGS="$DOWN_ARGS -v"
fi

if [ "$REMOVE_IMAGES" = true ]; then
    DOWN_ARGS="$DOWN_ARGS --rmi local"
fi

# Stop all services
echo -e "${YELLOW}Stopping all services...${NC}"
$COMPOSE_CMD $COMPOSE_FILES $DOWN_ARGS

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All services stopped successfully!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${YELLOW}Volumes have been removed.${NC}"
fi

if [ "$REMOVE_IMAGES" = true ]; then
    echo -e "${YELLOW}Local images have been removed.${NC}"
fi

echo -e "${BLUE}To start again:${NC} ./scripts/start.sh"
