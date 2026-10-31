# System Architecture — AICTE Compliance AI

## High-Level Architecture

The platform follows a modern, decoupled three-tier architecture:

1. **Frontend Tier (React + Vite + TypeScript):**
   - Single Page Application built with React 19, Vite, TailwindCSS, and Lucide icons.
   - Dual theme support: Professional and Neo Brutalism.
   - Dedicated modules:
     - Dashboard (`/`): Executive compliance overview and quick metrics.
     - Document Vault (`/vault`): PDF custody, ClamAV status, OCR extraction, expiry watchdog.
     - Action Planner (`/action-planner`): Feature 2 corrective action tracking, evidence review, and revalidation.
     - Regulatory Impact (`/regulatory-impact`): Feature 3 intelligence engine, clause diffs, and institutional impact assessment.
     - Cadre & FSR Calculator (`/cadre-calculator`): APH 2024–27 multi-program faculty ratio calculations.
     - Audit History (`/history`): Persistent pre-scrutiny runs and compliance reports.

2. **Backend Tier (FastAPI + Python 3.12+):**
   - High-performance asynchronous REST API built with FastAPI and Pydantic v2.
   - Core API Routers:
     - `/api/documents`: Document upload, ClamAV antivirus scan, PyMuPDF / Tesseract text extraction, metadata parsing.
     - `/api/validate`: Advisory compliance validation engine and deficiency detection.
     - `/api/v1/actions`: Compliance Action Planner CRUD, lifecycle transitions, evidence submissions, reviews, and revalidations.
     - `/api/v1/regulatory`: Regulatory sources, versions, structured clauses, version diff engine, change scrutiny, and institutional impact assessments.
     - `/api/notifications`: In-app notification center and real-time event dispatch.

3. **Data Tier (Supabase / PostgreSQL + Storage):**
   - Relational persistence with PostgreSQL and Row-Level Security (RLS).
   - Multi-tenant architecture enforced by `institution_id` on all institutional tables.
   - Audit trail and status history for complete regulatory traceability.
   - Encrypted document storage with SHA-256 content verification.

## Security & Compliance Model
- **Tenant Isolation:** Enforced via `has_institution_role()` RLS policy and mandatory backend filtering on `institution_id`.
- **Role-Based Access Control (RBAC):** Institutional members, Compliance Officers, and Council Reviewers.
- **Audit Trails:** Immutable status transition logs in `action_status_history` and `action_reviews`.
