-- AJURA: resumo e histórico. Requer request-quotes.sql e messaging-support.sql.
-- Não altera estados existentes, não cobra e não libera endereço.
begin;
create table if not exists public.request_events (
 id bigint generated always as identity primary key,
 request_id uuid not null references public.service_requests(id),
 actor_id uuid references public.profiles(id), event_type text not null,
 payload jsonb not null default '{}'::jsonb, occurred_at timestamptz not null,
 source_key text not null unique, recorded_at timestamptz not null default now()
);
create index if not exists request_events_timeline_idx on public.request_events(request_id,occurred_at,id);
alter table public.request_events enable row level security;
revoke all on public.request_events from anon,authenticated;

create or replace function public.ajura_record_request_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind text; target uuid; details jsonb; event_time timestamptz; key text;
begin
 if tg_table_name='service_requests' then
  target:=new.id;
  if tg_op='INSERT' then kind:='request_created';event_time:=new.created_at;key:='request:'||new.id||':created';details:=jsonb_build_object('status',new.status);
  elsif new.status is distinct from old.status then kind:='request_status';event_time:=clock_timestamp();key:='request:'||new.id||':status:'||gen_random_uuid();details:=jsonb_build_object('previous',old.status,'status',new.status);
  else return new; end if;
 elsif tg_table_name='request_quotes' then
  target:=new.request_id;details:=jsonb_build_object('quote_id',new.id,'amount',new.amount,'scope',new.scope,'materials',new.materials,'scheduled_date',new.scheduled_date,'status',new.status);
  if tg_op='INSERT' then kind:='quote_created';event_time:=new.created_at;key:='quote:'||new.id||':created';
  elsif new.status is distinct from old.status then kind:='quote_status';event_time:=coalesce(new.responded_at,clock_timestamp());key:='quote:'||new.id||':'||new.status||':'||coalesce(extract(epoch from new.responded_at)::text,'legacy');
  else return new; end if;
 elsif tg_table_name='support_tickets' then
  target:=new.request_id;details:=jsonb_build_object('ticket_id',new.id);
  if tg_op='INSERT' then kind:='support_opened';event_time:=new.created_at;key:='support:'||new.id||':open';
  elsif new.status='resolved' and new.status is distinct from old.status then kind:='support_resolved';event_time:=coalesce(new.resolved_at,clock_timestamp());key:='support:'||new.id||':resolved';
  else return new; end if;
 elsif tg_table_name='request_files' then
  target:=new.request_id;kind:='file_added';event_time:=new.created_at;key:='file:'||new.id;details:=jsonb_build_object('file_id',new.id);
 else raise exception 'Origem de histórico inválida'; end if;
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
 values(target,auth.uid(),kind,details,event_time,key) on conflict(source_key) do nothing;
 return new;
end; $$;
revoke all on function public.ajura_record_request_event() from public,anon,authenticated;
-- O lock evita escrita concorrente durante a ativação/backfill e é liberado no commit.
lock table public.service_requests,public.request_quotes,public.support_tickets,public.request_files in share row exclusive mode;
drop trigger if exists ajura_request_history on public.service_requests;
create trigger ajura_request_history after insert or update of status on public.service_requests for each row execute function public.ajura_record_request_event();
drop trigger if exists ajura_quote_history on public.request_quotes;
create trigger ajura_quote_history after insert or update of status on public.request_quotes for each row execute function public.ajura_record_request_event();
drop trigger if exists ajura_support_history on public.support_tickets;
create trigger ajura_support_history after insert or update of status on public.support_tickets for each row execute function public.ajura_record_request_event();
drop trigger if exists ajura_file_history on public.request_files;
create trigger ajura_file_history after insert on public.request_files for each row execute function public.ajura_record_request_event();
-- Recupera somente acontecimentos com data conhecida; não inventa data antiga de cancelamento.
insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
select id,client_id,'request_created',jsonb_build_object('status','requested'),created_at,'request:'||id||':created' from public.service_requests on conflict(source_key) do nothing;
insert into public.request_events(request_id,event_type,payload,occurred_at,source_key)
select r.id,'state_observed',jsonb_build_object('status',r.status,'legacy',true),now(),'request:'||r.id||':observed'
from public.service_requests r where r.status<>'requested'
 and not exists(select 1 from public.request_events e where e.request_id=r.id and e.event_type='request_status') on conflict(source_key) do nothing;
insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
select request_id,provider_id,'quote_created',jsonb_build_object('quote_id',id,'amount',amount,'scope',scope,'materials',materials,'scheduled_date',scheduled_date,'status','pending'),created_at,'quote:'||id||':created'
from public.request_quotes on conflict(source_key) do nothing;
insert into public.request_events(request_id,event_type,payload,occurred_at,source_key)
select request_id,'quote_status',jsonb_build_object('quote_id',id,'amount',amount,'scope',scope,'materials',materials,'scheduled_date',scheduled_date,'status',status,'legacy_unknown_time',responded_at is null),coalesce(responded_at,now()),'quote:'||id||':'||status||':'||coalesce(extract(epoch from responded_at)::text,'legacy')
from public.request_quotes where status<>'pending' on conflict(source_key) do nothing;
insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
select request_id,opened_by,'support_opened',jsonb_build_object('ticket_id',id),created_at,'support:'||id||':open' from public.support_tickets on conflict(source_key) do nothing;
insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
select request_id,resolved_by,'support_resolved',jsonb_build_object('ticket_id',id,'legacy_unknown_time',resolved_at is null),coalesce(resolved_at,now()),'support:'||id||':resolved'
from public.support_tickets where status='resolved' on conflict(source_key) do nothing;
insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
select request_id,uploader_id,'file_added',jsonb_build_object('file_id',id),created_at,'file:'||id from public.request_files on conflict(source_key) do nothing;

create or replace function public.request_overview(target_request uuid,page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare snapshot jsonb; timeline jsonb; total bigint; request_data jsonb;
begin
 if page_number is null or page_number<0 or page_number>500 then raise exception 'Página inválida'; end if;
 if not public.ajura_message_participant(target_request) and not (
 public.admin_is_current_user() and exists(select 1 from public.profiles where id=auth.uid() and status='active')
 and exists(select 1 from public.support_tickets where request_id=target_request)) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 select jsonb_build_object('id',id,'status',status,'district',district,'preferred_date',preferred_date) into request_data from public.service_requests where id=target_request;
 select e.payload||jsonb_build_object('accepted_at',e.occurred_at) into snapshot from public.request_events e join public.request_quotes q on q.id::text=e.payload->>'quote_id' and q.request_id=e.request_id
 where e.request_id=target_request and e.event_type='quote_status' and e.payload->>'status'='accepted' and q.status='accepted' order by e.occurred_at desc,e.id desc limit 1;
 select count(*) into total from public.request_events where request_id=target_request;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc,x.id desc),'[]'::jsonb) into timeline from (
 select id,event_type,payload,occurred_at from public.request_events where request_id=target_request order by occurred_at desc,id desc limit 20 offset page_number*20)x;
 return jsonb_build_object('request',request_data,'accepted_quote',snapshot,'events',timeline,'total',total,'page',page_number);
end; $$;
revoke all on function public.request_overview(uuid,integer) from public,anon;
grant execute on function public.request_overview(uuid,integer) to authenticated;
commit;
