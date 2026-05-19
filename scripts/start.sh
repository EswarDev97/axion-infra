#!/bin/bash

# ============================================================================
# AxionPCS - Start All Services
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
echo "║                   Starting All Services                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
MODE="dev"
DETACHED=false
BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            MODE="prod"
            shift
            ;;
        -d|--detached)
            DETACHED=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --prod, --production  Run in production mode"
            echo "  -d, --detached        Run containers in background"
            echo "  --build               Force rebuild of images"
            echo "  -h, --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    Start in development mode (foreground)"
            echo "  $0 -d                 Start in development mode (background)"
            echo "  $0 --prod -d          Start in production mode (background)"
            echo "  $0 --build -d         Rebuild and start in background"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check for environment files
echo -e "${YELLOW}Checking environment files...${NC}"

if [ ! -f "api-gateway/.env" ]; then
    echo -e "${YELLOW}Creating api-gateway/.env from example...${NC}"
    cp api-gateway/.env.example api-gateway/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}Creating frontend/.env from example...${NC}"
    cp frontend/.env.example frontend/.env
fi

if [ ! -f "ai-services/.env" ]; then
    echo -e "${YELLOW}Creating ai-services/.env from example...${NC}"
    cp ai-services/.env.example ai-services/.env
fi

echo -e "${GREEN}Environment files ready.${NC}"

# Build command
COMPOSE_CMD="docker-compose"
COMPOSE_FILES="-f docker-compose.yml"

if [ "$MODE" == "dev" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.dev.yml"
    echo -e "${BLUE}Mode: Development${NC}"
else
    echo -e "${BLUE}Mode: Production${NC}"
fi

# Build arguments
ARGS="up"

if [ "$DETACHED" = true ]; then
    ARGS="$ARGS -d"
fi

if [ "$BUILD" = true ]; then
    ARGS="$ARGS --build"
fi

# Start infrastructure first
echo -e "${YELLOW}Starting infrastructure services (PostgreSQL, Redis, MinIO)...${NC}"
$COMPOSE_CMD $COMPOSE_FILES up -d postgres redis minio

# Wait for infrastructure to be healthy
echo -e "${YELLOW}Waiting for infrastructure services to be healthy...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
until docker exec axionpcs-postgres pg_isready -U axionpcs -d axionpcs_db > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Redis
echo -n "Waiting for Redis..."
until docker exec axionpcs-redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for MinIO
echo -n "Waiting for MinIO..."
until curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Initialize MinIO buckets
echo -e "${YELLOW}Initializing MinIO buckets...${NC}"
$COMPOSE_CMD $COMPOSE_FILES up -d minio-init
sleep 3

# Start all services
echo -e "${YELLOW}Starting all application services...${NC}"
$COMPOSE_CMD $COMPOSE_FILES $ARGS

if [ "$DETACHED" = true ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              All services started successfully!               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Services:${NC}"
    echo -e "  Frontend:              ${GREEN}http://localhost:3000${NC}"
    echo -e "  API Gateway:           ${GREEN}http://localhost:3001${NC}"
    echo -e "  API Health Check:      ${GREEN}http://localhost:3001/api/v1/health${NC}"
    echo ""
    echo -e "  AI Resume Parser:      ${GREEN}http://localhost:8001${NC}"
    echo -e "  AI Document Classifier:${GREEN}http://localhost:8002${NC}"
    echo -e "  AI HR Analytics:       ${GREEN}http://localhost:8003${NC}"
    echo ""
    echo -e "${BLUE}Infrastructure:${NC}"
    echo -e "  PostgreSQL:            ${GREEN}localhost:5432${NC}"
    echo -e "  Redis:                 ${GREEN}localhost:6379${NC}"
    echo -e "  MinIO Console:         ${GREEN}http://localhost:9001${NC}"
    echo -e "    Username: axionpcs_minio"
    echo -e "    Password: axionpcs_minio_secret"
    echo ""
    if [ "$MODE" == "prod" ]; then
        echo -e "  Nginx:                 ${GREEN}http://localhost:80${NC}"
    fi
    echo ""
    echo -e "${YELLOW}To view logs:${NC} docker-compose logs -f [service_name]"
    echo -e "${YELLOW}To stop:${NC} ./scripts/stop.sh"
fi
