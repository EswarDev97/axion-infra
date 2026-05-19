"""
MindFlow Billing Service - API Routes
"""

from fastapi import APIRouter

from .quotes import router as quotes_router
from .invoices import router as invoices_router
from .currency import router as currency_router

router = APIRouter(prefix="/api/v1/billing")

router.include_router(quotes_router)
router.include_router(invoices_router)
router.include_router(currency_router)

__all__ = ["router"]
