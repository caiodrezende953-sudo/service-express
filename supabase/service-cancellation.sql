-- AJURA: cancelamento durante execucao, com analise da Central. Sem operacao financeira.
begin;
create table if not exists public.service_cancellation_requests (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.service_requests(id),
 ticket_id uuid not null references public.support_tickets(id),
 requested_by uuid not null references public.profiles(id),
 reason text not null check(char_length(reason) between 10 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','superseded')),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 decided_by uuid references public.profiles(id),
 decision_reason text check(decision_reason is null or char_length(decision_reason) between 10 and 2000)
);
create unique index if not exists service_cancellation_one_pending on public.service_cancellation_requests(request_id) where status='pending';
create index if not exists service_cancellation_history on public.service_cancellation_requests(request_id,created_at,id);
alter table public.service_cancellation_requests enable row level security;
revoke all on public.service_cancellation_requests from public,anon,authenticated;

create or replace function public.service_cancellation_context(target_request uuid,page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; active_admin boolean; result jsonb;
begin
 active_admin:=public.admin_is_current_user() and exists(select 1 from public.profiles where id=auth.uid() and status='active');
 if not public.ajura_message_participant(target_request) and not (active_admin and exists(select 1 from public.support_tickets where request_id=target_request)) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 if page_number is null or page_number not between 0 and 500 then raise exception 'Pagina invalida'; end if;
 select * into r from public.service_requests where id=target_request;
 with items as(select id,requested_by,reason,status,created_at,decided_at,decision_reason from public.service_cancellation_requests where request_id=r.id),
 paged as(select * from items order by created_at desc,id desc limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from paged x),'[]'::jsonb),'total',(select count(*) from items),'page',page_number,
 'request_status',r.status,'pending_id',(select id from public.service_cancellation_requests where request_id=r.id and status='pending'),
 'can_request',r.status='in_progress' and public.ajura_message_participant(r.id) and not exists(select 1 from public.service_cancellation_requests where request_id=r.id and status='pending'),
 'can_decide',active_admin and r.status='in_progress' and exists(select 1 from public.service_cancellation_requests where request_id=r.id and status='pending')) into result;
 return result;
end;$$;

create or replace function public.request_service_cancellation(target_request uuid,cancellation_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; result uuid; ticket uuid; note text:=btrim(coalesce(cancellation_reason,''));
begin
 select * into r from public.service_requests where id=target_request for update;
 if not found or not public.ajura_message_participant(target_request) then raise exception 'Participante ativo desse pedido necessario' using errcode='42501'; end if;
 if r.status<>'in_progress' then raise exception 'Solicitacao de cancelamento somente durante a execucao'; end if;
 if char_length(note) not between 10 and 1000 then raise exception 'Explique o motivo em 10 a 1000 caracteres'; end if;
 select id into result from public.service_cancellation_requests where request_id=r.id and status='pending';
 if result is not null then return result; end if;
 ticket:=public.open_support_ticket(r.id,left('Solicitacao de cancelamento durante a execucao: '||note,1000));
 insert into public.service_cancellation_requests(request_id,ticket_id,requested_by,reason) values(r.id,ticket,auth.uid(),note) returning id into result;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(ticket,auth.uid(),'participant','Cancelamento solicitado. Motivo: '||note||'. O pedido continua em execucao ate uma decisao registrada.');
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
 values(r.id,auth.uid(),'cancellation_requested',jsonb_build_object('cancellation_id',result),now(),'cancellation:'||result);
 return result;
end;$$;

create or replace function public.admin_decide_service_cancellation(target_cancellation uuid,decision text,resolution text)
returns void language plpgsql security definer set search_path='' as $$
declare request_uuid uuid; r public.service_requests%rowtype; cr public.service_cancellation_requests%rowtype; note text:=btrim(coalesce(resolution,''));
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Administrador ativo necessario' using errcode='42501'; end if;
 if decision is null or decision not in ('cancel','continue') or char_length(note) not between 10 and 2000 then raise exception 'Decisao e justificativa de 10 a 2000 caracteres necessarias'; end if;
 select request_id into request_uuid from public.service_cancellation_requests where id=target_cancellation;
 if not found then raise exception 'Solicitacao nao encontrada'; end if;
 -- Ordem comum aos codigos e encaminhamentos: pedido primeiro.
 select * into r from public.service_requests where id=request_uuid for update;
 select * into cr from public.service_cancellation_requests where id=target_cancellation for update;
 if cr.status<>'pending' or r.status<>'in_progress' then raise exception 'Pedido ou solicitacao ja mudou. Atualize a conversa'; end if;
 perform 1 from public.support_tickets where id=cr.ticket_id and status='open' for update;
 if not found then raise exception 'Atendimento encerrado. Atualize e procure a Central'; end if;
 update public.service_cancellation_requests set status=case when decision='cancel' then 'approved' else 'rejected' end,decided_at=now(),decided_by=auth.uid(),decision_reason=note where id=cr.id;
 if decision='cancel' then
  update public.service_requests set status='cancelled' where id=r.id;
  update public.service_confirmation_codes set consumed_at=coalesce(consumed_at,now()) where request_id=r.id;
 end if;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body)
 values(cr.ticket_id,auth.uid(),'central',case when decision='cancel' then 'Cancelamento aprovado. O pedido foi cancelado.' else 'Cancelamento nao aprovado. O pedido permanece em execucao.' end||' Justificativa: '||left(note,1600)||' Nenhuma cobranca, estorno ou repasse foi executado por esta decisao.');
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
 values(r.id,auth.uid(),'cancellation_decided',jsonb_build_object('cancellation_id',cr.id,'decision',decision),now(),'cancellation-decision:'||cr.id);
