"""
MindFlow Report Service - Report API Routes
Per PO-030 Task 6.5
"""

import logging
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import db_manager
from shared.dependencies import CurrentUser, get_current_user, require_permission
from shared.schemas import ApiResponse

from ..schemas import (
    ReportResponse,
    ReportListResponse,
    ReportParameterResponse,
    ReportExecutionRequest,
    ReportExecutionResponse,
    ReportExecutionListResponse,
    ReportDataResponse,
)
from ..services import ReportService, ReportExecutor
from ..services.exporters import CSVExporter, ExcelExporter, PDFExporter

logger = logging.getLogger(__name__)

router = APIRouter()


def _report_to_response(report) -> ReportResponse:
    """Convert Report model to response schema."""
    parameters = []
    if report.parameters:
        parameters = [
            ReportParameterResponse(
                id=p.id,
                name=p.name,
                label=p.label,
                paramType=p.param_type,
                isRequired=p.is_required,
                defaultValue=p.default_value,
                allowedValues=p.allowed_values,
                displayOrder=p.display_order,
                placeholder=p.placeholder,
                helpText=p.help_text,
            )
            for p in sorted(report.parameters, key=lambda x: x.display_order)
        ]

    return ReportResponse(
        id=report.id,
        code=report.code,
        name=report.name,
        description=report.description,
        category=report.category,
        defaultFormat=report.default_format,
        columnsConfig=report.columns_config or [],
        requiredPermission=report.required_permission,
        isSystem=report.is_system,
        isActive=report.is_active,
        cacheTtlSeconds=report.cache_ttl_seconds,
        parameters=parameters,
        createdAt=report.created_at,
    )


@router.get("", response_model=ApiResponse[ReportListResponse])
async def list_reports(
    user: CurrentUser = Depends(get_current_user),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    x_request_id: Optional[str] = Header(None),
):
    """List available reports."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        reports, total = await service.list_reports(
            tenant_id=user.tenant_id,
            category=category,
            page=page,
            page_size=page_size,
        )

        items = [_report_to_response(r) for r in reports]
        total_pages = (total + page_size - 1) // page_size

        return ApiResponse(
            success=True,
            data=ReportListResponse(
                items=items,
                total=total,
                page=page,
                pageSize=page_size,
                totalPages=total_pages,
            ),
            message="Reports retrieved successfully",
            requestId=request_id,
        )


@router.get("/{report_id}", response_model=ApiResponse[ReportResponse])
async def get_report(
    report_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    x_request_id: Optional[str] = Header(None),
):
    """Get report by ID."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        report = await service.get_report(report_id, user.tenant_id)

        return ApiResponse(
            success=True,
            data=_report_to_response(report),
            message="Report retrieved successfully",
            requestId=request_id,
        )


