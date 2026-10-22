-- Etapa 3: arquivos privados. Requer provider-onboarding.sql e admin-review.sql.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-verification', 'provider-verification', false, 5242880,
 array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
 allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.provider_files (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references public.provider_profiles(id) on delete cascade,
 kind text not null check (kind in ('identity','portfolio')),
 object_path text not null unique,
 original_name text not null check (char_length(original_name) between 1 and 200),
 created_at timestamptz not null default now(),
 check (split_part(object_path, '/', 1) = provider_id::text)
);
alter table public.provider_files enable row level security;
revoke all on public.provider_files from anon, authenticated;
grant select, insert on public.provider_files to authenticated;
drop policy if exists provider_files_read on public.provider_files;
create policy provider_files_read on public.provider_files for select to authenticated
using (provider_id = (select auth.uid()) or public.admin_is_current_user());
drop policy if exists provider_files_insert on public.provider_files;
create policy provider_files_insert on public.provider_files for insert to authenticated
with check (provider_id = (select auth.uid()) and exists (
 select 1 from public.provider_profiles p join public.profiles a on a.id = p.id
 where p.id = (select auth.uid()) and a.account_type in ('provider','both')
 and a.status = 'active' and p.approval_status <> 'suspended'
) and exists (select 1 from storage.objects o
 where o.bucket_id = 'provider-verification' and o.name = object_path));
drop trigger if exists provider_file_recheck on public.provider_files;
create trigger provider_file_recheck after insert on public.provider_files
for each row execute function public.provider_catalog_recheck();

drop policy if exists ajura_verification_read on storage.objects;
create policy ajura_verification_read on storage.objects for select to authenticated
using (bucket_id = 'provider-verification' and
 ((storage.foldername(name))[1] = (select auth.uid())::text or public.admin_is_current_user()));
drop policy if exists ajura_verification_insert on storage.objects;
create policy ajura_verification_insert on storage.objects for insert to authenticated
with check (bucket_id = 'provider-verification' and
 (storage.foldername(name))[1] = (select auth.uid())::text and exists (
 select 1 from public.provider_profiles p join public.profiles a on a.id = p.id
 where p.id = (select auth.uid()) and a.account_type in ('provider','both')
 and a.status = 'active' and p.approval_status <> 'suspended'));
-- Permite remover somente uploads próprios que falharam antes do registro.
drop policy if exists ajura_verification_cleanup on storage.objects;
create policy ajura_verification_cleanup on storage.objects for delete to authenticated
using (bucket_id = 'provider-verification' and
 (storage.foldername(name))[1] = (select auth.uid())::text and not exists (
 select 1 from public.provider_files f where f.object_path = name));
-- Identificação acessível ao administrador, sem exposição pública.
drop policy if exists provider_private_admin_read on public.provider_private_details;
create policy provider_private_admin_read on public.provider_private_details
for select to authenticated using (public.admin_is_current_user());
commit;
