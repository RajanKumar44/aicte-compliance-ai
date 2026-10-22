# Pull-request reconciliation

**Observed:** 2026-10-22T23:58Z. Re-verify before acting; SHAs change.

Purpose: record, for each open PR, whether it is independent, stacked, blocked, redundant
or superseded, and what work would be lost if it were closed. This document **does not**
change any PR: no base was retargeted, nothing was merged, closed or marked ready.

## Summary

| PR | Verdict | Blocking action |
|---|---|---|
| #1 foundation | Foundation for everything else | Needs owner review; it is the base of #2–#5 |
| #2 cross-repo audit | Independent, docs only, **no CI on its head** | Rebase onto `research/grounded-foundation` |
| #3 OCR hardening | **Superseded in behaviour by #5** but holds 2 extra fixtures | Owner decision + rebase |
| #4 workstream split | Independent docs only, **no CI on its head** | Rebase; see the `WORKSTREAMS.md` overlap below |
| #5 audit branch | Current integration branch | Keep as draft until the decisions below land |

## Per-PR inventory

### PR #1 — `research/grounded-foundation` → `main`

- Head `014403a`, base `968ddcf`, 39 files, +2610/−17.
- CI on the exact head: both jobs success.
- Content: research reconciliation, rule-catalogue scaffolding, advisory OCR pipeline,
  local CLI, synthetic fixtures, tests, README, implementation-status record.
- Nothing supersedes it: #2–#5 all target it as their base. **Do not close.**

### PR #2 — `review/cross-repo-integration-audit` → research

- Head `5922eca`, base `9157374`, 1 file, +120/−0 (`docs/research/cross-repository-review-2026-10-23.md`).
- CI on the exact head: **none** (stale workflow on the head; see REPOSITORY_STATE).
- Independent: touches no file that #3 or #5 touches. A read-only `git merge-tree`
  against PR #5's head completes cleanly.
- Risk if closed: loses the cross-repository review record, which is not duplicated
  elsewhere. **Preserve.**

### PR #3 — `feature/ocr-regression-hardening` → research

- Head `184d678`, base `9157374`, 4 files, +54/−2.
- CI on the exact head: both jobs success (run 39865712934).
- Overlaps PR #5 on `backend/app/ocr_pipeline.py`, `backend/tests/test_ocr_pipeline.py`
  and `.github/workflows/backend-tests.yml`.
- Ownership: its own branch; nothing from it has been merged anywhere.

### PR #4 — `docs/three-person-workstream-split` → research

- Head `ed5a41a`, base `9157374`, 4 files, +114/−0:
  `WORKSTREAMS.md`, `frontend/README.md`, `backend/WORKSTREAM.md`, `ai/README.md`.
- CI on the exact head: **none** (same stale-workflow cause).
- Contains **only** ownership/planning documents — no frontend or `ai/` application code.
- Overlap: PR #5 now also adds `WORKSTREAMS.md` (see below).

### PR #5 — `arena/97cf136c-aicte-compliance-ai` → research

- Head `e3d24a2`, base `014403a`, 23 files, +2569/−57.
- CI on the exact head: both jobs success (run 39873561247).
- Content: rule-activation gate hardening, OCR engine-boundary hardening, reproducible
  development environment, documentation/CI-evidence corrections, and the coordination
  set in `WORKSTREAMS.md` + `docs/development/`.

## PR #3 vs PR #5 — OCR implementation overlap

### What each actually changes

Inspected per commit, not summarised from the PR description.

| Behaviour | PR #3 (`184d678`) | PR #5 (`e3d24a2`) |
|---|---|---|
| 100,000-character text budget | yes | yes |
| Aggregate engine-output budget | yes | yes |
| Non-string text rejected | yes (`TypeError`) | yes (`TypeError`) |
| Reversed / equal academic year rejected | yes | yes |
| Multi-year academic year (e.g. `2026-2030`) | **accepted** | **rejected** (requires `end == start + 1`) |
| `OCRWord`/`OCRRawResult` validation | no | yes |
| Confidence never clamped/inflated | no (clamping still present) | yes |
| Issue-date vs valid-until contradiction warning | no | yes |
| Engine column contract (`text`/`conf` required, alignment) | no | yes |
| Multi-frame warning | no | yes |
| Workflow trigger fix | yes | yes (byte-identical file) |
| Synthetic corpus cases | 10 | 8 |

