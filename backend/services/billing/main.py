"""
MindFlow Billing Service - Main Application
FastAPI on port 8112

Usage:
    uvicorn services.billing.main:app --host 0.0.0.0 --port 8112 --reload
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

    logger.info(
        "Starting Billing service",
        environment=settings.environment,
        debug=settings.debug,
    )

    await db_manager.init_db()
    logger.info("Database connection initialized")

    yield

    logger.info("Shutting down Billing service")
    await db_manager.close_db()
    logger.info("Database connection closed")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MindFlow Billing Service",
        description="Quote and Invoice management with multi-currency support for MindFlow",
        version="0.1.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        lifespan=lifespan,
    )

    setup_middleware(app)
    app.include_router(router)

    @app.get("/health", tags=["health"])
    async def health_check():
        return {
            "status": "healthy",
            "service": "billing-service",
            "version": "0.1.0",
        }

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "services.billing.main:app",
        host=settings.host,
        port=8112,
        reload=settings.is_development,
    )
