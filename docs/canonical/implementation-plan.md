# Implementation Plan — AICTE Compliance AI

## Milestones & Status

### Phase 1: Institutional Core & Document Vault (Completed)
- Secure PDF upload, in-memory ClamAV antivirus scanning, and PyMuPDF text extraction.
- Institutional Document Vault with expiration watchdog and scrutiny dossier generation.
- Cadre & Faculty-Student Ratio (FSR) norms calculator conforming to APH 2024–27 Annexure 5.

### Phase 2: Compliance Action Planner (Completed)
- Implemented `backend/app/action_planner.py` REST API endpoints (`/api/v1/actions`).
- Lifecycle status state machine (`draft`, `assigned`, `accepted`, `in_progress`, `submitted_for_review`, `approved`, `revalidation_required`, `resolved`).
- Verifiable evidence submission, formal reviewer decision workflow, and deterministic revalidation.
- In-memory event dispatch and in-app notification center (`backend/app/notifications.py`).
- Frontend interface implemented at `/action-planner` (`ActionPlannerPage.tsx`) with KPI cards, ledger, detail drawer, and audit tabs.
- Unit and integration tests passing (`backend/tests/test_action_planner.py`, `backend/tests/test_notifications.py`).

### Phase 3: Regulatory Change Impact Analyzer (Completed)
- Implemented `backend/app/regulatory_impact.py` REST API endpoints (`/api/v1/regulatory`).
- Statutory regulatory source catalog and multi-year document versioning (APH 2024–27).
- Structured clause extraction and deterministic text diff comparison engine.
- Expert scrutiny review interface for confirming or flagging regulatory amendments.
- Institutional impact assessments with gap severity analysis.
- Bi-directional bridge linking regulatory impacts directly to Action Planner.
- Frontend interface implemented at `/regulatory-impact` (`RegulatoryImpactPage.tsx`).
- Unit and integration tests passing (`backend/tests/test_regulatory_impact.py`).

### Phase 4: CI/CD & Deployment Verification (Completed)
- Fixed CI configuration workflow at `.github/workflows/backend-tests.yml`.
- Frontend Vite production build passing with 0 errors.
- All backend test suites passing (17/17 tests).
