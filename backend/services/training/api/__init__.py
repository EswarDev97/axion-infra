"""
MindFlow Training Service - API Routes
Per API_CONTRACT.md Section 8.5
"""

from fastapi import APIRouter

from .courses import router as courses_router
from .sessions import router as sessions_router
from .enrollments import router as enrollments_router
from .exams import router as exams_router
from .certificates import router as certificates_router

router = APIRouter(prefix="/api/v1/training")

# Include all Training sub-routers
router.include_router(courses_router)
router.include_router(sessions_router)
router.include_router(enrollments_router)
router.include_router(exams_router)
router.include_router(certificates_router)

__all__ = ["router"]
