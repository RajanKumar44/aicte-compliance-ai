"""In-App Notification Center Router and Service.

Handles event delivery for:
- Corrective action assignment & reassignment
- Approaching deadline warnings
- Evidence submissions & reviews
- Revalidation results
- Regulatory change updates
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

NotificationCategory = Literal[
    "action_assignment",
    "deadline_warning",
    "evidence_submitted",
    "review_decision",
    "revalidation_result",
    "regulatory_update",
    "system",
]

_IN_MEMORY_NOTIFICATIONS: list[dict[str, Any]] = [
    {
        "id": "notif-01",
        "institution_id": "INST-DEMO",
        "user_id": "user-demo",
        "title": "Regulatory Amendment Confirmed",
        "message": "AICTE APH 2026-27 Annexure 5 confirmed: 1:20 UG Engineering FSR and Diploma cadre exemption active.",
        "category": "regulatory_update",
        "link_url": "/regulatory-impact",
        "is_read": False,
        "created_at": "2026-10-31T06:00:00Z",
    },
    {
        "id": "notif-02",
        "institution_id": "INST-DEMO",
        "user_id": "user-demo",
        "title": "Action Assigned: Fire Safety Renewal",
        "message": "Corrective action 'Fire Safety Certificate Renewal Challan' assigned to Civil/Admin department.",
        "category": "action_assignment",
        "link_url": "/action-planner",
        "is_read": False,
        "created_at": "2026-10-31T06:30:00Z",
    },
]


class NotificationCreateRequest(BaseModel):
    institution_id: str
    user_id: str | None = None
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=3, max_length=1000)
    category: NotificationCategory = "system"
    link_url: str | None = None


class NotificationResponse(BaseModel):
    id: str
    institution_id: str
    user_id: str
    title: str
    message: str
    category: NotificationCategory
    link_url: str | None
    is_read: bool
    created_at: str


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    institution_id: str | None = None,
    is_read: bool | None = None,
    limit: int = Query(default=25, ge=1, le=100),
) -> list[NotificationResponse]:
    """List in-app notifications for authenticated user/institution."""
    res = list(_IN_MEMORY_NOTIFICATIONS)
    if institution_id:
        res = [n for n in res if n["institution_id"] == institution_id]
    if is_read is not None:
        res = [n for n in res if n["is_read"] == is_read]
    limit_val = limit if isinstance(limit, int) else 25
    return [NotificationResponse(**n) for n in res[:limit_val]]


@router.post("", response_model=NotificationResponse, status_code=201)
async def create_notification(
    payload: NotificationCreateRequest,
) -> NotificationResponse:
    """Dispatch an event notification."""
    notif_id = f"notif-{uuid4().hex[:8]}"
    now_iso = datetime.now(UTC).isoformat()
    new_notif = {
        "id": notif_id,
        "institution_id": payload.institution_id,
        "user_id": payload.user_id or "user-default",
        "title": payload.title,
        "message": payload.message,
        "category": payload.category,
        "link_url": payload.link_url,
        "is_read": False,
        "created_at": now_iso,
    }
    _IN_MEMORY_NOTIFICATIONS.insert(0, new_notif)
    return NotificationResponse(**new_notif)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(notification_id: str) -> NotificationResponse:
    """Mark notification as read."""
    for n in _IN_MEMORY_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["is_read"] = True
            return NotificationResponse(**n)
    raise HTTPException(status_code=404, detail="Notification not found.")