### Evidence run for this reconciliation

Executed locally against PR #5's implementation, in a throwaway directory
(`/tmp/pr3check`), without modifying either branch:

- PR #3's full test module (`test_ocr_pipeline.py`, 18 cases including parametrisation,
  extracted from `184d678`) → **18 passed** against PR #5's implementation.
- PR #3's fixture corpus (10 cases incl. `SYNTH-009` reversed academic year and
  `SYNTH-010` duplicate labels) → **10/10 pass** against PR #5's implementation.

### Assessment

PR #5's implementation is a **behavioural superset**: it satisfies every test and every
fixture PR #3 introduces, and adds stricter engine-output and confidence handling. The
only behavioural contraction is that multi-year academic years are rejected rather than
accepted, which is stricter and is covered by PR #5 tests.

The **one thing PR #3 has that PR #5 does not** is two fixture lines:

```json
{"case_id":"SYNTH-009","text":"Academic Year: 2027-2026","expected_fields":{}}
{"case_id":"SYNTH-010","text":"Institution Name: First Example College\nInstitution Name: Second Example College","expected_fields":{"institution_name":"First Example College"}}
```

Those cases are already covered by equivalent Python tests in PR #5
(`test_invalid_or_ambiguous_academic_years_are_not_extracted`,
`test_duplicate_labels_keep_first_value_deterministically`), so no behavioural coverage
would be lost, but the data-driven corpus would stay at 8 cases.

### Decision — required from the repository owner

**Not decided by this audit**, because resolving it means pushing to
`feature/ocr-regression-hardening`, which this session is not authorised to do.

Recommended, evidence-backed option: **adopt PR #5's implementation** and carry PR #3's
two fixture lines into the corpus, then close PR #3 as superseded. This keeps every test
PR #3 wrote, keeps its fixture data, and avoids maintaining two OCR implementations.

Alternative: land PR #3 first and rebase PR #5 onto it — but that requires resolving
conflicts in `ocr_pipeline.py` and `test_ocr_pipeline.py` in favour of PR #5's stricter
code anyway, so it produces the same end state with more conflict work.

**Both branches remain intact and recoverable**; nothing was deleted.

## `WORKSTREAMS.md` overlap between PR #4 and PR #5

PR #4 adds `WORKSTREAMS.md` on the research branch; PR #5 also adds it. Both are *new
files* on their respective branches, so merging both produces an add/add conflict in that
one file.

Resolution plan, to be applied by an owner (not here, because it needs a push to
`docs/three-person-workstream-split`):

1. Land PR #5 (or #4) first.
2. On the other branch, resolve `WORKSTREAMS.md` by keeping the version now on the base
   branch, and keep that PR's unique content (`frontend/README.md`,
   `backend/WORKSTREAM.md`, `ai/README.md`).
3. Re-run CI on the rebased head.

Recommended order: land **PR #4's folder READMEs first** (they are additive and
conflict-free), then PR #5 supplies the authoritative `WORKSTREAMS.md`. In that order the
conflict is a one-file override rather than a merge of two competing texts.

## Missing CI on PR #2 / PR #4 — unresolved owner action

Both heads predate the workflow trigger fix. Rebase (verified clean with a read-only
`git merge-tree` against the current research head) and push:

```bash
git fetch origin
git switch review/cross-repo-integration-audit      # or docs/three-person-workstream-split
git rebase --onto origin/research/grounded-foundation 9157374
git push --force-with-lease origin HEAD
```

`--force-with-lease` is required because the rebase rewrites commits; it refuses to run
if someone else pushed in the meantime. Verify the new head then has a
`pull_request` run before treating the PR as validated. This session did **not** run
these commands.
