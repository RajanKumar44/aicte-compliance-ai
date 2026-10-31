"""Regulatory Change Impact Analyzer Router and Engine.

Implements Feature 3:
Official Regulatory Source -> Regulatory Version -> Clause Extraction ->
Change Detection -> Requirement Mapping -> Institutional Impact Assessment ->
Human Review -> Corrective Action.
"""
from __future__ import annotations

import difflib
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/regulatory", tags=["regulatory-impact"])

SourceCategory = Literal[
    "council_handbook",
    "gazette_notification",
    "circular",
    "court_order",
    "state_policy",
]
SourceType = Literal[
    "primary_statutory",
    "official_gazette",
    "administrative_circular",
    "regulatory_board",
]
ChangeType = Literal[
    "added",
    "modified",
    "removed",
    "threshold_changed",
    "deadline_changed",
    "criteria_changed",
    "procedural",
]
ChangeSignificance = Literal["critical", "major", "minor", "clarification"]
ChangeReviewStatus = Literal["in_review", "confirmed", "rejected", "needs_clarification"]
ImpactCategory = Literal[
    "no_impact",
    "informational",
    "evidence_update_required",
    "requirement_review_required",
    "potential_compliance_gap",
    "urgent_review_required",
    "manual_verification_required",
]
ImpactSeverity = Literal["critical", "high", "medium", "low", "info"]

# In-Memory Fallback State (Seeded with Canonical AICTE APH 2024-27 Norms)
_SOURCES: dict[str, dict[str, Any]] = {
    "src-01": {
        "id": "src-01",
        "name": "AICTE Central Portal - Approval Process Handbook",
        "official_url": "https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf",
        "publisher": "All India Council for Technical Education (AICTE)",
        "category": "council_handbook",
        "jurisdiction": "All India / National",
        "source_type": "primary_statutory",
        "monitoring_status": "active",
        "last_checked_at": "2026-10-31T06:00:00Z",
        "last_retrieved_at": "2026-10-31T06:00:00Z",
        "verification_status": "verified",
        "created_at": "2026-10-24T00:00:00Z",
    },
    "src-02": {
        "id": "src-02",
        "name": "AICTE Revised Scrutiny Circulars Bureau",
        "official_url": "https://www.aicte.gov.in/sites/default/files/Revised%20set%20of%20Documents.pdf",
        "publisher": "AICTE Approval Bureau",
        "category": "circular",
        "jurisdiction": "All India / National",
        "source_type": "administrative_circular",
        "monitoring_status": "active",
        "last_checked_at": "2026-10-31T06:00:00Z",
        "last_retrieved_at": "2026-10-31T06:00:00Z",
        "verification_status": "verified",
        "created_at": "2026-10-24T00:00:00Z",
    },
}

_DOCUMENTS: dict[str, dict[str, Any]] = {
    "doc-01": {
        "id": "doc-01",
        "source_id": "src-01",
        "title": "Approval Process Handbook (APH 2024–25 to 2026–27)",
        "document_number": "F.No. AICTE/AB/APH/2024-27",
        "issuing_authority": "All India Council for Technical Education",
        "document_type": "approval_handbook",
        "publication_date": "2024-03-15",
        "effective_date": "2024-04-01",
        "source_url": "https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf",
        "verification_status": "verified",
        "created_at": "2026-10-24T00:00:00Z",
    }
}

_VERSIONS: dict[str, dict[str, Any]] = {
    "ver-24": {
        "id": "ver-24",
        "document_id": "doc-01",
        "version_number": "v2024-25.1",
        "academic_year": "2024-25",
        "supersedes_version_id": None,
        "status": "superseded",
        "file_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "verified_by": "System Auditor",
        "verified_at": "2024-03-20T10:00:00Z",
        "created_at": "2024-03-20T00:00:00Z",
    },
    "ver-26": {
        "id": "ver-26",
        "document_id": "doc-01",
        "version_number": "v2026-27.1",
        "academic_year": "2026-27",
        "supersedes_version_id": "ver-24",
        "status": "verified_active",
        "file_sha256": "f4c0a55298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c966",
        "verified_by": "Compliance Lead",
        "verified_at": "2026-10-24T12:00:00Z",
        "created_at": "2026-10-24T00:00:00Z",
    },
}

