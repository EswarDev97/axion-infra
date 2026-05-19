"""
MindFlow Approval Service - API Routes
Per API_CONTRACT.md Section 8.8
"""

from fastapi import APIRouter

from .workflows import router as workflows_router
from .instances import router as instances_router
from .delegations import router as delegations_router

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])

# Include sub-routers
router.include_router(workflows_router)
router.include_router(instances_router)
router.include_router(delegations_router)

__all__ = ["router"]
