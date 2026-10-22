-- AJURA: local confirmado do pedido, privado e independente do perfil.
begin;
create table if not exists public.request_service_locations (
 request_id uuid primary key references public.service_requests(id),
 recorded_by uuid not null references public.profiles(id),
 service_mode text not null check(service_mode in ('on_site','remote')),
 district text not null check(char_length(district) between 2 and 80),
 address_line text,
 address_number text,
 address_complement text,
 address_reference text,
 confirmed_at timestamptz not null default now(),
 disclosed_at timestamptz,
 submission_key uuid,
 check((service_mode='on_site' and address_line is not null and char_length(address_line) between 3 and 160 and address_number is not null and char_length(address_number) between 1 and 20)
 or (service_mode='remote' and address_line is null and address_number is null and address_complement is null and address_reference is null)),
 check(address_complement is null or char_length(address_complement)<=100),
 check(address_reference is null or char_length(address_reference)<=300)
);
create unique index if not exists request_location_submission on public.request_service_locations(recorded_by,submission_key) where submission_key is not null;
alter table public.request_service_locations enable row level security;
revoke all on public.request_service_locations from public,anon,authenticated;

create or replace function public.confirm_request_location(target_request uuid,service_mode text,location_line text,location_number text,location_complement text,location_reference text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; mode text:=service_mode; released boolean;
begin
 select * into r from public.service_requests where id=target_request and client_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and account_type in ('client','both')) then raise exception 'Cliente ativo desse pedido necessario' using errcode='42501'; end if;
 if r.status not in ('requested','in_progress') then raise exception 'Local nao pode ser confirmado em pedido encerrado'; end if;
 if exists(select 1 from public.request_service_locations where request_id=r.id) then raise exception 'O local desse pedido ja foi confirmado e nao pode ser substituido por esta tela'; end if;
 if mode is null or mode not in ('on_site','remote') then raise exception 'Escolha atendimento no local ou remoto'; end if;
 if mode='on_site' and (char_length(btrim(coalesce(location_line,''))) not between 3 and 160 or char_length(btrim(coalesce(location_number,''))) not between 1 and 20 or char_length(btrim(coalesce(location_complement,'')))>100 or char_length(btrim(coalesce(location_reference,'')))>300) then raise exception 'Confira rua, numero, complemento e referencia'; end if;
 released:=exists(select 1 from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted');
 insert into public.request_service_locations(request_id,recorded_by,service_mode,district,address_line,address_number,address_complement,address_reference,disclosed_at)
 values(r.id,auth.uid(),mode,r.district,case when mode='on_site' then btrim(location_line) end,case when mode='on_site' then btrim(location_number) end,case when mode='on_site' then nullif(btrim(location_complement),'') end,case when mode='on_site' then nullif(btrim(location_reference),'') end,case when released then now() end);
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
 values(r.id,auth.uid(),'location_confirmed',jsonb_build_object('mode',mode),now(),'location:'||r.id);
 if released then
  insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
  values(r.id,auth.uid(),'location_disclosed',jsonb_build_object('mode',mode),now(),'location-disclosed:'||r.id);
 end if;
end;$$;

create or replace function public.create_service_request_with_location(target_service bigint,target_district text,details text,desired_date date,service_mode text,location_line text,location_number text,location_complement text,location_reference text,submission_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; old_location public.request_service_locations%rowtype; old_request public.service_requests%rowtype; mode text:=service_mode; key uuid:=submission_key;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and account_type in ('client','both')) then raise exception 'Cliente ativo necessario' using errcode='42501'; end if;
 if key is null then raise exception 'Identificador de envio necessario. Reabra a solicitacao'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ajura-location:'||auth.uid()||':'||key,0));
 select * into old_location from public.request_service_locations where recorded_by=auth.uid() and request_service_locations.submission_key=key;
 if found then
  select * into old_request from public.service_requests where id=old_location.request_id;
  if old_request.service_id is distinct from target_service or old_request.district is distinct from target_district or old_request.description is distinct from btrim(details) or old_request.preferred_date is distinct from desired_date or old_location.service_mode is distinct from mode or (mode='on_site' and (old_location.address_line is distinct from btrim(location_line) or old_location.address_number is distinct from btrim(location_number) or coalesce(old_location.address_complement,'') is distinct from btrim(coalesce(location_complement,'')) or coalesce(old_location.address_reference,'') is distinct from btrim(coalesce(location_reference,'')))) then raise exception 'Esse envio ja criou um pedido com outros dados. Confira Minhas solicitacoes antes de enviar novamente'; end if;
  return old_request.id;
 end if;
 result:=public.create_service_request(target_service,target_district,details,desired_date);
 perform public.confirm_request_location(result,mode,location_line,location_number,location_complement,location_reference);
 update public.request_service_locations set submission_key=key where request_id=result;
 return result;
end;$$;
-- A funcao anterior continua disponivel internamente ao novo RPC, sem acesso direto de clientes.
revoke all on function public.create_service_request(bigint,text,text,date) from public,anon,authenticated;

create or replace function public.request_location_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; l public.request_service_locations%rowtype; active_admin boolean; visible boolean; is_client boolean; is_provider boolean;
begin
 active_admin:=public.admin_is_current_user() and exists(select 1 from public.profiles where id=auth.uid() and status='active');
 if not public.ajura_message_participant(target_request) and not(active_admin and exists(select 1 from public.support_tickets where request_id=target_request)) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 select * into r from public.service_requests where id=target_request;
 select * into l from public.request_service_locations where request_id=r.id;
 is_client:=auth.uid()=r.client_id;
 is_provider:=auth.uid()=r.provider_id and exists(select 1 from public.provider_profiles pp join public.profiles p on p.id=pp.id where pp.id=r.provider_id and pp.approval_status='approved' and p.status='active' and p.account_type in ('provider','both'));
 visible:=is_client or (is_provider and r.status in ('requested','in_progress','completed') and l.disclosed_at is not null and exists(select 1 from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted')) or (active_admin and exists(select 1 from public.support_tickets where request_id=r.id) and l.disclosed_at is not null);
 return jsonb_build_object('confirmed',l.request_id is not null,'service_mode',l.service_mode,'district',r.district,'can_confirm',is_client and r.status in ('requested','in_progress') and l.request_id is null,
 'address',case when visible and l.service_mode='on_site' then jsonb_build_object('line',l.address_line,'number',l.address_number,'complement',l.address_complement,'reference',l.address_reference) end,
 'quote_accepted',exists(select 1 from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted'),'confirmed_at',l.confirmed_at,'disclosed_at',case when visible then l.disclosed_at end);
end;$$;

create or replace function public.ajura_quote_location_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare mode text;
begin
 if new.status='accepted' and new.status is distinct from old.status then
  select service_mode into mode from public.request_service_locations where request_id=new.request_id;
  if not found then raise exception 'Confirme o local do atendimento na conversa antes de aceitar a proposta'; end if;
  update public.request_service_locations set disclosed_at=coalesce(disclosed_at,now()) where request_id=new.request_id;
  insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
  values(new.request_id,auth.uid(),'location_disclosed',jsonb_build_object('mode',mode),now(),'location-disclosed:'||new.request_id) on conflict(source_key) do nothing;
 end if;
 return new;
end;$$;
drop trigger if exists ajura_quote_location_guard on public.request_quotes;
create trigger ajura_quote_location_guard before update of status on public.request_quotes for each row execute function public.ajura_quote_location_guard();

create or replace function public.ajura_start_location_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='in_progress' and new.status is distinct from old.status and not exists(select 1 from public.request_service_locations where request_id=new.id) then raise exception 'Cliente precisa confirmar o local na conversa antes de iniciar'; end if;
 return new;
end;$$;
drop trigger if exists ajura_start_location_guard on public.service_requests;
create trigger ajura_start_location_guard before update of status on public.service_requests for each row execute function public.ajura_start_location_guard();
create or replace function public.service_execution_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; q uuid; ph text; c public.service_confirmation_codes%rowtype;
begin
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 select * into r from public.service_requests where id=target_request;
 select id into q from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted';
 ph:=case when r.status='requested' and q is not null and exists(select 1 from public.request_service_locations where request_id=r.id) then 'start' when r.status='in_progress' then 'finish' else null end;
 select * into c from public.service_confirmation_codes where request_id=r.id and service_confirmation_codes.phase=ph;
 return jsonb_build_object('location_confirmed',exists(select 1 from public.request_service_locations where request_id=r.id),'status',r.status,'phase',ph,'started_at',r.started_at,'completed_at',r.completed_at,'expires_at',c.expires_at,'locked_until',c.locked_until,'can_issue_at',c.issued_at+interval '60 seconds','has_code',c.request_id is not null and c.consumed_at is null and c.expires_at>now());
end;$$;

revoke all on function public.ajura_quote_location_guard(),public.ajura_start_location_guard() from public,anon,authenticated;
revoke all on function public.confirm_request_location(uuid,text,text,text,text,text),public.create_service_request_with_location(bigint,text,text,date,text,text,text,text,text,uuid),public.request_location_context(uuid) from public,anon;
grant execute on function public.confirm_request_location(uuid,text,text,text,text,text),public.create_service_request_with_location(bigint,text,text,date,text,text,text,text,text,uuid),public.request_location_context(uuid) to authenticated;
commit;
