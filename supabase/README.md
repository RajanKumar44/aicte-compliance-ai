# Supabase setup for validation history

The repository contains a migration, not a provisioned Supabase project. The operator
must create/configure the project and supply its URL and publishable key before history
is available.

## Apply the migration

1. Create a Supabase project and enable email sign-in. Configure the allowed redirect URL
   to include the deployed app's `/history` path.
2. Install the Supabase CLI, authenticate it, link the project, then apply
   `supabase/migrations/20261024000000_validation_history.sql` with `supabase db push`.
3. Confirm the `purge-expired-aicte-validation-history` job exists in Supabase Cron and
   succeeds. It hard-deletes records once their generated `expires_at` reaches 365 days.
4. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the backend process environment.
   Copy `frontend/app/.env.example` to `frontend/app/.env.local` and set the same public
   project URL and publishable key there. The publishable key is not a secret. Never put
   a service-role or secret API key in either app.

The web client uses Supabase Auth's email sign-in link for existing invited users only.
Set Auth's email templates and redirect allowlist before enabling the sign-in link.
The browser stores the short-lived session in `sessionStorage`; it does not store
validation records in browser storage.

## Provision institution access

Account signup is disabled from the UI. Invite/create the user using Supabase Auth, then
provision an institution and membership from the Supabase dashboard's trusted SQL Editor.
Use the Auth user's UUID for `user_id`. A submitted institution reference alone never
grants access.

```sql
insert into public.institutions (external_ref, display_name)
values ('AICTE-INSTITUTION-REFERENCE', 'Institution display name')
on conflict (external_ref) do nothing;

insert into public.institution_memberships (institution_id, user_id, role)
select id, 'AUTH-USER-UUID'::uuid, 'applicant'
from public.institutions
where external_ref = 'AICTE-INSTITUTION-REFERENCE'
on conflict (institution_id, user_id) do update set role = excluded.role;
```

Supported membership roles are `applicant`, `reviewer`, and `institution_admin`.
Applicants can create and read their own runs. Reviewers can read runs within their
institution. Institution administrators can read and delete runs in their institution.
Each user can delete their own runs. Membership changes are performed by an operator in
the trusted dashboard, not by a client-supplied role or API parameter.

## Data and launch checks

- A saved run contains only the submitted validation request and result snapshots,
  institution/user IDs, and timestamps. Uploaded file contents are not accepted.
- The database computes the 365-day expiry; client requests cannot extend it. A daily
  Supabase Cron job deletes expired rows. Users can delete an authorized row sooner.
- The application does not use a service-role key. PostgREST receives the signed-in
  user's access token, and the migration grants only the required operations with RLS.
- Supabase backup/PITR and hosting-log retention are separate from row deletion. Confirm
  their retention and region against the operator's policy before real data is stored.
- The migration records only the candidate `eoa` / `2026-27` rule scope as `in_review`.
  It inserts no requirements or active rules. No AICTE rule is evaluated by this app.
- Legal review, operator contact details, and an expert reviewer for the EoA rule scope
  remain required before public production use.
