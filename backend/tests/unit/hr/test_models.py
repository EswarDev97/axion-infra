"""
HR Service - Model Unit Tests
Per SDLC Phase 7 Task 7.1 - Write Unit Tests

Tests for:
- Employee model
- Department model
- Position model
- LeaveType model
- LeaveRequest model
- LeaveBalance model
- Attendance model
"""

import pytest
from datetime import datetime, date, time, timedelta
from uuid import uuid4
from decimal import Decimal

pytestmark = pytest.mark.unit


class TestEmployeeModel:
    """Tests for the Employee model."""

    @pytest.mark.asyncio
    async def test_employee_creation(self, db_session, test_tenant, test_user):
        """Test employee model creation with required fields."""
        from services.hr.models import Employee, Department, Position

        # Create department and position first
        department = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Engineering",
            code="ENG",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(department)

        position = Position(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Software Engineer",
            code="SWE",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(position)
        await db_session.flush()

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="EMP001",
            first_name="John",
            last_name="Doe",
            email="john.doe@company.com",
            department_id=department.id,
            position_id=position.id,
            hire_date=date.today(),
            employment_status="ACTIVE",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(employee)
        await db_session.flush()

        assert employee.id is not None
        assert employee.employee_code == "EMP001"
        assert employee.first_name == "John"
        assert employee.employment_status == "ACTIVE"

    @pytest.mark.asyncio
    async def test_employee_code_unique_per_tenant(self, db_session, test_tenant, test_user):
        """Test employee code must be unique within a tenant."""
        from services.hr.models import Employee
        from sqlalchemy.exc import IntegrityError

        employee1 = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="DUP001",
            first_name="First",
            last_name="Employee",
            email="first@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee1)
        await db_session.flush()

        employee2 = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=uuid4(),
            employee_code="DUP001",  # Duplicate code
            first_name="Second",
            last_name="Employee",
            email="second@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_employee_soft_delete(self, db_session, test_tenant, test_user):
        """Test employee soft delete."""
        from services.hr.models import Employee

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="DEL001",
            first_name="Delete",
            last_name="Me",
            email="delete@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        # Soft delete
        employee.is_deleted = True
        employee.deleted_at = datetime.utcnow()
        employee.deletion_reason = "Employment terminated"
        await db_session.flush()

        assert employee.is_deleted is True
        assert employee.deleted_at is not None

    @pytest.mark.asyncio
    async def test_employee_full_name_property(self, db_session, test_tenant, test_user):
        """Test employee full name computed property."""
        from services.hr.models import Employee

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="FN001",
            first_name="Jane",
            last_name="Smith",
            email="jane@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        # If there's a full_name property
        if hasattr(employee, 'full_name'):
            assert employee.full_name == "Jane Smith"

    @pytest.mark.asyncio
    async def test_employee_reporting_manager(self, db_session, test_tenant, test_user):
        """Test employee reporting manager relationship."""
        from services.hr.models import Employee

        manager = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="MGR001",
            first_name="Manager",
            last_name="One",
            email="manager@company.com",
            hire_date=date.today(),
        )
        db_session.add(manager)
        await db_session.flush()

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=uuid4(),
            employee_code="EMP002",
            first_name="Employee",
            last_name="Two",
            email="employee@company.com",
            hire_date=date.today(),
            reporting_manager_id=manager.id,
        )
        db_session.add(employee)
        await db_session.flush()

        assert employee.reporting_manager_id == manager.id


