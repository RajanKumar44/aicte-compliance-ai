"""PDF document analysis and selectable text extraction for AICTE Compliance Assistant.

Extracts text and metadata candidates from user-submitted PDF certificates.
Enforces a 10 MiB upload limit, validates PDF structure, checks encryption,
and outputs candidate fields for human-in-the-loop verification.

Does not store file contents. Results are advisory and do not establish
regulatory compliance or document authenticity.
"""
from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass
from typing import Any

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MiB limit
MAX_EXTRACT_CHARS = 100_000


class DocumentAnalysisError(Exception):
    """Base error for document analysis failures."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class ExtractedField:
    value: str | None
    confidence: float | None = None
    page_number: int | None = None
    evidence_text: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "value": self.value,
            "confidence": self.confidence,
            "page_number": self.page_number,
            "evidence_text": self.evidence_text,
        }


def _extract_field_candidates(text: str) -> dict[str, ExtractedField]:
    """Heuristic extraction of key compliance metadata from selectable text."""
    fields: dict[str, ExtractedField] = {}

    # Date regexes: ISO YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    # Expiry / Valid till patterns
    expiry_patterns = [
        r"(?:valid\s+(?:until|up\s*to|upto|till)|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})",
        r"(?:valid\s+(?:until|up\s*to|upto|till)|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
    ]
    for pattern in expiry_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_date = match.group(1).strip()
            # Normalize to ISO if possible
            iso_candidate = _normalize_to_iso_date(raw_date)
            fields["expiry_date"] = ExtractedField(
                value=iso_candidate or raw_date,
                confidence=0.85 if iso_candidate else 0.65,
                page_number=1,
                evidence_text=match.group(0)[:120],
            )
            break

    # Issue date patterns
    issue_patterns = [
        r"(?:date\s+of\s+issue|issued\s+on|issue\s+date|dated)\s*[:\-]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})",
        r"(?:date\s+of\s+issue|issued\s+on|issue\s+date|dated)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
    ]
    for pattern in issue_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_date = match.group(1).strip()
            iso_candidate = _normalize_to_iso_date(raw_date)
            fields["issue_date"] = ExtractedField(
                value=iso_candidate or raw_date,
                confidence=0.85 if iso_candidate else 0.65,
                page_number=1,
                evidence_text=match.group(0)[:120],
            )
            break

    # Certificate / Reference number pattern
    ref_match = re.search(
        r"(?:ref(?:erence)?\.?\s*(?:no\.?|num(?:ber)?)|cert(?:ificate)?\.?\s*(?:no\.?|num(?:ber)?)|noc\s*(?:no\.?|num(?:ber)?))\s*[:\-]?\s*([A-Z0-9/\-_]{4,40})",
        text,
        re.IGNORECASE,
    )
    if ref_match:
        fields["certificate_number"] = ExtractedField(
            value=ref_match.group(1).strip(),
            confidence=0.80,
            page_number=1,
            evidence_text=ref_match.group(0)[:120],
        )

    # Issuing Authority patterns
    authority_keywords = [
        (r"(Fire\s+(?:and\s+Emergency\s+)?Services|Fire\s+Department|Directorate\s+of\s+Fire)", "Fire & Emergency Services Authority"),
        (r"(Chartered\s+Structural\s+Engineer|Structural\s+Stability|Municipal\s+Corporation)", "Municipal Structural Stability Authority"),
        (r"(Sub-Registrar|District\s+Collector(?:ate)?|Land\s+Revenue\s+Department)", "District Land Revenue / Registrar Office"),
        (r"(All\s+India\s+Council\s+for\s+Technical\s+Education|AICTE)", "All India Council for Technical Education"),
    ]
    for auth_pattern, auth_label in authority_keywords:
        auth_match = re.search(auth_pattern, text, re.IGNORECASE)
        if auth_match:
            fields["issuing_authority"] = ExtractedField(
                value=auth_label,
                confidence=0.90,
                page_number=1,
                evidence_text=auth_match.group(0)[:120],
            )
            break

    return fields


def _normalize_to_iso_date(raw: str) -> str | None:
    """Attempt unambiguous normalization of DD-MM-YYYY or YYYY-MM-DD."""
    cleaned = re.sub(r"[/\.]", "-", raw)
    parts = cleaned.split("-")
    if len(parts) != 3:
        return None
    # If YYYY-MM-DD
    if len(parts[0]) == 4 and len(parts[1]) in (1, 2) and len(parts[2]) in (1, 2):
        y = parts[0]
        m = parts[1].zfill(2)
        d = parts[2].zfill(2)
        return f"{y}-{m}-{d}"
    # If DD-MM-YYYY
    if len(parts[2]) == 4 and len(parts[1]) in (1, 2) and len(parts[0]) in (1, 2):
        d = parts[0].zfill(2)
        m = parts[1].zfill(2)
        y = parts[2]
        return f"{y}-{m}-{d}"
    return None


def analyze_pdf_document(
    filename: str,
    content: bytes,
) -> dict[str, Any]:
    """Inspect and extract selectable text from PDF bytes.

    Raises DocumentAnalysisError on invalid, oversized, corrupt or encrypted input.
    """
    if not filename.lower().endswith(".pdf"):
        raise DocumentAnalysisError("Only PDF documents (.pdf) are supported.", status_code=400)

    if not content:
        raise DocumentAnalysisError("Uploaded document file is empty.", status_code=400)

    if len(content) > MAX_PDF_BYTES:
        raise DocumentAnalysisError(
            f"File exceeds the 10 MiB processing limit ({len(content) / (1024 * 1024):.1f} MiB).",
            status_code=413,
        )

    if not content.startswith(b"%PDF-"):
        raise DocumentAnalysisError(
            "File does not have a valid PDF header (%PDF-). Invalid or corrupted document.",
            status_code=400,
        )

    sha256 = hashlib.sha256(content).hexdigest()

    try:
        reader = PdfReader(io.BytesIO(content))
    except (PdfReadError, Exception) as exc:
        raise DocumentAnalysisError(f"Unable to parse PDF document: {exc}", status_code=400) from exc

    if reader.is_encrypted:
        raise DocumentAnalysisError(
            "Encrypted or password-protected PDFs are not supported. Please upload an unencrypted copy.",
            status_code=400,
        )

    page_count = len(reader.pages)
    if page_count == 0:
        raise DocumentAnalysisError("PDF document contains no pages.", status_code=400)

    # Extract selectable text across pages
    extracted_text_chunks: list[str] = []
    total_chars = 0
    warnings: list[str] = []

    for page_idx, page in enumerate(reader.pages, start=1):
        if total_chars >= MAX_EXTRACT_CHARS:
            warnings.append(f"Text truncated at {MAX_EXTRACT_CHARS} characters limit.")
            break
        try:
            page_text = page.extract_text() or ""
        except (PdfReadError, ValueError, TypeError, OSError):
            page_text = ""
            warnings.append(f"Text extraction failed on page {page_idx}.")
        extracted_text_chunks.append(page_text)
        total_chars += len(page_text)

    combined_text = "\n".join(extracted_text_chunks).strip()

    if len(combined_text) < 30:
        warnings.append(
            "Document appears to be scanned or image-only without selectable text. "
            "Text extraction could not detect selectable content, and OCR is not configured."
        )

    fields = _extract_field_candidates(combined_text)

    return {
        "filename": filename,
        "page_count": page_count,
        "sha256": sha256,
        "extracted_text": combined_text[:2000],
        "fields": {k: v.to_dict() for k, v in fields.items()},
        "warnings": warnings,
        "requires_human_review": True,
        "notice": (
            "Advisory extraction only. Extracted fields must be verified by a human reviewer "
            "and do not establish document authenticity or AICTE compliance."
        ),
    }
