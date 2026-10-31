# FEATURE INTEGRATION MATRIX
**Project:** AICTE Compliance AI (`RajanKumar44/aicte-compliance-ai`)  
**Audit Date:** 2026-10-31  
**Commit:** `0c3ea60`  

---

## 1. Feature Integration Table

| Feature Category & Capability | Frontend Present | Backend Present | API Connected | Database Connected | Deployed Live | Test Result | Final Status |
|---|---|---|---|---|---|---|---|
| **A. Dashboard Module** | | | | | | | |
| 1. Dashboard layout & metrics overview | Yes (`DashboardPage.tsx`) | Yes (`/health`, `/version`) | Yes | Yes (Supabase) | Yes | 200 OK | **PASS** |
| 2. Scrutiny readiness summary cards | Yes (`DashboardPage.tsx`) | Yes (`/api/v1/validation-runs`) | Yes | Yes | Yes | Rendered | **PASS** |
| 3. Live API health indicator | Yes (`HealthIndicator.tsx`) | Yes (`/health`) | Yes | N/A | Yes | 121ms TTFB | **PASS** |
| 4. Live commit SHA & version badge | Yes (`TopBar.tsx`) | Yes (`/version`) | Yes | N/A | Yes | Displayed | **PASS** |
| **B. Authentication & Access** | | | | | | | |
| 5. Email/password sign-in | Yes (`SignInPage.tsx`) | N/A (Supabase Auth) | Yes | Yes (`auth.users`) | Yes | Verified | **PASS** |
| 6. Email confirmation bypass / auto-valid | Yes (`AuthContext.tsx`) | N/A (Trigger in migration) | Yes | Yes (Trigger) | Yes | Verified | **PASS** |
| 7. 1-Click institutional evaluation access | Yes (`SignInPage.tsx`) | Yes (Synthetic fallback) | Yes | Yes | Yes | Verified | **PASS** |
| 8. Session persistence across reloads | Yes (`AuthContext.tsx`) | N/A (localStorage + SDK) | Yes | Yes | Yes | Verified | **PASS** |
| 9. Real transactional SMTP email delivery | No (UI hints only) | No (External SMTP) | No | No | No | Unconfigured | **BLOCKED** |
| 10. Magic link & password recovery | Yes (`SignInPage.tsx`) | Yes (Supabase OTP) | Yes | Yes | Yes | Rate-limited | **PARTIAL** |
| 11. Role-based institutional scoping | Yes (`RequireAuth.tsx`) | Yes (`history_store.py`) | Yes | Yes (`institution_memberships`) | Yes | RLS enforced | **PASS** |
| **C. Document Vault** | | | | | | | |
| 12. Full-box clickable drag & drop upload | Yes (`DocumentOcrVerifier.tsx`) | Yes (`/api/v1/documents`) | Yes | Yes | Yes | Native label | **PASS** |
| 13. PDF filetype & 10 MiB limit validation | Yes (`DocumentOcrVerifier.tsx`) | Yes (`document_analyzer.py`) | Yes | N/A | Yes | Tested 413 | **PASS** |
| 14. Real-time text extraction (pypdf) | Yes (`DocumentOcrVerifier.tsx`) | Yes (`document_analyzer.py`) | Yes | N/A | Yes | Chars extracted | **PASS** |
| 15. Cryptographic SHA-256 calculation | Yes (`DocumentOcrVerifier.tsx`) | Yes (`document_analyzer.py`) | Yes | Yes (`sha256` col) | Yes | 64-char hex | **PASS** |
| 16. Candidate date & authority extraction | Yes (`DocumentOcrVerifier.tsx`) | Yes (`document_analyzer.py`) | Yes | N/A | Yes | Regex parsed | **PASS** |
| 17. ClamAV daemon malware scanning | Yes (`DocumentOcrVerifier.tsx`) | Yes (`antivirus_scanner.py`) | Yes | N/A | Yes | Unconfigured host | **PARTIAL** |
| 18. OCR engine (Tesseract) for scanned PDFs | Yes (`DocumentOcrVerifier.tsx`) | Yes (`document_analyzer.py`) | Yes | N/A | Yes | Host binary absent | **PARTIAL** |
| 19. Institutional vault persistence | Yes (`DocumentOcrVerifier.tsx`) | Yes (`/api/v1/documents`) | Yes | Yes (`institution_documents`) | Yes | Stored | **PASS** |
| 20. AICTE 6-Mandatory Clearances Tracker | Yes (`DocumentOcrVerifier.tsx`) | Yes | Yes | Yes | Yes | Dynamic meter | **PASS** |
| 21. Multi-status Expiry Watchdog filter | Yes (`DocumentOcrVerifier.tsx`) | Yes | Yes | Yes | Yes | Filtered | **PASS** |
| 22. In-place metadata editing & correction | Yes (`DocumentOcrVerifier.tsx`) | Yes (`PATCH /api/v1/documents/{id}`) | Yes | Yes | Yes | Saved | **PASS** |
| 23. Document download with SHA-256 integrity | Yes (`DocumentOcrVerifier.tsx`) | Yes (`/api/v1/documents/{id}/download`)| Yes | Yes (`documents` bucket) | Yes | Downloaded | **PASS** |
| 24. Document deletion with RLS scoping | Yes (`DocumentOcrVerifier.tsx`) | Yes (`DELETE /api/v1/documents/{id}`) | Yes | Yes | Yes | Deleted | **PASS** |
| 25. Export Institutional Scrutiny Dossier | Yes (`DocumentOcrVerifier.tsx`) | Yes (Client-side aggregation) | Yes | Yes | Yes | Print rendered | **PASS** |
| 26. Preloaded OCR benchmark specimens | Yes (`DocumentOcrVerifier.tsx`) | N/A (Static verified set) | Yes | N/A | Yes | Isolated tab | **PASS** |
| **D. Statutory Validation Workspace** | | | | | | | |
| 27. 3-Step Scrutiny wizard | Yes (`ValidatePage.tsx`) | Yes (`/api/v1/validate`) | Yes | N/A | Yes | Validated | **PASS** |
| 28. Application type selection (EoA/New/Intake) | Yes (`ValidatePage.tsx`) | Yes (`/api/v1/validate`) | Yes | Yes | Yes | Enum checked | **PASS** |
| 29. Auto-fill dates from Vault certificates | Yes (`ValidatePage.tsx`) | N/A (Client bridge) | Yes | Yes | Yes | Populated | **PASS** |
| 30. Missing & expired document detection | Yes (`ValidationResults.tsx`) | Yes (`_validate_application`) | Yes | N/A | Yes | Findings output | **PASS** |
| 31. Nil-Deficiency Gap Predictor | Yes (`NilDeficiencyGapPredictor.tsx`) | Yes | Yes | N/A | Yes | Calculated | **PASS** |
| 32. Save scrutiny run to audit history | Yes (`ValidatePage.tsx`) | Yes (`/api/v1/validation-runs`) | Yes | Yes (`validation_runs`) | Yes | 201 Created | **PASS** |
| 33. Authoritative AICTE Handbook Rule Engine | Partially (Advisory scope only) | Partially (Candidate register) | Yes | Yes (`regulatory_rule_scopes`) | Yes | Scope notice | **PARTIAL** |
| **E. Cadre & Faculty Norms Calculator** | | | | | | | |
| 34. AICTE 1:2:6 cadre ratio calculation | Yes (`CadreCalculatorPage.tsx`) | N/A (Client compute) | N/A | N/A | Yes | Computed | **PASS** |
| 35. 1:15 & 1:20 Faculty-Student Ratio (FSR) | Yes (`CadreCalculatorPage.tsx`) | N/A (Client compute) | N/A | N/A | Yes | Computed | **PASS** |
| 36. Ph.D. faculty threshold compliance | Yes (`CadreCalculatorPage.tsx`) | N/A (Client compute) | N/A | N/A | Yes | Computed | **PASS** |
| 37. Illustrative advisory disclaimer labels | Yes (`CadreCalculatorPage.tsx`) | N/A | N/A | N/A | Yes | Labeled | **PASS** |
| **F. Compliance Guide & Handbook Knowledgebase** | | | | | | | |
| 38. APH 2024–2027 statutory reference guide | Yes (`AboutPage.tsx`) | N/A | N/A | Yes (`regulatory_rule_scopes`) | Yes | Rendered | **PASS** |
| 39. Candidate scope status & source citations | Yes (`AboutPage.tsx`, `ScopeNotice.tsx`) | Yes | Yes | Yes | Yes | Citations rendered | **PASS** |
| **G. Audit History & Compliance Dossiers** | | | | | | | |
| 40. Historical scrutiny runs retrieval | Yes (`HistoryPage.tsx`) | Yes (`GET /api/v1/validation-runs`) | Yes | Yes (`validation_runs`) | Yes | 200 OK | **PASS** |
| 41. Run inspection & request/result snapshot | Yes (`HistoryPage.tsx`) | Yes (`GET /api/v1/validation-runs/{id}`) | Yes | Yes | Yes | Loaded | **PASS** |
| 42. CSV report export | Yes (`HistoryPage.tsx`, `report.ts`) | N/A (Client export) | Yes | Yes | Yes | CSV generated | **PASS** |
| 43. Deletion of historical records | Yes (`HistoryPage.tsx`) | Yes (`DELETE /api/v1/validation-runs/{id}`) | Yes | Yes | Yes | 204 Deleted | **PASS** |
| **H. Institutional Management & Multi-Tenancy** | | | | | | | |
| 44. Institution onboarding (`onboard_applicant` RPC) | Yes (`AuthContext.tsx`) | Yes (`main.py`) | Yes | Yes (`onboard_applicant` SQL) | Yes | Executed | **PASS** |
| 45. Row-Level Security data isolation | Yes (Scoped JWTs) | Yes (`history_store.py`) | Yes | Yes (`has_institution_role`) | Yes | Enforced | **PASS** |
| **I. DevOps & CI/CD Pipeline** | | | | | | | |
| 46. Unified GitHub Actions multi-job CI | Yes (`.github/workflows/ci.yml`) | Yes (`ci.yml`) | Yes | N/A | Yes | Configured | **PASS** |
| 47. Vercel automated frontend deployment | Yes (`vercel.json`) | N/A | Yes | N/A | Yes | Git triggered | **PASS** |
| 48. Vercel serverless Python backend route | Yes (`api/index.py`) | Yes (`backend/app/main.py`) | Yes | N/A | Yes | Configured | **PASS** |
| 49. Render Blueprint automatic deployment | Yes (`render.yaml`) | Yes (`render.yaml`) | Yes | N/A | Yes | Auto-trigger | **PASS** |
| 50. Live Git commit SHA verification | Yes (`TopBar.tsx`) | Yes (`/version`) | Yes | N/A | Yes | Verified | **PASS** |

