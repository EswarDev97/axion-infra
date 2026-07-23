"""
MindFlow HR Service - Attendance Management Business Logic
Per API_CONTRACT.md Section 8.2.5

Enhanced with:
- /me/today and /me endpoints
- Late detection (office_start_time + grace_period)
- Half-day detection (work_hours < min_work_hours)
- Absent marking
- Role-based team filtering
- Audit logging
"""

from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceNotFoundException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import AttendanceRecord, AttendanceConfig, Employee
from ..schemas.attendance import (
    AttendanceBulkImportItem,
    EmployeeAttendanceSummary,
)


class AttendanceService:
    """Attendance management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Config
    # ========================================================================

    async def get_or_create_config(self, tenant_id: UUID) -> AttendanceConfig:
        """Get attendance config for tenant, creating defaults if none exists."""
        stmt = select(AttendanceConfig).where(
            AttendanceConfig.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            config = AttendanceConfig(
                tenant_id=tenant_id,
                office_start_time=time(9, 0),
                office_end_time=time(18, 0),
                grace_period_minutes=15,
                min_work_hours=Decimal("8.00"),
                half_day_hours=Decimal("4.00"),
            )
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)

        return config

    async def update_config(
        self,
        tenant_id: UUID,
        office_start_time: Optional[str] = None,
        office_end_time: Optional[str] = None,
        grace_period_minutes: Optional[int] = None,
        min_work_hours: Optional[Decimal] = None,
        half_day_hours: Optional[Decimal] = None,
    ) -> AttendanceConfig:
        """Update attendance config for tenant."""
        config = await self.get_or_create_config(tenant_id)

        if office_start_time is not None:
            h, m = map(int, office_start_time.split(":"))
            config.office_start_time = time(h, m)
        if office_end_time is not None:
            h, m = map(int, office_end_time.split(":"))
            config.office_end_time = time(h, m)
        if grace_period_minutes is not None:
            config.grace_period_minutes = grace_period_minutes
        if min_work_hours is not None:
            config.min_work_hours = min_work_hours
        if half_day_hours is not None:
            config.half_day_hours = half_day_hours

        await self.db.commit()
        await self.db.refresh(config)
        return config

    # ========================================================================
    # Check In / Check Out
    # ========================================================================

    async def check_in(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        notes: Optional[str] = None,
        actor_user_id: Optional[UUID] = None,
    ) -> AttendanceRecord:
        """Record check-in for an employee with auto late detection."""
        await self._validate_employee(employee_id, tenant_id)

        today = date.today()
        now = datetime.utcnow()

        # Check if already checked in today
        stmt = select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date == today
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.check_in:
                raise BusinessRuleViolationException(
                    "Already checked in today"
                )
            existing.check_in = now
            existing.status = await self._determine_checkin_status(tenant_id, now)
            if notes:
                existing.notes = notes
            existing.updated_at = now
            await self.db.commit()
            await self.db.refresh(existing)
            await self._log_audit(tenant_id, actor_user_id, "ATTENDANCE_CHECK_IN", "attendance_records", existing.id)
            return existing

        # Determine status (PRESENT or LATE)
        status = await self._determine_checkin_status(tenant_id, now)

        record = AttendanceRecord(
            tenant_id=tenant_id,
            employee_id=employee_id,
            date=today,
            check_in=now,
            status=status,
            notes=notes,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)

        await self._log_audit(tenant_id, actor_user_id, "ATTENDANCE_CHECK_IN", "attendance_records", record.id)
        return record

    async def check_out(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        notes: Optional[str] = None,
        actor_user_id: Optional[UUID] = None,
    ) -> AttendanceRecord:
        """Record check-out for an employee with auto half-day detection."""
        await self._validate_employee(employee_id, tenant_id)

        today = date.today()
        now = datetime.utcnow()

        stmt = select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date == today
        )
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()

        if not record:
            raise BusinessRuleViolationException(
                "No check-in record found for today"
            )

        if not record.check_in:
            raise BusinessRuleViolationException(
                "Must check in before checking out"
            )

        if record.check_out:
            raise BusinessRuleViolationException(
                "Already checked out today"
            )

        record.check_out = now
        record.work_hours = record.calculate_work_hours()
        if notes:
            record.notes = (record.notes or "") + f"\n{notes}"
        record.updated_at = now

        # Auto half-day detection: if work_hours below threshold, mark HALF_DAY
        # Overtime detection: if work_hours exceeds min_work_hours
        if record.work_hours:
            config = await self.get_or_create_config(tenant_id)
            if record.work_hours < config.half_day_hours:
                record.status = "HALF_DAY"
            elif record.work_hours > config.min_work_hours:
                # Calculate overtime
                record.overtime_hours = record.work_hours - config.min_work_hours

        await self.db.commit()
        await self.db.refresh(record)

        await self._log_audit(tenant_id, actor_user_id, "ATTENDANCE_CHECK_OUT", "attendance_records", record.id)
        return record

    # ========================================================================
    # My Attendance (self-service endpoints)
    # ========================================================================

    async def get_today_status(
        self,
        tenant_id: UUID,
        employee_id: UUID,
    ) -> Optional[AttendanceRecord]:
        """Get today's attendance record for an employee."""
        today = date.today()
        stmt = select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date == today,
        ).options(
            selectinload(AttendanceRecord.employee)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_my_attendance(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[AttendanceRecord]:
        """Get attendance history for a specific employee."""
        stmt = select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.tenant_id == tenant_id,
        ).options(
            selectinload(AttendanceRecord.employee)
        )

        if start_date:
            stmt = stmt.where(AttendanceRecord.date >= start_date)
        if end_date:
            stmt = stmt.where(AttendanceRecord.date <= end_date)

        stmt = stmt.order_by(AttendanceRecord.date.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ========================================================================
    # CRUD / List
    # ========================================================================

    async def get_attendance_record(
        self,
        record_id: UUID,
        tenant_id: UUID
    ) -> AttendanceRecord:
        """Get attendance record by ID."""
        stmt = select(AttendanceRecord).where(
            AttendanceRecord.id == record_id,
            AttendanceRecord.tenant_id == tenant_id
        ).options(
            selectinload(AttendanceRecord.employee)
        )
        result = await self.db.execute(stmt)
        record = result.scalar_one_or_none()

        if not record:
            raise ResourceNotFoundException("AttendanceRecord", str(record_id))

        return record

    async def list_attendance(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        employee_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[AttendanceRecord], int]:
        """List attendance records with pagination and filters."""
        base_query = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id
        )

        if employee_id:
            base_query = base_query.where(
                AttendanceRecord.employee_id == employee_id
            )
        if start_date:
            base_query = base_query.where(AttendanceRecord.date >= start_date)
        if end_date:
            base_query = base_query.where(AttendanceRecord.date <= end_date)
        if status:
            base_query = base_query.where(AttendanceRecord.status == status)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(AttendanceRecord.employee)
        ).offset(pagination.offset).limit(pagination.page_size)

        if pagination.sort_by == "date":
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(AttendanceRecord.date.desc())
            else:
                stmt = stmt.order_by(AttendanceRecord.date.asc())
        else:
            stmt = stmt.order_by(AttendanceRecord.date.desc())

        result = await self.db.execute(stmt)
        records = list(result.scalars().all())

        return records, total

    async def list_team_attendance(
        self,
        tenant_id: UUID,
        manager_employee_id: UUID,
        pagination: PaginationParams,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        employee_id: Optional[UUID] = None,
    ) -> Tuple[List[AttendanceRecord], int]:
        """List attendance records for a manager's subordinates only."""
        # Get subordinate IDs (direct reports)
        sub_stmt = select(Employee.id).where(
            Employee.manager_id == manager_employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
        )
        sub_result = await self.db.execute(sub_stmt)
        subordinate_ids = [row[0] for row in sub_result.fetchall()]

        # Include manager's own ID
        subordinate_ids.append(manager_employee_id)

        if not subordinate_ids:
            return [], 0

        base_query = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id.in_(subordinate_ids),
        )

        if employee_id:
            # Further filter within team
            if employee_id not in subordinate_ids:
                return [], 0
            base_query = base_query.where(
                AttendanceRecord.employee_id == employee_id
            )
        if start_date:
            base_query = base_query.where(AttendanceRecord.date >= start_date)
        if end_date:
            base_query = base_query.where(AttendanceRecord.date <= end_date)
        if status:
            base_query = base_query.where(AttendanceRecord.status == status)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(AttendanceRecord.employee)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(AttendanceRecord.date.desc())

        result = await self.db.execute(stmt)
        records = list(result.scalars().all())

        return records, total

    # ========================================================================
    # Correction (HR Admin)
    # ========================================================================

    async def correct_attendance(
        self,
        record_id: UUID,
        tenant_id: UUID,
        check_in: Optional[datetime] = None,
        check_out: Optional[datetime] = None,
        status: Optional[str] = None,
        notes: Optional[str] = None,
        actor_user_id: Optional[UUID] = None,
    ) -> AttendanceRecord:
        """Allow HR admin to correct an attendance record."""
        record = await self.get_attendance_record(record_id, tenant_id)

        if check_in is not None:
            record.check_in = check_in
        if check_out is not None:
            record.check_out = check_out
        if status is not None:
            record.status = status
        if notes is not None:
            record.notes = notes

        # Recalculate work hours and overtime if both timestamps exist
        if record.check_in and record.check_out:
            record.work_hours = record.calculate_work_hours()
            config = await self.get_or_create_config(tenant_id)
            if record.work_hours and record.work_hours > config.min_work_hours:
                record.overtime_hours = record.work_hours - config.min_work_hours
            else:
                record.overtime_hours = None

        record.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(record)

        await self._log_audit(
            tenant_id, actor_user_id,
            "ATTENDANCE_CORRECTION", "attendance_records",
            record.id, f"HR correction applied"
        )
        return record

    # ========================================================================
    # Team Today Status (Manager)
    # ========================================================================

    async def get_team_today_status(
        self,
        tenant_id: UUID,
        manager_employee_id: UUID,
    ) -> List[Dict]:
        """Get today's attendance status for all team members."""
        today = date.today()

        # Get subordinates
        sub_stmt = select(Employee).where(
            Employee.manager_id == manager_employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
            Employee.status == "ACTIVE",
        ).options(
            selectinload(Employee.department)
        )
        sub_result = await self.db.execute(sub_stmt)
        subordinates = list(sub_result.scalars().all())

        # Get today's attendance for all subordinate IDs
        sub_ids = [s.id for s in subordinates]
        if not sub_ids:
            return []

        att_stmt = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id.in_(sub_ids),
            AttendanceRecord.date == today,
        )
        att_result = await self.db.execute(att_stmt)
        records = {r.employee_id: r for r in att_result.scalars().all()}

        result = []
        for emp in subordinates:
            rec = records.get(emp.id)
            result.append({
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "employee_code": emp.employee_code,
                "department_name": emp.department.name if emp.department else None,
                "status": rec.status if rec else None,
                "check_in": rec.check_in if rec else None,
                "check_out": rec.check_out if rec else None,
                "work_hours": rec.work_hours if rec else None,
            })
        return result

    # ========================================================================
    # Dashboard Stats
    # ========================================================================

    async def get_dashboard_stats(
        self,
        tenant_id: UUID,
    ) -> Dict:
        """Get today's attendance dashboard statistics."""
        today = date.today()

        # Total active employees
        emp_stmt = select(func.count()).select_from(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
            Employee.status == "ACTIVE",
        )
        emp_result = await self.db.execute(emp_stmt)
        total_employees = emp_result.scalar() or 0

        # Today's attendance records
        att_stmt = select(AttendanceRecord.status, func.count()).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date == today,
        ).group_by(AttendanceRecord.status)
        att_result = await self.db.execute(att_stmt)
        status_counts = dict(att_result.fetchall())

        present = status_counts.get("PRESENT", 0)
        late = status_counts.get("LATE", 0)
        absent = status_counts.get("ABSENT", 0)
        on_leave = status_counts.get("ON_LEAVE", 0)

        # Present includes PRESENT + LATE + HALF_DAY + WORK_FROM_HOME
        checked_in = present + late + status_counts.get("HALF_DAY", 0) + status_counts.get("WORK_FROM_HOME", 0)
        pct = Decimal(str(round(checked_in / total_employees * 100, 1))) if total_employees > 0 else Decimal("0.0")

        return {
            "total_employees": total_employees,
            "present_today": checked_in,
            "absent_today": absent,
            "late_today": late,
            "on_leave_today": on_leave,
            "attendance_percentage": pct,
        }

    # ========================================================================
    # Department-Level Filtering (for Department Heads)
    # ========================================================================

    async def list_department_attendance(
        self,
        tenant_id: UUID,
        department_id: UUID,
        pagination: PaginationParams,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        employee_id: Optional[UUID] = None,
    ) -> Tuple[List[AttendanceRecord], int]:
        """List attendance for all employees in a department."""
        # Get employee IDs in department
        emp_stmt = select(Employee.id).where(
            Employee.department_id == department_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
        )
        emp_result = await self.db.execute(emp_stmt)
        dept_emp_ids = [row[0] for row in emp_result.fetchall()]

        if not dept_emp_ids:
            return [], 0

        base_query = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.employee_id.in_(dept_emp_ids),
        )

        if employee_id:
            if employee_id not in dept_emp_ids:
                return [], 0
            base_query = base_query.where(AttendanceRecord.employee_id == employee_id)
        if start_date:
            base_query = base_query.where(AttendanceRecord.date >= start_date)
        if end_date:
            base_query = base_query.where(AttendanceRecord.date <= end_date)
        if status:
            base_query = base_query.where(AttendanceRecord.status == status)

        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        stmt = base_query.options(
            selectinload(AttendanceRecord.employee)
        ).offset(pagination.offset).limit(pagination.page_size)
        stmt = stmt.order_by(AttendanceRecord.date.desc())

        result = await self.db.execute(stmt)
        records = list(result.scalars().all())

        return records, total

    # ========================================================================
    # CSV Export
    # ========================================================================

    async def export_attendance_csv(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date,
        department_id: Optional[UUID] = None,
        employee_id: Optional[UUID] = None,
    ) -> List[Dict]:
        """Export attendance records as flat dicts for CSV generation."""
        base_query = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date >= start_date,
            AttendanceRecord.date <= end_date,
        ).options(
            selectinload(AttendanceRecord.employee)
        )

        if employee_id:
            base_query = base_query.where(AttendanceRecord.employee_id == employee_id)

        if department_id:
            emp_stmt = select(Employee.id).where(
                Employee.department_id == department_id,
                Employee.tenant_id == tenant_id,
                Employee.is_deleted == False,
            )
            emp_result = await self.db.execute(emp_stmt)
            dept_ids = [row[0] for row in emp_result.fetchall()]
            if not dept_ids:
                return []
            base_query = base_query.where(AttendanceRecord.employee_id.in_(dept_ids))

        base_query = base_query.order_by(AttendanceRecord.date.asc())

        result = await self.db.execute(base_query)
        records = list(result.scalars().all())

        rows = []
        for r in records:
            rows.append({
                "Date": str(r.date),
                "Employee Code": r.employee.employee_code if r.employee else "",
                "Employee Name": r.employee.full_name if r.employee else "",
                "Check In": r.check_in.isoformat() if r.check_in else "",
                "Check Out": r.check_out.isoformat() if r.check_out else "",
                "Work Hours": str(r.work_hours or ""),
                "Overtime Hours": str(r.overtime_hours or ""),
                "Status": r.status,
                "Notes": r.notes or "",
            })
        return rows

    # ========================================================================
    # Bulk Import
    # ========================================================================

    async def bulk_import(
        self,
        tenant_id: UUID,
        records: List[AttendanceBulkImportItem]
    ) -> Dict[str, any]:
        """Bulk import attendance records."""
        successful = 0
        failed = 0
        errors = []

        for item in records:
            try:
                # Find employee by code
                stmt = select(Employee).where(
                    Employee.employee_code == item.employee_code,
                    Employee.tenant_id == tenant_id,
                    Employee.is_deleted == False
                )
                result = await self.db.execute(stmt)
                employee = result.scalar_one_or_none()

                if not employee:
                    errors.append({
                        "employeeCode": item.employee_code,
                        "date": str(item.date),
                        "error": "Employee not found"
                    })
                    failed += 1
                    continue

                # Check if record exists
                stmt = select(AttendanceRecord).where(
                    AttendanceRecord.employee_id == employee.id,
                    AttendanceRecord.tenant_id == tenant_id,
                    AttendanceRecord.date == item.date
                )
                result = await self.db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    if item.check_in:
                        existing.check_in = item.check_in
                    if item.check_out:
                        existing.check_out = item.check_out
                    existing.status = item.status
                    if item.notes:
                        existing.notes = item.notes
                    if existing.check_in and existing.check_out:
                        existing.work_hours = existing.calculate_work_hours()
                else:
                    record = AttendanceRecord(
                        tenant_id=tenant_id,
                        employee_id=employee.id,
                        date=item.date,
                        check_in=item.check_in,
                        check_out=item.check_out,
                        status=item.status,
                        notes=item.notes
                    )
                    if record.check_in and record.check_out:
                        record.work_hours = record.calculate_work_hours()
                    self.db.add(record)

                successful += 1

            except Exception as e:
                errors.append({
                    "employeeCode": item.employee_code,
                    "date": str(item.date),
                    "error": str(e)
                })
                failed += 1

        await self.db.commit()

        return {
            "total": len(records),
            "successful": successful,
            "failed": failed,
            "errors": errors
        }

    # ========================================================================
    # Reports
    # ========================================================================

    async def generate_report(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date,
        department_id: Optional[UUID] = None,
        employee_id: Optional[UUID] = None
    ) -> Dict[str, any]:
        """Generate attendance report."""
        emp_query = select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        ).options(
            selectinload(Employee.department)
        )

        if department_id:
            emp_query = emp_query.where(Employee.department_id == department_id)
        if employee_id:
            emp_query = emp_query.where(Employee.id == employee_id)

        result = await self.db.execute(emp_query)
        employees = list(result.scalars().all())

        summaries = []
        for emp in employees:
            stmt = select(AttendanceRecord).where(
                AttendanceRecord.employee_id == emp.id,
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.date >= start_date,
                AttendanceRecord.date <= end_date
            )
            result = await self.db.execute(stmt)
            records = list(result.scalars().all())

            total_days = (end_date - start_date).days + 1
            present_days = sum(1 for r in records if r.status == "PRESENT")
            absent_days = sum(1 for r in records if r.status == "ABSENT")
            late_days = sum(1 for r in records if r.status == "LATE")
            leave_days = sum(1 for r in records if r.status == "ON_LEAVE")
            half_days = sum(1 for r in records if r.status == "HALF_DAY")

            total_work_hours = sum(
                (r.work_hours or Decimal("0.00")) for r in records
            )
            average_work_hours = (
                total_work_hours / present_days if present_days > 0
                else Decimal("0.00")
            )

            summaries.append(EmployeeAttendanceSummary(
                employeeId=emp.id,
                employeeName=emp.full_name,
                employeeCode=emp.employee_code,
                departmentName=emp.department.name if emp.department else None,
                totalDays=total_days,
                presentDays=present_days,
                absentDays=absent_days,
                lateDays=late_days,
                leaveDays=leave_days,
                halfDays=half_days,
                totalWorkHours=total_work_hours,
                averageWorkHours=round(average_work_hours, 2)
            ))

        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_employees": len(employees),
            "summary": summaries
        }

    # ========================================================================
    # Mark Absent
    # ========================================================================

    async def mark_absent(
        self,
        tenant_id: UUID,
        target_date: date,
        actor_user_id: Optional[UUID] = None,
    ) -> Dict[str, any]:
        """
        Process daily attendance for target_date:
        1. If date is a weekly off → mark WEEKLY_OFF for all without records
        2. If date is a holiday → mark HOLIDAY for all without records
        3. Otherwise → mark ABSENT for all without records
        Uses configurable weekly offs (not hardcoded weekends).
        """
        from .holiday_service import HolidayService

        holiday_service = HolidayService(self.db)

        # Check weekly off (configurable per tenant)
        weekly_off_days = await holiday_service.get_weekly_off_days(tenant_id)
        is_weekly_off = target_date.weekday() in weekly_off_days

        # Check holiday
        holiday = await holiday_service.get_holidays_for_date(tenant_id, target_date)
        is_holiday = holiday is not None

        # Determine status and notes
        if is_weekly_off:
            auto_status = "WEEKLY_OFF"
            auto_notes = "Auto-marked weekly off"
        elif is_holiday:
            auto_status = "HOLIDAY"
            auto_notes = f"Holiday: {holiday.holiday_name}"
        else:
            auto_status = "ABSENT"
            auto_notes = "Auto-marked absent (no attendance record)"

        # Get all active employees
        emp_stmt = select(Employee).where(
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
            Employee.status == "ACTIVE",
        )
        result = await self.db.execute(emp_stmt)
        employees = list(result.scalars().all())

        # Get employee IDs that already have records for target_date
        existing_stmt = select(AttendanceRecord.employee_id).where(
            AttendanceRecord.tenant_id == tenant_id,
            AttendanceRecord.date == target_date,
        )
        result = await self.db.execute(existing_stmt)
        existing_ids = {row[0] for row in result.fetchall()}

        marked = 0
        for emp in employees:
            if emp.id not in existing_ids:
                record = AttendanceRecord(
                    tenant_id=tenant_id,
                    employee_id=emp.id,
                    date=target_date,
                    status=auto_status,
                    notes=auto_notes,
                )
                self.db.add(record)
                marked += 1

        if marked > 0:
            await self.db.commit()
            await self._log_audit(
                tenant_id, actor_user_id,
                "ATTENDANCE_MARK_ABSENT", "attendance_records",
                None, f"Marked {marked} employees as {auto_status} for {target_date}"
            )

        return {
            "marked": marked,
            "status": auto_status,
            "is_weekly_off": is_weekly_off,
            "is_holiday": is_holiday,
        }

    # ========================================================================
    # Private Helpers
    # ========================================================================

    async def _determine_checkin_status(
        self, tenant_id: UUID, check_in_time: datetime
    ) -> str:
        """Determine if check-in is PRESENT or LATE based on config."""
        try:
            config = await self.get_or_create_config(tenant_id)
            office_start = config.office_start_time
            grace_minutes = config.grace_period_minutes

            # Compare just the time portion
            ci_time = check_in_time.time()
            # Calculate the late threshold: office_start + grace
            threshold_dt = datetime.combine(date.today(), office_start) + timedelta(minutes=grace_minutes)
            threshold_time = threshold_dt.time()

            if ci_time > threshold_time:
                return "LATE"
        except Exception:
            # If config doesn't exist yet or any error, default to PRESENT
            pass

        return "PRESENT"

    async def _validate_employee(
        self,
        employee_id: UUID,
        tenant_id: UUID
    ) -> Employee:
        """Validate employee exists and is active."""
        stmt = select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False,
            Employee.status == "ACTIVE"
        )
        result = await self.db.execute(stmt)
        employee = result.scalar_one_or_none()

        if not employee:
            raise ResourceNotFoundException("Employee", str(employee_id))

        return employee

    async def _log_audit(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID],
        action: str,
        entity: str,
        entity_id: Optional[UUID],
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Log an audit entry for attendance actions."""
        try:
            await self.db.execute(
                text("""
                    INSERT INTO audit_logs
                        (id, user_id, action, entity, entity_id, new_data,
                         ip_address, user_agent, created_at)
                    VALUES (gen_random_uuid(), :user_id, :action, :entity,
                            :entity_id, :details, :ip_address, :user_agent, NOW())
                """),
                {
                    "user_id": str(user_id) if user_id else None,
                    "action": action,
                    "entity": entity,
                    "entity_id": str(entity_id) if entity_id else None,
                    "details": details,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                }
            )
        except Exception:
            # Audit logging should never break the main flow
            pass
