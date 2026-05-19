"""
MindFlow Storage Service - API Routes
Per API_CONTRACT.md Section 8.10
"""

from fastapi import APIRouter

from .files import router as files_router

# Main router for storage service
router = APIRouter(prefix="/api/v1/storage", tags=["storage"])

# Include sub-routers
router.include_router(files_router)

__all__ = ["router"]
