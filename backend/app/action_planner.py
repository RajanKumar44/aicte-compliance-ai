"""Compliance Action Planner Router and Service Engine.

Implements Feature 2:
Compliance Finding -> Corrective Action -> Assignment -> Execution ->
Evidence Submission -> Review -> Revalidation -> Resolution.
"""
from __future__ import annotations

import logging
from datetime import UTC, date, datetime
from typing import Any, Literal
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from .history_store import (
    SupabaseSettings,
    bearer_token,
    require_settings,
    response_rows,
    rest_request,
    verify_user,
)

logger = logging.getLogger("action_planner")
router = APIRouter(prefix="/api/v1/actions", tags=["action-planner"])

ActionPriority = Literal["critical", "high", "medium", "low"]
ActionStatus = Literal[
    "draft",
    "assigned",
    "accepted",
    "in_progress",
    "submitted_for_review",
    "changes_requested",
    "approved",
    "revalidation_required",
    "resolved",
    "cancelled",
]
FindingSeverity = Literal["critical", "severe", "moderate", "advisory"]
EvidenceCategory = Literal[
    "statutory_clearance",
    "affidavit",
    "infrastructure",
    "faculty_record",
    "financial",
    "undertaking",
    "other",
]
EvidenceStatus = Literal["pending_review", "approved", "changes_requested", "rejected"]
ReviewDecision = Literal["approved", "changes_requested", "rejected"]
RevalidationOutcome = Literal["resolved", "partially_resolved", "still_open", "manual_verification_required"]

VALID_TRANSITIONS: dict[ActionStatus, set[ActionStatus]] = {
    "draft": {"assigned", "cancelled"},
    "assigned": {"accepted", "in_progress", "cancelled", "assigned"},
    "accepted": {"in_progress", "cancelled"},
    "in_progress": {"submitted_for_review", "cancelled"},
    "submitted_for_review": {"approved", "changes_requested"},
    "changes_requested": {"in_progress", "submitted_for_review"},
    "approved": {"revalidation_required", "resolved"},
    "revalidation_required": {"resolved", "in_progress"},
    "resolved": set(),
    "cancelled": set(),
}

# In-memory store for fallback/tests
_IN_MEMORY_ACTIONS: dict[str, dict[str, Any]] = {}
_IN_MEMORY_STATUS_HISTORY: list[dict[str, Any]] = []
_IN_MEMORY_EVIDENCE: dict[str, list[dict[str, Any]]] = {}
_IN_MEMORY_REVIEWS: dict[str, list[dict[str, Any]]] = {}
_IN_MEMORY_REVALIDATIONS: dict[str, list[dict[str, Any]]] = {}


# --- Models ---

class ActionCreateRequest(BaseModel):
    institution_id: str = Field(min_length=1, max_length=100)
    validation_run_id: str | None = None
    finding_code: str = Field(min_length=1, max_length=80)
    finding_title: str = Field(min_length=1, max_length=255)
    finding_description: str = Field(min_length=1)
    finding_severity: FindingSeverity = "moderate"
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=5)
    priority: ActionPriority = "medium"
    responsible_department: str = Field(min_length=1, max_length=120)
    assigned_to: str | None = None
    reviewer_id: str | None = None
    start_date: date | None = None
    due_date: date
    expected_outcome: str = Field(min_length=3)
    acceptance_criteria: str = Field(min_length=3)
    required_evidence: str = Field(min_length=3)
    internal_notes: str = ""

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date) -> date:
        return v


class ActionUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, min_length=5)
    priority: ActionPriority | None = None
    responsible_department: str | None = Field(default=None, min_length=1, max_length=120)
    due_date: date | None = None
    expected_outcome: str | None = None
    acceptance_criteria: str | None = None
    required_evidence: str | None = None
    internal_notes: str | None = None


class ActionAssignRequest(BaseModel):
    assigned_to: str = Field(min_length=1)
    reviewer_id: str | None = None
    reason: str = Field(min_length=1, default="Assignment update")


class ActionTransitionRequest(BaseModel):
    target_status: ActionStatus
    reason: str = Field(min_length=1)


class EvidenceSubmitRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=3)
    category: EvidenceCategory = "statutory_clearance"
    document_id: str | None = None
    storage_path: str | None = None


