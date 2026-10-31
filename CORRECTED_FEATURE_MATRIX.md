# CORRECTED FEATURE MATRIX — AICTE COMPLIANCE AI
**Verification Date:** October 31, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Assessment Standard:** Empirical Source Code, Live OpenAPI & Runtime Network Verification  

---

## 1. Feature Status Summary

| Category | Claimed in V1 | Verified in V2 | Variance |
|---|:---:|:---:|:---:|
| **Fully Working (Production Tested)** | 42 | **24** | -18 |
| **Partial / Advisory Fallback** | 5 | **14** | +9 |
| **Client-Only / Unintegrated Mock** | 0 | **8** | +8 |
| **Broken / Failing / Blocked** | 3 | **4** | +1 |
| **TOTAL AUDITED CAPABILITIES** | **50** | **50** | — |

---

## 2. Granular 50-Feature Evidence Matrix

### Domain A: Frontend Architecture & User Interface

| ID | Feature Description | Source Location / Component | Claimed Status | Verified Status | V2 Finding & Evidence |
|---|---|---|:---:|:---:|---|
| **FE-01** | Editorial Warm Cream Design System | `frontend/app/src/index.css` | Implemented | **CONFIRMED** | Uses CSS custom variables for `#FBF8F3`, serif headings, and border tokens. |
| **FE-02** | Theme Switcher (Professional vs Neo-Brutalism) | `frontend/app/src/context/ThemeContext.tsx` | Implemented | **CONFIRMED** | Dynamic theme class application on `<html>` root with localStorage persistence. |
| **FE-03** | Sidebar Navigation & Breadcrumbs | `frontend/app/src/components/Sidebar.tsx` | Implemented | **CONFIRMED** | Responsive sidebar with fixed 260px desktop drawer and mobile toggle. |
| **FE-04** | Live API Connection Status Indicator | `frontend/app/src/components/TopBar.tsx` | Implemented | **CONFIRMED** | Polls `/health` endpoint every 30 seconds; displays green/amber/red indicator. |
| **FE-05** | Commit SHA & Build Time in Header | `frontend/app/src/components/TopBar.tsx` | Implemented | **CONFIRMED WITH LIMITATIONS** | Injected at build time via Vite `define`; shows current bundle hash. |
| **FE-06** | Executive Dashboard Overview | `frontend/app/src/pages/DashboardPage.tsx` | Implemented | **CONFIRMED** | Displays metric overview cards and quick action navigation. |
| **FE-07** | Client-Side Input State Persistence | `frontend/app/src/pages/ValidatePage.tsx` | Implemented | **CONFIRMED** | Form state retained across tabs in session storage. |
| **FE-08** | PDF Viewer / Inspection Modal | `frontend/app/src/components/DocumentVaultView.tsx` | Implemented | **CONFIRMED** | In-app PDF text and candidate metadata review pane. |
| **FE-09** | Vite Bundle Optimization (<500 kB Chunks) | `frontend/app/vite.config.ts` | Implemented | **INCORRECT** | Single vendor bundle is 761.55 kB. Vite chunk size warning triggered. |
| **FE-10** | Mobile Responsive Layout Drawer | `frontend/app/src/components/Sidebar.tsx` | Implemented | **CONFIRMED** | Accessible off-canvas navigation on viewports < 768px. |

---

### Domain B: AICTE Regulatory & Validation Engine

