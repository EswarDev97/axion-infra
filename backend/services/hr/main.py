"""
MindFlow HR Service - Main Application
Per TECH_STACK.md: FastAPI on port 8102

Usage:
    uvicorn services.hr.main:app --host 0.0.0.0 --port 8102 --reload
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from shared.config import get_settings
from shared.database import db_manager
from shared.middleware import setup_middleware

from .api import router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    settings = get_settings()

    # Startup
    logger.info(
        "Starting HR service",
        environment=settings.environment,
        debug=settings.debug
    )

    # Initialize database
    await db_manager.init_db()
    logger.info("Database connection initialized")

    yield

    # Shutdown
    logger.info("Shutting down HR service")
    await db_manager.close_db()
    logger.info("Database connection closed")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MindFlow HR Service",
        description="Human Resource management service for MindFlow",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan
    )

    # Setup middleware (CORS, request context, exception handlers)
    setup_middleware(app)

    # Include API routes
    app.include_router(router)

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check():
        """Health check endpoint for container orchestration."""
        return {
            "status": "healthy",
            "service": "hr-service",
            "version": "0.1.0"
        }

    return app


# Create app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "services.hr.main:app",
        host=settings.host,
        port=8102,
        reload=settings.is_development
    )
