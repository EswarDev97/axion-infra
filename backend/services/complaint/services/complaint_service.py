"""
MindFlow Complaint Service - Complaint Service
Core business logic for complaint management.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, or_, text, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.complaint import (
    Complaint,
    COMPLAINT_STATUS_NEW,
    COMPLAINT_STATUS_ASSIGNED,
    COMPLAINT_STATUS_IN_PROGRESS,
    COMPLAINT_STATUS_WAITING_INFO,
    COMPLAINT_STATUS_RESOLVED,
    COMPLAINT_STATUS_CLOSED,
    COMPLAINT_STATUS_REOPENED,
)
from ..models.complaint_action import (
    ComplaintAction,
    ACTION_CREATED,
    ACTION_ASSIGNED,
    ACTION_REASSIGNED,
    ACTION_STATUS_CHANGE,
    ACTION_ESCALATED,
    ACTION_COMMENT,
    ACTION_RESOLUTION,
    ACTION_CLOSURE,
    ACTION_REOPENED,
)
from ..models.complaint_attachment import ComplaintAttachment
from ..schemas.complaint import (
    ComplaintCreateRequest,
    ComplaintUpdateRequest,
    ComplaintAssignRequest,
    ComplaintEscalateRequest,
    ComplaintResolveRequest,
    ComplaintReopenRequest,
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintListResponse,
    ComplaintFilters,
)
from ..schemas.action import ActionCreateRequest, ActionResponse, ActionListResponse
from ..schemas.attachment import AttachmentCreateRequest, AttachmentResponse, AttachmentListResponse
from .sla_service import SLAService


class ComplaintService:
    """Service for managing complaints."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.sla_service = SLAService(db)

    async def _resolve_employee_name(self, employee_id: Optional[UUID]) -> Optional[str]:
        """Resolve an employee UUID to 'first_name last_name'."""
        if not employee_id:
            return None
        result = await self.db.execute(
            text("SELECT first_name, last_name FROM employees WHERE id = :eid LIMIT 1"),
            {"eid": employee_id}
        )
        row = result.fetchone()
        return f"{row[0]} {row[1]}" if row else None

    async def _resolve_user_name(self, user_id: Optional[UUID]) -> Optional[str]:
        """Resolve a user UUID to a name via the employees table (linked by user_id)."""
        if not user_id:
            return None
        result = await self.db.execute(
            text("SELECT first_name, last_name FROM employees WHERE user_id = :uid LIMIT 1"),
            {"uid": user_id}
        )
        row = result.fetchone()
        return f"{row[0]} {row[1]}" if row else None

    async def _batch_resolve_employee_names(self, employee_ids: List[UUID]) -> dict:
        """Batch resolve employee UUIDs to names. Returns {uuid: 'name'}."""
        if not employee_ids:
            return {}
        result = await self.db.execute(
            text("SELECT id, first_name, last_name FROM employees WHERE id = ANY(:ids)"),
            {"ids": list(employee_ids)}
        )
        return {row[0]: f"{row[1]} {row[2]}" for row in result.fetchall()}

    async def _batch_resolve_user_names(self, user_ids: List[UUID]) -> dict:
        """Batch resolve user UUIDs to names via employees table. Returns {user_id: 'name'}."""
        if not user_ids:
            return {}
        result = await self.db.execute(
            text("SELECT user_id, first_name, last_name FROM employees WHERE user_id = ANY(:ids)"),
            {"ids": list(user_ids)}
        )
        return {row[0]: f"{row[1]} {row[2]}" for row in result.fetchall()}

    async def _generate_complaint_number(self, tenant_id: UUID) -> str:
        """Generate unique complaint number in format CMP-YYYY-NNNNN."""
        year = datetime.utcnow().year

        # Get count of complaints this year
        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.complaint_number.like(f"CMP-{year}-%")
            )
        )
        count = (result.scalar() or 0) + 1

        return f"CMP-{year}-{count:05d}"

    async def create(
        self,
        data: ComplaintCreateRequest,
        tenant_id: UUID,
        user_id: UUID
    ) -> Complaint:
        """Create a new complaint with SLA calculations."""
        # Generate complaint number
        complaint_number = await self._generate_complaint_number(tenant_id)

        # Get SLA times for category and severity
        sla = await self.sla_service.get_sla_for_complaint(
            tenant_id, data.category_id, data.severity
        )

        now = datetime.utcnow()
        due_dates = self.sla_service.calculate_due_dates(now, sla)

        # Determine initial status: if assigned directly on creation, set ASSIGNED
        initial_status = COMPLAINT_STATUS_NEW
        assigned_at_val = None
        if data.owner_employee_id:
            initial_status = COMPLAINT_STATUS_ASSIGNED
            assigned_at_val = now

        # Use title field — if not provided, derive from description
        title = data.title or (data.description[:255] if data.description else "Untitled Complaint")

        # Create complaint
        complaint = Complaint(
            tenant_id=tenant_id,
            complaint_number=complaint_number,
            title=title,
            description=data.description,
            category_id=data.category_id,
            severity=data.severity,
            source_channel=data.source_channel,
            status=initial_status,
            complaint_type=data.complaint_type,
            complainant_type=data.complainant_type,
            complainant_name=data.complainant_name,
            complainant_contact=data.complainant_contact,
            complainant_employee_id=data.complainant_employee_id,
            owner_employee_id=data.owner_employee_id,
            assigned_at=assigned_at_val,
            reference_type=data.reference_type or ("CLAIM" if data.reference_id else None),
            reference_id=data.reference_id,
            insurer_client=data.insurer_client,
            vehicle_number=data.vehicle_number,
            workshop_name=data.workshop_name,
            corrective_action=data.corrective_action,
            expected_closure_date=data.expected_closure_date,
            sla_response_due_at=due_dates["response_due_at"],
            sla_resolution_due_at=due_dates["resolution_due_at"],
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(complaint)
        await self.db.flush()

        # Create action record for complaint creation
        action = ComplaintAction(
            tenant_id=tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_CREATED,
            description="Complaint created",
            new_status=COMPLAINT_STATUS_NEW,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def get_by_id(
        self,
        complaint_id: UUID,
        tenant_id: UUID
    ) -> Optional[Complaint]:
        """Get a complaint by ID."""
        result = await self.db.execute(
            select(Complaint).where(
                Complaint.id == complaint_id,
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False
            )
        )
        return result.scalar_one_or_none()

    async def update(
        self,
        complaint: Complaint,
        data: ComplaintUpdateRequest,
        user_id: UUID
    ) -> Complaint:
        """Update an existing complaint. Auto-sets status to WORKING (IN_PROGRESS) when employee updates."""
        old_status = complaint.status

        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(complaint, field, value)
        complaint.updated_by = user_id

        # Auto-transition to WORKING (IN_PROGRESS) when working-stage fields are updated
        # This covers: expected_closure_date, closure_remarks (action taken / remarks)
        working_fields = {"expected_closure_date", "closure_remarks"}
        updated_fields = set(update_data.keys())
        if working_fields.intersection(updated_fields):
            if complaint.status in (COMPLAINT_STATUS_ASSIGNED, COMPLAINT_STATUS_NEW):
                complaint.status = COMPLAINT_STATUS_IN_PROGRESS

        # Record status change if applicable
        if complaint.status != old_status:
            description = f"Status changed from {old_status} to {complaint.status}"
            if data.status and data.status != old_status:
                description = f"Status changed from {old_status} to {data.status}"
            action = ComplaintAction(
                tenant_id=complaint.tenant_id,
                complaint_id=complaint.id,
                action_type=ACTION_STATUS_CHANGE,
                description=description,
                old_status=old_status,
                new_status=complaint.status,
                performed_by=user_id,
            )
            self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def assign(
        self,
        complaint: Complaint,
        data: ComplaintAssignRequest,
        user_id: UUID
    ) -> Complaint:
        """Assign a complaint to an owner."""
        old_owner = complaint.owner_employee_id
        old_status = complaint.status

        complaint.owner_employee_id = data.owner_employee_id
        complaint.assigned_at = datetime.utcnow()
        complaint.updated_by = user_id

        # Update status if NEW
        if complaint.status == COMPLAINT_STATUS_NEW:
            complaint.status = COMPLAINT_STATUS_ASSIGNED

        # Mark as responded if first assignment
        if complaint.responded_at is None:
            complaint.responded_at = datetime.utcnow()

        # Record action
        action_type = ACTION_REASSIGNED if old_owner else ACTION_ASSIGNED
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=action_type,
            description=data.notes or f"Complaint {'reassigned' if old_owner else 'assigned'}",
            old_status=old_status,
            new_status=complaint.status,
            old_owner_id=old_owner,
            new_owner_id=data.owner_employee_id,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def escalate(
        self,
        complaint: Complaint,
        data: ComplaintEscalateRequest,
        user_id: UUID
    ) -> Complaint:
        """Escalate a complaint."""
        old_owner = complaint.owner_employee_id
        old_status = complaint.status

        complaint.escalation_level += 1
        complaint.last_escalated_at = datetime.utcnow()
        complaint.updated_by = user_id

        # Assign to new owner if provided
        if data.escalate_to_employee_id:
            complaint.owner_employee_id = data.escalate_to_employee_id
            complaint.assigned_at = datetime.utcnow()

        # Update status if not already in progress
        if complaint.status in (COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED):
            complaint.status = COMPLAINT_STATUS_IN_PROGRESS

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_ESCALATED,
            description=f"Escalated to level {complaint.escalation_level}. Reason: {data.reason}",
            old_status=old_status,
            new_status=complaint.status,
            old_owner_id=old_owner,
            new_owner_id=data.escalate_to_employee_id,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def resolve(
        self,
        complaint: Complaint,
        data: ComplaintResolveRequest,
        user_id: UUID
    ) -> Complaint:
        """Resolve a complaint."""
        old_status = complaint.status

        complaint.status = COMPLAINT_STATUS_RESOLVED
        complaint.resolved_at = datetime.utcnow()
        complaint.closure_remarks = data.resolution_notes
        complaint.updated_by = user_id

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_RESOLUTION,
            description=f"Complaint resolved. Notes: {data.resolution_notes}",
            old_status=old_status,
            new_status=COMPLAINT_STATUS_RESOLVED,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def reopen(
        self,
        complaint: Complaint,
        data: ComplaintReopenRequest,
        user_id: UUID
    ) -> Complaint:
        """Reopen a resolved/closed complaint."""
        old_status = complaint.status

        complaint.status = COMPLAINT_STATUS_REOPENED
        complaint.reopened_count += 1
        complaint.resolved_at = None
        complaint.closed_at = None
        complaint.updated_by = user_id

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_REOPENED,
            description=f"Complaint reopened. Reason: {data.reason}",
            old_status=old_status,
            new_status=COMPLAINT_STATUS_REOPENED,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def close(
        self,
        complaint: Complaint,
        user_id: UUID,
        reason_for_complaint: str,
        corrective_action: str,
        remarks: Optional[str] = None
    ) -> Complaint:
        """
        Close a complaint.
        REQUIRES: reason_for_complaint and corrective_action per PART 4.
        Computes Closure TAT in both hours and days.
        """
        old_status = complaint.status

        # Enforce required closure fields
        if not reason_for_complaint:
            raise ValueError("Reason for Complaint is required to close a complaint")
        if not corrective_action:
            raise ValueError("Corrective Action is required to close a complaint")

        complaint.status = COMPLAINT_STATUS_CLOSED
        complaint.closed_at = datetime.utcnow()
        complaint.reason_for_complaint = reason_for_complaint
        complaint.corrective_action = corrective_action
        if remarks:
            complaint.closure_remarks = remarks
        complaint.updated_by = user_id

        # Compute closure TAT
        created = complaint.created_at.replace(tzinfo=None) if complaint.created_at else None
        if created:
            delta = complaint.closed_at.replace(tzinfo=None) - created
            complaint.closure_tat_hours = round(delta.total_seconds() / 3600, 2)
            complaint.closure_tat_days = delta.days

        # Record action
        description = f"Complaint closed. Reason: {reason_for_complaint}. Corrective Action: {corrective_action}"
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_CLOSURE,
            description=description,
            old_status=old_status,
            new_status=COMPLAINT_STATUS_CLOSED,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def soft_delete(
        self,
        complaint: Complaint,
        user_id: UUID,
        reason: Optional[str] = None
    ) -> None:
        """Soft delete a complaint."""
        complaint.is_deleted = True
        complaint.deleted_at = datetime.utcnow()
        complaint.deletion_reason = reason
        complaint.updated_by = user_id
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        filters: ComplaintFilters,
        page: int = 1,
        limit: int = 20,
        user_roles: Optional[List[str]] = None,
        user_id: Optional[UUID] = None,
        employee_id: Optional[UUID] = None,
    ) -> ComplaintListResponse:
        """List complaints with filters, pagination, and role-based visibility."""
        query = select(Complaint).where(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False
        )

        # Role-based visibility filtering
        # Super Admin, HR Admin, Manager → see all complaints
        # Employee → see only assigned to them OR created by them
        if user_roles and user_id:
            privileged_roles = {"SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD"}
            has_privileged_role = bool(set(user_roles) & privileged_roles)

            if not has_privileged_role:
                # Employee: can only see complaints assigned to them or created by them
                visibility_conditions = []
                if employee_id:
                    visibility_conditions.append(Complaint.owner_employee_id == employee_id)
                visibility_conditions.append(Complaint.created_by == user_id)
                query = query.where(or_(*visibility_conditions))

        # Apply filters
        if filters.category_id:
            query = query.where(Complaint.category_id == filters.category_id)

        if filters.severity:
            query = query.where(Complaint.severity == filters.severity)

        if filters.status:
            query = query.where(Complaint.status == filters.status)

        if filters.source_channel:
            query = query.where(Complaint.source_channel == filters.source_channel)

        if filters.owner_employee_id:
            query = query.where(Complaint.owner_employee_id == filters.owner_employee_id)

        if filters.complainant_employee_id:
            query = query.where(Complaint.complainant_employee_id == filters.complainant_employee_id)

        if filters.overdue:
            now = datetime.utcnow()
            query = query.where(
                or_(
                    (Complaint.sla_response_due_at < now) & (Complaint.responded_at.is_(None)),
                    (Complaint.sla_resolution_due_at < now) & (Complaint.resolved_at.is_(None))
                )
            )

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Complaint.complaint_number.ilike(search_term),
                    Complaint.title.ilike(search_term),
                    Complaint.complainant_name.ilike(search_term)
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(Complaint.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        complaints = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        # Batch-resolve assigned employee names
        emp_ids = [c.owner_employee_id for c in complaints if c.owner_employee_id]
        emp_names = await self._batch_resolve_employee_names(emp_ids) if emp_ids else {}

        items = []
        for c in complaints:
            item = ComplaintResponse(
                id=c.id,
                complaint_number=c.complaint_number,
                source_channel=c.source_channel,
                category=c.category,
                complaint_type=c.complaint_type,
                complainant_name=c.complainant_name,
                insurer_client=c.insurer_client,
                reference_id=c.reference_id,
                vehicle_number=c.vehicle_number,
                owner_employee_id=c.owner_employee_id,
                assigned_to_name=emp_names.get(c.owner_employee_id) if c.owner_employee_id else None,
                severity=c.severity,
                status=c.status,
                display_status=c.display_status,
                closure_tat_days=c.closure_tat_days,
                escalated_yn=c.escalated_yn,
                escalation_level=c.escalation_level,
                updated_at=c.updated_at,
                created_at=c.created_at,
                # Legacy fields
                title=c.title,
                is_escalated=c.is_escalated,
                assigned_at=c.assigned_at,
                expected_closure_date=c.expected_closure_date,
                sla_response_due_at=c.sla_response_due_at,
                sla_resolution_due_at=c.sla_resolution_due_at,
                is_overdue_response=c.is_overdue_response,
                is_overdue_resolution=c.is_overdue_resolution,
            )
            items.append(item)

        return ComplaintListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

    async def get_my_complaints(
        self,
        tenant_id: UUID,
        user_id: UUID,
        employee_id: Optional[UUID],
        page: int = 1,
        limit: int = 20,
    ) -> ComplaintListResponse:
        """Get complaints created by or for the current user."""
        filters = ComplaintFilters()
        if employee_id:
            filters.complainant_employee_id = employee_id
        return await self.list(tenant_id, filters, page, limit)

    async def get_assigned_to_me(
        self,
        tenant_id: UUID,
        employee_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> ComplaintListResponse:
        """Get complaints assigned to the current user."""
        filters = ComplaintFilters(owner_employee_id=employee_id)
        return await self.list(tenant_id, filters, page, limit)

    # Action methods
    async def add_action(
        self,
        complaint: Complaint,
        data: ActionCreateRequest,
        user_id: UUID
    ) -> ComplaintAction:
        """Add an action (comment) to a complaint."""
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=data.action_type,
            description=data.description,
            is_internal=data.is_internal,
            performed_by=user_id,
        )
        self.db.add(action)
        await self.db.commit()
        await self.db.refresh(action)
        return action

    async def get_actions(
        self,
        complaint_id: UUID,
        tenant_id: UUID,
        include_internal: bool = True
    ) -> ActionListResponse:
        """Get actions for a complaint."""
        query = select(ComplaintAction).where(
            ComplaintAction.complaint_id == complaint_id,
            ComplaintAction.tenant_id == tenant_id
        )

        if not include_internal:
            query = query.where(ComplaintAction.is_internal == False)

        query = query.order_by(ComplaintAction.performed_at.desc())

        result = await self.db.execute(query)
        actions = result.scalars().all()

        return ActionListResponse(
            items=[ActionResponse.model_validate(a) for a in actions],
            total=len(actions),
        )

    # Attachment methods
    async def add_attachment(
        self,
        complaint: Complaint,
        data: AttachmentCreateRequest,
        user_id: UUID
    ) -> ComplaintAttachment:
        """Add an attachment to a complaint."""
        attachment = ComplaintAttachment(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            file_id=data.file_id,
            attachment_type=data.attachment_type,
            uploaded_by=user_id,
        )
        self.db.add(attachment)
        await self.db.commit()
        await self.db.refresh(attachment)
        return attachment

    async def get_attachments(
        self,
        complaint_id: UUID,
        tenant_id: UUID
    ) -> AttachmentListResponse:
        """Get attachments for a complaint."""
        result = await self.db.execute(
            select(ComplaintAttachment).where(
                ComplaintAttachment.complaint_id == complaint_id,
                ComplaintAttachment.tenant_id == tenant_id
            ).order_by(ComplaintAttachment.uploaded_at.desc())
        )
        attachments = result.scalars().all()

        return AttachmentListResponse(
            items=[AttachmentResponse.model_validate(a) for a in attachments],
            total=len(attachments),
        )

    async def delete_attachment(
        self,
        attachment_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """Delete an attachment."""
        result = await self.db.execute(
            select(ComplaintAttachment).where(
                ComplaintAttachment.id == attachment_id,
                ComplaintAttachment.tenant_id == tenant_id
            )
        )
        attachment = result.scalar_one_or_none()
        if attachment:
            await self.db.delete(attachment)
            await self.db.commit()
            return True
        return False

    # Reporting methods
    async def get_overdue_complaints(
        self,
        tenant_id: UUID
    ) -> List[Complaint]:
        """Get all overdue complaints for auto-escalation."""
        now = datetime.utcnow()
        result = await self.db.execute(
            select(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.status.notin_([COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED]),
                or_(
                    (Complaint.sla_response_due_at < now) & (Complaint.responded_at.is_(None)),
                    (Complaint.sla_resolution_due_at < now) & (Complaint.resolved_at.is_(None))
                )
            )
        )
        return list(result.scalars().all())

    # =========================================================================
    # Additional Workflow Methods (State Transitions)
    # =========================================================================

    async def start_progress(
        self,
        complaint: Complaint,
        user_id: UUID
    ) -> Complaint:
        """Start working on a complaint (ASSIGNED -> IN_PROGRESS)."""
        old_status = complaint.status

        if complaint.status != COMPLAINT_STATUS_ASSIGNED:
            raise ValueError("Complaint must be in ASSIGNED status to start progress")

        complaint.status = COMPLAINT_STATUS_IN_PROGRESS
        complaint.updated_by = user_id

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_STATUS_CHANGE,
            description="Started working on complaint",
            old_status=old_status,
            new_status=COMPLAINT_STATUS_IN_PROGRESS,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def request_info(
        self,
        complaint: Complaint,
        user_id: UUID,
        message: str
    ) -> Complaint:
        """Request more information (IN_PROGRESS -> WAITING_INFO)."""
        old_status = complaint.status

        if complaint.status != COMPLAINT_STATUS_IN_PROGRESS:
            raise ValueError("Complaint must be in IN_PROGRESS status to request info")

        complaint.status = COMPLAINT_STATUS_WAITING_INFO
        complaint.updated_by = user_id

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_STATUS_CHANGE,
            description=f"Requested additional information: {message}",
            old_status=old_status,
            new_status=COMPLAINT_STATUS_WAITING_INFO,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    async def provide_info(
        self,
        complaint: Complaint,
        user_id: UUID,
        response: str
    ) -> Complaint:
        """Provide information (WAITING_INFO -> IN_PROGRESS)."""
        old_status = complaint.status

        if complaint.status != COMPLAINT_STATUS_WAITING_INFO:
            raise ValueError("Complaint must be in WAITING_INFO status to provide info")

        complaint.status = COMPLAINT_STATUS_IN_PROGRESS
        complaint.updated_by = user_id

        # Record action
        action = ComplaintAction(
            tenant_id=complaint.tenant_id,
            complaint_id=complaint.id,
            action_type=ACTION_STATUS_CHANGE,
            description=f"Information provided: {response}",
            old_status=old_status,
            new_status=COMPLAINT_STATUS_IN_PROGRESS,
            performed_by=user_id,
        )
        self.db.add(action)

        await self.db.commit()
        await self.db.refresh(complaint)
        return complaint

    # =========================================================================
    # Dashboard & Statistics Methods
    # =========================================================================

    async def get_dashboard_stats(self, tenant_id: UUID) -> dict:
        """Get dashboard statistics for complaints."""
        now = datetime.utcnow()

        # Total counts by status
        status_counts = {}
        for status_val in [
            COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED,
            COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO,
            COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED,
            COMPLAINT_STATUS_REOPENED
        ]:
            result = await self.db.execute(
                select(func.count()).select_from(Complaint).where(
                    Complaint.tenant_id == tenant_id,
                    Complaint.is_deleted == False,
                    Complaint.status == status_val
                )
            )
            status_counts[status_val] = result.scalar() or 0

        # Total open complaints (not resolved/closed)
        open_statuses = [
            COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED,
            COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO,
            COMPLAINT_STATUS_REOPENED
        ]
        total_open = sum(status_counts.get(s, 0) for s in open_statuses)

        # Severity counts
        severity_counts = {}
        for severity in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            result = await self.db.execute(
                select(func.count()).select_from(Complaint).where(
                    Complaint.tenant_id == tenant_id,
                    Complaint.is_deleted == False,
                    Complaint.status.in_(open_statuses),
                    Complaint.severity == severity
                )
            )
            severity_counts[severity] = result.scalar() or 0

        # Resolved today
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.resolved_at >= today_start
            )
        )
        resolved_today = result.scalar() or 0

        # Closed today
        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.closed_at >= today_start
            )
        )
        closed_today = result.scalar() or 0

        # Overdue counts
        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.status.in_(open_statuses),
                Complaint.sla_response_due_at < now,
                Complaint.responded_at.is_(None)
            )
        )
        overdue_response = result.scalar() or 0

        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.status.in_(open_statuses),
                Complaint.sla_resolution_due_at < now,
                Complaint.resolved_at.is_(None)
            )
        )
        overdue_resolution = result.scalar() or 0

        # Average resolution time (in hours) for resolved complaints
        from sqlalchemy import extract
        result = await self.db.execute(
            select(
                func.avg(
                    extract('epoch', Complaint.resolved_at - Complaint.created_at) / 3600
                )
            ).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.resolved_at.isnot(None)
            )
        )
        avg_resolution_hours = result.scalar()

        # Total complaints
        result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False
            )
        )
        total_complaints = result.scalar() or 0

        return {
            "totalComplaints": total_complaints,
            "openComplaints": total_open,
            "assignedComplaints": status_counts.get(COMPLAINT_STATUS_ASSIGNED, 0),
            "inProgressComplaints": status_counts.get(COMPLAINT_STATUS_IN_PROGRESS, 0),
            "resolvedToday": resolved_today,
            "closedToday": closed_today,
            "overdueResponse": overdue_response,
            "overdueResolution": overdue_resolution,
            "averageResolutionHours": round(avg_resolution_hours, 2) if avg_resolution_hours else None,
            "byStatus": status_counts,
            "bySeverity": severity_counts,
        }

    async def get_sla_compliance_report(
        self,
        tenant_id: UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> List[dict]:
        """Generate SLA compliance report."""
        from ..models.category import ComplaintCategory

        query = select(Complaint).where(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False,
            Complaint.resolved_at.isnot(None)  # Only resolved complaints
        )

        if from_date:
            query = query.where(Complaint.created_at >= from_date)
        if to_date:
            query = query.where(Complaint.created_at <= to_date)

        result = await self.db.execute(query)
        complaints = result.scalars().all()

        # Group by category and severity
        report_data = {}
        for c in complaints:
            key = (c.category_id, c.severity)
            if key not in report_data:
                report_data[key] = {
                    "category_id": c.category_id,
                    "category_name": c.category.name if c.category else "Unknown",
                    "severity": c.severity,
                    "total": 0,
                    "within_sla": 0,
                    "breached": 0,
                }

            report_data[key]["total"] += 1

            # Check if resolved within SLA
            if c.sla_resolution_due_at and c.resolved_at:
                if c.resolved_at <= c.sla_resolution_due_at:
                    report_data[key]["within_sla"] += 1
                else:
                    report_data[key]["breached"] += 1

        # Calculate compliance percentage
        report = []
        for data in report_data.values():
            compliance_pct = (data["within_sla"] / data["total"] * 100) if data["total"] > 0 else 0
            report.append({
                "category": data["category_name"],
                "severity": data["severity"],
                "total": data["total"],
                "withinSla": data["within_sla"],
                "slaBreached": data["breached"],
                "slaCompliancePct": round(compliance_pct, 2),
            })

        return report

    async def get_aging_report(self, tenant_id: UUID) -> List[dict]:
        """Generate aging report for open complaints."""
        now = datetime.utcnow()

        open_statuses = [
            COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED,
            COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO,
            COMPLAINT_STATUS_REOPENED
        ]

        result = await self.db.execute(
            select(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.status.in_(open_statuses)
            )
        )
        complaints = result.scalars().all()

        # Age groups in days
        age_groups = {
            "0-1 days": {"min": 0, "max": 1, "count": 0},
            "2-3 days": {"min": 2, "max": 3, "count": 0},
            "4-7 days": {"min": 4, "max": 7, "count": 0},
            "8-14 days": {"min": 8, "max": 14, "count": 0},
            "15-30 days": {"min": 15, "max": 30, "count": 0},
            "30+ days": {"min": 31, "max": 9999, "count": 0},
        }

        for c in complaints:
            age_days = (now - c.created_at.replace(tzinfo=None)).days
            for group_name, group in age_groups.items():
                if group["min"] <= age_days <= group["max"]:
                    group["count"] += 1
                    break

        total = len(complaints) or 1  # Avoid division by zero

        return [
            {
                "ageGroup": group_name,
                "count": group["count"],
                "percentage": round(group["count"] / total * 100, 2),
            }
            for group_name, group in age_groups.items()
        ]

    # =========================================================================
    # Role-Based Access and Assignment Logic
    # =========================================================================

    async def get_assignable_users(
        self,
        tenant_id: UUID,
        user_roles: List[str],
        user_employee_id: Optional[UUID],
        user_department_id: Optional[str] = None,
    ) -> List[dict]:
        """
        Get list of users that the current user can assign complaints to,
        based on their role per TDD Section 5.1.

        Column mapping (actual DB schema):
          - employees: id, employee_code, first_name, last_name, department_id, manager_id, status, position_id
          - departments: id, name
          - users: id (no first_name/last_name — those are on employees)
        """
        # Base SELECT for all queries — names come from employees table, not users
        base_select = """
            SELECT e.id, e.employee_code, e.first_name, e.last_name,
                   d.name as department_name, e.email
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE e.tenant_id = :tenant_id
              AND e.status = 'ACTIVE'
              AND e.is_deleted = false
        """

        if "SUPER_ADMIN" in user_roles:
            result = await self.db.execute(
                text(base_select + " ORDER BY e.first_name, e.last_name"),
                {"tenant_id": tenant_id}
            )
        elif "HR_ADMIN" in user_roles:
            result = await self.db.execute(
                text(base_select + """
                      AND e.user_id NOT IN (
                          SELECT ur.user_id FROM user_tenant_roles ur
                          JOIN roles r ON r.id = ur.role_id
                          WHERE r.code = 'SUPER_ADMIN'
                      )
                    ORDER BY e.first_name, e.last_name
                """),
                {"tenant_id": tenant_id}
            )
        elif "MANAGER" in user_roles:
            if not user_employee_id:
                return []
            result = await self.db.execute(
                text(base_select + """
                      AND e.manager_id = :manager_employee_id
                    ORDER BY e.first_name, e.last_name
                """),
                {"tenant_id": tenant_id, "manager_employee_id": user_employee_id}
            )
        elif "DEPARTMENT_HEAD" in user_roles:
            if not user_department_id:
                return []
            result = await self.db.execute(
                text(base_select + """
                      AND e.department_id = :department_id
                    ORDER BY e.first_name, e.last_name
                """),
                {"tenant_id": tenant_id, "department_id": user_department_id}
            )
        else:
            return []

        rows = result.fetchall()
        return [
            {
                "id": str(row[0]),
                "employeeCode": row[1],
                "firstName": row[2],
                "lastName": row[3],
                "department": row[4],
                "designation": row[5] or "",
            }
            for row in rows
        ]

    def _apply_role_scope_filter(
        self,
        query,
        user_roles: List[str],
        user_employee_id: Optional[UUID],
        user_department_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ):
        """
        Apply role-based scope filtering to a complaint query.
        Visibility rules:
          - Super Admin, HR Admin, Manager: see ALL complaints
          - Department Head: see complaints in own department
          - Employee: see only assigned to them OR created by them
        """
        privileged_roles = {"SUPER_ADMIN", "HR_ADMIN", "MANAGER"}
        if set(user_roles) & privileged_roles:
            return query  # See all

        if "DEPARTMENT_HEAD" in user_roles and user_department_id:
            return query.where(
                Complaint.owner_employee_id.in_(
                    select(text("id")).select_from(text("employees")).where(
                        text(f"department_id = '{user_department_id}'")
                    )
                )
            )

        # Employee — only complaints assigned to them OR created by them
        conditions = []
        if user_employee_id:
            conditions.append(Complaint.owner_employee_id == user_employee_id)
        if user_id:
            conditions.append(Complaint.created_by == user_id)
        if conditions:
            return query.where(or_(*conditions))
        return query.where(Complaint.id == None)  # No results if no identity

    async def get_dashboard_stats_scoped(
        self,
        tenant_id: UUID,
        user_roles: List[str],
        user_employee_id: Optional[UUID],
        user_department_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> dict:
        """Get dashboard statistics with role-based scoping."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        open_statuses = [
            COMPLAINT_STATUS_NEW, COMPLAINT_STATUS_ASSIGNED, COMPLAINT_STATUS_REOPENED
        ]
        working_statuses = [
            COMPLAINT_STATUS_IN_PROGRESS, COMPLAINT_STATUS_WAITING_INFO
        ]
        all_open_statuses = open_statuses + working_statuses

        base_filter = and_(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False
        )

        # Build role-scoped base queries
        async def _count(extra_filter):
            q = select(func.count()).select_from(Complaint).where(base_filter, extra_filter)
            q = self._apply_role_scope_filter(q, user_roles, user_employee_id, user_department_id, user_id)
            result = await self.db.execute(q)
            return result.scalar() or 0

        open_count = await _count(Complaint.status.in_(open_statuses))
        working_count = await _count(Complaint.status.in_(working_statuses))
        overdue_count = await _count(
            and_(
                Complaint.status.in_(all_open_statuses),
                Complaint.sla_resolution_due_at < now,
                Complaint.resolved_at.is_(None)
            )
        )
        resolved_today_count = await _count(
            and_(
                Complaint.status.in_([COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED]),
                Complaint.resolved_at >= today_start
            )
        )

        return {
            "openCount": open_count,
            "workingCount": working_count,
            "overdueCount": overdue_count,
            "resolvedTodayCount": resolved_today_count,
        }

    # =========================================================================
    # Auto-Escalation Logic
    # =========================================================================

    async def run_auto_escalation(self, tenant_id: UUID, system_user_id: UUID) -> int:
        """
        Run automatic escalation for all overdue complaints.
        Returns the number of complaints escalated.

        Escalation levels:
          Level 1 — Overdue (past expected closure / SLA resolution)
          Level 2 — 2+ days overdue
          Level 3 — 5+ days overdue
        """
        now = datetime.utcnow()
        escalated_count = 0

        result = await self.db.execute(
            select(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                Complaint.status.notin_([COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED]),
                or_(
                    and_(
                        Complaint.sla_resolution_due_at.isnot(None),
                        Complaint.sla_resolution_due_at < now,
                    ),
                    and_(
                        Complaint.expected_closure_date.isnot(None),
                        Complaint.expected_closure_date < func.current_date(),
                    )
                )
            )
        )
        overdue_complaints = result.scalars().all()

        for complaint in overdue_complaints:
            # Determine overdue days based on whichever date is set
            due_date = None
            if complaint.sla_resolution_due_at:
                due_date = complaint.sla_resolution_due_at.replace(tzinfo=None)
            elif complaint.expected_closure_date:
                due_date = datetime.combine(complaint.expected_closure_date, datetime.min.time())

            if not due_date:
                continue

            overdue_days = (now - due_date).days

            # Determine new escalation level
            if overdue_days >= 5:
                new_level = 3
            elif overdue_days >= 2:
                new_level = 2
            elif overdue_days >= 0:
                new_level = 1
            else:
                continue

            # Only escalate if level increased
            if new_level > complaint.escalation_level:
                old_level = complaint.escalation_level
                complaint.escalation_level = new_level
                complaint.last_escalated_at = now
                complaint.updated_by = system_user_id

                action = ComplaintAction(
                    tenant_id=tenant_id,
                    complaint_id=complaint.id,
                    action_type=ACTION_ESCALATED,
                    description=f"Auto-escalated from level {old_level} to level {new_level} ({overdue_days} days overdue)",
                    old_status=complaint.status,
                    new_status=complaint.status,
                    performed_by=system_user_id,
                )
                self.db.add(action)
                escalated_count += 1

        if escalated_count > 0:
            await self.db.commit()

        return escalated_count

    # =========================================================================
    # Enhanced Report Methods
    # =========================================================================

    async def get_department_report(
        self,
        tenant_id: UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[dict]:
        """Generate department-wise complaint report."""
        query = text("""
            SELECT
                d.name AS department_name,
                d.id AS department_id,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE c.status IN ('RESOLVED', 'CLOSED')) AS resolved,
                COUNT(*) FILTER (WHERE c.status NOT IN ('RESOLVED', 'CLOSED')
                    AND c.sla_resolution_due_at < NOW()) AS overdue,
                AVG(c.closure_tat_hours) FILTER (WHERE c.closure_tat_hours IS NOT NULL) AS avg_tat_hours
            FROM complaints c
            JOIN employees e ON e.id = c.owner_employee_id
            JOIN departments d ON d.id = e.department_id
            WHERE c.tenant_id = :tenant_id
              AND c.is_deleted = FALSE
              AND (:from_date IS NULL OR c.created_at >= :from_date)
              AND (:to_date IS NULL OR c.created_at <= :to_date)
            GROUP BY d.id, d.name
            ORDER BY total DESC
        """)
        result = await self.db.execute(
            query, {"tenant_id": tenant_id, "from_date": from_date, "to_date": to_date}
        )
        rows = result.fetchall()
        return [
            {
                "departmentName": row[0],
                "departmentId": str(row[1]),
                "total": row[2],
                "resolved": row[3],
                "overdue": row[4],
                "avgTatHours": round(float(row[5]), 2) if row[5] else None,
            }
            for row in rows
        ]

    async def get_severity_report(
        self,
        tenant_id: UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[dict]:
        """Generate severity-wise complaint report."""
        query = select(
            Complaint.severity,
            func.count().label("total"),
            func.count().filter(
                Complaint.status.in_([COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED])
            ).label("resolved"),
            func.count().filter(
                Complaint.escalation_level > 0
            ).label("escalated"),
            func.avg(Complaint.closure_tat_hours).filter(
                Complaint.closure_tat_hours.isnot(None)
            ).label("avg_tat_hours"),
        ).where(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False,
        ).group_by(Complaint.severity)

        if from_date:
            query = query.where(Complaint.created_at >= from_date)
        if to_date:
            query = query.where(Complaint.created_at <= to_date)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "severity": row[0],
                "total": row[1],
                "resolved": row[2],
                "escalated": row[3],
                "avgTatHours": round(float(row[4]), 2) if row[4] else None,
            }
            for row in rows
        ]

    async def get_escalation_report(
        self,
        tenant_id: UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[dict]:
        """Generate escalation report for escalated complaints."""
        now = datetime.utcnow()

        query = select(Complaint).where(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False,
            Complaint.escalation_level > 0,
        )

        if from_date:
            query = query.where(Complaint.created_at >= from_date)
        if to_date:
            query = query.where(Complaint.created_at <= to_date)

        query = query.order_by(Complaint.escalation_level.desc(), Complaint.last_escalated_at.desc())

        result = await self.db.execute(query)
        complaints = result.scalars().all()

        items = []
        for c in complaints:
            due = c.sla_resolution_due_at or (
                datetime.combine(c.expected_closure_date, datetime.min.time())
                if c.expected_closure_date else None
            )
            overdue_days = (now - due.replace(tzinfo=None)).days if due else 0

            items.append({
                "complaintNumber": c.complaint_number,
                "title": c.title,
                "severity": c.severity,
                "status": c.status,
                "escalationLevel": c.escalation_level,
                "lastEscalatedAt": c.last_escalated_at.isoformat() if c.last_escalated_at else None,
                "overdueDays": overdue_days,
                "ownerEmployeeId": str(c.owner_employee_id) if c.owner_employee_id else None,
                "createdAt": c.created_at.isoformat(),
            })

        return items

    async def get_daily_report(
        self,
        tenant_id: UUID,
        report_date: Optional[datetime] = None,
    ) -> List[dict]:
        """Generate daily complaint report."""
        target_date = report_date or datetime.utcnow()
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start.replace(hour=23, minute=59, second=59)

        result = await self.db.execute(
            select(Complaint).where(
                Complaint.tenant_id == tenant_id,
                Complaint.is_deleted == False,
                or_(
                    and_(Complaint.created_at >= day_start, Complaint.created_at <= day_end),
                    and_(Complaint.updated_at >= day_start, Complaint.updated_at <= day_end),
                )
            ).order_by(Complaint.created_at.desc())
        )
        complaints = result.scalars().all()

        return [
            {
                "complaintNumber": c.complaint_number,
                "title": c.title,
                "severity": c.severity,
                "status": c.status,
                "displayStatus": c.display_status,
                "category": c.category.name if c.category else "Unknown",
                "complaintType": c.complaint_type,
                "closureTatDays": c.closure_tat_days,
                "escalatedYN": c.escalated_yn,
                "escalationLevel": c.escalation_level,
                "ownerEmployeeId": str(c.owner_employee_id) if c.owner_employee_id else None,
                "categoryName": c.category.name if c.category else "Unknown",
                "createdAt": c.created_at.isoformat(),
                "updatedAt": c.updated_at.isoformat(),
            }
            for c in complaints
        ]

    async def get_monthly_summary(
        self,
        tenant_id: UUID,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> dict:
        """Generate monthly complaint summary."""
        now = datetime.utcnow()
        if not from_date:
            from_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if not to_date:
            to_date = now

        base_where = and_(
            Complaint.tenant_id == tenant_id,
            Complaint.is_deleted == False,
            Complaint.created_at >= from_date,
            Complaint.created_at <= to_date,
        )

        # Total received
        r = await self.db.execute(
            select(func.count()).select_from(Complaint).where(base_where)
        )
        total_received = r.scalar() or 0

        # Resolved
        r = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                base_where,
                Complaint.status.in_([COMPLAINT_STATUS_RESOLVED, COMPLAINT_STATUS_CLOSED])
            )
        )
        total_resolved = r.scalar() or 0

        # Pending (not resolved/closed)
        total_pending = total_received - total_resolved

        # Average closure TAT
        r = await self.db.execute(
            select(func.avg(Complaint.closure_tat_hours)).where(
                base_where,
                Complaint.closure_tat_hours.isnot(None)
            )
        )
        avg_tat = r.scalar()

        # Escalation rate
        r = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                base_where,
                Complaint.escalation_level > 0
            )
        )
        escalated_count = r.scalar() or 0
        escalation_rate = round((escalated_count / total_received * 100), 2) if total_received > 0 else 0

        return {
            "period": {
                "from": from_date.isoformat(),
                "to": to_date.isoformat(),
            },
            "totalReceived": total_received,
            "totalResolved": total_resolved,
            "totalPending": total_pending,
            "avgClosureTatHours": round(float(avg_tat), 2) if avg_tat else None,
            "escalationRate": escalation_rate,
            "escalatedCount": escalated_count,
        }
