#!/bin/bash

# ============================================================================
# AxionPCS - Initial Setup Script
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
echo "║                     Initial Setup                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker Compose installed"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running.${NC}"
    echo "Please start Docker and try again."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker is running"

echo ""
echo -e "${YELLOW}Setting up environment files...${NC}"

# Create environment files from examples
if [ ! -f "api-gateway/.env" ]; then
    cp api-gateway/.env.example api-gateway/.env
    echo -e "  ${GREEN}✓${NC} Created api-gateway/.env"
else
    echo -e "  ${YELLOW}!${NC} api-gateway/.env already exists (skipped)"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo -e "  ${GREEN}✓${NC} Created frontend/.env"
else
    echo -e "  ${YELLOW}!${NC} frontend/.env already exists (skipped)"
fi

if [ ! -f "ai-services/.env" ]; then
    cp ai-services/.env.example ai-services/.env
    echo -e "  ${GREEN}✓${NC} Created ai-services/.env"
else
    echo -e "  ${YELLOW}!${NC} ai-services/.env already exists (skipped)"
fi

# Generate secure secrets
echo ""
echo -e "${YELLOW}Generating secure secrets...${NC}"

JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

# Update API Gateway .env with secure secrets
if grep -q "your-super-secret-jwt-key-change-in-production" api-gateway/.env; then
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" api-gateway/.env
    echo -e "  ${GREEN}✓${NC} Generated JWT_SECRET"
fi

if grep -q "your-super-secret-session-key-change-in-production" api-gateway/.env; then
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|g" api-gateway/.env
    echo -e "  ${GREEN}✓${NC} Generated SESSION_SECRET"
fi

# Make scripts executable
echo ""
echo -e "${YELLOW}Making scripts executable...${NC}"
chmod +x scripts/*.sh
echo -e "  ${GREEN}✓${NC} Scripts are now executable"

# Create necessary directories
echo ""
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p nginx/logs nginx/ssl
touch nginx/ssl/.gitkeep
echo -e "  ${GREEN}✓${NC} Created nginx/logs and nginx/ssl directories"

# Pull Docker images
echo ""
echo -e "${YELLOW}Pulling Docker images...${NC}"
docker-compose pull postgres redis minio

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   Setup Complete!                             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "  1. Review and update environment files if needed:"
echo "     - api-gateway/.env"
echo "     - frontend/.env"
echo "     - ai-services/.env"
echo ""
echo "  2. Start all services:"
echo -e "     ${GREEN}./scripts/start.sh -d${NC}"
echo ""
echo "  3. Run database migrations (first time only):"
echo -e "     ${GREEN}docker exec -it axionpcs-api-gateway npx prisma migrate deploy${NC}"
echo ""
echo "  4. Seed the database with initial data:"
echo -e "     ${GREEN}docker exec -it axionpcs-api-gateway npx prisma db seed${NC}"
echo ""
echo "  5. Access the application:"
echo "     - Frontend: http://localhost:3000"
echo "     - API: http://localhost:3001/api/v1/health"
echo "     - MinIO Console: http://localhost:9001"
echo ""
