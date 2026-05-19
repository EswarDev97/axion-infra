"""
MindFlow Billing Service - Currency API Routes
"""

from uuid import uuid4

from fastapi import APIRouter

from shared.schemas import ApiResponse

from ..schemas.currency import CurrencyInfo, SUPPORTED_CURRENCIES

router = APIRouter(prefix="/currencies", tags=["currencies"])


@router.get("", response_model=ApiResponse)
async def list_currencies():
    """List all supported currencies."""
    currencies = list(SUPPORTED_CURRENCIES.values())
    return ApiResponse(
        success=True,
        data=[c.model_dump() for c in currencies],
        message="Supported currencies",
        request_id=uuid4(),
    )
