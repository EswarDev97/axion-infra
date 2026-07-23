"""
Complaint Service Payment Schema Unit Tests

Tests the conditional billing/payment-mode validation matrix enforced by
`PaymentCreateRequest`/`PaymentUpdateRequest` (design doc Section 5.2).
These are pure Pydantic validation tests — no DB access/fixtures needed.
"""

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from services.complaint.schemas.payment import (
    PaymentCreateRequest,
)

pytestmark = pytest.mark.unit


def _base_kwargs(**overrides):
    """Common required fields for a PaymentCreateRequest, minus the
    conditional billing fields under test."""
    kwargs = dict(
        case_reference="CASE-001",
        client_id=uuid4(),
        vehicle_registration_number="MH12AB1234",
        executive_employee_id=uuid4(),
    )
    kwargs.update(overrides)
    return kwargs


class TestBillingMatrix:
    """Validation matrix from design doc Section 5.2."""

    def test_company_billing_rejects_payment_mode(self):
        """billing_status=COMPANY_BILLING + payment_mode set must raise."""
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="COMPANY_BILLING",
                    payment_mode="CASH",
                )
            )

    def test_company_billing_allows_all_null(self):
        """billing_status=COMPANY_BILLING with everything else null is valid."""
        payment = PaymentCreateRequest(
            **_base_kwargs(billing_status="COMPANY_BILLING")
        )
        assert payment.billing_status == "COMPANY_BILLING"
        assert payment.payment_mode is None
        assert payment.amount is None
        assert payment.utr_number is None
        assert payment.transaction_datetime is None

    def test_customer_billing_requires_payment_mode(self):
        """billing_status=CUSTOMER_BILLING with no payment_mode must raise."""
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(billing_status="CUSTOMER_BILLING")
            )

    def test_cash_requires_amount_but_forbids_utr(self):
        """payment_mode=CASH with amount=None must raise; CASH + UTR set must
        also raise (CASH forbids utr_number/transaction_datetime)."""
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="CASH",
                    amount=None,
                )
            )

        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="CASH",
                    amount=Decimal("100.00"),
                    utr_number="UTR12345",
                )
            )

    def test_cash_valid_with_amount_only(self):
        """payment_mode=CASH with only amount set (no UTR/datetime) is valid."""
        payment = PaymentCreateRequest(
            **_base_kwargs(
                billing_status="CUSTOMER_BILLING",
                payment_mode="CASH",
                amount=Decimal("100.00"),
            )
        )
        assert payment.payment_mode == "CASH"
        assert payment.amount == Decimal("100.00")

    def test_transfer_requires_utr_and_datetime_and_amount(self):
        """payment_mode=TRANSFER missing any of utr_number/transaction_datetime/
        amount must raise."""
        now = datetime.now(timezone.utc)

        # Missing utr_number
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="TRANSFER",
                    amount=Decimal("500.00"),
                    transaction_datetime=now,
                )
            )

        # Missing transaction_datetime
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="TRANSFER",
                    amount=Decimal("500.00"),
                    utr_number="UTR98765",
                )
            )

        # Missing amount
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="TRANSFER",
                    utr_number="UTR98765",
                    transaction_datetime=now,
                )
            )

    def test_transfer_valid_with_all_fields(self):
        """payment_mode=TRANSFER with utr_number, transaction_datetime, and
        amount all set is valid."""
        now = datetime.now(timezone.utc)
        payment = PaymentCreateRequest(
            **_base_kwargs(
                billing_status="CUSTOMER_BILLING",
                payment_mode="TRANSFER",
                amount=Decimal("500.00"),
                utr_number="UTR98765",
                transaction_datetime=now,
            )
        )
        assert payment.payment_mode == "TRANSFER"
        assert payment.utr_number == "UTR98765"
        assert payment.amount == Decimal("500.00")


class TestAmountValidation:
    """amount must be > 0 with max 2 decimal places."""

    def test_amount_must_be_positive_zero(self):
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="CASH",
                    amount=Decimal("0"),
                )
            )

    def test_amount_must_be_positive_negative(self):
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="CASH",
                    amount=Decimal("-10.00"),
                )
            )

    def test_amount_rejects_more_than_two_decimal_places(self):
        with pytest.raises(ValidationError):
            PaymentCreateRequest(
                **_base_kwargs(
                    billing_status="CUSTOMER_BILLING",
                    payment_mode="CASH",
                    amount=Decimal("100.123"),
                )
            )
