-- AJURA etapa 3. Executar sobre a base existente, sem recriar tabelas.
begin;
-- Remover as políticas da instrução anterior: a aprovação oficial está em provider_profiles.
drop policy if exists provider_services_public_approved on public.provider_services;
drop policy if exists provider_services_manage_own on public.provider_services;

create table if not exists public.provider_private_details (
  provider_id uuid primary key references public.provider_profiles(id) on delete cascade,
  document_number text not null check (document_number ~ '^([0-9]{11}|[0-9]{14})$'),
  business_name text not null check (char_length(business_name) between 3 and 160),
  updated_at timestamptz not null default now()
);
alter table public.provider_private_details enable row level security;
revoke all on public.provider_private_details from anon, authenticated;
grant select, insert, update on public.provider_private_details to authenticated;
drop policy if exists provider_private_own on public.provider_private_details;
create policy provider_private_own on public.provider_private_details
for all to authenticated
using (provider_id = (select auth.uid()))
with check (provider_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid())
  and p.account_type in ('provider', 'both') and p.status = 'active'
));
-- Alterações na identificação também exigem nova análise, sem reativar suspensos.
drop trigger if exists provider_identity_recheck on public.provider_private_details;
create trigger provider_identity_recheck
after insert or update on public.provider_private_details
for each row execute function public.provider_catalog_recheck();
commit;