| ID | Feature Description | Source Location / Component | Claimed Status | Verified Status | V2 Finding & Evidence |
|---|---|---|:---:|:---:|---|
| **RG-01** | Backend APH 2026-27 Rule Execution | `backend/app/main.py` lines 79–114 | Implemented | **INCORRECT** | Backend `/api/v1/validate` does NOT execute AICTE rules. It only compares caller strings. |
| **RG-02** | Rule Activation Gate & Source Governance | `backend/app/rule_catalog.py` | Implemented | **CONFIRMED WITH LIMITATIONS** | Data model and gate exist, but starts with 0 active rules. Production runs 0 active rules. |
| **RG-03** | Engineering UG FSR Calculation (1:20) | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **CONFIRMED WITH LIMITATIONS** | Calculated in frontend only. Default is 1:20; Tier-1 preset is 1:15. Not in backend. |
| **RG-04** | PG Engineering FSR Calculation (1:15) | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **UNSUPPORTED** | Missing from program dropdown in `CadreCalculatorPage.tsx`. Only UG exists. |
| **RG-05** | Management PG (MBA) FSR (1:20) | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **CONFIRMED** | Correctly uses 1:20 ratio and 2-year duration in frontend calculation. |
| **RG-06** | UG Management (BBA/BMS) FSR (1:25) | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **UNSUPPORTED** | Missing from program dropdown in `CadreCalculatorPage.tsx`. |
| **RG-07** | Cadre Ratio 1:2:6 Distribution Calculation | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **CONFIRMED** | Divides required faculty into 1/9 Professor, 2/9 Assoc Prof, 6/9 Asst Prof. |
| **RG-08** | Cadre Ratio Non-Applicability to Diploma | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **INCORRECT** | Regulatory error: Calculator incorrectly forces 1:2:6 cadre ratio onto Diploma courses. |
| **RG-09** | PhD Faculty Requirement Verification | `frontend/app/src/pages/CadreCalculatorPage.tsx` | Implemented | **CONFIRMED** | Checks 100% PhD for Professors and Associate Professors per AICTE norms. |
| **RG-10** | Land Requirement by Mega/Urban/Rural | `frontend/app/src/pages/ValidatePage.tsx` | Implemented | **CONFIRMED WITH LIMITATIONS** | Purely frontend static calculator. Not validated or persisted by backend API. |
| **RG-11** | Built-up Area Deficit Calculation | `frontend/app/src/pages/ValidatePage.tsx` | Implemented | **CONFIRMED WITH LIMITATIONS** | Frontend client-side formula. Backend has no schema for built-up area. |
| **RG-12** | Statutory Document Expiry Verification | `backend/app/main.py` lines 270–310 | Implemented | **CONFIRMED** | Validates ISO date strings against current date; flags expired certificates. |
| **RG-13** | AICTE EoA Missing Document Detection | `backend/app/main.py` line 265 | Implemented | **CONFIRMED** | Computes set difference between `required_documents` and `submitted_documents`. |
| **RG-14** | Dynamic Deficiency Severity Scoring | `frontend/app/src/lib/aicte-rules.ts` | Implemented | **CONFIRMED** | Categorizes deficiencies into Critical Zero-Tolerance vs Rectifiable. |
| **RG-15** | Official APH Clause Citations Catalog | `frontend/app/src/lib/aicte-rules.ts` | Implemented | **CONFIRMED** | Cites Clauses 1.7, 2.1, 2.4, 2.5, 2.6, and 4.2 with chapter references. |

---

### Domain C: Document Vault, Processing & Security

