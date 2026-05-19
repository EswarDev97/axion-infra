"""
MindFlow Notification Service - API Routes
"""

from fastapi import APIRouter

from .notifications import router as notifications_router
from .preferences import router as preferences_router

router = APIRouter()

router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
router.include_router(preferences_router, prefix="/preferences", tags=["preferences"])

__all__ = ["router"]
