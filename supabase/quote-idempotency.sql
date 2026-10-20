begin;
create or replace function public.send_request_quote(target_request uuid, total numeric, service_scope text, materials_details text, service_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
 perform 1 from public.service_requests r join public.profiles a on a.id = r.provider_id
 join public.provider_profiles p on p.id = r.provider_id
 where r.id = target_request and r.provider_id = auth.uid() and r.status = 'requested'
 and a.status = 'active' and p.approval_status = 'approved' for update of r;
 if not found then raise exception 'Apenas o prestador aprovado pode enviar orçamento para uma solicitação aberta'; end if;
 if exists (select 1 from public.request_quotes q where q.request_id = target_request and q.status = 'accepted') then raise exception 'Já existe orçamento aceito'; end if;
 select q.id into result_id from public.request_quotes q where q.request_id=target_request and q.status='pending'
 and q.amount=total and q.scope=btrim(service_scope) and q.materials=btrim(materials_details) and q.scheduled_date=service_date;
 if found then return result_id;end if;
 if service_date is null or service_date < (now() at time zone 'America/Manaus')::date then raise exception 'Escolha uma data atual ou futura'; end if;
 update public.request_quotes set status = 'superseded', responded_at = now() where request_id = target_request and status = 'pending';
 insert into public.request_quotes(request_id,provider_id,amount,scope,materials,scheduled_date)
 values(target_request,auth.uid(),total,btrim(service_scope),btrim(materials_details),service_date) returning id into result_id;
 return result_id;
end; $$;

create table public.quote_submission_attempts (
 provider_id uuid not null references public.profiles(id),submission_key uuid not null,
 request_id uuid not null references public.service_requests(id),quote_id uuid not null references public.request_quotes(id),
 amount numeric not null,scope text not null,materials text not null,scheduled_date date not null,created_at timestamptz not null default now(),
 primary key(provider_id,submission_key));
alter table public.quote_submission_attempts enable row level security;
revoke all on public.quote_submission_attempts from public,anon,authenticated;
-- Sem políticas de acesso direto: somente a função conferida abaixo utiliza esta tabela.
create or replace function public.send_request_quote_once(target_request uuid,total numeric,service_scope text,materials_details text,service_date date,submission_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();attempt public.quote_submission_attempts%rowtype;result_id uuid;
begin
 if actor is null or submission_key is null or target_request is null then raise exception 'Tentativa de envio inválida' using errcode='22023';end if;
 if not exists(select 1 from public.profiles a join public.provider_profiles p on p.id=a.id where a.id=actor and a.status='active' and a.account_type in('provider','both') and p.approval_status='approved') then raise exception 'Prestador sem autorização para enviar orçamento' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ajura-quote:'||actor::text||':'||submission_key::text,0));
 select * into attempt from public.quote_submission_attempts a where a.provider_id=actor and a.submission_key=send_request_quote_once.submission_key;
 if found then
  if attempt.request_id is distinct from target_request or attempt.amount is distinct from total or attempt.scope is distinct from btrim(service_scope) or attempt.materials is distinct from btrim(materials_details) or attempt.scheduled_date is distinct from service_date then
   raise exception 'Esta tentativa já foi usada com outros dados. Confira o orçamento antes de criar outra proposta' using errcode='22023';
  end if;
  return attempt.quote_id;
 end if;
 -- A função existente confere o prestador do pedido, bloqueia a linha do pedido,
 -- valida data/estado e registra a substituição e o orçamento na mesma transação.
 result_id:=public.send_request_quote(target_request,total,service_scope,materials_details,service_date);
 insert into public.quote_submission_attempts(provider_id,submission_key,request_id,quote_id,amount,scope,materials,scheduled_date)
 values(actor,submission_key,target_request,result_id,total,btrim(service_scope),btrim(materials_details),service_date);
 return result_id;
end;$$;
revoke all on function public.send_request_quote_once(uuid,numeric,text,text,date,uuid) from public,anon;
grant execute on function public.send_request_quote_once(uuid,numeric,text,text,date,uuid) to authenticated;
commit;
