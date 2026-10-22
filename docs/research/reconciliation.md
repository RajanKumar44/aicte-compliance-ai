# Research reconciliation — SIH26261

**Status:** research baseline; not an official AICTE interpretation.
**Reviewed:** 2026-10-23.

## Executive decision

The Claude and Perplexity dossiers agree on the core product principles: EOA-first pre-scrutiny, evidence-linked findings, versioned rules, human review, strict access control, synthetic demo data, and honest external-verification statuses.

They conflict on whether the complete current EOA document matrix was retrieved and verified. One dossier says Annexure-2 §2.1 was read and cross-checked against a February 2026 corrigendum, but flags the 1 April 2024 revised-scrutiny circular as unread. The other says Annexure-2 could not be retrieved and explicitly warns that its proposed checklist is incomplete. **Therefore, this repository must not treat any disputed document list as a complete, current, official checklist.**

## Evidence labels
- VERIFIED IN REPOSITORY: observed in repository source.
- SOURCE-REPORTED: stated by a research dossier with a citation; primary source still needs direct confirmation.
- PROPOSAL: engineering choice, not a regulatory requirement.
- UNRESOLVED: conflicting, inaccessible, ambiguous, or not yet independently verified.

## Findings and decisions

| Topic | Combined finding | Status / action |
|---|---|---|
| SIH problem statement | Both reports obtained the statement through a third-party mirror; official SIH page was not directly retrieved. | SOURCE-REPORTED; verify official page and deadline. |
| Current rulebook | Both reports identify the AICTE Approval Process Handbook 2024–25 to 2026–27. Amendment coverage is incomplete or not fully reconciled. | SOURCE-REPORTED; maintain a source register and re-check notices. |
| 1 April 2024 revised-scrutiny circular | Identified but not read/reconciled. | UNRESOLVED; block final checklist freeze. |
| EOA checklist | Dossiers disagree about whether Annexure-2 was fully available. | UNRESOLVED; do not activate disputed requirements. |
| Expiry boundary | One report proposes inclusive expiry; the other lists it as unresolved. | PROPOSAL only; decide explicitly and test before activation. |
| Digital signatures | Reports cite handbook language about DSC-signed uploads for existing institutions but warn not to transfer new-institution rules to EOA. | SOURCE-REPORTED; confirm exact EOA applicability and signer authority. |
| OCR reuse | Existing OCR code is student-ID-oriented; reports flag swallowed failures, lost evidence/confidence at the public boundary, and dependency-version differences. | Inspect and adapt behind a stable interface; do not copy the whole repository. |
| Reuse licence and data | Reports state no LICENSE and student personal data in repository/history. | BLOCKER for copying code/data until licence/authorship is resolved. Never import seed data or personal records. |
| External integrations | No public AICTE API was established. DigiLocker/issuer checks are not confirmed for arbitrary uploaded documents. | No scraping or assumed access; use honest adapter states. |
| AI decisions | Both reports say AI output is advisory and human reviewers retain official decisions. | Product safety invariant. |
| SIH deadline/stage | 28 October 2026 appears in a mirror, not a directly verified official page. | UNRESOLVED; verify directly. |

## Implementation guardrails
1. No regulatory rule becomes active without an authoritative source URL, document title/version, exact clause/page, applicability, effective dates, and reviewed test cases.
2. Unresolved applicability yields human review or unevaluable status, not automatic rejection.
3. Never call an OCR, metadata, visual-anomaly or tamper-indicator result proof of forgery.
4. Never display verified for a check that was not performed against an authorized authoritative source.
5. Store document version, hash, rule version, evaluation time, evidence location and limitations for each finding.
6. Historical runs remain reproducible after rule changes.
7. Use synthetic data in demos and tests.
8. Do not import code from a repository with unresolved licence status.
9. Keep implementation on a feature branch and submit a reviewable PR; do not implement directly on main.
10. This memo is a reconciliation aid, not official AICTE guidance or legal advice.

## Required closure before rules are frozen
- Verify official SIH statement and deadline.
- Retrieve and inspect the complete applicable 2026–27 Annexure-2.
- Read the 1 April 2024 revised-scrutiny circular.
- Check subsequent AICTE amendments/corrigenda.
- Verify EOA-specific DSC/signatory requirements.
- Resolve reuse-repository licence and data-history risks.
- Benchmark OCR candidates on a labelled synthetic institutional-document set.