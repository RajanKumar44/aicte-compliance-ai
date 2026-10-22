# Architecture — Proposed

**Status:** proposed architecture; not all components exist in the current repository.

## System boundaries

1. **Web client** — applicant, reviewer and rule-manager workflows; never makes authorization decisions itself.
2. **FastAPI application** — authenticated API, request validation, tenant authorization, application workflow and audit-event creation.
3. **Relational database** — users/memberships, applications, document metadata, immutable versions, extracted fields, rule versions, validation runs, findings, review actions and audit events.
4. **Private object storage** — uploaded document bytes and generated evidence artifacts, addressed through opaque storage keys.
5. **Document processing worker/interface** — safe PDF text extraction, scanned-page rendering, OCR adapter, field normalization and explicit partial/failure states.
6. **Deterministic rule evaluator** — executes only active, reviewed rule versions; outputs discrete findings with evidence and limitations.
7. **External-verification adapters** — optional, authorized integrations with timeouts and explicit not-attempted/unavailable/inconclusive/simulated states.

## Main flow
1. Applicant authenticates and creates an application under an institution they are authorized to access.
2. API creates a document slot/version and stores bytes privately after upload validation.
3. Processing extracts embedded PDF text where appropriate and/or runs OCR; every field retains provenance and confidence.
4. Rule evaluator snapshots applicable rule versions and evaluates only the inputs it can reliably observe.
5. Validation run stores findings, evidence references, source versions and limitations.
6. Applicant sees advisory findings; reviewer inspects evidence and records an attributable human outcome.
7. Every sensitive operation and rule publication emits an audit event.

## Trust boundaries
- Browser to API: authenticate, validate requests, enforce CSRF/CORS policy appropriate to deployment and rate-limit.
- API to storage: opaque keys, least-privilege credentials, size limits and no public bucket by default.
- Uploaded file to parser/OCR: treat as hostile; limit bytes/pages/time/memory; isolate processing and reject malformed or unsupported files safely.
- Rule configuration to evaluator: schema-validate, version and review before activation; do not execute arbitrary Python supplied by a user.
- External provider: only call documented and authorized endpoints; record request/result metadata while excluding secrets and unnecessary personal data.

## Current repository reality
- The repository currently has a small FastAPI validation endpoint and tests for caller-supplied missing-document and expiry checks.
- The endpoint does not yet load an authoritative AICTE ruleset, authenticate users, isolate institution records, persist runs or process uploaded files.
- The response must remain explicit that a passing result covers only supplied inputs and does not establish regulatory compliance or document authenticity.

## Technology choices to confirm before implementation
- Database: PostgreSQL is a candidate; select after deployment and migration review.
- ORM/migrations: select a supported SQLAlchemy/Alembic combination only after dependency compatibility review.
- Auth: choose a supported OIDC provider or secure local-auth design; enforce role and tenant checks server-side.
- Object storage: choose private local development storage and a production-compatible private backend.
- OCR: keep engine behind an adapter and select by measured synthetic-data evaluation; do not choose solely from third-party benchmark claims.
- Background processing: introduce only when synchronous processing limits and resource use are understood.

## Explicit non-goals
- No assumed AICTE portal API or scraping.
- No autonomous official approval/rejection.
- No opaque fraud score as the sole reason for an adverse outcome.
- No production deployment with real sensitive documents before security/privacy review.

## Research-driven architecture constraints — 2026-10-23
- Treat the AICTE handbook as an identified base source, not a complete current rulebook. The 1 April 2024 scrutiny document and 2026–27 addendum status remain unresolved.
- Rule ingestion must preserve source status (verified, source-reported, provisional, unresolved), retrieval date, document/version, exact clause/page, effective interval and reviewer decision. Never activate unresolved rules.
- The external-verification adapter contract must distinguish not attempted, unavailable, inconclusive, simulated and externally verified; “verified” requires an authorized authoritative source supporting the exact claim.
- No official SIH portal access, AICTE API or private integration is established by the current research. Do not architect around assumed access; adapters remain optional and explicitly unavailable until verified.
- The candidate fake-id-screening repository remains off-limits for code/data reuse until licensing/authorship and personal-data/history risks are resolved.
