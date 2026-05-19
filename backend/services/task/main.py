"""
MindFlow Task Service - Main Application
Per TECH_STACK.md: FastAPI on port 8103

Usage:
    uvicorn services.task.main:app --host 0.0.0.0 --port 8103 --reload
"""

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from shared.config import get_settings
from shared.database import db_manager
from shared.middleware import setup_middleware
from shared.health import (
    HealthCheck,
    create_database_check,
    create_redis_check,
)

from .api import router

logger = structlog.get_logger()

# Initialize health check
health_check = HealthCheck(service_name="task-service", version="0.1.0")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    settings = get_settings()

    # Startup
    logger.info(
        "Starting Task service",
        environment=settings.environment,
        debug=settings.debug
    )

    # Initialize database
    await db_manager.init_db()
    logger.info("Database connection initialized")

    # Register health checks
    health_check.register_dependency("database", create_database_check(db_manager))
    if settings.redis_url:
        health_check.register_dependency("redis", create_redis_check(settings.redis_url))

    # Register shutdown handlers
    health_check.register_shutdown_handler(db_manager.close_db)

    # Mark startup complete
    health_check.mark_startup_complete()

    yield

    # Graceful shutdown
    logger.info("Shutting down Task service")
    await health_check.graceful_shutdown()
    logger.info("Task service shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MindFlow Task Service",
        description="Task and Project management service for MindFlow",
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

    # Health check endpoints (Kubernetes-style probes)
    app.include_router(health_check.get_router())

    return app


# Create app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "services.task.main:app",
        host=settings.host,
        port=8103,
        reload=settings.is_development
    )
