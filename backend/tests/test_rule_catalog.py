import pytest
from pydantic import ValidationError

from backend.app.rule_catalog import RuleLifecycle, RuleVersionDraft


def valid_rule_payload():
    return {
        "rule_id": "TEST_DOCUMENT_RULE",
        "version": 1,
        "title": "Synthetic source-backed test rule",
        "description": "A synthetic rule used to test catalogue validation only.",
        "source_title": "Synthetic Regulatory Source for Tests",
        "source_issuer": "Synthetic Test Authority",
        "source_url": "https://example.org/test-source",
        "source_clause": "Section 1",
        "source_page": "1",
        "effective_from": "2026-01-01",
        "applicability": {
            "application_types": ["eoa"],
            "academic_years": ["2026-27"],
            "conditions": ["Synthetic test condition applies."],
        },
        "interpretation": "This synthetic interpretation is not an AICTE requirement.",
        "limitations": ["Synthetic test only; not an official regulatory rule."],
        "reviewer_actions": ["Inspect the synthetic finding."],
        "test_cases": [
            {
                "name": "Positive synthetic case",
                "category": "positive",
                "expected_status": "passed",
                "notes": "Synthetic expected outcome.",
            },
            {
                "name": "Negative synthetic case",
                "category": "negative",
                "expected_status": "attention_required",
                "notes": "Synthetic expected outcome.",
            },
            {
                "name": "Boundary synthetic case",
                "category": "boundary",
                "expected_status": "human_review_required",
                "notes": "Synthetic expected outcome.",
            },
            {
                "name": "Exception synthetic case",
                "category": "exception",
                "expected_status": "not_applicable",
                "notes": "Synthetic expected outcome.",
            },
        ],
    }


def test_rule_defaults_to_draft():
    rule = RuleVersionDraft.model_validate(valid_rule_payload())

    assert rule.lifecycle == RuleLifecycle.DRAFT
    assert rule.rule_id == "TEST_DOCUMENT_RULE"


def test_active_rule_requires_all_test_categories():
    payload = valid_rule_payload()
    payload["lifecycle"] = "active"
    payload["test_cases"] = payload["test_cases"][:2]

    with pytest.raises(ValidationError):
        RuleVersionDraft.model_validate(payload)


def test_active_rule_requires_effective_from():
    payload = valid_rule_payload()
    payload["lifecycle"] = "active"
    payload["effective_from"] = None

    with pytest.raises(ValidationError):
        RuleVersionDraft.model_validate(payload)


def test_effective_to_cannot_precede_effective_from():
    payload = valid_rule_payload()
    payload["effective_from"] = "2026-05-01"
    payload["effective_to"] = "2026-04-30"

    with pytest.raises(ValidationError):
        RuleVersionDraft.model_validate(payload)


def test_unknown_fields_are_rejected():
    payload = valid_rule_payload()
    payload["execute_python"] = "print('unsafe')"

    with pytest.raises(ValidationError):
        RuleVersionDraft.model_validate(payload)
