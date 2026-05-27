"""
MindFlow HR Service - CRM Lead Service
Business logic for crm_leads and crm_lead_contacts.
"""

import math
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.crm_lead import CrmLead, CrmLeadContact, DiscussionSummary, InterestLevel
from ..schemas.crm_lead import CrmLeadCreateRequest, CrmLeadUpdateRequest


class CrmLeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 20,
        interest_level: Optional[InterestLevel] = None,
        search: Optional[str] = None,
        overdue_only: bool = False,
    ):
        from datetime import date

        query = (
            select(CrmLead)
            .where(CrmLead.tenant_id == tenant_id)
            .options(selectinload(CrmLead.contacts))
            .order_by(CrmLead.next_followup_date.asc().nulls_last(), CrmLead.created_at.desc())
        )

        if interest_level:
            query = query.where(CrmLead.interest_level == interest_level)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                CrmLead.operating_office_name.ilike(pattern)
                | CrmLead.location.ilike(pattern)
            )
        if overdue_only:
            query = query.where(
                (CrmLead.next_followup_date != None) & (CrmLead.next_followup_date <= date.today())
            )

        total_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(total_query)
        total = total_result.scalar_one()

        offset = (page - 1) * page_size
        result = await self.db.execute(query.offset(offset).limit(page_size))
        leads = result.scalars().all()

        total_pages = math.ceil(total / page_size) if total else 0
        return leads, total, total_pages

    async def get_by_id(self, lead_id: UUID, tenant_id: UUID) -> Optional[CrmLead]:
        result = await self.db.execute(
            select(CrmLead)
            .where(CrmLead.id == lead_id, CrmLead.tenant_id == tenant_id)
            .options(selectinload(CrmLead.contacts))
        )
        return result.scalar_one_or_none()

    async def create(self, data: CrmLeadCreateRequest, tenant_id: UUID, user_id: UUID) -> CrmLead:
        lead = CrmLead(
            tenant_id=tenant_id,
            operating_office_name=data.operatingOfficeName,
            location=data.location,
            date_contacted=data.dateContacted,
            discussion_summary=data.discussionSummary,
            interest_level=data.interestLevel,
            demo_required=data.demoRequired,
            training_completed=data.trainingCompleted,
            next_followup_date=data.nextFollowupDate,
            remarks=data.remarks,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(lead)
        await self.db.flush()

        for c in data.contacts:
            contact = CrmLeadContact(
                lead_id=lead.id,
                name=c.name,
                designation=c.designation,
                mobile=c.mobile,
                email=c.email,
            )
            self.db.add(contact)

        await self.db.commit()
        await self.db.refresh(lead)

        result = await self.db.execute(
            select(CrmLead)
            .where(CrmLead.id == lead.id)
            .options(selectinload(CrmLead.contacts))
        )
        return result.scalar_one()

    async def update(
        self, lead: CrmLead, data: CrmLeadUpdateRequest, user_id: UUID
    ) -> CrmLead:
        if data.operatingOfficeName is not None:
            lead.operating_office_name = data.operatingOfficeName
        if data.location is not None:
            lead.location = data.location
        if data.dateContacted is not None:
            lead.date_contacted = data.dateContacted
        if data.discussionSummary is not None:
            lead.discussion_summary = data.discussionSummary
        if data.interestLevel is not None:
            lead.interest_level = data.interestLevel
        if data.demoRequired is not None:
            lead.demo_required = data.demoRequired
        if data.trainingCompleted is not None:
            lead.training_completed = data.trainingCompleted
        if data.nextFollowupDate is not None:
            lead.next_followup_date = data.nextFollowupDate
        if data.remarks is not None:
            lead.remarks = data.remarks
        lead.updated_by = user_id

        if data.contacts is not None:
            # Replace all contacts
            await self.db.execute(
                CrmLeadContact.__table__.delete().where(CrmLeadContact.lead_id == lead.id)
            )
            for c in data.contacts:
                contact = CrmLeadContact(
                    lead_id=lead.id,
                    name=c.name,
                    designation=c.designation,
                    mobile=c.mobile,
                    email=c.email,
                )
                self.db.add(contact)

        await self.db.commit()

        result = await self.db.execute(
            select(CrmLead)
            .where(CrmLead.id == lead.id)
            .options(selectinload(CrmLead.contacts))
        )
        return result.scalar_one()

    async def delete(self, lead: CrmLead) -> None:
        await self.db.delete(lead)
        await self.db.commit()
