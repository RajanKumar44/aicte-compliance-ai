# Project Memory and Decision Log

**Purpose:** preserve durable project facts and decisions without turning hypotheses into facts.

## Memory rules
- Store only stable decisions, confirmed repository facts, accepted interfaces and unresolved blockers.
- Every regulatory claim points to the source register and rule source record.
- Label each item VERIFIED, SOURCE-REPORTED, PROPOSAL, INFERENCE or UNRESOLVED.
- Record dates and version identifiers for time-sensitive decisions.
- Do not store real applicant personal data, credentials, access tokens or production documents in project memory.
- Do not duplicate full PRD/architecture content; link to the canonical owner document.
- When a decision changes, record the new decision and rationale rather than silently rewriting history.

## Current durable facts
- Target is SIH26261, an AICTE application validation/document authentication/compliance-assistance project; verify exact official statement in the source register.
- MVP priority is EOA, with architecture extensible to New Program and Intake Change.
- PDF and JPG/PNG, including scans, are intended formats.
- Intended roles: applicant/institution representative, reviewer, administrator/compliance-rule manager.
- AI findings are advisory; official decisions remain with authorized humans.
- The current API evaluates caller-supplied checklist/date inputs and is not an authoritative rules engine.
- The EOA checklist and current circular applicability remain unresolved.
- Reuse of `fake-id-screening` code is blocked pending licensing/authorship review.

## Decision records
Create one ADR per significant choice. Include context, decision, alternatives, evidence, consequences, confidence, reversibility and revisit trigger. Proposed ADR topics: database/auth, OCR engine, private storage, rule representation, evaluation date/timezone, file processing queue and deployment.

## Research status snapshot — 2026-10-23
- Detailed report: [official-source-verification-report.md](../research/official-source-verification-report.md). Related records: [source-register.md](../research/source-register.md), [reconciliation.md](../research/reconciliation.md).
- Status: regulatory checklist NOT COMPLETE. AICTE Approval Process Handbook 2024–25 to 2026–27 identified as base source; 2025–26 corrigendum reviewed only through targeted passages.
- UNRESOLVED: content of 1 April 2024 revised-scrutiny circular; official finality/effective date of the circulating 2026–27 addendum; Annexure-2 §2.1 pagination and Clause 7.17 cross-reference; applicability of NBA validity ending 30 April 2025; direct official SIH problem-statement/deadline verification.
- The reported SIH deadline of 28 October 2026 at 11:59 PM IST is mirror-reported, not officially confirmed. Do not repeat it as a verified deadline.
- No public AICTE API was established in this pass; API status remains not researched/confirmed.
- Candidate EOA document items in the report are provisional research leads, not an active or complete checklist.
- User-directed workflow: complete system/tool preparation before coding; no coding, local file edits, commits or merges until explicitly requested.
