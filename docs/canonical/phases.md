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

## Updated Phase 0 gate — research snapshot 2026-10-23
Phase 0 remains **open**. The source verification report is at [docs/research/official-source-verification-report.md](../research/official-source-verification-report.md). Closure requires: (1) retrieve and reconcile the complete 1 April 2024 scrutiny document; (2) establish official publication/finality/effective date of the 2026–27 addendum; (3) check Annexure-2 §2.1 pagination and Clause 7.17 directly in the official handbook PDF; (4) resolve the NBA-validity-through-30-April-2025 reference for AY 2026–27; (5) verify the official SIH statement and deadline; and (6) resolve reuse-repository licensing/authorship/data-history risks before copying anything. API availability remains unresearched, not disproven. No candidate document rule becomes active while these gates are open.

**Current user instruction:** finish system preparation first. Do not start implementation or make further code changes as part of this preparation phase.


## Pre-coding preparation phases — separate from the implementation phases above

The five preparation phases are tracked in [docs/pre-coding/README.md](../pre-coding/README.md). They are not the same numbering as the delivery/implementation phases above.

- Phase 1 — repository inventory and preparation: documented; implementation gaps remain.
- Phase 2 — research system and source evidence: documented; regulatory verification remains open.
- Phase 3 — technology option evaluation: documented; decisions are provisional, not locked.
- Phase 4 — security and testing preparation: documented; controls/tests have not been implemented or verified by this document.
- Phase 5 — coding-readiness gate: assessed **BLOCKED** pending evidence, approvals and clean setup/test verification.

Do not interpret the existence of preparation documents as a GO decision. The official-source verification report remains authoritative for the currently known regulatory research gaps.