import os
from datetime import date, datetime, timezone
from typing import Any, Literal
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .history_store import (
    SupabaseSettings,
    bearer_token,
    require_settings,
    response_rows,
    rest_request,
    verify_user,
)

app = FastAPI(
    title="AICTE Compliance Assistant",
    description=(
        "Prototype for application validation and compliance assistance. "
        "Results are advisory and use synthetic demonstration data."
    ),
    version="0.3.1",
)


def _cors_origins() -> list[str]:
    """Origins the API allows cross-origin requests from.

    Local Vite dev origins are always permitted. Set ``CORS_ALLOW_ORIGINS``
    (comma-separated) in the deployment environment to add the deployed
    frontend origin(s); nothing else is allowed.
    """

    origins = {"http://localhost:5173", "http://127.0.0.1:5173"}
    configured = os.environ.get("CORS_ALLOW_ORIGINS", "")
    for origin in configured.split(","):
        origin = origin.strip().rstrip("/")
        if origin:
            origins.add(origin)
    return sorted(origins)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def _clean_document_names(value: object) -> object:
    """Normalize document identifiers and reject blanks/duplicates."""
    if not isinstance(value, list):
        return value
    if any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError("Document names must be non-empty strings.")
    cleaned = [item.strip() for item in value]
    if len(set(cleaned)) != len(cleaned):
        raise ValueError("Document names must not contain duplicates.")
    return cleaned


class ValidationRequest(BaseModel):
    institution_id: str = Field(min_length=1, max_length=100)
    application_type: Literal["eoa", "new_program", "intake_change"]
    required_documents: list[str] = Field(min_length=1)
    submitted_documents: list[str] = Field(default_factory=list)
    expiry_dates: dict[str, date] = Field(default_factory=dict)

    @field_validator("institution_id")
    @classmethod
    def normalize_institution_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("institution_id must not be blank.")
        return value

    @field_validator("required_documents", "submitted_documents", mode="before")
    @classmethod
    def normalize_document_names(cls, value: object) -> object:
        return _clean_document_names(value)

    @field_validator("expiry_dates", mode="before")
    @classmethod
    def normalize_expiry_date_keys(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        normalized: dict[object, object] = {}
        for key, expiry in value.items():
            if not isinstance(key, str) or not key.strip():
                raise ValueError("Expiry-date document names must be non-empty strings.")
            clean_key = key.strip()
            if clean_key in normalized:
                raise ValueError("Expiry-date document names must not contain duplicates.")
            normalized[clean_key] = expiry
        return normalized


class HealthResponse(BaseModel):
    """Response of ``GET /health``. Both values are fixed."""

    status: Literal["ok"]
    service: Literal["aicte-compliance-assistant"]


class Finding(BaseModel):
    """One preliminary-check finding.

    ``evidence`` is code-specific: ``MISSING_DOCUMENT`` carries
    ``{source, observed}``; ``DOCUMENT_EXPIRED`` carries
    ``{source, expiry_date, evaluation_date}``.
    """

    code: Literal["MISSING_DOCUMENT", "DOCUMENT_EXPIRED"]
    document_type: str
    message: str
    evidence: dict[str, str]


class ValidationResponse(BaseModel):
    """Response of ``POST /api/v1/validate`` — a preliminary checklist result.

    ``preliminary_checks_passed`` means the caller-supplied document lists agree.
    It is **not** a compliance, eligibility or authenticity finding: this service
    loads no AICTE checklist and no rule set.
    """

    institution_id: str
    application_type: Literal["eoa", "new_program", "intake_change"]
    status: Literal["attention_required", "preliminary_checks_passed"]
    validation_scope: Literal["caller_supplied_checklist_only"]
    missing_documents: list[str]
    expired_documents: list[str]
    findings: list[Finding]
    checked_at: str
    source: Literal["synthetic_demo_input"]
    notice: str


class InstitutionAccess(BaseModel):
    id: UUID
    external_ref: str
    display_name: str
    role: Literal["applicant", "reviewer", "institution_admin"]


class SavedValidationRun(BaseModel):
    id: UUID
    institution_id: str
    institution_name: str
    application_type: Literal["eoa", "new_program", "intake_change"]
    created_at: datetime
    checked_at: datetime
    expires_at: datetime
    request: ValidationRequest
    result: ValidationResponse


class SavedValidationRunPage(BaseModel):
    items: list[SavedValidationRun]
    has_more: bool


async def _supabase_client():
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        yield client


async def _authenticated_context(
    authorization: str | None = Header(default=None),
    client: httpx.AsyncClient = Depends(_supabase_client),
) -> tuple[SupabaseSettings, str, UUID, httpx.AsyncClient]:
    settings = require_settings()
    token = bearer_token(authorization)
    user_id = await verify_user(client, settings, token)
    return settings, token, user_id, client


def _saved_run(row: dict[str, Any]) -> SavedValidationRun:
    try:
        institution = row["institutions"]
        if isinstance(institution, list):
            institution = institution[0]
        return SavedValidationRun(
            id=row["id"],
            institution_id=institution["external_ref"],
            institution_name=institution["display_name"],
            application_type=row["application_type"],
            created_at=row["created_at"],
            checked_at=row["checked_at"],
            expires_at=row["expires_at"],
            request=ValidationRequest.model_validate(row["request_snapshot"]),
            result=ValidationResponse.model_validate(row["response_snapshot"]),
        )
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Stored history record is invalid.") from exc


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="aicte-compliance-assistant")


