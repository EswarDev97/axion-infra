"""
MindFlow Auth Service - Role Management Business Logic
Per API_CONTRACT.md Section 8.1.3
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    BusinessRuleViolationException,
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
)
from shared.schemas import PaginationParams

from ..models import Permission, Role, RolePermission


class RoleService:
    """Role management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_role(
        self,
        tenant_id: UUID,
        code: str,
        name: str,
        created_by: UUID,
        description: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> Role:
        """
        Create a new role.

        Args:
            tenant_id: Tenant ID
            code: Role code (unique within tenant)
            name: Role display name
            created_by: User ID of creator
            description: Optional description
            permissions: List of permission codes to assign

        Returns:
            Created Role object

        Raises:
            ResourceAlreadyExistsException: Role code already exists
        """
        # Check if code exists in tenant
        stmt = select(Role).where(
            Role.tenant_id == tenant_id,
            Role.code == code
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise ResourceAlreadyExistsException("Role", code)

        # Create role
        role = Role(
            tenant_id=tenant_id,
            code=code,
            name=name,
            description=description,
            is_system_role=False,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(role)
        await self.db.flush()

        # Assign permissions
        if permissions:
            await self._assign_permissions(role.id, tenant_id, permissions, created_by)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Role).where(Role.id == role.id).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_role(self, role_id: UUID, tenant_id: UUID) -> Role:
        """
        Get role by ID.

        Args:
            role_id: Role ID
            tenant_id: Tenant ID

        Returns:
            Role object

        Raises:
            ResourceNotFoundException: Role not found
        """
        stmt = select(Role).where(
            Role.id == role_id,
            Role.tenant_id == tenant_id
        ).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )

        result = await self.db.execute(stmt)
        role = result.scalar_one_or_none()

        if not role:
            raise ResourceNotFoundException("Role", str(role_id))

        return role

    async def list_roles(
        self,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[Role], int]:
        """
        List roles with pagination.

        Args:
            tenant_id: Tenant ID
            pagination: Pagination parameters

        Returns:
            Tuple of (roles, total_count)
        """
        # Base query
        base_query = select(Role).where(Role.tenant_id == tenant_id)

        # Count query
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginated query
        stmt = base_query.options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).offset(pagination.offset).limit(pagination.page_size)

        # Apply sorting
        if hasattr(Role, pagination.sort_by):
            order_col = getattr(Role, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        roles = list(result.scalars().all())

        return roles, total

    async def update_role(
        self,
        role_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> Role:
        """
        Update role.

        Args:
            role_id: Role ID
            tenant_id: Tenant ID
            updated_by: User ID of updater
            name: New name
            description: New description
            permissions: New permission assignments

        Returns:
            Updated Role object

        Raises:
            ResourceNotFoundException: Role not found
            BusinessRuleViolationException: Cannot modify system role
        """
        role = await self.get_role(role_id, tenant_id)

        if role.is_system_role:
            raise BusinessRuleViolationException("Cannot modify system role")

        if name:
            role.name = name
        if description is not None:
            role.description = description

        role.updated_by = updated_by
        role.updated_at = datetime.now(timezone.utc)

        if permissions is not None:
            # Remove existing permissions
            stmt = select(RolePermission).where(
                RolePermission.role_id == role_id,
                RolePermission.tenant_id == tenant_id
            )
            result = await self.db.execute(stmt)
            for rp in result.scalars().all():
                await self.db.delete(rp)

            # Assign new permissions
            await self._assign_permissions(role_id, tenant_id, permissions, updated_by)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(Role).where(Role.id == role.id).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_role(self, role_id: UUID, tenant_id: UUID) -> None:
        """
        Delete role.

        Args:
            role_id: Role ID
            tenant_id: Tenant ID

        Raises:
            ResourceNotFoundException: Role not found
            BusinessRuleViolationException: Cannot delete system role
        """
        role = await self.get_role(role_id, tenant_id)

        if role.is_system_role:
            raise BusinessRuleViolationException("Cannot delete system role")

        await self.db.delete(role)
        await self.db.commit()

    async def list_permissions(
        self,
        pagination: PaginationParams,
        module: Optional[str] = None
    ) -> Tuple[List[Permission], int]:
        """
        List all available permissions.

        Args:
            pagination: Pagination parameters
            module: Optional filter by module

        Returns:
            Tuple of (permissions, total_count)
        """
        # Base query
        base_query = select(Permission)
        if module:
            base_query = base_query.where(Permission.module == module)

        # Count query
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginated query
        stmt = base_query.offset(pagination.offset).limit(pagination.page_size)

        # Apply sorting
        if hasattr(Permission, pagination.sort_by):
            order_col = getattr(Permission, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        permissions = list(result.scalars().all())

        return permissions, total

    async def _assign_permissions(
        self,
        role_id: UUID,
        tenant_id: UUID,
        permission_codes: List[str],
        created_by: UUID
    ) -> None:
        """Assign permissions to role."""
        for code in permission_codes:
            # Find permission
            stmt = select(Permission).where(Permission.code == code)
            result = await self.db.execute(stmt)
            permission = result.scalar_one_or_none()

            if permission:
                role_permission = RolePermission(
                    tenant_id=tenant_id,
                    role_id=role_id,
                    permission_id=permission.id,
                    created_by=created_by
                )
                self.db.add(role_permission)
