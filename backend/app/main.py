import os
from datetime import UTC, date, datetime
from typing import Any, Literal
from uuid import UUID, uuid4

import httpx
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .action_planner import router as action_planner_router
from .antivirus_scanner import is_download_permitted
from .application_service import (
    build_checklist,
    generate_application_findings,
    overall_application_status,
    report_payload,
)
from .document_analyzer import DocumentAnalysisError, analyze_pdf_document
from .history_store import (
    SupabaseSettings,
    _headers,
    bearer_token,
    require_settings,
    response_rows,
    rest_request,
    verify_user,
)
from .notifications import router as notifications_router
from .regulatory_impact import router as regulatory_impact_router

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


app.include_router(action_planner_router)
app.include_router(regulatory_impact_router)
app.include_router(notifications_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
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


class VersionResponse(BaseModel):
    service: str = "aicte-compliance-assistant"
    version: str = "0.5.0"
    environment: str = "production"
    commit_sha: str = "unknown"
    build_time: str = ""


@app.get("/version", response_model=VersionResponse)
def get_version() -> VersionResponse:
    commit_sha = (
        os.getenv("VERCEL_GIT_COMMIT_SHA")
        or os.getenv("RENDER_GIT_COMMIT")
        or os.getenv("GIT_COMMIT_SHA")
        or os.getenv("GITHUB_SHA")
        or "dev-local"
    )
    environment = (
        os.getenv("VERCEL_ENV")
        or os.getenv("RENDER_ENV")
        or os.getenv("ENVIRONMENT")
        or "production"
    )
    build_time = os.getenv("BUILD_TIMESTAMP") or datetime.now(UTC).isoformat()
    return VersionResponse(
        service="aicte-compliance-assistant",
        version="0.5.0",
        environment=environment,
        commit_sha=commit_sha,
        build_time=build_time,
    )


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="aicte-compliance-assistant")


class MeResponse(BaseModel):
    authenticated: bool
    user_id: str
    email: str | None = None
    role: str = "applicant"
    institution_id: str | None = None
    institution_name: str | None = None
    membership_verified: bool = False
    database_memberships: list[dict[str, Any]] = Field(default_factory=list)
    email_confirmed_at: str | None = None
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    server_verified_at: str
    auth_provider: str = "supabase"


@app.get("/api/v1/me", response_model=MeResponse, tags=["Authentication"])
async def get_current_user_profile(
    authorization: str | None = Header(default=None),
    client: httpx.AsyncClient = Depends(_supabase_client),
) -> MeResponse:
    """Sanity-check endpoint reporting server-verified identity from Supabase Auth and database RLS.

    Returns the genuine identity that backend endpoints and Row Level Security see.
    Rejects missing, fake or expired bearer tokens with HTTP 401.
    """
    settings = require_settings()
    token = bearer_token(authorization)
    try:
        response = await client.get(
            f"{settings.url}/auth/v1/user",
            headers=_headers(settings, token),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable.") from exc

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=401,
            detail="Session token was rejected by Supabase Auth server. Session is expired, fake, or invalid.",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail="Authentication service returned an unexpected error verifying this session.",
        )

    user_data = response.json()
    user_id = str(user_data.get("id"))
    email = user_data.get("email")
    email_confirmed_at = user_data.get("email_confirmed_at") or user_data.get("confirmed_at")
    user_metadata = user_data.get("user_metadata") or {}
    app_metadata = user_data.get("app_metadata") or {}

    role = user_metadata.get("role", "applicant")
    institution_id = user_metadata.get("institution_id")
    institution_name = user_metadata.get("institution_name")
    database_memberships: list[dict[str, Any]] = []
    membership_verified = False

    try:
        mem_resp = await rest_request(
            client,
            settings,
            token,
            "GET",
            "institution_memberships?select=role,created_at,institutions(id,external_ref,display_name)",
        )
        if mem_resp.status_code == 200:
            rows = mem_resp.json()
            if isinstance(rows, list) and len(rows) > 0:
                database_memberships = rows
                membership_verified = True
                first_row = rows[0]
                role = first_row.get("role") or role
                inst = first_row.get("institutions")
                if isinstance(inst, dict):
                    institution_id = inst.get("external_ref") or inst.get("id") or institution_id
                    institution_name = inst.get("display_name") or institution_name
                elif isinstance(inst, list) and len(inst) > 0:
                    institution_id = inst[0].get("external_ref") or inst[0].get("id") or institution_id
                    institution_name = inst[0].get("display_name") or institution_name
    except (httpx.HTTPError, HTTPException, KeyError, TypeError, ValueError):
        # Best-effort database membership retrieval
        database_memberships = []

    return MeResponse(
        authenticated=True,
        user_id=user_id,
        email=email,
        role=role,
        institution_id=institution_id,
        institution_name=institution_name,
        membership_verified=membership_verified,
        database_memberships=database_memberships,
        email_confirmed_at=email_confirmed_at,
        user_metadata=user_metadata,
        app_metadata=app_metadata,
        server_verified_at=datetime.now(UTC).isoformat(),
        auth_provider="supabase",
    )