_CLAUSES: dict[str, list[dict[str, Any]]] = {
    "ver-24": [
        {
            "id": "cl-24-01",
            "version_id": "ver-24",
            "clause_number": "Clause 2.4",
            "chapter": "Chapter II",
            "section_title": "Fire and Life Safety NOC",
            "page_number": 42,
            "clause_text": "Fire NOC must be renewed annually by municipal authority.",
            "clause_type": "threshold",
            "extraction_confidence": 0.98,
            "extraction_method": "structured_digital",
            "is_verified": True,
        },
        {
            "id": "cl-24-02",
            "version_id": "ver-24",
            "clause_number": "Annexure 5",
            "chapter": "Norms & Standards",
            "section_title": "Faculty Cadre Ratio & FSR",
            "page_number": 115,
            "clause_text": "Cadre ratio 1:2:6 applies to all technical education institutions.",
            "clause_type": "norm",
            "extraction_confidence": 0.99,
            "extraction_method": "structured_digital",
            "is_verified": True,
        },
    ],
    "ver-26": [
        {
            "id": "cl-26-01",
            "version_id": "ver-26",
            "clause_number": "Clause 2.4",
            "chapter": "Chapter II",
            "section_title": "Fire and Life Safety NOC",
            "page_number": 42,
            "clause_text": "Valid Fire Safety NOC issued by the Competent State Fire Authority for all instructional and administrative blocks with verified challan acknowledgment.",
            "clause_type": "threshold",
            "extraction_confidence": 0.99,
            "extraction_method": "structured_digital",
            "is_verified": True,
        },
        {
            "id": "cl-26-02",
            "version_id": "ver-26",
            "clause_number": "Annexure 5",
            "chapter": "Norms & Standards",
            "section_title": "Faculty Cadre Ratio & FSR",
            "page_number": 118,
            "clause_text": "Institutions shall maintain Faculty-to-Student Ratio of 1:20 for UG Engineering with Cadre Ratio 1:2:6. Cadre ratio is not applicable at Diploma level.",
            "clause_type": "norm",
            "extraction_confidence": 0.99,
            "extraction_method": "structured_digital",
            "is_verified": True,
        },
        {
            "id": "cl-26-03",
            "version_id": "ver-26",
            "clause_number": "Clause 2.6",
            "chapter": "Chapter II",
            "section_title": "Structural Stability Certificate",
            "page_number": 45,
            "clause_text": "Certificate issued by a Government-registered Structural Engineer confirming the building earthquake and structural soundness.",
            "clause_type": "threshold",
            "extraction_confidence": 0.97,
            "extraction_method": "structured_digital",
            "is_verified": True,
        },
    ],
}

_CHANGES: dict[str, dict[str, Any]] = {
    "chg-01": {
        "id": "chg-01",
        "previous_version_id": "ver-24",
        "new_version_id": "ver-26",
        "previous_clause_id": "cl-24-02",
        "new_clause_id": "cl-26-02",
        "change_type": "modified",
        "title": "Undergraduate Engineering FSR Harmonization & Diploma Exemption",
        "description": "Harmonized 1:20 FSR across all UG Engineering courses with explicit statutory exemption of 1:2:6 Cadre ratio for Polytechnic Diploma programmes.",
        "old_text": "Cadre ratio 1:2:6 applies to all technical education institutions.",
        "new_text": "Institutions shall maintain Faculty-to-Student Ratio of 1:20 for UG Engineering with Cadre Ratio 1:2:6. Cadre ratio is not applicable at Diploma level.",
        "significance": "critical",
        "review_status": "confirmed",
        "reviewed_by": "Compliance Lead",
        "reviewed_at": "2026-10-25T10:00:00Z",
        "reviewer_comments": "Validated against official Gazette notification and APH 2024-27 Annexure 5.",
        "created_at": "2026-10-24T00:00:00Z",
    },
    "chg-02": {
        "id": "chg-02",
        "previous_version_id": "ver-24",
        "new_version_id": "ver-26",
        "previous_clause_id": "cl-24-01",
        "new_clause_id": "cl-26-01",
        "change_type": "threshold_changed",
        "title": "Mandatory Online Fire NOC Verification Portal Challan",
        "description": "State Fire Safety renewals now require official District Fire Officer Challan verification receipt within 30 days of expiry.",
        "old_text": "Fire NOC must be renewed annually by municipal authority.",
        "new_text": "Valid Fire Safety NOC issued by the Competent State Fire Authority for all instructional and administrative blocks with verified challan acknowledgment.",
        "significance": "major",
        "review_status": "confirmed",
        "reviewed_by": "Compliance Lead",
        "reviewed_at": "2026-10-25T11:00:00Z",
        "reviewer_comments": "Mandatory life safety check per Chapter II EoA scrutiny rules.",
        "created_at": "2026-10-24T00:00:00Z",
    },
    "chg-03": {
        "id": "chg-03",
        "previous_version_id": "ver-24",
        "new_version_id": "ver-26",
        "previous_clause_id": None,
        "new_clause_id": "cl-26-03",
        "change_type": "added",
        "title": "Building Structural Soundness Seismic Audit Requirement",
        "description": "Added explicit seismic compliance verification by chartered engineer for all multi-storey instructional blocks.",
        "old_text": None,
        "new_text": "Certificate issued by a Government-registered Structural Engineer confirming the building earthquake and structural soundness.",
        "significance": "major",
        "review_status": "confirmed",
        "reviewed_by": "Structural Expert",
        "reviewed_at": "2026-10-26T09:00:00Z",
        "reviewer_comments": "Directly impacts renewal for older campuses (>10 years).",
        "created_at": "2026-10-24T00:00:00Z",
    },
}

