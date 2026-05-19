"""
MindFlow Report Service - Report Schemas
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReportParameterResponse(BaseModel):
    """Report parameter schema."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    name: str
    label: str
    param_type: str = Field(..., alias="paramType")
    is_required: bool = Field(..., alias="isRequired")
    default_value: Optional[str] = Field(None, alias="defaultValue")
    allowed_values: Optional[List[str]] = Field(None, alias="allowedValues")
    display_order: int = Field(..., alias="displayOrder")
    placeholder: Optional[str] = None
    help_text: Optional[str] = Field(None, alias="helpText")


class ReportResponse(BaseModel):
    """Report definition response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    category: str
    default_format: str = Field(..., alias="defaultFormat")
    columns_config: List[Dict[str, Any]] = Field(default_factory=list, alias="columnsConfig")
    required_permission: Optional[str] = Field(None, alias="requiredPermission")
    is_system: bool = Field(..., alias="isSystem")
    is_active: bool = Field(..., alias="isActive")
    cache_ttl_seconds: int = Field(..., alias="cacheTtlSeconds")
    parameters: List[ReportParameterResponse] = Field(default_factory=list)
    created_at: datetime = Field(..., alias="createdAt")


class ReportListResponse(BaseModel):
    """Report list response."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[ReportResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")


class ReportExecutionRequest(BaseModel):
    """Request to execute a report."""

    model_config = ConfigDict(populate_by_name=True)

    parameters: Dict[str, Any] = Field(default_factory=dict)
    format: str = Field("JSON", pattern="^(JSON|PDF|EXCEL|CSV)$")


class ReportExecutionResponse(BaseModel):
    """Report execution response."""

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    report_id: UUID = Field(..., alias="reportId")
    report_name: Optional[str] = Field(None, alias="reportName")
    executed_by: UUID = Field(..., alias="executedBy")
    executed_at: datetime = Field(..., alias="executedAt")
    parameters: Dict[str, Any]
    format: str
    status: str
    row_count: Optional[int] = Field(None, alias="rowCount")
    execution_time_ms: Optional[int] = Field(None, alias="executionTimeMs")
    result_file_id: Optional[UUID] = Field(None, alias="resultFileId")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")


class ReportExecutionListResponse(BaseModel):
    """Report execution history list."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[ReportExecutionResponse]
    total: int
    page: int
    page_size: int = Field(..., alias="pageSize")
    total_pages: int = Field(..., alias="totalPages")


class ReportDataResponse(BaseModel):
    """Report data response for JSON format."""

    model_config = ConfigDict(populate_by_name=True)

    execution_id: UUID = Field(..., alias="executionId")
    report_code: str = Field(..., alias="reportCode")
    report_name: str = Field(..., alias="reportName")
    executed_at: datetime = Field(..., alias="executedAt")
    parameters: Dict[str, Any]
    columns: List[Dict[str, Any]]
    data: List[Dict[str, Any]]
    row_count: int = Field(..., alias="rowCount")
    execution_time_ms: int = Field(..., alias="executionTimeMs")
