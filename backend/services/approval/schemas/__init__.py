"""
MindFlow Approval Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.8
"""

from .workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowDetailResponse,
    WorkflowListResponse,
)
from .step import (
    StepCreateRequest,
    StepUpdateRequest,
    StepResponse,
    StepReorderRequest,
)
from .instance import (
    InstanceCreateRequest,
    InstanceResponse,
    InstanceDetailResponse,
    InstanceListResponse,
)
from .decision import (
    DecisionRequest,
    DelegateRequest,
    DecisionResponse,
)
from .delegation import (
    DelegationCreateRequest,
    DelegationUpdateRequest,
    DelegationResponse,
    DelegationListResponse,
)

__all__ = [
    # Workflow
    "WorkflowCreateRequest",
    "WorkflowUpdateRequest",
    "WorkflowResponse",
    "WorkflowDetailResponse",
    "WorkflowListResponse",
    # Step
    "StepCreateRequest",
    "StepUpdateRequest",
    "StepResponse",
    "StepReorderRequest",
    # Instance
    "InstanceCreateRequest",
    "InstanceResponse",
    "InstanceDetailResponse",
    "InstanceListResponse",
    # Decision
    "DecisionRequest",
    "DelegateRequest",
    "DecisionResponse",
    # Delegation
    "DelegationCreateRequest",
    "DelegationUpdateRequest",
    "DelegationResponse",
    "DelegationListResponse",
]
