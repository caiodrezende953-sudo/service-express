-- AJURA: conversas compactas, leitura e encaminhamento somente à Central.
begin;
-- AJURA: anexos privados da solicitação. Não cria cobrança nem altera pedidos existentes.
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

-- Módulo de mensagens e Central
create table if not exists public.request_read_receipts (
 request_id uuid references public.service_requests(id) not null,
 user_id uuid references public.profiles(id) not null,
 message_id bigint not null default 0, support_message_id bigint not null default 0,
 updated_at timestamptz not null default now(), primary key(request_id,user_id)
);
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.service_requests(id),
 opened_by uuid not null references public.profiles(id), reason text not null check(length(trim(reason)) between 10 and 1000),
 status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references public.profiles(id)
);
create unique index if not exists support_one_open_request on public.support_tickets(request_id) where status='open';
create table if not exists public.support_messages (
 id bigint generated always as identity primary key, ticket_id uuid not null references public.support_tickets(id),
 sender_id uuid not null references public.profiles(id), sender_role text not null check(sender_role in ('participant','central')),
 body text not null check(length(trim(body)) between 1 and 2000), created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id,id);
create index if not exists request_messages_unread_idx on public.request_messages(request_id,id);
alter table public.request_read_receipts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.request_read_receipts,public.support_tickets,public.support_messages from anon,authenticated;
-- Todo acesso às tabelas novas é por funções autorizadas, sem escritas diretas.
create or replace function public.ajura_message_participant(target_request uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.service_requests r join public.profiles p on p.id=auth.uid()
 where r.id=target_request and auth.uid() in(r.client_id,r.provider_id) and p.status='active');
$$;
create or replace function public.messaging_inbox(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Conta ativa necessária' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>500 then raise exception 'Página inválida'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
 select r.id,r.district,r.status,r.description,r.preferred_date,
 case when r.client_id=auth.uid() then pp.display_name else p.full_name end as partner,
 coalesce((select body from public.request_messages m where m.request_id=r.id order by id desc limit 1),r.description) as preview,
 (select count(*) from public.request_messages m where m.request_id=r.id and m.sender_id<>auth.uid() and m.id>coalesce(rr.message_id,0))+
 (select count(*) from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.request_id=r.id and m.sender_id<>auth.uid() and m.id>coalesce(rr.support_message_id,0)) as unread,
 greatest(r.created_at,coalesce((select max(created_at) from public.request_messages where request_id=r.id),r.created_at),
 coalesce((select max(m.created_at) from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.request_id=r.id),r.created_at)) as activity
 from public.service_requests r join public.profiles p on p.id=r.client_id join public.provider_profiles pp on pp.id=r.provider_id
 left join public.request_read_receipts rr on rr.request_id=r.id and rr.user_id=auth.uid()
 where auth.uid() in(r.client_id,r.provider_id) order by activity desc,r.id desc limit 20 offset page_number*20
 )x;
 return result;
end; $$;
create or replace function public.messaging_unread_count()
returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from (
 select m.id from public.request_messages m join public.service_requests r on r.id=m.request_id
 left join public.request_read_receipts rr on rr.request_id=r.id and rr.user_id=auth.uid()
 where public.ajura_message_participant(r.id) and m.sender_id<>auth.uid() and m.id>coalesce(rr.message_id,0)
 union all
 select m.id from public.support_messages m join public.support_tickets t on t.id=m.ticket_id
 left join public.request_read_receipts rr on rr.request_id=t.request_id and rr.user_id=auth.uid()
 where public.ajura_message_participant(t.request_id) and m.sender_id<>auth.uid() and m.id>coalesce(rr.support_message_id,0)
 ) unread;
$$;
create or replace function public.messaging_mark_read(target_request uuid, through_message bigint, through_support bigint default 0)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if through_message is null or through_support is null or through_message<0 or through_support<0 then raise exception 'Leitura inválida'; end if;
 if through_message>0 and not exists(select 1 from public.request_messages where id=through_message and request_id=target_request) then raise exception 'Mensagem inválida'; end if;
 if through_support>0 and not exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where m.id=through_support and t.request_id=target_request) then raise exception 'Mensagem da Central inválida'; end if;
 insert into public.request_read_receipts(request_id,user_id,message_id,support_message_id) values(target_request,auth.uid(),through_message,through_support)
 on conflict(request_id,user_id) do update set message_id=greatest(public.request_read_receipts.message_id,excluded.message_id),
 support_message_id=greatest(public.request_read_receipts.support_message_id,excluded.support_message_id),updated_at=now();
