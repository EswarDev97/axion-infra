"""
MindFlow Expense Service - Expense Business Logic
Per API_CONTRACT.md Section 8.6.1, 8.6.2, 8.6.3
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID
import secrets
import string

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.config import get_settings
from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ResourceStateConflictException,
    BusinessRuleViolationException,
)
from shared.schemas import PaginationParams

from ..models import (
    ExpenseCategory,
    ExpenseRequest,
    ExpenseItem,
    ExpenseReceipt,
)
from ..schemas.expense_request import ExpenseRequestFilters


class ExpenseService:
    """Expense management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_request_number(self) -> str:
        """Generate unique expense request number."""
        chars = string.digits
        random_part = ''.join(secrets.choice(chars) for _ in range(8))
        return f"EXP-{random_part}"

    # ==================== Category ====================

    async def list_categories(
        self,
        tenant_id: UUID,
        active_only: bool = True
    ) -> List[ExpenseCategory]:
        """List expense categories."""
        query = select(ExpenseCategory).where(
            ExpenseCategory.tenant_id == tenant_id
        )
        if active_only:
            query = query.where(ExpenseCategory.is_active == True)
        query = query.order_by(ExpenseCategory.name.asc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_category(
        self,
        category_id: UUID,
        tenant_id: UUID
    ) -> ExpenseCategory:
        """Get category by ID."""
        stmt = select(ExpenseCategory).where(
            ExpenseCategory.id == category_id,
            ExpenseCategory.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        category = result.scalar_one_or_none()

        if not category:
            raise ResourceNotFoundException("ExpenseCategory", str(category_id))

        return category

    async def create_category(
        self,
        tenant_id: UUID,
        name: str,
        code: str,
        created_by: UUID,
        description: Optional[str] = None,
        max_amount: Optional[Decimal] = None,
        requires_receipt: bool = True
    ) -> ExpenseCategory:
        """Create a new expense category."""
        # Check for duplicate code
        stmt = select(ExpenseCategory).where(
            ExpenseCategory.tenant_id == tenant_id,
            ExpenseCategory.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("ExpenseCategory", f"code={code}")

        category = ExpenseCategory(
            tenant_id=tenant_id,
            name=name,
            code=code,
            description=description,
            max_amount=max_amount,
            requires_receipt=requires_receipt,
            is_active=True,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def update_category(
        self,
        category_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        name: Optional[str] = None,
        code: Optional[str] = None,
        description: Optional[str] = None,
        max_amount: Optional[Decimal] = None,
        requires_receipt: Optional[bool] = None,
        is_active: Optional[bool] = None
    ) -> ExpenseCategory:
        """Update an expense category."""
        category = await self.get_category(category_id, tenant_id)

        # Check for duplicate code if changing
        if code is not None and code != category.code:
            stmt = select(ExpenseCategory).where(
                ExpenseCategory.tenant_id == tenant_id,
                ExpenseCategory.code == code,
                ExpenseCategory.id != category_id
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ResourceAlreadyExistsException("ExpenseCategory", f"code={code}")
            category.code = code

        if name is not None:
            category.name = name
        if description is not None:
            category.description = description
        if max_amount is not None:
            category.max_amount = max_amount
        if requires_receipt is not None:
            category.requires_receipt = requires_receipt
        if is_active is not None:
            category.is_active = is_active

        category.updated_by = updated_by
        category.updated_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(
        self,
        category_id: UUID,
        tenant_id: UUID
    ) -> None:
        """Delete an expense category (soft delete by setting is_active=False)."""
        category = await self.get_category(category_id, tenant_id)
        category.is_active = False
        await self.db.commit()

    # ==================== Expense Request CRUD ====================

    async def create_request(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        title: str,
        expense_date: date,
        created_by: UUID,
        description: Optional[str] = None,
        due_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        collected_by: Optional[str] = None,
        amount: Optional[Decimal] = None,
        currency: str = "INR"
    ) -> ExpenseRequest:
        """Create a new expense request with optional initial expense item."""
        # Validate due_date >= expense_date
        if due_date is not None and due_date < expense_date:
            raise BusinessRuleViolationException(
                "Due Date must be greater than or equal to Expense Date"
            )

        request_number = self._generate_request_number()

        # Calculate initial total amount
        initial_amount = amount if amount is not None else Decimal("0.00")

        # Determine initial status based on AUTO_FINANCE_APPROVAL config flag
        # When enabled, expenses skip the approval workflow and are created as FINANCE_APPROVED
        # When disabled (future), expenses follow normal workflow starting as DRAFT
        settings = get_settings()
        initial_status = "FINANCE_APPROVED" if settings.auto_finance_approval else "DRAFT"

        expense_request = ExpenseRequest(
            tenant_id=tenant_id,
            employee_id=employee_id,
            request_number=request_number,
            title=title,
            description=description,
            expense_date=expense_date,
            due_date=due_date,
            collected_by=collected_by,
            total_amount=initial_amount,
            currency=currency,
            status=initial_status,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(expense_request)
        await self.db.flush()  # Get the ID before adding item

        # If category_id and amount are provided, create an initial expense item
        if category_id is not None and amount is not None:
            # Validate category exists
            category = await self.get_category(category_id, tenant_id)

            # Validate amount against category max
            if category.max_amount and amount > category.max_amount:
                raise BusinessRuleViolationException(
                    f"Amount exceeds category maximum of {category.max_amount}"
                )

            item = ExpenseItem(
                tenant_id=tenant_id,
                expense_request_id=expense_request.id,
                category_id=category_id,
                description=description or title,  # Use title as default description
                amount=amount,
                quantity=1,
                expense_date=expense_date,
                created_by=created_by,
                updated_by=created_by
            )
            self.db.add(item)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_request(
        self,
        request_id: UUID,
        tenant_id: UUID
    ) -> ExpenseRequest:
        """Get expense request by ID."""
        stmt = select(ExpenseRequest).where(
            ExpenseRequest.id == request_id,
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False
        ).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        expense_request = result.scalar_one_or_none()

        if not expense_request:
            raise ResourceNotFoundException("ExpenseRequest", str(request_id))

        return expense_request

    async def list_requests(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        filters: Optional[ExpenseRequestFilters] = None,
        created_by: Optional[UUID] = None
    ) -> Tuple[List[ExpenseRequest], int]:
        """List expense requests with pagination and filters."""
        base_query = select(ExpenseRequest).where(
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False
        )

        # Role-based visibility: non-admin users see only their own expenses
        if created_by is not None:
            base_query = base_query.where(ExpenseRequest.created_by == created_by)

        if filters:
            if filters.employee_id:
                base_query = base_query.where(
                    ExpenseRequest.employee_id == filters.employee_id
                )
            if filters.status:
                base_query = base_query.where(ExpenseRequest.status == filters.status)
            if filters.start_date:
                base_query = base_query.where(
                    ExpenseRequest.expense_date >= filters.start_date
                )
            if filters.end_date:
                base_query = base_query.where(
                    ExpenseRequest.expense_date <= filters.end_date
                )
            if filters.due_start_date:
                base_query = base_query.where(
                    ExpenseRequest.due_date >= filters.due_start_date
                )
            if filters.due_end_date:
                base_query = base_query.where(
                    ExpenseRequest.due_date <= filters.due_end_date
                )
            if filters.min_amount:
                base_query = base_query.where(
                    ExpenseRequest.total_amount >= filters.min_amount
                )
            if filters.max_amount:
                base_query = base_query.where(
                    ExpenseRequest.total_amount <= filters.max_amount
                )
            if filters.collected_by:
                base_query = base_query.where(
                    ExpenseRequest.collected_by.ilike(f"%{filters.collected_by}%")
                )
            if filters.category_id:
                base_query = base_query.where(
                    ExpenseRequest.items.any(
                        ExpenseItem.category_id == filters.category_id
                    )
                )

        # Count
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginate
        stmt = base_query.options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        ).offset(pagination.offset).limit(pagination.page_size)

        if hasattr(ExpenseRequest, pagination.sort_by):
            order_col = getattr(ExpenseRequest, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())
        else:
            stmt = stmt.order_by(ExpenseRequest.created_at.desc())

        result = await self.db.execute(stmt)
        requests = list(result.scalars().unique().all())

        return requests, total

    async def update_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        expense_date: Optional[date] = None,
        due_date: Optional[date] = None,
        collected_by: Optional[str] = None,
        category_id: Optional[UUID] = None,
        amount: Optional[Decimal] = None,
        currency: Optional[str] = None
    ) -> ExpenseRequest:
        """Update expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Only DRAFT requests can be updated",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        if title is not None:
            expense_request.title = title
        if description is not None:
            expense_request.description = description
        if expense_date is not None:
            expense_request.expense_date = expense_date
        if due_date is not None:
            expense_request.due_date = due_date
        if collected_by is not None:
            expense_request.collected_by = collected_by
        if currency is not None:
            expense_request.currency = currency

        # Update amount directly on the request
        if amount is not None:
            expense_request.total_amount = amount

            # If there's an existing item, update it; otherwise create one
            if expense_request.items and len(expense_request.items) > 0:
                item = expense_request.items[0]
                item.amount = amount
                item.updated_by = updated_by
                item.updated_at = datetime.now(timezone.utc)
                # Update category on the item if provided
                if category_id is not None:
                    category = await self.get_category(category_id, tenant_id)
                    if category.max_amount and amount > category.max_amount:
                        raise BusinessRuleViolationException(
                            f"Amount exceeds category maximum of {category.max_amount}"
                        )
                    item.category_id = category_id
            elif category_id is not None:
                # No items yet but category and amount provided — create one
                category = await self.get_category(category_id, tenant_id)
                if category.max_amount and amount > category.max_amount:
                    raise BusinessRuleViolationException(
                        f"Amount exceeds category maximum of {category.max_amount}"
                    )
                item = ExpenseItem(
                    tenant_id=tenant_id,
                    expense_request_id=expense_request.id,
                    category_id=category_id,
                    description=description or title or expense_request.title,
                    amount=amount,
                    quantity=1,
                    expense_date=expense_date or expense_request.expense_date,
                    created_by=updated_by,
                    updated_by=updated_by
                )
                self.db.add(item)
        elif category_id is not None and expense_request.items and len(expense_request.items) > 0:
            # Only category changed, no amount change
            category = await self.get_category(category_id, tenant_id)
            expense_request.items[0].category_id = category_id
            expense_request.items[0].updated_by = updated_by
            expense_request.items[0].updated_at = datetime.now(timezone.utc)

        # Validate due_date >= expense_date after updates
        effective_expense_date = expense_request.expense_date
        effective_due_date = expense_request.due_date
        if effective_due_date is not None and effective_due_date < effective_expense_date:
            raise BusinessRuleViolationException(
                "Due Date must be greater than or equal to Expense Date"
            )

        expense_request.updated_by = updated_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status not in ["DRAFT", "REJECTED"]:
            raise ResourceStateConflictException(
                "Only DRAFT or REJECTED requests can be deleted",
                current_state=expense_request.status,
                target_state="DELETED"
            )

        expense_request.is_deleted = True
        expense_request.deleted_at = datetime.now(timezone.utc)
        expense_request.deletion_reason = reason
        expense_request.updated_by = deleted_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def submit_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        submitted_by: UUID
    ) -> ExpenseRequest:
        """Submit expense request for approval."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Only DRAFT requests can be submitted",
                current_state=expense_request.status,
                target_state="SUBMITTED"
            )

        # Validate has items
        if not expense_request.items or len(expense_request.items) == 0:
            raise BusinessRuleViolationException(
                "Cannot submit expense request without items"
            )

        # Validate receipts for categories that require them
        for item in expense_request.items:
            if item.category and item.category.requires_receipt:
                has_receipt = any(
                    r.expense_item_id == item.id or r.expense_item_id is None
                    for r in expense_request.receipts
                )
                if not has_receipt:
                    raise BusinessRuleViolationException(
                        f"Receipt required for category: {item.category.name}"
                    )

        expense_request.status = "SUBMITTED"
        expense_request.submitted_at = datetime.now(timezone.utc)
        expense_request.updated_by = submitted_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def approve_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        approved_by: UUID,
        approval_level: str = "MANAGER"  # MANAGER or FINANCE
    ) -> ExpenseRequest:
        """Approve expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        valid_statuses = {
            "MANAGER": ["SUBMITTED"],
            "FINANCE": ["MANAGER_APPROVED"]
        }

        if expense_request.status not in valid_statuses.get(approval_level, []):
            raise ResourceStateConflictException(
                f"Cannot perform {approval_level} approval on request with status {expense_request.status}",
                current_state=expense_request.status,
                target_state=f"{approval_level}_APPROVED"
            )

        if approval_level == "MANAGER":
            expense_request.status = "MANAGER_APPROVED"
        else:
            expense_request.status = "FINANCE_APPROVED"

        expense_request.approved_at = datetime.now(timezone.utc)
        expense_request.updated_by = approved_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def reject_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        rejected_by: UUID,
        reason: str
    ) -> ExpenseRequest:
        """Reject expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status not in ["SUBMITTED", "MANAGER_APPROVED"]:
            raise ResourceStateConflictException(
                "Only SUBMITTED or MANAGER_APPROVED requests can be rejected",
                current_state=expense_request.status,
                target_state="REJECTED"
            )

        expense_request.status = "REJECTED"
        expense_request.rejected_at = datetime.now(timezone.utc)
        expense_request.rejection_reason = reason
        expense_request.updated_by = rejected_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_my_requests(
        self,
        employee_id: UUID,
        tenant_id: UUID,
        pagination: PaginationParams,
        status: Optional[str] = None
    ) -> Tuple[List[ExpenseRequest], int]:
        """Get expense requests for current employee."""
        filters = ExpenseRequestFilters(employee_id=employee_id, status=status)
        return await self.list_requests(tenant_id, pagination, filters)

    async def get_my_summary(
        self,
        created_by: Optional[UUID],
        tenant_id: UUID
    ) -> dict:
        """Get expense summary. If created_by is None, returns tenant-wide summary (admin view)."""
        stmt = select(ExpenseRequest).where(
            ExpenseRequest.tenant_id == tenant_id,
            ExpenseRequest.is_deleted == False
        )
        if created_by is not None:
            stmt = stmt.where(ExpenseRequest.created_by == created_by)
        result = await self.db.execute(stmt)
        requests = list(result.scalars().all())

        # Calculate summary
        total_requests = len(requests)
        draft_requests = sum(1 for r in requests if r.status == "DRAFT")
        pending_approval = sum(1 for r in requests if r.status in ["SUBMITTED", "MANAGER_APPROVED"])
        approved = sum(1 for r in requests if r.status in ["FINANCE_APPROVED", "PAID"])

        # Calculate amounts
        total_submitted = sum(
            r.total_amount for r in requests
            if r.status not in ["DRAFT", "CANCELLED"]
        )
        total_paid = sum(
            r.total_amount for r in requests
            if r.status == "PAID"
        )
        pending_reimbursement = sum(
            r.total_amount for r in requests
            if r.status in ["SUBMITTED", "MANAGER_APPROVED", "FINANCE_APPROVED"]
        )

        return {
            "total_requests": total_requests,
            "draft_requests": draft_requests,
            "pending_approval": pending_approval,
            "approved": approved,
            "total_submitted_amount": total_submitted,
            "total_paid_amount": total_paid,
            "pending_reimbursement": pending_reimbursement
        }

    async def get_pending_approval(
        self,
        tenant_id: UUID,
        pagination: PaginationParams,
        approval_level: str = "MANAGER"
    ) -> Tuple[List[ExpenseRequest], int]:
        """Get requests pending approval."""
        status = "SUBMITTED" if approval_level == "MANAGER" else "MANAGER_APPROVED"
        filters = ExpenseRequestFilters(status=status)
        return await self.list_requests(tenant_id, pagination, filters)

    async def get_pending_payment(
        self,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[ExpenseRequest], int]:
        """Get requests pending payment (finance approved but not paid)."""
        filters = ExpenseRequestFilters(status="FINANCE_APPROVED")
        return await self.list_requests(tenant_id, pagination, filters)

    async def cancel_request(
        self,
        request_id: UUID,
        tenant_id: UUID,
        cancelled_by: UUID
    ) -> ExpenseRequest:
        """Cancel expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status not in ["DRAFT", "SUBMITTED"]:
            raise ResourceStateConflictException(
                "Only DRAFT or SUBMITTED requests can be cancelled",
                current_state=expense_request.status,
                target_state="CANCELLED"
            )

        expense_request.status = "CANCELLED"
        expense_request.is_deleted = True
        expense_request.deleted_at = datetime.now(timezone.utc)
        expense_request.deletion_reason = "Cancelled by user"
        expense_request.updated_by = cancelled_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships
        stmt = select(ExpenseRequest).where(ExpenseRequest.id == expense_request.id).options(
            selectinload(ExpenseRequest.items).selectinload(ExpenseItem.category),
            selectinload(ExpenseRequest.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    # ==================== Expense Items ====================

    async def add_item(
        self,
        request_id: UUID,
        tenant_id: UUID,
        category_id: UUID,
        description: str,
        amount: Decimal,
        expense_date: date,
        created_by: UUID,
        quantity: int = 1,
        unit_price: Optional[Decimal] = None
    ) -> ExpenseItem:
        """Add item to expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Can only add items to DRAFT requests",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        # Validate category
        category = await self.get_category(category_id, tenant_id)

        # Validate amount against category max
        if category.max_amount and amount > category.max_amount:
            raise BusinessRuleViolationException(
                f"Amount exceeds category maximum of {category.max_amount}"
            )

        item = ExpenseItem(
            tenant_id=tenant_id,
            expense_request_id=request_id,
            category_id=category_id,
            description=description,
            amount=amount,
            quantity=quantity,
            unit_price=unit_price,
            expense_date=expense_date,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(item)

        # Update total
        expense_request.total_amount = expense_request.calculate_total() + amount
        expense_request.updated_by = created_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseItem).where(ExpenseItem.id == item.id).options(
            selectinload(ExpenseItem.expense_request),
            selectinload(ExpenseItem.category),
            selectinload(ExpenseItem.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_items(
        self,
        request_id: UUID,
        tenant_id: UUID
    ) -> List[ExpenseItem]:
        """Get items for an expense request."""
        await self.get_request(request_id, tenant_id)

        stmt = select(ExpenseItem).where(
            ExpenseItem.expense_request_id == request_id,
            ExpenseItem.tenant_id == tenant_id
        ).options(
            selectinload(ExpenseItem.category)
        ).order_by(ExpenseItem.expense_date.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_item(
        self,
        request_id: UUID,
        item_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        category_id: Optional[UUID] = None,
        description: Optional[str] = None,
        amount: Optional[Decimal] = None,
        quantity: Optional[int] = None,
        unit_price: Optional[Decimal] = None,
        expense_date: Optional[date] = None
    ) -> ExpenseItem:
        """Update expense item."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Can only update items in DRAFT requests",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        stmt = select(ExpenseItem).where(
            ExpenseItem.id == item_id,
            ExpenseItem.expense_request_id == request_id,
            ExpenseItem.tenant_id == tenant_id
        ).options(selectinload(ExpenseItem.category))
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise ResourceNotFoundException("ExpenseItem", str(item_id))

        old_amount = item.amount

        if category_id is not None:
            category = await self.get_category(category_id, tenant_id)
            item.category_id = category_id
        if description is not None:
            item.description = description
        if amount is not None:
            # Validate against category max
            if item.category and item.category.max_amount and amount > item.category.max_amount:
                raise BusinessRuleViolationException(
                    f"Amount exceeds category maximum of {item.category.max_amount}"
                )
            item.amount = amount
        if quantity is not None:
            item.quantity = quantity
        if unit_price is not None:
            item.unit_price = unit_price
        if expense_date is not None:
            item.expense_date = expense_date

        item.updated_by = updated_by
        item.updated_at = datetime.now(timezone.utc)

        # Update total
        if amount is not None:
            expense_request.total_amount = expense_request.total_amount - old_amount + amount
        expense_request.updated_by = updated_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseItem).where(ExpenseItem.id == item.id).options(
            selectinload(ExpenseItem.expense_request),
            selectinload(ExpenseItem.category),
            selectinload(ExpenseItem.receipts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_item(
        self,
        request_id: UUID,
        item_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID
    ) -> None:
        """Delete expense item."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Can only delete items from DRAFT requests",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        stmt = select(ExpenseItem).where(
            ExpenseItem.id == item_id,
            ExpenseItem.expense_request_id == request_id,
            ExpenseItem.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise ResourceNotFoundException("ExpenseItem", str(item_id))

        # Update total
        expense_request.total_amount = expense_request.total_amount - item.amount
        expense_request.updated_by = deleted_by
        expense_request.updated_at = datetime.now(timezone.utc)

        await self.db.delete(item)
        await self.db.commit()

    # ==================== Receipts ====================

    async def add_receipt(
        self,
        request_id: UUID,
        tenant_id: UUID,
        file_id: UUID,
        uploaded_by: UUID,
        expense_item_id: Optional[UUID] = None
    ) -> ExpenseReceipt:
        """Add receipt to expense request."""
        expense_request = await self.get_request(request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Can only add receipts to DRAFT requests",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        # Validate item if provided
        if expense_item_id:
            stmt = select(ExpenseItem).where(
                ExpenseItem.id == expense_item_id,
                ExpenseItem.expense_request_id == request_id,
                ExpenseItem.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            if not result.scalar_one_or_none():
                raise ResourceNotFoundException("ExpenseItem", str(expense_item_id))

        receipt = ExpenseReceipt(
            tenant_id=tenant_id,
            expense_request_id=request_id,
            expense_item_id=expense_item_id,
            file_id=file_id,
            uploaded_by=uploaded_by
        )
        self.db.add(receipt)
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(ExpenseReceipt).where(ExpenseReceipt.id == receipt.id).options(
            selectinload(ExpenseReceipt.expense_request),
            selectinload(ExpenseReceipt.expense_item)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_receipts(
        self,
        request_id: UUID,
        tenant_id: UUID
    ) -> List[ExpenseReceipt]:
        """Get receipts for an expense request."""
        await self.get_request(request_id, tenant_id)

        stmt = select(ExpenseReceipt).where(
            ExpenseReceipt.expense_request_id == request_id,
            ExpenseReceipt.tenant_id == tenant_id
        ).order_by(ExpenseReceipt.uploaded_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_receipt(
        self,
        receipt_id: UUID,
        tenant_id: UUID
    ) -> ExpenseReceipt:
        """Get receipt by ID."""
        stmt = select(ExpenseReceipt).where(
            ExpenseReceipt.id == receipt_id,
            ExpenseReceipt.tenant_id == tenant_id
        )
        result = await self.db.execute(stmt)
        receipt = result.scalar_one_or_none()

        if not receipt:
            raise ResourceNotFoundException("ExpenseReceipt", str(receipt_id))

        return receipt

    async def delete_receipt(
        self,
        receipt_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID
    ) -> None:
        """Delete receipt."""
        receipt = await self.get_receipt(receipt_id, tenant_id)
        expense_request = await self.get_request(receipt.expense_request_id, tenant_id)

        if expense_request.status != "DRAFT":
            raise ResourceStateConflictException(
                "Can only delete receipts from DRAFT requests",
                current_state=expense_request.status,
                target_state="DRAFT"
            )

        await self.db.delete(receipt)
        await self.db.commit()
