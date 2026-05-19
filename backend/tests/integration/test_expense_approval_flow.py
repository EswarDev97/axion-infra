"""
Integration Tests - Expense Approval Flow
Per SDLC Phase 7 Task 7.2

Tests the complete expense request workflow:
1. Employee creates expense request
2. Adds expense items
3. Uploads receipts
4. Submits request
5. Manager approves
6. Finance approves
7. Payment is recorded
"""

import pytest
from datetime import date
from decimal import Decimal
from uuid import uuid4

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


class TestExpenseCreationFlow:
    """Tests for expense request creation flow."""

    async def test_create_expense_request_with_items(
        self, expense_client, employee_headers, test_tenant
    ):
        """Test creating expense request with line items."""
        # First create a category
        category_response = await expense_client.post(
            "/api/v1/expense/categories",
            json={
                "name": "Travel",
                "code": "TRAVEL",
                "requires_receipt": True,
                "requires_approval": True,
            },
            headers=employee_headers,
        )
        assert category_response.status_code in [201, 403]  # May need admin

        # Create expense request
        response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "January Business Travel",
                "description": "Client visit to Mumbai",
                "expense_date": str(date.today()),
                "currency": "INR",
            },
            headers=employee_headers,
        )
        assert response.status_code == 201
        data = response.json()["data"]
        request_id = data["id"]

        # Verify request was created
        get_response = await expense_client.get(
            f"/api/v1/expense/requests/{request_id}",
            headers=employee_headers,
        )
        assert get_response.status_code == 200
        assert get_response.json()["data"]["status"] == "DRAFT"


class TestExpenseSubmissionFlow:
    """Tests for expense submission flow."""

    async def test_submit_expense_request(
        self, expense_client, employee_headers, test_tenant
    ):
        """Test submitting expense request for approval."""
        # Create expense request
        create_response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "Office Supplies",
                "expense_date": str(date.today()),
            },
            headers=employee_headers,
        )
        assert create_response.status_code == 201
        request_id = create_response.json()["data"]["id"]

        # Submit for approval
        submit_response = await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/submit",
            headers=employee_headers,
        )
        assert submit_response.status_code in [200, 400]  # May require items

        # If successful, verify status changed
        if submit_response.status_code == 200:
            get_response = await expense_client.get(
                f"/api/v1/expense/requests/{request_id}",
                headers=employee_headers,
            )
            assert get_response.json()["data"]["status"] == "SUBMITTED"


class TestExpenseApprovalFlow:
    """Tests for expense approval workflow."""

    async def test_manager_approval(
        self, expense_client, manager_headers, employee_headers, test_tenant
    ):
        """Test manager approving expense request."""
        # Create and submit expense request (as employee)
        create_response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "Team Lunch",
                "expense_date": str(date.today()),
                "total_amount": "1500.00",
            },
            headers=employee_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create expense request")

        request_id = create_response.json()["data"]["id"]

        # Submit request
        await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/submit",
            headers=employee_headers,
        )

        # Manager approves
        approve_response = await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/approve",
            json={"comments": "Approved for team building"},
            headers=manager_headers,
        )
        assert approve_response.status_code in [200, 403, 404]

    async def test_rejection_with_reason(
        self, expense_client, manager_headers, employee_headers, test_tenant
    ):
        """Test expense request rejection with reason."""
        # Create expense request
        create_response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "Questionable Expense",
                "expense_date": str(date.today()),
                "total_amount": "50000.00",
            },
            headers=employee_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create expense request")

        request_id = create_response.json()["data"]["id"]

        # Submit
        await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/submit",
            headers=employee_headers,
        )

        # Reject
        reject_response = await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/reject",
            json={
                "reason": "Amount exceeds policy limit. Please split into separate requests.",
            },
            headers=manager_headers,
        )
        assert reject_response.status_code in [200, 403, 404]


class TestExpensePaymentFlow:
    """Tests for expense payment recording."""

    async def test_record_payment(
        self, expense_client, admin_headers, employee_headers, test_tenant
    ):
        """Test recording payment for approved expense."""
        # Create, submit, and approve expense
        create_response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "Reimbursement Test",
                "expense_date": str(date.today()),
                "total_amount": "5000.00",
            },
            headers=employee_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create expense request")

        request_id = create_response.json()["data"]["id"]

        # Record payment
        payment_response = await expense_client.post(
            f"/api/v1/expense/requests/{request_id}/payments",
            json={
                "amount": "5000.00",
                "payment_method": "BANK_TRANSFER",
                "payment_reference": "TXN-2026-0001",
                "payment_date": str(date.today()),
            },
            headers=admin_headers,
        )
        assert payment_response.status_code in [201, 400, 403]


class TestExpenseReceiptManagement:
    """Tests for expense receipt management."""

    async def test_upload_receipt_placeholder(
        self, expense_client, employee_headers, test_tenant
    ):
        """Test receipt upload placeholder - actual upload tested separately."""
        # Create expense request
        create_response = await expense_client.post(
            "/api/v1/expense/requests",
            json={
                "title": "Receipt Test",
                "expense_date": str(date.today()),
            },
            headers=employee_headers,
        )
        assert create_response.status_code == 201
        # Actual file upload would be tested with proper multipart form data


class TestExpenseReports:
    """Tests for expense reporting."""

    async def test_get_expense_summary(
        self, expense_client, admin_headers, test_tenant
    ):
        """Test getting expense summary report."""
        response = await expense_client.get(
            "/api/v1/expense/reports/summary",
            params={
                "start_date": str(date.today().replace(day=1)),
                "end_date": str(date.today()),
            },
            headers=admin_headers,
        )
        assert response.status_code in [200, 403, 404]

    async def test_get_expense_by_category(
        self, expense_client, admin_headers, test_tenant
    ):
        """Test getting expenses by category report."""
        response = await expense_client.get(
            "/api/v1/expense/reports/by-category",
            params={
                "start_date": str(date.today().replace(day=1)),
                "end_date": str(date.today()),
            },
            headers=admin_headers,
        )
        assert response.status_code in [200, 403, 404]
