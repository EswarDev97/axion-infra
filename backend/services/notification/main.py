"""
MindFlow Notification Service
Handles in-app notifications, preferences, and notification delivery.
Port: 8109
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import db_manager, Base
from shared.middleware import RequestLoggingMiddleware

from .api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Initialize database
    await db_manager.init_db()
    yield
    # Cleanup
    await db_manager.close_db()


app = FastAPI(
    title="MindFlow Notification Service",
    description="Notification management service for MindFlow platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "notification"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "MindFlow Notification Service",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8109)),
        reload=os.getenv("ENV", "development") == "development"
    )
