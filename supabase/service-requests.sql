-- AJURA: solicitações e conversa. Sem contratação ou pagamento nesta migração.
begin;
create table if not exists public.service_requests (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.provider_profiles(id),
 service_id bigint not null references public.provider_services(id),
 district text not null check (char_length(district) between 2 and 80),
 description text not null check (char_length(description) between 10 and 2000),
 preferred_date date not null,
 status text not null default 'requested' check (status in ('requested','declined','cancelled')),
 created_at timestamptz not null default now(),
 check (client_id <> provider_id)
);
create table if not exists public.request_messages (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.service_requests(id),
 sender_id uuid not null references public.profiles(id),
 body text not null check (char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
alter table public.service_requests enable row level security;
alter table public.request_messages enable row level security;
revoke all on public.service_requests, public.request_messages from anon, authenticated;
grant select on public.service_requests, public.request_messages to authenticated;
drop policy if exists request_participants_read on public.service_requests;
create policy request_participants_read on public.service_requests for select to authenticated
using ((select auth.uid()) in (client_id, provider_id));
drop policy if exists message_participants_read on public.request_messages;
create policy message_participants_read on public.request_messages for select to authenticated
using (exists (select 1 from public.service_requests r where r.id = request_id
 and (select auth.uid()) in (r.client_id, r.provider_id)));

create or replace function public.create_service_request(target_service bigint, target_district text, details text, desired_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target_provider uuid; request_uuid uuid;
begin
 if actor is null or not exists (select 1 from public.profiles p where p.id = actor and p.status = 'active' and p.account_type in ('client','both')) then
  raise exception 'Conta de cliente ativa necessária'; end if;
 select s.provider_id into target_provider from public.provider_services s
 join public.provider_profiles p on p.id = s.provider_id
 join public.profiles a on a.id = p.id
 where s.id = target_service and s.active and p.approval_status = 'approved'
 and a.status = 'active';
 if target_provider is null or target_provider = actor then raise exception 'Serviço indisponível'; end if;
 if not exists (select 1 from public.provider_service_areas a where a.provider_id = target_provider and a.district = target_district) then
  raise exception 'Prestador não atende esse bairro'; end if;
 if desired_date is null or desired_date < (now() at time zone 'America/Manaus')::date then raise exception 'Escolha uma data atual ou futura'; end if;
 insert into public.service_requests (client_id,provider_id,service_id,district,description,preferred_date)
 values (actor,target_provider,target_service,target_district,btrim(details),desired_date) returning id into request_uuid;
 return request_uuid;
end; $$;
create or replace function public.send_request_message(target_request uuid, message_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
 if actor is null or not exists (select 1 from public.profiles p where p.id = actor and p.status = 'active') then raise exception 'Conta ativa necessária'; end if;
 perform 1 from public.service_requests r where r.id = target_request
 and actor in (r.client_id,r.provider_id) and r.status = 'requested' for update;
 if not found then raise exception 'Conversa indisponível'; end if;
 insert into public.request_messages (request_id,sender_id,body) values (target_request,actor,btrim(message_text));
end; $$;
create or replace function public.close_service_request(target_request uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active') then raise exception 'Conta ativa necessária'; end if;
 update public.service_requests set status = decision where id = target_request and status = 'requested'
 and ((decision = 'cancelled' and client_id = auth.uid()) or (decision = 'declined' and provider_id = auth.uid()));
 if not found then raise exception 'Alteração não permitida'; end if;
end; $$;
revoke all on function public.create_service_request(bigint,text,text,date), public.send_request_message(uuid,text), public.close_service_request(uuid,text) from public, anon;
grant execute on function public.create_service_request(bigint,text,text,date), public.send_request_message(uuid,text), public.close_service_request(uuid,text) to authenticated;
commit;
