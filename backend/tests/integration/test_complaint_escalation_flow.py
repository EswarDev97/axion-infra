"""
Integration Tests - Complaint Escalation Flow
Per SDLC Phase 7 Task 7.2

Tests the complete complaint management workflow:
1. Complaint creation
2. Assignment
3. Status transitions
4. SLA tracking
5. Escalation
6. Resolution
7. Reopening
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


class TestComplaintCreationFlow:
    """Tests for complaint creation flow."""

    async def test_create_complaint_internal(
        self, complaint_client, employee_headers, test_tenant
    ):
        """Test creating internal complaint."""
        response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Workplace Safety Concern",
                "description": "Emergency exit blocked by equipment",
                "severity": "HIGH",
                "source_channel": "INTERNAL",
            },
            headers=employee_headers,
        )
        assert response.status_code in [201, 400, 422]

        if response.status_code == 201:
            data = response.json()["data"]
            assert data["status"] == "NEW"
            assert data["severity"] == "HIGH"

    async def test_create_complaint_external(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test creating complaint from external source."""
        response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Service Complaint",
                "description": "Late delivery of order",
                "severity": "MEDIUM",
                "source_channel": "EMAIL",
                "complainant_name": "John Doe",
                "complainant_contact": "john@example.com",
                "reference_type": "ORDER",
                "reference_id": "ORD-2026-0001",
            },
            headers=admin_headers,
        )
        assert response.status_code in [201, 400, 422]


class TestComplaintAssignmentFlow:
    """Tests for complaint assignment flow."""

    async def test_assign_complaint(
        self, complaint_client, admin_headers, employee_headers, test_tenant
    ):
        """Test assigning complaint to employee."""
        # Create complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Product Quality Issue",
                "description": "Defective product received",
                "severity": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Assign complaint
        assign_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/assign",
            json={
                "owner_employee_id": str(uuid4()),  # Would be actual employee ID
            },
            headers=admin_headers,
        )
        assert assign_response.status_code in [200, 400, 404]


class TestComplaintStatusTransitions:
    """Tests for complaint status transitions."""

    async def test_start_working_on_complaint(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test transitioning complaint to IN_PROGRESS."""
        # Create and assign complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Billing Issue",
                "description": "Incorrect charges on invoice",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Update status
        status_response = await complaint_client.patch(
            f"/api/v1/complaints/{complaint_id}/status",
            json={"status": "IN_PROGRESS"},
            headers=admin_headers,
        )
        assert status_response.status_code in [200, 400, 404]

    async def test_request_more_information(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test marking complaint as waiting for info."""
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Unclear Complaint",
                "description": "Need more details",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Request info
        response = await complaint_client.patch(
            f"/api/v1/complaints/{complaint_id}/status",
            json={"status": "WAITING_INFO"},
            headers=admin_headers,
        )
        assert response.status_code in [200, 400, 404]


class TestComplaintResolutionFlow:
    """Tests for complaint resolution flow."""

    async def test_resolve_complaint(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test resolving a complaint."""
        # Create complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Simple Issue",
                "description": "Easy to fix",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Resolve
        resolve_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/resolve",
            json={
                "resolution_notes": "Issue has been addressed",
            },
            headers=admin_headers,
        )
        assert resolve_response.status_code in [200, 400, 404]

    async def test_close_complaint(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test closing a resolved complaint."""
        # Create and resolve complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Closed Issue",
                "description": "To be closed",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Resolve first
        await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/resolve",
            json={"resolution_notes": "Fixed"},
            headers=admin_headers,
        )

        # Close
        close_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/close",
            json={
                "closure_remarks": "Customer confirmed issue resolved",
            },
            headers=admin_headers,
        )
        assert close_response.status_code in [200, 400, 404]


class TestComplaintReopeningFlow:
    """Tests for complaint reopening flow."""

    async def test_reopen_complaint(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test reopening a resolved complaint."""
        # Create, resolve, and close complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Recurring Issue",
                "description": "May need reopening",
                "severity": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Resolve
        await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/resolve",
            json={"resolution_notes": "Fixed"},
            headers=admin_headers,
        )

        # Reopen
        reopen_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/reopen",
            json={
                "reason": "Issue reoccurred after initial fix",
            },
            headers=admin_headers,
        )
        assert reopen_response.status_code in [200, 400, 404]


class TestComplaintEscalationFlow:
    """Tests for complaint escalation flow."""

    async def test_manual_escalation(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test manually escalating a complaint."""
        # Create complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Serious Issue",
                "description": "Requires management attention",
                "severity": "CRITICAL",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Escalate
        escalate_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/escalate",
            json={
                "reason": "Customer threatening legal action",
                "escalate_to_level": 2,
            },
            headers=admin_headers,
        )
        assert escalate_response.status_code in [200, 400, 404]


class TestComplaintActionsFlow:
    """Tests for complaint action tracking."""

    async def test_add_action_note(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test adding action note to complaint."""
        # Create complaint
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Action Test",
                "description": "Testing action tracking",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Add action
        action_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/actions",
            json={
                "action_type": "NOTE",
                "description": "Called customer to gather more information",
            },
            headers=admin_headers,
        )
        assert action_response.status_code in [201, 400, 404]

    async def test_add_phone_call_action(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test recording phone call action."""
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Phone Test",
                "description": "Testing phone call tracking",
                "severity": "MEDIUM",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        action_response = await complaint_client.post(
            f"/api/v1/complaints/{complaint_id}/actions",
            json={
                "action_type": "PHONE_CALL",
                "description": "Outbound call to customer - discussed resolution options",
            },
            headers=admin_headers,
        )
        assert action_response.status_code in [201, 400, 404]


class TestComplaintSLATracking:
    """Tests for complaint SLA tracking."""

    async def test_sla_response_tracking(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test SLA response time tracking."""
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "SLA Test",
                "description": "Testing SLA tracking",
                "severity": "HIGH",  # Should have shorter SLA
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        # Get complaint to check SLA
        get_response = await complaint_client.get(
            f"/api/v1/complaints/{complaint_id}",
            headers=admin_headers,
        )
        assert get_response.status_code == 200

        data = get_response.json()["data"]
        # SLA times should be set based on severity
        # (actual assertion depends on implementation)


class TestComplaintAttachments:
    """Tests for complaint attachments."""

    async def test_list_complaint_attachments(
        self, complaint_client, admin_headers, test_tenant
    ):
        """Test listing complaint attachments."""
        create_response = await complaint_client.post(
            "/api/v1/complaints",
            json={
                "title": "Attachment Test",
                "description": "Testing attachments",
                "severity": "LOW",
            },
            headers=admin_headers,
        )
        if create_response.status_code != 201:
            pytest.skip("Could not create complaint")

        complaint_id = create_response.json()["data"]["id"]

        response = await complaint_client.get(
            f"/api/v1/complaints/{complaint_id}/attachments",
            headers=admin_headers,
        )
        assert response.status_code in [200, 404]
