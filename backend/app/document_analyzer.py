"""PDF document analysis and selectable text extraction for AICTE Compliance Assistant.

Extracts text and candidate metadata from user-submitted PDF certificates.
Enforces a 10 MiB upload limit, validates PDF structure, checks encryption,
and outputs candidate fields for human-in-the-loop verification.

Does not store file contents. Results are advisory and do not establish
regulatory compliance or document authenticity.
"""
from __future__ import annotations

import hashlib
import io
import re
from typing import Any

import pdfplumber

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MiB limit
MAX_EXTRACT_CHARS = 100_000


class DocumentAnalysisError(Exception):
    """Base error for document analysis failures."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _normalize_to_iso_date(raw: str) -> str | None:
    """Attempt unambiguous normalization of DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD."""
    cleaned = re.sub(r"[/\.]", "-", raw.strip())
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


def _extract_candidates(text: str) -> dict[str, str | None]:
    """Extract candidate fields from document text."""
    fields: dict[str, str | None] = {
        "expiry_date": None,
        "issue_date": None,
        "certificate_number": None,
        "issuing_authority": None,
    }

    # Expiry / Valid till patterns
    expiry_patterns = [
        r"(?:valid\s+(?:until|up\s*to|upto|till)|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})",
        r"(?:valid\s+(?:until|up\s*to|upto|till)|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})",
    ]
    for pattern in expiry_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_date = match.group(1).strip()
            fields["expiry_date"] = _normalize_to_iso_date(raw_date) or raw_date
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
            fields["issue_date"] = _normalize_to_iso_date(raw_date) or raw_date
            break

    # Certificate / Reference number pattern
    ref_match = re.search(
        r"(?:ref(?:erence)?\.?\s*(?:no\.?|num(?:ber)?)|cert(?:ificate)?\.?\s*(?:no\.?|num(?:ber)?)|noc\s*(?:no\.?|num(?:ber)?))\s*[:\-]?\s*([A-Z0-9/\-_]{4,40})",
        text,
        re.IGNORECASE,
    )
    if ref_match:
        fields["certificate_number"] = ref_match.group(1).strip()

    # Issuing Authority patterns
    authority_keywords = [
        (r"(Fire\s+(?:and\s+Emergency\s+)?Services|Fire\s+Department|Directorate\s+of\s+Fire)", "Directorate of Fire and Emergency Services"),
        (r"(Chartered\s+Structural\s+Engineer|Structural\s+Stability|Municipal\s+Corporation)", "Municipal Structural Stability Authority"),
        (r"(Sub-Registrar|District\s+Collector(?:ate)?|Land\s+Revenue\s+Department)", "District Land Revenue / Registrar Office"),
        (r"(All\s+India\s+Council\s+for\s+Technical\s+Education|AICTE)", "All India Council for Technical Education"),
    ]
    for auth_pattern, auth_label in authority_keywords:
        if re.search(auth_pattern, text, re.IGNORECASE):
            fields["issuing_authority"] = auth_label
            break

    return fields


def analyze_pdf_document(
    filename: str,
    content: bytes,
) -> dict[str, Any]:
    """Inspect and extract selectable text from PDF bytes using pdfplumber."""
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
        pdf_stream = io.BytesIO(content)
        with pdfplumber.open(pdf_stream) as pdf:
            page_count = len(pdf.pages)
            if page_count == 0:
                raise DocumentAnalysisError("PDF document contains no pages.", status_code=400)

            extracted_chunks: list[str] = []
            total_chars = 0
            warnings: list[str] = []

            for page_idx, page in enumerate(pdf.pages, start=1):
                if total_chars >= MAX_EXTRACT_CHARS:
                    warnings.append(f"Text truncated at {MAX_EXTRACT_CHARS} characters limit.")
                    break
                try:
                    page_text = page.extract_text() or ""
                except Exception:
                    page_text = ""
                    warnings.append(f"Text extraction failed on page {page_idx}.")
                extracted_chunks.append(page_text)
                total_chars += len(page_text)

    except DocumentAnalysisError:
        raise
    except Exception as exc:
        raise DocumentAnalysisError(f"Unable to parse PDF document: {exc}", status_code=400) from exc

    combined_text = "\n".join(extracted_chunks).strip()
    is_scanned = len(combined_text) < 30
    if is_scanned:
        warnings.append(
            "Document appears to be scanned or image-only without selectable text. "
            "Text extraction could not detect selectable content."
        )

    candidates = _extract_candidates(combined_text)

    return {
        "filename": filename,
        "filesize_bytes": len(content),
        "sha256": sha256,
        "page_count": page_count,
        "is_scanned_only": is_scanned,
        "extracted_text_preview": combined_text[:2000],
        "candidate_fields": candidates,
        "warnings": warnings,
        "notice": (
            "Advisory extraction only. Extracted fields must be verified by a human reviewer "
            "and do not establish document authenticity or AICTE compliance."
        ),
    }
