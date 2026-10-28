# Smart India Hackathon (SIH) — Project Submission Dossier

**Problem Statement ID:** SIH26261  
**Problem Statement Title:** AI-Powered Platform to Validate Institutional Records, Authenticate Documents, and Assist in AICTE Regulatory & Infrastructure Compliance  
**Organization:** All India Council for Technical Education (AICTE), Ministry of Education, Government of India  
**Project Name:** AICTE Compliance Assistant  
**Repository:** [https://github.com/rajaryan1111/aicte-compliance-ai](https://github.com/rajaryan1111/aicte-compliance-ai)  
**Live Application:** [https://aicte-compliance-ai.vercel.app](https://aicte-compliance-ai.vercel.app)  
**API Preview & Swagger Docs:** [https://aicte-compliance-api-preview.onrender.com/docs](https://aicte-compliance-api-preview.onrender.com/docs)  

---

## 1. Problem Context & Objectives

Every year, AICTE evaluates tens of thousands of technical institution applications for:
- **Extension of Approval (EoA)**
- **Establishment of New Technical Programs / Institutions**
- **Increase / Variation in Approved Intake**

Processing these applications requires scrutinizing large stacks of heterogeneous institutional evidence: land titles, building stability certificates, fire safety clearances, pollution control NOCs, faculty rosters, and notarized self-disclosure affidavits.

### Core Challenges:
1. **Manual Scrutiny Bottleneck:** Repetitive human checks of dates, names, and checklists lead to administrative delays.
2. **Expired & Incomplete Submissions:** Applications submitted with expired clearances or missing mandatory documents require prolonged rectification cycles.
3. **Faculty & Cadre Deficits:** Difficulty in calculating Faculty-to-Student Ratios (FSR) and 1:2:6 cadre distributions (Professor : Associate : Assistant) across multiple disciplines.
4. **Document Alterations & Duplicate Uploads:** Risk of fraudulent alteration or reusing the same certificate across multiple required document categories.

---

## 2. Our Solution: AICTE Compliance Assistant

The **AICTE Compliance Assistant** is an intelligent, transparent, and explainable **pre-scrutiny decision-support platform** designed to act as a frontline digital assistant for both applicant institutions and AICTE scrutiny committees.

### Key Pillars of the Solution:
1. **Intelligent Application Validation:**
   - Multi-stage pre-scrutiny wizard evaluating required portfolios according to application category (`eoa`, `new_program`, `intake_change`).
   - Dynamic identification of missing documents and expired clearances against the evaluation date.
   - **Nil Deficiency Gap Predictor:** Calculates an institutional readiness tier (`Ready for Nil Deficiency`, `Minor Hearing`, `High Risk`) and automatically suggests standard AICTE format undertakings for curable defects.

2. **Automated Document Intelligence & Advisory OCR:**
   - PDF analysis endpoint (`POST /api/v1/documents/analyze`) extracting selectable text and candidate fields (issue date, expiry date, reference number, issuing authority).
   - Provenance tracking with SHA-256 cryptographic fingerprints and confidence scoring.

3. **Multi-Vector Anomaly Detection:**
   - **Duplicate File Detection:** Flags identical file content (SHA-256 matches) submitted under different document slots.
   - **Date Order Inversion:** Detects physically impossible dates (e.g., certificate issue date occurring after expiry date).
   - **Institutional Identity Mismatch:** Compares extracted college names against the registered institutional profile to catch misattributed documents.

4. **Approval Process Handbook (APH 2024–2027) Compliance Engine:**
   - Pre-loaded statutory clause database citing official AICTE handbook chapters (Clause 2.4 Fire Safety, Clause 2.6 Structural Stability, Clause 2.5 Occupancy, Clause 1.7 Land Title, Clause 4.2 NBA Accreditation).
   - **Interactive Cadre & FSR Calculator:** Computes exact faculty requirements for Engineering (UG 1:20 / 1:15 autonomous, PG 1:15), Management, MCA, and Pharmacy, highlighting Ph.D. qualification shortfalls.

5. **Scrutiny Officer Workflow & Tamper-Evident Audit Packages:**
   - Dedicated review dashboard with state-machine finding lifecycles (`pending` $\rightarrow$ `under_review` $\rightarrow$ `confirmed` / `waived` / `rectified`).
   - Generates downloadable, cryptographically verified audit `.zip` packages with chronological event histories and SHA-256 manifests.

---

## 3. Five-Minute Live Demonstration Flow

When presenting to evaluators, follow this recommended walkthrough:

| Step | Screen / Feature | Action & What to Highlight |
|---|---|---|
| **1. Sign-In** | [`/signin`](https://aicte-compliance-ai.vercel.app/signin) | Click **"Institution Admin Demo"** for instant 1-click access without email delays. Show the institutional role badge. |
| **2. Dashboard & Overview** | [`/`](https://aicte-compliance-ai.vercel.app/) | Highlight the live system health indicator (connected to backend API), pending applications, and quick statutory checklist actions. |
| **3. Pre-Scrutiny Validation** | [`/validate`](https://aicte-compliance-ai.vercel.app/validate) | Walk through the 3-step wizard: <br>1. Select **Extension of Approval (EoA)** and Institution ID `SYNTH-INST-001`.<br>2. Select documents (Fire Safety, Structural Certificate, Land Deed).<br>3. Enter an expired date (e.g. `2020-01-01`).<br>4. Run Validation $\rightarrow$ Show the **attention_required** verdict with evidence chips. |
| **4. OCR & PDF Analysis** | [`/validate` Tab 2] | Upload a sample PDF or select sample certificate. Show real-time extraction of Issue Date, Expiry Date, Authority, and SHA-256 hash. Show the **"Populate in Form"** button. |
| **5. Cadre & FSR Calculator** | [`/cadre`](https://aicte-compliance-ai.vercel.app/cadre) | Select the preset **"Common Deficient Engineering Dept (360 Seats)"**. Show how the calculator instantly flags: zero professors (cadre violation), FSR shortfall, and missing Ph.D. requirement. |
| **6. Scrutiny Officer Workflow** | Switch to Reviewer | Switch user to **"Scrutiny Officer"** demo account. Show finding review, official observation comment entry, and generating an exportable audit package. |

---

## 4. Technical Architecture & Engineering Rigor

- **Backend:** FastAPI (Python 3.11/3.12) with asynchronous request pipeline, SQLAlchemy ORM, Alembic migrations, and Pydantic validation schemas.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, Dark/Light mode, and Oxlint.
- **Automated Test Coverage:**
  - **389 Backend Pytest Cases:** Covering unit validation, upload boundaries, RBAC permissions, concurrency locks, and repository persistence.
  - **Frontend Contract Fixture Verification:** `python frontend/tools/verify_fixtures.py` verifies live API contract conformity across all UI states.
  - **Synthetic Extraction Benchmark:** Scored on a synthetic institutional corpus with 100% precision/recall on covered extraction fixtures.
  - **Lint Clean:** Both Python (`ruff check`) and TypeScript (`oxlint`) report 0 errors.

---

## 5. Ethical, Legal & Regulatory Safeguards

1. **Advisory Decision Support Only:**  
   The platform never issues unilateral rejections or approvals. All findings are explicitly labelled as advisory flags for human reviewer consideration.
2. **Attributable Audit Trail:**  
   Every review action, waiver, or finding modification records the reviewer's ID, timestamp, and justification.
3. **No Unsanctioned Scraping or Data Hoarding:**  
   The prototype uses synthetic demonstration records and caller-supplied parameters. It enforces a strict in-memory / zero-storage policy for file bytes during PDF analysis.
4. **Truth-in-Advertising:**  
   The system clearly reports "unconfigured" or "inconclusive" when a check cannot be executed rather than falsely claiming compliance.

---

## 6. Production Roadmap (Post-Hackathon Deployment)

1. **DigiLocker & State API Integration:** Connect to the National API Gateway using official Government credentials for direct DigiLocker certificate pulls.
2. **Computer Vision Infrastructure Module:** Train lightweight semantic segmentation models to verify CAD architectural floor plans and classroom dimensions against APH spatial norms.
3. **AICTE Portal SSO:** Seamless single sign-on integration with AICTE’s e-Gov portal and Jan Parichay (e-Pramaan).