@app.post("/api/v1/validate", response_model=ValidationResponse)
def validate_application(request: ValidationRequest) -> ValidationResponse:
    return _validate_application(request)


def _validate_application(request: ValidationRequest) -> ValidationResponse:
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

    return ValidationResponse(
        institution_id=request.institution_id,
        application_type=request.application_type,
        status=(
            "attention_required" if needs_attention else "preliminary_checks_passed"
        ),
        validation_scope="caller_supplied_checklist_only",
        missing_documents=missing,
        expired_documents=expired,
        findings=[Finding(**finding) for finding in findings],
        checked_at=datetime.now(timezone.utc).isoformat(),
        source="synthetic_demo_input",
        notice=(
            "Preliminary validation only. This endpoint evaluates only the "
            "checklist and dates supplied in the request; it does not load an "
            "authoritative AICTE ruleset. A passing result does not establish "
            "regulatory compliance or document authenticity. Expiry checks "
            "use supplied dates and require appropriate review."
        ),
    )


@app.get("/api/v1/institutions", response_model=list[InstitutionAccess])
async def list_institutions(
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[InstitutionAccess]:
    settings, token, user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "institution_memberships",
        params={
            "select": "institution_id,role,institutions(id,external_ref,display_name)",
            "user_id": f"eq.{user_id}",
            "order": "institutions(display_name).asc",
        },
    )
    rows = response_rows(response)
    result: list[InstitutionAccess] = []
    for row in rows:
        institution = row.get("institutions")
        if isinstance(institution, list):
            institution = institution[0] if institution else None
        if not isinstance(institution, dict):
            continue
        try:
            result.append(InstitutionAccess(**institution, role=row["role"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=503, detail="Institution access data is invalid.") from exc
    return result


@app.post("/api/v1/validation-runs", response_model=SavedValidationRun, status_code=201)
async def create_validation_run(
    request: ValidationRequest,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> SavedValidationRun:
    settings, token, user_id, client = context
    institution_response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "institution_memberships",
        params={
            "select": "role,institutions(id,external_ref,display_name)",
            "user_id": f"eq.{user_id}",
        },
    )
    membership_rows = response_rows(institution_response)
    institutions = []
    for membership in membership_rows:
        institution = membership.get("institutions")
        if isinstance(institution, list):
            institution = institution[0] if institution else None
        if isinstance(institution, dict) and institution.get("external_ref") == request.institution_id:
            institutions.append(institution)
    if not institutions:
        raise HTTPException(status_code=404, detail="Institution access is not provisioned for this account.")

    institution_id = institutions[0].get("id")
    if not institution_id:
        raise HTTPException(status_code=503, detail="Institution access data is invalid.")
    validation = _validate_application(request)
    insert_response = await rest_request(
        client,
        settings,
        token,
        "POST",
        "validation_runs",
        body={
            "institution_id": institution_id,
            "created_by": str(user_id),
            "application_type": request.application_type,
            "validation_scope": validation.validation_scope,
            "request_snapshot": request.model_dump(mode="json"),
            "response_snapshot": validation.model_dump(mode="json"),
            "ruleset_snapshot": [],
        },
        prefer="return=representation",
    )
    rows = response_rows(insert_response)
    if not rows:
        raise HTTPException(status_code=403, detail="This account cannot save history for the selected institution.")
    row = rows[0]
    row["institutions"] = institutions[0]
    return _saved_run(row)


@app.get("/api/v1/validation-runs", response_model=SavedValidationRunPage)
async def list_validation_runs(
    limit: int = Query(default=25, ge=1, le=50),
    offset: int = Query(default=0, ge=0, le=100000),
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> SavedValidationRunPage:
    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "validation_runs",
        params={
            "select": "id,institution_id,application_type,created_at,checked_at,expires_at,request_snapshot,response_snapshot,institutions(external_ref,display_name)",
            "order": "created_at.desc,id.desc",
            "limit": str(limit + 1),
            "offset": str(offset),
        },
    )
    rows = response_rows(response)
    has_more = len(rows) > limit
    return SavedValidationRunPage(items=[_saved_run(row) for row in rows[:limit]], has_more=has_more)


@app.get("/api/v1/validation-runs/{run_id}", response_model=SavedValidationRun)
async def get_validation_run(
    run_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> SavedValidationRun:
    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "validation_runs",
        params={
            "select": "id,institution_id,application_type,created_at,checked_at,expires_at,request_snapshot,response_snapshot,institutions(external_ref,display_name)",
            "id": f"eq.{run_id}",
            "limit": "1",
        },
    )
    rows = response_rows(response)
    if not rows:
        raise HTTPException(status_code=404, detail="Validation history record was not found.")
    return _saved_run(rows[0])


@app.delete("/api/v1/validation-runs/{run_id}", status_code=204)
async def delete_validation_run(
    run_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> None:
    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "DELETE",
        "validation_runs",
        params={"id": f"eq.{run_id}", "select": "id"},
        prefer="return=representation",
    )
    rows = response_rows(response)
    if not rows:
        raise HTTPException(status_code=404, detail="Validation history record was not found.")
