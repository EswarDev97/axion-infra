"""
MindFlow Task Service - API Routes
Per API_CONTRACT.md Section 8.3
"""

from fastapi import APIRouter

from .tasks import router as tasks_router
from .statuses import router as statuses_router

router = APIRouter(prefix="/api/v1/tasks")

# Include all Task sub-routers
# IMPORTANT: statuses_router must be included FIRST so /statuses routes
# are matched before the /{task_id} catch-all in tasks_router
router.include_router(statuses_router)
router.include_router(tasks_router)

__all__ = ["router"]