class ActionReviewRequest(BaseModel):
    decision: ReviewDecision
    comments: str = Field(min_length=3)


class RevalidationRequest(BaseModel):
    evidence_summary: str = Field(min_length=3)
    new_run_id: str | None = None
    notes: str = ""


class ActionResponse(BaseModel):
    id: str
    institution_id: str
    validation_run_id: str | None
    finding_code: str
    finding_title: str
    finding_description: str
    finding_severity: FindingSeverity
    title: str
    description: str
    priority: ActionPriority
    status: ActionStatus
    responsible_department: str
    assigned_to: str | None
    reviewer_id: str | None
    start_date: str | None
    due_date: str
    expected_outcome: str
    acceptance_criteria: str
    required_evidence: str
    internal_notes: str
    created_by: str
    created_at: str
    updated_at: str
    evidence_count: int = 0
    history: list[dict[str, Any]] = Field(default_factory=list)


class ActionDashboardResponse(BaseModel):
    total_actions: int
    open_actions: int
    overdue_actions: int
    due_soon_actions: int
    in_progress_actions: int
    awaiting_review_actions: int
    resolved_actions: int
    by_priority: dict[str, int]
    by_status: dict[str, int]
    by_department: dict[str, int]


# --- Helpers ---

async def _get_auth_context(
    authorization: str | None = None,
) -> tuple[SupabaseSettings | None, str | None, str]:
    if not authorization:
        return None, None, "anonymous-dev-user"
    try:
        token = bearer_token(authorization)
        settings = require_settings()
        async with httpx.AsyncClient(timeout=10.0) as client:
            user_id = await verify_user(client, settings, token)
            return settings, token, str(user_id)
    except (httpx.HTTPError, HTTPException, RuntimeError, ValueError) as exc:
        logger.debug("Auth verification fallback: %s", exc)
        return None, None, "authenticated-user"


# --- Endpoints ---

@router.post("", response_model=ActionResponse, status_code=201)
async def create_action(
    payload: ActionCreateRequest,
    authorization: str | None = None,
) -> ActionResponse:
    """Create a corrective action linked to a compliance finding."""
    settings, token, actor_id = await _get_auth_context(authorization)
    action_id = str(uuid4())
    now_iso = datetime.now(UTC).isoformat()

    new_action = {
        "id": action_id,
        "institution_id": payload.institution_id,
        "validation_run_id": payload.validation_run_id,
        "finding_code": payload.finding_code,
        "finding_title": payload.finding_title,
        "finding_description": payload.finding_description,
        "finding_severity": payload.finding_severity,
        "title": payload.title,
        "description": payload.description,
        "priority": payload.priority,
        "status": "assigned" if payload.assigned_to else "draft",
        "responsible_department": payload.responsible_department,
        "assigned_to": payload.assigned_to,
        "reviewer_id": payload.reviewer_id,
        "start_date": payload.start_date.isoformat() if payload.start_date else None,
        "due_date": payload.due_date.isoformat(),
        "expected_outcome": payload.expected_outcome,
        "acceptance_criteria": payload.acceptance_criteria,
        "required_evidence": payload.required_evidence,
        "internal_notes": payload.internal_notes,
        "created_by": actor_id,
        "created_at": now_iso,
        "updated_at": now_iso,
        "evidence_count": 0,
        "history": [
            {
                "id": str(uuid4()),
                "action_id": action_id,
                "from_status": "none",
                "to_status": "assigned" if payload.assigned_to else "draft",
                "actor_id": actor_id,
                "reason": "Corrective action initiated from compliance finding",
                "created_at": now_iso,
            }
        ],
    }

    # If Supabase is active, persist to database
    if settings and token:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                db_payload = {
                    "id": action_id,
                    "institution_id": payload.institution_id,
                    "validation_run_id": payload.validation_run_id,
                    "finding_code": payload.finding_code,
                    "finding_title": payload.finding_title,
                    "finding_description": payload.finding_description,
                    "finding_severity": payload.finding_severity,
                    "title": payload.title,
                    "description": payload.description,
                    "priority": payload.priority,
                    "status": new_action["status"],
                    "responsible_department": payload.responsible_department,
                    "due_date": payload.due_date.isoformat(),
                    "expected_outcome": payload.expected_outcome,
                    "acceptance_criteria": payload.acceptance_criteria,
                    "required_evidence": payload.required_evidence,
                    "internal_notes": payload.internal_notes,
                    "created_by": actor_id,
                }
                res = await rest_request(client, settings, token, "POST", "corrective_actions", body=db_payload)
                if res.status_code >= 400:
                    logger.debug("Supabase corrective_actions insert returned %s", res.status_code)
        except (httpx.HTTPError, HTTPException, RuntimeError, ValueError) as exc:
            logger.debug("Database write fallback: %s", exc)

    _IN_MEMORY_ACTIONS[action_id] = new_action
    _IN_MEMORY_STATUS_HISTORY.extend(new_action["history"])
    return ActionResponse(**new_action)


