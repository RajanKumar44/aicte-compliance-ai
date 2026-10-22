# Implementation Plan — SIH26261

**Status:** staged plan; unresolved regulatory requirements are not settled.

## Phase 0 — Close correctness blockers
- [ ] Verify official SIH problem statement, stage and deadline.
- [ ] Retrieve the complete applicable 2026–27 Annexure-2.
- [ ] Read the 1 April 2024 revised-scrutiny circular.
- [ ] Check later AICTE amendments/corrigenda.
- [ ] Confirm EOA-specific DSC and signatory requirements.
- [ ] Resolve reuse-repository licensing/authorship; exclude its data and history.
- [ ] Freeze a reviewed source register and versioned rule catalogue.

**Exit gate:** every activated regulatory rule has a source, applicability, interpretation, effective period and tests.

## Phase 1 — Secure foundation (P0)
- Define application, institution, user/role, document/version, validation-run, rule-version, finding, reviewer-action and audit-event data models.
- Implement server-side authentication and role-based authorization.
- Enforce institution-level isolation on every relevant query and mutation.
- Implement safe file upload: size/page limits, content checks, random storage names, safe temporary paths and explicit processing states.
- Establish migrations, structured error responses and test fixtures.
- Audit security-sensitive actions.
- Replace misleading checklist-complete semantics when no trusted rule set was evaluated.

**Exit gate:** access-control, tenant-isolation, upload-validation and failure-path tests pass.

## Phase 2 — Deterministic validation (P0)
- Add a versioned rule catalogue and source references.
- Implement only reviewed rules.
- Preserve document version, rule versions, evaluation timestamp and evidence for every finding.
- Distinguish pass, missing, conditional/unevaluable, expired, unreadable, inconsistent, not applicable and human-review states.
- Test date boundaries and rule changes.

**Exit gate:** runs are reproducible and unresolved rules cannot automatically produce adverse decisions.

## Phase 3 — Document processing (P0)
- Define an OCR adapter contract preserving raw text, normalized values, confidence, page, bounding box, engine/version and processing status.
- Prefer embedded PDF text when safe and available; OCR scanned pages.
- Compare OCR engines on labelled synthetic data before locking a version.
- Never swallow processing exceptions or return an empty result as successful extraction.
- Add synthetic institutional-document fixtures and field-level evaluation metrics.

**Exit gate:** success, partial success and failure are distinguishable; tests cover poor scans, corrupt files and ambiguous dates.

## Phase 4 — Review workflow and auditability (P0)
- Build applicant, reviewer and administrator journeys.
- Reviewers inspect evidence, comment and record human outcomes.
- Preserve status history and every rule version used.
- Add tamper-evident audit-chain verification only if tested; do not call it immutable without external anchoring and operational controls.

**Exit gate:** a synthetic application can be uploaded, validated, reviewed and audited end-to-end.

## Phase 5 — Bounded authenticity checks (P1)
- Validate PDF signatures with explicit trust-store configuration and distinct valid/tampered/untrusted/unsupported outcomes.
- Mark synthetic-CA demo results visibly as synthetic.
- Add hashes, duplicate detection and cautious metadata/visual indicators.
- Use authorized issuer adapters only; no scraping, CAPTCHA bypass or assumed credentials.

## Phase 6 — Polish (P1/P2)
- Dashboard, alerts, accessibility and performance measurement.
- Optional infrastructure-evidence assistance only after core workflow is stable.
- External integrations only after authorization, documentation and test credentials are confirmed.

## Suggested three-person ownership
- A — backend/security/data: API, auth, RBAC, tenant isolation, schema, migrations and audit.
- B — document processing/rules: upload validation, OCR adapter, extraction evidence, deterministic rules and synthetic corpus.
- C — frontend/reviewer workflow: applicant/reviewer/admin screens, evidence viewer, accessible states and demo script.

Agree API contracts and the finding schema before parallel work. Integrate continuously on a feature branch; protect main and review a PR before merging.

## Minimum acceptance gates
- Backend authorization protects all privileged operations.
- Institution-level isolation passes negative tests.
- Invalid, oversized, malformed and unsupported files fail safely.
- OCR failure is visible and never treated as pass.
- Every active rule has source and version metadata.
- Expiry and conditional rules have boundary tests.
- External checks distinguish not attempted, unavailable, inconclusive, externally verified and simulated.
- Reviewer decisions are human-attributed and auditable.
- Historical runs retain document and rule versions.
- Demo uses synthetic data and disclaims official AICTE status.