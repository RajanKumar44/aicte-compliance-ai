# Delivery Phases — SIH26261

**Status:** proposed sequence. Phase completion requires evidence, not just code being present.

## Phase 0 — Research closure
Deliverables: official SIH statement and deadline; applicable EOA clauses; circular/corrigendum register; resolved reuse licensing decision.
Gate: every enabled regulatory rule has an authoritative source, applicability conditions, effective period, interpretation and tests.

## Phase 1 — Secure application foundation (P0)
Deliverables: selected DB/migrations, user and institution membership model, server-side authorization, tenant-isolation tests, application lifecycle, safe upload metadata.
Gate: cross-tenant negative tests pass; no client-supplied institution ID alone grants access.

## Phase 2 — Evidence-preserving document pipeline (P0)
Deliverables: immutable document versions, hash, upload limits, processing states, PDF text/OCR adapter contract, extracted-field provenance.
Gate: valid, malformed, oversized and unsupported files have deterministic tested outcomes; failures are never silently treated as success.

## Phase 3 — Source-governed deterministic rules (P0)
Deliverables: rule and rule-version model, reviewed active rules only, validation runs, findings and evidence links.
Gate: every active rule is source-backed and has positive, negative, boundary and exception tests.

## Phase 4 — Review workflow and audit (P0)
Deliverables: applicant view, reviewer evidence view, comments, human outcomes, status history, audit events.
Gate: complete synthetic workflow can be reproduced and sensitive actions are attributable.

## Phase 5 — Bounded authenticity verification (P1)
Deliverables: signature checks where applicable, document hashes, cautious metadata/visual indicators and authorized verification adapters.
Gate: method, source, outcome and limitations are visible; simulated checks cannot be mistaken for live verification.

## Phase 6 — Demo quality and measurement (P1/P2)
Deliverables: labelled synthetic corpus, OCR evaluation, accessibility, performance observations, demo script and deployment fallback.
Gate: claims about accuracy/performance are supported by recorded measurements.

## Work allocation proposal
- Backend/security/data: API, DB, auth, tenant isolation, audit.
- Document/rules: file-processing adapter, extraction evidence, rule engine and test corpus.
- Frontend/review: applicant/reviewer/admin screens, evidence display, workflow and demo.

Before parallel coding, agree the API schemas and finding contract. Protect main; work in feature branches and merge only after review and tests.