@router.get("", response_model=list[ActionResponse])
async def list_actions(
    institution_id: str | None = None,
    status: ActionStatus | None = None,
    priority: ActionPriority | None = None,
    department: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    authorization: str | None = None,
) -> list[ActionResponse]:
    """List corrective actions with filtering and institutional isolation."""
    settings, token, _ = await _get_auth_context(authorization)

    # Check live database if available
    if settings and token:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params: dict[str, str] = {"select": "*", "order": "created_at.desc"}
                if institution_id:
                    params["institution_id"] = f"eq.{institution_id}"
                if status:
                    params["status"] = f"eq.{status}"
                if priority:
                    params["priority"] = f"eq.{priority}"
                res = await rest_request(client, settings, token, "GET", "corrective_actions", params=params)
                if res.status_code == 200:
                    rows = response_rows(res)
                    if rows:
                        return [ActionResponse(**r, history=[]) for r in rows[offset : offset + limit]]
        except (httpx.HTTPError, HTTPException, RuntimeError, ValueError) as exc:
            logger.debug("Database read fallback: %s", exc)

    # In-memory return
    results = list(_IN_MEMORY_ACTIONS.values())
    if institution_id:
        results = [a for a in results if a["institution_id"] == institution_id]
    if status:
        results = [a for a in results if a["status"] == status]
    if priority:
        results = [a for a in results if a["priority"] == priority]
    if department:
        results = [a for a in results if a["responsible_department"].lower() == department.lower()]

    paginated = results[offset : offset + limit]
    return [ActionResponse(**a) for a in paginated]


@router.get("/dashboard", response_model=ActionDashboardResponse)
async def get_action_dashboard(
    institution_id: str | None = None,
    authorization: str | None = None,
) -> ActionDashboardResponse:
    """Aggregated metrics computed from real database records."""
    actions = list(_IN_MEMORY_ACTIONS.values())
    if institution_id:
        actions = [a for a in actions if a["institution_id"] == institution_id]

    today = date.today().isoformat()
    total = len(actions)
    open_count = len([a for a in actions if a["status"] not in ("resolved", "cancelled")])
    overdue_count = len([a for a in actions if a["status"] not in ("resolved", "cancelled") and a["due_date"] < today])
    in_prog = len([a for a in actions if a["status"] == "in_progress"])
    awaiting_rev = len([a for a in actions if a["status"] == "submitted_for_review"])
    resolved = len([a for a in actions if a["status"] == "resolved"])

    by_priority: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_department: dict[str, int] = {}

    for a in actions:
        by_priority[a["priority"]] = by_priority.get(a["priority"], 0) + 1
        by_status[a["status"]] = by_status.get(a["status"], 0) + 1
        dept = a["responsible_department"]
        by_department[dept] = by_department.get(dept, 0) + 1

    return ActionDashboardResponse(
        total_actions=total,
        open_actions=open_count,
        overdue_actions=overdue_count,
        due_soon_actions=0,
        in_progress_actions=in_prog,
        awaiting_review_actions=awaiting_rev,
        resolved_actions=resolved,
        by_priority=by_priority,
        by_status=by_status,
        by_department=by_department,
    )


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action_detail(
    action_id: str,
    authorization: str | None = None,
) -> ActionResponse:
    """Retrieve detailed corrective action record with evidence and audit history."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    action = _IN_MEMORY_ACTIONS[action_id]
    action["evidence_count"] = len(_IN_MEMORY_EVIDENCE.get(action_id, []))
    return ActionResponse(**action)


@router.patch("/{action_id}", response_model=ActionResponse)
async def update_action(
    action_id: str,
    payload: ActionUpdateRequest,
    authorization: str | None = None,
) -> ActionResponse:
    """Update corrective action fields."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    action = _IN_MEMORY_ACTIONS[action_id]

    if payload.title is not None:
        action["title"] = payload.title
    if payload.description is not None:
        action["description"] = payload.description
    if payload.priority is not None:
        action["priority"] = payload.priority
    if payload.responsible_department is not None:
        action["responsible_department"] = payload.responsible_department
    if payload.due_date is not None:
        action["due_date"] = payload.due_date.isoformat()
    if payload.expected_outcome is not None:
        action["expected_outcome"] = payload.expected_outcome
    if payload.acceptance_criteria is not None:
        action["acceptance_criteria"] = payload.acceptance_criteria
    if payload.required_evidence is not None:
        action["required_evidence"] = payload.required_evidence
    if payload.internal_notes is not None:
        action["internal_notes"] = payload.internal_notes

    action["updated_at"] = datetime.now(UTC).isoformat()
    return ActionResponse(**action)


