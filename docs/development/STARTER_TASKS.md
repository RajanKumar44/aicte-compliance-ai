# Starter tasks — one per workstream

Three small, independently reviewable first tasks. Each is sized for one branch and one PR,
and produces something testable. None of them is started.

**Every command below was executed against `origin/research/grounded-foundation` @ `014403a`
on 2026-10-23** (Linux, Python 3.11.2, fresh clone + fresh worktrees). Results are quoted
inline; the summary table is at the end. Anything not marked verified was not run.

All three PRs target `research/grounded-foundation` and none depends on another, so they can
run in parallel. Ownership, shared files and prohibitions: [`../../WORKSTREAMS.md`](../../WORKSTREAMS.md).

---

## Read this before you branch — the coordination docs are not on the base yet

The research base (`014403a`) contains **none** of these files, because they live on
unmerged PR #5 (and three of them also on PR #4):

```
WORKSTREAMS.md
docs/development/API_CONTRACT.md
docs/development/STARTER_TASKS.md
docs/development/INTEGRATION_CHECKLIST.md
docs/development/PARALLEL_WORKFLOW.md
docs/development/RECOVERY_AND_BACKUP.md
docs/development/REPOSITORY_STATE.md
docs/development/PR_RECONCILIATION.md
frontend/README.md · ai/README.md · backend/WORKSTREAM.md
pyproject.toml · .python-version · .github/pull_request_template.md · .github/CODEOWNERS
```

