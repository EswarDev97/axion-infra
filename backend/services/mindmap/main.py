"""
MindFlow Mind Map Service - Main Application
Port: 8106
Per API_CONTRACT.md Section 3.6 (mindmap-module)
"""

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add shared module to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "shared"))

from shared.database import db_manager, Base
from shared.config import get_settings

from .api import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await db_manager.init_db()

    yield

    # Shutdown
    await db_manager.close_db()


app = FastAPI(
    title="MindFlow Mind Map Service",
    description="Mind map management service for MindFlow",
    version="0.1.0",
    lifespan=lifespan,
    root_path="/api/v1/mindmap",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins if hasattr(get_settings(), 'cors_origins') else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "mindmap"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "MindFlow Mind Map Service",
        "version": "0.1.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8106,
        reload=True,
    )
