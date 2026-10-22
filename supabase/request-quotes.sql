-- AJURA: orçamento formal, sem cobrança ou liberação de endereço.
begin;
create table if not exists public.request_quotes (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.service_requests(id),
 provider_id uuid not null references public.profiles(id),
 amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
 scope text not null check (char_length(scope) between 10 and 2000),
 materials text not null check (char_length(materials) between 3 and 1000),
 scheduled_date date not null,
 status text not null default 'pending' check (status in ('pending','accepted','rejected','superseded')),
 created_at timestamptz not null default now(),
 responded_at timestamptz
);
create unique index if not exists request_quote_one_pending on public.request_quotes(request_id) where status = 'pending';
create unique index if not exists request_quote_one_accepted on public.request_quotes(request_id) where status = 'accepted';
alter table public.request_quotes enable row level security;
revoke all on public.request_quotes from anon, authenticated;
grant select on public.request_quotes to authenticated;
drop policy if exists quote_participants_read on public.request_quotes;
create policy quote_participants_read on public.request_quotes for select to authenticated
using (exists (select 1 from public.service_requests r where r.id = request_id and auth.uid() in (r.client_id,r.provider_id)));

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
 if service_date is null or service_date < (now() at time zone 'America/Manaus')::date then raise exception 'Escolha uma data atual ou futura'; end if;
 update public.request_quotes set status = 'superseded', responded_at = now() where request_id = target_request and status = 'pending';
 insert into public.request_quotes(request_id,provider_id,amount,scope,materials,scheduled_date)
 values(target_request,auth.uid(),total,btrim(service_scope),btrim(materials_details),service_date) returning id into result_id;
 return result_id;
end; $$;
create or replace function public.respond_request_quote(target_quote uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare request_uuid uuid; quote_date date;
begin
 if decision not in ('accepted','rejected') or decision is null then raise exception 'Decisão inválida'; end if;
 select q.request_id into request_uuid from public.request_quotes q where q.id = target_quote;
 perform 1 from public.service_requests r join public.profiles p on p.id = r.client_id
 where r.id = request_uuid and r.client_id = auth.uid() and r.status = 'requested' and p.status = 'active' for update of r;
 if not found then raise exception 'Apenas o cliente da solicitação pode responder'; end if;
 select scheduled_date into quote_date from public.request_quotes where id = target_quote and status = 'pending' for update;
 if not found then raise exception 'Orçamento já respondido ou substituído'; end if;
 if decision = 'accepted' then
  if quote_date < (now() at time zone 'America/Manaus')::date then raise exception 'Peça um orçamento com nova data'; end if;
  if not exists(select 1 from public.service_requests r join public.provider_profiles pp on pp.id = r.provider_id
   join public.profiles p on p.id = pp.id where r.id = request_uuid and pp.approval_status = 'approved' and p.status = 'active') then
   raise exception 'Prestador indisponível para aceite'; end if;
 end if;
 update public.request_quotes set status = decision, responded_at = now() where id = target_quote;
end; $$;
revoke all on function public.send_request_quote(uuid,numeric,text,text,date), public.respond_request_quote(uuid,text) from public, anon;
grant execute on function public.send_request_quote(uuid,numeric,text,text,date), public.respond_request_quote(uuid,text) to authenticated;
commit;
