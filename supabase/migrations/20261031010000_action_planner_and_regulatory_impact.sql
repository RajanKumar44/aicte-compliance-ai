-- Migration: Compliance Action Planner, Regulatory Change Impact Analyzer, and Notification Foundation
-- Supports SIH26261 / AICTE Compliance AI canonical expansion

-- ============================================================================
-- 1. NOTIFICATIONS FOUNDATION
-- ============================================================================

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (length(trim(title)) between 3 and 200),
    message text not null check (length(trim(message)) between 3 and 1000),
    category text not null check (category in (
        'action_assignment',
        'deadline_warning',
        'evidence_submitted',
        'review_decision',
        'revalidation_result',
        'regulatory_update',
        'system'
    )),
    link_url text check (link_url is null or length(trim(link_url)) between 1 and 255),
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
    on public.notifications(user_id, is_read, created_at desc);

create index if not exists notifications_institution_idx
    on public.notifications(institution_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

grant select, update (is_read), delete on public.notifications to authenticated;
grant insert on public.notifications to authenticated;

drop policy if exists notifications_select_user on public.notifications;
create policy notifications_select_user
    on public.notifications
    for select
    to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists notifications_update_user on public.notifications;
create policy notifications_update_user
    on public.notifications
    for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists notifications_insert_institution on public.notifications;
create policy notifications_insert_institution
    on public.notifications
    for insert
    to authenticated
    with check (public.has_institution_role(institution_id));


-- ============================================================================
-- 2. COMPLIANCE ACTION PLANNER (FEATURE 2)
-- ============================================================================

create table if not exists public.corrective_actions (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    validation_run_id uuid references public.validation_runs(id) on delete set null,
    finding_code text not null check (length(trim(finding_code)) between 1 and 80),
    finding_title text not null check (length(trim(finding_title)) between 1 and 255),
    finding_description text not null,
    finding_severity text not null check (finding_severity in ('critical', 'severe', 'moderate', 'advisory')),
    title text not null check (length(trim(title)) between 3 and 255),
    description text not null check (length(trim(description)) >= 5),
    priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
    status text not null default 'draft' check (status in (
        'draft',
        'assigned',
        'accepted',
        'in_progress',
        'submitted_for_review',
        'changes_requested',
        'approved',
        'revalidation_required',
        'resolved',
        'cancelled'
    )),
    responsible_department text not null check (length(trim(responsible_department)) between 1 and 120),
    assigned_to uuid references auth.users(id) on delete set null,
    reviewer_id uuid references auth.users(id) on delete set null,
    start_date date,
    due_date date not null,
    expected_outcome text not null check (length(trim(expected_outcome)) >= 3),
    acceptance_criteria text not null check (length(trim(acceptance_criteria)) >= 3),
    required_evidence text not null check (length(trim(required_evidence)) >= 3),
    internal_notes text not null default '',
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists corrective_actions_institution_idx
    on public.corrective_actions(institution_id, status, due_date);

create index if not exists corrective_actions_assigned_idx
    on public.corrective_actions(assigned_to, status);

create index if not exists corrective_actions_run_idx
    on public.corrective_actions(validation_run_id);

alter table public.corrective_actions enable row level security;
revoke all on public.corrective_actions from anon, authenticated;

grant select, insert, update, delete on public.corrective_actions to authenticated;

drop policy if exists corrective_actions_select_scoped on public.corrective_actions;
create policy corrective_actions_select_scoped
    on public.corrective_actions
    for select
    to authenticated
    using (public.has_institution_role(institution_id));

drop policy if exists corrective_actions_insert_scoped on public.corrective_actions;
create policy corrective_actions_insert_scoped
    on public.corrective_actions
    for insert
    to authenticated
    with check (
        created_by = (select auth.uid())
        and public.has_institution_role(institution_id, array['applicant', 'reviewer', 'institution_admin'])
    );

drop policy if exists corrective_actions_update_scoped on public.corrective_actions;
create policy corrective_actions_update_scoped
    on public.corrective_actions
    for update
    to authenticated
    using (public.has_institution_role(institution_id))
    with check (public.has_institution_role(institution_id));

drop policy if exists corrective_actions_delete_scoped on public.corrective_actions;
create policy corrective_actions_delete_scoped
    on public.corrective_actions
    for delete
    to authenticated
    using (public.has_institution_role(institution_id, array['institution_admin']));


-- Status history for immutable auditability of state transitions
create table if not exists public.action_status_history (
    id uuid primary key default gen_random_uuid(),
    action_id uuid not null references public.corrective_actions(id) on delete cascade,
    from_status text not null,
    to_status text not null,
    actor_id uuid not null references auth.users(id),
    reason text not null check (length(trim(reason)) >= 1),
    created_at timestamptz not null default now()
);

create index if not exists action_status_history_action_idx
    on public.action_status_history(action_id, created_at desc);

alter table public.action_status_history enable row level security;
revoke all on public.action_status_history from anon, authenticated;
grant select, insert on public.action_status_history to authenticated;

drop policy if exists action_status_history_select on public.action_status_history;
create policy action_status_history_select
    on public.action_status_history
    for select
    to authenticated
    using (exists (
        select 1 from public.corrective_actions a
        where a.id = action_id and public.has_institution_role(a.institution_id)
    ));

drop policy if exists action_status_history_insert on public.action_status_history;
create policy action_status_history_insert
    on public.action_status_history
    for insert
    to authenticated
    with check (
        actor_id = (select auth.uid())
        and exists (
            select 1 from public.corrective_actions a
            where a.id = action_id and public.has_institution_role(a.institution_id)
        )
    );


-- Evidence submissions linked to corrective actions
create table if not exists public.action_evidence (
    id uuid primary key default gen_random_uuid(),
    action_id uuid not null references public.corrective_actions(id) on delete cascade,
    document_id uuid references public.institution_documents(id) on delete set null,
    title text not null check (length(trim(title)) between 2 and 200),
    description text not null check (length(trim(description)) >= 3),
    category text not null check (category in (
        'statutory_clearance',
        'affidavit',
        'infrastructure',
        'faculty_record',
        'financial',
        'undertaking',
        'other'
    )),
    storage_path text,
    submitted_by uuid not null references auth.users(id),
    submission_date timestamptz not null default now(),
    status text not null default 'pending_review' check (status in (
        'pending_review',
        'approved',
        'changes_requested',
        'rejected'
    )),
    reviewer_comments text not null default '',
    reviewed_by uuid references auth.users(id),
    reviewed_at timestamptz
);

create index if not exists action_evidence_action_idx
    on public.action_evidence(action_id, submission_date desc);

alter table public.action_evidence enable row level security;
revoke all on public.action_evidence from anon, authenticated;
grant select, insert, update on public.action_evidence to authenticated;

drop policy if exists action_evidence_select on public.action_evidence;
create policy action_evidence_select
    on public.action_evidence
    for select
    to authenticated
    using (exists (
        select 1 from public.corrective_actions a
        where a.id = action_id and public.has_institution_role(a.institution_id)
    ));

drop policy if exists action_evidence_insert on public.action_evidence;
create policy action_evidence_insert
    on public.action_evidence
    for insert
    to authenticated
    with check (
        submitted_by = (select auth.uid())
        and exists (
            select 1 from public.corrective_actions a
            where a.id = action_id and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists action_evidence_update on public.action_evidence;
create policy action_evidence_update
    on public.action_evidence
    for update
    to authenticated
    using (exists (
        select 1 from public.corrective_actions a
        where a.id = action_id and public.has_institution_role(a.institution_id, array['reviewer', 'institution_admin'])
    ));


-- Action Reviews
create table if not exists public.action_reviews (
    id uuid primary key default gen_random_uuid(),
    action_id uuid not null references public.corrective_actions(id) on delete cascade,
    reviewer_id uuid not null references auth.users(id),
    decision text not null check (decision in ('approved', 'changes_requested', 'rejected')),
    comments text not null check (length(trim(comments)) >= 3),
    created_at timestamptz not null default now()
);

create index if not exists action_reviews_action_idx
    on public.action_reviews(action_id, created_at desc);

alter table public.action_reviews enable row level security;
revoke all on public.action_reviews from anon, authenticated;
grant select, insert on public.action_reviews to authenticated;

drop policy if exists action_reviews_select on public.action_reviews;
create policy action_reviews_select
    on public.action_reviews
    for select
    to authenticated
    using (exists (
        select 1 from public.corrective_actions a
        where a.id = action_id and public.has_institution_role(a.institution_id)
    ));

drop policy if exists action_reviews_insert on public.action_reviews;
create policy action_reviews_insert
    on public.action_reviews
    for insert
    to authenticated
    with check (
        reviewer_id = (select auth.uid())
        and exists (
            select 1 from public.corrective_actions a
            where a.id = action_id and public.has_institution_role(a.institution_id, array['reviewer', 'institution_admin'])
        )
    );


-- Revalidation Records
create table if not exists public.revalidation_records (
    id uuid primary key default gen_random_uuid(),
    action_id uuid not null references public.corrective_actions(id) on delete cascade,
    previous_run_id uuid references public.validation_runs(id) on delete set null,
    new_run_id uuid references public.validation_runs(id) on delete set null,
    outcome text not null check (outcome in (
        'resolved',
        'partially_resolved',
        'still_open',
        'manual_verification_required'
    )),
    evidence_summary text not null check (length(trim(evidence_summary)) >= 3),
    evaluated_by uuid not null references auth.users(id),
    evaluation_date timestamptz not null default now(),
    notes text not null default ''
);

create index if not exists revalidation_records_action_idx
    on public.revalidation_records(action_id, evaluation_date desc);

alter table public.revalidation_records enable row level security;
revoke all on public.revalidation_records from anon, authenticated;
grant select, insert on public.revalidation_records to authenticated;

drop policy if exists revalidation_records_select on public.revalidation_records;
create policy revalidation_records_select
    on public.revalidation_records
    for select
    to authenticated
    using (exists (
        select 1 from public.corrective_actions a
        where a.id = action_id and public.has_institution_role(a.institution_id)
    ));

drop policy if exists revalidation_records_insert on public.revalidation_records;
create policy revalidation_records_insert
    on public.revalidation_records
    for insert
    to authenticated
    with check (
        evaluated_by = (select auth.uid())
        and exists (
            select 1 from public.corrective_actions a
            where a.id = action_id and public.has_institution_role(a.institution_id)
        )
    );


-- ============================================================================
-- 3. REGULATORY CHANGE IMPACT ANALYZER (FEATURE 3)
-- ============================================================================

-- Registry of authoritative regulatory sources
create table if not exists public.regulatory_sources (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (length(trim(name)) between 3 and 255),
    official_url text not null check (official_url ~* '^https?://'),
    publisher text not null check (length(trim(publisher)) between 2 and 150),
    category text not null check (category in (
        'council_handbook',
        'gazette_notification',
        'circular',
        'court_order',
        'state_policy'
    )),
    jurisdiction text not null default 'All India / National',
    source_type text not null check (source_type in (
        'primary_statutory',
        'official_gazette',
        'administrative_circular',
        'regulatory_board'
    )),
    monitoring_status text not null default 'active' check (monitoring_status in ('active', 'paused', 'archived')),
    last_checked_at timestamptz,
    last_retrieved_at timestamptz,
    verification_status text not null default 'verified' check (verification_status in ('verified', 'unverified', 'in_review')),
    created_at timestamptz not null default now()
);

alter table public.regulatory_sources enable row level security;
revoke all on public.regulatory_sources from anon, authenticated;
grant select, insert, update on public.regulatory_sources to authenticated;

drop policy if exists regulatory_sources_select on public.regulatory_sources;
create policy regulatory_sources_select
    on public.regulatory_sources
    for select
    to authenticated
    using (true);

drop policy if exists regulatory_sources_insert on public.regulatory_sources;
create policy regulatory_sources_insert
    on public.regulatory_sources
    for insert
    to authenticated
    with check (true);


-- Published Regulatory Documents
create table if not exists public.regulatory_documents (
    id uuid primary key default gen_random_uuid(),
    source_id uuid references public.regulatory_sources(id) on delete cascade,
    title text not null check (length(trim(title)) between 3 and 255),
    document_number text check (document_number is null or length(trim(document_number)) between 1 and 100),
    issuing_authority text not null check (length(trim(issuing_authority)) between 2 and 150),
    document_type text not null check (document_type in (
        'approval_handbook',
        'gazette_regulation',
        'public_notice',
        'scrutiny_guidelines',
        'amendment_corrigendum'
    )),
    publication_date date not null,
    effective_date date not null,
    source_url text check (source_url is null or source_url ~* '^https?://'),
    storage_path text,
    verification_status text not null default 'verified' check (verification_status in ('verified', 'unverified', 'in_review')),
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

alter table public.regulatory_documents enable row level security;
revoke all on public.regulatory_documents from anon, authenticated;
grant select, insert, update on public.regulatory_documents to authenticated;

drop policy if exists regulatory_documents_select on public.regulatory_documents;
create policy regulatory_documents_select
    on public.regulatory_documents
    for select
    to authenticated
    using (true);

drop policy if exists regulatory_documents_insert on public.regulatory_documents;
create policy regulatory_documents_insert
    on public.regulatory_documents
    for insert
    to authenticated
    with check (true);


-- Immutable Regulatory Versions
create table if not exists public.regulatory_versions (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.regulatory_documents(id) on delete cascade,
    version_number text not null check (length(trim(version_number)) between 1 and 50),
    academic_year text not null check (academic_year ~ '^20[0-9]{2}-[0-9]{2}$'),
    supersedes_version_id uuid references public.regulatory_versions(id) on delete set null,
    status text not null default 'in_review' check (status in ('draft', 'in_review', 'verified_active', 'superseded', 'archived')),
    file_sha256 text check (file_sha256 is null or length(file_sha256) = 64),
    verified_by uuid references auth.users(id),
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    unique (document_id, version_number)
);

alter table public.regulatory_versions enable row level security;
revoke all on public.regulatory_versions from anon, authenticated;
grant select, insert, update on public.regulatory_versions to authenticated;

drop policy if exists regulatory_versions_select on public.regulatory_versions;
create policy regulatory_versions_select
    on public.regulatory_versions
    for select
    to authenticated
    using (true);

drop policy if exists regulatory_versions_insert on public.regulatory_versions;
create policy regulatory_versions_insert
    on public.regulatory_versions
    for insert
    to authenticated
    with check (true);


-- Extracted Regulatory Clauses
create table if not exists public.regulatory_clauses (
    id uuid primary key default gen_random_uuid(),
    version_id uuid not null references public.regulatory_versions(id) on delete cascade,
    clause_number text not null check (length(trim(clause_number)) between 1 and 50),
    chapter text not null check (length(trim(chapter)) between 1 and 100),
    section_title text not null check (length(trim(section_title)) between 1 and 200),
    page_number int not null check (page_number > 0),
    clause_text text not null check (length(trim(clause_text)) >= 5),
    clause_type text not null default 'norm' check (clause_type in ('norm', 'definition', 'threshold', 'procedure', 'penalty', 'exemption')),
    extraction_confidence double precision not null default 0.95 check (extraction_confidence between 0.0 and 1.0),
    extraction_method text not null default 'structured_digital',
    is_verified boolean not null default true,
    verified_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

create index if not exists regulatory_clauses_version_idx
    on public.regulatory_clauses(version_id, clause_number);

alter table public.regulatory_clauses enable row level security;
revoke all on public.regulatory_clauses from anon, authenticated;
grant select, insert, update on public.regulatory_clauses to authenticated;

drop policy if exists regulatory_clauses_select on public.regulatory_clauses;
create policy regulatory_clauses_select
    on public.regulatory_clauses
    for select
    to authenticated
    using (true);

drop policy if exists regulatory_clauses_insert on public.regulatory_clauses;
create policy regulatory_clauses_insert
    on public.regulatory_clauses
    for insert
    to authenticated
    with check (true);


-- Identified Regulatory Changes between Versions
create table if not exists public.regulatory_changes (
    id uuid primary key default gen_random_uuid(),
    previous_version_id uuid references public.regulatory_versions(id) on delete cascade,
    new_version_id uuid not null references public.regulatory_versions(id) on delete cascade,
    previous_clause_id uuid references public.regulatory_clauses(id) on delete set null,
    new_clause_id uuid references public.regulatory_clauses(id) on delete set null,
    change_type text not null check (change_type in (
        'added',
        'modified',
        'removed',
        'threshold_changed',
        'deadline_changed',
        'criteria_changed',
        'procedural'
    )),
    title text not null check (length(trim(title)) between 3 and 255),
    description text not null check (length(trim(description)) >= 5),
    old_text text,
    new_text text,
    significance text not null check (significance in ('critical', 'major', 'minor', 'clarification')),
    review_status text not null default 'in_review' check (review_status in ('in_review', 'confirmed', 'rejected', 'needs_clarification')),
    reviewed_by uuid references auth.users(id),
    reviewed_at timestamptz,
    reviewer_comments text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists regulatory_changes_versions_idx
    on public.regulatory_changes(new_version_id, change_type, review_status);

alter table public.regulatory_changes enable row level security;
revoke all on public.regulatory_changes from anon, authenticated;
grant select, insert, update on public.regulatory_changes to authenticated;

drop policy if exists regulatory_changes_select on public.regulatory_changes;
create policy regulatory_changes_select
    on public.regulatory_changes
    for select
    to authenticated
    using (true);

drop policy if exists regulatory_changes_insert on public.regulatory_changes;
create policy regulatory_changes_insert
    on public.regulatory_changes
    for insert
    to authenticated
    with check (true);


-- Compliance Requirements Catalogue
create table if not exists public.compliance_requirements (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (length(trim(code)) between 2 and 50),
    title text not null check (length(trim(title)) between 3 and 255),
    description text not null,
    category text not null check (category in (
        'faculty_cadre',
        'land_building',
        'safety_statutory',
        'academic_program',
        'financial_corpus',
        'governance'
    )),
    mandatory boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.compliance_requirements enable row level security;
revoke all on public.compliance_requirements from anon, authenticated;
grant select, insert, update on public.compliance_requirements to authenticated;

drop policy if exists compliance_requirements_select on public.compliance_requirements;
create policy compliance_requirements_select
    on public.compliance_requirements
    for select
    to authenticated
    using (true);

drop policy if exists compliance_requirements_insert on public.compliance_requirements;
create policy compliance_requirements_insert
    on public.compliance_requirements
    for insert
    to authenticated
    with check (true);


-- Requirement-Clause Mappings
create table if not exists public.requirement_clause_mappings (
    id uuid primary key default gen_random_uuid(),
    requirement_id uuid not null references public.compliance_requirements(id) on delete cascade,
    clause_id uuid not null references public.regulatory_clauses(id) on delete cascade,
    change_id uuid references public.regulatory_changes(id) on delete set null,
    notes text not null default '',
    created_at timestamptz not null default now(),
    unique (requirement_id, clause_id)
);

alter table public.requirement_clause_mappings enable row level security;
revoke all on public.requirement_clause_mappings from anon, authenticated;
grant select, insert, update on public.requirement_clause_mappings to authenticated;

drop policy if exists requirement_clause_mappings_select on public.requirement_clause_mappings;
create policy requirement_clause_mappings_select
    on public.requirement_clause_mappings
    for select
    to authenticated
    using (true);

drop policy if exists requirement_clause_mappings_insert on public.requirement_clause_mappings;
create policy requirement_clause_mappings_insert
    on public.requirement_clause_mappings
    for insert
    to authenticated
    with check (true);


-- Institutional Impact Assessments (Connecting Regulatory Changes to Institutions)
create table if not exists public.institutional_impact_assessments (
    id uuid primary key default gen_random_uuid(),
    change_id uuid not null references public.regulatory_changes(id) on delete cascade,
    institution_id uuid not null references public.institutions(id) on delete cascade,
    requirement_id uuid references public.compliance_requirements(id) on delete set null,
    impact_category text not null check (impact_category in (
        'no_impact',
        'informational',
        'evidence_update_required',
        'requirement_review_required',
        'potential_compliance_gap',
        'urgent_review_required',
        'manual_verification_required'
    )),
    impact_severity text not null check (impact_severity in ('critical', 'high', 'medium', 'low', 'info')),
    explanation text not null check (length(trim(explanation)) >= 5),
    recommended_action text not null check (length(trim(recommended_action)) >= 3),
    affected_documents jsonb not null default '[]'::jsonb check (jsonb_typeof(affected_documents) = 'array'),
    affected_findings jsonb not null default '[]'::jsonb check (jsonb_typeof(affected_findings) = 'array'),
    affected_corrective_actions jsonb not null default '[]'::jsonb check (jsonb_typeof(affected_corrective_actions) = 'array'),
    review_status text not null default 'pending_review' check (review_status in ('pending_review', 'acknowledged', 'action_created', 'waived')),
    reviewed_by uuid references auth.users(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists institutional_impact_institution_idx
    on public.institutional_impact_assessments(institution_id, impact_severity, review_status);

create index if not exists institutional_impact_change_idx
    on public.institutional_impact_assessments(change_id);

alter table public.institutional_impact_assessments enable row level security;
revoke all on public.institutional_impact_assessments from anon, authenticated;
grant select, insert, update on public.institutional_impact_assessments to authenticated;

drop policy if exists institutional_impact_select on public.institutional_impact_assessments;
create policy institutional_impact_select
    on public.institutional_impact_assessments
    for select
    to authenticated
    using (public.has_institution_role(institution_id));

drop policy if exists institutional_impact_insert on public.institutional_impact_assessments;
create policy institutional_impact_insert
    on public.institutional_impact_assessments
    for insert
    to authenticated
    with check (public.has_institution_role(institution_id));

drop policy if exists institutional_impact_update on public.institutional_impact_assessments;
create policy institutional_impact_update
    on public.institutional_impact_assessments
    for update
    to authenticated
    using (public.has_institution_role(institution_id))
    with check (public.has_institution_role(institution_id));


-- ============================================================================
-- 4. SEED CANONICAL REGULATORY DATA (AICTE APH 2024-25 through 2026-27)
-- ============================================================================

-- Seed Regulatory Sources
insert into public.regulatory_sources (id, name, official_url, publisher, category, jurisdiction, source_type, verification_status)
values
    (
        '11111111-1111-1111-1111-111111111111',
        'AICTE Central Portal - Approval Process Handbook',
        'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
        'All India Council for Technical Education (AICTE)',
        'council_handbook',
        'All India / National',
        'primary_statutory',
        'verified'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Ministry of Education / AICTE Scrutiny Guidelines',
        'https://www.aicte.gov.in/sites/default/files/Revised%20set%20of%20Documents.pdf',
        'AICTE Approval Bureau',
        'circular',
        'All India / National',
        'administrative_circular',
        'verified'
    )
on conflict (name) do nothing;

-- Seed Regulatory Documents
insert into public.regulatory_documents (id, source_id, title, document_number, issuing_authority, document_type, publication_date, effective_date, source_url)
values
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'Approval Process Handbook (APH 2024–25 to 2026–27)',
        'F.No. AICTE/AB/APH/2024-27',
        'All India Council for Technical Education',
        'approval_handbook',
        '2024-03-15',
        '2024-04-01',
        'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf'
    )
on conflict do nothing;

-- Seed Base and Amendment Versions
insert into public.regulatory_versions (id, document_id, version_number, academic_year, status, file_sha256)
values
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'v2024-25.1',
        '2024-25',
        'superseded',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'v2026-27.1',
        '2026-27',
        'verified_active',
        'f4c0a55298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c966'
    )
on conflict do nothing;

-- Seed Key Regulatory Clauses
insert into public.regulatory_clauses (id, version_id, clause_number, chapter, section_title, page_number, clause_text, clause_type)
values
    (
        'dddddddd-dddd-dddd-dddd-dddddddddd01',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Clause 2.4',
        'Chapter II',
        'Fire and Life Safety NOC',
        42,
        'Valid Fire Safety NOC issued by the Competent State Fire Authority for all instructional and administrative blocks.',
        'threshold'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddd02',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Clause 2.6',
        'Chapter II',
        'Structural Stability Certificate',
        45,
        'Certificate issued by a Government-registered Structural Engineer confirming the building earthquake and structural soundness.',
        'threshold'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddd03',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Annexure 5',
        'Norms & Standards',
        'Faculty Cadre Ratio & FSR',
        118,
        'Institutions shall maintain Faculty-to-Student Ratio of 1:20 for UG Engineering with Cadre Ratio 1:2:6. Cadre ratio is not applicable at Diploma level.',
        'norm'
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddd04',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Clause 1.7',
        'Chapter I',
        'Land Title & 30-Year Registered Lease',
        28,
        'Clear, unencumbered land ownership or minimum 30-year registered lease deed with official Non-Agricultural (NA) educational conversion order.',
        'norm'
    )
on conflict do nothing;

-- Seed Compliance Requirements
insert into public.compliance_requirements (id, code, title, description, category, mandatory)
values
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',
        'REQ-FIRE-01',
        'Valid State Fire Authority NOC',
        'Institutional campus buildings must hold an active Fire and Life Safety Certificate without expiry during the academic year.',
        'safety_statutory',
        true
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
        'REQ-STRUCT-01',
        'Structural Stability & Seismic Clearance',
        'Proof of structural soundness certified by a recognized municipal or chartered engineer.',
        'safety_statutory',
        true
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03',
        'REQ-CADRE-01',
        'Faculty Cadre Ratio (1:2:6) and FSR Norms',
        'Maintenance of prescribed Faculty-to-Student Ratio and Cadre hierarchy (Professor : Associate Professor : Assistant Professor).',
        'faculty_cadre',
        true
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04',
        'REQ-LAND-01',
        'Contiguous Land & 30-Year Registered Lease',
        'Lawful possession of contiguous institutional land with municipal non-agricultural educational conversion order.',
        'land_building',
        true
    )
on conflict (code) do nothing;

-- Seed Requirement Mappings
insert into public.requirement_clause_mappings (requirement_id, clause_id, notes)
values
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'Direct statutory mapping for Fire NOC'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 'Direct statutory mapping for Building Structural Stability'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'dddddddd-dddd-dddd-dddd-dddddddddd03', 'Direct statutory mapping for Faculty Cadre Ratio'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'dddddddd-dddd-dddd-dddd-dddddddddd04', 'Direct statutory mapping for Land Title')
on conflict (requirement_id, clause_id) do nothing;

-- Seed Sample Regulatory Changes
insert into public.regulatory_changes (
    id,
    previous_version_id,
    new_version_id,
    new_clause_id,
    change_type,
    title,
    description,
    old_text,
    new_text,
    significance,
    review_status
)
values
    (
        'ffffffff-ffff-ffff-ffff-ffffffffff01',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'dddddddd-dddd-dddd-dddd-dddddddddd03',
        'modified',
        'Undergraduate Engineering FSR Harmonization & Diploma Exemption',
        'Clarified 1:20 FSR across all UG Engineering courses with explicit statutory exemption of 1:2:6 Cadre ratio for Polytechnic Diploma programmes.',
        'Cadre ratio 1:2:6 applies to all technical education institutions.',
        'Institutions shall maintain Faculty-to-Student Ratio of 1:20 for UG Engineering with Cadre Ratio 1:2:6. Cadre ratio is not applicable at Diploma level.',
        'critical',
        'confirmed'
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffff02',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'dddddddd-dddd-dddd-dddd-dddddddddd01',
        'threshold_changed',
        'Mandatory Online Fire NOC Verification Portal Challan',
        'State Fire Safety renewals now require official District Fire Officer Challan verification receipt within 30 days of expiry.',
        'Fire NOC must be renewed annually by municipal authority.',
        'Valid Fire Safety NOC issued by the Competent State Fire Authority for all instructional and administrative blocks with verified challan acknowledgment.',
        'major',
        'confirmed'
    )
on conflict do nothing;
