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


async def _create_employee(db_session, test_tenant, test_user, first_name, last_name):
    """Helper: create an Employee row (via a throwaway Position) so a
    sort-by-executive-name test has a real employees row to join against."""
    from datetime import date as date_cls

    from services.hr.models import Position
    from services.hr.services.employee_service import EmployeeService

    position = Position(
        tenant_id=test_tenant.id,
        title="Field Executive",
        code=f"FE-{uuid4().hex[:8]}",
        created_by=test_user.id,
        updated_by=test_user.id,
    )
    db_session.add(position)
    await db_session.commit()
    await db_session.refresh(position)

    service = EmployeeService(db_session)
    return await service.create_employee(
        tenant_id=test_tenant.id,
        employee_code=f"E-{uuid4().hex[:8]}",
        first_name=first_name,
        last_name=last_name,
        email=f"{first_name.lower()}.{uuid4().hex[:8]}@example.com",
        position_id=position.id,
        date_of_joining=date_cls.today(),
        created_by=test_user.id,
    )


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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
        assert payment.case_type == "RETAIL"
        assert payment.client_id == client.id
        assert payment.vehicle_registration_number == "KA01AB1234"
        assert payment.executive_employee_id == executive_id
        assert payment.case_status == "ASSIGNED"
        assert payment.billing_status == "COMPANY_BILLING"
        assert payment.payment_mode is None
        assert payment.is_deleted is False
        assert payment.created_by == test_user.id
        assert payment.updated_by == test_user.id

    async def test_create_payment_rejects_invalid_case_type(
        self, db_session, test_tenant, test_user
    ):
        from pydantic import ValidationError

        from services.complaint.schemas.payment import PaymentCreateRequest

        client = await _create_client(db_session, test_tenant, test_user)

        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                case_reference="CASE-BAD-TYPE",
                case_type="NOT_A_REAL_TYPE",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB0099",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            )

    async def test_update_case_type(self, db_session, test_tenant, test_user):
        from services.complaint.schemas.payment import (
            PaymentCreateRequest,
            PaymentUpdateRequest,
        )
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        payment = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-UPD-TYPE-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB0088",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )
        assert payment.case_type == "RETAIL"

        updated = await service.update(
            payment,
            PaymentUpdateRequest(case_type="YARD"),
            test_user.id,
        )
        assert updated.case_type == "YARD"


