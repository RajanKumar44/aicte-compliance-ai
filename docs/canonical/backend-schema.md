# Database Schema — AICTE Compliance AI

## Tables & Entity Relationships

### Core System
- `users`: Supabase auth accounts with roles (`institution_member`, `compliance_officer`, `auditor`, `admin`).
- `institutions`: Institutional entities with AICTE permanent IDs and regional jurisdiction.
- `documents`: Vault custody records with SHA256 hashes, OCR extracted text, expiry dates, and ClamAV status.
- `validation_runs`: Compliance audit results, overall score, and detected findings.

### Feature 2: Compliance Action Planner
- `corrective_actions`:
  - `id` (UUID, PK)
  - `institution_id` (UUID, FK -> institutions)
  - `validation_run_id` (UUID, FK -> validation_runs, nullable)
  - `finding_code` (TEXT)
  - `finding_title` (TEXT)
  - `finding_description` (TEXT)
  - `finding_severity` (TEXT: critical, severe, moderate, advisory)
  - `title` (TEXT)
  - `description` (TEXT)
  - `priority` (TEXT: critical, high, medium, low)
  - `status` (TEXT: draft, assigned, accepted, in_progress, submitted_for_review, changes_requested, approved, revalidation_required, resolved, cancelled)
  - `responsible_department` (TEXT)
  - `assigned_to` (TEXT, nullable)
  - `reviewer_id` (TEXT, nullable)
  - `start_date` (DATE, nullable)
  - `due_date` (DATE)
  - `expected_outcome` (TEXT)
  - `acceptance_criteria` (TEXT)
  - `required_evidence` (TEXT)
  - `internal_notes` (TEXT)
  - `created_by` (TEXT)
  - `created_at` / `updated_at` (TIMESTAMPTZ)

- `action_status_history`:
  - `id` (UUID, PK)
  - `action_id` (UUID, FK -> corrective_actions)
  - `from_status` / `to_status` (TEXT)
  - `actor_id` (TEXT)
  - `reason` (TEXT)
  - `created_at` (TIMESTAMPTZ)

- `action_evidence`:
  - `id` (UUID, PK)
  - `action_id` (UUID, FK -> corrective_actions)
  - `document_id` (UUID, FK -> documents, nullable)
  - `title` (TEXT)
  - `description` (TEXT)
  - `category` (TEXT: statutory_clearance, affidavit, infrastructure, faculty_record, financial, undertaking, other)
  - `storage_path` (TEXT, nullable)
  - `submitted_by` (TEXT)
  - `submission_date` (TIMESTAMPTZ)
  - `status` (TEXT: pending_review, approved, changes_requested, rejected)
  - `reviewer_comments` (TEXT)
  - `reviewed_by` / `reviewed_at` (TIMESTAMPTZ)

- `action_reviews`:
  - `id` (UUID, PK)
  - `action_id` (UUID, FK -> corrective_actions)
  - `reviewer_id` (TEXT)
  - `decision` (TEXT: approved, changes_requested, rejected)
  - `comments` (TEXT)
  - `reviewed_at` (TIMESTAMPTZ)

- `revalidation_records`:
  - `id` (UUID, PK)
  - `action_id` (UUID, FK -> corrective_actions)
  - `revalidated_by` (TEXT)
  - `outcome` (TEXT: resolved, failed, pending)
  - `verification_notes` (TEXT)
  - `revalidated_at` (TIMESTAMPTZ)

### Feature 3: Regulatory Change Impact Analyzer
- `regulatory_sources`:
  - `id` (UUID, PK)
  - `name`, `official_url`, `publisher`, `category`, `jurisdiction`, `source_type`, `monitoring_status`

- `regulatory_documents`:
  - `id` (UUID, PK)
  - `source_id` (UUID, FK -> regulatory_sources)
  - `title`, `document_number`, `issuing_authority`, `document_type`, `publication_date`, `effective_date`, `verification_status`

- `regulatory_versions`:
  - `id` (UUID, PK)
  - `document_id` (UUID, FK -> regulatory_documents)
  - `version_number`, `academic_year`, `supersedes_version_id`, `status`, `file_sha256`

- `regulatory_clauses`:
  - `id` (UUID, PK)
  - `version_id` (UUID, FK -> regulatory_versions)
  - `clause_number`, `chapter`, `section_title`, `page_number`, `clause_text`, `clause_type`, `is_verified`

- `regulatory_changes`:
  - `id` (UUID, PK)
  - `previous_version_id` / `new_version_id` (UUID)
  - `change_type` (added, modified, removed, threshold_changed, criteria_changed, deadline_changed, procedural)
  - `title`, `description`, `old_text`, `new_text`, `diff` (JSONB)
  - `significance` (critical, major, minor, clarification)
  - `review_status` (in_review, confirmed, rejected, needs_clarification)

- `institutional_impact_assessments`:
  - `id` (UUID, PK)
  - `change_id` (UUID, FK -> regulatory_changes)
  - `institution_id` (UUID, FK -> institutions)
  - `impact_category`, `impact_severity`, `explanation`, `recommended_action`
  - `affected_documents` (JSONB), `affected_findings` (JSONB)
  - `review_status` (pending_review, acknowledged, action_created, waived)

### Notifications
- `notifications`:
  - `id` (UUID, PK)
  - `institution_id` (UUID)
  - `recipient_id` (TEXT, nullable)
  - `title`, `message`, `type`, `action_url`, `is_read`, `created_at`
