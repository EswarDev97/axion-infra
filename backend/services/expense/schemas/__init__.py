"""
MindFlow Expense Service - Schemas
Per API_CONTRACT.md Section 8.6
"""

from .category import (
    ExpenseCategoryResponse,
)
from .expense_request import (
    ExpenseRequestCreateRequest,
    ExpenseRequestUpdateRequest,
    ExpenseRequestResponse,
    ExpenseRequestListResponse,
    ExpenseRequestFilters,
)
from .expense_item import (
    ExpenseItemCreateRequest,
    ExpenseItemUpdateRequest,
    ExpenseItemResponse,
)
from .receipt import (
    ReceiptUploadRequest,
    ReceiptResponse,
)
from .payment import (
    PaymentRecordCreateRequest,
    PaymentRecordResponse,
    PaymentRecordListResponse,
)
from .reports import (
    ExpenseSummaryResponse,
    ExpenseByCategoryResponse,
    ExpenseByEmployeeResponse,
)

__all__ = [
    # Category
    "ExpenseCategoryResponse",
    # Expense Request
    "ExpenseRequestCreateRequest",
    "ExpenseRequestUpdateRequest",
    "ExpenseRequestResponse",
    "ExpenseRequestListResponse",
    "ExpenseRequestFilters",
    # Expense Item
    "ExpenseItemCreateRequest",
    "ExpenseItemUpdateRequest",
    "ExpenseItemResponse",
    # Receipt
    "ReceiptUploadRequest",
    "ReceiptResponse",
    # Payment
    "PaymentRecordCreateRequest",
    "PaymentRecordResponse",
    "PaymentRecordListResponse",
    # Reports
    "ExpenseSummaryResponse",
    "ExpenseByCategoryResponse",
    "ExpenseByEmployeeResponse",
]