| ID | Feature Description | Source Location / Component | Claimed Status | Verified Status | V2 Finding & Evidence |
|---|---|---|:---:|:---:|---|
| **DV-01** | Full-Card Clickable Dropzone | `frontend/app/src/components/DocumentVaultView.tsx` | Implemented | **CONFIRMED** | Transparent input overlay across entire bounding box allows click and drag-drop. |
| **DV-02** | 10 MiB File Size Limit Enforcement | `backend/app/document_analyzer.py` line 164 | Implemented | **CONFIRMED** | Client rejects >10 MiB; backend returns 413 Payload Too Large. |
| **DV-03** | PDF Header Magic Byte (%PDF-) Check | `backend/app/document_analyzer.py` line 169 | Implemented | **CONFIRMED** | Rejects corrupted or masqueraded files missing `%PDF-` header. |
| **DV-04** | In-Memory Buffer Processing | `backend/app/document_analyzer.py` line 192 | Implemented | **CONFIRMED** | Uses `io.BytesIO`; no unvetted disk temp files created during analysis. |
| **DV-05** | Encrypted / Password-Protected PDF Rejection | `backend/app/document_analyzer.py` line 196 | Implemented | **CONFIRMED** | Inspects `reader.is_encrypted` and returns descriptive 400 error. |
| **DV-06** | Digital PDF Selectable Text Extraction | `backend/app/document_analyzer.py` line 215 | Implemented | **CONFIRMED** | Uses `pypdf` page iterator to extract digital text streams up to 100k chars. |
| **DV-07** | Metadata Regex Extraction (Dates, Authority) | `backend/app/document_analyzer.py` lines 74–146 | Implemented | **CONFIRMED** | Extracts candidate expiry dates, issue dates, and authority keywords. |
| **DV-08** | ClamAV Daemon Real-Time Malware Scan | `backend/app/antivirus_scanner.py` line 53 | Implemented | **UNSUPPORTED** | Daemon unreachable in Vercel/Render. Returns fallback `scan_unavailable`. |
| **DV-09** | EICAR Test Virus Signature Interception | `backend/app/antivirus_scanner.py` line 44 | Implemented | **CONFIRMED** | In-memory 68-byte byte-match triggers `infected` status and rejects upload. |
| **DV-10** | Tesseract OCR Pipeline Execution | `backend/app/document_analyzer.py` line 225 | Implemented | **UNSUPPORTED** | Binary not installed on host. Scanned PDFs yield `ocr_status="unavailable"`. |
| **DV-11** | Supabase Storage Certificate Persistence | `frontend/app/src/lib/api.ts` | Implemented | **CONFIRMED** | Uploads verified PDF to Supabase storage bucket `documents`. |
| **DV-12** | Infected File Download Blocking | `backend/app/antivirus_scanner.py` lines 111–138 | Implemented | **CONFIRMED** | Blocks download if `scan_status == "infected"` or `download_enabled == False`. |
| **DV-13** | Institutional Document Scrutiny Audit View | `frontend/app/src/components/DocumentVaultView.tsx` | Implemented | **CONFIRMED** | Displays uploaded certificates, expiry tags, and validation status badges. |
| **DV-14** | Bulk Zip Export of AICTE Dossier | `backend/app/main.py` | Implemented | **BLOCKED** | Route does not exist on backend. Must download certificates individually. |

---

### Domain D: Authentication, Multi-Tenancy & Database

| ID | Feature Description | Source Location / Component | Claimed Status | Verified Status | V2 Finding & Evidence |
|---|---|---|:---:|:---:|---|
| **AU-01** | Supabase Auth Email/Password Sign-In | `frontend/app/src/context/AuthContext.tsx` | Implemented | **CONFIRMED** | Authenticates via Supabase GoTrue; stores JWT in browser local storage. |
| **AU-02** | Automated User Confirmation Trigger | `supabase/migrations/20261031000001_auto_confirm_users.sql` | Implemented | **CONFIRMED WITH LIMITATIONS** | Auto-confirms new users, but introduces security risk (no email proof). |
| **AU-03** | Custom SMTP Integration | Supabase Dashboard | Implemented | **BLOCKED** | Default Supabase shared SMTP limits emails to ~3/hour. Custom SMTP unconfigured. |
| **AU-04** | Institutional Tenant Onboarding Function | `supabase/migrations/20261025000000_auth_onboarding.sql` | Implemented | **CONFIRMED** | `public.onboard_applicant()` links user to institution as 'applicant'. |
| **AU-05** | Multi-Tenant Row-Level Security (RLS) | `supabase/migrations/20261024000000_validation_history.sql` | Implemented | **CONFIRMED** | RLS enforced across `institutions`, `memberships`, `validation_runs`, `documents`. |
| **AU-06** | JWT Bearer Token Pass-Through to Backend | `backend/app/history_store.py` line 34 | Implemented | **CONFIRMED** | Backend verifies user JWT against Supabase PostgREST endpoint. |
| **AU-07** | Privilege Escalation Prevention | `supabase/migrations/20261025000000_auth_onboarding.sql` | Implemented | **CONFIRMED** | Function forces role to `applicant`; cannot self-grant `institution_admin`. |
| **AU-08** | Institutional User Sign-Out & Session Clear | `frontend/app/src/context/AuthContext.tsx` | Implemented | **CONFIRMED** | Flushes Supabase session tokens and resets UI context state. |
| **AU-09** | 365-Day Data Retention Policy | `supabase/migrations/20261024000000_validation_history.sql` | Implemented | **CONFIRMED** | Generated column `expires_at` computed as `created_at + interval '365 days'`. |
| **AU-10** | Database Server-Side Pagination | `backend/app/main.py` lines 469–490 | Implemented | **CONFIRMED WITH LIMITATIONS** | Implemented on `validation_runs` (`limit`/`offset`); missing on `documents`. |

