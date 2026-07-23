"""
MindFlow Complaint Service - API Routes
Per API_CONTRACT.md Section 8.7
"""

from fastapi import APIRouter

from .categories import router as categories_router
from .sla import router as sla_router
from .escalation_rules import router as escalation_rules_router
from .complaints import router as complaints_router
from .clients import router as clients_router
from .payments import router as payments_router

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])

# Include sub-routers
router.include_router(categories_router)
router.include_router(sla_router)
router.include_router(escalation_rules_router)
router.include_router(clients_router)
router.include_router(payments_router)
router.include_router(complaints_router)

__all__ = ["router"]
