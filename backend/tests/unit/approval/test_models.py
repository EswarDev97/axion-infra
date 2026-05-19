"""
Approval Service Model Unit Tests
Per SDLC Phase 7 Task 7.1

Tests for:
- ApprovalWorkflow model
- ApprovalStep model
- ApprovalInstance model
- ApprovalDecision model
- ApprovalDelegation model
"""

import pytest
from datetime import date, datetime, timedelta
from uuid import uuid4

pytestmark = [pytest.mark.unit, pytest.mark.asyncio]


class TestApprovalWorkflowModel:
    """Tests for ApprovalWorkflow model."""

    async def test_workflow_creation(self, db_session, test_tenant, test_user):
        """Test approval workflow creation."""
        from services.approval.models.workflow import ApprovalWorkflow

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Leave Request Approval",
            code="LEAVE_APPROVAL",
            entity_type="LEAVE_REQUEST",
            description="Multi-level approval for leave requests",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()
        await db_session.refresh(workflow)

        assert workflow.id is not None
        assert workflow.name == "Leave Request Approval"
        assert workflow.code == "LEAVE_APPROVAL"
        assert workflow.entity_type == "LEAVE_REQUEST"
        assert workflow.is_active is True

    async def test_workflow_unique_code_per_tenant(self, db_session, test_tenant, test_user):
        """Test workflow code must be unique within tenant."""
        from services.approval.models.workflow import ApprovalWorkflow
        from sqlalchemy.exc import IntegrityError

        wf1 = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Workflow 1",
            code="WF_CODE",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(wf1)
        await db_session.commit()

        wf2 = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Workflow 2",
            code="WF_CODE",  # Same code
            entity_type="EXPENSE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(wf2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_workflow_entity_types(self, db_session, test_tenant, test_user):
        """Test valid entity types for workflows."""
        from services.approval.models.workflow import (
            ApprovalWorkflow,
            ENTITY_TYPE_LEAVE_REQUEST,
            ENTITY_TYPE_EXPENSE_REQUEST,
            ENTITY_TYPE_TRAINING_ENROLLMENT,
            ENTITY_TYPE_COMPLAINT,
            ENTITY_TYPE_DOCUMENT,
        )

        entity_types = [
            ENTITY_TYPE_LEAVE_REQUEST,
            ENTITY_TYPE_EXPENSE_REQUEST,
            ENTITY_TYPE_TRAINING_ENROLLMENT,
            ENTITY_TYPE_COMPLAINT,
            ENTITY_TYPE_DOCUMENT,
        ]

        for i, entity_type in enumerate(entity_types):
            workflow = ApprovalWorkflow(
                tenant_id=test_tenant.id,
                name=f"Workflow {entity_type}",
                code=f"WF_{entity_type}",
                entity_type=entity_type,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(workflow)
            await db_session.commit()
            await db_session.refresh(workflow)
            assert workflow.entity_type == entity_type


class TestApprovalStepModel:
    """Tests for ApprovalStep model."""

    async def test_step_creation(self, db_session, test_tenant, test_user):
        """Test approval step creation."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Step Test Workflow",
            code="STEP_TEST_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        step = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Manager Approval",
            step_order=1,
            approver_type="ROLE",
            approver_role="MANAGER",
            is_mandatory=True,
            auto_approve_after_hours=None,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(step)
        await db_session.commit()
        await db_session.refresh(step)

        assert step.id is not None
        assert step.name == "Manager Approval"
        assert step.step_order == 1
        assert step.approver_type == "ROLE"
        assert step.is_mandatory is True

    async def test_multi_step_workflow(self, db_session, test_tenant, test_user):
        """Test workflow with multiple steps."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Multi-Step Workflow",
            code="MULTI_STEP_WF",
            entity_type="EXPENSE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        # Step 1: Manager
        step1 = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Manager Approval",
            step_order=1,
            approver_type="ROLE",
            approver_role="MANAGER",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # Step 2: Finance
        step2 = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Finance Approval",
            step_order=2,
            approver_type="ROLE",
            approver_role="FINANCE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        # Step 3: HR
        step3 = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="HR Final Approval",
            step_order=3,
            approver_type="ROLE",
            approver_role="HR_ADMIN",
            created_by=test_user.id,
            updated_by=test_user.id,
        )

        db_session.add_all([step1, step2, step3])
        await db_session.commit()
        await db_session.refresh(workflow)

        assert len(workflow.steps) == 3
        assert workflow.first_step.step_order == 1
        assert workflow.get_step_by_order(2).name == "Finance Approval"

    async def test_step_approver_types(self, db_session, test_tenant, test_user):
        """Test different approver types."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Approver Type Test",
            code="APPROVER_TYPE_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        approver_types = ["ROLE", "SPECIFIC_USER", "REPORTING_MANAGER", "DEPARTMENT_HEAD"]

        for i, approver_type in enumerate(approver_types):
            step = ApprovalStep(
                tenant_id=test_tenant.id,
                workflow_id=workflow.id,
                name=f"Step {approver_type}",
                step_order=i + 1,
                approver_type=approver_type,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(step)
            await db_session.commit()
            await db_session.refresh(step)
            assert step.approver_type == approver_type

    async def test_step_auto_approve(self, db_session, test_tenant, test_user):
        """Test auto-approve configuration."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Auto Approve Test",
            code="AUTO_APPROVE_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        step = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Auto-approve Step",
            step_order=1,
            approver_type="ROLE",
            approver_role="MANAGER",
            is_mandatory=True,
            auto_approve_after_hours=48,  # Auto-approve after 48 hours
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(step)
        await db_session.commit()
        await db_session.refresh(step)

        assert step.auto_approve_after_hours == 48


