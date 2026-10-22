# Product Design — Evidence-First Workflow

**Status:** design principles and screen requirements; no visual implementation is implied.

## Design principles
- Show what the system checked and what it did not check.
- Place evidence next to each finding, including document version and page where available.
- Distinguish deterministic findings, OCR observations, external verification and human decisions.
- Make uncertainty visible; do not use colour alone to convey status.
- Keep the next action clear: upload, replace, correct extraction, request clarification or review evidence.
- Show rule source/version and applicability conditions for compliance findings.
- Avoid a single opaque fraud score and avoid alarmist language.

## Main screens
1. Sign-in and access-denied states.
2. Institution/application list scoped to the signed-in user's permissions.
3. Application creation and applicable-checklist view.
4. Document upload queue with type, size, processing state and retry guidance.
5. Document detail/evidence viewer with extracted fields and page references.
6. Validation summary grouped by missing, expired, inconsistent, unreadable, verification state and human review.
7. Reviewer workspace with source/evidence, comments, resolution and human outcome.
8. Rule catalogue with source/version/effective dates and draft/review/active states.
9. Audit/history view showing actor, action, timestamp and affected object without leaking secrets.

## Required wording
- Use “preliminary checks passed” rather than “compliant” for local checks.
- Use “authenticity concern” rather than “forged” for unconfirmed indicators.
- Use “verification unavailable” or “inconclusive” when appropriate.
- Label simulated checks prominently as “DEMO — SIMULATED”.
- If no applicable reviewed ruleset exists, say so rather than showing an empty checklist as complete.

## Accessibility and usability
Use keyboard-accessible controls, visible focus, semantic headings, descriptive errors, readable contrast, and status text in addition to icons/colour. Preserve form values after recoverable failures and make upload limits clear before submission.