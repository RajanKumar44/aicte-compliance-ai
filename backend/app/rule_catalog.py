"""Source-governed rule catalogue schemas.

This module defines metadata and lifecycle validation only. It does not contain
or activate any AICTE regulatory rules and does not execute user-supplied logic.
"""
from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class RuleLifecycle(StrEnum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


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


class RuleVersionDraft(BaseModel):
    """Metadata for a source-backed rule version.

    Activation is blocked until required provenance and test coverage are present.
    The model intentionally does not execute a rule expression.
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
    publication_date: date | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    applicability: RuleApplicability
    interpretation: str = Field(min_length=10, max_length=3000)
    limitations: list[str] = Field(min_length=1)
    reviewer_actions: list[str] = Field(min_length=1)
    test_cases: list[RuleTestCase] = Field(min_length=4)
    lifecycle: RuleLifecycle = RuleLifecycle.DRAFT

    @model_validator(mode="after")
    def validate_rule_lifecycle(self) -> "RuleVersionDraft":
        if self.effective_from and self.effective_to:
            if self.effective_to < self.effective_from:
                raise ValueError("effective_to must not precede effective_from")

        if self.lifecycle == RuleLifecycle.ACTIVE:
            categories = {case.category for case in self.test_cases}
            required = {"positive", "negative", "boundary", "exception"}
            if not required.issubset(categories):
                missing = sorted(required - categories)
                raise ValueError(
                    "An active rule requires positive, negative, boundary and "
                    f"exception test cases; missing: {', '.join(missing)}"
                )
            if self.effective_from is None:
                raise ValueError("An active rule requires an effective_from date")

        return self
