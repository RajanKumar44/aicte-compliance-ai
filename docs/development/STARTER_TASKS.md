# Starter tasks — one per workstream

Three small, independently reviewable first tasks. Each is sized for one branch and one
PR, changes as few files as possible, and produces something testable. None of them is
started; none of them requires a new framework, database, identity provider or storage
vendor.

Read [`../../WORKSTREAMS.md`](../../WORKSTREAMS.md) first. All three PRs target
`research/grounded-foundation` and none of them depends on another, so they can run in
parallel. Order matters only for the shared-config change called out in C1.

**Test commands** below assume the worktree setup in
[PARALLEL_WORKFLOW.md](PARALLEL_WORKFLOW.md) and an activated virtualenv.

---

## A1 — Contract fixtures and UI state matrix (workstream A / `frontend/`)

**Why.** The frontend cannot start without knowing exactly what the API returns, and the
repository has no captured examples. Guessing a response shape is how a frontend invents an
endpoint. This task produces the fixtures every later UI task will be built and tested
against, and it needs no framework decision.

**Files (all new, all inside `frontend/`)**

- `frontend/fixtures/validate-ok.json` — a real `/api/v1/validate` 200 body, synthetic
  input only.
- `frontend/fixtures/validate-expired.json` — a 200 body containing `DOCUMENT_EXPIRED`.
- `frontend/fixtures/validate-missing.json` — a 200 body containing `MISSING_DOCUMENT`.
- `frontend/fixtures/validate-422.json` — the framework validation error body.
- `frontend/STATE_MATRIX.md` — table: UI state → endpoint → fields consumed → what the
  screen must not claim (e.g. "no compliance verdict", "OCR advisory").
- `frontend/tools/verify_fixtures.py` — stdlib-only checker (see tests).

**How to capture the 200 bodies** (do not hand-write them; run the API):

```bash
python - <<'PY'
from fastapi.testclient import TestClient
from backend.app.main import app
c = TestClient(app)
print(c.get("/health").json())
print(c.post("/api/v1/validate", json={...}).text)   # use only synthetic values
PY
```

**Acceptance criteria**

- Every fixture contains only keys that [`API_CONTRACT.md`](API_CONTRACT.md) marks
  `implemented`; no `proposed` or `blocked` field appears.
- `python frontend/tools/verify_fixtures.py` exits 0 and fails if a fixture gains an unknown
  top-level key, drops `validation_scope`, or contains a compliance/approval verdict.
- `STATE_MATRIX.md` lists at least: initial, loading, empty checklist, validation errors,
  expired document, server error, network failure.
- No framework, bundler, `package.json` or UI code is added — that needs an owner decision.

**Dependencies.** None. Blocked-later: the actual UI (framework choice is an owner decision).

**Prohibited.** Anything outside `frontend/`; real institution or personal data; any field
the contract marks blocked; presenting the deterministic checklist result as a compliance
decision.

**PR base / order.** `research/grounded-foundation`, independent, can merge first.

---

## B1 — Pin the `POST /api/v1/validate` response contract (workstream B / `backend/`)

**Why.** The endpoint's response is asserted by tests but not defined by a response model,
so nothing prevents an accidental field rename from silently breaking the frontend. This is
a behaviour-preserving change that makes the contract explicit and testable.

**Files**

- `backend/app/main.py` — add a Pydantic response model for `/api/v1/validate` and
  `/health`; keep the emitted JSON byte-identical.
- `backend/tests/test_validation.py` (or a new `test_api_contract.py`) — assert the exact
  top-level key set, `validation_scope`, `source`, and the `findings[]` shape.
- `docs/development/API_CONTRACT.md` — one line per response model, still labelled
  `implemented`, with the observed sample unchanged.

**Acceptance criteria**

- All 186 existing tests still pass without modification; no response body changes
  (diff the JSON in a test before/after if unsure).
- A test fails if a top-level key is renamed, removed or added without updating the
  contract doc.
- No new endpoint, no auth, no persistence, no upload route, no rule activation.
- `ruff check backend/` and `python -m compileall -q backend/app backend/tests` clean.

**Dependencies.** None. Do this **before** A1's UI work so the frontend has a frozen shape.

**Prohibited.** `docs/` outside the contract line; `.github/`; dependency changes; touching
`backend/app/ocr_*.py` (owned by B but out of scope here); the error envelope (that is a
separate `proposed` contract PR, and nothing consumes it yet).

**PR base / order.** `research/grounded-foundation`, independent; land it before the
frontend's first real UI PR.

---

## C1 — Labelled synthetic evaluation corpus and scoring, no accuracy claim (workstream C / `ai/`)

**Why.** The repository has 10 regression fixtures and **no** measurement. Without a
separate labelled corpus and a scoring method, every accuracy statement stays unsupported.
This task builds the measurement machinery against synthetic data and states its limits in
the output itself.

**Files (all new, all inside `ai/`)**

- `ai/corpus/extraction_cases.jsonl` — at least 40 synthetic cases across the fields the
  extractor supports (`institution_name`, `certificate_number`, `issue_date`,
  `valid_until`, `academic_year`), including negative cases that must stay unresolved.
- `ai/evaluate_extraction.py` — imports `extract_institution_fields` **read-only** from
  `backend.app.ocr_pipeline` (no edits there), scores per-field precision/recall and the
  false-positive rate on negative cases, and prints a banner that the numbers describe
  synthetic data only.
- `ai/tests/test_evaluate.py` — asserts the scorer's arithmetic on hand-checked cases and
  that the report contains the synthetic-only caveat.
- `ai/README.md` — fill in "How to run" (3 lines).

**Acceptance criteria**

- `python ai/evaluate_extraction.py` prints a per-field table plus an explicit
  "synthetic corpus, not a real-world benchmark, no production accuracy claim" notice.
- The corpus contains no real institution, person, certificate number or scanned document.
- Negative cases exist and their false-positive count is reported, not hidden.
- A failing case is reported as a failure, never silently dropped from the denominator.

**Dependencies.** None for the corpus and scorer. **One shared-config dependency:** pytest
collects only `backend/tests` (`pyproject.toml` → `testpaths`), so `ai/tests` is not
collected yet. Running the `ai` tests therefore needs either an explicit path
(`python -m pytest -q ai/tests`) or a shared-config change (add `ai/tests` to `testpaths`) —
the latter is a shared-file change owned by B and must go in its own PR. Use the explicit
path for this task; do not edit `pyproject.toml` here.

**Prohibited.** Editing `backend/`; moving or duplicating the OCR pipeline; any real
document or personal data; any accuracy figure presented as a production claim; adding an
ML/OCR dependency (the task must run with `backend/requirements-dev.txt` alone).

**PR base / order.** `research/grounded-foundation`, independent.

---

## What these tasks deliberately do not do

- No framework, database, identity provider, storage vendor or hosting decision. Those
  remain owner decisions, recorded in
  [`../pre-coding/phase-3-technology-decisions.md`](../pre-coding/phase-3-technology-decisions.md).
- No authentication, authorization, tenancy, upload, persistence or audit work — each needs
  a contract and security review first
  ([`INTEGRATION_CHECKLIST.md`](INTEGRATION_CHECKLIST.md#4-security-gates)).
- No regulatory rule activation and no OCR accuracy claim.