---

## 2. Non-PASS Findings & Analysis

### Item 9: Real Transactional SMTP Email Delivery
- **Status:** `BLOCKED`
- **Root Cause:** Supabase project `qhclgxquuiqijlsbsouc` is using Supabase's default shared SMTP relay, which enforces a strict rate limit (~3 emails/hour project-wide) and drops confirmation emails.
- **Technical Evidence:** `AuthContext.tsx` handles `over_email_send_rate_limit` by activating instant validated sessions.
- **User Impact:** Without custom SMTP credentials configured in the Supabase Dashboard, real confirmation emails cannot be dispatched to outside institutional users.
- **Required Correction:** Configure Custom SMTP (e.g. Resend, Brevo, SendGrid) in Supabase Dashboard → Project Settings → Authentication → SMTP Settings.
- **Priority:** `P1`

### Item 10: Magic Link & Password Recovery
- **Status:** `PARTIAL`
- **Root Cause:** Relies on Supabase email dispatch. Works in SDK and frontend forms, but blocked when email rate limits are reached.
- **Technical Evidence:** `signInWithOtp` and `resetPasswordForEmail` are implemented in `AuthContext.tsx` lines 215–230, but fail if default SMTP quota is exhausted.
- **User Impact:** Users attempting password recovery during rate limit periods do not receive recovery tokens.
- **Required Correction:** Custom SMTP configuration or admin password reset workflow.
- **Priority:** `P1`

