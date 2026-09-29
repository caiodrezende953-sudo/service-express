-- AJURA: base inicial de autenticação e perfis.
-- Execute no SQL Editor de um projeto Supabase novo.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 100),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  district text not null check (char_length(district) between 2 and 80),
  account_type text not null check (account_type in ('client', 'provider', 'both')),
  status text not null default 'active' check (status in ('active', 'suspended', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profile_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profile_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, district, account_type)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'full_name'),
    regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'),
    trim(new.raw_user_meta_data ->> 'district'),
    new.raw_user_meta_data ->> 'account_type'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, district, updated_at) on table public.profiles to authenticated;
