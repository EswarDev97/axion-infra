#!/bin/bash

# ============================================================================
# AxionPCS - View Service Logs
# ============================================================================

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Available services
SERVICES="frontend api-gateway ai-resume-parser ai-document-classifier ai-hr-analytics postgres redis minio nginx"

show_help() {
    echo -e "${BLUE}AxionPCS - View Service Logs${NC}"
    echo ""
    echo "Usage: $0 [SERVICE] [OPTIONS]"
    echo ""
    echo "Services:"
    echo "  frontend              Next.js frontend"
    echo "  api-gateway           Node.js API"
    echo "  ai-resume-parser      Resume parsing AI service"
    echo "  ai-document-classifier Document classification AI service"
    echo "  ai-hr-analytics       HR analytics AI service"
    echo "  postgres              PostgreSQL database"
    echo "  redis                 Redis cache"
    echo "  minio                 MinIO storage"
    echo "  nginx                 Nginx reverse proxy"
    echo "  all                   All services (default)"
    echo ""
    echo "Options:"
    echo "  -f, --follow          Follow log output (default)"
    echo "  --tail N              Number of lines to show (default: 100)"
    echo "  --no-follow           Don't follow, just show recent logs"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    Follow all logs"
    echo "  $0 api-gateway        Follow API gateway logs"
    echo "  $0 postgres --tail 50 Show last 50 lines of postgres logs"
}

# Default values
SERVICE="all"
FOLLOW=true
TAIL=100

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        --no-follow)
            FOLLOW=false
            shift
            ;;
        --tail)
            TAIL="$2"
            shift 2
            ;;
        *)
            if [[ " $SERVICES all " =~ " $1 " ]]; then
                SERVICE="$1"
            else
                echo "Unknown service or option: $1"
                echo "Run '$0 --help' for usage"
                exit 1
            fi
            shift
            ;;
    esac
done

# Build command
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
if [ -f "docker-compose.override.yml" ]; then
    COMPOSE_CMD="$COMPOSE_CMD -f docker-compose.override.yml"
fi
LOG_ARGS="logs --tail=$TAIL"

if [ "$FOLLOW" = true ]; then
    LOG_ARGS="$LOG_ARGS -f"
fi

if [ "$SERVICE" != "all" ]; then
    LOG_ARGS="$LOG_ARGS $SERVICE"
fi

# Run logs
$COMPOSE_CMD $LOG_ARGS