_REQUIREMENTS: dict[str, dict[str, Any]] = {
    "req-01": {
        "id": "req-01",
        "code": "REQ-CADRE-01",
        "title": "Faculty Cadre Ratio (1:2:6) and FSR Norms",
        "description": "Maintenance of prescribed Faculty-to-Student Ratio and Cadre hierarchy per APH Annexure 5.",
        "category": "faculty_cadre",
        "mandatory": True,
        "linked_clause_id": "cl-26-02",
    },
    "req-02": {
        "id": "req-02",
        "code": "REQ-FIRE-01",
        "title": "Valid State Fire Authority NOC",
        "description": "Active fire safety certificate for instructional and administrative areas.",
        "category": "safety_statutory",
        "mandatory": True,
        "linked_clause_id": "cl-26-01",
    },
    "req-03": {
        "id": "req-03",
        "code": "REQ-STRUCT-01",
        "title": "Structural Stability & Seismic Soundness",
        "description": "Empaneled structural engineer soundness certificate.",
        "category": "safety_statutory",
        "mandatory": True,
        "linked_clause_id": "cl-26-03",
    },
}

_IMPACT_ASSESSMENTS: dict[str, dict[str, Any]] = {
    "imp-01": {
        "id": "imp-01",
        "change_id": "chg-01",
        "institution_id": "INST-DEMO",
        "requirement_id": "req-01",
        "impact_category": "requirement_review_required",
        "impact_severity": "critical",
        "explanation": "Amendment confirms 1:20 UG Engineering FSR and eliminates 1:2:6 Cadre calculation for Diploma departments. Institutions with Diploma courses no longer face professor deficit flags.",
        "recommended_action": "Review faculty roster in Cadre Calculator. Re-evaluate Diploma department without Professor cadre penalty.",
        "affected_documents": ["Faculty Cadre Ratio Affidavit (1:2:6)"],
        "affected_findings": ["FSR_CADRE_DEFICIT"],
        "affected_corrective_actions": [],
        "review_status": "pending_review",
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": "2026-10-31T06:00:00Z",
    },
    "imp-02": {
        "id": "imp-02",
        "change_id": "chg-02",
        "institution_id": "INST-DEMO",
        "requirement_id": "req-02",
        "impact_category": "evidence_update_required",
        "impact_severity": "high",
        "explanation": "Fire Safety verification now requires official renewal challan receipt if certificate expires within academic year.",
        "recommended_action": "Obtain renewal fee receipt challan from District Fire Officer and upload to Document Vault.",
        "affected_documents": ["Fire Safety Certificate"],
        "affected_findings": ["DOC_EXPIRED"],
        "affected_corrective_actions": [],
        "review_status": "pending_review",
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": "2026-10-31T06:00:00Z",
    },
}


# --- Request Schemas ---

class SourceCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    official_url: str = Field(pattern=r"^https?://")
    publisher: str = Field(min_length=2, max_length=150)
    category: SourceCategory = "council_handbook"
    jurisdiction: str = "All India / National"
    source_type: SourceType = "primary_statutory"


class VersionCompareRequest(BaseModel):
    target_version_id: str
    base_version_id: str | None = None


class ChangeReviewRequest(BaseModel):
    review_status: ChangeReviewStatus
    comments: str = Field(min_length=3)


class ImpactGenerateRequest(BaseModel):
    change_id: str
    institution_id: str
    requirement_id: str | None = None
    impact_category: ImpactCategory = "potential_compliance_gap"
    impact_severity: ImpactSeverity = "medium"
    explanation: str = Field(min_length=5)
    recommended_action: str = Field(min_length=3)


class ImpactReviewRequest(BaseModel):
    review_status: Literal["acknowledged", "action_created", "waived"]
    comments: str = Field(min_length=3)


# --- Endpoints ---

@router.get("/sources")
async def list_regulatory_sources() -> list[dict[str, Any]]:
    """List registered authoritative regulatory sources."""
    return list(_SOURCES.values())


