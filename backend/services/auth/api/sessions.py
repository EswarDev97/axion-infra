"""
MindFlow Auth Service - Session Management Endpoints
Per API_CONTRACT.md Section 8.1.5

Endpoints:
- GET /sessions - List active sessions
- DELETE /sessions/{session_id} - Terminate specific session
- DELETE /sessions - Terminate all sessions except current
"""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header

from shared.database import db_manager
from shared.dependencies import (
    CurrentUser,
    get_current_user,
    get_pagination_params,
)
from shared.schemas import ApiResponse, PaginationMeta, PaginationParams

from ..schemas import SessionListResponse, SessionResponse
from ..services import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_to_response(session, current_jti: str = None) -> SessionResponse:
    """Convert Session model to SessionResponse schema."""
    return SessionResponse(
        id=session.id,
        deviceInfo=session.device_info,
        ipAddress=str(session.ip_address) if session.ip_address else None,
        userAgent=session.user_agent,
        createdAt=session.created_at,
        lastActivityAt=session.last_activity_at,
        expiresAt=session.expires_at,
        isCurrent=str(session.refresh_token_jti) == current_jti if current_jti else False
    )


@router.get("", response_model=ApiResponse[SessionListResponse])
async def list_sessions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    List active sessions.

    Requires: auth:read:own
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        session_service = SessionService(db)
        sessions, total = await session_service.list_user_sessions(
            user.user_id,
            pagination,
            active_only=True
        )

        items = [_session_to_response(s, user.jti) for s in sessions]
        total_pages = (total + pagination.page_size - 1) // pagination.page_size

        result = SessionListResponse(
            items=items,
            pagination=PaginationMeta(
                page=pagination.page,
                pageSize=pagination.page_size,
                totalItems=total,
                totalPages=total_pages,
                hasNext=pagination.page < total_pages,
                hasPrevious=pagination.page > 1
            )
        )

        return ApiResponse(
            success=True,
            data=result,
            message="Sessions retrieved successfully",
            requestId=request_id
        )


@router.delete("/{session_id}", response_model=ApiResponse[None])
async def terminate_session(
    session_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Terminate specific session.

    Requires: auth:update:own
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        session_service = SessionService(db)
        await session_service.terminate_session(
            session_id=session_id,
            user_id=user.user_id
        )

        return ApiResponse(
            success=True,
            message="Session terminated successfully",
            requestId=request_id
        )


@router.delete("", response_model=ApiResponse[dict])
async def terminate_all_sessions(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    x_request_id: Annotated[str | None, Header()] = None
):
    """
    Terminate all sessions except current.

    Requires: auth:update:own
    """
    request_id = UUID(x_request_id) if x_request_id else uuid4()

    async with db_manager.session(tenant_id=user.tenant_id) as db:
        session_service = SessionService(db)
        terminated_count = await session_service.terminate_all_sessions(
            user_id=user.user_id,
            except_session_id=None,  # TODO: Get current session ID from JWT jti
            reason="User terminated all sessions"
        )

        return ApiResponse(
            success=True,
            data={"terminatedCount": terminated_count},
            message=f"Terminated {terminated_count} sessions",
            requestId=request_id
        )
