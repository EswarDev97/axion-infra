"""
MindFlow HR Service - API Routes
Per API_CONTRACT.md Section 8.2
"""

from fastapi import APIRouter

from .departments import router as departments_router
from .positions import router as positions_router
from .employees import router as employees_router
from .leave import router as leave_router
from .attendance import router as attendance_router
from .holidays import router as holidays_router
from .payroll import router as payroll_router
from .candidates import router as candidates_router
from .crm_leads import router as crm_leads_router

router = APIRouter(prefix="/api/v1/hr")

# Include all HR sub-routers
router.include_router(departments_router)
router.include_router(positions_router)
router.include_router(employees_router)
router.include_router(leave_router)
router.include_router(attendance_router)
router.include_router(holidays_router)
router.include_router(payroll_router)
router.include_router(candidates_router)
router.include_router(crm_leads_router)

__all__ = ["router"]