@app.post("/api/v1/validate", response_model=ValidationResponse)
def validate_application(request: ValidationRequest) -> ValidationResponse:
    return _validate_application(request)


def _validate_application(request: ValidationRequest) -> ValidationResponse:
    required = set(request.required_documents)
    submitted = set(request.submitted_documents)

    missing = sorted(required - submitted)
    today = datetime.now(UTC).date()

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
        checked_at=datetime.now(UTC).isoformat(),
        source="synthetic_demo_input",
        notice=(
            "Preliminary validation only. This endpoint evaluates only the "
            "checklist and dates supplied in the request; it does not load an "
            "authoritative AICTE ruleset. A passing result does not establish "
            "regulatory compliance or document authenticity. Expiry checks "
            "use supplied dates and require appropriate review."
        ),
    )


class AnalyzedField(BaseModel):
    value: str | None
    confidence: float | None = None
    page_number: int | None = None
    evidence_text: str | None = None


class CandidateFields(BaseModel):
    expiry_date: str | None = None
    issue_date: str | None = None
    certificate_number: str | None = None
    issuing_authority: str | None = None


class DocumentAnalysisResponse(BaseModel):
    filename: str
    filesize_bytes: int = 0
    sha256: str
    page_count: int
    is_scanned_only: bool = False
    extracted_text: str = ""
    extracted_text_preview: str = ""
    fields: dict[str, AnalyzedField] = Field(default_factory=dict)
    candidate_fields: CandidateFields = Field(default_factory=CandidateFields)
    scan_status: Literal["clean", "infected", "scan_unavailable"] = "scan_unavailable"
    scan_details: str = ""
    ocr_status: Literal["completed", "not_needed", "unavailable"] = "not_needed"
    warnings: list[str] = Field(default_factory=list)
    requires_human_review: bool = True
    notice: str


