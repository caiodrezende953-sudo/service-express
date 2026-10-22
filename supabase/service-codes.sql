-- AJURA: ciclo de servico sem integracao financeira. Nenhum pedido antigo e iniciado.
begin;
alter table public.service_requests drop constraint if exists service_requests_status_check;
alter table public.service_requests add constraint service_requests_status_check check(status in ('requested','in_progress','completed','declined','cancelled'));
alter table public.service_requests add column if not exists started_at timestamptz;
alter table public.service_requests add column if not exists completed_at timestamptz;
alter table public.service_requests add column if not exists execution_quote_id uuid references public.request_quotes(id);
create table if not exists public.service_confirmation_codes (
 request_id uuid not null references public.service_requests(id),
 phase text not null check(phase in ('start','finish')),
 salt uuid not null,
 code_hash bytea not null,
 issued_at timestamptz not null,
 expires_at timestamptz not null,
 failed_attempts integer not null default 0 check(failed_attempts between 0 and 5),
 locked_until timestamptz,
 consumed_at timestamptz,
 primary key(request_id,phase)
);
alter table public.service_confirmation_codes enable row level security;
revoke all on public.service_confirmation_codes from public,anon,authenticated;

create or replace function public.service_execution_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; q uuid; ph text; c public.service_confirmation_codes%rowtype;
begin
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 select * into r from public.service_requests where id=target_request;
 select id into q from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted';
 ph:=case when r.status='requested' and q is not null then 'start' when r.status='in_progress' then 'finish' else null end;
 select * into c from public.service_confirmation_codes where request_id=r.id and service_confirmation_codes.phase=ph;
 return jsonb_build_object('status',r.status,'phase',ph,'started_at',r.started_at,'completed_at',r.completed_at,'expires_at',c.expires_at,'locked_until',c.locked_until,'can_issue_at',c.issued_at+interval '60 seconds','has_code',c.request_id is not null and c.consumed_at is null and c.expires_at>now());
end;$$;

create or replace function public.issue_service_code(target_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; q public.request_quotes%rowtype; ph text; c public.service_confirmation_codes%rowtype; secret text; new_salt uuid; fails integer:=0;
begin
 select * into r from public.service_requests where id=target_request and client_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and account_type in ('client','both')) then raise exception 'Cliente desse pedido necessario' using errcode='42501'; end if;
 if not exists(select 1 from public.provider_profiles pp join public.profiles p on p.id=pp.id where pp.id=r.provider_id and pp.approval_status='approved' and p.status='active' and p.account_type in ('provider','both')) then raise exception 'Prestador indisponivel. Procure a Central'; end if;
 if r.status='requested' then
  ph:='start';select * into q from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted' for update;
  if not found then raise exception 'Aceite um orcamento antes de gerar o codigo'; end if;
  if q.scheduled_date < (now() at time zone 'America/Manaus')::date then raise exception 'Data da proposta passou. Procure a Central para ajustar o atendimento'; end if;
 elsif r.status='in_progress' then ph:='finish';
 else raise exception 'Pedido encerrado ou indisponivel'; end if;
 select * into c from public.service_confirmation_codes where request_id=r.id and phase=ph for update;
 if found then
  if c.locked_until>now() then raise exception 'Limite de tentativas. Aguarde 15 minutos ou procure a Central'; end if;
  if c.issued_at+interval '60 seconds'>now() then raise exception 'Aguarde 60 segundos antes de gerar outro codigo'; end if;
  fails:=case when c.locked_until is not null and c.locked_until<=now() then 0 else c.failed_attempts end;
 end if;
 secret:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
 -- Nunca reutiliza o codigo de inicio na conclusao.
 while exists(select 1 from public.service_confirmation_codes s where s.request_id=r.id and (s.phase=ph or (s.phase='start' and ph='finish')) and s.code_hash=sha256(convert_to(s.salt::text||':'||secret,'UTF8'))) loop
  secret:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
 end loop;
 new_salt:=gen_random_uuid();
 insert into public.service_confirmation_codes(request_id,phase,salt,code_hash,issued_at,expires_at,failed_attempts)
 values(r.id,ph,new_salt,sha256(convert_to(new_salt::text||':'||secret,'UTF8')),now(),now()+interval '15 minutes',fails)
 on conflict(request_id,phase) do update set salt=excluded.salt,code_hash=excluded.code_hash,issued_at=excluded.issued_at,expires_at=excluded.expires_at,failed_attempts=excluded.failed_attempts,locked_until=null,consumed_at=null;
 return jsonb_build_object('code',secret,'phase',ph,'expires_at',now()+interval '15 minutes');