@router.post("/{report_id}/execute", response_model=ApiResponse[ReportDataResponse])
async def execute_report(
    report_id: UUID,
    body: ReportExecutionRequest,
    user: CurrentUser = Depends(get_current_user),
    x_request_id: Optional[str] = Header(None),
):
    """Execute a report and return results."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        executor = ReportExecutor(db)

        # Get report
        report = await service.get_report(report_id, user.tenant_id)

        # Create execution record
        execution = await service.create_execution(
            tenant_id=user.tenant_id,
            report_id=report_id,
            executed_by=user.user_id,
            parameters=body.parameters,
            format=body.format,
        )

        try:
            # Update status to running
            await service.update_execution(execution, status="RUNNING")

            # Execute report
            result = await executor.execute_report(
                report=report,
                parameters=body.parameters,
                tenant_id=user.tenant_id,
            )

            # Update execution with results
            await service.update_execution(
                execution,
                status="COMPLETED",
                row_count=result["row_count"],
                execution_time_ms=result["execution_time_ms"],
            )

            # Handle export format
            if body.format != "JSON":
                # Export to file format
                exporter_class = {
                    "CSV": CSVExporter,
                    "EXCEL": ExcelExporter,
                    "PDF": PDFExporter,
                }.get(body.format)

                if exporter_class:
                    exporter = exporter_class(
                        report_name=report.name,
                        columns=result["columns"],
                        data=result["data"],
                    )
                    file_buffer = exporter.export()

                    # Return file download
                    filename = f"{report.code}_{execution.id}.{exporter.file_extension}"
                    return StreamingResponse(
                        file_buffer,
                        media_type=exporter.content_type,
                        headers={
                            "Content-Disposition": f'attachment; filename="{filename}"'
                        },
                    )

            # Return JSON response
            return ApiResponse(
                success=True,
                data=ReportDataResponse(
                    executionId=execution.id,
                    reportCode=report.code,
                    reportName=report.name,
                    executedAt=execution.executed_at,
                    parameters=body.parameters,
                    columns=result["columns"],
                    data=result["data"],
                    rowCount=result["row_count"],
                    executionTimeMs=result["execution_time_ms"],
                ),
                message="Report executed successfully",
                requestId=request_id,
            )

        except Exception as e:
            logger.error(f"Report execution failed: {e}")
            await service.update_execution(
                execution,
                status="FAILED",
                error_message=str(e),
            )
            raise


@router.get("/code/{code}/execute")
async def execute_report_by_code(
    code: str,
    user: CurrentUser = Depends(get_current_user),
    format: str = Query("JSON", pattern="^(JSON|PDF|EXCEL|CSV)$"),
    x_request_id: Optional[str] = Header(None),
    **params,
):
    """Execute a report by code with query parameters."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        report = await service.get_report_by_code(code, user.tenant_id)

        if not report:
            return ApiResponse(
                success=False,
                message=f"Report with code '{code}' not found",
                requestId=request_id,
            )

        # Execute via the main endpoint logic
        executor = ReportExecutor(db)
        execution = await service.create_execution(
            tenant_id=user.tenant_id,
            report_id=report.id,
            executed_by=user.user_id,
            parameters=params,
            format=format,
        )

        try:
            await service.update_execution(execution, status="RUNNING")

            result = await executor.execute_report(
                report=report,
                parameters=params,
                tenant_id=user.tenant_id,
            )

            await service.update_execution(
                execution,
                status="COMPLETED",
                row_count=result["row_count"],
                execution_time_ms=result["execution_time_ms"],
            )

            if format != "JSON":
                exporter_class = {
                    "CSV": CSVExporter,
                    "EXCEL": ExcelExporter,
                    "PDF": PDFExporter,
                }.get(format)

                if exporter_class:
                    exporter = exporter_class(
                        report_name=report.name,
                        columns=result["columns"],
                        data=result["data"],
                    )
                    file_buffer = exporter.export()
                    filename = f"{report.code}_{execution.id}.{exporter.file_extension}"
                    return StreamingResponse(
                        file_buffer,
                        media_type=exporter.content_type,
                        headers={
                            "Content-Disposition": f'attachment; filename="{filename}"'
                        },
                    )

            return ApiResponse(
                success=True,
                data=ReportDataResponse(
                    executionId=execution.id,
                    reportCode=report.code,
                    reportName=report.name,
                    executedAt=execution.executed_at,
                    parameters=params,
                    columns=result["columns"],
                    data=result["data"],
                    rowCount=result["row_count"],
                    executionTimeMs=result["execution_time_ms"],
                ),
                message="Report executed successfully",
                requestId=request_id,
            )

        except Exception as e:
            logger.error(f"Report execution failed: {e}")
            await service.update_execution(
                execution,
                status="FAILED",
                error_message=str(e),
            )
            raise


@router.get("/executions", response_model=ApiResponse[ReportExecutionListResponse])
async def list_executions(
    user: CurrentUser = Depends(get_current_user),
    report_id: Optional[UUID] = Query(None, alias="reportId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    x_request_id: Optional[str] = Header(None),
):
    """List report execution history."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        executions, total = await service.list_executions(
            tenant_id=user.tenant_id,
            report_id=report_id,
            page=page,
            page_size=page_size,
        )

        items = [
            ReportExecutionResponse(
                id=e.id,
                reportId=e.report_id,
                reportName=e.report.name if e.report else None,
                executedBy=e.executed_by,
                executedAt=e.executed_at,
                parameters=e.parameters or {},
                format=e.format,
                status=e.status,
                rowCount=e.row_count,
                executionTimeMs=e.execution_time_ms,
                resultFileId=e.result_file_id,
                errorMessage=e.error_message,
                completedAt=e.completed_at,
            )
            for e in executions
        ]

        total_pages = (total + page_size - 1) // page_size

        return ApiResponse(
            success=True,
            data=ReportExecutionListResponse(
                items=items,
                total=total,
                page=page,
                pageSize=page_size,
                totalPages=total_pages,
            ),
            message="Executions retrieved successfully",
            requestId=request_id,
        )


@router.post("/seed", response_model=ApiResponse)
async def seed_system_reports(
    user: CurrentUser = Depends(require_permission("admin:manage")),
    x_request_id: Optional[str] = Header(None),
):
    """Seed the 12 system reports for the tenant."""
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        service = ReportService(db)
        count = await service.seed_system_reports(user.tenant_id, user.user_id)

        return ApiResponse(
            success=True,
            message=f"Seeded {count} system reports",
            requestId=request_id,
        )
