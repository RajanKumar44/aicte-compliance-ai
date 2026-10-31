"""Unit and integration tests for GET /api/v1/me server-verified identity endpoint."""
from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.main import _supabase_client, app

USER_ID = "33333333-3333-4333-8333-333333333333"
INSTITUTION_ID = "44444444-4444-4444-8444-444444444444"


@pytest.fixture
def setup_supabase(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        auth = request.headers.get("Authorization", "")

        # If testing invalid token
        if "invalid-token" in auth:
            return httpx.Response(401, json={"message": "Invalid JWT"})

        if path == "/auth/v1/user":
            return httpx.Response(200, json={
                "id": USER_ID,
                "email": "dean@institution.edu",
                "email_confirmed_at": "2026-10-31T00:00:00Z",
                "user_metadata": {
                    "full_name": "Dr. Compliance Dean",
                    "institution_id": "SYNTH-INST-001",
                    "role": "institution_admin",
                },
                "app_metadata": {"provider": "email"},
            })

        if path == "/rest/v1/institution_memberships":
            return httpx.Response(200, json=[{
                "role": "institution_admin",
                "created_at": "2026-10-31T01:00:00Z",
                "institutions": {
                    "id": INSTITUTION_ID,
                    "external_ref": "SYNTH-INST-001",
                    "display_name": "National Technical Institute",
                },
            }])

        return httpx.Response(404, json={"message": "not found"})

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)
    app.dependency_overrides[_supabase_client] = lambda: client
    yield client
    app.dependency_overrides.clear()


def test_me_endpoint_requires_auth(setup_supabase):
    client = TestClient(app)
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert "Sign in to access" in response.json()["detail"]


def test_me_endpoint_rejects_invalid_token(setup_supabase):
    client = TestClient(app)
    response = client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer invalid-token-12345"},
    )
    assert response.status_code == 401
    assert "rejected by Supabase Auth server" in response.json()["detail"]


def test_me_endpoint_returns_verified_identity(setup_supabase):
    client = TestClient(app)
    response = client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer valid-supabase-jwt"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user_id"] == USER_ID
    assert data["email"] == "dean@institution.edu"
    assert data["role"] == "institution_admin"
    assert data["institution_id"] == "SYNTH-INST-001"
    assert data["institution_name"] == "National Technical Institute"
    assert data["membership_verified"] is True
    assert len(data["database_memberships"]) == 1
    assert data["auth_provider"] == "supabase"
