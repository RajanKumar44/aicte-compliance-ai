# IMPLEMENTATION STATUS — SIH26261 Application-Scrutiny Prototype

Branch: `gap-impl` (based on `origin/main` @ `0c3ea60`). Head: see final commit SHA in the handoff.

This is preliminary decision support only. The final decision rests with competent AICTE
authorities. Nothing here verifies document authenticity or regulatory compliance.

## Classification legend
- **Implemented and tested** — code exists, an automated test exercises it, and the test passed on this head.
- **Simulated** — code exists and works, but the underlying capability is a demo stand-in (clearly labelled).
- **Future integration** — designed but not implemented in this change.
- **Blocked** — cannot be implemented without something the owner controls (credentials, verified rule sources).

## Capabilities

| Capability | Status | Notes |
|---|---|---|
| Institution sign-in (Supabase Auth, RLS) | Implemented and tested (baseline) | Existing on main; untouched by this change |
| Create EoA application (acad. year, params) | Implemented and tested | `POST /api/v1/applications`, pytest `test_applications.py` |
| Dynamic checklist generation (mandatory / conditional / not-applicable / pending-configuration) | Implemented and tested | `backend/app/application_service.py::build_checklist`; unresolvable parameters never silently default |
| Rule catalogue sourcing | Simulated | Checklist rule ids are demo configuration, labelled `SYNTHETIC DEMO CONFIGURATION` on every item; real rule activation is governed by `rule_catalog.py` and requires an approved verified source which does not exist |
| PDF upload into an application | Implemented and tested (endpoint path reused) | `POST /api/v1/documents` with `application_id` + `checklist_item_id`; reuses existing analyzer, antivirus scanner, Supabase storage and RLS |
| PDF parse / OCR extraction of candidate fields | Implemented (baseline analyzer) | `document_analyzer.analyze_pdf_document`: select-text extraction first; OCR is engine-dependent (Tesseract optional) |
| Malware scan status | Implemented (baseline scanner) | Status surfaced as `scan_status` (`clean` / `infected` / `scan_unavailable`); missing binary is never reported as clean |
| Extracted-field review by applicant | Implemented (UI editable surfaces candidate fields) | Corrections persist via existing `PATCH /api/v1/documents/{id}` |
| Rule validation run → persisted findings | Implemented and tested | `POST /api/v1/applications/{id}/validate`; replaces only *open* findings; resolved/escalated history retained |
| Findings with code, severity, rule id/@version, explanation, evidence, next action | Implemented and tested | Every finding carries all six fields |
| Missing / expired / institution-ID mismatch / certificate-number conflict / duplicate SHA-256 / low-confidence scan / OCR & AV-unavailable | Implemented and tested | See `E2E_TEST_RESULTS.md` |
| Executing AICTE numeric rules (FSR, cadre, infrastructure areas) | **Not evaluated — by design** | No verified current source/version exists in the repo; items are surfaced as `RULE_UNCONFIGURED` (informational) |
| Reviewer decisions (resolve / reject / escalate + rationale) with role gate | Implemented and tested | reviewer / institution_admin only; applicant gets 403 (tested) |
| Audit trail (creation, validation, document links, review decisions) | Implemented | `application_audit_events` written by the endpoints; DB policies scope every row |
| Downloadable preliminary scrutiny report (JSON) | Implemented | `GET /api/v1/applications/{id}/report` — application, checklist, documents+hashes, findings, reviews, audit, disclaimer |
| Anomaly detection beyond duplicate SHA-256 / low-quality scan | Future integration | Forensic forgery detection (ELA, font analysis) is NOT implemented and NOT claimed |
| Issuing-authority verification | Future integration | Adapters not present in repo; statuses reserved (`match`/`mismatch`/`pending`/`unavailable`/`inconclusive`) but no live or simulated call is wired in this change |
| Infrastructure evidence evaluation | Future integration | `RULE_UNCONFIGURED` only; no area norms evaluated |
| Dashboard/alerts wired to application data | Future integration | Existing dashboard cards remain; alert feed not yet connected to findings |

## Honest limitations

- Publishing requires the owner to apply `supabase/migrations/20261101000000_applications_workflow.sql` to the Supabase project (RLS, tables). Until then the deployed prototype's new endpoints return 503 by design ("storage not configured").
- All checklist rule ids are demo configuration, not verified AICTE requirements.
- The 9 pre-existing `test_ci_configuration.py` / `test_docs_links.py` failures exist on `origin/main` (the CI commit renamed the workflow to `ci.yml` without updating tests/docs); they are unchanged by this work and documented in `REMAINING_GAPS.md`.
