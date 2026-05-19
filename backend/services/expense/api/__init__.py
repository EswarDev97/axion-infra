"""
MindFlow Expense Service - API Routes
Per API_CONTRACT.md Section 8.6
"""

from fastapi import APIRouter

from .requests import router as requests_router
from .categories import router as categories_router
from .payments import router as payments_router
from .reports import router as reports_router
from .me import router as me_router

router = APIRouter(prefix="/api/v1/expenses")

# Include all Expense sub-routers
router.include_router(me_router)  # Must be before requests_router to avoid path conflicts
router.include_router(requests_router)
router.include_router(categories_router)
router.include_router(payments_router)
router.include_router(reports_router)

__all__ = ["router"]
