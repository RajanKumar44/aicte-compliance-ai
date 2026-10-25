"""CORS allows only the local Vite dev origins plus configured origins."""

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def _preflight(origin: str) -> object:
    return client.options(
        "/api/v1/validate",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_dev_origin_preflight_is_allowed():
    response = _preflight("http://localhost:5173")
    assert response.status_code == 200
    assert "access-control-allow-origin" in {k.lower() for k in response.headers}


def test_unknown_origin_preflight_is_not_allowed():
    response = _preflight("https://attacker.example")
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin is None or allow_origin != "https://attacker.example"
