from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="AICTE Compliance Assistant",
    description=(
        "Prototype for application validation and compliance assistance. "
        "Results are advisory and use synthetic demonstration data."
    ),
    version="0.1.0",
)


class ValidationRequest(BaseModel):
    institution_id: str = Field(min_length=1, max_length=100)
    application_type: Literal["eoa", "new_program", "intake_change"]
    required_documents: list[str] = Field(default_factory=list)
    submitted_documents: list[str] = Field(default_factory=list)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "aicte-compliance-assistant"}


@app.post("/api/v1/validate")
def validate_application(request: ValidationRequest) -> dict:
    required = set(request.required_documents)
    submitted = set(request.submitted_documents)
    missing = sorted(required - submitted)

    return {
        "institution_id": request.institution_id,
        "application_type": request.application_type,
        "status": "attention_required" if missing else "checklist_complete",
        "missing_documents": missing,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "source": "synthetic_demo_input",
        "notice": (
            "Preliminary checklist only. This result does not establish "
            "regulatory compliance or document authenticity."
        ),
    }
