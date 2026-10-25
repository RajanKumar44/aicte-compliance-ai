from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import _supabase_client, app

USER_ID = "11111111-1111-4111-8111-111111111111"
INSTITUTION_ID = "22222222-2222-4222-8222-222222222222"
RUN_ID = "33333333-3333-4333-8333-333333333333"
ACCESS_TOKEN = "signed-user-access-token"


@pytest.fixture
def setup_supabase(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.path == "/auth/v1/user":
            if request.headers.get("Authorization") != f"Bearer {ACCESS_TOKEN}":
                return httpx.Response(401, json={"message": "Invalid token"})
            return httpx.Response(200, json={"id": USER_ID})
        if request.url.path == "/rest/v1/institution_memberships" and request.method == "GET":
            return httpx.Response(200, json=[{
                "role": "applicant",
                "institutions": {
                    "id": INSTITUTION_ID,
                    "external_ref": "SYNTH-001",
                    "display_name": "Synthetic Institute",
                },
            }])
        if request.url.path == "/rest/v1/validation_runs" and request.method == "POST":
            payload = request.read()
            import json
            body = json.loads(payload)
            assert body["created_by"] == USER_ID
            assert body["institution_id"] == INSTITUTION_ID
            assert body["ruleset_snapshot"] == []
            result = body["response_snapshot"]
            return httpx.Response(201, json=[{
                "id": RUN_ID,
                "institution_id": INSTITUTION_ID,
                "application_type": body["application_type"],
                "created_at": "2026-10-24T12:00:00+00:00",
                "checked_at": result["checked_at"],
                "expires_at": "2027-10-24T12:00:00+00:00",
                "request_snapshot": body["request_snapshot"],
                "response_snapshot": result,
            }])
        if request.url.path == "/rest/v1/validation_runs" and request.method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(404, json={"message": "Not found"})

    async def override_client():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            yield client

    app.dependency_overrides[_supabase_client] = override_client
    yield seen
    app.dependency_overrides.pop(_supabase_client, None)


def test_history_requires_a_bearer_token(setup_supabase):
    with TestClient(app) as client:
        response = client.get("/api/v1/validation-runs")
    assert response.status_code == 401


def test_invalid_supabase_user_token_is_rejected(setup_supabase):
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/validation-runs",
            headers={"Authorization": "Bearer wrong-token"},
        )
    assert response.status_code == 401


def test_validation_run_is_scoped_to_verified_user_and_returns_snapshot(setup_supabase):
    payload = {
        "institution_id": "SYNTH-001",
        "application_type": "eoa",
        "required_documents": ["synthetic_required"],
        "submitted_documents": [],
        "expiry_dates": {},
    }
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/validation-runs",
            json=payload,
            headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
        )
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == RUN_ID
    assert body["institution_id"] == "SYNTH-001"
    assert body["result"]["validation_scope"] == "caller_supplied_checklist_only"
    assert body["result"]["missing_documents"] == ["synthetic_required"]
    rest_requests = [request for request in setup_supabase if request.url.path.startswith("/rest/v1/")]
    assert rest_requests
    assert all(request.headers.get("Authorization") == f"Bearer {ACCESS_TOKEN}" for request in rest_requests)
    assert all("service_role" not in request.headers.get("apikey", "") for request in rest_requests)


def test_history_endpoint_is_disabled_when_supabase_is_unconfigured(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    with TestClient(app) as client:
        response = client.get("/api/v1/validation-runs")
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


def test_authenticated_history_list_is_bounded(setup_supabase):
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/validation-runs?limit=50&offset=25",
            headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
        )
    assert response.status_code == 200
    assert response.json() == {"items": [], "has_more": False}
    request = next(item for item in setup_supabase if item.url.path == "/rest/v1/validation_runs")
    assert request.url.params["limit"] == "51"
    assert request.url.params["offset"] == "25"
