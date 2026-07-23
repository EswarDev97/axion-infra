"""
Complaint Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- ComplaintCategory model
- SLAConfig model
- EscalationRule model
- Complaint model
- ComplaintAction model
- ComplaintAttachment model
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestComplaintCategoryModel:
    """Tests for ComplaintCategory model."""

    async def test_category_creation(self, db_session, test_tenant, test_user):
        """Test complaint category creation."""
        from services.complaint.models.category import ComplaintCategory

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Product Quality",
            code="QUALITY",
            description="Complaints related to product quality",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()
        await db_session.refresh(category)

        assert category.id is not None
        assert category.name == "Product Quality"
        assert category.code == "QUALITY"
        assert category.is_active is True

    async def test_category_unique_code_per_tenant(self, db_session, test_tenant, test_user):
        """Test category code must be unique within tenant."""
        from services.complaint.models.category import ComplaintCategory
        from sqlalchemy.exc import IntegrityError

        cat1 = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Service",
            code="SERVICE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cat1)
        await db_session.commit()

        cat2 = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Service Issues",
            code="SERVICE",  # Same code
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cat2)

        with pytest.raises(IntegrityError):
            await db_session.commit()


class TestSLAConfigModel:
    """Tests for SLAConfig model."""

    async def test_sla_config_creation(self, db_session, test_tenant, test_user):
        """Test SLA configuration creation."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.sla_config import SLAConfig

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="SLA Test Category",
            code="SLATEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        sla_config = SLAConfig(
            tenant_id=test_tenant.id,
            category_id=category.id,
            severity="HIGH",
            response_hours=4,
            resolution_hours=24,
            escalation_enabled=True,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(sla_config)
        await db_session.commit()
        await db_session.refresh(sla_config)

        assert sla_config.id is not None
        assert sla_config.response_hours == 4
        assert sla_config.resolution_hours == 24
        assert sla_config.escalation_enabled is True

    async def test_sla_config_severity_values(self, db_session, test_tenant, test_user):
        """Test valid SLA severity values."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.sla_config import SLAConfig

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Severity Test",
            code="SEVTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        for severity in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            sla = SLAConfig(
                tenant_id=test_tenant.id,
                category_id=category.id,
                severity=severity,
                response_hours=24,
                resolution_hours=72,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(sla)
            await db_session.commit()
            await db_session.refresh(sla)
            assert sla.severity == severity


class TestEscalationRuleModel:
    """Tests for EscalationRule model."""

    async def test_escalation_rule_creation(self, db_session, test_tenant, test_user):
        """Test escalation rule creation."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.escalation_rule import EscalationRule

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Escalation Test",
            code="ESCTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        rule = EscalationRule(
            tenant_id=test_tenant.id,
            category_id=category.id,
            escalation_level=1,
            trigger_condition="SLA_BREACH",
            trigger_hours=24,
            escalate_to_role="MANAGER",
            notify_by_email=True,
            notify_by_sms=False,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(rule)
        await db_session.commit()
        await db_session.refresh(rule)

        assert rule.id is not None
        assert rule.escalation_level == 1
        assert rule.trigger_condition == "SLA_BREACH"
        assert rule.notify_by_email is True