@app.post("/api/v1/documents/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(
    file: UploadFile = File(...),
    _context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> DocumentAnalysisResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
    if file.size is not None and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MiB processing limit.")
    content = await file.read()
    try:
        result = analyze_pdf_document(file.filename, content)
        fields = result.get("fields", {})
        result["filesize_bytes"] = len(content)
        result["extracted_text_preview"] = result.get("extracted_text", "")
        result["is_scanned_only"] = len(result.get("extracted_text", "").strip()) < 30
        result["candidate_fields"] = {
            "expiry_date": fields.get("expiry_date", {}).get("value"),
            "issue_date": fields.get("issue_date", {}).get("value"),
            "certificate_number": fields.get("certificate_number", {}).get("value"),
            "issuing_authority": fields.get("issuing_authority", {}).get("value"),
        }
        return DocumentAnalysisResponse(**result)
    except DocumentAnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


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
            "checked_at": validation.checked_at,
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


class StoredDocumentUpdate(BaseModel):
    document_type: str | None = None
    extracted_metadata: dict[str, Any] | None = None

class StoredDocument(BaseModel):
    id: UUID
    institution_id: UUID
    uploaded_by: UUID
    filename: str
    filesize_bytes: int
    sha256: str
    storage_path: str
    document_type: str
    extracted_metadata: dict[str, Any] = Field(default_factory=dict)
    scan_status: str
    scan_details: str
    created_at: str
    expires_at: str | None = None
    application_link: dict[str, Any] | None = Field(default=None)


@app.post("/api/v1/documents", response_model=StoredDocument, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    institution_id: UUID | None = Form(None),
    institution_external_ref: str | None = Form(None),
    application_id: UUID | None = Form(None),
    checklist_item_id: str | None = Form(None),
    document_type: str = Form("statutory_clearance"),
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> StoredDocument:
    settings, token, user_id, client = context
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")
    if file.size is not None and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MiB processing limit.")
    content = await file.read()

    try:
        analysis = analyze_pdf_document(file.filename, content)
    except DocumentAnalysisError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    # Look up institution memberships for current user
    membership_res = await rest_request(
        client,
        settings,
        token,
        "GET",
        "institution_memberships",
        params={
            "select": "role,institution_id,institutions(id,external_ref,display_name)",
            "user_id": f"eq.{user_id}",
        },
    )
    memberships = response_rows(membership_res)
    target_inst_id: UUID | str | None = None
    application_rows: list[dict[str, Any]] = []

    if application_id:
        app_res = await rest_request(
            client, settings, token, "GET", "applications",
            params={
                "select": "id,institution_id,institution_external_ref,status",
                "id": f"eq.{application_id}",
                "limit": "1",
            },
        )
        application_rows = response_rows(app_res)
        if not application_rows:
            raise HTTPException(status_code=404, detail="Application was not found or access denied.")
        application_institution_id = str(application_rows[0].get("institution_id"))
        if institution_id and str(institution_id) != application_institution_id:
            raise HTTPException(status_code=403, detail="Application does not belong to the selected institution.")
        if not any(str(m.get("institution_id")) == application_institution_id for m in memberships):
            raise HTTPException(status_code=403, detail="You do not have active membership permissions for the application institution.")
        target_inst_id = application_institution_id
    elif institution_id:
        for m in memberships:
            if str(m.get("institution_id")) == str(institution_id):
                target_inst_id = institution_id
                break
    elif institution_external_ref:
        for m in memberships:
            inst = m.get("institutions")
            if isinstance(inst, list):
                inst = inst[0] if inst else None
            if isinstance(inst, dict) and inst.get("external_ref") == institution_external_ref:
                target_inst_id = inst.get("id")
                break
    else:
        if memberships:
            target_inst_id = memberships[0].get("institution_id")

    if not target_inst_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have active membership permissions for the target institution.",
        )

    clean_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ").strip() or "document.pdf"
    doc_id = uuid4()
    storage_path = f"{target_inst_id}/{user_id}/{doc_id}_{clean_filename}"

    # Save the PDF to the private production vault before inserting metadata.
    try:
        storage_url = f"{settings.url}/storage/v1/object/institution-documents/{storage_path}"
        storage_res = await client.post(
            storage_url,
            content=content,
            headers={
                "apikey": settings.anon_key,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/pdf",
            },
        )
        if storage_res.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Document content could not be saved to secure storage.")
    except (httpx.HTTPError, OSError) as exc:
        raise HTTPException(status_code=503, detail="Document storage is unavailable.") from exc

    doc_row = {
        "institution_id": str(target_inst_id),
        "uploaded_by": str(user_id),
        "original_filename": clean_filename,
        "content_type": "application/pdf",
        "size_bytes": len(content),
        "sha256": analysis["sha256"],
        "storage_path": storage_path,
        "document_type": document_type,
        "extracted_metadata": analysis,
        # Never elevate an analyzer result into a trusted malware scan result.
        "scan_status": "scan_unavailable",
        "scan_detail": analysis.get("scan_details", "Antivirus scan status is unavailable."),
    }

    insert_res = await rest_request(
        client,
        settings,
        token,
        "POST",
        "document_versions",
        body=doc_row,
        prefer="return=representation",
    )
    try:
        rows = response_rows(insert_res)
    except HTTPException:
        try:
            await client.delete(
                f"{settings.url}/storage/v1/object/institution-documents/{storage_path}",
                headers={"apikey": settings.anon_key, "Authorization": f"Bearer {token}"},
            )
        except (httpx.HTTPError, OSError):
            # Keep the primary persistence failure visible; storage cleanup is best effort.
            pass
        raise
    if not rows:
        raise HTTPException(status_code=403, detail="Unable to record document metadata in institution vault.")
    stored_doc = {
        "id": rows[0]["id"],
        "institution_id": rows[0]["institution_id"],
        "uploaded_by": rows[0]["uploaded_by"],
        "filename": rows[0].get("original_filename", clean_filename),
        "filesize_bytes": rows[0].get("size_bytes", len(content)),
        "sha256": rows[0]["sha256"],
        "storage_path": rows[0]["storage_path"],
        "document_type": rows[0].get("document_type", document_type),
        "extracted_metadata": rows[0].get("extracted_metadata", analysis),
        "scan_status": rows[0].get("scan_status", "scan_unavailable"),
        "scan_details": rows[0].get("scan_detail", ""),
        "created_at": rows[0]["created_at"],
        "expires_at": None,
    }

    # Optional: link the new document to a pending application.
    if application_id:
        if not application_rows or str(application_rows[0].get("institution_id")) != str(stored_doc["institution_id"]):
            raise HTTPException(status_code=403, detail="Application does not belong to this institution.")
        link_row = {
            "application_id": application_id,
            "document_id": stored_doc["id"],
            "checklist_item_id": checklist_item_id,
            "uploaded_by": str(user_id),
        }
        link_res = await rest_request(
            client, settings, token, "POST", "application_documents",
            body=link_row, prefer="return=representation",
        )
        link_rows = response_rows(link_res)
        if not link_rows:
            raise HTTPException(status_code=403, detail="Unable to link the document to the application.")
        await rest_request(
            client, settings, token, "POST", "application_audit_events",
            body={
                "application_id": application_id,
                "user_id": str(user_id),
                "action": "document_linked",
                "detail": {
                    "document_id": stored_doc["id"],
                    "filename": stored_doc["filename"],
                    "checklist_item_id": checklist_item_id,
                },
            },
            prefer="return=minimal",
        )
        stored_doc["application_link"] = link_rows[0]

    return StoredDocument(**stored_doc)


@app.get("/api/v1/documents", response_model=list[StoredDocument])
async def list_documents(
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[StoredDocument]:
    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "document_versions",
        params={
            "select": "id,institution_id,uploaded_by,filename:original_filename,filesize_bytes:size_bytes,sha256,storage_path,document_type,extracted_metadata,scan_status,scan_details:scan_detail,created_at",
            "order": "created_at.desc",
            "limit": "50",
        },
    )
    rows = response_rows(response)
    return [StoredDocument(**{**row, "expires_at": None}) for row in rows]


@app.get("/api/v1/documents/{document_id}", response_model=StoredDocument)
async def get_document(
    document_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> StoredDocument:
    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "document_versions",
        params={
            "select": "id,institution_id,uploaded_by,filename:original_filename,filesize_bytes:size_bytes,sha256,storage_path,document_type,extracted_metadata,scan_status,scan_details:scan_detail,created_at",
            "id": f"eq.{document_id}",
            "limit": "1",
        },
    )
    rows = response_rows(response)
    if not rows:
        raise HTTPException(status_code=404, detail="Document was not found or access denied.")
    return StoredDocument(**{**rows[0], "expires_at": None})


@app.get("/api/v1/documents/{document_id}/download")
async def download_document(
    document_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
):
    from fastapi.responses import Response

    settings, token, _user_id, client = context
    response = await rest_request(
        client,
        settings,
        token,
        "GET",
        "document_versions",
        params={
            "select": "id,filename:original_filename,storage_path,scan_status",
            "id": f"eq.{document_id}",
            "limit": "1",
        },
    )
    rows = response_rows(response)
    if not rows:
        raise HTTPException(status_code=404, detail="Document was not found or access denied.")
    doc = rows[0]
    scan_status = doc.get("scan_status", "scan_unavailable")
    permitted, reason = is_download_permitted(scan_status)
    if not permitted:
        raise HTTPException(status_code=403, detail=reason)

    storage_url = f"{settings.url}/storage/v1/object/authenticated/institution-documents/{doc['storage_path']}"
    storage_res = await client.get(
        storage_url,
        headers={"apikey": settings.anon_key, "Authorization": f"Bearer {token}"},
    )
    if storage_res.status_code != 200:
        raise HTTPException(
            status_code=storage_res.status_code,
            detail="Document content is unavailable in storage.",
        )

    headers = {
        "Content-Disposition": f'attachment; filename="{doc.get("filename", "document.pdf")}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=storage_res.content, media_type="application/pdf", headers=headers)


@app.patch("/api/v1/documents/{document_id}", response_model=StoredDocument)
async def update_document(
    document_id: UUID,
    updates: StoredDocumentUpdate,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> StoredDocument:
    raise HTTPException(
        status_code=405,
        detail="Document analysis metadata is immutable after upload.",
    )


@app.delete("/api/v1/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> None:
    raise HTTPException(
        status_code=405,
        detail="Document version records are retained and cannot be deleted.",
    )



# ---------------------------------------------------------------------------
# Applications — institution-scoped workflow over the document vault
# ---------------------------------------------------------------------------


class ApplicationCreate(BaseModel):
    institution_id: str  # external ref, e.g. SYNTH-INST-001
    application_type: Literal["eoa", "new_program", "intake_change"]
    academic_year: str = Field(min_length=4, max_length=20)
    params: dict[str, Any] = Field(default_factory=dict)


class ApplicationRecord(BaseModel):
    id: UUID
    institution_id: UUID
    institution_external_ref: str
    created_by: UUID
    application_type: str
    academic_year: str
    params: dict[str, Any]
    checklist: list[dict[str, Any]]
    status: str
    created_at: str
    expires_at: str | None = None


class ApplicationFinding(BaseModel):
    id: UUID
    application_id: UUID
    code: str
    severity: str
    rule_id: str
    message: str
    evidence: dict[str, Any] = Field(default_factory=dict)
    recommended_action: str = ""
    status: str
    created_at: str
    resolved_by: UUID | None = None
    resolved_at: str | None = None


class FindingReviewInput(BaseModel):
    decision: Literal["resolve", "reject", "escalate"]
    rationale: str = Field(min_length=10, max_length=4000)


def _row_to_application(row: dict[str, Any]) -> ApplicationRecord:
    institution = row.get("institutions")
    if isinstance(institution, list):
        institution = institution[0] if institution else {}
    if not isinstance(institution, dict):
        institution = {}
    return ApplicationRecord(
        id=row["id"],
        institution_id=row["institution_id"],
        institution_external_ref=institution.get("external_ref") or row.get("institution_external_ref", ""),
        created_by=row["created_by"],
        application_type=row["application_type"],
        academic_year=row["academic_year"],
        params=row.get("params") or {},
        checklist=row.get("checklist") or [],
        status=row.get("status", "draft"),
        created_at=row["created_at"],
        expires_at=row.get("expires_at"),
    )


def _APPLICATION_SELECT() -> str:
    return ("id,institution_id,institution_external_ref,application_type,academic_year,"
            "params,checklist,status,created_at,created_by,expires_at,created_by,"
            "institutions(external_ref,display_name)")


async def _load_application(
    client: httpx.AsyncClient,
    settings: SupabaseSettings,
    token: str,
    application_id: UUID,
) -> dict[str, Any]:
    response = await rest_request(
        client, settings, token, "GET", "applications",
        params={"select": _APPLICATION_SELECT(), "id": f"eq.{application_id}", "limit": "1"},
    )
    rows = response_rows(response)
    if not rows:
        raise HTTPException(status_code=404, detail="Application was not found or access denied.")
    return rows[0]


async def _membership_role_for_institution(
    client: httpx.AsyncClient,
    settings: SupabaseSettings,
    token: str,
    user_id: UUID,
    institution_uuid: UUID,
) -> str | None:
    response = await rest_request(
        client, settings, token, "GET", "institution_memberships",
        params={
            "select": "role",
            "user_id": f"eq.{user_id}",
            "institution_id": f"eq.{institution_uuid}",
            "limit": "1",
        },
    )
    rows = response_rows(response)
    return rows[0].get("role") if rows else None


async def _record_audit_event(
    client: httpx.AsyncClient,
    settings: SupabaseSettings,
    token: str,
    *,
    application_id: UUID,
    user_id: UUID,
    action: str,
    detail: dict[str, Any],
) -> None:
    try:
        await rest_request(
            client, settings, token, "POST", "application_audit_events",
            body={
                "application_id": str(application_id),
                "user_id": str(user_id),
                "action": action,
                "detail": detail,
            },
            prefer="return=minimal",
        )
    except HTTPException:
        pass  # audit is best effort; primary action result is unaffected


@app.post("/api/v1/applications", response_model=ApplicationRecord, status_code=201)
async def create_application(
    payload: ApplicationCreate,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> ApplicationRecord:
    settings, token, user_id, client = context
    membership_rows = response_rows(await rest_request(
        client, settings, token, "GET", "institution_memberships",
        params={"select": "institutions(id,external_ref,display_name)", "user_id": f"eq.{user_id}"},
    ))
    target = None
    for membership in membership_rows:
        institution = membership.get("institutions")
        if isinstance(institution, list):
            institution = institution[0] if institution else None
        if isinstance(institution, dict) and institution.get("external_ref") == payload.institution_id:
            target = institution
            break
    if not target:
        raise HTTPException(status_code=404, detail="Institution access is not provisioned for this account.")

    checklist = build_checklist(payload.params)
    insert_response = await rest_request(
        client, settings, token, "POST", "applications",
        body={
            "institution_id": target["id"],
            "institution_external_ref": payload.institution_id,
            "created_by": str(user_id),
            "application_type": payload.application_type,
            "academic_year": payload.academic_year,
            "params": payload.params,
            "checklist": checklist,
            "status": "submitted",
        },
        prefer="return=representation",
    )
    rows = response_rows(insert_response)
    if not rows:
        raise HTTPException(status_code=403, detail="This account cannot create applications for this institution.")
    row = dict(rows[0])
    row["institutions"] = target
    await _record_audit_event(
        client, settings, token,
        application_id=row["id"], user_id=user_id,
        action="application_created",
        detail={"academic_year": payload.academic_year, "application_type": payload.application_type},
    )
    return _row_to_application(row)


@app.get("/api/v1/applications", response_model=list[ApplicationRecord])
async def list_applications(
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[ApplicationRecord]:
    settings, token, _user_id, client = context
    response = await rest_request(
        client, settings, token, "GET", "applications",
        params={"select": _APPLICATION_SELECT(), "order": "created_at.desc", "limit": "50"},
    )
    rows = response_rows(response)
    return [_row_to_application(row) for row in rows]


@app.get("/api/v1/applications/{application_id}", response_model=ApplicationRecord)
async def get_application(
    application_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> ApplicationRecord:
    settings, token, _user_id, client = context
    row = await _load_application(client, settings, token, application_id)
    return _row_to_application(row)


@app.post("/api/v1/applications/{application_id}/validate", response_model=list[ApplicationFinding])
async def validate_application_id(
    application_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[ApplicationFinding]:
    settings, token, user_id, client = context
    application = await _load_application(client, settings, token, application_id)

    docs_response = await rest_request(
        client, settings, token, "GET", "application_documents",
        params={
            "select": "id,checklist_item_id,documents:document_versions(*)",
            "application_id": f"eq.{application_id}",
            "limit": "100",
        },
    )
    linked_rows = response_rows(docs_response)

    findings = generate_application_findings(
        application=application,
        checklist=application.get("checklist") or [],
        linked_documents=linked_rows,
        institution_external_ref=application.get("institution_external_ref", ""),
    )

    # Replace only OPEN findings; keep resolved/escalated decision history.
    await rest_request(
        client, settings, token, "DELETE", "application_findings",
        params={"application_id": f"eq.{application_id}", "status": "eq.open"},
        prefer="return=minimal",
    )
    if findings:
        body_rows = [dict(f, application_id=str(application_id), opened_by=str(user_id)) for f in findings]
        insert_res = await rest_request(
            client, settings, token, "POST", "application_findings",
            body=body_rows,
            prefer="return=representation",
        )
        saved = response_rows(insert_res)
    else:
        saved = []

    overall = overall_application_status(findings)
    await rest_request(
        client, settings, token, "PATCH", "applications",
        params={"id": f"eq.{application_id}"},
        body={"status": overall},
        prefer="return=minimal",
    )
    await _record_audit_event(
        client, settings, token,
        application_id=application_id, user_id=user_id,
        action="validation_run",
        detail={"overall_status": overall, "finding_count": len(findings)},
    )
    return [ApplicationFinding(**row) for row in saved]


@app.get("/api/v1/applications/{application_id}/findings", response_model=list[ApplicationFinding])
async def list_application_findings(
    application_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[ApplicationFinding]:
    settings, token, _user_id, client = context
    response = await rest_request(
        client, settings, token, "GET", "application_findings",
        params={
            "select": "id,application_id,code,severity,rule_id,message,evidence,recommended_action,status,created_at,resolved_by,resolved_at",
            "application_id": f"eq.{application_id}",
            "limit": "200",
        },
    )
    rows = response_rows(response)
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "info": 3}
    rows.sort(key=lambda r: severity_rank.get(r.get("severity", "info"), 3))
    return [ApplicationFinding(**row) for row in rows]


@app.post("/api/v1/applications/{application_id}/findings/{finding_id}/review", response_model=ApplicationFinding)
async def review_application_finding(
    application_id: UUID,
    finding_id: UUID,
    payload: FindingReviewInput,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> ApplicationFinding:
    settings, token, user_id, client = context
    application = await _load_application(client, settings, token, application_id)
    role = await _membership_role_for_institution(
        client, settings, token, user_id, application["institution_id"]
    )
    if role not in ("reviewer", "institution_admin"):
        raise HTTPException(status_code=403, detail="Only reviewers or institution administrators can record review decisions.")

    status_map = {"resolve": "resolved", "reject": "rejected", "escalate": "escalated"}
    new_status = status_map[payload.decision]

    update_res = await rest_request(
        client, settings, token, "PATCH", "application_findings",
        params={"id": f"eq.{finding_id}", "application_id": f"eq.{application_id}"},
        body={
            "status": new_status,
            "resolved_by": str(user_id),
            "resolved_at": datetime.now(UTC).isoformat(),
        },
        prefer="return=representation",
    )
    updated = response_rows(update_res)
    if not updated:
        raise HTTPException(status_code=404, detail="Finding was not found for this application.")

    await rest_request(
        client, settings, token, "POST", "application_reviews",
        body={
            "finding_id": str(finding_id),
            "application_id": str(application_id),
            "reviewed_by": str(user_id),
            "decision": payload.decision,
            "rationale": payload.rationale,
        },
        prefer="return=minimal",
    )
    await _record_audit_event(
        client, settings, token,
        application_id=application_id, user_id=user_id,
        action=f"finding_{payload.decision}",
        detail={"finding_id": str(finding_id), "rationale": payload.rationale[:500]},
    )
    return ApplicationFinding(**updated[0])


@app.get("/api/v1/applications/{application_id}/report")
async def application_report(
    application_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
):
    from fastapi.responses import JSONResponse

    settings, token, _user_id, client = context
    application = await _load_application(client, settings, token, application_id)

    findings_res = await rest_request(
        client, settings, token, "GET", "application_findings",
        params={"select": "id,code,severity,rule_id,message,evidence,recommended_action,status,created_at,resolved_by,resolved_at", "application_id": f"eq.{application_id}", "limit": "200"},
    )
    findings_rows = response_rows(findings_res)

    reviews_res = await rest_request(
        client, settings, token, "GET", "application_reviews",
        params={"select": "id,reviewed_by,decision,rationale,created_at", "application_id": f"eq.{application_id}", "limit": "200"},
    )
    reviews_rows = response_rows(reviews_res)

    audit_res = await rest_request(
        client, settings, token, "GET", "application_audit_events",
        params={"select": "id,user_id,action,detail,created_at", "application_id": f"eq.{application_id}", "order": "created_at.asc", "limit": "200"},
    )
    audit_rows = response_rows(audit_res)

    docs_res = await rest_request(
        client, settings, token, "GET", "application_documents",
        params={"select": "id,checklist_item_id,documents:document_versions(id,filename:original_filename,scan_status,extracted_metadata)", "application_id": f"eq.{application_id}", "limit": "100"},
    )
    doc_rows = response_rows(docs_res)

    institution = application.get("institutions")
    if isinstance(institution, list):
        institution = institution[0] if institution else {}
    if not isinstance(institution, dict):
        institution = {}

    payload = report_payload(
        application=application,
        institution=institution,
        checklist=application.get("checklist") or [],
        findings=findings_rows,
        reviews=reviews_rows,
        audit_events=audit_rows,
        documents=[{**(d.get("documents") or {}), "link": d} for d in doc_rows],
    )
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="preliminary-report-{application_id}.json"'},
    )


@app.get("/api/v1/applications/{application_id}/documents", response_model=list[StoredDocument])
async def list_application_documents(
    application_id: UUID,
    context: tuple[SupabaseSettings, str, UUID, httpx.AsyncClient] = Depends(_authenticated_context),
) -> list[StoredDocument]:
    settings, token, _user_id, client = context
    _ = await _load_application(client, settings, token, application_id)
    response = await rest_request(
        client, settings, token, "GET", "application_documents",
        params={
            "select": ("id,checklist_item_id,document:document_versions(id,institution_id,uploaded_by,"
                       "filename:original_filename,filesize_bytes:size_bytes,sha256,storage_path,document_type,"
                       "extracted_metadata,scan_status,scan_details:scan_detail,created_at)"),
            "application_id": f"eq.{application_id}",
            "limit": "100",
        },
    )
    rows = response_rows(response)
    result: list[StoredDocument] = []
    for row in rows:
        document = row.get("document")
        if not isinstance(document, dict) or not document.get("id"):
            continue
        document = dict(document)
        document["application_link"] = {
            "application_id": application_id,
            "checklist_item_id": row.get("checklist_item_id"),
        }
        result.append(StoredDocument(**{**document, "expires_at": None}))
    return result