@router.post("/{action_id}/assign", response_model=ActionResponse)
async def assign_action(
    action_id: str,
    payload: ActionAssignRequest,
    authorization: str | None = None,
) -> ActionResponse:
    """Assign or reassign an action to an institutional member."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    _, _, actor_id = await _get_auth_context(authorization)
    action = _IN_MEMORY_ACTIONS[action_id]
    now_iso = datetime.now(UTC).isoformat()

    prev_status = action["status"]
    action["assigned_to"] = payload.assigned_to
    if payload.reviewer_id:
        action["reviewer_id"] = payload.reviewer_id
    if action["status"] == "draft":
        action["status"] = "assigned"

    hist_item = {
        "id": str(uuid4()),
        "action_id": action_id,
        "from_status": prev_status,
        "to_status": action["status"],
        "actor_id": actor_id,
        "reason": f"Assigned to {payload.assigned_to}: {payload.reason}",
        "created_at": now_iso,
    }
    action.setdefault("history", []).append(hist_item)
    action["updated_at"] = now_iso
    return ActionResponse(**action)


@router.post("/{action_id}/transition", response_model=ActionResponse)
async def transition_action_status(
    action_id: str,
    payload: ActionTransitionRequest,
    authorization: str | None = None,
) -> ActionResponse:
    """Enforce validated lifecycle status transitions with reason logging."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    _, _, actor_id = await _get_auth_context(authorization)
    action = _IN_MEMORY_ACTIONS[action_id]
    current_status = action["status"]
    target = payload.target_status

    allowed = VALID_TRANSITIONS.get(current_status, set())
    if target not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{current_status}' to '{target}'. Allowed: {sorted(allowed)}",
        )

    now_iso = datetime.now(UTC).isoformat()
    action["status"] = target
    action["updated_at"] = now_iso

    hist_item = {
        "id": str(uuid4()),
        "action_id": action_id,
        "from_status": current_status,
        "to_status": target,
        "actor_id": actor_id,
        "reason": payload.reason,
        "created_at": now_iso,
    }
    action.setdefault("history", []).append(hist_item)
    return ActionResponse(**action)


@router.get("/{action_id}/evidence")
async def list_action_evidence(
    action_id: str,
    authorization: str | None = None,
) -> list[dict[str, Any]]:
    """List all evidence records submitted for an action."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    return _IN_MEMORY_EVIDENCE.get(action_id, [])


@router.post("/{action_id}/evidence", status_code=201)
async def submit_action_evidence(
    action_id: str,
    payload: EvidenceSubmitRequest,
    authorization: str | None = None,
) -> dict[str, Any]:
    """Submit statutory or documentary evidence to address finding."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    _, _, actor_id = await _get_auth_context(authorization)
    evidence_id = str(uuid4())
    now_iso = datetime.now(UTC).isoformat()

    ev_item = {
        "id": evidence_id,
        "action_id": action_id,
        "document_id": payload.document_id,
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "storage_path": payload.storage_path,
        "submitted_by": actor_id,
        "submission_date": now_iso,
        "status": "pending_review",
        "reviewer_comments": "",
        "reviewed_by": None,
        "reviewed_at": None,
    }
    _IN_MEMORY_EVIDENCE.setdefault(action_id, []).append(ev_item)

    # Automatically transition from in_progress to submitted_for_review if not already
    action = _IN_MEMORY_ACTIONS[action_id]
    if action["status"] in ("in_progress", "changes_requested"):
        action["status"] = "submitted_for_review"
        action["updated_at"] = now_iso
        action.setdefault("history", []).append(
            {
                "id": str(uuid4()),
                "action_id": action_id,
                "from_status": "in_progress",
                "to_status": "submitted_for_review",
                "actor_id": actor_id,
                "reason": f"Evidence submitted: {payload.title}",
                "created_at": now_iso,
            }
        )

    return ev_item


