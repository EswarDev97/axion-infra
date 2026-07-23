"""
Complaint Service ClientService Unit Tests

Tests for:
- ClientService.list() type filter
"""

import pytest

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestClientServiceList:
    """Tests for ClientService.list()."""

    async def test_list_clients_filters_by_type(self, db_session, test_tenant, test_user):
        """Test that list() filters clients by type when type_filter is provided."""
        from services.complaint.models.client import Client
        from services.complaint.services.client_service import ClientService

        client = Client(
            tenant_id=test_tenant.id,
            name="Acme Insurer",
            code="ACME",
            type="CLIENT",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        financer = Client(
            tenant_id=test_tenant.id,
            name="Acme Finance Co",
            code="ACMEFIN",
            type="FINANCER",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add_all([client, financer])
        await db_session.commit()

        service = ClientService(db_session)
        result = await service.list(test_tenant.id, type_filter="FINANCER")

        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].type == "FINANCER"
        assert result.items[0].code == "ACMEFIN"
