"""
MindFlow Auth Service - API Routes
Per API_CONTRACT.md Section 8.1
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .roles import router as roles_router
from .sessions import router as sessions_router
from .tenants import router as tenants_router

# Main router for auth service
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Include sub-routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(roles_router)
router.include_router(sessions_router)
router.include_router(tenants_router)

__all__ = ["router"]
