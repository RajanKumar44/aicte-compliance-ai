# Product Requirements — AICTE Compliance Assistant

**Status:** Canonical PRD — Features 1, 2, and 3 Implemented & Integrated.

## Product Goal
Provide an advisory, evidence-first pre-scrutiny workflow for AICTE-related applications, prioritizing Extension of Approval (EOA), institutional document custody, corrective action remediation, and multi-year regulatory change intelligence.

Help applicants identify completeness, expiration, and cadre consistency issues before review, track corrective actions with verifiable evidence, and monitor statutory Approval Process Handbook (APH) amendments.

This is an institutional compliance assistance platform operating under AICTE Act 1987 statutory guidelines.

## Users and Roles
- **Applicant / Institution Representative:** Upload documents, inspect preliminary findings, create and execute corrective action plans, submit evidence, and inspect institutional impact assessments.
- **Reviewer / Compliance Officer:** Inspect findings and evidence, review action submissions, record approvals or request changes, and verify regulatory amendments against statutory gazettes.
- **Administrator / Compliance Rule Manager:** Manage users/roles, publish versioned source-backed rules, oversee institutional impact assessments, and maintain audit trails.

All authorization is enforced by the backend, including institution-level record isolation (`institution_id`) and Row-Level Security (`has_institution_role`).

## Core Platform Features

### Feature 1: Document Vault & Advisory Scrutiny
1. Accept PDF and JPG/PNG uploads within strict 10 MB limits.
2. In-memory ClamAV antivirus scanning and OCR text extraction.
3. Track each upload as an immutable version with SHA256 integrity hashing.
4. Distinguish missing, expired, and unreadable document states.
5. Multi-program Cadre & Faculty-Student Ratio (FSR) calculator adhering to APH 2024–27 Annexure 5.

### Feature 2: Compliance Action Planner
1. Convert compliance findings (e.g. DOC_EXPIRED, FSR_CADRE_DEFICIT) into assigned, trackable corrective actions.
2. Full lifecycle management: `draft` -> `assigned` -> `accepted` -> `in_progress` -> `submitted_for_review` -> `approved` | `changes_requested` -> `revalidation_required` -> `resolved` | `cancelled`.
3. Verifiable evidence submission with categorized attachments (statutory clearance, affidavits, infrastructure, etc.).
4. Formal review workflow: approve, request changes, or reject with reviewer comments.
5. Deterministic revalidation: verify that submitted evidence resolves the underlying deficiency.
6. Real-time KPI dashboard: total, open, overdue, due soon, in progress, awaiting review, and resolved actions.

### Feature 3: Regulatory Change Impact Analyzer
1. Regulatory source registry (AICTE Official Portal, Gazette of India, State Technical Boards).
2. Multi-year document versioning (APH 2023-24, 2024–27, 2025–26, 2026–27 drafts).
3. Structured clause extraction with chapter, section title, and clause numbers.
4. Deterministic text comparison & diff generation between handbook versions.
5. Regulatory change classification: added, modified, removed, threshold changed, criteria changed, deadline changed.
6. Expert review and confirmation interface for regulatory amendments.
7. Institutional impact assessments evaluating compliance gaps per institution.
8. One-click workflow bridging detected regulatory impacts directly into the Compliance Action Planner.

## Product Invariants
- AI findings are advisory; authorized humans retain final decisions.
- OCR success is not authenticity verification; statutory verification requires attested seal or portal confirmation.
- 1:2:6 Cadre ratio is legally not applicable at Polytechnic Diploma level (APH Annexure 5).
- Tenant isolation is strictly enforced across all database tables via `institution_id`.
