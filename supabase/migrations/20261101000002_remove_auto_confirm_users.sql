-- Remove the retired auto-confirm trigger if it was installed manually in an
-- environment. This does not modify existing users or their confirmation state.
drop trigger if exists on_auth_user_auto_confirm on auth.users;
drop function if exists public.auto_confirm_new_user();
