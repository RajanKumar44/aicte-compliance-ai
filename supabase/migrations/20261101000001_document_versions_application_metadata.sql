-- Add application workflow metadata to the production document vault.
-- The existing document_versions rows and storage objects remain untouched.
alter table public.document_versions
    add column if not exists document_type text not null default 'statutory_clearance',
    add column if not exists extracted_metadata jsonb not null default '{}'::jsonb;