class TestPaymentServiceUniqueFields:
    """Tests for the Vehicle Registration Number / UTR Number uniqueness
    validation on create() and update()."""

    async def test_create_allows_duplicate_vehicle_registration_number(
        self, db_session, test_tenant, test_user
    ):
        """Vehicle Registration Number is not enforced unique server-side —
        a second payment reusing the same number succeeds. Only UTR Number
        (see test_create_rejects_duplicate_utr_number below) is unique."""
        from services.complaint.schemas.payment import PaymentCreateRequest
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        await service.create(
            PaymentCreateRequest(
                case_reference="CASE-DUP-VEH-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB9999",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )

        second = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-DUP-VEH-002",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB9999",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )
        assert second.vehicle_registration_number == "KA01AB9999"
        assert second.case_reference == "CASE-DUP-VEH-002"

    async def test_create_rejects_duplicate_utr_number(
        self, db_session, test_tenant, test_user
    ):
        from services.complaint.schemas.payment import PaymentCreateRequest
        from services.complaint.services.payment_service import PaymentService
        from shared.exceptions import ResourceAlreadyExistsException

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        await service.create(
            PaymentCreateRequest(
                case_reference="CASE-DUP-UTR-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB8001",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="CUSTOMER_BILLING",
                payment_mode="TRANSFER",
                utr_number="UTR000111222",
                transaction_datetime="2026-07-01T10:00:00Z",
                amount="500.00",
            ),
            test_tenant.id,
            test_user.id,
        )

        with pytest.raises(ResourceAlreadyExistsException):
            await service.create(
                PaymentCreateRequest(
                    case_reference="CASE-DUP-UTR-002",
                    case_type="RETAIL",
                    vehicle_type="FOUR_WHEELER",
                    client_id=client.id,
                    vehicle_registration_number="KA01AB8002",
                    executive_employee_id=uuid4(),
                    case_status="ASSIGNED",
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="TRANSFER",
                    utr_number="UTR000111222",
                    transaction_datetime="2026-07-01T11:00:00Z",
                    amount="700.00",
                ),
                test_tenant.id,
                test_user.id,
            )

    async def test_different_tenants_may_share_the_same_vehicle_registration_number(
        self, db_session, test_tenant, test_user
    ):
        """Uniqueness is scoped per tenant — two different companies may
        each have a payment for the same vehicle."""
        from services.auth.models import Tenant
        from services.complaint.schemas.payment import PaymentCreateRequest
        from services.complaint.services.payment_service import PaymentService

        other_tenant = Tenant(
            name="Other Co",
            slug=f"other-co-{uuid4().hex[:8]}",
            status="ACTIVE",
        )
        db_session.add(other_tenant)
        await db_session.commit()
        await db_session.refresh(other_tenant)

        client_a = await _create_client(db_session, test_tenant, test_user)
        client_b = await _create_client(db_session, other_tenant, test_user)

        service = PaymentService(db_session)
        await service.create(
            PaymentCreateRequest(
                case_reference="CASE-TENANT-A",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client_a.id,
                vehicle_registration_number="KA01AB7777",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )

        # Should NOT raise — different tenant, same vehicle registration number.
        payment_b = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-TENANT-B",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client_b.id,
                vehicle_registration_number="KA01AB7777",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            other_tenant.id,
            test_user.id,
        )
        assert payment_b.vehicle_registration_number == "KA01AB7777"

    async def test_soft_deleted_payment_frees_its_vehicle_registration_number_for_reuse(
        self, db_session, test_tenant, test_user
    ):
        from services.complaint.schemas.payment import PaymentCreateRequest
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        original = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-REUSE-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB6666",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )
        await service.delete(original)

        # Should NOT raise — the only other payment with this vehicle
        # registration number has been soft-deleted.
        new_payment = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-REUSE-002",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB6666",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )
        assert new_payment.vehicle_registration_number == "KA01AB6666"

    async def test_update_allows_changing_to_a_duplicate_vehicle_registration_number(
        self, db_session, test_tenant, test_user
    ):
        """Updating a payment to reuse another active payment's vehicle
        registration number succeeds — not enforced unique server-side."""
        from services.complaint.schemas.payment import (
            PaymentCreateRequest,
            PaymentUpdateRequest,
        )
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        await service.create(
            PaymentCreateRequest(
                case_reference="CASE-UPD-DUP-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB5001",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )
        second = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-UPD-DUP-002",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB5002",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )

        updated = await service.update(
            second,
            PaymentUpdateRequest(vehicle_registration_number="KA01AB5001"),
            test_user.id,
        )
        assert updated.vehicle_registration_number == "KA01AB5001"

    async def test_update_allows_keeping_a_payments_own_unchanged_vehicle_registration_number(
        self, db_session, test_tenant, test_user
    ):
        """Saving a payment without changing its vehicle registration
        number must not trip the uniqueness check against itself."""
        from services.complaint.schemas.payment import (
            PaymentCreateRequest,
            PaymentUpdateRequest,
        )
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        service = PaymentService(db_session)

        payment = await service.create(
            PaymentCreateRequest(
                case_reference="CASE-UPD-SELF-001",
                case_type="RETAIL",
                vehicle_type="FOUR_WHEELER",
                client_id=client.id,
                vehicle_registration_number="KA01AB4444",
                executive_employee_id=uuid4(),
                case_status="ASSIGNED",
                billing_status="COMPANY_BILLING",
            ),
            test_tenant.id,
            test_user.id,
        )

        # Should NOT raise — re-saving the same vehicle registration number
        # on the same payment it already belongs to.
        updated = await service.update(
            payment,
            PaymentUpdateRequest(
                vehicle_registration_number="KA01AB4444",
                case_status="SCHEDULED",
            ),
            test_user.id,
        )
        assert updated.vehicle_registration_number == "KA01AB4444"
        assert updated.case_status == "SCHEDULED"


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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
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


