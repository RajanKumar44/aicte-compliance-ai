"""Tests for the application-centric checklist and preliminary rule engine."""
from __future__ import annotations

import json
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.application_service import (
    build_checklist,
    generate_application_findings,
    overall_application_status,
)
from backend.app.main import _supabase_client, app

USER_ID = "11111111-1111-4111-8111-111111111111"
INSTITUTION_ID = "22222222-2222-4222-8222-222222222222"
APPLICATION_ID = "44444444-4444-4444-8444-444444444444"
FINDING_ID = "55555555-5555-4555-8555-555555555555"
ACCESS_TOKEN = "signed-user-access-token"
TODAY = date.today().isoformat()


# ---------------------------------------------------------------------------
# Checklist generation
# ---------------------------------------------------------------------------

def test_checklist_items_are_labelled_honestly():
    checklist = build_checklist({"hostel": True})
    statuses = {item["item_id"]: item["status"] for item in checklist}
    assert statuses["application_form"] == "mandatory"
    assert statuses["fire_safety_noc"] == "mandatory"  # hostel declared
    assert statuses["faculty_fsr_statement"] == "pending_configuration"
    for item in checklist:
        assert item["source_note"].startswith("SYNTHETIC DEMO CONFIGURATION")


def test_conditional_item_not_applicable_without_hostel():
    statuses = {i["item_id"]: i["status"] for i in build_checklist({"hostel": False})}
    assert statuses["fire_safety_noc"] == "not_applicable"


def test_unresolved_params_keep_conditional_status():
    statuses = {i["item_id"]: i["status"] for i in build_checklist({})}
    assert statuses["fire_safety_noc"] == "conditional"


# ---------------------------------------------------------------------------
# Rule engine
# ---------------------------------------------------------------------------

def _doc(fields: dict, scan="clean", ocr="completed", sha="a" * 64, filename="doc.pdf", review=False,
         scanned_only=False):
    return {
        "id": f"doc-{filename}",
        "filename": filename,
        "sha256": sha,
        "storage_path": "inst/doc.pdf",
        "extracted_metadata": {
            "fields": fields,
            "candidate_fields": {
                "expiry_date": (fields.get("expiry_date") or {}).get("value"),
                "certificate_number": (fields.get("certificate_number") or {}).get("value"),
                "issuing_authority": (fields.get("issuing_authority") or {}).get("value"),
            },
            "scan_status": scan,
            "ocr_status": ocr,
            "requires_human_review": review,
            "is_scanned_only": scanned_only,
        },
    }


def _linked(item_id: str, doc: dict) -> dict:
    return {"checklist_item_id": item_id, "documents": doc}


CHECKLIST = build_checklist({"hostel": False})


def test_valid_application_has_no_blocking_findings():
    docs = [
        _linked("application_form", _doc({}, sha="1" * 64, filename="form.pdf")),
        _linked("aicte_approval_certificate", _doc({
            "expiry_date": {"value": "2099-01-01"},
            "certificate_number": {"value": "ABC-001"},
        }, sha="2" * 64, filename="approval.pdf")),
        _linked("mandatory_disclosure", _doc({}, sha="3" * 64, filename="disclosure.pdf")),
    ]
    findings = generate_application_findings(
        application={"institution_external_ref": "SYNTH-INST-001"},
        checklist=CHECKLIST,
        linked_documents=docs,
        institution_external_ref="SYNTH-INST-001",
    )
    blocking = [f for f in findings if f["severity"] in ("critical", "high", "medium")]
    assert blocking == []
    assert overall_application_status(findings) == "preliminary_checks_passed"
    # Unconfigured informational rules are still surfaced honestly.
    assert any(f["code"] == "RULE_UNCONFIGURED" for f in findings)


def test_missing_document_finding():
    docs = [_linked("application_form", _doc({}, sha="1" * 64))]
    findings = generate_application_findings(
        application={}, checklist=CHECKLIST, linked_documents=docs,
        institution_external_ref="SYNTH-INST-001",
    )
    missing_items = {f["evidence"].get("checklist_item") for f in findings if f["code"] == "MISSING_REQUIRED_DOCUMENT"}
    assert {"aicte_approval_certificate", "mandatory_disclosure"} <= missing_items


