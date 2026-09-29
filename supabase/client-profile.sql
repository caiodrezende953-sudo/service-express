-- AJURA: dados de atendimento do cliente e consentimentos versionados.
-- Execute uma vez no SQL Editor, depois de schema.sql.
begin;

alter table public.profiles
  add column if not exists address_line text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_reference text;

alter table public.profiles
  drop constraint if exists profiles_address_line_check,
  drop constraint if exists profiles_address_number_check;

alter table public.profiles
  add constraint profiles_address_line_check check (address_line is null or char_length(address_line) between 3 and 160),
  add constraint profiles_address_number_check check (address_number is null or char_length(address_number) between 1 and 20);

grant update (full_name, phone, district, address_line, address_number, address_complement, address_reference, updated_at)
on table public.profiles to authenticated;

create table if not exists public.profile_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  privacy_version text not null check (char_length(privacy_version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version, privacy_version)
);

alter table public.profile_consents enable row level security;
drop policy if exists profile_consents_select_own on public.profile_consents;
drop policy if exists profile_consents_insert_own on public.profile_consents;
create policy profile_consents_select_own on public.profile_consents for select to authenticated using (user_id = (select auth.uid()));
create policy profile_consents_insert_own on public.profile_consents for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.profile_consents from anon, authenticated;
grant select, insert on public.profile_consents to authenticated;

commit;
