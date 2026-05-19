"""
MindFlow Auth Service - Authentication Business Logic
Per API_CONTRACT.md and SECURITY_ARCHITECTURE.md

Implements:
- Login with account lockout
- Token refresh with rotation
- Password reset flow
- Session management
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.config import get_settings
from shared.exceptions import (
    AuthAccountInactiveException,
    AuthAccountLockedException,
    AuthCredentialsInvalidException,
    AuthRefreshInvalidException,
    ResourceNotFoundException,
)
from shared.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    validate_password_strength,
    verify_password,
)

from ..models import Session, User, UserTenantRole


class AuthService:
    """Authentication service handling login, logout, token operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    async def authenticate(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[str, str, User, List[str], List[str]]:
        """
        Authenticate user with email and password.

        Per SECURITY_ARCHITECTURE.md:
        - Account lockout after 5 failed attempts (configurable)
        - Account lockout duration: 30 minutes (configurable)

        Returns:
            Tuple of (access_token, refresh_token, user, roles, permissions)

        Raises:
            AuthCredentialsInvalidException: Invalid email or password
            AuthAccountLockedException: Account locked due to failed attempts
            AuthAccountInactiveException: Account is deactivated or deleted
        """
        # Find user by email (case-insensitive)
        stmt = select(User).where(
            User.email.ilike(email),
            User.is_deleted == False
        ).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise AuthCredentialsInvalidException()

        # Check if account is locked
        if user.is_locked:
            # Check if lockout period has expired
            if user.locked_at:
                lockout_duration = timedelta(minutes=self.settings.account_lockout_minutes)
                if datetime.now(timezone.utc) > user.locked_at.replace(tzinfo=timezone.utc) + lockout_duration:
                    # Auto-unlock
                    user.is_locked = False
                    user.locked_at = None
                    user.locked_reason = None
                    user.failed_login_attempts = 0
                else:
                    raise AuthAccountLockedException()
            else:
                raise AuthAccountLockedException()

        # Check if account is active
        if not user.is_active:
            raise AuthAccountInactiveException()

        # Verify password
        if not verify_password(password, user.password_hash):
            # Increment failed attempts
            user.failed_login_attempts += 1

            # Lock account if threshold reached
            if user.failed_login_attempts >= self.settings.max_login_attempts:
                user.is_locked = True
                user.locked_at = datetime.now(timezone.utc)
                user.locked_reason = f"Locked after {user.failed_login_attempts} failed login attempts"
                await self.db.commit()
                raise AuthAccountLockedException()

            await self.db.commit()
            raise AuthCredentialsInvalidException()

        # Successful login - reset failed attempts
        user.failed_login_attempts = 0
        user.last_login_at = datetime.now(timezone.utc)

        # Get user roles and permissions
        roles, permissions = await self._get_user_roles_permissions(user)

        # Create tokens
        access_token = create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            email=user.email,
            roles=roles,
            permissions=permissions
        )

        refresh_token, jti = create_refresh_token(
            user_id=user.id,
            tenant_id=user.tenant_id
        )

        # Create session record
        session = Session(
            tenant_id=user.tenant_id,
            user_id=user.id,
            refresh_token_jti=jti,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=self.settings.jwt_refresh_token_expire_days)
        )
        self.db.add(session)
        await self.db.commit()

        return access_token, refresh_token, user, roles, permissions

    async def refresh_tokens(
        self,
        refresh_token: str
    ) -> Tuple[str, str, int]:
        """
        Refresh access token using refresh token.

        Per API_CONTRACT.md Section 2.3:
        - Validates refresh token
        - Issues new access + refresh tokens
        - Old refresh token is revoked (rotation)

        Returns:
            Tuple of (new_access_token, new_refresh_token, expires_in)

        Raises:
            AuthRefreshInvalidException: Invalid or revoked refresh token
        """
        try:
            payload = decode_refresh_token(refresh_token)
        except Exception:
            raise AuthRefreshInvalidException()

        jti = UUID(payload["jti"])
        user_id = UUID(payload["user_id"])

        # Find the session
        stmt = select(Session).where(
            Session.refresh_token_jti == jti,
            Session.is_revoked == False
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session or not session.is_valid:
            raise AuthRefreshInvalidException()

        # Get the user
        stmt = select(User).where(
            User.id == user_id,
            User.is_deleted == False,
            User.is_active == True
        ).options(
            selectinload(User.roles).selectinload(UserTenantRole.role)
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise AuthRefreshInvalidException()

        # Revoke old session
        session.is_revoked = True
        session.revoked_at = datetime.now(timezone.utc)
        session.revoked_reason = "Token refresh"

        # Get user roles and permissions
        roles, permissions = await self._get_user_roles_permissions(user)

        # Create new tokens
        new_access_token = create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            email=user.email,
            roles=roles,
            permissions=permissions
        )

        new_refresh_token, new_jti = create_refresh_token(
            user_id=user.id,
            tenant_id=user.tenant_id
        )

        # Create new session
        new_session = Session(
            tenant_id=user.tenant_id,
            user_id=user.id,
            refresh_token_jti=new_jti,
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=self.settings.jwt_refresh_token_expire_days)
        )
        self.db.add(new_session)
        await self.db.commit()

        expires_in = self.settings.jwt_access_token_expire_minutes * 60

        return new_access_token, new_refresh_token, expires_in

    async def logout(self, user_id: UUID, jti: str) -> None:
        """
        Logout user by revoking current session.

        Args:
            user_id: User ID from JWT
            jti: Token ID from JWT
        """
        # Find and revoke session
        stmt = select(Session).where(
            Session.user_id == user_id,
            Session.is_revoked == False
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        # Revoke the current session (matched by recent activity)
        for session in sessions:
            session.is_revoked = True
            session.revoked_at = datetime.now(timezone.utc)
            session.revoked_reason = "User logout"

        await self.db.commit()

    async def logout_all_sessions(self, user_id: UUID, except_jti: Optional[str] = None) -> int:
        """
        Logout all sessions for a user, optionally except current session.

        Returns:
            Number of sessions revoked
        """
        stmt = select(Session).where(
            Session.user_id == user_id,
            Session.is_revoked == False
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        revoked_count = 0
        for session in sessions:
            if except_jti and str(session.refresh_token_jti) == except_jti:
                continue
            session.is_revoked = True
            session.revoked_at = datetime.now(timezone.utc)
            session.revoked_reason = "Logout all sessions"
            revoked_count += 1

        await self.db.commit()
        return revoked_count

    async def _get_user_roles_permissions(self, user: User) -> Tuple[List[str], List[str]]:
        """Get user's active roles and aggregated permissions."""
        roles = []
        permissions = set()

        for user_role in user.roles:
            if user_role.is_active and user_role.role:
                roles.append(user_role.role.code)
                for rp in user_role.role.role_permissions:
                    if rp.permission:
                        permissions.add(rp.permission.code)

        return roles, list(permissions)
