"""
MindFlow HR Service - Holiday Schemas
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas import PaginatedData


# ============================================================================
# Holiday CRUD
# ============================================================================

class HolidayCreateRequest(BaseModel):
    """POST /hr/holidays"""
    holiday_name: str = Field(alias="holidayName", min_length=1, max_length=150)
    holiday_date: date = Field(alias="holidayDate")
    holiday_type: str = Field("PUBLIC", alias="holidayType")
    is_recurring: bool = Field(False, alias="isRecurring")
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class HolidayUpdateRequest(BaseModel):
    """PUT /hr/holidays/{id}"""
    holiday_name: Optional[str] = Field(None, alias="holidayName", min_length=1, max_length=150)
    holiday_date: Optional[date] = Field(None, alias="holidayDate")
    holiday_type: Optional[str] = Field(None, alias="holidayType")
    is_recurring: Optional[bool] = Field(None, alias="isRecurring")
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class HolidayResponse(BaseModel):
    """Holiday record response."""
    id: UUID
    tenant_id: UUID = Field(alias="tenantId")
    holiday_name: str = Field(alias="holidayName")
    holiday_date: date = Field(alias="holidayDate")
    holiday_type: str = Field(alias="holidayType")
    is_recurring: bool = Field(alias="isRecurring")
    description: Optional[str] = None
    created_by: Optional[UUID] = Field(None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class HolidayListResponse(PaginatedData[HolidayResponse]):
    """Paginated holiday list."""
    pass


# ============================================================================
# Weekly Off Config
# ============================================================================

class WeeklyOffDayResponse(BaseModel):
    """Single weekly off day."""
    id: UUID
    day_of_week: int = Field(alias="dayOfWeek")
    day_name: str = Field(alias="dayName")

    model_config = ConfigDict(populate_by_name=True)


class WeeklyOffConfigResponse(BaseModel):
    """Full weekly off config for tenant."""
    days: List[WeeklyOffDayResponse]

    model_config = ConfigDict(populate_by_name=True)


class WeeklyOffUpdateRequest(BaseModel):
    """PUT /hr/holidays/weekly-off - set weekly off days."""
    days_of_week: List[int] = Field(alias="daysOfWeek")

    model_config = ConfigDict(populate_by_name=True)
