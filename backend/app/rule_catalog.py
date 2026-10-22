"""Source-governed rule catalogue schemas and a server-side activation gate.

This module defines metadata validation, an attributable review/approval record
and an activation gate. It contains no AICTE regulatory rules, ships no active
rule, and does not evaluate rule logic. Nothing here makes a compliance
decision; a future rule engine must consume only gate-approved rule versions.

Until authoritative applicability and amendment checks are completed, every
actual AICTE rule must stay inactive.
"""
from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

REQUIRED_TEST_CATEGORIES = frozenset({"positive", "negative", "boundary", "exception"})

ACTIVATABLE_LIFECYCLES = frozenset({"draft", "in_review"})


class RuleLifecycle(StrEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


class SourceVerificationStatus(StrEnum):
    UNVERIFIED = "unverified"
    IN_REVIEW = "in_review"
    VERIFIED = "verified"


class ApprovalDecision(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"


class RuleApplicability(BaseModel):
    """Explicit applicability limits for a proposed rule."""

    model_config = ConfigDict(extra="forbid")

    application_types: list[Literal["eoa", "new_program", "intake_change"]] = Field(
        min_length=1
    )
    academic_years: list[str] = Field(min_length=1)
    conditions: list[str] = Field(
        min_length=1,
        description="Plain-language conditions; do not leave conditionality implicit.",
    )


class RuleTestCase(BaseModel):
    """A named expected outcome for rule review and regression tests."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=120)
    category: Literal["positive", "negative", "boundary", "exception"]
    expected_status: str = Field(min_length=1, max_length=80)
    notes: str = Field(min_length=1, max_length=1000)


class SourceProvenance(BaseModel):
    """Exact source identity and human verification state for a proposed rule.

    A source is not "verified" because a URL exists. Verification requires a
    named reviewer, a review date and a recorded document version.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    status: SourceVerificationStatus = SourceVerificationStatus.UNVERIFIED
    document_version: str = Field(
        min_length=1,
        max_length=120,
        description="Exact document/version identifier retrieved from the issuer.",
    )
    retrieved_at: date
    verified_by: str | None = Field(default=None, min_length=3, max_length=120)
    verified_at: date | None = None

    @model_validator(mode="after")
    def require_verification_record(self) -> "SourceProvenance":
        if self.status is SourceVerificationStatus.VERIFIED:
            if not self.verified_by or self.verified_at is None:
                raise ValueError(
                    "A verified source requires verified_by and verified_at"
                )
            if self.verified_at < self.retrieved_at:
                raise ValueError("verified_at must not precede retrieved_at")
        elif self.verified_by is not None or self.verified_at is not None:
            raise ValueError(
                "Verification details require source status 'verified'"
            )
        return self


class ApprovalRecord(BaseModel):
    """An attributable human approval decision; approval is never implied."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    reviewer_id: str = Field(min_length=3, max_length=120)
    decision: ApprovalDecision
    decided_at: date
    rationale: str = Field(min_length=10, max_length=1000)


class RuleVersionDraft(BaseModel):
    """Metadata for a source-backed rule version.

    Activation is blocked until required provenance, approval and test coverage
    are present. The model intentionally does not execute a rule expression.
    """

    model_config = ConfigDict(extra="forbid")

    rule_id: str = Field(pattern=r"^[A-Z][A-Z0-9_]{2,79}$")
    version: int = Field(ge=1)
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=2000)
    source_title: str = Field(min_length=5, max_length=300)
    source_issuer: str = Field(min_length=2, max_length=200)
    source_url: HttpUrl
    source_clause: str = Field(min_length=1, max_length=120)
    source_page: str = Field(min_length=1, max_length=40)
    source_provenance: SourceProvenance
    publication_date: date | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    applicability: RuleApplicability
    interpretation: str = Field(min_length=10, max_length=3000)
    limitations: list[str] = Field(min_length=1)
    reviewer_actions: list[str] = Field(min_length=1)
    test_cases: list[RuleTestCase] = Field(min_length=4)
    approval: ApprovalRecord | None = None
    lifecycle: RuleLifecycle = RuleLifecycle.DRAFT

    @model_validator(mode="after")
    def validate_rule_lifecycle(self) -> "RuleVersionDraft":
        if self.effective_from and self.effective_to:
            if self.effective_to < self.effective_from:
                raise ValueError("effective_to must not precede effective_from")

        if self.approval and self.approval.decided_at < self.source_provenance.retrieved_at:
            raise ValueError("approval.decided_at must not precede the source retrieval date")

        if self.lifecycle == RuleLifecycle.ACTIVE:
            categories = {case.category for case in self.test_cases}
            missing = sorted(REQUIRED_TEST_CATEGORIES - categories)
            if missing:
                raise ValueError(
                    "An active rule requires positive, negative, boundary and "
                    f"exception test cases; missing: {', '.join(missing)}"
                )
            if self.effective_from is None:
                raise ValueError("An active rule requires an effective_from date")
            if self.source_provenance.status is not SourceVerificationStatus.VERIFIED:
                raise ValueError(
                    "An active rule requires a verified source with a named reviewer"
                )
            if self.approval is None:
                raise ValueError("An active rule requires an explicit approval record")
            if self.approval.decision is not ApprovalDecision.APPROVED:
                raise ValueError("An active rule requires an approved decision")
            if (
                self.source_provenance.verified_at is not None
                and self.approval.decided_at < self.source_provenance.verified_at
            ):
                raise ValueError("Approval must not precede source verification")

        return self


class RuleActivationError(ValueError):
    """Raised when a rule version fails the server-side activation gate."""


def activation_requirements(rule: RuleVersionDraft) -> tuple[str, ...]:
    """Return reasons a rule version is not eligible to become executable.

    This check is independent of Pydantic validation so it also catches objects
    built with ``model_construct`` (i.e. validators deliberately bypassed).
    """
    blockers: list[str] = []

    provenance = rule.source_provenance
    if provenance.status is not SourceVerificationStatus.VERIFIED:
        blockers.append("source provenance must be verified before activation")
    elif not provenance.verified_by or provenance.verified_at is None:
        blockers.append("verified source must record verified_by and verified_at")

    approval = rule.approval
    if approval is None:
        blockers.append("an explicit approval record is required before activation")
    else:
        if approval.decision is not ApprovalDecision.APPROVED:
            blockers.append("approval decision must be 'approved' before activation")
        if (
            provenance.verified_at is not None
            and approval.decided_at < provenance.verified_at
        ):
            blockers.append("approval must not precede source verification")

    if rule.effective_from is None:
        blockers.append("an effective_from date is required before activation")
    elif rule.effective_to is not None and rule.effective_to < rule.effective_from:
        blockers.append("effective_to must not precede effective_from")

    categories = {case.category for case in rule.test_cases}
    missing = sorted(REQUIRED_TEST_CATEGORIES - categories)
    if missing:
        blockers.append("missing required test categories: " + ", ".join(missing))

    return tuple(blockers)


def activation_blockers(rule: RuleVersionDraft) -> tuple[str, ...]:
    """Full gate check: lifecycle state transition plus activation requirements."""
    blockers: list[str] = []
    if rule.lifecycle.value not in ACTIVATABLE_LIFECYCLES:
        blockers.append(
            "only draft or in-review rule versions can be activated; an active "
            "lifecycle must be granted by the gate, not asserted by the caller"
        )
    return (*blockers, *activation_requirements(rule))


class RuleRegistry:
    """In-memory registry of gate-approved rule versions.

    The registry deliberately exposes no evaluate/execute method: this
    repository contains no rule evaluator and no active AICTE rules. Activation
    is append-only and one active version per rule ID is permitted; changing a
    rule requires a new reviewed version.
    """

    def __init__(self) -> None:
        self._active: dict[tuple[str, int], RuleVersionDraft] = {}

    def activate(self, rule: RuleVersionDraft) -> RuleVersionDraft:
        """Run the activation gate, then store a detached active snapshot."""
        blockers = activation_blockers(rule)
        if blockers:
            raise RuleActivationError("; ".join(blockers))

        key = (rule.rule_id, rule.version)
        if key in self._active:
            raise RuleActivationError(
                f"rule {rule.rule_id} version {rule.version} is already active"
            )
        for rule_id, version in self._active:
            if rule_id == rule.rule_id:
                raise RuleActivationError(
                    f"rule {rule.rule_id} version {version} is already active; "
                    "supersede it before activating another version"
                )

        active = RuleVersionDraft.model_validate(
            {**rule.model_dump(), "lifecycle": RuleLifecycle.ACTIVE}
        )
        self._active[key] = active
        return active

    def active_rules(self) -> tuple[RuleVersionDraft, ...]:
        return tuple(self._active[key] for key in sorted(self._active))

    def get_active(self, rule_id: str) -> RuleVersionDraft | None:
        for (active_rule_id, _version), rule in self._active.items():
            if active_rule_id == rule_id:
                return rule
        return None

    def __len__(self) -> int:
        return len(self._active)
