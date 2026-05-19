"""
MindFlow Complaint Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.7
"""

from .category import (
    CategoryCreateRequest,
    CategoryUpdateRequest,
    CategoryResponse,
    CategoryListResponse,
)
from .sla_config import (
    SLAConfigCreateRequest,
    SLAConfigUpdateRequest,
    SLAConfigResponse,
    SLAConfigListResponse,
)
from .escalation_rule import (
    EscalationRuleCreateRequest,
    EscalationRuleUpdateRequest,
    EscalationRuleResponse,
    EscalationRuleListResponse,
)
from .complaint import (
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
from .action import (
    ActionCreateRequest,
    ActionResponse,
    ActionListResponse,
)
from .attachment import (
    AttachmentCreateRequest,
    AttachmentResponse,
    AttachmentListResponse,
)

__all__ = [
    # Category
    "CategoryCreateRequest",
    "CategoryUpdateRequest",
    "CategoryResponse",
    "CategoryListResponse",
    # SLA Config
    "SLAConfigCreateRequest",
    "SLAConfigUpdateRequest",
    "SLAConfigResponse",
    "SLAConfigListResponse",
    # Escalation Rule
    "EscalationRuleCreateRequest",
    "EscalationRuleUpdateRequest",
    "EscalationRuleResponse",
    "EscalationRuleListResponse",
    # Complaint
    "ComplaintCreateRequest",
    "ComplaintUpdateRequest",
    "ComplaintAssignRequest",
    "ComplaintEscalateRequest",
    "ComplaintResolveRequest",
    "ComplaintReopenRequest",
    "ComplaintResponse",
    "ComplaintDetailResponse",
    "ComplaintListResponse",
    "ComplaintFilters",
    # Action
    "ActionCreateRequest",
    "ActionResponse",
    "ActionListResponse",
    # Attachment
    "AttachmentCreateRequest",
    "AttachmentResponse",
    "AttachmentListResponse",
]
