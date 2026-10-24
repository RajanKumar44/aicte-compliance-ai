from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def payload(**overrides):
    data = {
        "institution_id": "SYNTH-SECURITY",
        "application_type": "eoa",
        "required_documents": ["undertaking"],
        "submitted_documents": ["undertaking"],
    }
    data.update(overrides)
    return data


def test_whitespace_only_institution_id_is_rejected():
    response = client.post("/api/v1/validate", json=payload(institution_id="   "))
    assert response.status_code == 422


def test_invalid_application_type_is_rejected():
    response = client.post(
        "/api/v1/validate",
        json=payload(application_type="unapproved_type"),
    )
    assert response.status_code == 422


def test_duplicate_names_after_normalization_are_rejected():
    response = client.post(
        "/api/v1/validate",
        json=payload(required_documents=["undertaking", " undertaking "]),
    )
    assert response.status_code == 422


def test_duplicate_submitted_names_are_rejected():
    response = client.post(
        "/api/v1/validate",
        json=payload(submitted_documents=["undertaking", "undertaking"]),
    )
    assert response.status_code == 422


def test_blank_expiry_date_document_key_is_rejected():
    response = client.post(
        "/api/v1/validate",
        json=payload(expiry_dates={"   ": "2030-01-01"}),
    )
    assert response.status_code == 422


def test_expiry_keys_are_trimmed_before_evaluation():
    response = client.post(
        "/api/v1/validate",
        json=payload(expiry_dates={" undertaking ": "2000-01-01"}),
    )
    assert response.status_code == 200
    assert response.json()["expired_documents"] == ["undertaking"]


def test_invalid_expiry_date_is_rejected():
    response = client.post(
        "/api/v1/validate",
        json=payload(expiry_dates={"undertaking": "not-a-date"}),
    )
    assert response.status_code == 422


def test_result_explicitly_identifies_demo_data_and_limited_scope():
    response = client.post("/api/v1/validate", json=payload())
    assert response.status_code == 200
    result = response.json()
    assert result["source"] == "synthetic_demo_input"
    assert result["validation_scope"] == "caller_supplied_checklist_only"
    assert "does not establish regulatory compliance" in result["notice"]
    assert "document authenticity" in result["notice"]
