-- Production validation history for Supabase Auth + Postgres.
-- All reads/writes use the signed-in user's access token and RLS; no service-role
-- key is used by the application server or browser.

create table public.institutions (
    id uuid primary key default gen_random_uuid(),
    external_ref text not null unique check (length(trim(external_ref)) between 1 and 100),
    display_name text not null check (length(trim(display_name)) between 1 and 200),
    created_at timestamptz not null default now()
);

create table public.institution_memberships (
    institution_id uuid not null references public.institutions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('applicant', 'reviewer', 'institution_admin')),
    created_at timestamptz not null default now(),
    primary key (institution_id, user_id)
);

create index institution_memberships_user_idx
    on public.institution_memberships(user_id, institution_id);

-- Metadata only. This migration seeds the candidate scope, not regulatory rules.
-- No rule can become active without source verification and expert approval.
create table public.regulatory_rule_scopes (
    id uuid primary key default gen_random_uuid(),
    application_type text not null check (application_type in ('eoa', 'new_program', 'intake_change')),
    academic_year text not null check (academic_year ~ '^20[0-9]{2}-[0-9]{2}$'),
    status text not null default 'in_review' check (status in ('in_review', 'approved', 'inactive')),
    source_register jsonb not null default '[]'::jsonb check (jsonb_typeof(source_register) = 'array'),
    review_note text not null,
    updated_at timestamptz not null default now(),
    unique (application_type, academic_year)
);

insert into public.regulatory_rule_scopes (application_type, academic_year, status, source_register, review_note)
values (
    'eoa',
    '2026-27',
    'in_review',
    '[
      {"title":"AICTE Approval Process Handbook 2024-25 to 2026-27","url":"https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf","review_status":"base source retrieved; amendment trail unresolved"},
      {"title":"Revised set of Documents for scrutiny for various categories under chapter I & II","url":"https://www.aicte.gov.in/sites/default/files/Revised%20set%20of%20Documents.pdf","review_status":"official source retrieved; EoA applicability not established"}
    ]'::jsonb,
    'Candidate scope only. No checklist item is active. Await full amendment reconciliation and qualified reviewer approval.'
)
on conflict (application_type, academic_year) do nothing;

create table public.validation_runs (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    created_by uuid not null references auth.users(id) on delete restrict,
    application_type text not null check (application_type in ('eoa', 'new_program', 'intake_change')),
    validation_scope text not null check (validation_scope = 'caller_supplied_checklist_only'),
    request_snapshot jsonb not null check (jsonb_typeof(request_snapshot) = 'object'),
    response_snapshot jsonb not null check (jsonb_typeof(response_snapshot) = 'object'),
    ruleset_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(ruleset_snapshot) = 'array' and ruleset_snapshot = '[]'::jsonb),
    checked_at timestamptz not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz generated always as (created_at + interval '365 days') stored
);

create index validation_runs_history_idx
    on public.validation_runs(institution_id, created_at desc, id desc);
create index validation_runs_creator_idx
    on public.validation_runs(created_by, created_at desc);
create index validation_runs_expiry_idx
    on public.validation_runs(expires_at);

create or replace function public.has_institution_role(target_institution uuid, allowed_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.institution_memberships as membership
        where membership.institution_id = target_institution
          and membership.user_id = (select auth.uid())
          and (allowed_roles is null or membership.role = any(allowed_roles))
    );
$$;

revoke all on function public.has_institution_role(uuid, text[]) from public, anon;
grant execute on function public.has_institution_role(uuid, text[]) to authenticated;

alter table public.institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.validation_runs enable row level security;
alter table public.regulatory_rule_scopes enable row level security;

revoke all on public.institutions, public.institution_memberships,
    public.validation_runs, public.regulatory_rule_scopes from anon, authenticated;

grant select on public.institutions to authenticated;
grant select on public.institution_memberships to authenticated;
grant select, delete on public.validation_runs to authenticated;
grant insert (
    institution_id, created_by, application_type, validation_scope,
    request_snapshot, response_snapshot, ruleset_snapshot, checked_at
) on public.validation_runs to authenticated;
grant select on public.regulatory_rule_scopes to authenticated;

create policy institutions_member_read
    on public.institutions for select to authenticated
    using (public.has_institution_role(id));

create policy memberships_self_or_admin_read
    on public.institution_memberships for select to authenticated
    using (
        user_id = (select auth.uid())
        or public.has_institution_role(institution_id, array['institution_admin'])
    );

create policy validation_runs_scoped_read
    on public.validation_runs for select to authenticated
    using (
        expires_at > now()
        and public.has_institution_role(institution_id)
        and (
            created_by = (select auth.uid())
            or public.has_institution_role(institution_id, array['reviewer', 'institution_admin'])
        )
    );

create policy validation_runs_member_insert
    on public.validation_runs for insert to authenticated
    with check (
        created_by = (select auth.uid())
        and public.has_institution_role(
            institution_id,
            array['applicant', 'reviewer', 'institution_admin']
        )
    );

create policy validation_runs_owner_or_admin_delete
    on public.validation_runs for delete to authenticated
    using (
        public.has_institution_role(institution_id)
        and (
            created_by = (select auth.uid())
            or public.has_institution_role(institution_id, array['institution_admin'])
        )
    );

create policy rule_scope_authenticated_read
    on public.regulatory_rule_scopes for select to authenticated
    using (true);

-- Supabase's pg_cron extension purges expired history daily. The expiry date is
-- generated by Postgres and cannot be extended by an API caller.
create extension if not exists pg_cron;
select cron.schedule(
    'purge-expired-aicte-validation-history',
    '15 2 * * *',
    $job$delete from public.validation_runs where expires_at <= now();$job$
);
