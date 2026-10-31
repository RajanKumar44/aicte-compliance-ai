# REMEDIATION ROADMAP — AICTE COMPLIANCE AI
**Audit Date:** October 31, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Repository:** [github.com/RajanKumar44/aicte-compliance-ai](https://github.com/RajanKumar44/aicte-compliance-ai) (Commit `0c3ea60`)  
**Frontend Live:** [aicte-compliance-ai.vercel.app](https://aicte-compliance-ai.vercel.app/)  
**Backend Live (Primary):** [aicte-compliance-backend-live.vercel.app](https://aicte-compliance-backend-live.vercel.app/)  
**Backend Live (Secondary / Worker):** [aicte-compliance-backend.onrender.com](https://aicte-compliance-backend.onrender.com/)  

---

## 1. Executive Priority Breakdown

| Priority | Level | Count | Focus Areas | Target Resolution Window |
|---|---|:---:|---|---|
| **P0** | Critical / Production Blocker | 3 | Supabase SMTP rate limit, Render cold start latency, Backend endpoint sync | Within 48–72 Hours |
| **P1** | High / Feature Parity Gap | 3 | ClamAV Daemon in production, Tesseract OCR runtime engine, Document vault bulk export | Within 7–14 Days |
| **P2** | Medium / Performance & Scale | 3 | Vite code splitting (<500 kB chunks), Document / Audit History DB pagination, Playwright E2E suite | Within 14–21 Days |
| **P3** | Low / Code Quality & Tech Debt | 3 | Oxlint impure render warnings, Strict TS cleanup, OpenAPI documentation polish | Within 30 Days |

---

## 2. Priority Details & Remediation Tasks

### Priority 0 (P0) — Immediate Production Blockers

#### P0.1 — Supabase Transactional Email Rate Limit & Confirmation Block
- **Issue**: Supabase built-in auth email provider limits emails to ~3/hour on free tier (`over_email_send_rate_limit`).
- **Remediation**:
  1. Configure Custom SMTP in Supabase Dashboard (`Project Settings -> Authentication -> SMTP Settings`) using Resend, Brevo (Sendinblue), or SendGrid with verified sender domain.
  2. Alternatively, for testing and preview deployments, toggle off "Confirm email" in Supabase Auth settings (`Providers -> Email -> Confirm email -> OFF`), which enables instantaneous signups without rate-limiting.
  3. Keep the frontend `autoConfirmNewUsers` fallback active in [AuthContext.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/context/AuthContext.tsx) to prevent UI deadlock when rate limits occur.
- **Estimated Effort**: 1–2 hours (Configuration only).

#### P0.2 — Render Free-Tier Backend Cold Start Latency (~18s)
- **Issue**: The secondary Render backend (`aicte-compliance-backend.onrender.com`) sleeps after 15 minutes of inactivity, resulting in a cold start delay of 15–20 seconds when requests hit it.
- **Remediation**:
  1. Primary API traffic is currently directed to `https://aicte-compliance-backend-live.vercel.app/` which runs serverless Python (`api/index.py`) and responds in 121ms.
  2. Implement a background keep-alive ping (e.g. GitHub Actions cron every 10 minutes or UptimeRobot / Cron-Job.org hitting `/health`) if Render is used for long-running batch OCR or ClamAV tasks.
  3. Upgrade Render web service to Starter ($7/mo) to disable sleep if production traffic shifts away from Vercel serverless.
- **Estimated Effort**: 2 hours.

#### P0.3 — Unified Endpoint Configuration & Environment Sync
- **Issue**: `frontend/app/.env.production` defines `VITE_API_URL=https://aicte-compliance-backend-live.vercel.app`, while `render.yaml` sets up Render. Teams must not accidentally point the Vercel frontend to a sleeping Render backend without fallback.
- **Remediation**:
  1. Standardize frontend `api.ts` client to include an automatic fallback failover: if primary endpoint times out (>5s), retry secondary endpoint.
  2. Standardize CI/CD environment variables in GitHub repository secrets (`VITE_API_URL`, `RENDER_DEPLOY_HOOK_BACKEND`, `VERCEL_TOKEN`).
- **Estimated Effort**: 4 hours.

---

### Priority 1 (P1) — High Priority & Engine Parity

#### P1.1 — Containerized ClamAV Antivirus Daemon
- **Issue**: Serverless Vercel backend (`api/index.py`) has no ClamAV daemon running locally, triggering fallback `scan_status="scan_unavailable"` in [document_scanner.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/document_scanner.py).
- **Remediation**:
  1. In `render.yaml` or a dedicated Dockerfile, deploy ClamAV alongside FastAPI or deploy a dedicated ClamAV microservice container.
  2. Update `CLAMAV_HOST` and `CLAMAV_PORT` environment variables in backend settings to connect via `pyclamd.ClamdNetworkSocket(host, port)`.
  3. Configure local EICAR test string validation in CI.
- **Estimated Effort**: 2–3 days.

#### P1.2 — Dedicated Tesseract OCR Engine / Cloud OCR Integration
- **Issue**: Vercel serverless runtime cannot install the native Linux `tesseract-ocr` C++ binaries. Scanned PDFs yield `ocr_status="unavailable"`.
- **Remediation**:
  1. On Render backend (which uses custom build environment or Docker), install `tesseract-ocr` and `tesseract-ocr-eng` packages via Aptfile / Dockerfile.
  2. Alternatively, integrate AWS Textract or Google Cloud Vision API as a fallback cloud OCR provider when native Tesseract binaries are not detected.
  3. Route PDF OCR requests specifically to the Render OCR-enabled worker backend while keeping lightweight API routes on Vercel serverless.
- **Estimated Effort**: 3–4 days.

#### P1.3 — Institutional Document Vault Bulk Export & AICTE Dossier Generator
- **Issue**: Users can upload and inspect individual documents, but cannot export a consolidated ZIP dossier containing verified documents and an AICTE Compliance Manifest PDF.
- **Remediation**:
  1. Add backend route `POST /api/v1/documents/export-dossier` that packages active statutory certificates with watermarked verification QR codes.
  2. Add frontend "Download Complete AICTE Approval Dossier" action button in Document Vault header.
- **Estimated Effort**: 2 days.

---

### Priority 2 (P2) — Performance, Scalability & Verification

#### P2.1 — Vite Code Splitting & Manual Chunking
- **Issue**: Vite build outputs a single vendor bundle of 761.55 kB (`index-CN5cgngk.js`), triggering Vite's chunk size warning (>500 kB).
- **Remediation**:
  1. Update `frontend/app/vite.config.ts` to add `build.rollupOptions.output.manualChunks`:
     ```ts
     manualChunks: {
       vendor: ['react', 'react-dom'],
       lucide: ['lucide-react'],
       supabase: ['@supabase/supabase-js']
     }
     ```
  2. Lazy-load PDF viewer and OCR comparison components using `React.lazy()` and `Suspense`.
  3. Target: Main entry bundle under 250 kB, vendor chunks under 300 kB.
- **Estimated Effort**: 1 day.

#### P2.2 — Server-Side Database Pagination for Documents & Audit History
- **Issue**: Currently, `/api/v1/history` and `/api/v1/documents` fetch up to 100 recent rows in a single batch.
- **Remediation**:
  1. Add `page` and `limit` query parameters with `count=exact` header in Supabase queries.
  2. Update frontend `AuditHistoryView.tsx` and `DocumentVaultView.tsx` to include standard pagination controls and page-size selector.
- **Estimated Effort**: 2 days.

#### P2.3 — End-to-End (E2E) Test Suite with Playwright
- **Issue**: Unit tests exist (`vitest` with 7 tests), but no automated E2E browser tests verify the full auth -> document upload -> validation -> audit history cycle.
- **Remediation**:
  1. Initialize `@playwright/test` in `frontend/app/`.
  2. Implement tests for:
     - Authentication login and session retention.
     - Document upload dropzone click and drag-drop interaction.
     - Deficiencies report calculation against AICTE Handbook 2026-27 norms.
  3. Integrate into GitHub Actions CI workflow on push to `main`.
- **Estimated Effort**: 3 days.

---

### Priority 3 (P3) — Code Quality, Linting & Polish

#### P3.1 — Fix Oxlint Non-Fatal Warnings in Memoized Renders
- **Issue**: 11 non-fatal warnings reported in `oxlint` regarding `new Date()` calls inside `useMemo` in `DocumentVaultView.tsx`.
- **Remediation**:
  1. Pass reference timestamp as a dependency or parameter instead of constructing un-memoized `new Date()` within render loops.
- **Estimated Effort**: 2 hours.

#### P3.2 — OpenAPI Schema Documentation Enrichment
- **Issue**: FastAPI provides automated Swagger docs, but several request bodies lack explicit examples and response schemas for 422/500 errors.
- **Remediation**:
  1. Add Pydantic `Field(..., examples=[...])` and Docstrings across all route handlers in `backend/app/api.py`.
- **Estimated Effort**: 1 day.

---

## 3. Phased Implementation Timeline

```
Timeline: 30-Day Remediation Roadmap
========================================================================

Week 1 (Days 1–7): PRODUCTION STABILITY & CRITICAL AUTH
├── Day 1-2: Configure Supabase Custom SMTP or Auto-Confirm Toggle (P0.1)
├── Day 3-4: Implement Backend Health Keep-Alive & Client Failover (P0.2, P0.3)
└── Day 5-7: Vite Code Splitting & Manual Chunking optimization (P2.1)

Week 2 (Days 8–14): SECURITY ENGINES & OCR CONTAINERIZATION
├── Day 8-10: Deploy ClamAV Daemon service for Render backend (P1.1)
├── Day 11-13: Install Native Tesseract OCR runtime on Render / Cloud OCR (P1.2)
└── Day 14: EICAR test string & scanned PDF end-to-end verification

Week 3 (Days 15–21): DATA SCALE & INSTITUTIONAL DOSSIER
├── Day 15-17: Server-side pagination for Documents and Audit History (P2.2)
├── Day 18-20: Implement Institutional AICTE Dossier Bulk ZIP Export (P1.3)
└── Day 21: Oxlint warnings cleanup and code quality review (P3.1)

Week 4 (Days 22–30): AUTOMATED CI/CD & REGRESSION HARDENING
├── Day 22-25: Author Playwright E2E test suite for core workflows (P2.3)
├── Day 26-27: OpenAPI documentation and schema polish (P3.2)
└── Day 28-30: Final load testing, penetration verification & audit signoff
```