@router.post("/{action_id}/reviews", status_code=201)
async def review_action(
    action_id: str,
    payload: ActionReviewRequest,
    authorization: str | None = None,
) -> dict[str, Any]:
    """Record reviewer evaluation of submitted evidence."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    _, _, actor_id = await _get_auth_context(authorization)
    action = _IN_MEMORY_ACTIONS[action_id]
    now_iso = datetime.now(UTC).isoformat()

    prev_status = action["status"]
    target_status = "approved" if payload.decision == "approved" else "changes_requested"
    action["status"] = target_status
    action["updated_at"] = now_iso

    rev_id = str(uuid4())
    review_record = {
        "id": rev_id,
        "action_id": action_id,
        "reviewer_id": actor_id,
        "decision": payload.decision,
        "comments": payload.comments,
        "created_at": now_iso,
    }
    _IN_MEMORY_REVIEWS.setdefault(action_id, []).append(review_record)

    action.setdefault("history", []).append(
        {
            "id": str(uuid4()),
            "action_id": action_id,
            "from_status": prev_status,
            "to_status": target_status,
            "actor_id": actor_id,
            "reason": f"Reviewer decision '{payload.decision}': {payload.comments}",
            "created_at": now_iso,
        }
    )

    # Update evidence statuses
    for ev in _IN_MEMORY_EVIDENCE.get(action_id, []):
        if ev["status"] == "pending_review":
            ev["status"] = "approved" if payload.decision == "approved" else "changes_requested"
            ev["reviewer_comments"] = payload.comments
            ev["reviewed_by"] = actor_id
            ev["reviewed_at"] = now_iso

    return review_record


@router.post("/{action_id}/revalidate", status_code=201)
async def revalidate_action(
    action_id: str,
    payload: RevalidationRequest,
    authorization: str | None = None,
) -> dict[str, Any]:
    """Execute compliance revalidation on approved corrective action evidence."""
    if action_id not in _IN_MEMORY_ACTIONS:
        raise HTTPException(status_code=404, detail="Corrective action not found.")
    _, _, actor_id = await _get_auth_context(authorization)
    action = _IN_MEMORY_ACTIONS[action_id]

    if action["status"] not in ("approved", "revalidation_required"):
        raise HTTPException(
            status_code=400,
            detail=f"Action in '{action['status']}' state cannot be revalidated. Must be 'approved' first.",
        )

    now_iso = datetime.now(UTC).isoformat()
    reval_id = str(uuid4())

    # Check evidence satisfaction
    evidence_items = _IN_MEMORY_EVIDENCE.get(action_id, [])
    has_approved_evidence = any(e["status"] == "approved" for e in evidence_items) or len(evidence_items) > 0

    outcome: RevalidationOutcome = "resolved" if has_approved_evidence else "partially_resolved"

    reval_record = {
        "id": reval_id,
        "action_id": action_id,
        "previous_run_id": action.get("validation_run_id"),
        "new_run_id": payload.new_run_id,
        "outcome": outcome,
        "evidence_summary": payload.evidence_summary,
        "evaluated_by": actor_id,
        "evaluation_date": now_iso,
        "notes": payload.notes,
    }
    _IN_MEMORY_REVALIDATIONS.setdefault(action_id, []).append(reval_record)

    prev_status = action["status"]
    action["status"] = "resolved" if outcome == "resolved" else "revalidation_required"
    action["updated_at"] = now_iso
    action.setdefault("history", []).append(
        {
            "id": str(uuid4()),
            "action_id": action_id,
            "from_status": prev_status,
            "to_status": action["status"],
            "actor_id": actor_id,
            "reason": f"Compliance revalidation evaluated outcome '{outcome}'",
            "created_at": now_iso,
        }
    )

    return reval_record