def test_expired_certificate_finding():
    docs = [_linked("aicte_approval_certificate", _doc({
        "expiry_date": {"value": "2020-01-01"},
        "certificate_number": {"value": "ABC-001"},
    }, sha="2" * 64))]
    findings = generate_application_findings(
        application={}, checklist=CHECKLIST, linked_documents=docs,
        institution_external_ref="SYNTH-INST-001",
    )
    expired = [f for f in findings if f["code"] == "DOCUMENT_EXPIRED"]
    assert expired and expired[0]["severity"] == "critical"
    assert expired[0]["evidence"]["evaluation_date"] == TODAY


def test_institution_id_mismatch_finding():
    doc = _doc({"certificate_number": {"value": "X"}},
               sha="2" * 64)
    doc["extracted_metadata"]["fields"]["institution_id"] = {"value": "OTHER-INST"}
    doc["extracted_metadata"]["candidate_fields"]["institution_id"] = "OTHER-INST"
    findings = generate_application_findings(
        application={}, checklist=CHECKLIST,
        linked_documents=[_linked("application_form", doc)],
        institution_external_ref="SYNTH-INST-001",
    )
    mismatches = [f for f in findings if f["code"] == "INSTITUTION_ID_MISMATCH"]
    assert mismatches and "OTHER-INST" in mismatches[0]["message"]


def test_duplicate_sha256_and_certificate_conflicts():
    doc_a = _doc({"certificate_number": {"value": "CERT-1"}}, sha="9" * 64, filename="a.pdf")
    doc_b = _doc({"certificate_number": {"value": "CERT-1"}}, sha="9" * 64, filename="b.pdf")
    findings = generate_application_findings(
        application={}, checklist=CHECKLIST,
        linked_documents=[_linked("application_form", doc_a), _linked("aicte_approval_certificate", doc_b)],
        institution_external_ref="SYNTH-INST-001",
    )
    codes = {f["code"] for f in findings}
    assert "DUPLICATE_DOCUMENT_SHA256" in codes
    assert "CERTIFICATE_NUMBER_CONFLICT" in codes


def test_infected_scan_raises_critical_finding():
    findings = generate_application_findings(
        application={}, checklist=CHECKLIST,
        linked_documents=[_linked("application_form", _doc({}, scan="infected", sha="7" * 64))],
        institution_external_ref="SYNTH-INST-001",
    )
    assert any(f["code"] == "MALWARE_SUSPECTED" and f["severity"] == "critical" for f in findings)


# ---------------------------------------------------------------------------
# Endpoints through the real app with a mocked Supabase
# ---------------------------------------------------------------------------

