"""
MindFlow Complaint Service - Payment Schemas

Request/response schemas for case-level payment records, including the
server-side conditional billing/payment-mode validation matrix (see
design doc Section 5.2). Server-side validation is mandatory here — the
frontend mirrors this matrix for UX only, never as a substitute
(anti-trust-client-validation).
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CaseType(str, Enum):
    RETAIL = "RETAIL"
    YARD = "YARD"
    PI = "PI"
    CI = "CI"
    DOC = "DOC"


class CaseStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    REPORT_SUBMITTED = "REPORT_SUBMITTED"
    INVOICE_GENERATED = "INVOICE_GENERATED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    CANCELLED = "CANCELLED"


class BillingStatus(str, Enum):
    COMPANY_BILLING = "COMPANY_BILLING"
    CUSTOMER_BILLING = "CUSTOMER_BILLING"


class PaymentMode(str, Enum):
    CASH = "CASH"
    TRANSFER = "TRANSFER"


def _validate_billing_matrix(
    billing_status: Optional[BillingStatus],
    payment_mode: Optional[PaymentMode],
    utr_number: Optional[str],
    transaction_datetime: Optional[datetime],
    amount: Optional[Decimal],
) -> None:
    """Enforce the billing/payment-mode conditional validation matrix
    from design doc Section 5.2. Raises ValueError on violation.

    | Condition                          | Required                              | Must be null                                          |
    |-------------------------------------|----------------------------------------|--------------------------------------------------------|
    | billing_status = COMPANY_BILLING    | -                                      | payment_mode, utr_number, transaction_datetime         |
    | billing_status = CUSTOMER_BILLING   | payment_mode, amount                   | -                                                        |
    | payment_mode = CASH                 | amount (inherited from billing rule)   | utr_number, transaction_datetime                        |
    | payment_mode = TRANSFER             | amount, utr_number, transaction_datetime | -                                                      |

    amount is optional (not required, not forbidden) under COMPANY_BILLING —
    payment_mode/utr_number/transaction_datetime remain forbidden since they
    only make sense once a customer payment mode has actually been chosen.
    """
    if billing_status == BillingStatus.COMPANY_BILLING:
        if payment_mode is not None:
            raise ValueError(
                "payment_mode must be null when billing_status is COMPANY_BILLING"
            )
        if utr_number is not None:
            raise ValueError(
                "utr_number must be null when billing_status is COMPANY_BILLING"
            )
        if transaction_datetime is not None:
            raise ValueError(
                "transaction_datetime must be null when billing_status is COMPANY_BILLING"
            )
        return

    if billing_status == BillingStatus.CUSTOMER_BILLING:
        if payment_mode is None:
            raise ValueError(
                "payment_mode is required when billing_status is CUSTOMER_BILLING"
            )
        if amount is None:
            raise ValueError(
                "amount is required when billing_status is CUSTOMER_BILLING"
            )

    if payment_mode == PaymentMode.CASH:
        if amount is None:
            raise ValueError("amount is required when payment_mode is CASH")
        if utr_number is not None:
            raise ValueError("utr_number must be null when payment_mode is CASH")
        if transaction_datetime is not None:
            raise ValueError(
                "transaction_datetime must be null when payment_mode is CASH"
            )

    if payment_mode == PaymentMode.TRANSFER:
        if amount is None:
            raise ValueError("amount is required when payment_mode is TRANSFER")
        if utr_number is None:
            raise ValueError("utr_number is required when payment_mode is TRANSFER")
        if transaction_datetime is None:
            raise ValueError(
                "transaction_datetime is required when payment_mode is TRANSFER"
            )


class PaymentCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    case_reference: str = Field(..., min_length=1, max_length=100, alias="caseReference")
    case_type: CaseType = Field(..., alias="caseType")
    client_id: UUID = Field(..., alias="clientId")
    finance_id: Optional[UUID] = Field(None, alias="financeId")
    vehicle_registration_number: str = Field(
        ..., min_length=1, max_length=50, alias="vehicleRegistrationNumber"
    )
    executive_employee_id: UUID = Field(..., alias="executiveEmployeeId")
    case_status: CaseStatus = Field(CaseStatus.ASSIGNED, alias="caseStatus")
    billing_status: BillingStatus = Field(..., alias="billingStatus")
    payment_mode: Optional[PaymentMode] = Field(None, alias="paymentMode")
    utr_number: Optional[str] = Field(None, max_length=50, alias="utrNumber")
    transaction_datetime: Optional[datetime] = Field(None, alias="transactionDatetime")
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, alias="amount")

    @model_validator(mode="after")
    def validate_billing_matrix(self) -> "PaymentCreateRequest":
        _validate_billing_matrix(
            billing_status=self.billing_status,
            payment_mode=self.payment_mode,
            utr_number=self.utr_number,
            transaction_datetime=self.transaction_datetime,
            amount=self.amount,
        )
        return self


class PaymentUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    case_reference: Optional[str] = Field(
        None, min_length=1, max_length=100, alias="caseReference"
    )
    case_type: Optional[CaseType] = Field(None, alias="caseType")
    client_id: Optional[UUID] = Field(None, alias="clientId")
    finance_id: Optional[UUID] = Field(None, alias="financeId")
    vehicle_registration_number: Optional[str] = Field(
        None, min_length=1, max_length=50, alias="vehicleRegistrationNumber"
    )
    executive_employee_id: Optional[UUID] = Field(None, alias="executiveEmployeeId")
    case_status: Optional[CaseStatus] = Field(None, alias="caseStatus")
    billing_status: Optional[BillingStatus] = Field(None, alias="billingStatus")
    payment_mode: Optional[PaymentMode] = Field(None, alias="paymentMode")
    utr_number: Optional[str] = Field(None, max_length=50, alias="utrNumber")
    transaction_datetime: Optional[datetime] = Field(None, alias="transactionDatetime")
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, alias="amount")

    @model_validator(mode="after")
    def validate_billing_matrix(self) -> "PaymentUpdateRequest":
        # Partial update: only enforce the matrix when billing_status is
        # actually being set on this request. Field-level relationships
        # (e.g. payment_mode requiring amount) that depend on
        # billing_status are only checked when billing_status itself is
        # present — an update that only touches, say, case_status must
        # not be forced to also fully re-specify billing fields.
        if self.billing_status is None:
            return self
        _validate_billing_matrix(
            billing_status=self.billing_status,
            payment_mode=self.payment_mode,
            utr_number=self.utr_number,
            transaction_datetime=self.transaction_datetime,
            amount=self.amount,
        )
        return self


class PaymentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: UUID
    case_reference: str = Field(alias="caseReference")
    case_type: CaseType = Field(alias="caseType")
    client_id: UUID = Field(alias="clientId")
    finance_id: Optional[UUID] = Field(None, alias="financeId")
    vehicle_registration_number: str = Field(alias="vehicleRegistrationNumber")
    executive_employee_id: UUID = Field(alias="executiveEmployeeId")
    case_status: CaseStatus = Field(alias="caseStatus")
    billing_status: BillingStatus = Field(alias="billingStatus")
    payment_mode: Optional[PaymentMode] = Field(None, alias="paymentMode")
    utr_number: Optional[str] = Field(None, alias="utrNumber")
    transaction_datetime: Optional[datetime] = Field(None, alias="transactionDatetime")
    amount: Optional[Decimal] = Field(None, alias="amount")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class PaymentListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    items: List[PaymentResponse]
    total: int
    page: int
    limit: int
    pages: int