class TestApprovalInstanceModel:
    """Tests for ApprovalInstance model."""

    async def test_instance_creation(self, db_session, test_tenant, test_user):
        """Test approval instance creation."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep
        from services.approval.models.instance import ApprovalInstance

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Instance Test Workflow",
            code="INSTANCE_TEST_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        step = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="First Step",
            step_order=1,
            approver_type="ROLE",
            approver_role="MANAGER",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(step)
        await db_session.commit()

        entity_id = uuid4()
        instance = ApprovalInstance(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            entity_type="LEAVE_REQUEST",
            entity_id=entity_id,
            current_step_id=step.id,
            status="PENDING",
            initiated_by=test_user.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(instance)
        await db_session.commit()
        await db_session.refresh(instance)

        assert instance.id is not None
        assert instance.entity_id == entity_id
        assert instance.status == "PENDING"
        assert instance.current_step_id == step.id

    async def test_instance_status_values(self, db_session, test_tenant, test_user):
        """Test valid instance status values."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.instance import ApprovalInstance

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Status Test Workflow",
            code="STATUS_TEST_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        statuses = ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"]

        for i, status in enumerate(statuses):
            instance = ApprovalInstance(
                tenant_id=test_tenant.id,
                workflow_id=workflow.id,
                entity_type="LEAVE_REQUEST",
                entity_id=uuid4(),
                status=status,
                initiated_by=test_user.id,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(instance)
            await db_session.commit()
            await db_session.refresh(instance)
            assert instance.status == status

    async def test_instance_completion(self, db_session, test_tenant, test_user):
        """Test instance completion timestamps."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.instance import ApprovalInstance

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Completion Test Workflow",
            code="COMPLETE_TEST_WF",
            entity_type="EXPENSE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        instance = ApprovalInstance(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            entity_type="EXPENSE_REQUEST",
            entity_id=uuid4(),
            status="IN_PROGRESS",
            initiated_by=test_user.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(instance)
        await db_session.commit()

        # Complete the instance
        instance.status = "APPROVED"
        instance.completed_at = datetime.utcnow()
        await db_session.commit()
        await db_session.refresh(instance)

        assert instance.completed_at is not None
        assert instance.status == "APPROVED"


class TestApprovalDecisionModel:
    """Tests for ApprovalDecision model."""

    async def test_decision_creation(self, db_session, test_tenant, test_user):
        """Test approval decision creation."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep
        from services.approval.models.instance import ApprovalInstance
        from services.approval.models.decision import ApprovalDecision

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Decision Test Workflow",
            code="DECISION_TEST_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        step = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Approval Step",
            step_order=1,
            approver_type="ROLE",
            approver_role="MANAGER",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(step)
        await db_session.commit()

        instance = ApprovalInstance(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            entity_type="LEAVE_REQUEST",
            entity_id=uuid4(),
            current_step_id=step.id,
            status="PENDING",
            initiated_by=test_user.id,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(instance)
        await db_session.commit()

        decision = ApprovalDecision(
            tenant_id=test_tenant.id,
            instance_id=instance.id,
            step_id=step.id,
            approver_id=test_user.id,
            decision="APPROVED",
            comments="Approved as requested",
            decided_at=datetime.utcnow(),
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(decision)
        await db_session.commit()
        await db_session.refresh(decision)

        assert decision.id is not None
        assert decision.decision == "APPROVED"
        assert decision.comments == "Approved as requested"

    async def test_decision_values(self, db_session, test_tenant, test_user):
        """Test valid decision values."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.step import ApprovalStep
        from services.approval.models.instance import ApprovalInstance
        from services.approval.models.decision import ApprovalDecision

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Decision Values Workflow",
            code="DECISION_VAL_WF",
            entity_type="LEAVE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        step = ApprovalStep(
            tenant_id=test_tenant.id,
            workflow_id=workflow.id,
            name="Step",
            step_order=1,
            approver_type="ROLE",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(step)
        await db_session.commit()

        decisions = ["APPROVED", "REJECTED", "RETURNED", "DELEGATED"]

        for i, decision_value in enumerate(decisions):
            instance = ApprovalInstance(
                tenant_id=test_tenant.id,
                workflow_id=workflow.id,
                entity_type="LEAVE_REQUEST",
                entity_id=uuid4(),
                current_step_id=step.id,
                status="PENDING",
                initiated_by=test_user.id,
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(instance)
            await db_session.commit()

            decision = ApprovalDecision(
                tenant_id=test_tenant.id,
                instance_id=instance.id,
                step_id=step.id,
                approver_id=test_user.id,
                decision=decision_value,
                decided_at=datetime.utcnow(),
                created_by=test_user.id,
                updated_by=test_user.id,
            )
            db_session.add(decision)
            await db_session.commit()
            await db_session.refresh(decision)
            assert decision.decision == decision_value


class TestApprovalDelegationModel:
    """Tests for ApprovalDelegation model."""

    async def test_delegation_creation(self, db_session, test_tenant, test_user):
        """Test approval delegation creation."""
        from services.approval.models.delegation import ApprovalDelegation

        delegate_user_id = uuid4()  # Would be another user

        delegation = ApprovalDelegation(
            tenant_id=test_tenant.id,
            delegator_id=test_user.id,
            delegate_id=delegate_user_id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=14),
            reason="Annual leave",
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(delegation)
        await db_session.commit()
        await db_session.refresh(delegation)

        assert delegation.id is not None
        assert delegation.delegator_id == test_user.id
        assert delegation.delegate_id == delegate_user_id
        assert delegation.is_active is True
        assert delegation.reason == "Annual leave"

    async def test_delegation_date_range(self, db_session, test_tenant, test_user):
        """Test delegation with specific date range."""
        from services.approval.models.delegation import ApprovalDelegation

        start = date.today() + timedelta(days=7)
        end = date.today() + timedelta(days=21)

        delegation = ApprovalDelegation(
            tenant_id=test_tenant.id,
            delegator_id=test_user.id,
            delegate_id=uuid4(),
            start_date=start,
            end_date=end,
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(delegation)
        await db_session.commit()
        await db_session.refresh(delegation)

        assert delegation.start_date == start
        assert delegation.end_date == end

    async def test_delegation_specific_workflows(self, db_session, test_tenant, test_user):
        """Test delegation for specific workflows."""
        from services.approval.models.workflow import ApprovalWorkflow
        from services.approval.models.delegation import ApprovalDelegation

        workflow = ApprovalWorkflow(
            tenant_id=test_tenant.id,
            name="Specific Delegation WF",
            code="SPECIFIC_DEL_WF",
            entity_type="EXPENSE_REQUEST",
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(workflow)
        await db_session.commit()

        delegation = ApprovalDelegation(
            tenant_id=test_tenant.id,
            delegator_id=test_user.id,
            delegate_id=uuid4(),
            workflow_id=workflow.id,  # Specific to this workflow
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(delegation)
        await db_session.commit()
        await db_session.refresh(delegation)

        assert delegation.workflow_id == workflow.id

    async def test_delegation_deactivation(self, db_session, test_tenant, test_user):
        """Test delegation deactivation."""
        from services.approval.models.delegation import ApprovalDelegation

        delegation = ApprovalDelegation(
            tenant_id=test_tenant.id,
            delegator_id=test_user.id,
            delegate_id=uuid4(),
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7),
            is_active=True,
            created_by=test_user.id,
            updated_by=test_user.id,
        )
        db_session.add(delegation)
        await db_session.commit()

        # Deactivate
        delegation.is_active = False
        await db_session.commit()
        await db_session.refresh(delegation)

        assert delegation.is_active is False