Read them at
`https://github.com/rajaryan1111/aicte-compliance-ai/tree/arena/97cf136c-aicte-compliance-ai`
(the PR #5 head) or locally without checking them out:

```bash
git fetch origin 'refs/heads/arena/97cf136c-aicte-compliance-ai:refs/remotes/origin/arena/97cf136c-aicte-compliance-ai'
git show origin/arena/97cf136c-aicte-compliance-ai:docs/development/API_CONTRACT.md | less
```

**Do not create those paths yourself.** PR #4 and PR #5 create them; if you add them on your
branch too, the merge produces add/add conflicts on files whose content you do not own. The
three task file lists below are already written to avoid that collision.

Recommended order: land PR #5 (or #4 then #5) first, then branch. If you must start earlier,
branch from the base anyway and follow the "if this file does not exist" rule in your task —
your PR then stacks behind #5 and must say so.

---

## A1 — Contract fixtures and UI state matrix (workstream A / `frontend/`)

**Why.** The frontend cannot start without knowing exactly what the API returns, and the
repository has no captured examples. Guessing a response shape is how a frontend invents an
endpoint. This task produces the fixtures every later UI task is built and tested against and
needs no framework decision.

**Files (all new, all inside `frontend/` — none collide with PR #4's `frontend/README.md`)**

- `frontend/fixtures/validate-ok.json` — a captured 200 body, `preliminary_checks_passed`.
- `frontend/fixtures/validate-missing.json` — a captured 200 body with `MISSING_DOCUMENT`.
- `frontend/fixtures/validate-expired.json` — a captured 200 body with `DOCUMENT_EXPIRED`.
- `frontend/fixtures/validate-422.json` — a captured framework validation error body.
- `frontend/STATE_MATRIX.md` — table: UI state → endpoint → fields consumed → what the screen
  must not claim.
- `frontend/tools/verify_fixtures.py` — stdlib-only checker (see acceptance criteria).

**Capture the bodies — run this, do not hand-write them.** ✅ verified on the base:

```bash
python3 -m venv .venv && . .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt

python - <<'PY'
import json
from fastapi.testclient import TestClient
from backend.app.main import app

c = TestClient(app)
base = {
    "institution_id": "SYNTH-INST-001",
    "application_type": "eoa",
    "required_documents": ["aicte_approval", "mandatory_disclosure"],
}
cases = {
    "validate-ok": {**base, "submitted_documents": ["aicte_approval", "mandatory_disclosure"]},
    "validate-missing": {**base, "submitted_documents": ["aicte_approval"]},
    "validate-expired": {**base, "submitted_documents": ["aicte_approval", "mandatory_disclosure"],
                         "expiry_dates": {"aicte_approval": "2020-01-01"}},
}
for name, payload in cases.items():
    body = c.post("/api/v1/validate", json=payload).json()
    body.pop("checked_at", None)          # timestamp would make the fixture non-deterministic
    print(name, "->", sorted(body))
PY
```

Observed on the base (first run of this exact script):

| Case | HTTP | `status` | Findings |
|---|---|---|---|
| ok | 200 | `preliminary_checks_passed` | none |
| missing | 200 | `attention_required` | `MISSING_DOCUMENT` for `mandatory_disclosure` |
| expired | 200 | `attention_required` | `DOCUMENT_EXPIRED` for `aicte_approval`, evidence carries `expiry_date` and `evaluation_date` |

The 422 case is the framework envelope only — `{"detail": [{...}]}`, with no project fields:

```python
c.post("/api/v1/validate", json={"institution_id": "x"}).json()   # -> {"detail": [...]}
```

A wrong payload shape really does return 422 (this was reproduced: an invented
`{"institution": {...}, "documents": [...]}` body produced
`['body','institution_id'] missing` and `['body','application_type'] missing`). Do not invent
fields — the request model is documented in `API_CONTRACT.md`.

**Acceptance criteria**

- Every fixture contains only keys the contract marks `implemented`; no `proposed` or
  `blocked` field appears, and no field appears that the API did not return.
- `checked_at` is removed or replaced with a fixed value; fixtures must be byte-stable.
- `python frontend/tools/verify_fixtures.py` exits 0, and fails if a fixture gains an unknown
  top-level key, drops `validation_scope`, or contains an approval/compliance verdict.
- `STATE_MATRIX.md` covers: initial, loading, empty checklist, validation errors, missing
  document, expired document, server error, network failure.
- No framework, bundler, `package.json` or UI code — that needs an owner decision.
- No real institution, person or document.

**Dependencies.** None to start. The UI itself is blocked on the framework decision.

**Prohibited.** Anything outside `frontend/`; creating `frontend/README.md` (PR #4 owns it);
any field the contract marks blocked; presenting the deterministic checklist result as a
compliance decision.

**Ownership check.** `python tools/check_ownership.py --workstream frontend --base origin/research/grounded-foundation`
must exit 0 (every path under `frontend/`).

**PR base / order.** `research/grounded-foundation`, independent, can open first.

---

## B1 — Pin the `POST /api/v1/validate` response contract (workstream B / `backend/`)

**Why.** The response is asserted by tests but not defined by a response model, so an
accidental field rename could silently break the frontend. This is a behaviour-preserving
change that makes the contract explicit and testable.

**Files**

- `backend/app/main.py` — add Pydantic response models for `/health` and `/api/v1/validate`;
  keep the emitted JSON byte-identical.
- `backend/tests/test_api_contract.py` (new) — assert the exact top-level key set,
  `validation_scope`, `source`, `status` values and the `findings[]` shape.
- `docs/development/API_CONTRACT.md` — **only if it already exists on your branch** (i.e. PR
  #5 has landed). On the base it does not; do not create it, because PR #5 owns that file.
  In that case record the contract in the test docstring and in your PR description instead.

**Acceptance criteria**

- All existing tests pass unmodified (base: **54 passed, 1 skipped**; after PR #5:
  **187 passed, 1 skipped**). No response body changes.
- A test fails if a top-level key is renamed, removed or added without updating the contract.
- No new endpoint, auth, persistence, upload route or rule activation.
- Lint is clean **for the files you touched**:
  `ruff check backend/app/main.py backend/tests/test_api_contract.py`.
  Do not lint the whole tree on the base — see the note below.

**Known base-branch lint defect (not yours).** ✅ verified:

```console
$ ruff check backend/
F401 [*] `typing.Sequence` imported but unused
  --> backend/app/ocr_adapter.py:12:30
Found 1 error.            # exit 1
```

That file is fixed on PR #5. Do not "fix" it here (it is OCR code, outside this task and
owned by another change); scope your lint command to your own files, or rebase once #5 lands.

`ruff` is also **not installed** by the base's `backend/requirements-dev.txt`. Until PR #5
lands, install it explicitly (local only, no dependency change):

```bash
python -m pip install ruff==0.13.2
```

**Ownership check.** `python tools/check_ownership.py --workstream backend --base origin/research/grounded-foundation`
must exit 0. If it reports `docs/development/API_CONTRACT.md`, you touched a shared file: either
drop that line (when the file is absent from your base) or declare it and get review.

**Dependencies.** None. Do this before the frontend's first real UI PR so the shape is frozen.

**Prohibited.** `.github/`; dependency changes; `backend/app/ocr_*.py`; the error envelope
(a separate `proposed` contract change); any auth or persistence claim.

**PR base / order.** `research/grounded-foundation`, independent.

---

## C1 — Labelled synthetic evaluation corpus and scorer (workstream C / `ai/`)

**Why.** The repository has 10 regression fixtures and **no** measurement. Without a separate
labelled corpus and a scoring method, every accuracy statement stays unsupported. This task
builds the measurement machinery against synthetic data and states its limits in its own
output.

**Files (all new, inside `ai/`; none collide with PR #4's `ai/README.md`)**

- `ai/corpus/extraction_cases.jsonl` — ≥ 40 synthetic cases covering `institution_name`,
  `certificate_number`, `issue_date`, `valid_until`, `academic_year`, including negative cases
  that must stay unresolved.
- `ai/evaluate_extraction.py` — imports `extract_institution_fields` **read-only** from
  `backend.app.ocr_pipeline`, reports per-field precision/recall and false positives on
  negative cases, and prints the synthetic-only notice.
- `ai/tests/test_evaluate.py` — scorer arithmetic on hand-checked cases + notice assertion.
- `ai/EVALUATION.md` — how to run it, the method, and the limits. (Do **not** edit
  `ai/README.md` unless it already exists on your branch; PR #4 owns its creation.)

**Run the tests** — ✅ verified on the base, from the repository root:

```bash
python -m pytest -q ai/tests        # confirmed: collects and imports backend read-only
```

`python -m pytest -q` (whole tree) does not cover `ai/tests` on the base because there is no
pytest configuration there; after PR #5 lands, `testpaths` still covers only `backend/tests`.
Use the explicit path until a shared-config change is separately reviewed and approved by B.

**Acceptance criteria**

- `python ai/evaluate_extraction.py` prints a per-field table plus
  "synthetic corpus, not a real-world benchmark, no production accuracy claim".
- No real institution, person, certificate number or scanned document.
- Negative cases exist, and their false-positive count is printed, not omitted.
- A failing case is reported as a failure; nothing is dropped from the denominator.
- Runs with `backend/requirements-dev.txt` alone — no ML/OCR dependency added.

**Ownership check.** `python tools/check_ownership.py --workstream ai --base origin/research/grounded-foundation`
must exit 0. It is expected to flag any `backend/**` path — that is the point: do not edit
backend OCR code in this task.

**Dependencies.** None to start. Shared-config change (`pyproject.toml`) is out of scope here.

**Prohibited.** Editing `backend/`; moving or duplicating the OCR pipeline; real documents;
any production accuracy claim; adding a dependency.

**PR base / order.** `research/grounded-foundation`, independent.

---

## Verified against the research base

Executed 2026-10-23 in a fresh clone with three worktrees
(`task/frontend-fixtures`, `task/backend-response-model`, `task/ai-eval-corpus`), all at
`014403a`, each with `git status` clean.

| Command | Base result |
|---|---|
| `pip install -r backend/requirements-dev.txt` + `pip check` | install OK, `No broken requirements found` |
| `python -m pytest -q` | **54 passed, 1 skipped** |
| `python -m pytest -q backend/tests/test_validation.py backend/tests/test_validation_security.py` | **17 passed** |
| `ruff check backend/` | **1 pre-existing error** (`F401`, `ocr_adapter.py`) — fixed on PR #5 |
| `ruff check backend/` after `pip install ruff==0.13.2` | runs; same single pre-existing error |
| `python -m pytest -q ai/tests` (with a scratch test importing the extractor) | **1 passed** |
| `python -m compileall -q backend/app backend/tests` | exit 0 |
| fixture capture script above | 200/200/200 with the expected findings; 422 envelope as described |
| `git worktree add … -b <branch> origin/research/grounded-foundation` ×3 | 3 worktrees, 3 branches, all `014403a` |

**On the base you get 54 tests, not 187.** The extra tests live on PR #5. Quote the number you
actually saw.

## What these tasks deliberately do not do

- No framework, database, identity provider, storage vendor or hosting decision.
- No authentication, authorization, tenancy, upload, persistence or audit work.
- No regulatory rule activation and no OCR accuracy claim.
- No edits to `WORKSTREAMS.md`, `docs/development/*` (other than the one contract line in B1,
  and only when that file already exists), `.github/*` or root configuration.