@router.post("/sources", status_code=201)
async def create_regulatory_source(payload: SourceCreateRequest) -> dict[str, Any]:
    """Register a new official regulatory source for automated and admin monitoring."""
    src_id = f"src-{len(_SOURCES) + 1:02d}"
    now_iso = datetime.now(UTC).isoformat()
    new_src = {
        "id": src_id,
        "name": payload.name,
        "official_url": payload.official_url,
        "publisher": payload.publisher,
        "category": payload.category,
        "jurisdiction": payload.jurisdiction,
        "source_type": payload.source_type,
        "monitoring_status": "active",
        "last_checked_at": now_iso,
        "last_retrieved_at": now_iso,
        "verification_status": "verified",
        "created_at": now_iso,
    }
    _SOURCES[src_id] = new_src
    return new_src


@router.get("/documents")
async def list_regulatory_documents() -> list[dict[str, Any]]:
    """List regulatory documents and handbooks."""
    return list(_DOCUMENTS.values())


@router.get("/versions")
async def list_regulatory_versions() -> list[dict[str, Any]]:
    """List version snapshots with academic year and supersession links."""
    return list(_VERSIONS.values())


@router.get("/versions/{version_id}/clauses")
async def get_version_clauses(version_id: str) -> list[dict[str, Any]]:
    """Retrieve structured extracted clauses for a specific regulatory version."""
    if version_id not in _VERSIONS:
        raise HTTPException(status_code=404, detail="Regulatory version not found.")
    return _CLAUSES.get(version_id, [])


@router.post("/versions/{version_id}/compare")
async def compare_regulatory_versions(
    version_id: str,
    payload: VersionCompareRequest,
) -> dict[str, Any]:
    """Perform deterministic text comparison between regulatory versions to detect changes."""
    target_id = version_id
    base_id = payload.base_version_id or _VERSIONS[target_id].get("supersedes_version_id")

    if not base_id or base_id not in _VERSIONS:
        raise HTTPException(status_code=400, detail="Base regulatory version for comparison was not found.")

    base_clauses = {c["clause_number"]: c for c in _CLAUSES.get(base_id, [])}
    target_clauses = {c["clause_number"]: c for c in _CLAUSES.get(target_id, [])}

    changes_detected: list[dict[str, Any]] = []

    # Detect added and modified clauses
    for c_num, t_clause in target_clauses.items():
        if c_num not in base_clauses:
            changes_detected.append(
                {
                    "clause_number": c_num,
                    "change_type": "added",
                    "title": f"New Clause Added: {c_num} ({t_clause['section_title']})",
                    "old_text": None,
                    "new_text": t_clause["clause_text"],
                    "significance": "major",
                }
            )
        else:
            b_clause = base_clauses[c_num]
            if b_clause["clause_text"] != t_clause["clause_text"]:
                diff = list(
                    difflib.unified_diff(
                        b_clause["clause_text"].splitlines(),
                        t_clause["clause_text"].splitlines(),
                        lineterm="",
                    )
                )
                changes_detected.append(
                    {
                        "clause_number": c_num,
                        "change_type": "modified",
                        "title": f"Clause Modified: {c_num} ({t_clause['section_title']})",
                        "old_text": b_clause["clause_text"],
                        "new_text": t_clause["clause_text"],
                        "diff": diff,
                        "significance": "critical",
                    }
                )

    # Detect removed clauses
    for c_num, b_clause in base_clauses.items():
        if c_num not in target_clauses:
            changes_detected.append(
                {
                    "clause_number": c_num,
                    "change_type": "removed",
                    "title": f"Clause Removed: {c_num} ({b_clause['section_title']})",
                    "old_text": b_clause["clause_text"],
                    "new_text": None,
                    "significance": "critical",
                }
            )

    return {
        "base_version": base_id,
        "target_version": target_id,
        "total_changes": len(changes_detected),
        "changes": changes_detected,
    }


@router.get("/changes")
async def list_regulatory_changes(
    significance: ChangeSignificance | None = None,
    review_status: ChangeReviewStatus | None = None,
) -> list[dict[str, Any]]:
    """List detected regulatory changes with human review states."""
    res = list(_CHANGES.values())
    if significance:
        res = [c for c in res if c["significance"] == significance]
    if review_status:
        res = [c for c in res if c["review_status"] == review_status]
    return res


