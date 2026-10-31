# REMAINING GAPS — SIH26261 prototype

## Blocked (owner action required)

1. **Supabase migration is not applied.** `supabase/migrations/20261101000000_applications_workflow.sql`
   must be pushed (`supabase db push`) before the deployed prototype can create
   applications/persist findings. Until then the new endpoints honestly return 503
   ("storage is not configured") and the UI shows that error.
2. **PR publishing.** Opening the PR from the `freebuff/*` or `gap-impl` branch requires
   GitHub write access in the owner's session; the agent channel can push branches but cannot
   create PRs or edit PR text.

## Pre-existing failures on main (baseline, unchanged by this work)

- `backend/tests/test_ci_configuration.py` (8 tests) and
  `backend/tests/test_docs_links.py::test_relative_markdown_links_resolve` fail because
  commit `e1ab4c8` renamed `.github/workflows/backend-tests.yml` to `ci.yml` without updating
  these tests or `docs/pre-coding/phase-4-security-testing.md`. Fix is a two-file edit; it is
  deliberately left untouched here to avoid scope creep — say the word and it lands as a
  tiny follow-up commit.

## Not implemented (future integration)

- **Issuing-authority verification** — adapters for real (or even clearly-simulated) authority
  checks are not connected; reserved status values only.
- **Infrastructure evidence norms** — area/quality rules need a verified source; currently
  surfaced only as `RULE_UNCONFIGURED`.
- **Facs/FSR/cadre numeric rules** — the existing Cadre & FSR calculator remains a separate,
  explicitly labeled advisory tool; connecting it to the finding engine requires verified
  academic-year rules.
- **Forensic anomaly detection** (ELA, font analysis) — not implemented, not claimed.
- **Anomaly dashboard wire-up** — dashboard cards still show static projections; connecting
  them to live application findings is a small frontend task left for the next pass.
- **Browser E2E against the deployed site** — blocked on the Supabase migration (owner action);
  the Playwright script from the previous session (`frontend/tests/browser_e2e.mjs`) needs system
  Chromium deps on the host it runs on.

## Honesty notes

- No AICTE rule is active. Checklist ids are demo configuration, visibly labelled.
- No authentication/tenancy shortcuts were added: every new row flows through the existing
  bearer-token → Supabase Auth → RLS path (`has_institution_role`).
- No benchmark or authority data is presented as verified; the report itself carries the
  "preliminary decision support only" disclaimer.
