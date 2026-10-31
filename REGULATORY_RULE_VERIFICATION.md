# REGULATORY RULE VERIFICATION — AICTE APPROVAL PROCESS HANDBOOK (APH 2024–2027)
**Audit Standard:** Statutory AICTE Norms Reconciliation  
**Audit Date:** October 31, 2026  
**Auditor:** Principal Regulatory Compliance Auditor & Software Architect  
**Statutory Source Documents:**
1. AICTE Approval Process Handbook (APH 2024–25 to 2026–27), Chapter II & Annexure 5.
2. AICTE Regulations on Pay Scales, Service Conditions and Minimum Qualifications (Gazette of India, March 1, 2019).
3. AICTE Revised Set of Documents for Scrutiny under Chapter I & II.

---

## 1. Statutory Norms vs. Application Implementation

The official **AICTE APH 2024–27 Annexure 5 (Norms for Faculty Requirements and Cadre Ratio for Technical Institutions)** establishes precise statutory ratios differentiated by **Programme Level** (Diploma, Undergraduate, Postgraduate) and discipline:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                 OFFICIAL AICTE APH 2024–27 ANNEXURE 5 REGULATORY BENCHMARK                       │
├───────────────────────────────┬───────────────┬───────────┬─────────────┬────────────────────────┤
│ Programme / Discipline        │ Level         │ FSR Norm  │ Cadre Ratio │ Ph.D. Requirement      │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Engineering & Technology      │ Under Graduate│ 1 : 20    │ 1 : 2 : 6   │ Prof (100%), AssocProf │
│                               │ (B.Tech/B.E.) │           │             │ (100%)                 │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Management                    │ Under Graduate│ 1 : 25    │ 1 : 2 : 6   │ Prof (100%), AssocProf │
│                               │ (BBA / BMS)   │           │             │ (100%)                 │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Engineering & Technology      │ Post Graduate │ 1 : 15    │ 1 : 1 : 1   │ 100% across all        │
│                               │ (M.Tech/M.E.) │           │ (or 1:2)    │ appointed faculty      │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Management (MBA / PGDM)       │ Post Graduate │ 1 : 20    │ 1 : 2 : 6   │ Prof (100%), AssocProf │
│                               │               │           │             │ (100%)                 │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Hotel Management & Catering   │ Post Graduate │ 1 : 12    │ 1 : 2 : 6   │ Prof (100%), AssocProf │
│ Technology (HMCT)             │               │           │             │ (100%)                 │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Computer Applications (MCA)   │ Post Graduate │ 1 : 20    │ 1 : 2 : 6   │ Prof (100%), AssocProf │
│                               │               │           │             │ (100%)                 │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Pharmacy                      │ Under Graduate│ 1 : 15    │ 1 : 2 : 6   │ PCI / AICTE Harmonized │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Architecture & Planning       │ Under Graduate│ 1 : 10    │ 1 : 2 : 6   │ CoA / AICTE Harmonized │
├───────────────────────────────┼───────────────┼───────────┼─────────────┼────────────────────────┤
│ Polytechnic Diploma in Engg.  │ Diploma       │ 1 : 25    │ NOT         │ Principal, HoD,        │
│                               │               │           │ APPLICABLE  │ Lecturers only         │
└───────────────────────────────┴───────────────┴───────────┴─────────────┴────────────────────────┘
```

---

## 2. In-Depth Audit of Codebase Calculations

### 2.1 Cadre Ratio & FSR Calculator (`frontend/app/src/pages/CadreCalculatorPage.tsx`)

#### Defect 1: Illegal Application of 1:2:6 Cadre Ratio to Polytechnic Diploma
- **Code Reference:** [CadreCalculatorPage.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/pages/CadreCalculatorPage.tsx#L86-L90)
  ```ts
  // 1:2:6 ratio calculation (1+2+6 = 9 parts)
  const reqProfessors = Math.max(1, Math.ceil(requiredFaculty * (1 / 9)));
  const reqAssocProfs = Math.max(1, Math.ceil(requiredFaculty * (2 / 9)));
  const reqAsstProfs = Math.max(1, requiredFaculty - (reqProfessors + reqAssocProfs));
  ```
- **Statutory Violation:**  
  AICTE APH 2024–27 Annexure 5 explicitly states that the **1:2:6 Cadre Ratio (Professor : Associate Professor : Assistant Professor) is NOT applicable to Diploma institutions**.
  Diploma institutions are governed by a different staffing structure:
  $$\text{Principal} + \text{Head of Department (HoD)} + \text{Lecturers} / \text{Senior Lecturers}$$
  By executing the 1:2:6 formula for `"polytechnic_diploma"`, the calculator falsely flags legitimate diploma institutions as having a **"Deficit of Professors"**, which is legally invalid under AICTE scrutiny rules.
- **Severity:** High (Regulatory Calculation Error).
- **Required Correction:** For `programKey === "polytechnic_diploma"`, bypass the 1:2:6 cadre breakdown and display the statutory Diploma Cadre model (1 Principal, 1 HoD per department, and balance as Lecturers) with FSR 1:25.

---

#### Defect 2: Missing Programme Levels in Calculator Dropdown
- **Code Reference:** [CadreCalculatorPage.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/pages/CadreCalculatorPage.tsx#L194-L198)
  Only 4 programs are selectable:
  1. `engineering_ug`
  2. `management_pg`
  3. `mca_pg`
  4. `polytechnic_diploma`
- **Missing Regulatory Programmes:**
  - **UG Management (BBA/BMS):** Statutory FSR is **1:25**. Currently unavailable.
  - **PG Engineering (M.Tech/M.E.):** Statutory FSR is **1:15**. Currently unavailable (institutions attempting to evaluate M.Tech must falsely select UG B.Tech).
  - **PG Hotel Management (HMCT):** Statutory FSR is **1:12**. Currently unavailable.
  - **Architecture & Planning:** Statutory FSR is **1:10**. Currently unavailable.
  - **Pharmacy:** Statutory FSR is **1:15 / 1:10**. Currently unavailable.
- **Severity:** Medium (Incomplete Scope).

---

#### Defect 3: Formula Rounding and Ceiling Compliance
- **Code Reference:** [CadreCalculatorPage.tsx](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/pages/CadreCalculatorPage.tsx#L84)
  $$\text{requiredFaculty} = \left\lceil \frac{\text{totalStudents}}{\text{targetFsr}} \right\rceil$$
- **Finding:** AICTE APH Chapter II requires taking the ceiling (`Math.ceil`) on total faculty, which is implemented correctly. However, allocating `Math.ceil` individually to Professors, Associate Professors, and Assistant Professors can result in the sum of required cadre posts exceeding `requiredFaculty`.
- **Statutory Provision:** AICTE allows rounding adjustments in the Assistant Professor cadre to ensure the sum equals the integer required faculty. The line `Math.max(1, requiredFaculty - (reqProfessors + reqAssocProfs))` can become negative or artificially small if `reqProfessors` and `reqAssocProfs` are both rounded up independently.

---

### 2.2 Backend Rule Catalog & Governance (`backend/app/rule_catalog.py`)

- **Code Reference:** [backend/app/rule_catalog.py](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/backend/app/rule_catalog.py#L1-L10)
  ```python
  """Source-governed rule catalogue schemas and a server-side activation gate.
  This module defines metadata validation, an attributable review/approval record
  and an activation gate. It contains no AICTE regulatory rules, ships no active
  rule, and does not evaluate rule logic. Nothing here makes a compliance
  decision; a future rule engine must consume only gate-approved rule versions.
  """
  ```
- **Finding:**  
  The backend codebase deliberately contains **ZERO active AICTE regulatory rules**. The previous audit report stated that `backend/app/aicte_rules.py` was computing FSR and Cadre compliance. That file does not exist, and the backend `/api/v1/validate` does not execute any mathematical or cadre checks.
- **Database Scope Table:** In [supabase/migrations/20261024000000_validation_history.sql](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/supabase/migrations/20261024000000_validation_history.sql#L36-L47), the seeded row in `regulatory_rule_scopes` has:
  ```sql
  status = 'in_review'
  review_note = 'Candidate scope only. No checklist item is active. Await full amendment reconciliation and qualified reviewer approval.'
  ```
- **Architectural Conclusion:** The application has a sound governance gate architecture designed to prevent unverified regulatory rules from entering production, but it has not yet bridged the gap between the frontend UI calculator and the backend API.

---

## 3. Mandatory Statutory Document Clearances (AICTE Chapter II)

The statutory documents referenced in [frontend/app/src/lib/aicte-rules.ts](file:///c:/Users/Rajan/OneDrive/Desktop/aicte-compliance-ai/frontend/app/src/lib/aicte-rules.ts#L18-L91) accurately mirror AICTE Chapter II EoA scrutiny mandates:

1. **Fire and Life Safety Certificate (Clause 2.4):**
   - *Statutory Requirement:* Issued by State Fire Services for all active educational buildings.
   - *Deficiency Severity:* Zero Tolerance (Withholding of EoA).
   - *Mitigation:* Format 3 Undertaking on Rs. 100 non-judicial stamp paper + renewal receipt.
2. **Building Structural Stability Certificate (Clause 2.6):**
   - *Statutory Requirement:* Issued by empaneled structural engineer.
   - *Deficiency Severity:* Zero Tolerance (Suspension of intake expansion).
3. **Land Ownership / Registered 30-Year Lease Deed (Clause 1.7):**
   - *Statutory Requirement:* Registered document with educational conversion.
4. **Building Occupancy / Completion Certificate (Clause 2.5):**
   - *Statutory Requirement:* Local municipal town planning authority clearance.
5. **Mandatory Affidavits 1 & 2 (Clause 2.1):**
   - *Statutory Requirement:* Notarized affidavits verifying faculty rosters, fee compliance, and anti-ragging measures.

---

## 4. Remediation Plan for Regulatory Engine

| Step | Action Item | Target File | Statutory Reference |
|:---:|---|---|---|
| **1** | Disable 1:2:6 cadre ratio calculation when Diploma program is selected | `frontend/app/src/pages/CadreCalculatorPage.tsx` | APH 2024–27 Annexure 5 |
| **2** | Add UG Management (BBA/BMS) preset with 1:25 FSR | `frontend/app/src/lib/aicte-rules.ts` | APH 2024–27 Annexure 5 |
| **3** | Add PG Engineering (M.Tech) preset with 1:15 FSR | `frontend/app/src/lib/aicte-rules.ts` | APH 2024–27 Annexure 5 |
| **4** | Add PG HMCT preset with 1:12 FSR | `frontend/app/src/lib/aicte-rules.ts` | APH 2024–27 Annexure 5 |
| **5** | Expose Cadre and FSR validation endpoint in backend (`POST /api/v1/compliance/cadre`) | `backend/app/main.py` | APH Chapter II |

