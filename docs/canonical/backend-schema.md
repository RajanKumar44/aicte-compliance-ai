# Backend Schema — Proposed

**Status:** design proposal; no database or ORM is selected/implemented yet.

## Core entities

| Entity | Purpose | Key fields / constraints |
|---|---|---|
| User | Authenticated person | id, normalized email, password/identity-provider reference, active flag, created_at; credentials never logged. |
| Institution | Tenant boundary | id, display name, external reference if authorized, status. |
| InstitutionMembership | Institution access | user_id, institution_id, role; unique pair; applicant access scoped through membership. |
| Application | Reviewable submission | id, institution_id, type, academic_year, status, created_by, created_at, updated_at. |
| Document | Logical document slot | id, application_id, document_type, current_version_id nullable. |
| DocumentVersion | Immutable uploaded bytes | id, document_id, storage_key, sha256, media_type, byte_size, page_count, uploaded_by, uploaded_at, processing_status. |
| ExtractedField | OCR observation | id, document_version_id, field_name, raw_text, normalized_value, confidence nullable, page_number nullable, bounding_box nullable, engine_name/version, extraction_status. |
| Rule | Stable rule identity | id, rule_key, owner, created_at. |
| RuleVersion | Immutable rule revision | id, rule_id, version, source_title, source_url, clause, page, effective dates, applicability, logic config, limitations, status, reviewed_by, reviewed_at. |
| ValidationRun | Reproducible evaluation | id, application_id, triggered_by, started_at, completed_at, status, evaluation_date, ruleset/source version snapshot. |
| Finding | Evidence-linked result | id, validation_run_id, rule_version_id nullable for non-rule processing errors, code, status, severity, summary, limitations. |
| FindingEvidence | Traceable observation | id, finding_id, document_version_id nullable, page/bounding box nullable, observed_value, normalized_value, evidence_kind, artifact reference. |
| ReviewAction | Human review | id, application_id, reviewer_id, action, comment, created_at. |
| AuditEvent | Attributable history | id, actor_id nullable for system, institution_id nullable, action, target_type/id, timestamp, request_id, metadata with sensitive values excluded, previous_hash/event_hash if hash chaining is adopted. |

## Invariants
- Every application belongs to exactly one institution.
- Tenant authorization is checked server-side on every application/document/run/finding/review read and write; never trust institution_id from a client without membership verification.
- Uploaded bytes are immutable per DocumentVersion; a replacement creates a new version.
- ValidationRun records exact rule versions and evaluation date; past runs are not recomputed in place.
- A finding references the exact document version and rule version used, when applicable.
- Rule versions are append-only after publication; corrections create a new version.
- Only authorized rule managers can publish a rule version; publish action creates an audit event.
- Review outcomes record the human actor and timestamp and never get silently overwritten by automated findings.
- Store files outside the public web root using opaque keys; database records do not expose raw filesystem paths.
- Hash chaining is tamper-evident, not immutable; protect the signing/anchoring key separately if used.

## Recommended status enums
- Application: draft, submitted, processing, review_required, reviewed, closed.
- Document processing: queued, processing, succeeded, partial, failed, rejected.
- Rule version: draft, in_review, active, superseded, retired.
- Validation run: queued, running, succeeded, partial, failed.
- Finding: open, acknowledged, resolved, waived_by_authorized_reviewer.
- External check: not_attempted, simulated, unavailable, inconclusive, externally_verified, externally_failed.

These are proposed product states, not AICTE-defined legal statuses. Final enum names should be aligned with API contracts before migration work.