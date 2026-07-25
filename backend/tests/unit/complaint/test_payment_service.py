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


async def _create_financer(db_session, test_tenant, test_user):
    """Helper: create a Client row of type FINANCER so Payment.finance_id
    FK (payments_finance_id_fkey references clients.id) is satisfiable."""
    from services.complaint.models.client import Client

    financer = Client(
        tenant_id=test_tenant.id,
        name="Acme Finance Co",
        code=f"FIN-{uuid4().hex[:8]}",
        type="FINANCER",
        is_active=True,
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(financer)
    await db_session.commit()
    await db_session.refresh(financer)
    return financer


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

    async def test_list_payments_scoped_by_executive_employee_id(
        self, db_session, test_tenant, test_user
    ):
        """Test that list() restricts results to the given
        executive_employee_id when provided (payments:read:own scoping)."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        own_executive_id = uuid4()
        other_executive_id = uuid4()

        own_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OWN-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB0003",
            executive_employee_id=own_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-OTHER-001",
            client_id=client.id,
            vehicle_registration_number="KA01AB0004",
            executive_employee_id=other_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([own_payment, other_payment])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, executive_employee_id=own_executive_id)

        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].case_reference == "CASE-OWN-001"

    async def test_list_payments_filters_by_finance_id(
        self, db_session, test_tenant, test_user
    ):
        """Test that list() restricts results to the given finance_id
        (the 'Finance Company' filter on the Payment Management screen)."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        matching_financer = await _create_financer(db_session, test_tenant, test_user)
        other_financer = await _create_financer(db_session, test_tenant, test_user)

        matching_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-FIN-MATCH-001",
            client_id=client.id,
            finance_id=matching_financer.id,
            vehicle_registration_number="KA01AB0005",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        other_payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-FIN-OTHER-001",
            client_id=client.id,
            finance_id=other_financer.id,
            vehicle_registration_number="KA01AB0006",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([matching_payment, other_payment])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, finance_id=matching_financer.id)

        assert result.total == 1
        assert result.items[0].case_reference == "CASE-FIN-MATCH-001"

    async def test_list_payments_filters_by_date_range(
        self, db_session, test_tenant, test_user
    ):
        """Test that list() restricts results to created_at within
        [date_from, date_to] inclusive (the 'From Date & To Date' filter)."""
        from datetime import date, datetime, timezone

        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        before_range = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-DATE-BEFORE",
            client_id=client.id,
            vehicle_registration_number="KA01AB0007",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        in_range_start = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-DATE-START",
            client_id=client.id,
            vehicle_registration_number="KA01AB0008",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 2, 1, 0, 0, 1, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        in_range_end = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-DATE-END",
            client_id=client.id,
            vehicle_registration_number="KA01AB0009",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 2, 28, 23, 59, 0, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        after_range = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-DATE-AFTER",
            client_id=client.id,
            vehicle_registration_number="KA01AB0010",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([before_range, in_range_start, in_range_end, after_range])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(
            test_tenant.id,
            date_from=date(2026, 2, 1),
            date_to=date(2026, 2, 28),
        )

        case_refs = {item.case_reference for item in result.items}
        assert case_refs == {"CASE-DATE-START", "CASE-DATE-END"}
        assert result.total == 2

    async def test_list_payments_combines_multiple_filters(
        self, db_session, test_tenant, test_user
    ):
        """Test that client_id, finance_id, executive_employee_id, and the
        date range all apply together (AND semantics) — the 'any
        combination' requirement for the Payment Management filter bar."""
        from datetime import date, datetime, timezone

        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        target_financer = await _create_financer(db_session, test_tenant, test_user)
        target_executive_id = uuid4()

        exact_match = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-COMBINED-MATCH",
            client_id=client.id,
            finance_id=target_financer.id,
            vehicle_registration_number="KA01AB0011",
            executive_employee_id=target_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 5, 15, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # Matches client/finance/date but a different executive.
        wrong_executive = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-COMBINED-WRONG-EXEC",
            client_id=client.id,
            finance_id=target_financer.id,
            vehicle_registration_number="KA01AB0012",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 5, 15, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # Matches everything except it falls outside the date range.
        wrong_date = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-COMBINED-WRONG-DATE",
            client_id=client.id,
            finance_id=target_financer.id,
            vehicle_registration_number="KA01AB0013",
            executive_employee_id=target_executive_id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([exact_match, wrong_executive, wrong_date])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(
            test_tenant.id,
            client_id=client.id,
            finance_id=target_financer.id,
            executive_employee_id=target_executive_id,
            date_from=date(2026, 5, 1),
            date_to=date(2026, 5, 31),
        )

        assert result.total == 1
        assert result.items[0].case_reference == "CASE-COMBINED-MATCH"


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
