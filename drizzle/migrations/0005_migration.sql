-- Undo the duplicate setup from 0004 and keep the project's original rules (0000-0003).
DROP TRIGGER IF EXISTS profiles_protect ON public.profiles;

DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Signed-in users read robot settings" ON public.robot_settings;
DROP POLICY IF EXISTS "Admins update robot settings" ON public.robot_settings;
DROP POLICY IF EXISTS "Approved users read rounds" ON public.live_rounds;
DROP POLICY IF EXISTS "Approved users read feed status" ON public.live_feed_status;
DROP POLICY IF EXISTS "Users manage own signals" ON public.signals;
DROP POLICY IF EXISTS "Signed-in users view avatars" ON storage.objects;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status or new.email is distinct from old.email)
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed to change status';
  end if;
  if new.id = auth.uid() and public.has_role(auth.uid(), 'admin') and new.status <> 'approved' then
    raise exception 'Admin cannot block own account';
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_reserved_admin boolean := lower(coalesce(new.email, '')) = 'fernandomuaaca@gmail.com';
begin
  insert into public.profiles (id, name, email, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    case when is_reserved_admin then 'approved'::public.account_status else 'pending'::public.account_status end
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if is_reserved_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.claim_live_feed_sync(_min_interval_ms integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  claimed boolean;
BEGIN
  INSERT INTO public.live_feed_status AS s (id, last_attempt_at)
  VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET last_attempt_at = now()
    WHERE s.last_attempt_at < now() - make_interval(secs => _min_interval_ms / 1000.0)
  RETURNING true INTO claimed;
  RETURN coalesce(claimed, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_live_feed_sync(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_feed_sync(integer) TO service_role;

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
create policy "Users update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);