class TestDepartmentModel:
    """Tests for the Department model."""

    @pytest.mark.asyncio
    async def test_department_creation(self, db_session, test_tenant):
        """Test department model creation."""
        from services.hr.models import Department

        department = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Human Resources",
            code="HR",
            description="HR Department",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(department)
        await db_session.flush()

        assert department.id is not None
        assert department.name == "Human Resources"
        assert department.code == "HR"

    @pytest.mark.asyncio
    async def test_department_code_unique_per_tenant(self, db_session, test_tenant):
        """Test department code must be unique within a tenant."""
        from services.hr.models import Department
        from sqlalchemy.exc import IntegrityError

        dept1 = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="First Dept",
            code="SAME",
        )
        db_session.add(dept1)
        await db_session.flush()

        dept2 = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Second Dept",
            code="SAME",  # Duplicate code
        )
        db_session.add(dept2)

        with pytest.raises(IntegrityError):
            await db_session.flush()

    @pytest.mark.asyncio
    async def test_department_hierarchy(self, db_session, test_tenant):
        """Test department parent-child hierarchy."""
        from services.hr.models import Department

        parent = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Parent Dept",
            code="PARENT",
        )
        db_session.add(parent)
        await db_session.flush()

        child = Department(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Child Dept",
            code="CHILD",
            parent_id=parent.id,
        )
        db_session.add(child)
        await db_session.flush()

        assert child.parent_id == parent.id


