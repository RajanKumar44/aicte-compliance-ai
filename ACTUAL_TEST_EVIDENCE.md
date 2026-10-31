# ACTUAL TEST EVIDENCE & REPRODUCIBLE QA REPORT — AICTE COMPLIANCE AI
**Verification Date:** October 31, 2026  
**Auditor:** Principal QA Automation Lead & Systems Auditor  
**Repository:** [github.com/RajanKumar44/aicte-compliance-ai](https://github.com/RajanKumar44/aicte-compliance-ai) (`main` @ `0c3ea60`)  

---

## 1. Test Portfolio Overview

The previous audit report claimed that **"7 passing Vitest tests (100% success rate)"** represented the testing state of the application.

**Correction:**
1. The 7 frontend tests do **not** use Vitest; they execute via the native Node.js test runner (`node --test`). They test utility string formatting and CSV escaping only.
2. The repository contains an extensive **239-test backend Python test suite** in `backend/tests/` that was completely omitted from the previous report.
3. In the backend test suite, **8 tests are actively FAILING** due to CI workflow file renames.
4. An additional **50 API integration tests are BLOCKED** on Windows development sandboxes due to Starlette/AnyIO TestClient event loop deadlocks.
5. Zero automated browser end-to-end (E2E) tests exist.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     ACTUAL TEST PORTFOLIO CENSUS                             │
├───────────────────────────────┬───────┬────────┬────────┬─────────┬──────────┤
│ Test Suite                    │ Total │ Passed │ Failed │ Blocked │ % Passed │
├───────────────────────────────┼───────┼────────┼────────┼─────────┼──────────┤
│ Frontend (Node --test)        │ 7     │ 7      │ 0      │ 0       │ 100.0%   │
│ Backend Pure Unit & Rules     │ 181   │ 181    │ 0      │ 0       │ 100.0%   │
│ Backend CI Configuration      │ 8     │ 0      │ 8      │ 0       │ 0.0%     │
│ Backend API TestClient (Win)  │ 50    │ 0      │ 0      │ 50      │ 0.0% (Blk│
│ Browser E2E (Playwright)      │ 0     │ 0      │ 0      │ 0       │ N/A      │
├───────────────────────────────┼───────┼────────┼────────┼─────────┼──────────┤
│ TOTAL COMBINED TEST SUITE     │ 246   │ 188    │ 8      │ 50      │ 76.4%    │
└───────────────────────────────┴───────┴────────┴────────┴─────────┴──────────┘
```

---

## 2. Test Execution Logs & Evidence

### 2.1 Frontend Test Execution
- **Command:** `npm --prefix frontend/app test -- --run`
- **Output Log:**
  ```text
  npm notice run app@0.0.0 test
  npm notice run node --experimental-strip-types --test --test-isolation=none ../tests/*.test.mts --run
  ✔ findings search composes with finding-code filters (19.9339ms)
  ✔ finding search includes document, message, and code and does not mutate source (0.7283ms)
  ✔ CSV exports request, response, timestamps, evidence, and safe spreadsheet cells (1.2822ms)
  ✔ CSV protects formula initiators after leading spaces and handles zero findings (0.6343ms)
  ✔ step validation checks context and document requirements at the relevant step (0.499ms)
  ✔ duplicate check matches backend trim-only, case-sensitive comparison (0.2377ms)
  ✔ final request validation reports all required fields without changing the request (0.4293ms)
  ℹ tests 7
  ℹ suites 0
  ℹ pass 7
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 149.8345
  ```
- **Auditor Evaluation:** All 7 tests pass in 150ms. However, test coverage is limited strictly to `frontend/tests/findings.test.mts`, `report.test.mts`, and `validation-flow.test.mts`. **Zero React UI components, forms, auth contexts, or PDF upload dropzones are covered by unit or component tests.**

---

### 2.2 Backend Test Suite Execution
- **Command:** `pytest backend/tests/test_rule_catalog.py backend/tests/test_rule_activation.py backend/tests/test_ocr_adapter.py backend/tests/test_ocr_adapter_engine.py backend/tests/test_ownership_boundaries.py backend/tests/test_ci_configuration.py backend/tests/test_ocr_image_validation.py backend/tests/test_ocr_pipeline.py backend/tests/test_ocr_cli.py`
- **Execution Summary:** 189 items collected, **181 passed, 8 failed** in 4.22s.
- **Root Cause of 8 Failures (`test_ci_configuration.py`):**
  ```text
  FAILED backend/tests/test_ci_configuration.py::test_workflow_file_is_present
  FAILED backend/tests/test_ci_configuration.py::test_pull_requests_targeting_either_base_branch_are_checked
  FAILED backend/tests/test_ci_configuration.py::test_pushes_to_long_lived_branches_are_checked
  FAILED backend/tests/test_ci_configuration.py::test_workflow_never_uses_pull_request_target
  FAILED backend/tests/test_ci_configuration.py::test_workflow_permissions_are_read_only
  FAILED backend/tests/test_ci_configuration.py::test_full_suite_runs_in_ci
  FAILED backend/tests/test_ci_configuration.py::test_workstream_checks_cannot_be_silently_dropped_from_ci
  FAILED backend/tests/test_ci_configuration.py::test_workflow_declares_no_secrets_and_no_upload_steps

  AssertionError: missing workflow file: C:\Users\Rajan\OneDrive\Desktop\aicte-compliance-ai\.github\workflows\backend-tests.yml
  ```
- **Explanation:** In commit `e1ab4c8`, CI workflows were consolidated into `.github/workflows/ci.yml`. However, the test file `backend/tests/test_ci_configuration.py` lines 14–25 was hardcoded to:
  ```python
  WORKFLOW_PATH = Path(".github/workflows/backend-tests.yml")
  ```
  Because the old file was deleted during CI consolidation, all 8 assertions in `test_ci_configuration.py` fail immediately.

---

### 2.3 Backend TestClient API Suite (50 Blocked Tests)
- **Affected Test Files:**
  - `test_api_contract.py` (16 tests)
  - `test_cors.py` (2 tests)
  - `test_document_analysis.py` (7 tests)
  - `test_history_api.py` (5 tests)
  - `test_validation.py` (9 tests)
  - `test_validation_security.py` (11 tests)
- **Status:** **BLOCKED ON WINDOWS RUNTIME**.
- **Evidence:** Running `pytest backend/tests/test_cors.py` hangs indefinitely. Under Python 3.14 on Windows, Starlette's `TestClient` utilizes `anyio` memory streams that trigger an asynchronous socket deadlock within restricted sandbox subprocesses. These tests must be run inside a Linux Docker container or on GitHub Actions Linux runners.

---

## 3. High-Priority Workflow Verification Using Synthetic Data

### Workflow 1: AICTE Document List Validation (`POST /api/v1/validate`)
- **Probe Target:** `https://aicte-compliance-backend-live.vercel.app/api/v1/validate`
- **Request Payload:**
  ```json
  {
    "institution_id": "INST-TEST-2026",
    "application_type": "eoa",
    "required_documents": [
      "Fire Safety Certificate",
      "Building Structural Stability Certificate",
      "Occupancy Certificate"
    ],
    "submitted_documents": [
      "Fire Safety Certificate"
    ],
    "expiry_dates": {
      "Fire Safety Certificate": "2025-01-01"
    }
  }
  ```
- **Observed Response (HTTP 200 OK):**
  ```json
  {
    "institution_id": "INST-TEST-2026",
    "application_type": "eoa",
    "status": "attention_required",
    "validation_scope": "caller_supplied_checklist_only",
    "missing_documents": [
      "Building Structural Stability Certificate",
      "Occupancy Certificate"
    ],
    "expired_documents": [
      "Fire Safety Certificate"
    ],
    "findings": [
      {
        "code": "DOC_EXPIRED",
        "document": "Fire Safety Certificate",
        "message": "Document 'Fire Safety Certificate' expired on 2025-01-01."
      },
      {
        "code": "DOC_MISSING",
        "document": "Building Structural Stability Certificate",
        "message": "Required document 'Building Structural Stability Certificate' has not been submitted."
      },
      {
        "code": "DOC_MISSING",
        "document": "Occupancy Certificate",
        "message": "Required document 'Occupancy Certificate' has not been submitted."
      }
    ],
    "checked_at": "2026-10-31T06:40:00Z",
    "source": "synthetic_demo_input",
    "notice": "Response of POST /api/v1/validate — a preliminary checklist result..."
  }
  ```
- **Auditor Verification:** **PASS.** The document comparison, missing document detection, and expiry date flagging function accurately.

---

### Workflow 2: EICAR Test Virus Rejection (`POST /api/v1/documents/analyze`)
- **Synthetic Test Payload:** Multipart PDF upload containing 68-byte EICAR test string:
  `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`
- **Observed Response (HTTP 400 Bad Request):**
  ```json
  {
    "detail": "Security Alert: Known malware signature detected: Eicar-Test-Signature. File quarantined.. Document rejected."
  }
  ```
- **Auditor Verification:** **PASS.** In-memory signature scanner immediately rejects infected payloads before parsing.

---

### Workflow 3: Scanned / Image-Only PDF Extraction
- **Synthetic Test Payload:** 1-page raster scanned PDF with zero selectable text streams.
- **Observed Response (HTTP 200 OK):**
  ```json
  {
    "filename": "scanned_doc.pdf",
    "page_count": 1,
    "ocr_status": "unavailable",
    "warnings": [
      "Document appears to be scanned or image-only without selectable text. The OCR engine (tesseract) is not installed in this environment; please upload a searchable PDF or verify values manually."
    ]
  }
  ```
- **Auditor Verification:** **CONFIRMED WITH LIMITATIONS.** The backend gracefully falls back to `ocr_status="unavailable"` without crashing. Tesseract is confirmed inactive in production.

