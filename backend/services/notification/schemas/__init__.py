"""
MindFlow Notification Service - Pydantic Schemas
Per API_CONTRACT.md Section 8.9
"""

from .notification import (
    NotificationCreateRequest,
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from .preference import (
    PreferenceUpdateRequest,
    PreferenceResponse,
    PreferenceListResponse,
)

__all__ = [
    # Notification
    "NotificationCreateRequest",
    "NotificationResponse",
    "NotificationListResponse",
    "UnreadCountResponse",
    # Preference
    "PreferenceUpdateRequest",
    "PreferenceResponse",
    "PreferenceListResponse",
]