@router.get("/changes/{change_id}")
async def get_regulatory_change_detail(change_id: str) -> dict[str, Any]:
    """Retrieve full clause change details, comparison diff, and mapped requirements."""
    if change_id not in _CHANGES:
        raise HTTPException(status_code=404, detail="Regulatory change not found.")
    chg = _CHANGES[change_id]
    # Attach mapped requirements
    mapped_reqs = [
        r for r in _REQUIREMENTS.values() if r.get("linked_clause_id") == chg.get("new_clause_id")
    ]
    return {**chg, "mapped_requirements": mapped_reqs}


@router.post("/changes/{change_id}/review")
async def review_regulatory_change(
    change_id: str,
    payload: ChangeReviewRequest,
) -> dict[str, Any]:
    """Human verification decision on proposed regulatory change."""
    if change_id not in _CHANGES:
        raise HTTPException(status_code=404, detail="Regulatory change not found.")
    chg = _CHANGES[change_id]
    now_iso = datetime.now(UTC).isoformat()
    chg["review_status"] = payload.review_status
    chg["reviewer_comments"] = payload.comments
    chg["reviewed_at"] = now_iso
    chg["reviewed_by"] = "Verified Compliance Reviewer"
    return chg


@router.get("/requirements")
async def list_compliance_requirements() -> list[dict[str, Any]]:
    """List codified compliance requirements with linked statutory clauses."""
    return list(_REQUIREMENTS.values())


@router.get("/impact-assessments")
async def list_institutional_impacts(
    institution_id: str | None = None,
    severity: ImpactSeverity | None = None,
    review_status: str | None = None,
) -> list[dict[str, Any]]:
    """List institutional impact assessments for affected documents and findings."""
    res = list(_IMPACT_ASSESSMENTS.values())
    if institution_id:
        res = [i for i in res if i["institution_id"] == institution_id]
    if severity:
        res = [i for i in res if i["impact_severity"] == severity]
    if review_status:
        res = [i for i in res if i["review_status"] == review_status]
    return res


@router.post("/impact-assessments", status_code=201)
async def create_impact_assessment(
    payload: ImpactGenerateRequest,
) -> dict[str, Any]:
    """Create or record an institutional impact assessment from a confirmed regulatory change."""
    imp_id = f"imp-{len(_IMPACT_ASSESSMENTS) + 1:02d}"
    now_iso = datetime.now(UTC).isoformat()
    new_imp = {
        "id": imp_id,
        "change_id": payload.change_id,
        "institution_id": payload.institution_id,
        "requirement_id": payload.requirement_id,
        "impact_category": payload.impact_category,
        "impact_severity": payload.impact_severity,
        "explanation": payload.explanation,
        "recommended_action": payload.recommended_action,
        "affected_documents": [],
        "affected_findings": [],
        "affected_corrective_actions": [],
        "review_status": "pending_review",
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": now_iso,
    }
    _IMPACT_ASSESSMENTS[imp_id] = new_imp
    return new_imp


@router.post("/impact-assessments/{assessment_id}/review")
async def review_institutional_impact(
    assessment_id: str,
    payload: ImpactReviewRequest,
) -> dict[str, Any]:
    """Record institutional decision on regulatory impact (e.g., Acknowledged or Action Created)."""
    if assessment_id not in _IMPACT_ASSESSMENTS:
        raise HTTPException(status_code=404, detail="Impact assessment not found.")
    imp = _IMPACT_ASSESSMENTS[assessment_id]
    now_iso = datetime.now(UTC).isoformat()
    imp["review_status"] = payload.review_status
    imp["reviewed_at"] = now_iso
    imp["reviewed_by"] = "Institutional Compliance Officer"
    return imp


@router.get("/dashboard")
async def get_regulatory_dashboard(
    institution_id: str | None = None,
) -> dict[str, Any]:
    """High-level regulatory intelligence dashboard metrics."""
    changes = list(_CHANGES.values())
    impacts = list(_IMPACT_ASSESSMENTS.values())
    if institution_id:
        impacts = [i for i in impacts if i["institution_id"] == institution_id]

    confirmed_changes = [c for c in changes if c["review_status"] == "confirmed"]
    pending_reviews = [c for c in changes if c["review_status"] == "in_review"]
    urgent_impacts = [i for i in impacts if i["impact_severity"] in ("critical", "high")]

    return {
        "total_sources": len(_SOURCES),
        "total_documents": len(_DOCUMENTS),
        "total_versions": len(_VERSIONS),
        "total_changes": len(changes),
        "confirmed_changes": len(confirmed_changes),
        "pending_change_reviews": len(pending_reviews),
        "total_institutional_impacts": len(impacts),
        "urgent_impacts": len(urgent_impacts),
        "requirements_monitored": len(_REQUIREMENTS),
        "active_academic_year": "2026-27",
    }
