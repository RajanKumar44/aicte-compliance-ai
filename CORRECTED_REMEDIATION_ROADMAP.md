# CORRECTED REMEDIATION ROADMAP — AICTE COMPLIANCE AI
**Audit Date:** October 31, 2026  
**Auditor:** Principal Software Architect, DevSecOps Lead & Systems Auditor  
**Repository:** [github.com/RajanKumar44/aicte-compliance-ai](https://github.com/RajanKumar44/aicte-compliance-ai)  

---

## 1. Prioritized Action Matrix

| Priority | Level | Count | Focus Areas | Target Resolution Window |
|---|---|:---:|---|---|
| **P0** | **Critical Security & Production Blocker** | 4 | Drop auto-confirm trigger, configure custom SMTP, sync backend deployments, fix Diploma cadre rule | Within 24–48 Hours |
| **P1** | **High / Regulatory & Parity Engine** | 4 | Fix CI workflow tests, migrate Cadre/FSR to backend, add missing APH programs, deploy OCR/AV worker | Within 7–14 Days |
| **P2** | **Medium / Performance & Scalability** | 3 | Vite manual code splitting (<250 kB), rate-limit PDF extraction, add Playwright E2E suite | Within 14–21 Days |
| **P3** | **Low / Code Quality & Tech Debt** | 2 | Clean 11 Oxlint memoization warnings, paginate document vault table | Within 30 Days |

---

## 2. Priority 0 (P0) — Immediate Critical Fixes (Within 48h)

### Task P0.1: Drop Insecure User Auto-Confirmation Trigger & Configure Custom SMTP
- **Defect:** `20261031000001_auto_confirm_users.sql` automatically confirms all registrations, opening an account takeover and email squatting vector.
- **Action Plan:**
  1. Execute database migration to drop the insecure trigger:
     ```sql
     drop trigger if exists on_auth_user_auto_confirm on auth.users;
     drop function if exists public.auto_confirm_new_user();
     ```
  2. In Supabase Dashboard (`Project Settings -> Authentication -> SMTP Settings`), input verified SMTP credentials from Resend, SendGrid, or Brevo.
  3. Ensure all institutional users must verify email ownership prior to gaining applicant or reviewer privileges.
- **Effort:** 2 Hours.

### Task P0.2: Fix Statutory Polytechnic Diploma Cadre Calculation
- **Defect:** [CadreCalculatorPage.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/pages/CadreCalculatorPage.tsx#L86-L90) applies the 1:2:6 cadre ratio to Polytechnic Diploma programs, directly violating AICTE APH 2024–27 Annexure 5.
- **Action Plan:**
  1. In `CadreCalculatorPage.tsx`, detect when `programKey === "polytechnic_diploma"`.
  2. Suppress the 1:2:6 ratio and the "Professor Deficit" card.
  3. Render the statutory Diploma staffing model: 1 Principal, 1 HoD per department, and balance as Lecturers/Senior Lecturers under FSR 1:25.
- **Effort:** 3 Hours.

### Task P0.3: Redeploy Production Backend to Sync with Commit `0c3ea60`
- **Defect:** Live backends on Vercel and Render return `404 Not Found` for `/version`, proving production is running an out-of-date build preceding commit `e1ab4c8`.
- **Action Plan:**
  1. Trigger production deployment on Vercel backend (`aicte-compliance-backend-live.vercel.app`) from `main` branch.
  2. Verify that `GET /version` returns HTTP 200 with commit SHA, environment, and build timestamp.
  3. Trigger manual redeploy on Render service `srv-dbeo60qvcj2c73djdgk0`.
- **Effort:** 1 Hour.

### Task P0.4: Fix 8 Failing CI Configuration Tests
- **Defect:** `backend/tests/test_ci_configuration.py` fails 8 tests because it asserts the deleted file `.github/workflows/backend-tests.yml`.
- **Action Plan:**
  1. Update line 20 in `test_ci_configuration.py` to point to `Path(".github/workflows/ci.yml")`.
  2. Run `pytest backend/tests/test_ci_configuration.py` and confirm 8/8 tests pass.
- **Effort:** 30 Minutes.

---

## 3. Priority 1 (P1) — High Priority & Engine Parity (7–14 Days)

### Task P1.1: Migrate Regulatory Calculations to Backend API
- **Defect:** AICTE FSR, Cadre, and Land calculations exist only in client-side React code. Backend `/api/v1/validate` only validates document names.
- **Action Plan:**
  1. Add Pydantic request model `CadreEvaluationRequest` and response model `CadreEvaluationResponse` in `backend/app/main.py`.
  2. Expose endpoint `POST /api/v1/compliance/cadre-evaluation`.
  3. Update frontend `CadreCalculatorPage.tsx` to consume the backend API, ensuring mathematical single-source-of-truth.
- **Effort:** 2 Days.

### Task P1.2: Expand APH 2024–27 Annexure 5 Programme Scope
- **Defect:** Calculator lacks UG Management (1:25), PG Engineering (1:15), and PG HMCT (1:12).
- **Action Plan:**
  1. Update `CADRE_PROGRAM_NORMS` in `frontend/app/src/lib/aicte-rules.ts` to include:
     - `management_ug`: FSR 25, Cadre 1:2:6.
     - `engineering_pg`: FSR 15, Cadre 1:1:1.
     - `hmct_pg`: FSR 12, Cadre 1:2:6.
  2. Add presets and dropdown options in `CadreCalculatorPage.tsx`.
- **Effort:** 1 Day.

### Task P1.3: Deploy Containerized ClamAV & Tesseract Worker on Render
- **Defect:** Serverless Vercel runtime lacks persistent daemons and C++ binaries, falling back to unverified scan statuses.
- **Action Plan:**
  1. Create `Dockerfile` in `backend/` installing `clamav`, `clamav-daemon`, and `tesseract-ocr`.
  2. Configure Render web service to build from Dockerfile.
  3. Route heavy file extraction and malware scanning workloads to Render.
- **Effort:** 3 Days.

---

## 4. Priority 2 (P2) — Performance, Security & E2E Testing (14–21 Days)

### Task P2.1: Vite Manual Code Splitting & Bundle Optimization
- **Defect:** Frontend JavaScript bundle is 761.55 kB.
- **Action Plan:**
  1. Configure `rollupOptions.output.manualChunks` in `vite.config.ts`:
     ```ts
     manualChunks: {
       vendor: ['react', 'react-dom', 'react-router'],
       supabase: ['@supabase/supabase-js'],
       icons: ['lucide-react']
     }
     ```
  2. Reduce main entry chunk below 200 kB.
- **Effort:** 1 Day.

### Task P2.2: Add Rate Limiting to Unauthenticated PDF Analysis
- **Defect:** `POST /api/v1/documents/analyze` allows unauthenticated, un-throttled 10 MiB PDF uploads.
- **Action Plan:**
  1. Install `slowapi` in `backend/requirements.txt`.
  2. Apply `@limiter.limit("10/minute")` to `POST /api/v1/documents/analyze`.
- **Effort:** 4 Hours.

### Task P2.3: Implement Playwright Automated E2E Regression Suite
- **Defect:** No automated browser test suite verifies full authentication -> document upload -> validation workflow.
- **Action Plan:**
  1. Initialize `@playwright/test` in `frontend/`.
  2. Write end-to-end tests for institutional login, certificate upload dropzone, and cadre calculator.
  3. Add E2E job to `.github/workflows/ci.yml`.
- **Effort:** 3 Days.

---

## 5. Priority 3 (P3) — Code Quality & Polish (30 Days)

### Task P3.1: Clean Up 11 Oxlint Impure `useMemo` Warnings
- **Defect:** Oxlint reports `new Date()` calls inside `useMemo` in `DocumentVaultView.tsx`.
- **Action Plan:**
  1. Pass reference current date as an explicit parameter or memo dependency.
- **Effort:** 2 Hours.

### Task P3.2: Implement Server-Side Pagination on Document Vault
- **Defect:** `GET /api/v1/documents` returns full array without limit/offset.
- **Action Plan:**
  1. Add `limit: int = Query(default=25)` and `offset: int = Query(default=0)`.
  2. Return paginated response envelope `StoredDocumentPage`.
- **Effort:** 1 Day.

---

## 6. Phased Timeline Visualization

```
Phased Remediation Plan (30 Days)
========================================================================

Days 1–3: CRITICAL SECURITY & DEPLOYMENT SYNC (P0)
├── SEC-01: Drop auto-confirm trigger & connect Custom SMTP
├── RG-08: Remove illegal 1:2:6 cadre ratio from Polytechnic Diploma
├── DP-04: Redeploy Vercel live backend to activate /version endpoint
└── QA-01: Update test_ci_configuration.py path to pass 8 failing tests

Days 4–10: REGULATORY ENGINE UNIFICATION & MISSING SCOPE (P1)
├── RG-01: Implement POST /api/v1/compliance/cadre on backend
├── RG-02: Add UG Management (1:25), PG Engg (1:15), PG HMCT (1:12)
└── DV-08/10: Build Docker container on Render with ClamAV & Tesseract

Days 11–20: SCALE, SECURITY & E2E AUTOMATION (P2)
├── FE-09: Vite manual chunk splitting (<250 kB entry)
├── SEC-03: Add rate limiting to /api/v1/documents/analyze
└── QA-02: Implement Playwright E2E browser regression tests

Days 21–30: CODE QUALITY & AUDIT HARDENING (P3)
├── FE-11: Clean 11 Oxlint useMemo warnings
├── AU-10: Add pagination to Document Vault table
└── Final verification audit sign-off
```

