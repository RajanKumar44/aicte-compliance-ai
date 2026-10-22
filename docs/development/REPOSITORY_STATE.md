# Repository state report

**Observed:** 2026-10-22T23:58Z (2026-10-23 05:28 IST)
**Observer:** repository audit session on branch `arena/97cf136c-aicte-compliance-ai`
**Method:** read-only inspection — `git status`, `git branch -avv`, `git log --graph`,
`git ls-remote`, `gh pr list/view/api`, `gh api .../check-runs`, plus a local test run.

This is a point-in-time snapshot. Re-verify before quoting it; see
[PARALLEL_WORKFLOW.md](PARALLEL_WORKFLOW.md#before-you-start) for the re-check commands.

## Repository

| Item | Value |
|---|---|
| Repository | `https://github.com/rajaryan1111/aicte-compliance-ai` (public) |
| Default branch | `main` |
| `main` SHA | `968ddcf7a4fb1cd1e1d8d4bb73e0b7fc10b44bcf` — **unchanged** since the previous audit |
| Branch divergence | `main` is 0 commits ahead of this branch; this branch is 86 commits ahead of `main` |
| Tracked files | 50 |
| Working tree | **clean** — no staged, unstaged or untracked files |
| Ignored-but-present | `.venv/`, `.pytest_cache/`, `.ruff_cache/`, `__pycache__/` (all covered by `.gitignore`) |
| Concurrent editors | none detected — no unexpected lock files, no uncommitted work, no branch moved between two consecutive fetches |

## Branches

| Branch | Head | PR | Base |
|---|---|---|---|
| `main` | `968ddcf` | — | default |
| `research/grounded-foundation` | `014403a` | #1 | `main` |
| `review/cross-repo-integration-audit` | `5922eca` | #2 | `research/grounded-foundation` |
| `feature/ocr-regression-hardening` | `184d678` | #3 | `research/grounded-foundation` |
| `docs/three-person-workstream-split` | `ed5a41a` | #4 | `research/grounded-foundation` |
| `arena/97cf136c-aicte-compliance-ai` | `e3d24a2` | #5 | `research/grounded-foundation` |

PR #2, #3 and #4 were all cut from `9157374`, which is one docs-only commit behind the
current research-branch head `014403a`. Their diffs are unaffected by that, but their
heads lack the workflow trigger fix described below.

## Pull requests

| PR | Title | State | Draft | Base SHA | Head SHA | Files | +/− |
|---|---|---|---|---|---|---|---|
| #1 | Research foundation: reconcile SIH26261 findings and gate compliance rules | open | yes | `968ddcf` | `014403a` | 39 | +2610/−17 |
| #2 | docs: audit cross-repository OCR integration opportunities | open | yes | `9157374` | `5922eca` | 1 | +120/−0 |
| #3 | fix: harden OCR extraction edge cases | open | yes | `9157374` | `184d678` | 4 | +54/−2 |
| #4 | docs: split technical ownership into frontend backend and AI | open | yes | `9157374` | `ed5a41a` | 4 | +114/−0 |
| #5 | fix: gate rule activation and harden OCR edge cases (cross-verification audit) | open | yes | `014403a` | `e3d24a2` | 23 | +2569/−57 |

No PR is merged or closed; `gh pr list --state merged` returns `0` entries.

## CI on exact head SHAs

| SHA | PR | Check-runs on that exact SHA |
|---|---|---|
| `014403a` | #1 | `backend-tests` success, `optional-ocr-integration` success (push run 39868597925; PR run 39868604125) |
| `5922eca` | #2 | **none** |
| `184d678` | #3 | `backend-tests` success, `optional-ocr-integration` success (run 39865712934) |
| `ed5a41a` | #4 | **none** |
| `e3d24a2` | #5 | `backend-tests` success, `optional-ocr-integration` success (run 39873561247) |
| `968ddcf` | `main` | **none** — no workflow existed on `main` when it was pushed |

Why #2 and #4 have no runs: `.github/workflows/backend-tests.yml` filters
`pull_request.branches`, which matches the **base** branch, and the workflow definition
used for a same-repository PR is taken from the **head**. Both heads still contain
`branches: ["main"]`, so nothing is scheduled for a PR targeting the research branch.
PR #3's and PR #5's heads contain the fix (`["main", "research/grounded-foundation"]`)
and therefore do get checks.

## Branch protection and required checks

**Not verified.** `GET /repos/.../branches/main/protection` and the same call for
`research/grounded-foundation` both return HTTP 403 "Resource not accessible by
integration". The token used by this session cannot read protection settings, so this
report makes **no claim** about required reviews, required status checks, or
force-push restrictions. A repository owner must confirm them in GitHub → Settings →
Branches. The API does report `admin`, `maintain`, `push`, `triage`, `pull` on the
repository for this credential; that is a permission claim, not evidence that
protection is configured.

## CI workflows present

| Workflow | Triggers | Permissions |
|---|---|---|
| `.github/workflows/backend-tests.yml` | push to `main`, `research/grounded-foundation`; PRs targeting either | `contents: read` |

Jobs: `backend-tests` (pytest, Python 3.12) and `optional-ocr-integration` (installs the
Tesseract system package, then runs the engine smoke test).

## Baseline local verification

Environment: Python 3.11.2 (clean virtualenv), dependencies from
`backend/requirements-dev.txt` (+ `backend/requirements-ocr.txt`).

| Command | Result |
|---|---|
| `python -m pytest -q` | **180 passed, 1 skipped** (0.63 s) |
| `ruff check backend/` | all checks passed |
| `python -m compileall -q backend/app backend/tests` | exit 0 |

The single skip is `backend/tests/test_ocr_engine_integration.py`, which requires the
Tesseract system binary; it is **not installed** in this environment, so real-engine
behaviour was not exercised locally. CI's `optional-ocr-integration` job does install it.

## What this snapshot does not establish

- It is not evidence of OCR accuracy: the fixtures and the engine tests are synthetic.
- It is not evidence of production readiness: no authentication, authorization, tenant
  isolation, private storage, malware scanning, durable audit or retention control
  exists (see [INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md#security-gates)).
- It does not establish that branch protection is configured.
