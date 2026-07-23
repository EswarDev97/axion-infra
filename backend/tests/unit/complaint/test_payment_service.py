"""
Complaint Service PaymentService Unit Tests

Tests for:
- PaymentService.create()
- PaymentService.list() case_status filter
- PaymentService.update()
- PaymentService.delete() (soft delete) excluded from list()
"""

from uuid import uuid4

import pytest

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


async def _create_client(db_session, test_tenant, test_user):
    """Helper: create a Client row so Payment.client_id FK is satisfiable."""
    from services.complaint.models.client import Client

    client = Client(
        tenant_id=test_tenant.id,
        name="Acme Insurer",
        code=f"ACME-{uuid4().hex[:8]}",
        type="CLIENT",
        is_active=True,
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


class TestPaymentServiceCreate:
    """Tests for PaymentService.create()."""

    async def test_create_payment(self, db_session, test_tenant, test_user):
        """Test that create() persists a payment with correct field values."""
        from services.complaint.schemas.payment import PaymentCreateRequest
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        executive_id = uuid4()

        data = PaymentCreateRequest(
            case_reference="CASE-2026-0001",
            client_id=client.id,
            vehicle_registration_number="KA01AB1234",
            executive_employee_id=executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
        )

        service = PaymentService(db_session)
        payment = await service.create(data, test_tenant.id, test_user.id)

        assert payment.id is not None
        assert payment.tenant_id == test_tenant.id
        assert payment.case_reference == "CASE-2026-0001"
        assert payment.client_id == client.id
        assert payment.vehicle_registration_number == "KA01AB1234"
        assert payment.executive_employee_id == executive_id
        assert payment.case_status == "ASSIGNED"
        assert payment.billing_status == "COMPANY_BILLING"
        assert payment.payment_mode is None
        assert payment.is_deleted is False
        assert payment.created_by == test_user.id
        assert payment.updated_by == test_user.id


class TestPaymentServiceList:
    """Tests for PaymentService.list()."""

    async def test_list_payments_filters_by_case_status(
        self, db_session, test_tenant, test_user
    ):
        """Test that list() filters payments by case_status when provided."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        assigned_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-ASSIGNED-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB0001",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        completed_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-COMPLETED-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB0002",
            executive_employee_id=uuid4(),
            case_status="COMPLETED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([assigned_payment, completed_payment])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, case_status="COMPLETED")

        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].case_status == "COMPLETED"
        assert result.items[0].case_reference == "CASE-COMPLETED-001"


class TestPaymentServiceUpdate:
    """Tests for PaymentService.update()."""

    async def test_update_payment(self, db_session, test_tenant, test_user):
        """Test that update() persists changed fields."""
        from services.complaint.models.payment import Payment
        from services.complaint.schemas.payment import PaymentUpdateRequest
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-UPDATE-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB9999",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        other_user_id = uuid4()
        data = PaymentUpdateRequest(case_status="SCHEDULED")

        service = PaymentService(db_session)
        updated = await service.update(payment, data, other_user_id)

        assert updated.case_status == "SCHEDULED"
        assert updated.updated_by == other_user_id
        # Untouched fields remain the same
        assert updated.case_reference == "CASE-UPDATE-001"
        assert updated.billing_status == "COMPANY_BILLING"


class TestPaymentServiceDelete:
    """Tests for PaymentService.delete() (soft delete)."""

    async def test_soft_delete_payment_excluded_from_list(
        self, db_session, test_tenant, test_user
    ):
        """Test that a soft-deleted payment is excluded from list() results."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-DELETE-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB0000",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        service = PaymentService(db_session)
        await service.delete(payment)

        assert payment.is_deleted is True
        assert payment.deleted_at is not None

        result = await service.list(test_tenant.id)

        assert result.total == 0
        assert len(result.items) == 0
