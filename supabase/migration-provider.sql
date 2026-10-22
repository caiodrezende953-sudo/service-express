-- AJURA: cadastro real de prestadores e catálogo profissional.
-- Execute uma única vez no SQL Editor do Supabase.

create table if not exists public.provider_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 100),
  bio text not null default '' check (char_length(bio) <= 1000),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_services (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category text not null check (char_length(category) between 2 and 80),
  subcategory text not null check (char_length(subcategory) between 2 and 100),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  pricing_type text not null check (pricing_type in ('fixed', 'quote')),
  starting_price numeric(12,2) check (starting_price is null or starting_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixed_service_requires_price check (pricing_type = 'quote' or starting_price is not null)
);

create table if not exists public.provider_service_areas (
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  district text not null check (char_length(district) between 2 and 80),
  primary key (provider_id, district)
);

alter table public.provider_profiles enable row level security;
alter table public.provider_services enable row level security;
alter table public.provider_service_areas enable row level security;

create policy "provider_profile_select_approved_or_own" on public.provider_profiles for select to authenticated
using (approval_status = 'approved' or (select auth.uid()) = id);
create policy "provider_profile_insert_own" on public.provider_profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "provider_profile_update_own" on public.provider_profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "provider_services_select_approved_or_own" on public.provider_services for select to authenticated
using (exists (select 1 from public.provider_profiles p where p.id = provider_id and (p.approval_status = 'approved' or p.id = (select auth.uid()))));
create policy "provider_services_insert_own" on public.provider_services for insert to authenticated
with check (provider_id = (select auth.uid()));
create policy "provider_services_update_own" on public.provider_services for update to authenticated
using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));
create policy "provider_services_delete_own" on public.provider_services for delete to authenticated
using (provider_id = (select auth.uid()));

create policy "provider_areas_select_approved_or_own" on public.provider_service_areas for select to authenticated
using (exists (select 1 from public.provider_profiles p where p.id = provider_id and (p.approval_status = 'approved' or p.id = (select auth.uid()))));
create policy "provider_areas_insert_own" on public.provider_service_areas for insert to authenticated
with check (provider_id = (select auth.uid()));
create policy "provider_areas_delete_own" on public.provider_service_areas for delete to authenticated
using (provider_id = (select auth.uid()));

revoke all on table public.provider_profiles, public.provider_services, public.provider_service_areas from anon;
revoke all on table public.provider_profiles, public.provider_services, public.provider_service_areas from authenticated;
grant select on table public.provider_profiles to authenticated;
grant insert (id, display_name, bio) on table public.provider_profiles to authenticated;
grant update (display_name, bio, updated_at) on table public.provider_profiles to authenticated;
grant select, insert, update, delete on table public.provider_services to authenticated;
grant select, insert, delete on table public.provider_service_areas to authenticated;
