# Product Requirements — AICTE Compliance Assistant

**Status:** provisional PRD; regulatory checklist remains blocked pending source reconciliation.

## Product goal
Provide an advisory, evidence-first pre-scrutiny workflow for AICTE-related applications, prioritizing Extension of Approval (EOA). Help applicants identify completeness and consistency issues before review and help reviewers inspect findings with traceable evidence.

This is a prototype, not an official AICTE system. It does not claim access to private AICTE records or APIs.

## Users and roles
- Applicant / institution representative: create an application, upload documents, inspect preliminary findings and resubmit document versions.
- Reviewer: inspect findings and evidence, comment, and record a human review outcome.
- Administrator / compliance-rule manager: manage users/roles and propose or publish versioned, source-backed rules with an audit trail.

All authorization must be enforced by the backend, including institution-level record isolation.

## MVP requirements
1. Support EOA first; keep the model extensible to New Program and Intake Change.
2. Accept PDF and JPG/PNG uploads, including scanned PDFs/images, within explicit security limits.
3. Track each upload as a version; never overwrite evidence referenced by an earlier validation run.
4. Distinguish document presence, extraction status, extracted fields and validation findings.
5. Run deterministic completeness, date and cross-document checks only when rules have reviewed sources and defined applicability.
6. Attach evidence to findings: document/version, page, bounding box where available, observed value, normalized value, rule version and limitations.
7. Route ambiguous conditions, low-quality extraction and uncertain authenticity indicators to human review.
8. Provide reviewer dashboard, comments, human outcomes and status history.
9. Maintain attributable audit events for sensitive actions and rule publication.
10. Distinguish external verification states honestly; demo simulations must be visibly marked.
11. Use synthetic or properly authorized test data only.
12. Provide clear processing errors and recovery guidance.

## Product invariants
- AI findings are advisory; authorized humans retain final decisions.
- OCR success is not authenticity verification.
- An anomaly is not proof of forgery.
- A local check cannot be described as authoritative external verification.
- Unresolved regulatory applicability cannot trigger automatic rejection.
- No checklist is called complete until a reviewed applicable ruleset was evaluated.
- Do not import student personal data or unlicensed copied code from the candidate reuse repository.

## Out of scope for the first MVP
- Claiming official AICTE integration without authorization and a documented interface.
- Scraping restricted portals, bypassing CAPTCHA or using private credentials.
- Autonomous approval/rejection.
- Claiming forensic proof from metadata, OCR, visual anomalies or hashes.
- Broad infrastructure computer vision before the core workflow works.
- Production handling of real sensitive documents without a reviewed security and legal deployment plan.

## Acceptance criteria
- Login and backend role checks protect privileged actions.
- Institution-level isolation is verified with negative tests.
- Valid PDFs and scanned images enter a traceable pipeline; corrupt/unsupported/oversized files fail safely.
- Findings include rule source/version and evidence location where available.
- Missing/expired/unevaluable/unreadable/inconsistent/authenticity-concern statuses are distinct.
- External checks distinguish not attempted, unavailable, inconclusive, externally verified and simulated.
- Reviewer comments/outcomes and administrator rule changes are auditable.
- Historical runs retain original document and rule versions.
- The synthetic demo is reproducible from documented steps.

## Open blockers
- Direct verification of official SIH statement, deadline and stage.
- Retrieval/review of complete applicable EOA Annexure-2 and 1 April 2024 revised-scrutiny circular.
- Verification of subsequent amendments and exact EOA DSC requirements.
- Resolution of licensing/authorship before reusing code from fake-id-screening.
- OCR engine/version selection via a labelled synthetic-data bake-off.