"""
MindFlow Auth Service - Session Management Business Logic
Per API_CONTRACT.md Section 8.1.5
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.exceptions import ResourceNotFoundException
from shared.schemas import PaginationParams

from ..models import Session


class SessionService:
    """Session management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_session(self, session_id: UUID, user_id: UUID) -> Session:
        """
        Get session by ID.

        Args:
            session_id: Session ID
            user_id: User ID (for ownership validation)

        Returns:
            Session object

        Raises:
            ResourceNotFoundException: Session not found
        """
        stmt = select(Session).where(
            Session.id == session_id,
            Session.user_id == user_id
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundException("Session", str(session_id))

        return session

    async def list_user_sessions(
        self,
        user_id: UUID,
        pagination: PaginationParams,
        active_only: bool = True
    ) -> Tuple[List[Session], int]:
        """
        List user's sessions.

        Args:
            user_id: User ID
            pagination: Pagination parameters
            active_only: Only return active sessions

        Returns:
            Tuple of (sessions, total_count)
        """
        # Base query
        base_query = select(Session).where(Session.user_id == user_id)

        if active_only:
            base_query = base_query.where(
                Session.is_revoked == False,
                Session.expires_at > datetime.now(timezone.utc)
            )

        # Count query
        count_stmt = select(func.count()).select_from(base_query.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # Paginated query
        stmt = base_query.offset(pagination.offset).limit(pagination.page_size)

        # Apply sorting
        if hasattr(Session, pagination.sort_by):
            order_col = getattr(Session, pagination.sort_by)
            if pagination.sort_order == "desc":
                stmt = stmt.order_by(order_col.desc())
            else:
                stmt = stmt.order_by(order_col.asc())
        else:
            stmt = stmt.order_by(Session.created_at.desc())

        result = await self.db.execute(stmt)
        sessions = list(result.scalars().all())

        return sessions, total

    async def terminate_session(
        self,
        session_id: UUID,
        user_id: UUID,
        reason: str = "User terminated"
    ) -> None:
        """
        Terminate a specific session.

        Args:
            session_id: Session ID
            user_id: User ID
            reason: Termination reason

        Raises:
            ResourceNotFoundException: Session not found
        """
        session = await self.get_session(session_id, user_id)

        session.is_revoked = True
        session.revoked_at = datetime.now(timezone.utc)
        session.revoked_reason = reason

        await self.db.commit()

    async def terminate_all_sessions(
        self,
        user_id: UUID,
        except_session_id: Optional[UUID] = None,
        reason: str = "User terminated all sessions"
    ) -> int:
        """
        Terminate all sessions for a user.

        Args:
            user_id: User ID
            except_session_id: Session ID to exclude
            reason: Termination reason

        Returns:
            Number of sessions terminated
        """
        stmt = select(Session).where(
            Session.user_id == user_id,
            Session.is_revoked == False
        )
        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        terminated = 0
        for session in sessions:
            if except_session_id and session.id == except_session_id:
                continue
            session.is_revoked = True
            session.revoked_at = datetime.now(timezone.utc)
            session.revoked_reason = reason
            terminated += 1

        await self.db.commit()
        return terminated

    async def update_activity(self, session_id: UUID) -> None:
        """
        Update last activity timestamp for a session.

        Args:
            session_id: Session ID
        """
        stmt = select(Session).where(Session.id == session_id)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()

        if session and session.is_valid:
            session.last_activity_at = datetime.now(timezone.utc)
            await self.db.commit()
