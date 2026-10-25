import logging
import os
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.app.db.session import get_db

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AICTE Compliance Assistant",
    description=(
        "Prototype for application validation and compliance assistance. "
        "Results are advisory and use synthetic demonstration data."
    ),
    version="0.3.1",
)

# ---------------------------------------------------------------------------
# CORS — Allow frontend origins to call this API
# ---------------------------------------------------------------------------
_allowed_origins = [
    "https://aicte-compliance-frontend.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

# Also allow any origin configured via environment variable
_extra_origin = os.getenv("CORS_ALLOWED_ORIGIN", "").strip()
if _extra_origin:
    _allowed_origins.append(_extra_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="aicte-compliance-assistant")


@app.post("/api/v1/validate", response_model=ValidationResponse)
def validate_application(request: ValidationRequest) -> ValidationResponse:
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


# Mount versioned API routes
from backend.app.api.v1.applications import router as applications_router  # noqa: E402
from backend.app.api.v1.audit_packages import router as audit_packages_router  # noqa: E402
from backend.app.api.v1.auth import router as auth_router  # noqa: E402
from backend.app.api.v1.documents import router as documents_router  # noqa: E402
from backend.app.api.v1.reviews import router as reviews_router  # noqa: E402
from backend.app.api.v1.validation import router as validation_router  # noqa: E402

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(applications_router, prefix="/api/v1/applications", tags=["applications"])
app.include_router(documents_router, prefix="/api/v1/applications", tags=["documents"])
app.include_router(validation_router, prefix="/api/v1/applications", tags=["validation"])
app.include_router(reviews_router, prefix="/api/v1", tags=["reviews"])
app.include_router(audit_packages_router, prefix="/api/v1", tags=["audit-packages"])


# ---------------------------------------------------------------------------
# Root info endpoint
# ---------------------------------------------------------------------------
@app.get("/")
def root_info() -> dict:
    return {
        "service": "AICTE Compliance Assistant",
        "status": "prototype",
        "docs": "/docs",
        "health": "/health",
        "frontend": "https://aicte-compliance-frontend.vercel.app",
        "notice": "Advisory prototype only — not an official AICTE system.",
    }


# ---------------------------------------------------------------------------
# Readiness probe — verifies DB connectivity
# ---------------------------------------------------------------------------
@app.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)) -> dict:
    """Report whether the API can actually serve authenticated requests."""
    from backend.app.db.session import get_database_url
    from backend.app.db.base import Base
    from sqlalchemy import text

    reasons: list[str] = []
    db_url = get_database_url()
    is_deployed = not db_url.startswith("sqlite")

    # Check database connectivity
    db_reachable = False
    try:
        db.execute(text("SELECT 1"))
        db_reachable = True
    except Exception as exc:
        reasons.append(f"Database unreachable: {exc}")

    # Check if users table exists
    users_present = False
    try:
        result = db.execute(text("SELECT count(*) FROM users"))
        users_present = True
    except Exception:
        reasons.append("users table not found — migrations may not have run")

    # Check current migration revision
    migration_rev = None
    try:
        row = db.execute(text("SELECT version_num FROM alembic_version")).fetchone()
        if row:
            migration_rev = row[0]
    except Exception:
        pass

    ready = db_reachable and not reasons
    return {
        "service": "aicte-compliance-assistant",
        "engine": "postgresql" if is_deployed else "sqlite",
        "deployed_environment": is_deployed,
        "database_reachable": db_reachable,
        "migration_revision": migration_rev,
        "users_table_present": users_present,
        "status": "ready" if ready else "degraded",
        "reasons": reasons,
        "notice": "Readiness probe — advisory deployment status only.",
    }


# ---------------------------------------------------------------------------
# Seed endpoint — bootstrap demo data for the prototype
# ---------------------------------------------------------------------------
@app.post("/api/v1/seed", tags=["admin"])
def seed_demo_data(db: Session = Depends(get_db)) -> dict:
    """Create demo user, institution, and membership if they don't already exist.

    Demo credentials:
    - username: admin / password: admin123456
    - username: reviewer / password: reviewer123456
    """
    from backend.app.db.models import User, Institution, InstitutionMembership
    from backend.app.core.security import get_password_hash

    created: list[str] = []

    # --- Institution ---
    inst = db.query(Institution).filter(Institution.institution_id == "DEMO-INST-001").first()
    if not inst:
        inst = Institution(
            institution_id="DEMO-INST-001",
            display_name="Demo Engineering College",
            status="active",
        )
        db.add(inst)
        db.flush()
        created.append("institution: DEMO-INST-001")

    # --- Admin User ---
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123456"),
            display_name="Demo Admin",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()
        created.append("user: admin")

    # Admin membership
    admin_mem = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.user_id == admin_user.id,
            InstitutionMembership.institution_id == inst.id,
        )
        .first()
    )
    if not admin_mem:
        admin_mem = InstitutionMembership(
            user_id=admin_user.id,
            institution_id=inst.id,
            role="institution_admin",
            is_active=True,
        )
        db.add(admin_mem)
        created.append("membership: admin → institution_admin")

    # --- Reviewer User ---
    reviewer_user = db.query(User).filter(User.username == "reviewer").first()
    if not reviewer_user:
        reviewer_user = User(
            username="reviewer",
            hashed_password=get_password_hash("reviewer123456"),
            display_name="Demo Reviewer",
            is_active=True,
        )
        db.add(reviewer_user)
        db.flush()
        created.append("user: reviewer")

    # Reviewer membership
    reviewer_mem = (
        db.query(InstitutionMembership)
        .filter(
            InstitutionMembership.user_id == reviewer_user.id,
            InstitutionMembership.institution_id == inst.id,
        )
        .first()
    )
    if not reviewer_mem:
        reviewer_mem = InstitutionMembership(
            user_id=reviewer_user.id,
            institution_id=inst.id,
            role="scrutiny_officer",
            is_active=True,
        )
        db.add(reviewer_mem)
        created.append("membership: reviewer → scrutiny_officer")

    db.commit()

    return {
        "status": "seeded" if created else "already_seeded",
        "created": created,
        "demo_credentials": {
            "admin": {"username": "admin", "password": "admin123456"},
            "reviewer": {"username": "reviewer", "password": "reviewer123456"},
        },
        "notice": "Demo data only — not for production use.",
    }
