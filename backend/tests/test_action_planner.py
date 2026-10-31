"""Unit and Integration Tests for Compliance Action Planner (Feature 2)."""
from __future__ import annotations

import asyncio
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from backend.app.action_planner import (
    ActionAssignRequest,
    ActionCreateRequest,
    ActionReviewRequest,
    ActionTransitionRequest,
    EvidenceSubmitRequest,
    RevalidationRequest,
    assign_action,
    create_action,
    get_action_dashboard,
    get_action_detail,
    revalidate_action,
    review_action,
    submit_action_evidence,
    transition_action_status,
)


def test_action_creation_from_finding():
    """Verify creating a corrective action carrying forward finding details."""
    async def _run():
        due = date.today() + timedelta(days=30)
        req = ActionCreateRequest(
            institution_id="INST-TEST-01",
            validation_run_id="run-123",
            finding_code="DOC_EXPIRED",
            finding_title="Fire Safety Certificate Expired",
            finding_description="Fire safety NOC expired on 2025-01-01.",
            finding_severity="critical",
            title="Renew Fire Safety NOC with State Authority",
            description="Submit renewal challan to District Fire Officer and upload valid certificate.",
            priority="critical",
            responsible_department="Estate & Civil Works",
            assigned_to="civil-admin@institution.edu",
            due_date=due,
            expected_outcome="Valid Fire Safety Certificate or renewal challan",
            acceptance_criteria="State fire officer stamp with minimum 1-year validity",
            required_evidence="Certified PDF copy of renewal receipt or NOC",
            internal_notes="Priority inspection scheduled",
        )

        action = await create_action(req)
        assert action.id is not None
        assert action.institution_id == "INST-TEST-01"
        assert action.finding_code == "DOC_EXPIRED"
        assert action.finding_severity == "critical"
        assert action.status == "assigned"
        assert len(action.history) == 1
        assert action.history[0]["to_status"] == "assigned"

    asyncio.run(_run())


def test_action_lifecycle_transitions():
    """Verify strict state machine transitions and rejection of invalid jumps."""
    async def _run():
        due = date.today() + timedelta(days=14)
        req = ActionCreateRequest(
            institution_id="INST-TEST-02",
            finding_code="DOC_MISSING",
            finding_title="Occupancy Certificate Missing",
            finding_description="Building completion certificate not found.",
            finding_severity="severe",
            title="Procure Municipal Occupancy Certificate",
            description="Retrieve original municipal sanction blueprint and occupancy certificate.",
            priority="high",
            responsible_department="Administration",
            due_date=due,
            expected_outcome="Municipal Occupancy Certificate",
            acceptance_criteria="Competent town planning seal",
            required_evidence="Sanctioned occupancy document",
        )
        action = await create_action(req)
        assert action.status == "draft"

        # Draft -> Assigned (Valid)
        action = await assign_action(
            action.id,
            ActionAssignRequest(assigned_to="admin-lead@inst.edu", reason="Assigning to campus engineer"),
        )
        assert action.status == "assigned"

        # Assigned -> Accepted (Valid)
        action = await transition_action_status(
            action.id,
            ActionTransitionRequest(target_status="accepted", reason="Engineer acknowledged task"),
        )
        assert action.status == "accepted"

        # Accepted -> In Progress (Valid)
        action = await transition_action_status(
            action.id,
            ActionTransitionRequest(target_status="in_progress", reason="Commenced municipal paperwork"),
        )
        assert action.status == "in_progress"

        # Invalid jump: In Progress -> Resolved directly (Must fail)
        with pytest.raises(HTTPException) as exc_info:
            await transition_action_status(
                action.id,
                ActionTransitionRequest(target_status="resolved", reason="Skipping review"),
            )
        assert exc_info.value.status_code == 400

    asyncio.run(_run())


def test_evidence_submission_and_review():
    """Verify submitting evidence, automatic state advance, and reviewer approval."""
    async def _run():
        due = date.today() + timedelta(days=20)
        req = ActionCreateRequest(
            institution_id="INST-TEST-03",
            finding_code="FSR_CADRE_DEFICIT",
            finding_title="Professor Cadre Shortfall",
            finding_description="Required 2 Professors, appointed 0.",
            finding_severity="moderate",
            title="Appoint Qualified Professors with Ph.D.",
            description="Recruit 2 Professors with doctoral qualifications.",
            priority="high",
            responsible_department="Faculty Recruitment Cell",
            due_date=due,
            expected_outcome="Two joined Professor appointment orders",
            acceptance_criteria="Ph.D. degree certificate + Selection Committee proceedings",
            required_evidence="Appointment letters, joining reports",
        )
        action = await create_action(req)
        action = await assign_action(action.id, ActionAssignRequest(assigned_to="hr@inst.edu"))
        action = await transition_action_status(
            action.id, ActionTransitionRequest(target_status="in_progress", reason="Interviews underway")
        )

        # Submit evidence
        ev = await submit_action_evidence(
            action.id,
            EvidenceSubmitRequest(
                title="Appointment Letters for Dr. Sharma & Dr. Patel",
                description="Ph.D. verified Professor appointment and joining letters",
                category="faculty_record",
            ),
        )
        assert ev["status"] == "pending_review"

        detail = await get_action_detail(action.id)
        assert detail.status == "submitted_for_review"

        rev = await review_action(
            action.id,
            ActionReviewRequest(decision="approved", comments="Ph.D. degree transcripts validated"),
        )
        assert rev["decision"] == "approved"

        detail = await get_action_detail(action.id)
        assert detail.status == "approved"

        reval = await revalidate_action(
            action.id,
            RevalidationRequest(evidence_summary="Verified 2 Ph.D. professor appointments"),
        )
        assert reval["outcome"] == "resolved"

        final_action = await get_action_detail(action.id)
        assert final_action.status == "resolved"

    asyncio.run(_run())


def test_action_dashboard_metrics():
    """Verify aggregated metrics reflect action counts by status and priority."""
    async def _run():
        dash = await get_action_dashboard()
        assert dash.total_actions >= 3
        assert "resolved" in dash.by_status
        assert dash.open_actions >= 0

    asyncio.run(_run())
