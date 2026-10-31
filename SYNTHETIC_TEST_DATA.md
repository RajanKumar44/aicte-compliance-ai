# SYNTHETIC TEST DATA — regeneration and traceability

All synthetic demo data is visibly labelled and strictly separated from real inputs.

## Institution & application

| Field | Value | Where defined |
|---|---|---|
| Institution external ref | `SYNTH-INST-001` | Supabase institutions row (owner provisions via dashboard SQL, as with the existing vault flow) |
| Institution name | `Demo Engineering College` | Same row |
| Application | `SYNTH-APP-001`-equivalent: an `eoa` application, academic year `2026-27` | Created through `POST /api/v1/applications` (the id is a generated UUID; the label maps to it in this doc) |
| Source note | `SYNTHETIC DEMO CONFIGURATION — NOT AN OFFICIAL AICTE CHECKLIST` | Attached to **every** checklist item in `backend/app/application_service.py::RULE_SOURCE_NOTE` |

## Checklist rule ids (demo configuration only — not verified AICTE rules)

| item_id | rule_id | status logic |
|---|---|---|
| application_form | AICTE-EOA-DEMO-001 | mandatory |
| aicte_approval_certificate | AICTE-EOA-DEMO-002 | mandatory; expects expiry + certificate number from PDF |
| mandatory_disclosure | AICTE-EOA-DEMO-003 | mandatory |
| fire_safety_noc | AICTE-EOA-DEMO-004 | conditional on `params.hostel` |
| building_completion_certificate | AICTE-EOA-DEMO-005 | conditional on `params.new_building` |
| faculty_fsr_statement | AICTE-EOA-DEMO-006 | pending_configuration (never evaluated) |
| infrastructure_evidence | AICTE-EOA-DEMO-007 | pending_configuration (never evaluated) |

Rule-version suffix on every finding: `@demo-config-0.1.0`.

## Controlled test documents

Generate fixtures per `frontend/fixtures/` conventions and the corpus under `ai/corpus/`
(real engine fixtures require the optional Tesseract binary; text-based PDFs do not).
The rule engine consumes whatever the analyzer actually extracts, so each demo PDF below
produces a deterministic expected outcome:

| Test document | Expected outcome |
|---|---|
| Valid certificate (future expiry, matching institution id) | No unexpected deficiency; `EXTRACTED_FIELD_PENDING_REVIEW` info-only while review flag is set |
| Expired certificate (`expiry_date` in the past) | `DOCUMENT_EXPIRED` (critical) |
| Certificate with a missing field (no certificate number) | `EXTRACTED_FIELD_INCOMPLETE` (medium) |
| Certificate with misplaced institution ID | `INSTITUTION_ID_MISMATCH` (high) |
| Duplicate PDF (same bytes) | `DUPLICATE_DOCUMENT_SHA256` (medium) |
| Poor-quality scanned PDF (`is_scanned_only`) | `LOW_CONFIDENCE_SCAN` (info) + manual review flag |
| Infected test file (artificial scan status) | `MALWARE_SUSPECTED` (critical) — only in a test harness that forces the status; never claimed against real files |

## Authority verification responses

The issuing-authority verification adapters are **not wired** in this change. The reserved
statuses (`match` / `mismatch` / `pending` / `unavailable` / `inconclusive`) exist in the API
design, and any future simulated response MUST carry:

`SIMULATED — NOT LIVE GOVERNMENT VERIFICATION`

No simulated authority check is today represented as live.

## Separation guarantees

- Synthetic rows live in the same tables but under the synthetic institution/external ref;
  nothing writes into genuine institutional records.
- The downloaded report prints the disclaimer and the synthetic-source note on the checklist
  and rules sections.
- No real institutional or personal data is committed anywhere in this change.
