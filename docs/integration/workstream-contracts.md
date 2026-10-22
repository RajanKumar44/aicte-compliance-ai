# Workstream boundaries and integration contracts

**Status:** proposal for a three-person split. It describes the repository as it exists
on `research/grounded-foundation` plus the audit branch, **not** a claim that three
applications exist.

**Ownership documents on PR #4:** `WORKSTREAMS.md`, `frontend/README.md`,
`backend/WORKSTREAM.md` and `ai/README.md` are proposed in
[PR #4](https://github.com/rajaryan1111/aicte-compliance-ai/pull/4) (branch
`docs/three-person-workstream-split`, still open). This file deliberately does **not**
duplicate or replace them, so that both changes can land without conflicting. Until
PR #4 merges, the repository has no `frontend/` or `ai/` directory; OCR lives in
`backend/`.

## What exists today

| Area | Location | State |
|---|---|---|
| Checklist validation API | `backend/app/main.py` (`/health`, `/api/v1/validate`) | Implemented, tested |
| OCR contract and pipeline | `backend/app/ocr_adapter.py`, `backend/app/ocr_pipeline.py` | Implemented, tested (synthetic only) |
| Local OCR CLI | `backend/app/ocr_cli.py` | Implemented, tested |
| Rule catalogue + activation gate | `backend/app/rule_catalog.py` | Implemented, tested; **no rule defined or active** |
| Tests | `backend/tests/` | Implemented |
| Frontend application | — | **Does not exist** |
| `ai/` service | — | **Does not exist** (proposed in PR #4) |
| Persistence, auth, storage, audit | — | **Does not exist** |

## Ownership proposal

| Workstream | Proposed owner | Owns (after PR #4 merges) | Must not touch during independent work |
|---|---|---|---|
| Frontend | Contributor 1 (unnamed) | `frontend/` | `backend/`, `ai/`, `.github/`, root config, `docs/` |
| Backend / platform | Contributor 2 (unnamed) | `backend/` (API, validation, auth, persistence, audit) | `frontend/`, `ai/` |
| AI / OCR | Contributor 3 (unnamed) | `ai/` (extraction, engine integration, evaluation) | `frontend/`, `backend/` |

Shared surfaces requiring explicit agreement and a separate integration PR:
`docs/`, `.github/`, `README.md`, root files (`pyproject.toml`, `.gitignore`,
`.env.example`, `.python-version`), dependency manifests under `backend/`, and any
change to the contracts below.

**Owners are not assigned.** Assigning the three people is an owner decision that this
document cannot make.

## Where OCR code lives — decision recorded, not implemented

The current OCR implementation stays in `backend/`. Moving it to `ai/` would change
module paths used by `backend/tests/test_ocr_pipeline.py`, `test_ocr_cli.py`,
`test_ocr_adapter_engine.py`, `test_ocr_image_validation.py`, the CI smoke test and the
documented CLI command. Any migration therefore needs its own PR that:

1. declares the new import path and keeps or rewrites the existing tests;
2. keeps `Pillow`/`pytesseract` optional and out of `backend/requirements.txt`;
3. re-verifies the CI jobs and the CLI command;
4. states whether `backend/` keeps a thin adapter or loses OCR entirely.

**Do not create empty placeholder applications or move files to make the folder
structure look complete.**

## Implemented contract: checklist validation API

Request (`POST /api/v1/validate`):

```json
{
  "institution_id": "string (1-100, trimmed, non-blank)",
  "application_type": "eoa | new_program | intake_change",
  "required_documents": ["non-empty strings, unique after trimming"],
  "submitted_documents": ["non-empty strings, unique after trimming"],
  "expiry_dates": {"document name": "YYYY-MM-DD"}
}
```

Response fields: `institution_id`, `application_type`, `status`
(`attention_required` | `preliminary_checks_passed`), `validation_scope`
(always `caller_supplied_checklist_only`), `missing_documents`,
`expired_documents`, `findings[]` (`code`, `document_type`, `message`, `evidence`),
`checked_at`, `source` (`synthetic_demo_input`), `notice`.

Invariants: the service loads no AICTE checklist; `preliminary_checks_passed` is not a
compliance finding; expiry evaluation uses the server's UTC date.

## Implemented contract: OCR boundary

`process_institution_document(image_bytes: bytes, engine: RawOCREngine) ->
OCRDocumentResult` with `fields: dict[str, OCRField]` (`value`, `confidence`,
`page_number`, `evidence_text`), `engine`, `engine_version`, `source_sha256`,
`warnings`, `requires_human_review=True`. Limits: 10 MiB bytes, 30 MP, JPEG/PNG/TIFF/
WEBP, 100,000-character aggregate OCR text, finite `0.0–1.0` confidence, strict ISO
dates. `parse_iso_date_candidate` never guesses day/month order.

Not implemented: PDF input, multi-frame coverage (first frame only, warned), bounding
boxes, persistent storage, any network call.

## Implemented contract: rule activation gate

`RuleRegistry.activate(rule)` is the only path to `ACTIVE`. It requires verified source
provenance (document version, retrieval date, named verifier and date), an approved
approval record, an `effective_from` date not preceding the publication date, and all
four test categories. It refuses caller-declared `ACTIVE`, malformed metadata and
duplicate/conflicting versions. There is **no evaluator**, no durable storage, and no
authenticated reviewer identity (the recorded `reviewer_id`/`verified_by` strings are
assertions, not proof). Supersession and retirement are not implemented.

## Proposed contracts (not agreed, not implemented)

| Contract | Needed decision |
|---|---|
| Document upload endpoint | Requires auth/RBAC, tenant isolation, private storage, malware scanning, size/page limits, retention; blocked |
| Persistence schema | `docs/canonical/backend-schema.md` is a proposal; DB/ORM not chosen |
| Findings/evidence payload shared with the frontend | Needs owner agreement on codes, statuses and evidence shape |
| Frontend ↔ backend API client | Framework not chosen; no OpenAPI-derived client exists |
| AI service boundary | Whether OCR stays in `backend/` or moves to `ai/` (see above) |

Treat any contract not listed as "implemented" above as **proposed**.

## Branch, commit and review convention

- Base: `research/grounded-foundation` (never commit directly to `main`).
- Branches: `feature/<area>-<short-topic>`, `fix/<area>-<topic>`, `docs/<topic>`.
- Each PR states: scope, exact head SHA tested, commands run, and whether CI ran on
  that SHA. A green check on a different PR or an older commit is not evidence.
- Backend checks run in CI for `main` and `research/grounded-foundation`, including pull
  requests targeting either branch — but only once the workflow change on PR #3 or PR
  #5 is merged.
- Do not merge another contributor's PR, retarget it, or force-push.
- Cross-folder changes go in a separate integration PR reviewed by all owners.

## Running checks per workstream

```bash
# shared (from the repository root; Python 3.11+, CI uses 3.12)
python -m venv .venv && . .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt

python -m pytest -q                     # whole suite
pytest -q                               # equivalent, via pyproject.toml pythonpath
ruff check backend/                     # lint
python -m compileall -q backend/app backend/tests

# backend workstream
python -m pytest -q backend/tests/test_validation.py backend/tests/test_validation_security.py
python -m pytest -q backend/tests/test_rule_catalog.py backend/tests/test_rule_activation.py

# AI/OCR workstream (optional engine dependencies)
python -m pip install -r backend/requirements-dev.txt -r backend/requirements-ocr.txt
python -m pytest -q backend/tests/test_ocr_pipeline.py backend/tests/test_ocr_adapter_engine.py \
  backend/tests/test_ocr_image_validation.py backend/tests/test_ocr_fixture_corpus.py
python -m pytest -q backend/tests/test_ocr_engine_integration.py   # needs Tesseract installed

# frontend workstream — no implementation exists; no build, lint or test command applies yet
```

## Dependency ownership

| Workstream | Requires |
|---|---|
| Shared backend tests | `backend/requirements-dev.txt` (pytest, httpx, Pillow, ruff) |
| Backend runtime | `backend/requirements.txt` (FastAPI, Pydantic) |
| AI/OCR optional | `backend/requirements-ocr.txt` (Pillow, pytesseract) + system Tesseract 5.x |
| Frontend | none declared — framework not chosen |

## Blocked on owner decisions

1. Identity provider, authorization model and tenant-isolation design.
2. Database/ORM and migration tooling.
3. Private storage backend, malware scanning and retention policy.
4. Whether OCR remains in `backend/` or moves to `ai/`.
5. Frontend framework, and the API contract it will consume.
6. Whether the rule gate is eventually backed by durable storage and authenticated
   approvers (required before any rule activation beyond synthetic tests).
7. Assignment of the three contributors and review responsibilities.

None of these may be worked around with placeholders that imply the control exists.
