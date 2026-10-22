from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_missing_document_is_flagged():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-001",
            "application_type": "eoa",
            "required_documents": ["undertaking", "accreditation_certificate"],
            "submitted_documents": ["undertaking"],
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "attention_required"
    assert result["missing_documents"] == ["accreditation_certificate"]


def test_preliminary_checks_do_not_claim_official_compliance():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-002",
            "application_type": "eoa",
            "required_documents": ["undertaking"],
            "submitted_documents": ["undertaking"],
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "preliminary_checks_passed"
    assert result["validation_scope"] == "caller_supplied_checklist_only"
    assert "does not establish regulatory compliance" in result["notice"]
    assert result["missing_documents"] == []


def test_empty_required_document_list_is_rejected():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-EMPTY",
            "application_type": "eoa",
            "required_documents": [],
            "submitted_documents": [],
        },
    )

    assert response.status_code == 422


def test_blank_document_names_are_rejected():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-BLANK",
            "application_type": "eoa",
            "required_documents": ["   "],
            "submitted_documents": [],
        },
    )

    assert response.status_code == 422


def test_duplicate_document_names_are_rejected():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-DUP",
            "application_type": "eoa",
            "required_documents": ["undertaking", "undertaking"],
            "submitted_documents": [],
        },
    )

    assert response.status_code == 422


def test_document_names_are_trimmed_consistently():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": " SYNTH-TRIM ",
            "application_type": "eoa",
            "required_documents": [" undertaking "],
            "submitted_documents": ["undertaking"],
        },
    )

    assert response.status_code == 200
    assert response.json()["institution_id"] == "SYNTH-TRIM"
    assert response.json()["missing_documents"] == []


def test_expired_document_is_flagged():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-003",
            "application_type": "eoa",
            "required_documents": ["accreditation_certificate"],
            "submitted_documents": ["accreditation_certificate"],
            "expiry_dates": {"accreditation_certificate": "2000-01-01"},
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "attention_required"
    assert result["expired_documents"] == ["accreditation_certificate"]

    finding = result["findings"][0]
    assert finding["code"] == "DOCUMENT_EXPIRED"
    assert finding["evidence"]["expiry_date"] == "2000-01-01"


def test_future_expiry_date_is_not_flagged():
    response = client.post(
        "/api/v1/validate",
        json={
            "institution_id": "SYNTH-004",
            "application_type": "eoa",
            "required_documents": ["undertaking"],
            "submitted_documents": ["undertaking"],
            "expiry_dates": {"undertaking": "2099-12-31"},
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["expired_documents"] == []
    assert result["findings"] == []
