-- Migration: application-centric workflow tables
-- applications, application_documents, application_findings, application_reviews
-- and application_audit_events, all institution-scoped via has_institution_role.
--
-- The checklist stored on each application row is a generated snapshot with
-- per-item statuses (mandatory / conditional / not_applicable /
-- pending_configuration). Rule ids inside the snapshot are demo configuration
-- and are NOT verified AICTE rule definitions.

create table if not exists public.applications (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    institution_external_ref text not null default '',
    created_by uuid not null references auth.users(id) on delete restrict,
    application_type text not null check (application_type in ('eoa', 'new_program', 'intake_change')),
    academic_year text not null check (length(trim(academic_year)) between 4 and 20),
    params jsonb not null default '{}'::jsonb,
    checklist jsonb not null default '[]'::jsonb,
    status text not null default 'submitted',
    created_at timestamptz not null default now(),
    expires_at timestamptz generated always as (created_at + interval '365 days') stored
);

create index if not exists applications_institution_idx
    on public.applications(institution_id, created_at desc);

alter table public.applications enable row level security;
revoke all on public.applications from anon, authenticated;
grant select, insert, update on public.applications to authenticated;

drop policy if exists applications_scoped_select on public.applications;
create policy applications_scoped_select
    on public.applications for select to authenticated
    using (public.has_institution_role(institution_id));

drop policy if exists applications_insert_member on public.applications;
create policy applications_insert_member
    on public.applications for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and public.has_institution_role(institution_id, array['applicant', 'institution_admin'])
    );

drop policy if exists applications_update_member on public.applications;
create policy applications_update_member
    on public.applications for update to authenticated
    using (public.has_institution_role(institution_id))
    with check (public.has_institution_role(institution_id));

-- ---------------------------------------------------------------------------

create table if not exists public.application_documents (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    document_id uuid not null unique references public.institution_documents(id) on delete cascade,
    checklist_item_id text,
    uploaded_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now()
);

create index if not exists application_documents_app_idx
    on public.application_documents(application_id, created_at desc);

alter table public.application_documents enable row level security;
revoke all on public.application_documents from anon, authenticated;
grant select, insert, delete on public.application_documents to authenticated;

drop policy if exists application_documents_scoped_select on public.application_documents;
create policy application_documents_scoped_select
    on public.application_documents for select to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists application_documents_insert_member on public.application_documents;
create policy application_documents_insert_member
    on public.application_documents for insert to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id, array['applicant', 'institution_admin'])
        )
    );

drop policy if exists application_documents_delete_member on public.application_documents;
create policy application_documents_delete_member
    on public.application_documents for delete to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

-- ---------------------------------------------------------------------------

create table if not exists public.application_findings (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    code text not null,
    severity text not null check (severity in ('critical', 'high', 'medium', 'info')),
    rule_id text not null,
    message text not null,
    evidence jsonb not null default '{}'::jsonb,
    recommended_action text not null default '',
    status text not null default 'open' check (status in ('open', 'resolved', 'rejected', 'escalated')),
    opened_by uuid references auth.users(id) on delete set null,
    resolved_by uuid references auth.users(id) on delete set null,
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists application_findings_app_idx
    on public.application_findings(application_id, status, created_at desc);

alter table public.application_findings enable row level security;
revoke all on public.application_findings from anon, authenticated;
grant select, insert, update on public.application_findings to authenticated;

drop policy if exists application_findings_scoped_select on public.application_findings;
create policy application_findings_scoped_select
    on public.application_findings for select to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists application_findings_insert_member on public.application_findings;
create policy application_findings_insert_member
    on public.application_findings for insert to authenticated
    with check (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists application_findings_update_reviewer on public.application_findings;
create policy application_findings_update_reviewer
    on public.application_findings for update to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id, array['reviewer', 'institution_admin'])
        )
    )
    with check (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id, array['reviewer', 'institution_admin'])
        )
    );

-- ---------------------------------------------------------------------------

create table if not exists public.application_reviews (
    id uuid primary key default gen_random_uuid(),
    finding_id uuid not null references public.application_findings(id) on delete cascade,
    application_id uuid not null references public.applications(id) on delete cascade,
    reviewed_by uuid not null references auth.users(id) on delete restrict,
    decision text not null check (decision in ('resolve', 'reject', 'escalate')),
    rationale text not null check (length(trim(rationale)) between 10 and 4000),
    created_at timestamptz not null default now()
);

create index if not exists application_reviews_app_idx
    on public.application_reviews(application_id, created_at desc);

alter table public.application_reviews enable row level security;
revoke all on public.application_reviews from anon, authenticated;
grant select, insert on public.application_reviews to authenticated;

drop policy if exists application_reviews_scoped_select on public.application_reviews;
create policy application_reviews_scoped_select
    on public.application_reviews for select to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists application_reviews_insert_reviewer on public.application_reviews;
create policy application_reviews_insert_reviewer
    on public.application_reviews for insert to authenticated
    with check (
        reviewed_by = (select auth.uid())
        and exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id, array['reviewer', 'institution_admin'])
        )
    );

-- ---------------------------------------------------------------------------

create table if not exists public.application_audit_events (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete restrict,
    action text not null,
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists application_audit_events_app_idx
    on public.application_audit_events(application_id, created_at asc);

alter table public.application_audit_events enable row level security;
revoke all on public.application_audit_events from anon, authenticated;
grant select, insert on public.application_audit_events to authenticated;

drop policy if exists application_audit_scoped_select on public.application_audit_events;
create policy application_audit_scoped_select
    on public.application_audit_events for select to authenticated
    using (
        exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

drop policy if exists application_audit_insert_member on public.application_audit_events;
create policy application_audit_insert_member
    on public.application_audit_events for insert to authenticated
    with check (
        user_id = (select auth.uid())
        and exists (
            select 1 from public.applications a
            where a.id = application_id
              and public.has_institution_role(a.institution_id)
        )
    );

-- Retention: recorded rules scope remains unverified demo configuration.
insert into public.regulatory_rule_scopes (application_type, academic_year, status, review_note)
values (
    'eoa',
    '2026-27',
    'in_review',
    'Application checklist demo scope still in review. No rule is approved or evaluated from official sources.'
)
on conflict (application_type, academic_year) do update set review_note = excluded.review_note;