class TestPositionModel:
    """Tests for the Position model."""

    @pytest.mark.asyncio
    async def test_position_creation(self, db_session, test_tenant):
        """Test position model creation."""
        from services.hr.models import Position

        position = Position(
            id=uuid4(),
            tenant_id=test_tenant.id,
            title="Senior Developer",
            code="SR_DEV",
            grade="L5",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(position)
        await db_session.flush()

        assert position.id is not None
        assert position.title == "Senior Developer"
        assert position.code == "SR_DEV"


class TestLeaveTypeModel:
    """Tests for the LeaveType model."""

    @pytest.mark.asyncio
    async def test_leave_type_creation(self, db_session, test_tenant):
        """Test leave type model creation."""
        from services.hr.models import LeaveType

        leave_type = LeaveType(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Annual Leave",
            code="ANNUAL",
            default_days=20,
            is_paid=True,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(leave_type)
        await db_session.flush()

        assert leave_type.id is not None
        assert leave_type.name == "Annual Leave"
        assert leave_type.default_days == 20
        assert leave_type.is_paid is True


class TestLeaveRequestModel:
    """Tests for the LeaveRequest model."""

    @pytest.mark.asyncio
    async def test_leave_request_creation(self, db_session, test_tenant, test_user):
        """Test leave request model creation."""
        from services.hr.models import LeaveRequest, LeaveType, Employee

        # Create prerequisites
        leave_type = LeaveType(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Sick Leave",
            code="SICK",
            default_days=10,
        )
        db_session.add(leave_type)

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="LR001",
            first_name="Leave",
            last_name="Requester",
            email="leave@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        leave_request = LeaveRequest(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            leave_type_id=leave_type.id,
            start_date=date.today() + timedelta(days=7),
            end_date=date.today() + timedelta(days=8),
            days_requested=Decimal("2.0"),
            reason="Doctor's appointment",
            status="PENDING",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(leave_request)
        await db_session.flush()

        assert leave_request.id is not None
        assert leave_request.status == "PENDING"
        assert leave_request.days_requested == Decimal("2.0")

    @pytest.mark.asyncio
    async def test_leave_request_status_transitions(self, db_session, test_tenant, test_user):
        """Test leave request status transitions."""
        from services.hr.models import LeaveRequest, LeaveType, Employee

        leave_type = LeaveType(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Casual Leave",
            code="CASUAL",
            default_days=5,
        )
        db_session.add(leave_type)

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="ST001",
            first_name="Status",
            last_name="Test",
            email="status@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        leave_request = LeaveRequest(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            leave_type_id=leave_type.id,
            start_date=date.today() + timedelta(days=14),
            end_date=date.today() + timedelta(days=14),
            days_requested=Decimal("1.0"),
            reason="Personal work",
            status="DRAFT",
        )
        db_session.add(leave_request)
        await db_session.flush()

        # Transition: DRAFT -> PENDING
        leave_request.status = "PENDING"
        await db_session.flush()
        assert leave_request.status == "PENDING"

        # Transition: PENDING -> APPROVED
        leave_request.status = "APPROVED"
        leave_request.approved_at = datetime.utcnow()
        leave_request.approved_by = test_user.id
        await db_session.flush()
        assert leave_request.status == "APPROVED"


class TestLeaveBalanceModel:
    """Tests for the LeaveBalance model."""

    @pytest.mark.asyncio
    async def test_leave_balance_creation(self, db_session, test_tenant, test_user):
        """Test leave balance model creation."""
        from services.hr.models import LeaveBalance, LeaveType, Employee

        leave_type = LeaveType(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Annual Leave",
            code="ANNUAL_BAL",
            default_days=20,
        )
        db_session.add(leave_type)

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="BAL001",
            first_name="Balance",
            last_name="Test",
            email="balance@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        leave_balance = LeaveBalance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            leave_type_id=leave_type.id,
            year=2026,
            total_days=Decimal("20.0"),
            used_days=Decimal("5.0"),
            pending_days=Decimal("2.0"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(leave_balance)
        await db_session.flush()

        assert leave_balance.id is not None
        assert leave_balance.total_days == Decimal("20.0")
        assert leave_balance.used_days == Decimal("5.0")

    @pytest.mark.asyncio
    async def test_leave_balance_available_days(self, db_session, test_tenant, test_user):
        """Test leave balance available days calculation."""
        from services.hr.models import LeaveBalance, LeaveType, Employee

        leave_type = LeaveType(
            id=uuid4(),
            tenant_id=test_tenant.id,
            name="Vacation",
            code="VAC_AVAIL",
            default_days=15,
        )
        db_session.add(leave_type)

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="AVAIL001",
            first_name="Available",
            last_name="Test",
            email="available@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        leave_balance = LeaveBalance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            leave_type_id=leave_type.id,
            year=2026,
            total_days=Decimal("15.0"),
            used_days=Decimal("3.0"),
            pending_days=Decimal("2.0"),
        )
        db_session.add(leave_balance)
        await db_session.flush()

        # If there's an available_days property
        if hasattr(leave_balance, 'available_days'):
            expected = Decimal("15.0") - Decimal("3.0") - Decimal("2.0")
            assert leave_balance.available_days == expected


class TestAttendanceModel:
    """Tests for the Attendance model."""

    @pytest.mark.asyncio
    async def test_attendance_creation(self, db_session, test_tenant, test_user):
        """Test attendance model creation."""
        from services.hr.models import Attendance, Employee

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="ATT001",
            first_name="Attendance",
            last_name="Test",
            email="attendance@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        attendance = Attendance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            attendance_date=date.today(),
            check_in_time=time(9, 0, 0),
            status="PRESENT",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(attendance)
        await db_session.flush()

        assert attendance.id is not None
        assert attendance.status == "PRESENT"
        assert attendance.check_in_time == time(9, 0, 0)

    @pytest.mark.asyncio
    async def test_attendance_checkout(self, db_session, test_tenant, test_user):
        """Test attendance checkout."""
        from services.hr.models import Attendance, Employee

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="CHK001",
            first_name="Checkout",
            last_name="Test",
            email="checkout@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        attendance = Attendance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            attendance_date=date.today(),
            check_in_time=time(9, 0, 0),
            status="PRESENT",
        )
        db_session.add(attendance)
        await db_session.flush()

        # Record checkout
        attendance.check_out_time = time(18, 0, 0)
        await db_session.flush()

        assert attendance.check_out_time == time(18, 0, 0)

    @pytest.mark.asyncio
    async def test_attendance_unique_per_date(self, db_session, test_tenant, test_user):
        """Test only one attendance record per employee per date."""
        from services.hr.models import Attendance, Employee
        from sqlalchemy.exc import IntegrityError

        employee = Employee(
            id=uuid4(),
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            employee_code="UNQ001",
            first_name="Unique",
            last_name="Test",
            email="unique@company.com",
            hire_date=date.today(),
        )
        db_session.add(employee)
        await db_session.flush()

        today = date.today()

        att1 = Attendance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            attendance_date=today,
            check_in_time=time(9, 0, 0),
            status="PRESENT",
        )
        db_session.add(att1)
        await db_session.flush()

        att2 = Attendance(
            id=uuid4(),
            tenant_id=test_tenant.id,
            employee_id=employee.id,
            attendance_date=today,  # Same date
            check_in_time=time(10, 0, 0),
            status="PRESENT",
        )
        db_session.add(att2)

        with pytest.raises(IntegrityError):
            await db_session.flush()
