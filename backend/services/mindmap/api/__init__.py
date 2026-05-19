"""
MindFlow Mind Map Service - API Routes
Per API_CONTRACT.md Section 3.6 (mindmap-module)
"""

from fastapi import APIRouter

from .templates import router as templates_router
from .mindmaps import router as mindmaps_router
from .nodes import router as nodes_router

router = APIRouter()

router.include_router(templates_router, prefix="/templates", tags=["Templates"])
router.include_router(mindmaps_router, prefix="/mindmaps", tags=["Mind Maps"])
router.include_router(nodes_router, prefix="/nodes", tags=["Nodes"])