end; $$;
create or replace function public.open_support_ticket(target_request uuid, explanation text)
returns uuid language plpgsql security definer set search_path='' as $$
declare ticket uuid;
begin
 perform 1 from public.service_requests where id=target_request for update;
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if explanation is null or length(trim(explanation)) not between 10 and 1000 then raise exception 'Explique em 10 a 1000 caracteres'; end if;
 select id into ticket from public.support_tickets where request_id=target_request and status='open';
 if ticket is not null then return ticket; end if;
 insert into public.support_tickets(request_id,opened_by,reason) values(target_request,auth.uid(),trim(explanation)) returning id into ticket;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(ticket,auth.uid(),'participant',trim(explanation));
 return ticket;
end; $$;
create or replace function public.support_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ajura_message_participant(target_request) and not (
 public.admin_is_current_user() and exists(select 1 from public.profiles where id=auth.uid() and status='active')
 and exists(select 1 from public.support_tickets where request_id=target_request)) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 return jsonb_build_object('request',(select jsonb_build_object('id',id,'client_id',client_id,'provider_id',provider_id,'district',district,'status',status,'description',description,'preferred_date',preferred_date) from public.service_requests where id=target_request),
 'tickets',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.support_tickets t where request_id=target_request),'[]'::jsonb),
 'messages',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from(select m.* from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.request_id=target_request order by m.id desc limit 200)x),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from(select id,sender_id,body,created_at from public.request_messages where request_id=target_request order by id desc limit 200)x),'[]'::jsonb));
end; $$;
create or replace function public.send_support_message(target_ticket uuid,message_text text)
returns void language plpgsql security definer set search_path='' as $$
declare request_uuid uuid; is_admin boolean;
begin
 select request_id into request_uuid from public.support_tickets where id=target_ticket and status='open' for update;
 if not found then raise exception 'Atendimento encerrado ou indisponível'; end if;
 is_admin := public.admin_is_current_user() and exists(select 1 from public.profiles where id=auth.uid() and status='active');
 if not is_admin and not public.ajura_message_participant(request_uuid) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if message_text is null or length(trim(message_text)) not between 1 and 2000 then raise exception 'Mensagem inválida'; end if;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(target_ticket,auth.uid(),case when is_admin then 'central' else 'participant' end,trim(message_text));
end; $$;
create or replace function public.admin_support_queue(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if page_number is null or page_number<0 or page_number>500 then raise exception 'Página inválida'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x)) from(select t.id,t.request_id,t.reason,t.created_at,r.district from public.support_tickets t join public.service_requests r on r.id=t.request_id where t.status='open' order by t.created_at,t.id limit 20 offset page_number*20)x),'[]'::jsonb);
end; $$;
create or replace function public.resolve_support_ticket(target_ticket uuid,resolution text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessário' using errcode='42501'; end if;
 if resolution is null or length(trim(resolution)) not between 10 and 2000 then raise exception 'Informe a resolução em 10 a 2000 caracteres'; end if;
 perform 1 from public.support_tickets where id=target_ticket and status='open' for update;
 if not found then raise exception 'Atendimento já encerrado'; end if;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(target_ticket,auth.uid(),'central',trim(resolution));
 update public.support_tickets set status='resolved',resolved_at=now(),resolved_by=auth.uid() where id=target_ticket;
end; $$;
-- Revogação explícita do acesso PUBLIC padrão das funções.
revoke all on function public.ajura_message_participant(uuid),public.messaging_inbox(integer),public.messaging_unread_count(),public.messaging_mark_read(uuid,bigint,bigint),public.open_support_ticket(uuid,text),public.support_context(uuid),public.send_support_message(uuid,text),public.admin_support_queue(integer),public.resolve_support_ticket(uuid,text) from public,anon;
grant execute on function public.ajura_message_participant(uuid),public.messaging_inbox(integer),public.messaging_unread_count(),public.messaging_mark_read(uuid,bigint,bigint),public.open_support_ticket(uuid,text),public.support_context(uuid),public.send_support_message(uuid,text),public.admin_support_queue(integer),public.resolve_support_ticket(uuid,text) to authenticated;
commit;
