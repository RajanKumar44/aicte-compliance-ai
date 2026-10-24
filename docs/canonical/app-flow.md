# Application Flow — Proposed

**Status:** workflow proposal; no authentication or persistence is claimed to exist yet.

## Applicant / institution representative
1. Sign in.
2. Select an institution the user is authorized to represent.
3. Create an EOA application for a selected academic year.
4. View the applicable checklist only if a reviewed, active ruleset exists for that category/year; otherwise show that the checklist is not yet configured.
5. Upload PDF or JPG/PNG files. Display file-level validation and processing status.
6. Review extracted fields with page/evidence references and correct them only through an attributable correction workflow.
7. Run preliminary validation. Show findings with source, rule version, evidence and limitations.
8. Replace a document by creating a new version; preserve prior runs.
9. Submit for human review when ready.

## Reviewer
1. Sign in and view only assigned/authorized applications.
2. Open the validation run and inspect rule source, evidence, extracted values and processing limitations.
3. Mark a finding acknowledged, resolved or requiring more information; provide a comment for any override/waiver.
4. Record a human review outcome distinct from automated findings.
5. Review status history and audit events.

## Rule manager
1. Draft a rule with exact source citation, applicable categories/years, conditions, dates, logic, limitations and test cases.
2. Submit the rule for review; do not activate it automatically.
3. Authorized approver publishes a new immutable rule version and records an audit event.
4. New validation runs use the newly applicable version; historical runs retain the original version.

## External verification outcomes
- Not attempted: no source call made.
- Simulated: demo-only stub, clearly labelled.
- Unavailable: authorized source could not be reached.
- Inconclusive: source responded but did not settle the claim.
- Externally verified: documented authoritative source supports the exact claim.

## Failure states
Upload rejected, extraction failed, partial extraction, unsupported format, rule trigger unevaluable, provider timeout and permission denied must be visible, actionable states—not silently converted into success.

## Research-dependent checklist behaviour — 2026-10-23
If the 1 April 2024 scrutiny circular, applicable current amendments or academic-year applicability are unresolved, the applicant must see a clear “checklist not yet verified/configured” notice. Do not present the provisional document list in the source verification report as a complete current checklist. Keep any exploratory checklist visibly provisional and prevent it from generating an adverse outcome. SIH deadline and theme details are also unverified and should not be presented as confirmed product facts.
