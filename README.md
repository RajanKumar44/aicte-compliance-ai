# AICTE Compliance Assistant

A prototype for **preliminary checklist validation** and **advisory institutional-document
OCR**. It does not authenticate documents, verify institutional status, or decide
regulatory compliance.

## What is implemented

### 1. Checklist validation — caller-supplied data only
`POST /api/v1/validate` compares the `required_documents` / `submitted_documents`
lists and `expiry_dates` supplied in the request. It returns missing and expired
documents with `validation_scope: "caller_supplied_checklist_only"`.

- The service loads no AICTE checklist and no rule set; the caller supplies both lists.
- `preliminary_checks_passed` means only that the supplied lists agree. It is not a
  compliance, eligibility, or authenticity finding.

### 2. Advisory OCR — optional, local only
`backend/app/ocr_pipeline.py` implements an engine-neutral OCR contract
(`ocr_adapter.py`), an optional Tesseract adapter, field extraction for a small set
of context-labelled institutional fields (English and selected Hindi labels), and a
local CLI: `python -m backend.app.ocr_cli <image>`.

Implemented input/output limits: 10 MiB compressed bytes, 30 megapixels,
JPEG/PNG/TIFF/WEBP only, a 100,000-character aggregate OCR text budget, strict ISO
`YYYY-MM-DD` dates (ambiguous formats stay unresolved), single-year academic sessions
only, engine confidence confined to `0.0–1.0`, page/line/evidence provenance, source
SHA-256, and `requires_human_review=True` on every result.

- OCR output is evidence for a human reviewer, never proof of authenticity.
- There is **no upload endpoint**, no persistence and no external call.
- **No accuracy claim is made.** The fixture corpus is synthetic regression data, not a
  labelled held-out benchmark; the Tesseract test is a synthetic smoke test.
- PDFs are rejected as unsupported images. Multi-page/multi-frame files are processed
  from the first frame only and now report a warning; submit pages separately. Bounding
  boxes are not recorded. Hindi coverage is label extraction plus synthetic text
  fixtures only — the optional engine test is English.

### 3. Rule catalogue and activation gate — no rules, no evaluator
`backend/app/rule_catalog.py` defines metadata schemas plus a server-side activation
gate. It is governance scaffolding, not a regulatory rules engine.

- **No AICTE rule is defined, active, or executable** in this repository.
- The gate requires a verified source (exact document version, retrieval date, named
  reviewer and verification date), an attributable approval record with decision
  `approved`, an `effective_from` date, and positive/negative/boundary/exception tests.
- `RuleRegistry.activate` is the only transition to `ACTIVE`. It refuses
  caller-declared `ACTIVE` states, unverified or unapproved rules, incomplete test
  coverage, and conflicting duplicate versions.
- No rule expression is executed anywhere; there is no evaluator to call.
- Prototype limits: the registry is in-memory (lost on restart, not shared between
  workers), `reviewer_id`/`verified_by` are **recorded strings, not authenticated
  identities**, there is no durable audit trail, and supersession/retirement are not
  implemented. All AICTE rules stay inactive until authoritative applicability and
  amendment checks are complete.

## Not implemented (planned, not claimed)

Frontend application, `ai/` extraction service, authentication/authorization/RBAC,
institution-level tenant isolation, private document storage, malware scanning,
persistent audit logging, retention/deletion controls, PDF/scan ingestion, a rule
evaluator, an official-source verification workflow, and any AICTE integration.

## Production blockers

Public document upload and any production use remain blocked until authentication and
RBAC, tenant isolation, private storage, malware scanning, durable audit, retention
and deletion controls, and official-source verification of applicable AICTE documents
and amendments are implemented and security-tested. Testing uses synthetic data only;
no real institutional or personal documents are stored.

## Requirements and local setup

- **Python 3.11+** (the code uses `StrEnum`). CI runs **3.12**; `.python-version` pins
  3.12 for pyenv-style tools. Tested on Linux (CI and audit sandbox) and expected to
  work on macOS with the same commands; Windows is untested.
- No database, container, Node or frontend toolchain is required — none is implemented.

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
python -m pip install -r backend/requirements-dev.txt

python -m pytest -q             # full suite; `pytest -q` is equivalent
ruff check backend/             # lint (pinned in requirements-dev.txt)
python -m compileall -q backend/app backend/tests
```

Run the API from the repository root:

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
# GET  http://127.0.0.1:8000/health
# POST http://127.0.0.1:8000/api/v1/validate
```

The optional OCR engine needs the Tesseract system binary (not a Python package):

```bash
# Debian/Ubuntu
sudo apt-get install tesseract-ocr tesseract-ocr-eng
# macOS
brew install tesseract
tesseract --version   # verify the installation

python -m pip install -r backend/requirements-dev.txt -r backend/requirements-ocr.txt
python -m pytest -q backend/tests/test_ocr_engine_integration.py
python -m backend.app.ocr_cli path/to/synthetic-document.png --language eng
```

No environment variables are read today; `.env.example` documents planned settings as
comments only. `.env` and `.env.*` are git-ignored.

## Tests

Optional real-engine smoke test (requires the Tesseract system binary and
`backend/requirements-ocr.txt`):

```bash
python -m pip install -r backend/requirements-dev.txt -r backend/requirements-ocr.txt
python -m pytest -q backend/tests/test_ocr_engine_integration.py
```

The `Backend tests` workflow runs the same suite on `main` and
`research/grounded-foundation`, with a separate job for the optional Tesseract smoke
test. Pull requests targeting `research/grounded-foundation` are also covered once the
workflow change in PR #3 or PR #5 merges; before that, only PRs targeting `main`
trigger it. Passing synthetic tests does not establish OCR accuracy, regulatory
correctness, or production readiness.

## Working in this repository

`docs/integration/workstream-contracts.md` records the frontend/backend/AI ownership
proposal, the implemented versus proposed API/OCR/rule contracts, branch and review
conventions, per-workstream test commands and the open owner decisions. Frontend and
`ai/` workstream READMEs are proposed in PR #4 and are not part of this branch.

See `docs/` for the research record, the audit trail
(`docs/pre-coding/foundation-readiness-2026-10-23.md`) and remaining gates.
