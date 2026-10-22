-- Reagendamento antes do início: prestador propõe e cliente confirma.
create table if not exists public.request_schedule_proposals (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.service_requests(id),
 original_quote_id uuid not null references public.request_quotes(id),new_quote_id uuid references public.request_quotes(id),
 provider_id uuid not null references public.provider_profiles(id),proposed_date date not null,
 reason text not null check(char_length(btrim(reason)) between 10 and 1000),
 status text not null default 'pending' check(status in('pending','accepted','rejected','superseded')),
 created_at timestamptz not null default now(),responded_at timestamptz
);
create unique index if not exists request_schedule_one_pending on public.request_schedule_proposals(request_id) where status='pending';
create index if not exists request_schedule_history on public.request_schedule_proposals(request_id,created_at desc,id desc);
create index if not exists request_schedule_original_quote_fk on public.request_schedule_proposals(original_quote_id);
create index if not exists request_schedule_new_quote_fk on public.request_schedule_proposals(new_quote_id);
create index if not exists request_schedule_provider_fk on public.request_schedule_proposals(provider_id);
alter table public.request_schedule_proposals enable row level security;
revoke all on public.request_schedule_proposals from public,anon,authenticated;

create or replace function public.propose_request_schedule(target_request uuid,new_date date,schedule_reason text,submission_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();r public.service_requests%rowtype;q public.request_quotes%rowtype;payload jsonb;response jsonb;result_id uuid;note text:=btrim(schedule_reason);
begin
 select * into r from public.service_requests where id=target_request and provider_id=actor for update;
 if not found or not exists(select 1 from public.profiles p join public.provider_profiles pp on pp.id=p.id where p.id=actor and p.status='active' and p.account_type in('provider','both') and pp.approval_status='approved') then raise exception 'Prestador aprovado desse pedido necessário' using errcode='42501';end if;
 if new_date is null or note is null or char_length(note) not between 10 and 1000 then raise exception 'Informe nova data e motivo de 10 a 1000 caracteres' using errcode='23514';end if;
 payload:=jsonb_build_object('request',r.id,'date',new_date,'reason',note);response:=ajura_internal.check_write_attempt('schedule',submission_key,payload);if response is not null then return (response->>'id')::uuid;end if;
 if r.status<>'requested' then raise exception 'Reagendamento disponível somente antes do início';end if;
 if new_date<(now() at time zone 'America/Manaus')::date then raise exception 'Escolha uma data atual ou futura';end if;
 if not exists(select 1 from public.provider_services s where s.id=r.service_id and public.ajura_activity_allowed(s.provider_id,s.category,s.subcategory)) then raise exception 'Habilitação do serviço indisponível' using errcode='42501';end if;
 select * into q from public.request_quotes where request_id=r.id and status='accepted' for update;
 if not found then raise exception 'Aceite de uma proposta necessário antes de reagendar';end if;
 if q.scheduled_date=new_date then raise exception 'Esta já é a data combinada';end if;
 if exists(select 1 from public.payment_test_intents where request_id=r.id and status not in('prepared','cancelled','rejected','refunded')) then raise exception 'Há um pagamento em análise. Procure a Central antes de reagendar';end if;
 select id into result_id from public.request_schedule_proposals where request_id=r.id and status='pending' and proposed_date=new_date and reason=note and original_quote_id=q.id;
 if result_id is null then
  update public.request_schedule_proposals set status='superseded',responded_at=now() where request_id=r.id and status='pending';
  insert into public.request_schedule_proposals(request_id,original_quote_id,provider_id,proposed_date,reason) values(r.id,q.id,actor,new_date,note) returning id into result_id;
  insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key) values(r.id,actor,'schedule_proposed',jsonb_build_object('schedule_id',result_id,'previous_date',q.scheduled_date,'proposed_date',new_date),now(),'schedule:'||result_id);
 end if;
 perform ajura_internal.remember_write_attempt('schedule',submission_key,payload,jsonb_build_object('id',result_id));return result_id;
