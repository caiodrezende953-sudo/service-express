-- AJURA: anexos privados da solicitação. Não cria cobrança nem altera pedidos existentes.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('request-attachments','request-attachments',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create table if not exists public.request_files (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.service_requests(id),
 uploader_id uuid not null references public.profiles(id),
 object_path text not null unique,
 original_name text not null check(char_length(original_name) between 1 and 200),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')),
 file_size bigint not null check(file_size between 1 and 5242880),
 created_at timestamptz not null default now(),
 check(split_part(object_path,'/',1)=uploader_id::text and split_part(object_path,'/',2)=request_id::text)
);
create index if not exists request_files_request_idx on public.request_files(request_id);
alter table public.request_files enable row level security;
revoke all on public.request_files from anon,authenticated;
grant select on public.request_files to authenticated;

create or replace function public.ajura_request_file_access(target_request uuid, writing boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.service_requests r join public.profiles a on a.id=auth.uid()
 where r.id=target_request and a.status='active'
 and ((writing and r.client_id=auth.uid() and r.status='requested' and a.account_type in ('client','both'))
 or (not writing and auth.uid() in (r.client_id,r.provider_id)))
 and (auth.uid()<>r.provider_id or exists(select 1 from public.provider_profiles p where p.id=r.provider_id and p.approval_status='approved')));
$$;
revoke all on function public.ajura_request_file_access(uuid,boolean) from public,anon;
grant execute on function public.ajura_request_file_access(uuid,boolean) to authenticated;
drop policy if exists request_files_participants on public.request_files;
create policy request_files_participants on public.request_files for select to authenticated
 using(public.ajura_request_file_access(request_id,false));

drop policy if exists ajura_request_upload on storage.objects;
create policy ajura_request_upload on storage.objects for insert to authenticated with check(
 bucket_id='request-attachments' and split_part(name,'/',1)=auth.uid()::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf)$'
 and exists(select 1 from public.service_requests r where r.id::text=split_part(name,'/',2)
 and public.ajura_request_file_access(r.id,true)
 and (select count(*) from public.request_files f where f.request_id=r.id)<5));
drop policy if exists ajura_request_download on storage.objects;
create policy ajura_request_download on storage.objects for select to authenticated using(
 bucket_id='request-attachments' and exists(select 1 from public.request_files f
 where f.object_path=name and public.ajura_request_file_access(f.request_id,false)));
-- SELECT também é necessário para limpar upload que não chegou a ser registrado.
drop policy if exists ajura_request_orphan_read on storage.objects;
create policy ajura_request_orphan_read on storage.objects for select to authenticated using(
 bucket_id='request-attachments' and split_part(name,'/',1)=auth.uid()::text
 and not exists(select 1 from public.request_files f where f.object_path=name));
drop policy if exists ajura_request_cleanup on storage.objects;
create policy ajura_request_cleanup on storage.objects for delete to authenticated using(
 bucket_id='request-attachments' and split_part(name,'/',1)=auth.uid()::text
 and not exists(select 1 from public.request_files f where f.object_path=name));

create or replace function public.register_request_file(target_request uuid, uploaded_path text, uploaded_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare obj storage.objects%rowtype; existing uuid; result_id uuid; size_bytes bigint; mime text;
begin
 perform 1 from public.service_requests where id=target_request for update;
 if not found or not public.ajura_request_file_access(target_request,true) then raise exception 'Solicitação indisponível para anexos' using errcode='42501'; end if;
 if split_part(uploaded_path,'/',1)<>auth.uid()::text or split_part(uploaded_path,'/',2)<>target_request::text then raise exception 'Caminho de arquivo inválido'; end if;
 select id into existing from public.request_files where object_path=uploaded_path;
 if existing is not null then return existing; end if;
 if (select count(*) from public.request_files where request_id=target_request)>=5 then raise exception 'Limite de cinco anexos por solicitação'; end if;
 select * into obj from storage.objects where bucket_id='request-attachments' and name=uploaded_path;
 if not found then raise exception 'Upload não encontrado'; end if;
 mime := obj.metadata->>'mimetype';
 if coalesce(obj.metadata->>'size','') !~ '^[0-9]{1,10}$' then raise exception 'Tamanho de arquivo indisponível'; end if;
 size_bytes := (obj.metadata->>'size')::bigint;
 if size_bytes not between 1 and 5242880 or mime not in ('image/jpeg','image/png','application/pdf') or mime is null then raise exception 'Tipo ou tamanho não permitido'; end if;
 insert into public.request_files(request_id,uploader_id,object_path,original_name,mime_type,file_size)
 values(target_request,auth.uid(),uploaded_path,btrim(uploaded_name),mime,size_bytes) returning id into result_id;
 return result_id;
end;
$$;
revoke all on function public.register_request_file(uuid,text,text) from public,anon;
grant execute on function public.register_request_file(uuid,text,text) to authenticated;
commit;
