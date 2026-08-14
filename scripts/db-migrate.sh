#!/bin/bash

# ============================================================================
# AxionPCS - Database Migration Script
# ============================================================================

set -e

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
echo "║                   Database Migrations                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
ACTION="deploy"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            ACTION="dev"
            shift
            ;;
        --deploy)
            ACTION="deploy"
            shift
            ;;
        --reset)
            ACTION="reset"
            shift
            ;;
        --seed)
            ACTION="seed"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        --studio)
            ACTION="studio"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev       Create and apply migrations in development"
            echo "  --deploy    Apply pending migrations (default, for production)"
            echo "  --reset     Reset database (WARNING: deletes all data)"
            echo "  --seed      Seed database with initial data"
            echo "  --status    Show migration status"
            echo "  --studio    Open Prisma Studio (database browser)"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                Run pending migrations"
            echo "  $0 --seed         Seed the database"
            echo "  $0 --dev          Create new migration in development"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if API Gateway container is running
if ! docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
    echo -e "${YELLOW}API Gateway container is not running.${NC}"
    echo -e "${YELLOW}Starting infrastructure services...${NC}"
    MIGRATE_COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
    if [ -f "docker-compose.override.yml" ]; then
        MIGRATE_COMPOSE_FILES="$MIGRATE_COMPOSE_FILES -f docker-compose.override.yml"
    fi
    docker compose $MIGRATE_COMPOSE_FILES up -d postgres redis
    sleep 5
fi

case $ACTION in
    dev)
        echo -e "${YELLOW}Running migration in development mode...${NC}"
        echo -e "${YELLOW}This will prompt you for a migration name.${NC}"
        cd api-gateway
        npx prisma migrate dev
        ;;
    deploy)
        echo -e "${YELLOW}Deploying pending migrations...${NC}"
        if docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
            docker exec -it axionpcs-api-gateway npx prisma migrate deploy
        else
            cd api-gateway
            npx prisma migrate deploy
        fi
        echo -e "${GREEN}Migrations applied successfully!${NC}"
        ;;
    reset)
        echo -e "${RED}WARNING: This will delete ALL data in the database!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Resetting database...${NC}"
            if docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
                docker exec -it axionpcs-api-gateway npx prisma migrate reset --force
            else
                cd api-gateway
                npx prisma migrate reset --force
            fi
            echo -e "${GREEN}Database reset complete!${NC}"
        else
            echo -e "${YELLOW}Aborted.${NC}"
        fi
        ;;
    seed)
        echo -e "${YELLOW}Seeding database...${NC}"
        if docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
            docker exec -it axionpcs-api-gateway npx prisma db seed
        else
            cd api-gateway
            npx prisma db seed
        fi
        echo -e "${GREEN}Database seeded successfully!${NC}"
        ;;
    status)
        echo -e "${YELLOW}Checking migration status...${NC}"
        if docker ps --format '{{.Names}}' | grep -q "^axionpcs-api-gateway$"; then
            docker exec -it axionpcs-api-gateway npx prisma migrate status
        else
            cd api-gateway
            npx prisma migrate status
        fi
        ;;
    studio)
        echo -e "${YELLOW}Opening Prisma Studio...${NC}"
        echo -e "${BLUE}Prisma Studio will open at http://localhost:5555${NC}"
        cd api-gateway
        npx prisma studio
        ;;
esac
