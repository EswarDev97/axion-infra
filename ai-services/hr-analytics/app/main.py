from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import os

app = FastAPI(
    title="AxionPCS HR Analytics",
    description="AI service for HR analytics and insights",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")


class HeadcountData(BaseModel):
    total: int
    byDepartment: List[Dict[str, Any]]
    byEmploymentType: List[Dict[str, Any]]
    trend: List[Dict[str, Any]]


class AttritionData(BaseModel):
    rate: float
    trend: List[Dict[str, Any]]
    byDepartment: List[Dict[str, Any]]
    riskEmployees: List[Dict[str, Any]]


class AttendanceData(BaseModel):
    avgAttendanceRate: float
    trend: List[Dict[str, Any]]
    byDepartment: List[Dict[str, Any]]


class LeaveData(BaseModel):
    utilizationRate: float
    byType: List[Dict[str, Any]]
    trend: List[Dict[str, Any]]


class DashboardData(BaseModel):
    headcount: HeadcountData
    attrition: AttritionData
    attendance: AttendanceData
    leave: LeaveData


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "hr-analytics"}


@app.get("/analytics/dashboard", response_model=DashboardData)
async def get_dashboard_analytics(
    tenant_id: str = Query(..., description="Tenant ID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
):
    """Get comprehensive HR analytics dashboard data."""

    # In production, this would query the database
    # For now, returning sample data structure

    return DashboardData(
        headcount=HeadcountData(
            total=150,
            byDepartment=[
                {"department": "Engineering", "count": 50},
                {"department": "Sales", "count": 30},
                {"department": "Marketing", "count": 20},
                {"department": "HR", "count": 15},
                {"department": "Finance", "count": 15},
                {"department": "Operations", "count": 20},
            ],
            byEmploymentType=[
                {"type": "FULL_TIME", "count": 120},
                {"type": "PART_TIME", "count": 10},
                {"type": "CONTRACT", "count": 15},
                {"type": "INTERN", "count": 5},
            ],
            trend=[
                {"month": "2024-01", "count": 145},
                {"month": "2024-02", "count": 148},
                {"month": "2024-03", "count": 150},
            ],
        ),
        attrition=AttritionData(
            rate=5.2,
            trend=[
                {"month": "2024-01", "rate": 4.8},
                {"month": "2024-02", "rate": 5.0},
                {"month": "2024-03", "rate": 5.2},
            ],
            byDepartment=[
                {"department": "Engineering", "rate": 3.5},
                {"department": "Sales", "rate": 8.2},
                {"department": "Marketing", "rate": 4.5},
            ],
            riskEmployees=[],  # Would include employees flagged as attrition risks
        ),
        attendance=AttendanceData(
            avgAttendanceRate=94.5,
            trend=[
                {"month": "2024-01", "rate": 93.2},
                {"month": "2024-02", "rate": 94.1},
                {"month": "2024-03", "rate": 94.5},
            ],
            byDepartment=[
                {"department": "Engineering", "rate": 96.0},
                {"department": "Sales", "rate": 92.5},
                {"department": "Marketing", "rate": 95.0},
            ],
        ),
        leave=LeaveData(
            utilizationRate=65.0,
            byType=[
                {"type": "Casual Leave", "allocated": 1200, "used": 800},
                {"type": "Sick Leave", "allocated": 900, "used": 450},
                {"type": "Earned Leave", "allocated": 2100, "used": 1400},
            ],
            trend=[
                {"month": "2024-01", "rate": 60.0},
                {"month": "2024-02", "rate": 62.5},
                {"month": "2024-03", "rate": 65.0},
            ],
        ),
    )


@app.get("/analytics/headcount")
async def get_headcount_analytics(
    tenant_id: str = Query(...),
    department_id: Optional[str] = Query(None),
):
    """Get detailed headcount analytics."""
    # Implementation would query database
    return {"message": "Headcount analytics endpoint"}


@app.get("/analytics/attrition")
async def get_attrition_analytics(
    tenant_id: str = Query(...),
    department_id: Optional[str] = Query(None),
):
    """Get detailed attrition analytics and predictions."""
    # Implementation would include ML predictions
    return {"message": "Attrition analytics endpoint"}


@app.get("/analytics/attendance")
async def get_attendance_analytics(
    tenant_id: str = Query(...),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
):
    """Get detailed attendance analytics."""
    return {"message": "Attendance analytics endpoint"}


@app.get("/analytics/leave")
async def get_leave_analytics(
    tenant_id: str = Query(...),
    year: int = Query(datetime.now().year),
):
    """Get detailed leave utilization analytics."""
    return {"message": "Leave analytics endpoint"}


@app.get("/analytics/diversity")
async def get_diversity_analytics(
    tenant_id: str = Query(...),
):
    """Get workforce diversity analytics."""
    return {"message": "Diversity analytics endpoint"}


@app.get("/analytics/compensation")
async def get_compensation_analytics(
    tenant_id: str = Query(...),
):
    """Get compensation analytics and benchmarking."""
    return {"message": "Compensation analytics endpoint"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
