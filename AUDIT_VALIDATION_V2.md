# AUDIT VALIDATION V2 — INDEPENDENT EVIDENCE VERIFICATION & CORRECTION REPORT
**Audit Standard:** ISO/IEC 25010 Rigorous Second-Pass Verification  
**Verification Date:** October 31, 2026  
**Auditor:** Principal Software Architect, DevSecOps Lead & Independent Regulatory Auditor  
**Repository:** [github.com/RajanKumar44/aicte-compliance-ai](https://github.com/RajanKumar44/aicte-compliance-ai)  
**Git Commit Audited:** `main` @ `0c3ea60`  
**Live Frontend Tested:** [https://aicte-compliance-ai.vercel.app/](https://aicte-compliance-ai.vercel.app/)  
**Live Backend Tested (Vercel):** [https://aicte-compliance-backend-live.vercel.app/](https://aicte-compliance-backend-live.vercel.app/)  
**Live Backend Tested (Render):** [https://aicte-compliance-backend.onrender.com/](https://aicte-compliance-backend.onrender.com/)  
**Supabase Project ID:** `qhclgxquuiqijlsbsouc`  

---

## 1. Executive Summary: Previous Claims vs. Verified Reality

An independent second-pass verification was performed to validate every assertion in the October 31, 2026 Audit Report.

**Finding:** The previous audit report exhibited severe confirmation bias, hallucinated backend filenames, accepted mock/client-side calculations as verified backend compliance engines, overlooked 239 backend tests (while failing to catch 8 broken CI tests), and awarded an unsubstantiated overall score of **87.5 / 100**.

Following empirical re-testing, live unsandboxed HTTP probes, inspection of the live OpenAPI 3.1.0 schema, and reconciliation against the official **AICTE Approval Process Handbook (APH 2024–25 to 2026–27 Annexure 5)**, the application score is **downgraded to 64.2 / 100 (Grade: C+ / Conditional Prototype)**.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AUDIT SCORE CORRECTION BREAKDOWN                          │
├───────────────────────────────┬─────────────────┬────────────────────────────┤
│ Audit Dimension               │ Claimed Score   │ Verified Score (V2)        │
├───────────────────────────────┼─────────────────┼────────────────────────────┤
│ 1. Frontend & UX UI           │ 94.0 / 100      │ 86.0 / 100 (Clean theme)   │
│ 2. Backend Regulatory Logic   │ 92.0 / 100      │ 42.0 / 100 (Checklist only)│
│ 3. Database & Security (RLS)  │ 90.0 / 100      │ 68.0 / 100 (Auto-confirm)  │
│ 4. Cloud Infrastructure CI/CD │ 82.0 / 100      │ 62.0 / 100 (Backend out-of-│
│                               │                 │             sync & 404)    │
│ 5. Processing Engines (OCR/AV)│ 68.0 / 100      │ 48.0 / 100 (No OCR/ClamAV) │
│ 6. Automated QA Test Suite    │ 86.0 / 100      │ 52.0 / 100 (8 broken tests)│
├───────────────────────────────┼─────────────────┼────────────────────────────┤
│ OVERALL COMPOSITE SCORE       │ 87.5 / 100 (A-) │ 64.2 / 100 (Grade: C+)     │
└───────────────────────────────┴─────────────────┴────────────────────────────┘
```

---

## 2. Re-Verification of Major Audit Claims

| Claim ID | Claim in Previous Report | Empirical Evidence & Live Inspection | Verdict |
|---|---|---|:---:|
| **CLM-01** | *Overall Quality Score is 87.5 / 100 (Production Ready)* | Regulatory formulas are missing from backend; 1:2:6 cadre wrongly applied to Diploma; backend out of sync with git `main`; ClamAV/Tesseract inactive. | **INCORRECT**<br>(Downgraded to 64.2) |
| **CLM-02** | *42 of 50 features fully implemented and production-tested* | Only 24 features genuinely work end-to-end. 14 operate in fallback; 8 exist only as unlinked frontend UI mockups; 4 are failing/broken. | **INCORRECT** |
| **CLM-03** | *Backend file structure has `aicte_rules.py`, `models.py`, `api.py`* | Files do not exist. Actual files are `backend/app/main.py`, `rule_catalog.py`, `document_analyzer.py`, `antivirus_scanner.py`. | **INCORRECT** |
| **CLM-04** | *FastAPI implements `GET /api/v1/norms/fsr`, `/cadre`, `/documents`* | Inspected live OpenAPI schema at `/openapi.json`. None of these routes exist on the backend. They were hallucinated. | **INCORRECT** |
| **CLM-05** | *Backend `/api/v1/validate` calculates FSR, Cadre, and Land deficits* | Backend `main.py` lines 79–114 only accept a document checklist and dates. OpenAPI states: *"this service loads no AICTE checklist and no rule set"*. | **INCORRECT** |
| **CLM-06** | *7 passing Vitest tests represent test suite* | Vitest is not used. 7 tests run on Node test runner in `frontend/tests/`. Backend has **239 pytest tests**, 8 of which are currently **failing** due to workflow path mismatches. | **INCORRECT** |
| **CLM-07** | *Production commit SHA is fully in sync on `0c3ea60`* | Frontend bundle matches (`index-CN5cgngk.js`). However, live Vercel & Render backends return **404 Not Found** on `/version`, proving they run an older commit prior to `e1ab4c8`. | **INCORRECT** |
| **CLM-08** | *Database has `profiles` and `validation_history` tables* | SQL migrations in `supabase/migrations/` define `institutions`, `institution_memberships`, and `validation_runs`. `profiles` does not exist. | **INCORRECT** |
| **CLM-09** | *ClamAV and Tesseract run with advisory fallback* | Confirmed: `antivirus_scanner.py` and `document_analyzer.py` explicitly return `scan_unavailable` and `ocr_status="unavailable"` in production. | **CONFIRMED** |
| **CLM-10** | *Auto-confirm users migration is safe and functional* | `20261031000001_auto_confirm_users.sql` automatically confirms all emails without verification, opening critical account takeover risks. | **CONFIRMED WITH LIMITATIONS** (High Security Risk) |

---

## 3. Reproducible Scoring Methodology

The corrected score of **64.2 / 100** is derived using an objective, weighted, penalty-deduction formula based on ISO/IEC 25010 software quality standards:

$$\text{Final Score} = \sum_{i=1}^{6} w_i \times S_i$$

### Category Weights and Scores:
1. **Frontend & UX Architecture ($w_1 = 0.20$, Score: 86.0)**
   - *Base:* 100.
   - *Deductions:* -8 for bundle size (>761 kB without code splitting); -6 for 11 Oxlint warnings on impure `useMemo` render loops.
   - *Subtotal:* **86.0**
2. **Backend API & Regulatory Engine ($w_2 = 0.25$, Score: 42.0)**
   - *Base:* 100.
   - *Deductions:* -30 for complete absence of AICTE FSR, Cadre, Land, and Built-up Area formulas in backend `/api/v1/validate`; -15 for missing `/norms/*` endpoints claimed in documentation; -8 for Diploma cadre miscalculation in frontend calculator; -5 for outdated API description in production OpenAPI.
   - *Subtotal:* **42.0**
3. **Database Architecture & Multi-Tenant Security ($w_3 = 0.20$, Score: 68.0)**
   - *Base:* 100.
   - *Deductions:* -20 for insecure `auto_confirm_new_user` trigger that verifies unauthenticated email registrations without validation; -12 for lack of server-side pagination on `validation_runs` and `institution_documents`.
   - *Subtotal:* **68.0**
4. **Cloud Infrastructure & CI/CD Pipeline ($w_4 = 0.15$, Score: 62.0)**
   - *Base:* 100.
   - *Deductions:* -20 because live production backends (Vercel & Render) are out of sync with `main` and return 404 for `/version`; -10 for Render free-tier cold start (~18s) with no automated keep-alive; -8 for failed CI workflow validation tests.
   - *Subtotal:* **62.0**
5. **Processing Engines (ClamAV & OCR) ($w_5 = 0.10$, Score: 48.0)**
   - *Base:* 100.
   - *Deductions:* -30 because ClamAV daemon is unreachable on Vercel and Render, running only in-memory string matching for EICAR; -22 because Tesseract native binary is not installed in production, causing scanned PDFs to fail extraction.
   - *Subtotal:* **48.0**
6. **Automated QA & Test Coverage ($w_6 = 0.10$, Score: 52.0)**
   - *Base:* 100.
   - *Deductions:* -20 because 8 tests in `backend/tests/test_ci_configuration.py` fail immediately; -18 for lack of automated end-to-end (Playwright/Cypress) tests for UI workflows; -10 because TestClient API tests hang under Windows sandbox.
   - *Subtotal:* **52.0**

### Composite Calculation:
$$\text{Final Score} = (0.20 \times 86.0) + (0.25 \times 42.0) + (0.20 \times 68.0) + (0.15 \times 62.0) + (0.10 \times 48.0) + (0.10 \times 52.0)$$
$$\text{Final Score} = 17.20 + 10.50 + 13.60 + 9.30 + 4.80 + 5.20 = \mathbf{64.20 / 100}$$

---

## 4. Discrepancy Reconciliation Summary

1. **Backend Regulatory Logic:**  
   The previous report claimed the backend evaluated AICTE APH 2026-27 rules. Inspection of [backend/app/main.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/main.py#L79-L114) and [backend/app/rule_catalog.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/rule_catalog.py#L1-L10) proves that **no active regulatory rules are evaluated by the backend**. The backend is solely a caller-supplied checklist validator. The FSR and Cadre calculations exist exclusively in [frontend/app/src/pages/CadreCalculatorPage.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/pages/CadreCalculatorPage.tsx).
2. **Regulatory Errors in Frontend:**  
   The frontend calculator applies the 1:2:6 Cadre ratio to Polytechnic Diploma programs, which directly violates AICTE APH 2024–27 Annexure 5 (where Cadre ratios apply only to Degree level). Furthermore, PG Engineering (1:15), UG Management (1:25), and PG HMCT (1:12) are absent from the calculation presets.
3. **Authentication Security:**  
   The auto-confirm trigger in [supabase/migrations/20261031000001_auto_confirm_users.sql](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/supabase/migrations/20261031000001_auto_confirm_users.sql) bypasses email ownership validation. While it avoids Supabase's 3-emails/hour rate limit, it introduces an immediate account takeover vulnerability if user emails are not verified.
4. **CI/CD Configuration Drift:**  
   A commit consolidated GitHub Actions into `.github/workflows/ci.yml`, but `backend/tests/test_ci_configuration.py` was hardcoded to require `.github/workflows/backend-tests.yml`, resulting in 8 test failures in the regression suite.

