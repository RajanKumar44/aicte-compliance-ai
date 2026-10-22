"""Regression tests for the server-side rule activation gate.

All rules here are synthetic test fixtures. No AICTE rule is defined, activated
or evaluated by this repository.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from backend.app.rule_catalog import (
    RuleActivationError,
    RuleLifecycle,
    RuleRegistry,
    RuleVersionDraft,
)

APP_DIR = Path(__file__).resolve().parents[1] / "app"


def _payload():
    from backend.tests.test_rule_catalog import valid_rule_payload

    return valid_rule_payload()


def _in_review_rule():
    return RuleVersionDraft.model_validate({**_payload(), "lifecycle": "in_review"})


def test_registry_starts_empty_and_has_no_evaluator():
    registry = RuleRegistry()

    assert registry.active_rules() == ()
    assert len(registry) == 0
    for forbidden in ("evaluate", "execute", "run"):
        assert not hasattr(registry, forbidden)


def test_no_rule_instances_are_defined_in_application_code():
    """Guard against shipping a real (or self-declared active) rule by accident."""
    offenders: list[str] = []
    for path in APP_DIR.glob("*.py"):
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            if line.lstrip().startswith("class "):
                continue
            if re.search(r"\bRuleVersionDraft\s*\(", line):
                offenders.append(f"{path.name}:{number}")

    assert offenders == []


def test_gate_activates_only_reviewed_verified_approved_rule():
    registry = RuleRegistry()
    rule = _in_review_rule()

    active = registry.activate(rule)

    assert active.lifecycle is RuleLifecycle.ACTIVE
    assert registry.get_active("TEST_DOCUMENT_RULE") is active
    assert [item.version for item in registry.active_rules()] == [1]


def test_gate_rejects_self_declared_active_lifecycle():
    registry = RuleRegistry()
    active_payload = {**_payload(), "lifecycle": "active"}
    already_active = RuleVersionDraft.model_validate(active_payload)

    with pytest.raises(RuleActivationError, match="draft or in-review"):
        registry.activate(already_active)
    assert len(registry) == 0


def test_gate_rejects_rule_with_unverified_source_even_if_validators_bypassed():
    registry = RuleRegistry()
    rule = _in_review_rule()
    tampered = rule.model_copy(
        update={
            "source_provenance": rule.source_provenance.model_copy(
                update={
                    "status": "unverified",
                    "verified_by": None,
                    "verified_at": None,
                }
            )
        }
    )

    with pytest.raises(RuleActivationError, match="verified"):
        registry.activate(tampered)
    assert len(registry) == 0


def test_gate_rejects_rule_without_approval_even_if_validators_bypassed():
    registry = RuleRegistry()
    rule = _in_review_rule()
    unapproved = rule.model_copy(update={"approval": None})

    with pytest.raises(RuleActivationError, match="approval record"):
        registry.activate(unapproved)
    assert len(registry) == 0


def test_gate_rejects_rejected_approval_decision():
    registry = RuleRegistry()
    rule = _in_review_rule()
    rejected = rule.model_copy(
        update={"approval": rule.approval.model_copy(update={"decision": "rejected"})}
    )

    with pytest.raises(RuleActivationError, match="approved"):
        registry.activate(rejected)
    assert len(registry) == 0


def test_gate_rejects_missing_effective_date():
    registry = RuleRegistry()
    rule = _in_review_rule().model_copy(update={"effective_from": None})

    with pytest.raises(RuleActivationError, match="effective_from"):
        registry.activate(rule)


def test_gate_rejects_incomplete_test_coverage():
    registry = RuleRegistry()
    rule = _in_review_rule()
    rule = rule.model_copy(update={"test_cases": rule.test_cases[:3]})

    with pytest.raises(RuleActivationError, match="exception"):
        registry.activate(rule)


def test_gate_refuses_duplicate_active_version():
    registry = RuleRegistry()
    registry.activate(_in_review_rule())

    with pytest.raises(RuleActivationError, match="already active"):
        registry.activate(_in_review_rule())

    assert len(registry) == 1


def test_gate_refuses_second_active_version_of_same_rule():
    registry = RuleRegistry()
    registry.activate(_in_review_rule())

    payload = {**_payload(), "version": 2, "lifecycle": "in_review"}
    second_version = RuleVersionDraft.model_validate(payload)

    with pytest.raises(RuleActivationError, match="supersede"):
        registry.activate(second_version)

    assert [rule.version for rule in registry.active_rules()] == [1]


def test_gate_activates_rejected_draft_only_after_approval_changes_to_new_version():
    registry = RuleRegistry()
    rejected = RuleVersionDraft.model_validate(
        {
            **_payload(),
            "lifecycle": "in_review",
            "approval": {
                **_payload()["approval"],
                "decision": "rejected",
            },
        }
    )

    with pytest.raises(RuleActivationError):
        registry.activate(rejected)

    approved_v2 = RuleVersionDraft.model_validate(
        {**_payload(), "version": 2, "lifecycle": "in_review"}
    )
    active = registry.activate(approved_v2)

    assert active.version == 2
    assert registry.get_active("TEST_DOCUMENT_RULE").version == 2