@pytest.fixture
def setup_supabase(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    stored_findings: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method
        if path == "/auth/v1/user":
            return httpx.Response(200, json={"id": USER_ID})
        if path == "/rest/v1/institution_memberships" and method == "GET":
            return httpx.Response(200, json=[{
                "role": "reviewer",
                "institutions": {"id": INSTITUTION_ID, "external_ref": "SYNTH-INST-001",
                                 "display_name": "Demo Engineering College"},
            }])
        if path == "/rest/v1/applications" and method == "GET":
            return httpx.Response(200, json=[{
                "id": APPLICATION_ID, "institution_id": INSTITUTION_ID,
                "institution_external_ref": "SYNTH-INST-001", "created_by": USER_ID,
                "application_type": "eoa", "academic_year": "2026-27",
                "params": {"hostel": True}, "checklist": build_checklist({"hostel": True}),
                "status": "submitted", "created_at": "2026-11-01T00:00:00+00:00",
                "institutions": {"external_ref": "SYNTH-INST-001", "display_name": "Demo Engineering College"},
            }])
        if path == "/rest/v1/applications" and method == "POST":
            body = json.loads(request.read())
            row = {"id": APPLICATION_ID, "institution_id": INSTITUTION_ID,
                   "institution_external_ref": "SYNTH-INST-001", "created_by": USER_ID,
                   "application_type": body["application_type"], "academic_year": body["academic_year"],
                   "params": body["params"], "checklist": body["checklist"], "status": "submitted",
                   "created_at": "2026-11-01T00:00:00+00:00",
                   "institutions": {"external_ref": "SYNTH-INST-001", "display_name": "Demo Engineering College"}}
            return httpx.Response(201, json=[row])
        if path == "/rest/v1/application_documents" and method == "GET":
            stale = date(2020, 1, 1).isoformat()
            return httpx.Response(200, json=[{
                "checklist_item_id": "aicte_approval_certificate",
                "documents": {"id": "d1", "filename": "approval.pdf", "sha256": "a" * 64,
                              "storage_path": "inst/approval.pdf",
                              "extracted_metadata": {
                                  "fields": {"expiry_date": {"value": stale},
                                             "certificate_number": {"value": "C-1"}},
                                  "candidate_fields": {"expiry_date": stale, "certificate_number": "C-1"},
                                  "scan_status": "clean", "ocr_status": "completed",
                                  "requires_human_review": False}},
            }])
        if path == "/rest/v1/application_findings":
            if method == "DELETE":
                return httpx.Response(204)
            if method == "POST":
                body = json.loads(request.read())
                saved_rows = []
                for index, item in enumerate(body):
                    row = dict(item)
                    row["id"] = f"f0000000-0000-4000-8000-{index:012d}"
                    row["created_at"] = "2026-11-01T00:00:00+00:00"
                    saved_rows.append(row)
                stored_findings.clear()
                stored_findings.extend(saved_rows)
                return httpx.Response(201, json=saved_rows)
            if method == "GET":
                return httpx.Response(200, json=stored_findings)
        if path == "/rest/v1/applications_status_patch" and method == "PATCH":
            return httpx.Response(204)
        if path == "/rest/v1/applications" and method == "PATCH":
            return httpx.Response(204)
        if path == "/rest/v1/application_audit_events" and method == "POST":
            return httpx.Response(201, json=[])
        if path == "/rest/v1/application_reviews" and method == "POST":
            return httpx.Response(201, json=[])
        if path == "/rest/v1/application_findings" and method == "PATCH":
            patched = [dict(f, status=json.loads(request.read())["status"],
                            resolved_by=USER_ID, resolved_at="2026-11-02T00:00:00+00:00")
                       for f in stored_findings]
            return httpx.Response(200, json=patched)
        if path == "/rest/v1/application_reviews" and method == "GET":
            return httpx.Response(200, json=[{"id": "r1", "reviewed_by": USER_ID,
                                              "decision": "resolve", "rationale": "Renewed copy verified.",
                                              "created_at": "2026-11-02T00:00:00+00:00"}])
        if path == "/rest/v1/application_documents" and method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(404, json={"message": "Not found"})

    async def override_client():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            yield client

    app.dependency_overrides[_supabase_client] = override_client
    yield
    app.dependency_overrides.pop(_supabase_client, None)

client = TestClient(app)
AUTH = {"Authorization": f"Bearer {ACCESS_TOKEN}"}


def test_validate_endpoint_persists_findings(setup_supabase):
    response = client.post(f"/api/v1/applications/{APPLICATION_ID}/validate", headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    codes = {f["code"] for f in data}
    assert "DOCUMENT_EXPIRED" in codes
    expired = next(f for f in data if f["code"] == "DOCUMENT_EXPIRED")
    assert expired["rule_id"].startswith("DEMO-EXPIRY-001@")
    assert expired["evidence"]["expiry_date"] == "2020-01-01"


def test_review_requires_reviewer_role(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/auth/v1/user":
            return httpx.Response(200, json={"id": USER_ID})
        if path == "/rest/v1/institution_memberships" and request.method == "GET":
            return httpx.Response(200, json=[{
                "role": "applicant",
                "institutions": {"id": INSTITUTION_ID, "external_ref": "SYNTH-INST-001",
                                 "display_name": "Demo Engineering College"},
            }])
        if path == "/rest/v1/applications" and request.method == "GET":
            return httpx.Response(200, json=[{
                "id": APPLICATION_ID, "institution_id": INSTITUTION_ID,
                "institution_external_ref": "SYNTH-INST-001", "created_by": USER_ID,
                "application_type": "eoa", "academic_year": "2026-27",
                "params": {}, "checklist": [], "status": "submitted",
                "created_at": "2026-11-01T00:00:00+00:00",
                "institutions": {"external_ref": "SYNTH-INST-001", "display_name": "Demo Engineering College"},
            }])
        return httpx.Response(404, json={"message": "Not found"})

    async def override_client():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            yield client

    app.dependency_overrides[_supabase_client] = override_client
    try:
        response = client.post(
            f"/api/v1/applications/{APPLICATION_ID}/findings/{FINDING_ID}/review",
            headers=AUTH,
            json={"decision": "resolve", "rationale": "Verified against the renewal copy."},
        )
        assert response.status_code == 403
        assert "reviewers" in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(_supabase_client, None)


def test_endpoints_require_configured_supabase(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    response = client.post("/api/v1/applications", headers=AUTH,
                           json={"institution_id": "SYNTH-INST-001", "application_type": "eoa",
                                 "academic_year": "2026-27"})
    assert response.status_code == 503