### Item 17: ClamAV Daemon Antivirus Scanning
- **Status:** `PARTIAL`
- **Root Cause:** `antivirus_scanner.py` implements full EICAR signature detection and ClamAV TCP/UNIX socket streaming (`zINSTREAM`), but no dedicated ClamAV daemon is provisioned in the serverless Vercel runtime or Render free tier.
- **Technical Evidence:** `antivirus_scanner.py` lines 53–67 gracefully returns `scan_status='scan_unavailable'` rather than falsely claiming files are clean.
- **User Impact:** Files are validated for PDF structure, size, and EICAR malware, but deep signature scanning relies on a running ClamAV container.
- **Required Correction:** Provision a containerized ClamAV service (e.g., Render background worker or AWS Lambda ClamAV) and set `CLAMAV_HOST` and `CLAMAV_PORT`.
- **Priority:** `P1`

### Item 18: Tesseract OCR for Scanned PDFs
- **Status:** `PARTIAL`
- **Root Cause:** `document_analyzer.py` detects scanned PDFs (extracted text < 30 characters) and checks for system `tesseract` binary. In serverless environments (Vercel standard), `tesseract-ocr` is not installed by default in the execution image.
- **Technical Evidence:** `document_analyzer.py` lines 180–205: flags `ocr_status='unavailable'` and warns user that scanned PDF requires human transcription.
- **User Impact:** Text from vector PDFs is extracted cleanly via `pypdf`, but raster/image-only PDFs cannot be optical-character-recognized without the system binary.
- **Required Correction:** Run backend on a container runtime (Docker on Render / Cloud Run) with `tesseract-ocr` installed, or integrate an external OCR service (Google Cloud Vision / AWS Textract).
- **Priority:** `P1`

### Item 33: Authoritative AICTE Handbook Rule Engine
- **Status:** `PARTIAL`
- **Root Cause:** The regulatory rule engine evaluates caller-supplied document checklists and dates. Official AICTE Approval Process Handbook (APH 2024–2027) amendment tables remain in `in_review` status pending legal expert reconciliation.
- **Technical Evidence:** `regulatory_rule_scopes` table stores candidate status: `'base source retrieved; amendment trail unresolved'`. Frontend explicitly displays `ScopeNotice.tsx` stating: *"Results are advisory and evaluate supplied document lists only."*
- **User Impact:** The app cannot provide legally binding AICTE approval decisions, only mathematical/checklist consistency checks.
- **Required Correction:** Complete formal regulatory rule codification with qualified AICTE liaison / legal counsel review.
- **Priority:** `P2`

