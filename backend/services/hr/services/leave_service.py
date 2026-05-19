"""
MindFlow HR Service - Leave Management Business Logic
Per API_CONTRACT.md Section 8.2.4
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import LeaveType, LeaveBalance, LeaveRequest, Employee


class LeaveService:
    """Leave management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ==================== Leave Types ====================

    async def create_leave_type(
        self,
        tenant_id: UUID,
        code: str,
        name: str,
        created_by: UUID,
        description: Optional[str] = None,
        default_days: int = 0,
        is_paid: bool = True,
        requires_approval: bool = True
    ) -> LeaveType:
        """Create a new leave type."""
        # Check if code exists
        stmt = select(LeaveType).where(
            LeaveType.tenant_id == tenant_id,
            LeaveType.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("LeaveType", code)

        leave_type = LeaveType(
            tenant_id=tenant_id,
            code=code,
            name=name,
            description=description,
            default_days=default_days,
            is_paid=is_paid,
            requires_approval=requires_approval,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(leave_type)
        await self.db.commit()
        await self.db.refresh(leave_type)

        return leave_type

    async def get_leave_type(
        self,
        leave_type_id: UUID,
        tenant_id: UUID
    ) -> LeaveType:
        """Get leave type by ID."""
        stmt = select(LeaveType).where(
            LeaveType.id == leave_type_id,
            LeaveType.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        leave_type = result.scalar_one_or_none()

        if not leave_type:
            raise ResourceNotFoundException("LeaveType", str(leave_type_id))

        return leave_type

    async def list_leave_types(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        is_active: Optional[bool] = None
    ) -> Tuple[List[LeaveType], int]:
        """List leave types with pagination."""
        base_query = select(LeaveType).where(
            LeaveType.tenant_id == tenant_id
        )

        if is_active is not None:
            base_query = base_query.where(LeaveType.is_active == is_active)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.offset(pagination.offset).limit(pagination.page_size)

        if hasattr(LeaveType, pagination.sort_by):
            order_col = getattr(LeaveType, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        leave_types = list(result.scalars().all())

        return leave_types, total

    async def update_leave_type(
        self,
        leave_type_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        default_days: Optional[int] = None,
        is_paid: Optional[bool] = None,
        requires_approval: Optional[bool] = None,
        is_active: Optional[bool] = None
    ) -> LeaveType:
        """Update leave type."""
        leave_type = await self.get_leave_type(leave_type_id, tenant_id)

        if name is not None:
            leave_type.name = name
        if description is not None:
            leave_type.description = description
        if default_days is not None:
            leave_type.default_days = default_days
        if is_paid is not None:
            leave_type.is_paid = is_paid
        if requires_approval is not None:
            leave_type.requires_approval = requires_approval
        if is_active is not None:
            leave_type.is_active = is_active

        leave_type.updated_by = updated_by
        leave_type.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(leave_type)

        return leave_type

    # ==================== Leave Balances ====================

    async def get_employee_balances(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        year: Optional[int] = None
    ) -> List[LeaveBalance]:
        """Get leave balances for an employee."""
        if year is None:
            year = date.today().year

        stmt = select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.tenant_id == tenant_id,
            LeaveBalance.year == year
        ).options(
            selectinload(LeaveBalance.leave_type),
            selectinload(LeaveBalance.employee)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def initialize_employee_balances(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        year: int
    ) -> List[LeaveBalance]:
        """Initialize leave balances for an employee for a year."""
        # Get all active leave types
        stmt = select(LeaveType).where(
            LeaveType.tenant_id == tenant_id,
            LeaveType.is_active == True
        )
        result = await self.db.execute(stmt)
        leave_types = list(result.scalars().all())

        balances = []
        for lt in leave_types:
            # Check if balance already exists
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year,
                LeaveBalance.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            existing = result.scalar_one_or_none()

            if not existing:
                balance = LeaveBalance(
                    tenant_id=tenant_id,
                    employee_id=employee_id,
                    leave_type_id=lt.id,
                    year=year,
                    total_days=Decimal(str(lt.default_days)),
                    used_days=Decimal("0.00"),
                    pending_days=Decimal("0.00"),
                    carried_over_days=Decimal("0.00")
                )
                self.db.add(balance)
                balances.append(balance)
            else:
                balances.append(existing)

        await self.db.commit()
        return balances

    async def update_balance(
        self,
        employee_id: UUID,
        leave_type_id: UUID,
        tenant_id: UUID,
        year: int,
        total_days: Optional[Decimal] = None,
        carried_over_days: Optional[Decimal] = None
    ) -> LeaveBalance:
        """Update leave balance."""
        stmt = select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_type_id == leave_type_id,
            LeaveBalance.tenant_id == tenant_id,
            LeaveBalance.year == year
        )
        result = await self.db.execute(stmt)
        balance = result.scalar_one_or_none()

        if not balance:
            raise ResourceNotFoundException("LeaveBalance")

        if total_days is not None:
            balance.total_days = total_days
        if carried_over_days is not None:
            balance.carried_over_days = carried_over_days

        balance.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(balance)

        return balance

    async def apply_custom_balances(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        year: int,
        balance_inputs: list
    ) -> None:
        """Apply custom leave balance values by leave type code."""
        for bi in balance_inputs:
            code = bi.leave_type_code
            days = bi.days

            # Find leave type by code
            stmt = select(LeaveType).where(
                LeaveType.tenant_id == tenant_id,
                LeaveType.code == code,
                LeaveType.is_active == True
            )
            result = await self.db.execute(stmt)
            lt = result.scalar_one_or_none()
            if not lt:
                continue

            # Find existing balance
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.tenant_id == tenant_id,
                LeaveBalance.year == year
            )
            result = await self.db.execute(stmt)
            balance = result.scalar_one_or_none()

            if balance:
                balance.total_days = days
                balance.updated_at = datetime.now(timezone.utc)
            else:
                balance = LeaveBalance(
                    tenant_id=tenant_id,
                    employee_id=employee_id,
                    leave_type_id=lt.id,
                    year=year,
                    total_days=days,
                    used_days=Decimal("0.00"),
                    pending_days=Decimal("0.00"),
                    carried_over_days=Decimal("0.00")
                )
                self.db.add(balance)

        await self.db.commit()

    # ==================== Leave Requests ====================

    async def create_leave_request(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        leave_type_id: UUID,
        start_date: date,
        end_date: date,
        created_by: UUID,
        reason: Optional[str] = None
    ) -> LeaveRequest:
        """Create a new leave request."""
        # Validate employee
        stmt = select(Employee).where(
            Employee.id == employee_id,
            Employee.tenant_id == tenant_id,
            Employee.is_deleted == False
        )
        result = await self.db.execute(stmt)
        if not result.scalar_one_or_none():
            raise ResourceNotFoundException("Employee", str(employee_id))

        # Validate leave type
        leave_type = await self.get_leave_type(leave_type_id, tenant_id)

        # Validate dates
        if start_date > end_date:
            raise BusinessRuleViolationException(
                "Start date cannot be after end date"
            )

        # Calculate days requested (simple calculation, weekends included)
        days_requested = Decimal(str((end_date - start_date).days + 1))

        # Check for overlapping requests
        stmt = select(LeaveRequest).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.tenant_id == tenant_id,
            LeaveRequest.status.in_(["PENDING", "APPROVED"]),
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise BusinessRuleViolationException(
                "Overlapping leave request exists for this period"
            )

        # Check balance (skip for unpaid leave types like LOP)
        is_unpaid_leave = not leave_type.is_paid
        year = start_date.year
        balance = None

        if not is_unpaid_leave:
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.tenant_id == tenant_id,
                LeaveBalance.year == year
            )
            result = await self.db.execute(stmt)
            balance = result.scalar_one_or_none()

            if balance:
                available = balance.available_days
                if days_requested > available:
                    raise BusinessRuleViolationException(
                        f"Insufficient leave balance. Available: {available}, Requested: {days_requested}"
                    )

        # Create request
        leave_request = LeaveRequest(
            tenant_id=tenant_id,
            employee_id=employee_id,
            leave_type_id=leave_type_id,
            start_date=start_date,
            end_date=end_date,
            days_requested=days_requested,
            reason=reason,
            status="PENDING" if leave_type.requires_approval else "APPROVED",
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(leave_request)

        # Update balance pending days (skip for unpaid leave)
        if balance and not is_unpaid_leave:
            balance.pending_days += days_requested
            balance.updated_at = datetime.now(timezone.utc)

        # If auto-approved, update used days (skip for unpaid leave)
        if not leave_type.requires_approval:
            leave_request.approved_at = datetime.now(timezone.utc)
            if balance and not is_unpaid_leave:
                balance.pending_days -= days_requested
                balance.used_days += days_requested

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(LeaveRequest).where(LeaveRequest.id == leave_request.id).options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_leave_request(
        self,
        request_id: UUID,
        tenant_id: UUID
    ) -> LeaveRequest:
        """Get leave request by ID."""
        stmt = select(LeaveRequest).where(
            LeaveRequest.id == request_id,
            LeaveRequest.tenant_id == tenant_id
        ).options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        )
        result = await self.db.execute(stmt)
        leave_request = result.scalar_one_or_none()

        if not leave_request:
            raise ResourceNotFoundException("LeaveRequest", str(request_id))

        return leave_request

    async def list_leave_requests(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        employee_id: Optional[UUID] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[LeaveRequest], int]:
        """List leave requests with pagination and filters."""
        base_query = select(LeaveRequest).where(
            LeaveRequest.tenant_id == tenant_id
        )

        if employee_id:
            base_query = base_query.where(
                LeaveRequest.employee_id == employee_id
            )
        if status:
            base_query = base_query.where(LeaveRequest.status == status)
        if start_date:
            base_query = base_query.where(LeaveRequest.start_date >= start_date)
        if end_date:
            base_query = base_query.where(LeaveRequest.end_date <= end_date)

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(LeaveRequest, pagination.sort_by):
            order_col = getattr(LeaveRequest, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        requests = list(result.scalars().all())

        return requests, total

    async def approve_leave_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        approver_id: UUID
    ) -> LeaveRequest:
        """Approve a leave request."""
        leave_request = await self.get_leave_request(request_id, tenant_id)

        if leave_request.status != "PENDING":
            raise ResourceStateConflictException(
                "Can only approve pending requests",
                current_state=leave_request.status,
                target_state="APPROVED"
            )

        leave_request.status = "APPROVED"
        leave_request.approved_by = approver_id
        leave_request.approved_at = datetime.now(timezone.utc)
        leave_request.updated_at = datetime.now(timezone.utc)

        # Update balance (skip for unpaid leave types like LOP)
        leave_type = leave_request.leave_type
        is_unpaid_leave = leave_type and not leave_type.is_paid

        if not is_unpaid_leave:
            year = leave_request.start_date.year
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == leave_request.employee_id,
                LeaveBalance.leave_type_id == leave_request.leave_type_id,
                LeaveBalance.tenant_id == tenant_id,
                LeaveBalance.year == year
            )
            result = await self.db.execute(stmt)
            balance = result.scalar_one_or_none()

            if balance:
                balance.pending_days -= leave_request.days_requested
                balance.used_days += leave_request.days_requested
                balance.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(LeaveRequest).where(LeaveRequest.id == leave_request.id).options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def reject_leave_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        approver_id: UUID,
        rejection_reason: Optional[str] = None
    ) -> LeaveRequest:
        """Reject a leave request."""
        leave_request = await self.get_leave_request(request_id, tenant_id)

        if leave_request.status != "PENDING":
            raise ResourceStateConflictException(
                "Can only reject pending requests",
                current_state=leave_request.status,
                target_state="REJECTED"
            )

        leave_request.status = "REJECTED"
        leave_request.approved_by = approver_id
        leave_request.approved_at = datetime.now(timezone.utc)
        leave_request.rejection_reason = rejection_reason
        leave_request.updated_at = datetime.now(timezone.utc)

        # Update balance - remove from pending (skip for unpaid leave like LOP)
        leave_type = leave_request.leave_type
        is_unpaid_leave = leave_type and not leave_type.is_paid

        if not is_unpaid_leave:
            year = leave_request.start_date.year
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == leave_request.employee_id,
                LeaveBalance.leave_type_id == leave_request.leave_type_id,
                LeaveBalance.tenant_id == tenant_id,
                LeaveBalance.year == year
            )
            result = await self.db.execute(stmt)
            balance = result.scalar_one_or_none()

            if balance:
                balance.pending_days -= leave_request.days_requested
                balance.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(LeaveRequest).where(LeaveRequest.id == leave_request.id).options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def cancel_leave_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        cancelled_by: UUID
    ) -> LeaveRequest:
        """Cancel a leave request."""
        leave_request = await self.get_leave_request(request_id, tenant_id)

        if not leave_request.can_be_cancelled:
            raise ResourceStateConflictException(
                "Cannot cancel this leave request",
                current_state=leave_request.status
            )

        old_status = leave_request.status
        leave_request.status = "CANCELLED"
        leave_request.updated_by = cancelled_by
        leave_request.updated_at = datetime.now(timezone.utc)

        # Update balance (skip for unpaid leave like LOP)
        leave_type = leave_request.leave_type
        is_unpaid_leave = leave_type and not leave_type.is_paid

        if not is_unpaid_leave:
            year = leave_request.start_date.year
            stmt = select(LeaveBalance).where(
                LeaveBalance.employee_id == leave_request.employee_id,
                LeaveBalance.leave_type_id == leave_request.leave_type_id,
                LeaveBalance.tenant_id == tenant_id,
                LeaveBalance.year == year
            )
            result = await self.db.execute(stmt)
            balance = result.scalar_one_or_none()

            if balance:
                if old_status == "PENDING":
                    balance.pending_days -= leave_request.days_requested
                elif old_status == "APPROVED":
                    balance.used_days -= leave_request.days_requested
                balance.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(LeaveRequest).where(LeaveRequest.id == leave_request.id).options(
            selectinload(LeaveRequest.employee),
            selectinload(LeaveRequest.leave_type),
            selectinload(LeaveRequest.approver)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
