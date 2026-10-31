-- Auto-confirm user registrations in Supabase Auth
-- This ensures users can sign up and sign in immediately without being blocked
-- by Supabase default email delivery limits or missing SMTP configuration.

create or replace function public.auto_confirm_new_user()
returns trigger as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users before insert
drop trigger if exists on_auth_user_auto_confirm on auth.users;
create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function public.auto_confirm_new_user();

-- Automatically confirm all existing unconfirmed accounts
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
