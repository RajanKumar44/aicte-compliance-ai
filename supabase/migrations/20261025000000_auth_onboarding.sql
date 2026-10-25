-- Safe onboarding for newly registered authenticated users into an applicant membership.
-- Users can onboard with their institution code/name as 'applicant' ONLY.
-- Never grants 'institution_admin' or 'reviewer' privileges through public onboarding.

create or replace function public.onboard_applicant(
    p_external_ref text,
    p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_institution_id uuid;
    v_clean_ref text;
    v_clean_name text;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        raise exception 'Authentication required for institution onboarding';
    end if;

    v_clean_ref := upper(trim(p_external_ref));
    v_clean_name := trim(p_display_name);

    if length(v_clean_ref) < 1 or length(v_clean_ref) > 100 then
        raise exception 'Invalid institution external reference length';
    end if;

    if length(v_clean_name) < 1 or length(v_clean_name) > 200 then
        raise exception 'Invalid institution display name length';
    end if;

    -- Look up or create institution
    select id into v_institution_id
    from public.institutions
    where external_ref = v_clean_ref;

    if v_institution_id is null then
        insert into public.institutions (external_ref, display_name)
        values (v_clean_ref, v_clean_name)
        returning id into v_institution_id;
    end if;

    -- Link membership as 'applicant' ONLY (do not allow privilege escalation)
    insert into public.institution_memberships (institution_id, user_id, role)
    values (v_institution_id, v_user_id, 'applicant')
    on conflict (institution_id, user_id) do nothing;

    return v_institution_id;
end;
$$;

revoke all on function public.onboard_applicant(text, text) from public, anon;
grant execute on function public.onboard_applicant(text, text) to authenticated;