end;$$;

-- Se o cliente confirmar a conclusao antes da analise, nao se cancela um pedido concluido.
create or replace function public.ajura_close_obsolete_cancellations()
returns trigger language plpgsql security definer set search_path='' as $$
declare cr public.service_cancellation_requests%rowtype; note text;
begin
 if new.status is not distinct from old.status or new.status not in ('completed','cancelled','declined') then return new; end if;
 note:=case when new.status='completed' then 'Pedido concluido pelo fluxo de confirmacao. A solicitacao pendente foi encerrada sem cancelamento.' else 'Pedido encerrado por outro fluxo. A solicitacao pendente perdeu o objeto da analise.' end;
 for cr in update public.service_cancellation_requests set status='superseded',decided_at=now(),decided_by=auth.uid(),decision_reason=note where request_id=new.id and status='pending' returning * loop
  if auth.uid() is not null then
   insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(cr.ticket_id,auth.uid(),'participant',note);
  end if;
  insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
  values(new.id,auth.uid(),'cancellation_superseded',jsonb_build_object('cancellation_id',cr.id,'status',new.status),now(),'cancellation-obsolete:'||cr.id);
 end loop;
 return new;
end;$$;
drop trigger if exists ajura_close_obsolete_cancellations on public.service_requests;
create trigger ajura_close_obsolete_cancellations after update of status on public.service_requests for each row execute function public.ajura_close_obsolete_cancellations();
revoke all on function public.ajura_close_obsolete_cancellations() from public,anon,authenticated;

-- Encerrar a conversa da Central nao pode abandonar uma decisao de cancelamento pendente.
create or replace function public.resolve_support_ticket(target_ticket uuid,resolution text)
returns void language plpgsql security definer set search_path='' as $$
declare request_uuid uuid;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessario' using errcode='42501'; end if;
 if resolution is null or length(trim(resolution)) not between 10 and 2000 then raise exception 'Informe a resolucao em 10 a 2000 caracteres'; end if;
 select request_id into request_uuid from public.support_tickets where id=target_ticket;
 if not found then raise exception 'Atendimento indisponivel'; end if;
 perform 1 from public.service_requests where id=request_uuid for update;
 perform 1 from public.support_tickets where id=target_ticket and status='open' for update;
 if not found then raise exception 'Atendimento ja encerrado'; end if;
 if exists(select 1 from public.service_cancellation_requests where ticket_id=target_ticket and status='pending') then raise exception 'Analise a solicitacao de cancelamento antes de encerrar o atendimento'; end if;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(target_ticket,auth.uid(),'central',trim(resolution));
 update public.support_tickets set status='resolved',resolved_at=now(),resolved_by=auth.uid() where id=target_ticket;
end;$$;
revoke all on function public.service_cancellation_context(uuid,integer),public.request_service_cancellation(uuid,text),public.admin_decide_service_cancellation(uuid,text,text),public.resolve_support_ticket(uuid,text) from public,anon;
grant execute on function public.service_cancellation_context(uuid,integer),public.request_service_cancellation(uuid,text),public.admin_decide_service_cancellation(uuid,text,text),public.resolve_support_ticket(uuid,text) to authenticated;
commit;
