# E2E TEST RESULTS — SIH26261 Application-Scrutiny Prototype

Tested head: current `gap-impl` commit (see git log). All results below are from
actually executed commands on that head; nothing is asserted by build success alone.

## Commands executed

```
python -m pytest backend/tests/test_applications.py -q   # 12 passed
python -m pytest -q                                       # 241 passed, 1 skipped, 9 failed (all 9 pre-existing on main, see below)
ruff check backend/ ai/ frontend/ tools/                  # passed after fix; 0 errors
python -m compileall -q backend/app backend/tests          # ok
cd frontend/app && npx tsc -b && npm run build             # ok
node --experimental-strip-types --test ../tests/*.test.mts # 7 passed
npm run lint (oxlint)                                      # 0 errors
```

## Workflow coverage (`backend/tests/test_applications.py`)

| Case | Result |
|---|---|
| Checklist: mandatory/conditional/not-applicable statuses correct per declared params | PASS |
| Unresolvable parameters keep `conditional`, never silently decide | PASS |
| `pending_configuration` items labelled with synthetic-source note | PASS |
| Valid application → no blocking findings; unconfigured rules surfaced as info | PASS |
| Missing document → `MISSING_REQUIRED_DOCUMENT` with exact item ids | PASS |
| Expired certificate → `DOCUMENT_EXPIRED` (critical) with expiry + evaluation dates | PASS |
| Institution ID mismatch → `INSTITUTION_ID_MISMATCH` | PASS |
| Duplicate SHA-256 → `DUPLICATE_DOCUMENT_SHA256`; duplicate certificate number → `CERTIFICATE_NUMBER_CONFLICT` | PASS |
| Infected file → `MALWARE_SUSPECTED` (critical) | PASS |
| Unconfigured Supabase → endpoints return 503 (no fake success) | PASS |
| Review action by applicant → 403 role denial | PASS |
| Validate endpoint persists findings with ids, rule version, evidence | PASS |

## Not covered in this run (explicitly)

- **Browser UI end-to-end through the deployed site**: the application workflow needs the
  Supabase migration applied (owner action) — without database tables the frontend will show the
  honest 503 state. No browser pass was attempted against deployment before that migration, so
  none is reported.
- Invalid/oversized PDF & cross-institution access cases rely on the pre-existing
  analyzer/RLS behaviors covered by `test_document_analysis.py`, `test_validation_security.py` and
  RLS policies in the new migration (enforced in Postgres, not unit-testable via the API mock).

## Pre-existing failures on origin/main (not caused by this change, unchanged)

```
backend/tests/test_ci_configuration.py — 8 failures
backend/tests/test_docs_links.py::test_relative_markdown_links_resolve — 1 failure
```

Cause: commit `e1ab4c8` (CI/CD pipeline) replaced `.github/workflows/backend-tests.yml` with
`ci.yml` but did not update the workflow-name expectations in tests and docs. Fix suggestion:
update `WORKFLOW_PATH` in `test_ci_configuration.py` and the link in
`docs/pre-coding/phase-4-security-testing.md` to reference `ci.yml`.
