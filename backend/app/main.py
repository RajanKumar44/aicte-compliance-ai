from datetime import date, datetime, timezone
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="AICTE Compliance Assistant",
    description=(
        "Prototype for application validation and compliance assistance. "
        "Results are advisory and use synthetic demonstration data."
    ),
    version="0.3.0",
)


class ValidationRequest(BaseModel):
    institution_id: str = Field(min_length=1, max_length=100)
    application_type: Literal["eoa", "new_program", "intake_change"]
    required_documents: list[str] = Field(min_length=1)
    submitted_documents: list[str] = Field(default_factory=list)
    expiry_dates: dict[str, date] = Field(default_factory=dict)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "aicte-compliance-assistant",
    }


@app.post("/api/v1/validate")
def validate_application(request: ValidationRequest) -> dict:
    required = set(request.required_documents)
    submitted = set(request.submitted_documents)

    missing = sorted(required - submitted)
    today = datetime.now(timezone.utc).date()

    expired = sorted(
        document
        for document in submitted
        if document in request.expiry_dates
        and request.expiry_dates[document] < today
    )

    findings = []

    for document in missing:
        findings.append({
            "code": "MISSING_DOCUMENT",
            "document_type": document,
            "message": f"Required document '{document}' was not submitted.",
            "evidence": {
                "source": "submitted_document_list",
                "observed": "not_submitted",
            },
        })

    for document in expired:
        expiry_date = request.expiry_dates[document]
        findings.append({
            "code": "DOCUMENT_EXPIRED",
            "document_type": document,
            "message": (
                f"Document expiry date {expiry_date.isoformat()} "
                f"is before the evaluation date {today.isoformat()}."
            ),
            "evidence": {
                "source": "synthetic_demo_input",
                "expiry_date": expiry_date.isoformat(),
                "evaluation_date": today.isoformat(),
            },
        })

    needs_attention = bool(missing or expired)

    return {
        "institution_id": request.institution_id,
        "application_type": request.application_type,
        "status": (
            "attention_required"
            if needs_attention
            else "preliminary_checks_passed"
        ),
        "validation_scope": "caller_supplied_checklist_only",
        "missing_documents": missing,
        "expired_documents": expired,
        "findings": findings,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "source": "synthetic_demo_input",
        "notice": (
            "Preliminary validation only. This endpoint evaluates only the "
            "checklist and dates supplied in the request; it does not load an "
            "authoritative AICTE ruleset. A passing result does not establish "
            "regulatory compliance or document authenticity. Expiry checks "
            "use supplied dates and require appropriate review."
        ),
    }
