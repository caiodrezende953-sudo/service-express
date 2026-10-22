alter policy ajura_request_upload on storage.objects with check (
 bucket_id='request-attachments' and split_part(name,'/',1)=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|pdf)$'
 and exists(select 1 from public.service_requests r where r.id::text=split_part(storage.objects.name,'/',2)
 and public.ajura_request_file_access(r.id,true)
 and (select count(*) from public.request_files f where f.request_id=r.id)<5));
drop policy if exists ajura_active_file_account on storage.objects;
create policy ajura_active_file_account on storage.objects as restrictive for all to authenticated
using (bucket_id not in ('provider-verification','request-attachments')
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'))
with check (bucket_id not in ('provider-verification','request-attachments')
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'));
drop policy if exists ajura_active_provider_files on public.provider_files;
create policy ajura_active_provider_files on public.provider_files as restrictive for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'));
drop policy if exists ajura_active_private_details on public.provider_private_details;
create policy ajura_active_private_details on public.provider_private_details as restrictive for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'));