class TestComplaintModel:
    """Tests for Complaint model."""

    async def test_complaint_creation(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test complaint creation."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="General",
            code="GENERAL",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-2026-0001",
            title="Product defect",
            description="Received product with manufacturing defect",
            category_id=category.id,
            severity="HIGH",
            source_channel="EMAIL",
            status="NEW",
            complainant_name="John Smith",
            complainant_contact="john@example.com",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.id is not None
        assert complaint.complaint_number == "CMP-2026-0001"
        assert complaint.severity == "HIGH"
        assert complaint.status == "NEW"

    async def test_complaint_unique_number_per_tenant(
        self, db_session, test_tenant, test_user
    ):
        """Test complaint number must be unique within tenant."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint
        from sqlalchemy.exc import IntegrityError

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Unique Test",
            code="UNIQTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        cmp1 = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-DUP-001",
            title="Complaint 1",
            description="Description 1",
            category_id=category.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cmp1)
        await db_session.commit()

        cmp2 = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-DUP-001",  # Same number
            title="Complaint 2",
            description="Description 2",
            category_id=category.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(cmp2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_complaint_status_values(self, db_session, test_tenant, test_user):
        """Test valid complaint status values."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import (
            Complaint,
            COMPLAINT_STATUS_NEW,
            COMPLAINT_STATUS_ASSIGNED,
            COMPLAINT_STATUS_IN_PROGRESS,
            COMPLAINT_STATUS_WAITING_INFO,
            COMPLAINT_STATUS_RESOLVED,
            COMPLAINT_STATUS_CLOSED,
            COMPLAINT_STATUS_REOPENED,
        )

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Status Test",
            code="STATTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        statuses = [
            COMPLAINT_STATUS_NEW,
            COMPLAINT_STATUS_ASSIGNED,
            COMPLAINT_STATUS_IN_PROGRESS,
            COMPLAINT_STATUS_WAITING_INFO,
            COMPLAINT_STATUS_RESOLVED,
            COMPLAINT_STATUS_CLOSED,
            COMPLAINT_STATUS_REOPENED,
        ]

        for i, status in enumerate(statuses):
            complaint = Complaint(
                tenant_id=test_tenant.id,
                complaint_number=f"CMP-STAT-{i:03d}",
                title=f"Status {status}",
                description="Test",
                category_id=category.id,
                status=status,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(complaint)
            await db_session.commit()
            await db_session.refresh(complaint)
            assert complaint.status == status

    async def test_complaint_severity_values(self, db_session, test_tenant, test_user):
        """Test valid severity values."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import (
            Complaint,
            SEVERITY_LOW,
            SEVERITY_MEDIUM,
            SEVERITY_HIGH,
            SEVERITY_CRITICAL,
        )

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Sev Test",
            code="SEVTEST2",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        for i, severity in enumerate([SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH, SEVERITY_CRITICAL]):
            complaint = Complaint(
                tenant_id=test_tenant.id,
                complaint_number=f"CMP-SEV-{i:03d}",
                title=f"Severity {severity}",
                description="Test",
                category_id=category.id,
                severity=severity,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(complaint)
            await db_session.commit()
            await db_session.refresh(complaint)
            assert complaint.severity == severity

    async def test_complaint_source_channels(self, db_session, test_tenant, test_user):
        """Test valid source channel values."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import (
            Complaint,
            SOURCE_INTERNAL,
            SOURCE_PHONE,
            SOURCE_EMAIL,
            SOURCE_WHATSAPP,
            SOURCE_WALK_IN,
            SOURCE_OTHER,
        )

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Channel Test",
            code="CHTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        channels = [
            SOURCE_INTERNAL, SOURCE_PHONE, SOURCE_EMAIL,
            SOURCE_WHATSAPP, SOURCE_WALK_IN, SOURCE_OTHER
        ]

        for i, channel in enumerate(channels):
            complaint = Complaint(
                tenant_id=test_tenant.id,
                complaint_number=f"CMP-CH-{i:03d}",
                title=f"Channel {channel}",
                description="Test",
                category_id=category.id,
                source_channel=channel,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(complaint)
            await db_session.commit()
            await db_session.refresh(complaint)
            assert complaint.source_channel == channel

    async def test_complaint_assignment(
        self, db_session, test_tenant, test_user, test_employee
    ):
        """Test complaint assignment to owner."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Assign Test",
            code="ASSIGNTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-ASSIGN-001",
            title="To be assigned",
            description="Test",
            category_id=category.id,
            status="NEW",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        assert complaint.can_be_assigned is True

        complaint.owner_employee_id = test_employee.id
        complaint.assigned_at = datetime.utcnow()
        complaint.status = "ASSIGNED"
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.owner_employee_id == test_employee.id
        assert complaint.assigned_at is not None
        assert complaint.can_be_assigned is False

    async def test_complaint_sla_tracking(self, db_session, test_tenant, test_user):
        """Test SLA deadline tracking."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="SLA Track Test",
            code="SLATRACK",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        now = datetime.utcnow()
        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-SLA-001",
            title="SLA Test",
            description="Test",
            category_id=category.id,
            sla_response_due_at=now + timedelta(hours=4),
            sla_resolution_due_at=now + timedelta(hours=24),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.is_overdue_response is False
        assert complaint.is_overdue_resolution is False

    async def test_complaint_escalation(self, db_session, test_tenant, test_user):
        """Test escalation level tracking."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Escalation Track",
            code="ESCTRACK",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-ESC-001",
            title="Escalation Test",
            description="Test",
            category_id=category.id,
            escalation_level=0,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        # Escalate
        complaint.escalation_level = 1
        complaint.last_escalated_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.escalation_level == 1
        assert complaint.last_escalated_at is not None

    async def test_complaint_resolution(self, db_session, test_tenant, test_user):
        """Test complaint resolution."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Resolution Test",
            code="RESTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-RES-001",
            title="To Resolve",
            description="Test",
            category_id=category.id,
            status="IN_PROGRESS",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        assert complaint.can_be_resolved is True

        complaint.status = "RESOLVED"
        complaint.resolved_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.can_be_resolved is False

    async def test_complaint_reopening(self, db_session, test_tenant, test_user):
        """Test complaint reopening."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Reopen Test",
            code="REOPENTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-REOPEN-001",
            title="Resolved",
            description="Test",
            category_id=category.id,
            status="RESOLVED",
            resolved_at=datetime.utcnow(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        assert complaint.can_be_reopened is True

        complaint.status = "REOPENED"
        complaint.reopened_count += 1
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.reopened_count == 1
        assert complaint.can_be_assigned is True

    async def test_complaint_soft_delete(self, db_session, test_tenant, test_user):
        """Test complaint soft delete."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Delete Test",
            code="DELTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-DEL-001",
            title="To Delete",
            description="Test",
            category_id=category.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        complaint.is_deleted = True
        complaint.deleted_at = datetime.utcnow()
        complaint.deletion_reason = "Duplicate"
        await db_session.commit()
        await db_session.refresh(complaint)

        assert complaint.is_deleted is True
        assert complaint.deletion_reason == "Duplicate"


class TestComplaintActionModel:
    """Tests for ComplaintAction model."""

    async def test_action_creation(self, db_session, test_tenant, test_user):
        """Test complaint action creation."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint
        from services.complaint.models.complaint_action import ComplaintAction

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Action Test",
            code="ACTTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-ACT-001",
            title="Action Test",
            description="Test",
            category_id=category.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        action = ComplaintAction(
            tenant_id=test_tenant.id,
            complaint_id=complaint.id,
            action_type="NOTE",
            description="Called customer for more details",
            performed_by=test_user.id,
            performed_at=datetime.utcnow(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(action)
        await db_session.commit()
        await db_session.refresh(action)

        assert action.id is not None
        assert action.action_type == "NOTE"


class TestComplaintAttachmentModel:
    """Tests for ComplaintAttachment model."""

    async def test_attachment_creation(self, db_session, test_tenant, test_user):
        """Test complaint attachment creation."""
        from services.complaint.models.category import ComplaintCategory
        from services.complaint.models.complaint import Complaint
        from services.complaint.models.complaint_attachment import ComplaintAttachment

        category = ComplaintCategory(
            tenant_id=test_tenant.id,
            name="Attach Test",
            code="ATTACHTEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(category)
        await db_session.commit()

        complaint = Complaint(
            tenant_id=test_tenant.id,
            complaint_number="CMP-ATTACH-001",
            title="With Attachment",
            description="Test",
            category_id=category.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(complaint)
        await db_session.commit()

        attachment = ComplaintAttachment(
            tenant_id=test_tenant.id,
            complaint_id=complaint.id,
            file_name="evidence.jpg",
            file_path="/complaints/2026/01/evidence.jpg",
            file_size=512000,
            content_type="image/jpeg",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(attachment)
        await db_session.commit()
        await db_session.refresh(attachment)

        assert attachment.id is not None
        assert attachment.file_name == "evidence.jpg"
        assert attachment.content_type == "image/jpeg"


class TestPaymentModel:
    """Tests for Payment model."""

    async def test_payment_creation(self, db_session, test_tenant, test_user):
        """Test payment creation."""
        from services.complaint.models.client import Client
        from services.complaint.models.payment import Payment

        client = Client(
            tenant_id=test_tenant.id,
            name="Acme Insurer",
            code="ACME",
            type="CLIENT",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(client)
        await db_session.commit()

        payment = Payment(
            tenant_id=test_tenant.id,
            case_reference="CASE-2026-0001",
            client_id=client.id,
            vehicle_registration_number="KA01AB1234",
            executive_employee_id=uuid4(),
            billing_status="COMPANY_BILLING",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(payment)
        await db_session.commit()
        await db_session.refresh(payment)

        assert payment.id is not None
        assert payment.case_status == "ASSIGNED"
