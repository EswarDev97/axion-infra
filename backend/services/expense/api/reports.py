"""
MindFlow Expense Service - Report API Routes
Per API_CONTRACT.md Section 8.6.6
"""

from datetime import date
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.dependencies import get_current_user, get_tenant_id, get_db_session, CurrentUser
from shared.schemas import ApiResponse

from ..schemas.reports import (
    ExpenseSummaryResponse,
    ExpenseByCategoryResponse,
    ExpenseByEmployeeResponse,
)
from ..services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=ApiResponse[ExpenseSummaryResponse])
async def get_summary(
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expense summary for date range."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ReportService(db)
    summary = await service.get_summary(tenant_id, start_date, end_date)

    return ApiResponse(
        success=True,
        data=ExpenseSummaryResponse(**summary),
        message="Summary retrieved successfully",
        requestId=request_id
    )


@router.get("/by-category", response_model=ApiResponse[ExpenseByCategoryResponse])
async def get_by_category(
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expenses grouped by category."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ReportService(db)
    report = await service.get_by_category(tenant_id, start_date, end_date)

    return ApiResponse(
        success=True,
        data=ExpenseByCategoryResponse(**report),
        message="Category report retrieved successfully",
        requestId=request_id
    )


@router.get("/by-employee", response_model=ApiResponse[ExpenseByEmployeeResponse])
async def get_by_employee(
    start_date: date = Query(..., alias="startDate"),
    end_date: date = Query(..., alias="endDate"),
    db: AsyncSession = Depends(get_db_session),
    current_user: CurrentUser = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    x_request_id: Annotated[str | None, Header()] = None
):
    """Get expenses grouped by employee."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()
    service = ReportService(db)
    report = await service.get_by_employee(tenant_id, start_date, end_date)

    return ApiResponse(
        success=True,
        data=ExpenseByEmployeeResponse(**report),
        message="Employee report retrieved successfully",
        requestId=request_id
    )