class TestPaymentServiceSort:
    """Tests for PaymentService.list()'s sort_by/sort_order — column
    headers on the Payment Management screen."""

    async def test_sorts_by_amount_ascending_and_descending(
        self, db_session, test_tenant, test_user
    ):
        from decimal import Decimal

        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        low = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-AMT-LOW",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4001",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            amount=Decimal("100.00"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        high = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-AMT-HIGH",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4002",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            amount=Decimal("900.00"),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([low, high])
        await db_session.commit()

        service = PaymentService(db_session)

        asc_result = await service.list(test_tenant.id, sort_by="amount", sort_order="asc")
        asc_refs = [item.case_reference for item in asc_result.items]
        assert asc_refs.index("CASE-SORT-AMT-LOW") < asc_refs.index("CASE-SORT-AMT-HIGH")

        desc_result = await service.list(test_tenant.id, sort_by="amount", sort_order="desc")
        desc_refs = [item.case_reference for item in desc_result.items]
        assert desc_refs.index("CASE-SORT-AMT-HIGH") < desc_refs.index("CASE-SORT-AMT-LOW")

    async def test_sorts_by_case_reference(self, db_session, test_tenant, test_user):
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)

        payment_b = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-B",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4003",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        payment_a = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-A",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4004",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([payment_b, payment_a])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, sort_by="caseReference", sort_order="asc")

        refs = [item.case_reference for item in result.items]
        assert refs.index("CASE-SORT-A") < refs.index("CASE-SORT-B")

    async def test_sorts_by_client_name_via_join(self, db_session, test_tenant, test_user):
        """sort_by='client' sorts by the joined clients.name, not the raw
        client_id — a UUID sort would not match what's shown on screen."""
        from services.complaint.models.client import Client
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client_zeta = Client(
            tenant_id=test_tenant.id,
            name="Zeta Insurer",
            code=f"ZETA-{uuid4().hex[:8]}",
            type="CLIENT",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        client_alpha = Client(
            tenant_id=test_tenant.id,
            name="Alpha Insurer",
            code=f"ALPHA-{uuid4().hex[:8]}",
            type="CLIENT",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([client_zeta, client_alpha])
        await db_session.commit()
        await db_session.refresh(client_zeta)
        await db_session.refresh(client_alpha)

        payment_zeta = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-CLIENT-ZETA",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client_zeta.id,
            vehicle_registration_number="KA01AB4005",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        payment_alpha = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-CLIENT-ALPHA",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client_alpha.id,
            vehicle_registration_number="KA01AB4006",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([payment_zeta, payment_alpha])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, sort_by="client", sort_order="asc")

        refs = [item.case_reference for item in result.items]
        assert refs.index("CASE-SORT-CLIENT-ALPHA") < refs.index("CASE-SORT-CLIENT-ZETA")

    async def test_sorts_by_executive_name_via_join(self, db_session, test_tenant, test_user):
        """sort_by='executive' sorts by the joined employee's full name."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        zeta_employee = await _create_employee(db_session, test_tenant, test_user, "Zeta", "Executive")
        alpha_employee = await _create_employee(db_session, test_tenant, test_user, "Alpha", "Executive")

        payment_zeta = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-EXEC-ZETA",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4007",
            executive_employee_id=zeta_employee.id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        payment_alpha = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-EXEC-ALPHA",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4008",
            executive_employee_id=alpha_employee.id,
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([payment_zeta, payment_alpha])
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, sort_by="executive", sort_order="asc")

        refs = [item.case_reference for item in result.items]
        assert refs.index("CASE-SORT-EXEC-ALPHA") < refs.index("CASE-SORT-EXEC-ZETA")

    async def test_unrecognized_sort_by_falls_back_to_created_at_desc(
        self, db_session, test_tenant, test_user
    ):
        """An invalid/omitted sort_by must not raise — it falls back to the
        original default ordering (newest created_at first)."""
        from services.complaint.models.payment import Payment
        from services.complaint.services.payment_service import PaymentService

        client = await _create_client(db_session, test_tenant, test_user)
        payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-SORT-FALLBACK",
            case_type="RETAIL",
            vehicle_type="FOUR_WHEELER",
            client_id=client.id,
            vehicle_registration_number="KA01AB4009",
            executive_employee_id=uuid4(),
            case_status="ASSIGNED",
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(payment)
        await db_session.commit()

        service = PaymentService(db_session)
        result = await service.list(test_tenant.id, sort_by=None)

        assert result.total == 1
        assert result.items[0].case_reference == "CASE-SORT-FALLBACK"