end; $$;
create or replace function public.respond_request_schedule(target_schedule uuid,decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype;s public.request_schedule_proposals%rowtype;q public.request_quotes%rowtype;request_uuid uuid;new_id uuid;
begin
 if decision is null or decision not in('accepted','rejected') then raise exception 'Decisão inválida';end if;
 select request_id into request_uuid from public.request_schedule_proposals where id=target_schedule;
 select * into r from public.service_requests where id=request_uuid and client_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and account_type in('client','both')) then raise exception 'Cliente desse pedido necessário' using errcode='42501';end if;
 select * into s from public.request_schedule_proposals where id=target_schedule for update;
 if s.status=decision then return jsonb_build_object('status',s.status,'quote_id',s.new_quote_id);end if;
 if r.status<>'requested' or s.status<>'pending' then raise exception 'O pedido ou reagendamento mudou. Atualize a conversa';end if;
 select * into q from public.request_quotes where id=s.original_quote_id and request_id=r.id and status='accepted' for update;
 if not found then raise exception 'O combinado original mudou. Solicite outra proposta';end if;
 if decision='accepted' then
  if s.proposed_date<(now() at time zone 'America/Manaus')::date then raise exception 'A nova data já passou. Peça outra data';end if;
  if not exists(select 1 from public.provider_profiles pp join public.profiles p on p.id=pp.id join public.provider_services srv on srv.id=r.service_id where pp.id=r.provider_id and pp.approval_status='approved' and p.status='active' and public.ajura_activity_allowed(srv.provider_id,srv.category,srv.subcategory)) then raise exception 'Prestador ou habilitação indisponível' using errcode='42501';end if;
  if exists(select 1 from public.payment_test_intents where request_id=r.id and status not in('prepared','cancelled','rejected','refunded')) then raise exception 'Há um pagamento em análise. Procure a Central';end if;
  update public.request_quotes set status='superseded',responded_at=now() where id=q.id;
  insert into public.request_quotes(request_id,provider_id,amount,scope,materials,scheduled_date) values(r.id,q.provider_id,q.amount,q.scope,q.materials,s.proposed_date) returning id into new_id;
  update public.request_quotes set status='accepted',responded_at=now() where id=new_id;
  update public.service_confirmation_codes set consumed_at=coalesce(consumed_at,now()),expires_at=least(expires_at,now()) where request_id=r.id;
  update public.payment_test_intents set status='cancelled',updated_at=now() where quote_id=q.id and status='prepared';
 end if;
 update public.request_schedule_proposals set status=decision,new_quote_id=new_id,responded_at=now() where id=s.id;
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key) values(r.id,auth.uid(),'schedule_responded',jsonb_build_object('schedule_id',s.id,'decision',decision,'proposed_date',s.proposed_date,'new_quote_id',new_id),now(),'schedule-response:'||s.id);
 return jsonb_build_object('status',decision,'quote_id',new_id);
end; $$;
create or replace function public.request_schedule_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype;q public.request_quotes%rowtype;
begin
 if not public.ajura_message_participant(target_request) and not(public.admin_is_current_user() and exists(select 1 from public.support_tickets where request_id=target_request)) then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 select * into r from public.service_requests where id=target_request;
 select * into q from public.request_quotes where request_id=r.id and status='accepted';
 return jsonb_build_object('can_propose',r.provider_id=auth.uid() and r.status='requested' and q.id is not null,'current_date',q.scheduled_date,
 'pending',(select to_jsonb(x) from(select id,proposed_date,reason from public.request_schedule_proposals where request_id=r.id and status='pending')x),
 'history',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from(select id,proposed_date,reason,status,created_at,responded_at from public.request_schedule_proposals where request_id=r.id order by created_at desc,id desc limit 20)x),'[]'::jsonb));
end; $$;
revoke all on function public.propose_request_schedule(uuid,date,text,uuid),public.respond_request_schedule(uuid,text),public.request_schedule_context(uuid) from public,anon;
grant execute on function public.propose_request_schedule(uuid,date,text,uuid),public.respond_request_schedule(uuid,text),public.request_schedule_context(uuid) to authenticated;

create or replace function ajura_internal.close_obsolete_schedule()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>'requested' and new.status is distinct from old.status then
  update public.request_schedule_proposals set status='superseded',responded_at=now() where request_id=new.id and status='pending';
 end if;return new;
end; $$;
revoke all on function ajura_internal.close_obsolete_schedule() from public,anon,authenticated;
drop trigger if exists ajura_close_obsolete_schedule on public.service_requests;
create trigger ajura_close_obsolete_schedule after update of status on public.service_requests for each row execute function ajura_internal.close_obsolete_schedule();
