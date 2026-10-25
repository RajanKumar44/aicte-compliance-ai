-- Migration: institution_documents table with RLS and retention policies
-- Stores uploaded statutory certificate metadata, verification candidates, and malware scan status.
-- Scoped to authenticated institution members.

create table if not exists public.institution_documents (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    uploaded_by uuid not null references auth.users(id) on delete restrict,
    filename text not null check (length(trim(filename)) between 1 and 255),
    filesize_bytes bigint not null check (filesize_bytes > 0 and filesize_bytes <= 10485760),
    sha256 text not null check (length(sha256) = 64),
    storage_path text not null unique,
    document_type text not null default 'statutory_clearance',
    extracted_metadata jsonb not null default '{}'::jsonb,
    scan_status text not null check (scan_status in ('pending', 'clean', 'infected', 'scan_unavailable')),
    scan_details text not null default '',
    created_at timestamptz not null default now(),
    expires_at timestamptz generated always as (created_at + interval '365 days') stored
);

create index if not exists institution_documents_institution_idx
    on public.institution_documents(institution_id, created_at desc);

create index if not exists institution_documents_uploader_idx
    on public.institution_documents(uploaded_by, created_at desc);

alter table public.institution_documents enable row level security;

revoke all on public.institution_documents from anon, authenticated;

grant select on public.institution_documents to authenticated;
grant insert (
    institution_id,
    uploaded_by,
    filename,
    filesize_bytes,
    sha256,
    storage_path,
    document_type,
    extracted_metadata,
    scan_status,
    scan_details
) on public.institution_documents to authenticated;
grant delete on public.institution_documents to authenticated;

-- Policies using existing public.has_institution_role
drop policy if exists institution_documents_select_scoped on public.institution_documents;
create policy institution_documents_select_scoped
    on public.institution_documents
    for select
    to authenticated
    using (public.has_institution_role(institution_id));

drop policy if exists institution_documents_insert_applicant on public.institution_documents;
create policy institution_documents_insert_applicant
    on public.institution_documents
    for insert
    to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and public.has_institution_role(institution_id, array['applicant', 'institution_admin'])
    );

drop policy if exists institution_documents_delete_admin on public.institution_documents;
create policy institution_documents_delete_admin
    on public.institution_documents
    for delete
    to authenticated
    using (
        public.has_institution_role(institution_id, array['applicant', 'institution_admin'])
    );
