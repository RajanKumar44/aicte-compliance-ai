from __future__ import annotations

import hashlib

import pytest

from backend.app.ocr_adapter import OCRDocumentResult, OCRField, parse_iso_date_candidate


def test_field_accepts_valid_confidence_and_page_provenance():
    field = OCRField(value="2026-01-31", confidence=0.91, page_number=2, evidence_text="Date: 2026-01-31")
    assert field.confidence == 0.91
    assert field.page_number == 2


@pytest.mark.parametrize("confidence", [-0.01, 1.01])
def test_field_rejects_out_of_range_confidence(confidence):
    with pytest.raises(ValueError, match="confidence"):
        OCRField(value="value", confidence=confidence)


@pytest.mark.parametrize("page_number", [0, -1])
def test_field_rejects_invalid_page_number(page_number):
    with pytest.raises(ValueError, match="page_number"):
        OCRField(value="value", confidence=0.5, page_number=page_number)


def test_field_rejects_blank_extracted_value():
    with pytest.raises(ValueError, match="non-blank"):
        OCRField(value="  ", confidence=0.5)


def test_result_requires_named_engine_and_human_review():
    with pytest.raises(ValueError, match="engine"):
        OCRDocumentResult(fields={}, engine=" ")
    with pytest.raises(ValueError, match="human review"):
        OCRDocumentResult(fields={}, engine="synthetic", requires_human_review=False)


def test_result_validates_optional_source_sha256():
    digest = hashlib.sha256(b"synthetic-only").hexdigest()
    assert OCRDocumentResult(fields={}, engine="test-engine", source_sha256=digest).source_sha256 == digest
    with pytest.raises(ValueError, match="SHA-256"):
        OCRDocumentResult(fields={}, engine="test-engine", source_sha256="not-a-hash")


@pytest.mark.parametrize(
    ("candidate", "expected"),
    [
        ("2026-01-31", True),
        (" 2026-01-31 ", True),
        ("31/01/2026", False),
        ("01/31/2026", False),
        ("2026-02-30", False),
        ("", False),
        (None, False),
        ("2026-1-01", False),
    ],
)
def test_date_candidate_parser_never_guesses_ambiguous_formats(candidate, expected):
    result = parse_iso_date_candidate(candidate)
    assert (result is not None) is expected
    if result:
        assert result.isoformat() == "2026-01-31"