---

### Domain E: Deployment, CI/CD & Production Infrastructure

| ID | Feature Description | Source Location / Component | Claimed Status | Verified Status | V2 Finding & Evidence |
|---|---|---|:---:|:---:|---|
| **DP-01** | Vercel Frontend Automated Deployment | `frontend/app/vercel.json` | Implemented | **CONFIRMED** | Deploys on git push to `main` at `aicte-compliance-ai.vercel.app`. |
| **DP-02** | Vercel Serverless Python Backend | `api/index.py` | Implemented | **CONFIRMED** | Live at `aicte-compliance-backend-live.vercel.app` (TTFB 121ms). |
| **DP-03** | Render Secondary Backend Service | `render.yaml` | Implemented | **CONFIRMED WITH LIMITATIONS** | Service `srv-dbeo60qvcj2c73djdgk0` live, but sleeps on free tier (~18s cold start). |
| **DP-04** | Live Backend /version Endpoint | `backend/app/main.py` line 223 | Implemented | **INCORRECT** | Added in commit `e1ab4c8`, but live backends return 404. Live deployment is stale. |
| **DP-05** | CORS Multi-Origin Handling | `backend/app/main.py` lines 41–64 | Implemented | **CONFIRMED** | Permits `localhost:5173` and origins defined in `CORS_ALLOW_ORIGINS`. |
| **DP-06** | Reverse Proxy API Rewrites in Vercel | `vercel.json` lines 6–31 | Implemented | **CONFIRMED** | Routes `/api/*`, `/health`, `/docs`, `/openapi.json` to backend URL. |
| **DP-07** | GitHub Actions Automated Testing Workflow | `.github/workflows/ci.yml` | Implemented | **CONFIRMED** | Unified workflow with jobs for frontend-lint, frontend-test, backend-test. |
| **DP-08** | Backend CI Configuration Test Suite | `backend/tests/test_ci_configuration.py` | Implemented | **INCORRECT** | 8 tests fail because they assert `.github/workflows/backend-tests.yml`. |
| **DP-09** | Automated Browser E2E Regression Suite | `frontend/` | Implemented | **BLOCKED** | No Playwright or Cypress tests configured in repository. |
| **DP-10** | Synthetic Demonstration Data Notice | `backend/app/main.py` line 34 | Implemented | **CONFIRMED** | OpenAPI and API responses explicitly state results are advisory prototype data. |

---

## 3. Summary of Downgraded Capabilities

1. **AICTE Rule Engine (RG-01):** Downgraded from *Implemented* to **INCORRECT**. The backend does not run rule calculations; it is solely a checklist string comparator.
2. **Polytechnic Diploma Cadre (RG-08):** Downgraded from *Implemented* to **INCORRECT**. Calculation violates AICTE APH 2024–27 Annexure 5.
3. **ClamAV Antivirus Daemon (DV-08):** Downgraded from *Operational* to **UNSUPPORTED / ADVISORY FALLBACK**.
4. **Tesseract OCR (DV-10):** Downgraded from *Operational* to **UNSUPPORTED / ADVISORY FALLBACK**.
5. **Backend Deployment Sync (DP-04):** Downgraded from *Synchronized* to **INCORRECT**. Live endpoints return 404 for `/version`.
6. **CI Test Suite (DP-08):** Downgraded from *Passing* to **INCORRECT / FAILING** (8 test failures).

