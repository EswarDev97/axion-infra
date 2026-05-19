"""
Expense Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- ExpenseCategory model
- ExpenseRequest model
- ExpenseItem model
- ExpenseReceipt model
- PaymentRecord model
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestExpenseCategoryModel:
    """Tests for ExpenseCategory model."""

    async def test_category_creation(self, db_session, test_tenant, test_user):
        """Test expense category creation."""
        from services.expense.models.expense_category import ExpenseCategory

        category = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="Travel",
            code="TRAVEL",
            description="Travel-related expenses",
            daily_limit=Decimal("5000.00"),
            requires_receipt=True,
            requires_approval=True,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)

        assert category.id is not None
        assert category.name == "Travel"
        assert category.code == "TRAVEL"
        assert category.daily_limit == Decimal("5000.00")
        assert category.requires_receipt is True

    async def test_category_unique_code_per_tenant(self, db_session, test_tenant, test_user):
        """Test category code must be unique within tenant."""
        from services.expense.models.expense_category import ExpenseCategory
        from sqlalchemy.exc import IntegrityError

        cat1 = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="Meals",
            code="MEALS",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cat1)
        await db_session.commit()

        cat2 = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="Food",
            code="MEALS",  # Same code
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cat2)

        with pytest.raises(IntegrityError):
            await db_session.commit()


class TestExpenseRequestModel:
    """Tests for ExpenseRequest model."""

    async def test_request_creation(self, db_session, test_tenant, test_user, test_employee):
        """Test expense request creation."""
        from services.expense.models.expense_request import ExpenseRequest

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-2026-0001",
            title="January Travel Expenses",
            description="Business travel to client site",
            expense_date=date.today(),
            total_amount=Decimal("12500.00"),
            currency="INR",
            status="DRAFT",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()
        await db_session.refresh(request)

        assert request.id is not None
        assert request.request_number == "EXP-2026-0001"
        assert request.total_amount == Decimal("12500.00")
        assert request.status == "DRAFT"

    async def test_request_unique_number_per_tenant(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test request number must be unique within tenant."""
        from services.expense.models.expense_request import ExpenseRequest
        from sqlalchemy.exc import IntegrityError

        req1 = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-DUP-001",
            title="Request 1",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(req1)
        await db_session.commit()

        req2 = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-DUP-001",  # Same number
            title="Request 2",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(req2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_request_status_values(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test valid expense request status values."""
        from services.expense.models.expense_request import ExpenseRequest

        valid_statuses = [
            "DRAFT", "SUBMITTED", "MANAGER_APPROVED",
            "FINANCE_APPROVED", "PAID", "REJECTED", "CANCELLED"
        ]

        for i, status in enumerate(valid_statuses):
            request = ExpenseRequest(
                tenant_id=test_tenant.id,
                employee_id=test_employee.id,
                request_number=f"EXP-STAT-{i:03d}",
                title=f"Request {status}",
                expense_date=date.today(),
                status=status,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(request)
            await db_session.commit()
            await db_session.refresh(request)
            assert request.status == status

    async def test_request_workflow_timestamps(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test workflow timestamp fields."""
        from services.expense.models.expense_request import ExpenseRequest

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-WF-001",
            title="Workflow Test",
            expense_date=date.today(),
            status="DRAFT",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        # Submit
        request.status = "SUBMITTED"
        request.submitted_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(request)
        assert request.submitted_at is not None

        # Approve
        request.status = "FINANCE_APPROVED"
        request.approved_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(request)
        assert request.approved_at is not None

        # Pay
        request.status = "PAID"
        request.paid_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(request)
        assert request.paid_at is not None

    async def test_request_rejection(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test rejection with reason."""
        from services.expense.models.expense_request import ExpenseRequest

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-REJ-001",
            title="To Be Rejected",
            expense_date=date.today(),
            status="SUBMITTED",
            submitted_at=datetime.utcnow(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        request.status = "REJECTED"
        request.rejected_at = datetime.utcnow()
        request.rejection_reason = "Missing receipts"
        await db_session.commit()
        await db_session.refresh(request)

        assert request.status == "REJECTED"
        assert request.rejected_at is not None
        assert request.rejection_reason == "Missing receipts"

    async def test_request_soft_delete(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test expense request soft delete."""
        from services.expense.models.expense_request import ExpenseRequest

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-DEL-001",
            title="To Delete",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        request.is_deleted = True
        request.deleted_at = datetime.utcnow()
        request.deletion_reason = "Duplicate entry"
        await db_session.commit()
        await db_session.refresh(request)

        assert request.is_deleted is True
        assert request.deleted_at is not None


class TestExpenseItemModel:
    """Tests for ExpenseItem model."""

    async def test_item_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test expense item creation."""
        from services.expense.models.expense_request import ExpenseRequest
        from services.expense.models.expense_category import ExpenseCategory
        from services.expense.models.expense_item import ExpenseItem

        category = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="Lodging",
            code="LODGING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-ITEM-001",
            title="Travel Expenses",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        item = ExpenseItem(
            tenant_id=test_tenant.id,
            expense_request_id=request.id,
            category_id=category.id,
            description="Hotel stay - 2 nights",
            amount=Decimal("8000.00"),
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(item)
        await db_session.commit()
        await db_session.refresh(item)

        assert item.id is not None
        assert item.amount == Decimal("8000.00")
        assert item.description == "Hotel stay - 2 nights"

    async def test_multiple_items_per_request(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test multiple items can be added to a request."""
        from services.expense.models.expense_request import ExpenseRequest
        from services.expense.models.expense_category import ExpenseCategory
        from services.expense.models.expense_item import ExpenseItem

        category = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="Misc",
            code="MISC",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-MULTI-001",
            title="Multiple Items",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        items = []
        for i in range(3):
            item = ExpenseItem(
                tenant_id=test_tenant.id,
                expense_request_id=request.id,
                category_id=category.id,
                description=f"Item {i+1}",
                amount=Decimal(f"{1000 * (i+1)}.00"),
                expense_date=date.today(),
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(item)
            items.append(item)

        await db_session.commit()
        await db_session.refresh(request)

        assert request.item_count == 3


class TestExpenseReceiptModel:
    """Tests for ExpenseReceipt model."""

    async def test_receipt_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test expense receipt creation."""
        from services.expense.models.expense_request import ExpenseRequest
        from services.expense.models.expense_receipt import ExpenseReceipt

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-RCP-001",
            title="Receipt Test",
            expense_date=date.today(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        receipt = ExpenseReceipt(
            tenant_id=test_tenant.id,
            expense_request_id=request.id,
            file_name="receipt_001.pdf",
            file_path="/receipts/2026/01/receipt_001.pdf",
            file_size=102400,
            content_type="application/pdf",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(receipt)
        await db_session.commit()
        await db_session.refresh(receipt)

        assert receipt.id is not None
        assert receipt.file_name == "receipt_001.pdf"
        assert receipt.content_type == "application/pdf"


class TestPaymentRecordModel:
    """Tests for PaymentRecord model."""

    async def test_payment_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test payment record creation."""
        from services.expense.models.expense_request import ExpenseRequest
        from services.expense.models.payment_record import PaymentRecord

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-PAY-001",
            title="Payment Test",
            expense_date=date.today(),
            total_amount=Decimal("10000.00"),
            status="FINANCE_APPROVED",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        payment = PaymentRecord(
            tenant_id=test_tenant.id,
            expense_request_id=request.id,
            amount=Decimal("10000.00"),
            payment_method="BANK_TRANSFER",
            payment_reference="TXN-123456",
            payment_date=date.today(),
            processed_by=test_user.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        assert payment.id is not None
        assert payment.amount == Decimal("10000.00")
        assert payment.payment_method == "BANK_TRANSFER"


class TestExpenseCalculations:
    """Tests for expense calculation methods."""

    async def test_calculate_total_from_items(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test total calculation from items."""
        from services.expense.models.expense_request import ExpenseRequest
        from services.expense.models.expense_category import ExpenseCategory
        from services.expense.models.expense_item import ExpenseItem

        category = ExpenseCategory(
            tenant_id=test_tenant.id,
            name="General",
            code="GENERAL",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        request = ExpenseRequest(
            tenant_id=test_tenant.id,
            employee_id=test_employee.id,
            request_number="EXP-CALC-001",
            title="Calculation Test",
            expense_date=date.today(),
            total_amount=Decimal("0.00"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(request)
        await db_session.commit()

        # Add items
        amounts = [Decimal("1000.00"), Decimal("2500.50"), Decimal("750.25")]
        for i, amount in enumerate(amounts):
            item = ExpenseItem(
                tenant_id=test_tenant.id,
                expense_request_id=request.id,
                category_id=category.id,
                description=f"Item {i+1}",
                amount=amount,
                expense_date=date.today(),
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(item)

        await db_session.commit()
        await db_session.refresh(request)

        calculated_total = request.calculate_total()
        expected_total = sum(amounts)

        assert calculated_total == expected_total
