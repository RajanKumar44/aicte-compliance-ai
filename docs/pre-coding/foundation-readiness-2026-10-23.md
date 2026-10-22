# Foundation readiness audit — 2026-10-23

**Repository:** `rajaryan1111/aicte-compliance-ai`
**Default branch:** `main` at `968ddcf7a4fb1cd1e1d8d4bb73e0b7fc10b44bcf` (unchanged)
**Foundation branch:** `research/grounded-foundation` at
`014403a36bb91eebf1ebca3fdc1733ee91082db2` (PR #1, open, unmerged)
**Audit base:** `b8e1643d4cf5dc79aaa626cf5c38c67a5047af2b` (PR #5 head at the start of
this pass)
**Scope:** rule-governance and OCR verification, documentation/CI evidence, development
environment reproducibility, three-workstream preparation, security/regulatory gate.
**Data:** synthetic fixtures only. No AICTE rule was defined, activated or evaluated.

This record supersedes current-status and CI claims in earlier documents; those
documents remain as history.

## 1. Repository state observed

| Ref | SHA | Notes |
|---|---|---|
| `main` | `968ddcf` | default branch, untouched by this pass |
| `research/grounded-foundation` | `014403a` | PR #1 head, base `main` |
| `review/cross-repo-integration-audit` | `5922eca` | PR #2 head, base research branch |
| `feature/ocr-regression-hardening` | `184d678` | PR #3 head, base research branch |
| `docs/three-person-workstream-split` | `ed5a41a` | PR #4 head, base research branch |
| `arena/97cf136c-aicte-compliance-ai` | see §10 | PR #5 head (this audit) |

All four sub-PRs were cut from `9157374`, one docs-only commit behind the research
branch head, so their diffs are unaffected by the base moving forward; they should be
rebased before merge.

## 2. Verified rule-governance behaviour

Inspected `backend/app/rule_catalog.py`, `test_rule_catalog.py`,
`test_rule_activation.py`, and every application call site (there are none: no module
imports `rule_catalog` outside tests, and no HTTP route exposes it).

Behaviour confirmed by execution:

- caller-supplied `lifecycle="active"` is refused by the gate;
- unverified/inconsistent provenance, missing or rejected approval, missing
  `effective_from`, and missing test categories are refused;
- `model_construct`/`model_copy` tampering cannot activate through `RuleRegistry`;
- duplicate versions and a second active version of the same rule ID are refused;
- a failed activation leaves registry state unchanged;
- no rule instance exists in `backend/app/`, and no evaluator exists.

**Defects found and fixed in this pass** (all previously produced the wrong failure
mode rather than silently activating — the gate failed closed but noisily and
inconsistently):

| # | Defect | Evidence | Fix |
|---|---|---|---|
| R1 | Tampered objects raised `AttributeError`/`TypeError` (`'str' object has no attribute 'value'`, missing attribute on `model_construct`, `NoneType is not iterable`) instead of a gate error | probe on `b8e1643` | `activation_blockers`/`activation_requirements` now type-check and convert malformed metadata into blockers; `RuleActivationError` raised consistently |
| R2 | Returned active object *was* the stored object; caller mutation (including nested `test_cases`) corrupted registry state | probe: after external mutation `get_active(...).lifecycle == draft` | registry stores and returns deep copies |
| R3 | `effective_from` before `publication_date` was accepted, contradicting the rule's own source timeline | probe: rule with `publication_date=2026-06-01`, `effective_from=2020-01-01` activated | rejected in the ACTIVE schema state and blocked by the gate |
| R4 | Gate error told callers to "supersede" a rule, but no supersede/retire API exists | `dir(registry)` → `activate`, `active_rules`, `get_active` | message and module docstring state that supersession/retirement are unimplemented and require durable storage, authorization and audit |

**Limitations that remain (not fixed, by design):** in-memory process-local state;
`reviewer_id`/`verified_by` are recorded strings, **not authenticated identities**;
no durable audit, no multi-user concurrency, no supersession or retirement, no rule
evaluator, and no active AICTE rule. All AICTE rules stay inactive.

## 3. Verified OCR behaviour

Inspected `backend/app/ocr_pipeline.py`, `ocr_adapter.py`, all OCR tests, the fixture
corpus and the CI smoke-test job. Previously reported fixes were re-verified by
execution: strict `OCRWord`/`OCRRawResult` validation, non-finite confidence handling
(`NaN`/`inf` no longer become `1.0`), the 100,000-character aggregate budget (a single
oversized word, 1,000 × 90-char words and 300,000 one-character words are all bounded),
reversed/equal/multi-year academic-year rejection, duplicate-label determinism,
date-contradiction warnings, and decode-vs-engine error separation.

**Defects found and fixed in this pass:**

| # | Defect | Evidence | Fix |
|---|---|---|---|
| O1 | Malformed Tesseract output escaped as `AttributeError: 'NoneType' object has no attribute 'get'` when `image_to_data` returned `None`, and `TypeError: 'NoneType' object is not iterable` for `{"text": None, "conf": None}` | stubbed-engine probe on `b8e1643` | engine column mapping is validated (`Mapping` + `Sequence` per column); malformed output raises `RuntimeError("…malformed data…")`, and parsing errors are wrapped |
| O2 | Multi-frame TIFF was silently truncated to the first frame with no warning | 2-frame TIFF probe: `n_frames == 2`, one frame read | adapter records a result warning naming the frame count |

**Documented limitations (not implemented):** PDF input is rejected as an unsupported
image; only the first frame/page of a multi-frame file is processed (now warned);
bounding boxes, deskew/denoise and multi-page assembly are absent; the `OCRAdapter`
protocol in `ocr_adapter.py` (`extract(file_path)`) has no implementation — the CLI
uses `RawOCREngine.recognize(image_bytes)`.

**No accuracy claim:** the corpus is 8 synthetic text fixtures plus generated-image
smoke tests. Hindi is covered at label-extraction level only; the optional CI job
installs `tesseract-ocr-eng` and tests English only. No labelled held-out
English/Hindi evaluation exists.

## 4. Documentation and CI evidence corrections

- `docs/pre-coding/implementation-status-2026-10-23.md` ended with "The latest
  code-inclusive evidence is run #56 linked above", contradicting its own correction
  section. Replaced with explicitly historical and explicitly current sections; the
  run #11 head SHA (`83795cc`) was verified through the API instead of assumed, and
  run #56's head (`f160abc`) is labelled historical.
- `docs/pre-coding/phase-5-coding-readiness.md` still said the workflow run and clean
  install were unverified. A dated correction records that both now exist.
- The three workstream documents live only in PR #4, so a non-conflicting
  `docs/integration/workstream-contracts.md` records ownership, contracts, commands and
  open decisions.

CI evidence, verified against exact head SHAs through the GitHub API:

| PR | Head SHA | Check-runs on that SHA |
|---|---|---|
| #1 | `014403a` | `backend-tests` success, `optional-ocr-integration` success (runs 39868597925 push, 39868604125 PR) |
| #2 | `5922eca` | **none** |
| #3 | `184d678` | `backend-tests` success, `optional-ocr-integration` success (run 39865712934) |
| #4 | `ed5a41a` | **none** |
| #5 | `b8e1643` | `backend-tests` success, `optional-ocr-integration` success (run 39869707696) |

PR #3's description says "Automated test execution is pending; no pass claim is made"
and its safety note says checks "may not auto-trigger" — both are stale for head
`184d678`, which has passing checks. PR #1's description cites run #56
(`f160abc`) as its validation evidence while its head `014403a` has newer passing runs,
and its stated counts (54 passed, 1 skipped) describe the older suite. These are other
contributors' PR descriptions; they are recorded here rather than edited.

Workflow review: `pull_request` triggers on `main` and
`research/grounded-foundation` on the audit branches only (the base branch still
triggers on `main` alone); `permissions: contents: read`; dependencies come from the
pinned requirement files; the optional job installs `tesseract-ocr` and
`tesseract-ocr-eng` before running the smoke test. No permission broadening is needed.

## 5. Development environment

Verified by execution on a clean virtual environment (`/tmp/cleanvenv`, Python 3.11.2):

- `python -m pip install -r backend/requirements-dev.txt` → success; `pip check` →
  "No broken requirements found".
- `python -m pytest -q` → **141 passed, 1 skipped**; bare `pytest -q` → same (previously
  11 collection errors; fixed with `pyproject.toml` `pythonpath`).
- `ruff check backend/` → all checks passed (ruff was previously undocumented and
  unpinned; now pinned in `requirements-dev.txt` and configured in `pyproject.toml`).
- `python -m compileall -q backend/app backend/tests` → exit 0.
- `pytest backend/tests/test_ocr_engine_integration.py` → skipped (no Tesseract binary
  in this sandbox); pip-installable OCR dependencies succeeded.
- API start check: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
  → `/health` 200, `/api/v1/validate` 200 with a synthetic payload.

Declared environment:

- Python **3.11+** (the code uses `StrEnum`); CI uses **3.12**; `.python-version` now
  pins 3.12 for pyenv-style setups. All pins declare `Requires-Python >= 3.9/3.10`.
- Supported/tested OS: Linux (CI and this sandbox) and macOS via the same `pip`
  command; Windows is untested. Tesseract is a system package (`apt-get install
  tesseract-ocr tesseract-ocr-eng` or `brew install tesseract`), verified with
  `tesseract --version`.
- `.env.example` is now a placeholder-only template stating that **no environment
  variables are read today**; `.env`/`.env.*` are ignored while `.env.example` stays
  tracked.
- No Dockerfile, Compose file, packaging metadata or lockfile exists; none was invented.

Unverified: Python 3.12 execution locally (only 3.11 available in the sandbox) — CI
covers 3.12. Tesseract execution locally (system package blocked by the sandbox
network policy) — the CI job covers it.

## 6. Three workstreams

See `docs/integration/workstream-contracts.md`. Current reality: only `backend/` exists;
`frontend/` and `ai/` are proposed in PR #4 and contain no code. OCR stays in
`backend/` until a separate integration PR changes imports, tests, dependencies and
CI. Nothing was moved or stubbed to make folders look complete.

## 7. Security and regulatory gate

| Control | Status |
|---|---|
| Authentication | **Not implemented** (no auth code, no dependency, no route) |
| Authorization / RBAC | **Not implemented** |
| Tenant isolation | **Not implemented** (no persistence at all) |
| Private document storage | **Not implemented** |
| Malware scanning | **Not implemented** |
| Persistent audit trail | **Not implemented** (rule gate keeps no audit events) |
| Retention / deletion | **Not implemented** |
| Secure upload handling | **Not implemented** — no upload route exists; image limits exist only in the library/CLI |
| Authenticated reviewer identity | **Not implemented** — recorded strings only |
| Official-source verification of rules | **Not implemented** — research gate open; no rule active |

Only `/health` and `/api/v1/validate` are exposed; there is no public upload route and
no persistence. Production use, real institutional documents, rule activation and
deployment remain **NO-GO**.

## 8. Remaining blockers, in priority order

1. Official AICTE applicability/amendment verification and SIH statement verification
   (regulatory correctness; no rule may activate before closure).
2. Authentication, RBAC, tenant isolation and durable audit — prerequisites for any
   upload route, for authenticated rule approval, and for multi-user use of the gate.
3. Private storage, malware scanning, retention/deletion and secure upload handling.
4. A labelled, held-out English/Hindi OCR evaluation before any accuracy claim; PDF and
   multi-page support if required.
5. Rebase and merge ordering for stacked PRs #2–#5 (they are one docs-only commit
   behind and duplicate the workflow-trigger line and OCR limits).
6. A durable, authorized, audited rule-publication workflow (supersede/retire, audit
   events) before the gate is used for anything other than synthetic tests.

## 9. What this pass did not do

No PR was merged, closed, retargeted or marked ready. No deployment, release or
dependency upgrade occurred. No AICTE rule, official requirement or accuracy figure was
invented. `main` is unchanged at `968ddcf`.
