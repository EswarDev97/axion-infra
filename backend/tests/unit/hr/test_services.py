"""
HR Service Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- DepartmentService
- PositionService
- EmployeeService
- LeaveService
- AttendanceService
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestDepartmentService:
    """Tests for DepartmentService."""

    async def test_create_department(self, db_session, test_tenant, test_user):
        """Test department creation."""
        from services.hr.services.department_service import DepartmentService
        from services.hr.schemas.department import DepartmentCreate

        service = DepartmentService(db_session)

        department_data = DepartmentCreate(
            name="Engineering",
            code="ENG",
            description="Engineering department",
        )

        department = await service.create(
            tenant_id=test_tenant.id,
            data=department_data,
            user_id=test_user.id,
        )

        assert department.id is not None
        assert department.name == "Engineering"
        assert department.code == "ENG"

    async def test_get_department_by_id(self, db_session, test_tenant, test_user):
        """Test getting department by ID."""
        from services.hr.services.department_service import DepartmentService
        from services.hr.models.department import Department

        # Create department
        department = Department(
            tenant_id=test_tenant.id,
            name="Sales",
            code="SALES",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(department)
        await db_session.commit()

        service = DepartmentService(db_session)
        result = await service.get_by_id(
            tenant_id=test_tenant.id,
            id=department.id,
        )

        assert result is not None
        assert result.name == "Sales"

    async def test_list_departments(self, db_session, test_tenant, test_user):
        """Test listing departments."""
        from services.hr.services.department_service import DepartmentService
        from services.hr.models.department import Department

        # Create multiple departments
        for i, name in enumerate(["HR", "Finance", "IT"]):
            dept = Department(
                tenant_id=test_tenant.id,
                name=name,
                code=name.upper(),
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(dept)

        await db_session.commit()

        service = DepartmentService(db_session)
        departments = await service.list(tenant_id=test_tenant.id)

        assert len(departments) >= 3

    async def test_update_department(self, db_session, test_tenant, test_user):
        """Test department update."""
        from services.hr.services.department_service import DepartmentService
        from services.hr.models.department import Department
        from services.hr.schemas.department import DepartmentUpdate

        department = Department(
            tenant_id=test_tenant.id,
            name="Old Name",
            code="OLD",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(department)
        await db_session.commit()

        service = DepartmentService(db_session)
        update_data = DepartmentUpdate(name="New Name")

        updated = await service.update(
            tenant_id=test_tenant.id,
            id=department.id,
            data=update_data,
            user_id=test_user.id,
        )

        assert updated.name == "New Name"

    async def test_soft_delete_department(self, db_session, test_tenant, test_user):
        """Test department soft delete."""
        from services.hr.services.department_service import DepartmentService
        from services.hr.models.department import Department

        department = Department(
            tenant_id=test_tenant.id,
            name="To Delete",
            code="DEL",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(department)
        await db_session.commit()

        service = DepartmentService(db_session)
        await service.soft_delete(
            tenant_id=test_tenant.id,
            id=department.id,
            user_id=test_user.id,
            reason="No longer needed",
        )

        await db_session.refresh(department)
        assert department.is_deleted is True


class TestEmployeeService:
    """Tests for EmployeeService."""

    async def test_create_employee(self, db_session, test_tenant, test_user):
        """Test employee creation."""
        from services.hr.services.employee_service import EmployeeService
        from services.hr.models.department import Department
        from services.hr.models.position import Position
        from services.hr.schemas.employee import EmployeeCreate

        # Create department and position
        department = Department(
            tenant_id=test_tenant.id,
            name="Test Dept",
            code="TEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(department)
        await db_session.commit()

        position = Position(
            tenant_id=test_tenant.id,
            title="Developer",
            code="DEV",
            department_id=department.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(position)
        await db_session.commit()

        service = EmployeeService(db_session)
        employee_data = EmployeeCreate(
            user_id=test_user.id,
            employee_number="EMP001",
            department_id=department.id,
            position_id=position.id,
            hire_date=date.today(),
            employment_type="FULL_TIME",
        )

        employee = await service.create(
            tenant_id=test_tenant.id,
            data=employee_data,
            user_id=test_user.id,
        )

        assert employee.id is not None
        assert employee.employee_number == "EMP001"

    async def test_get_employee_by_user_id(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test getting employee by user ID."""
        from services.hr.services.employee_service import EmployeeService

        service = EmployeeService(db_session)
        employee = await service.get_by_user_id(
            tenant_id=test_tenant.id,
            user_id=test_employee.user_id,
        )

        assert employee is not None
        assert employee.id == test_employee.id


