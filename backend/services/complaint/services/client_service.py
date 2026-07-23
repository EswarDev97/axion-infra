"""
MindFlow Complaint Service - Client Service
CRUD operations for Insurer / Client master data.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.client import Client
from ..schemas.client import (
    ClientCreateRequest,
    ClientUpdateRequest,
    ClientResponse,
    ClientListResponse,
)


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: ClientCreateRequest, tenant_id: UUID, user_id: UUID) -> Client:
        client = Client(
            tenant_id=tenant_id,
            name=data.name,
            code=data.code,
            type=data.type.value,
            contact_person=data.contact_person,
            email=data.email,
            phone=data.phone,
            address=data.address,
            is_active=data.is_active,
            created_by=user_id,
            updated_by=user_id,
        )
        self.db.add(client)
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def get_by_id(self, client_id: UUID, tenant_id: UUID) -> Optional[Client]:
        result = await self.db.execute(
            select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(self, client: Client, data: ClientUpdateRequest, user_id: UUID) -> Client:
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        for field, value in update_data.items():
            setattr(client, field, value)
        client.updated_by = user_id
        await self.db.commit()
        await self.db.refresh(client)
        return client

    async def delete(self, client: Client) -> None:
        await self.db.delete(client)
        await self.db.commit()

    async def list(
        self,
        tenant_id: UUID,
        page: int = 1,
        limit: int = 50,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        type_filter: Optional[str] = None,
    ) -> ClientListResponse:
        query = select(Client).where(Client.tenant_id == tenant_id)

        if is_active is not None:
            query = query.where(Client.is_active == is_active)

        if type_filter:
            query = query.where(Client.type == type_filter)

        if search:
            term = f"%{search}%"
            query = query.where(Client.name.ilike(term) | Client.code.ilike(term))

        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        query = query.order_by(Client.name).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        clients = result.scalars().all()

        pages = (total + limit - 1) // limit if limit > 0 else 0

        return ClientListResponse(
            items=[ClientResponse.model_validate(c) for c in clients],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )
