-- Canonical private document vault. This migration version is already present
-- in the linked production project's migration history; this copy keeps the
-- repository schema in sync with that deployed version.
create table if not exists public.document_versions (
    id uuid primary key default gen_random_uuid(),
    institution_id uuid not null references public.institutions(id) on delete cascade,
    uploaded_by uuid not null references auth.users(id) on delete restrict,
    storage_path text not null unique,
    original_filename text not null check (length(trim(original_filename)) between 1 and 255),
    content_type text not null check (content_type = 'application/pdf'),
    size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
    sha256 text not null check (length(sha256) = 64),
    scan_status text not null default 'scan_unavailable'
        check (scan_status in ('pending', 'clean', 'infected', 'scan_unavailable')),
    scan_detail text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists document_versions_institution_idx
    on public.document_versions(institution_id, created_at desc);

alter table public.document_versions enable row level security;
revoke all on public.document_versions from anon, authenticated;
grant select on public.document_versions to authenticated;
grant insert (
    institution_id, uploaded_by, storage_path, original_filename, content_type,
    size_bytes, sha256, scan_status, scan_detail
) on public.document_versions to authenticated;

drop policy if exists document_versions_member_select on public.document_versions;
create policy document_versions_member_select
    on public.document_versions for select to authenticated
    using (
        exists (
            select 1 from public.institution_memberships m
            where m.institution_id = document_versions.institution_id
              and m.user_id = (select auth.uid())
        )
    );

drop policy if exists document_versions_member_insert on public.document_versions;
create policy document_versions_member_insert
    on public.document_versions for insert to authenticated
    with check (
        uploaded_by = (select auth.uid())
        and scan_status = 'scan_unavailable'
        and storage_path like institution_id::text || '/' || (select auth.uid())::text || '/%'
        and exists (
            select 1 from public.institution_memberships m
            where m.institution_id = document_versions.institution_id
              and m.user_id = (select auth.uid())
        )
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('institution-documents', 'institution-documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists institution_documents_member_read on storage.objects;
create policy institution_documents_member_read
    on storage.objects for select to authenticated
    using (
        bucket_id = 'institution-documents'
        and exists (
            select 1 from public.institution_memberships m
            where m.user_id = (select auth.uid())
              and m.institution_id::text = (storage.foldername(objects.name))[1]
        )
    );

drop policy if exists institution_documents_member_upload on storage.objects;
create policy institution_documents_member_upload
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'institution-documents'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
            select 1 from public.institution_memberships m
            where m.user_id = (select auth.uid())
              and m.institution_id::text = (storage.foldername(objects.name))[1]
        )
    );

drop policy if exists institution_documents_uploader_delete on storage.objects;
create policy institution_documents_uploader_delete
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'institution-documents'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
            select 1 from public.institution_memberships m
            where m.user_id = (select auth.uid())
              and m.institution_id::text = (storage.foldername(objects.name))[1]
        )
    );