class TestLeaveService:
    """Tests for LeaveService."""

    async def test_create_leave_request(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test leave request creation."""
        from services.hr.services.leave_service import LeaveService
        from services.hr.models.leave_type import LeaveType
        from services.hr.models.leave_balance import LeaveBalance
        from services.hr.schemas.leave import LeaveRequestCreate

        # Create leave type
        leave_type = LeaveType(
            tenant_id=test_tenant.id,
            name="Annual Leave",
            code="ANNUAL",
            default_days=20,
            requires_approval=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_type)
        await db_session.commit()

        # Create balance
        balance = LeaveBalance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            year=date.today().year,
            entitled_days=Decimal("20"),
            carried_over=Decimal("0"),
            used_days=Decimal("0"),
            pending_days=Decimal("0"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(balance)
        await db_session.commit()

        service = LeaveService(db_session)
        request_data = LeaveRequestCreate(
            leave_type_id=leave_type.id,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=9),
            reason="Family vacation",
        )

        leave_request = await service.create_request(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            data=request_data,
            user_id=test_user.id,
        )

        assert leave_request.id is not None
        assert leave_request.status == "PENDING"

    async def test_approve_leave_request(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test leave request approval."""
        from services.hr.services.leave_service import LeaveService
        from services.hr.models.leave_type import LeaveType
        from services.hr.models.leave_request import LeaveRequest
        from services.hr.models.leave_balance import LeaveBalance

        # Create leave type
        leave_type = LeaveType(
            tenant_id=test_tenant.id,
            name="Sick Leave",
            code="SICK",
            default_days=10,
            requires_approval=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_type)
        await db_session.commit()

        # Create balance
        balance = LeaveBalance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            year=date.today().year,
            entitled_days=Decimal("10"),
            carried_over=Decimal("0"),
            used_days=Decimal("0"),
            pending_days=Decimal("2"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(balance)
        await db_session.commit()

        # Create pending request
        leave_request = LeaveRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=2),
            total_days=Decimal("2"),
            reason="Not feeling well",
            status="PENDING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_request)
        await db_session.commit()

        service = LeaveService(db_session)
        approved_request = await service.approve_request(
            tenant_id=test_tenant.id,
            request_id=leave_request.id,
            approver_id=test_user.id,
            comments="Approved",
        )

        assert approved_request.status == "APPROVED"

    async def test_reject_leave_request(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test leave request rejection."""
        from services.hr.services.leave_service import LeaveService
        from services.hr.models.leave_type import LeaveType
        from services.hr.models.leave_request import LeaveRequest
        from services.hr.models.leave_balance import LeaveBalance

        leave_type = LeaveType(
            tenant_id=test_tenant.id,
            name="Personal",
            code="PERSONAL",
            default_days=5,
            requires_approval=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_type)
        await db_session.commit()

        balance = LeaveBalance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            year=date.today().year,
            entitled_days=Decimal("5"),
            pending_days=Decimal("1"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(balance)
        await db_session.commit()

        leave_request = LeaveRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            start_date=date.today() + timedelta(days=1),
            end_date=date.today() + timedelta(days=1),
            total_days=Decimal("1"),
            reason="Personal matter",
            status="PENDING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_request)
        await db_session.commit()

        service = LeaveService(db_session)
        rejected_request = await service.reject_request(
            tenant_id=test_tenant.id,
            request_id=leave_request.id,
            approver_id=test_user.id,
            reason="Insufficient staffing on that day",
        )

        assert rejected_request.status == "REJECTED"
        assert rejected_request.rejection_reason == "Insufficient staffing on that day"

    async def test_get_leave_balance(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test getting leave balance."""
        from services.hr.services.leave_service import LeaveService
        from services.hr.models.leave_type import LeaveType
        from services.hr.models.leave_balance import LeaveBalance

        leave_type = LeaveType(
            tenant_id=test_tenant.id,
            name="Vacation",
            code="VAC",
            default_days=15,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(leave_type)
        await db_session.commit()

        balance = LeaveBalance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            leave_type_id=leave_type.id,
            year=date.today().year,
            entitled_days=Decimal("15"),
            used_days=Decimal("5"),
            pending_days=Decimal("2"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(balance)
        await db_session.commit()

        service = LeaveService(db_session)
        balances = await service.get_employee_balances(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            year=date.today().year,
        )

        assert len(balances) >= 1
        vac_balance = next((b for b in balances if b.leave_type_id == leave_type.id), None)
        assert vac_balance is not None
        assert vac_balance.entitled_days == Decimal("15")
        assert vac_balance.used_days == Decimal("5")


class TestAttendanceService:
    """Tests for AttendanceService."""

    async def test_clock_in(self, db_session, test_tenant, test_user, test_employee):
        """Test employee clock in."""
        from services.hr.services.attendance_service import AttendanceService

        service = AttendanceService(db_session)
        attendance = await service.clock_in(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            user_id=test_user.id,
        )

        assert attendance.id is not None
        assert attendance.clock_in is not None
        assert attendance.clock_out is None

    async def test_clock_out(self, db_session, test_tenant, test_user, test_employee):
        """Test employee clock out."""
        from services.hr.services.attendance_service import AttendanceService
        from services.hr.models.attendance import Attendance

        # Create attendance record with clock in
        attendance = Attendance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            date=date.today(),
            clock_in=datetime.utcnow() - timedelta(hours=8),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(attendance)
        await db_session.commit()

        service = AttendanceService(db_session)
        updated = await service.clock_out(
            tenant_id=test_tenant.id,
            attendance_id=attendance.id,
            user_id=test_user.id,
        )

        assert updated.clock_out is not None
        assert updated.total_hours is not None

    async def test_get_attendance_for_date(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test getting attendance for a specific date."""
        from services.hr.services.attendance_service import AttendanceService
        from services.hr.models.attendance import Attendance

        today = date.today()
        attendance = Attendance(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            date=today,
            clock_in=datetime.utcnow().replace(hour=9, minute=0),
            clock_out=datetime.utcnow().replace(hour=17, minute=0),
            total_hours=Decimal("8.0"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(attendance)
        await db_session.commit()

        service = AttendanceService(db_session)
        result = await service.get_for_date(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            date=today,
        )

        assert result is not None
        assert result.total_hours == Decimal("8.0")

    async def test_get_attendance_summary(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test getting attendance summary for period."""
        from services.hr.services.attendance_service import AttendanceService
        from services.hr.models.attendance import Attendance

        # Create attendance records for a week
        base_date = date.today() - timedelta(days=7)
        for i in range(5):  # Mon-Fri
            att = Attendance(
                tenant_id=test_tenant.id,
                employee_id=test_employee.id,
                date=base_date + timedelta(days=i),
                clock_in=datetime.utcnow().replace(hour=9, minute=0),
                clock_out=datetime.utcnow().replace(hour=17, minute=0),
                total_hours=Decimal("8.0"),
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(att)

        await db_session.commit()

        service = AttendanceService(db_session)
        summary = await service.get_summary(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            start_date=base_date,
            end_date=base_date + timedelta(days=6),
        )

        assert summary is not None
        assert summary.total_days >= 5
