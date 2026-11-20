-- 1) New sign-ups: always 'pending' with only the 'user' role. No e-mail-based admin or approval.
--    Existing profiles and user_roles rows are not touched by this migration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    'pending'::public.account_status
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;

-- Trigger-only function: nobody calls it directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- Role/approval checks: only signed-in users (RLS) and the server need them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated, service_role;

-- 2) Global pause of the live table feed, shared by every client.
--    Writes go through the existing admin-only update policy on robot_settings.
ALTER TABLE public.robot_settings ADD COLUMN IF NOT EXISTS api_paused boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.robot_settings.api_paused IS
  'When true no client polls the live table and the server does not call the provider. Only admins can change it (robot_settings update policy).';