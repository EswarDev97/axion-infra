"""
MindFlow Auth Service - User Management Business Logic
Per API_CONTRACT.md Section 8.1.2
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.exceptions import (
    ResourceAlreadyExistsException,
    ResourceNotFoundException,
    ValidationException,
)
from shared.schemas import PaginationParams
from shared.security import hash_password, validate_password_strength

from ..models import Role, User, UserTenantRole


class UserService:
    """User management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_user(
        self,
        tenant_id: UUID,
        email: str,
        password: str,
        roles: List[str],
        created_by: UUID,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None
    ) -> User:
        """
        Create a new user.

        Args:
            tenant_id: Tenant ID
            email: User email
            password: Plain text password
            roles: List of role codes to assign
            created_by: User ID of creator
            first_name: Optional first name
            last_name: Optional last name

        Returns:
            Created User object

        Raises:
            ResourceAlreadyExistsException: Email already exists in tenant
            ValidationException: Password validation failed
        """
        # Validate password
        is_valid, errors = validate_password_strength(password)
        if not is_valid:
            raise ValidationException(
                message="Password validation failed",
                details=[{"field": "password", "message": err, "code": "VALIDATION_ERROR"} for err in errors]
            )

        # Check if email exists in tenant
        stmt = select(User).where(
            User.tenant_id == tenant_id,
            User.email.ilike(email),
            User.is_deleted == False
        )
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            raise ResourceAlreadyExistsException("User", email)

        # Create user
        user = User(
            tenant_id=tenant_id,
            email=email.lower(),
            password_hash=hash_password(password),
            is_active=True,
            created_by=created_by,
            updated_by=created_by
        )
        self.db.add(user)
        await self.db.flush()

        # Assign roles
        if roles:
            await self._assign_roles(user.id, tenant_id, roles, created_by)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_user(self, user_id: UUID, tenant_id: Optional[UUID] = None) -> User:
        """
        Get user by ID.

        Args:
            user_id: User ID
            tenant_id: Optional tenant ID for scoping

        Returns:
            User object

        Raises:
            ResourceNotFoundException: User not found
        """
        stmt = select(User).where(
            User.id == user_id,
            User.is_deleted == False
        ).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )

        if tenant_id:
            stmt = stmt.where(User.tenant_id == tenant_id)

        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise ResourceNotFoundException("User", str(user_id))

        return user

    async def list_users(
        self,
        tenant_id: UUID,
        pagination: PaginationParams
    ) -> Tuple[List[User], int]:
        """
        List users with pagination.

        Args:
            tenant_id: Tenant ID
            pagination: Pagination parameters

        Returns:
            Tuple of (users, total_count)
        """
        # Base query
        base_query = select(User).where(
            User.tenant_id == tenant_id,
            User.is_deleted == False
        )

        # Count query
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginated query
        stmt = base_query.options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        ).offset(pagination.offset).limit(pagination.page_size)

        # Apply sorting
        if hasattr(User, pagination.sort_by):
            order_col = getattr(User, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())

        result = await self.db.execute(stmt)
        users = list(result.scalars().all())

        return users, total

    async def update_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        email: Optional[str] = None,
        is_active: Optional[bool] = None,
        roles: Optional[List[str]] = None
    ) -> User:
        """
        Update user.

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            updated_by: User ID of updater
            email: New email
            is_active: New active status
            roles: New role assignments

        Returns:
            Updated User object

        Raises:
            ResourceNotFoundException: User not found
            ResourceAlreadyExistsException: Email already exists
        """
        user = await self.get_user(user_id, tenant_id)

        if email and email.lower() != user.email.lower():
            # Check if new email exists
            stmt = select(User).where(
                User.tenant_id == tenant_id,
                User.email.ilike(email),
                User.is_deleted == False,
                User.id != user_id
            )
            result = await self.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ResourceAlreadyExistsException("User", email)
            user.email = email.lower()

        if is_active is not None:
            user.is_active = is_active

        user.updated_by = updated_by
        user.updated_at = datetime.now(timezone.utc)

        if roles is not None:
            # Remove existing roles
            for user_role in user.roles:
                user_role.revoked_at = datetime.now(timezone.utc)
                user_role.revoked_by = updated_by

            # Assign new roles
            await self._assign_roles(user.id, tenant_id, roles, updated_by)

        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
        reason: Optional[str] = None
    ) -> None:
        """
        Soft delete user (per DATABASE_SCHEMA.md - PII entity).

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            deleted_by: User ID performing deletion
            reason: Optional deletion reason

        Raises:
            ResourceNotFoundException: User not found
        """
        user = await self.get_user(user_id, tenant_id)

        user.is_deleted = True
        user.deleted_at = datetime.now(timezone.utc)
        user.deletion_reason = reason
        user.updated_by = deleted_by
        user.updated_at = datetime.now(timezone.utc)

        await self.db.commit()

    async def activate_user(self, user_id: UUID, tenant_id: UUID, updated_by: UUID) -> User:
        """Reactivate a deactivated user."""
        user = await self.get_user(user_id, tenant_id)
        user.is_active = True
        user.updated_by = updated_by
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def unlock_user(self, user_id: UUID, tenant_id: UUID, updated_by: UUID) -> User:
        """Unlock a locked user account."""
        user = await self.get_user(user_id, tenant_id)
        user.is_locked = False
        user.locked_at = None
        user.locked_reason = None
        user.failed_login_attempts = 0
        user.updated_by = updated_by
        await self.db.commit()

        # Re-fetch with eager-loaded relationships to avoid lazy loading issues
        stmt = select(User).where(User.id == user.id).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def _assign_roles(
        self,
        user_id: UUID,
        tenant_id: UUID,
        role_codes: List[str],
        assigned_by: UUID
    ) -> None:
        """Assign roles to user."""
        for code in role_codes:
            # Find role
            stmt = select(Role).where(
                Role.tenant_id == tenant_id,
                Role.code == code
            )
            result = await self.db.execute(stmt)
            role = result.scalar_one_or_none()

            if role:
                # Check if assignment exists
                stmt = select(UserTenantRole).where(
                    UserTenantRole.tenant_id == tenant_id,
                    UserTenantRole.user_id == user_id,
                    UserTenantRole.role_id == role.id
                )
                result = await self.db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing and existing.revoked_at:
                    # Reactivate
                    existing.revoked_at = None
                    existing.revoked_by = None
                elif not existing:
                    # Create new assignment
                    user_role = UserTenantRole(
                        tenant_id=tenant_id,
                        user_id=user_id,
                        role_id=role.id,
                        assigned_by=assigned_by
                    )
                    self.db.add(user_role)