end;$$;

create or replace function public.confirm_service_code(target_request uuid, confirmation_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; ph text; c public.service_confirmation_codes%rowtype; quote_uuid uuid;
begin
 select * into r from public.service_requests where id=target_request and provider_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles p join public.provider_profiles pp on pp.id=p.id where p.id=auth.uid() and p.status='active' and p.account_type in ('provider','both') and pp.approval_status='approved') then raise exception 'Prestador autorizado desse pedido necessario' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=r.client_id and status='active') then raise exception 'Cliente indisponivel. Procure a Central'; end if;
 ph:=case when r.status='requested' then 'start' when r.status='in_progress' then 'finish' else null end;
 if ph is null then return jsonb_build_object('ok',false,'message','Pedido ja encerrado. Atualize a conversa'); end if;
 select * into c from public.service_confirmation_codes where request_id=r.id and phase=ph for update;
 if not found or c.consumed_at is not null then return jsonb_build_object('ok',false,'message','Peca ao cliente para gerar o codigo correto'); end if;
 if c.locked_until>now() then return jsonb_build_object('ok',false,'message','Tentativas bloqueadas por 15 minutos'); end if;
 if c.failed_attempts>=5 then return jsonb_build_object('ok',false,'message','Peca ao cliente para gerar um novo codigo'); end if;
 if c.expires_at<=now() then return jsonb_build_object('ok',false,'message','Codigo expirado. Peca ao cliente outro codigo'); end if;
 if confirmation_code is null or confirmation_code !~ '^[0-9]{6}$' then return jsonb_build_object('ok',false,'message','Informe os seis numeros do codigo'); end if;
 if c.code_hash<>sha256(convert_to(c.salt::text||':'||confirmation_code,'UTF8')) then
  update public.service_confirmation_codes set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts+1>=5 then now()+interval '15 minutes' else null end where request_id=r.id and phase=ph;
  -- Retorna, em vez de lancar excecao, para preservar o contador na transacao.
  return jsonb_build_object('ok',false,'message','Codigo incorreto','remaining_attempts',4-c.failed_attempts);
 end if;
 if ph='start' then
  select id into quote_uuid from public.request_quotes where request_id=r.id and provider_id=r.provider_id and status='accepted' and scheduled_date >= (now() at time zone 'America/Manaus')::date for update;
  if quote_uuid is null then return jsonb_build_object('ok',false,'message','Orcamento aceito com data valida necessario'); end if;
  update public.service_requests set status='in_progress',started_at=now(),execution_quote_id=quote_uuid where id=r.id;
 else
  if r.execution_quote_id is null or r.started_at is null then raise exception 'Inicio nao registrado. Procure a Central'; end if;
  update public.service_requests set status='completed',completed_at=now() where id=r.id;
 end if;
 update public.service_confirmation_codes set consumed_at=now() where request_id=r.id and phase=ph;
 return jsonb_build_object('ok',true,'status',case when ph='start' then 'in_progress' else 'completed' end);
end;$$;

-- Mantem a conversa durante a execucao. Depois da conclusao, atendimento pela Central.
create or replace function public.send_request_message(target_request uuid,message_text text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and status='active') then raise exception 'Conta ativa necessaria'; end if;
 perform 1 from public.service_requests r where r.id=target_request and actor in (r.client_id,r.provider_id) and r.status in ('requested','in_progress') for update;
 if not found then raise exception 'Conversa indisponivel'; end if;
 insert into public.request_messages(request_id,sender_id,body) values(target_request,actor,btrim(message_text));
end;$$;
revoke all on function public.service_execution_context(uuid),public.issue_service_code(uuid),public.confirm_service_code(uuid,text),public.send_request_message(uuid,text) from public,anon;
grant execute on function public.service_execution_context(uuid),public.issue_service_code(uuid),public.confirm_service_code(uuid,text),public.send_request_message(uuid,text) to authenticated;
commit;
