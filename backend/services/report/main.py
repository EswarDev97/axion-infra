"""
MindFlow Report Service - Main Application
Per PO-030 Task 6.5: Reporting Module with 12 SQL reports
Port: 8111
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from shared.database import db_manager
from shared.middleware import RequestLoggingMiddleware
from shared.health import (
    HealthCheck,
    create_database_check,
    create_redis_check,
)

from .api import router as api_router

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Initialize health check
health_check = HealthCheck(service_name="report-service", version="1.0.0")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle handler."""
    # Startup
    logger.info("Starting Report Service...")
    await db_manager.init_db()
    logger.info("Report Service started successfully")

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
    logger.info("Shutting down Report Service...")
    await health_check.graceful_shutdown()
    logger.info("Report Service shut down complete")


app = FastAPI(
    title="MindFlow Report Service",
    description="Reporting and analytics module for MindFlow HRMS",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(api_router, prefix="/api/v1")


# Health check endpoints (Kubernetes-style probes)
app.include_router(health_check.get_router())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8111,
        reload=settings.is_development,
    )
