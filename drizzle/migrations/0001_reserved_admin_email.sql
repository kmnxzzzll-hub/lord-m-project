-- The reserved admin e-mail is approved and receives the admin role when its account is first created.
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