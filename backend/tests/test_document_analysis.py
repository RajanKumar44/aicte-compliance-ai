"""Tests for PDF document upload and analysis endpoint POST /api/v1/documents/analyze."""
from __future__ import annotations

import io

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from backend.app.main import app

client = TestClient(app)


def _create_minimal_pdf(text: str = "Hello World", encrypt_password: str | None = None) -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    if encrypt_password:
        writer.encrypt(encrypt_password)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_analyze_document_rejects_non_pdf_extension():
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("document.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only PDF documents (.pdf) are supported" in response.json()["detail"]


def test_analyze_document_rejects_corrupted_pdf():
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("certificate.pdf", b"Not a real PDF", "application/pdf")},
    )
    assert response.status_code == 400
    assert "valid PDF header" in response.json()["detail"]


def test_analyze_document_rejects_oversized_file():
    # 10 MiB + 100 bytes
    oversized = b"%PDF-" + b"0" * (10 * 1024 * 1024 + 100)
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("large.pdf", oversized, "application/pdf")},
    )
    assert response.status_code == 413
    assert "10 MiB processing limit" in response.json()["detail"]


def test_analyze_document_rejects_encrypted_pdf():
    encrypted_pdf = _create_minimal_pdf("Secret", encrypt_password="password123")
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("locked.pdf", encrypted_pdf, "application/pdf")},
    )
    assert response.status_code == 400
    assert "Encrypted or password-protected PDFs are not supported" in response.json()["detail"]


def test_analyze_valid_pdf():
    valid_pdf = _create_minimal_pdf("AICTE Approval 2026")
    response = client.post(
        "/api/v1/documents/analyze",
        files={"file": ("clearance.pdf", valid_pdf, "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "clearance.pdf"
    assert payload["page_count"] == 1
    assert len(payload["sha256"]) == 64
    assert payload["requires_human_review"] is True
    assert "Advisory extraction only" in payload["notice"]
    assert isinstance(payload["warnings"], list)
