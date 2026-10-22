-- AJURA: preparação de pagamento de teste. Não chama Mercado Pago nem cobra.
begin;
create table if not exists public.payment_test_intents (
 id uuid primary key default gen_random_uuid(),
 quote_id uuid not null unique references public.request_quotes(id),
 request_id uuid not null references public.service_requests(id),
 client_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.provider_profiles(id),
 amount numeric(12,2) not null check (amount > 0),
 currency text not null default 'BRL' check (currency = 'BRL'),
 environment text not null default 'test' check (environment = 'test'),
 status text not null default 'prepared' check (status in ('prepared','creating','pending','approved','rejected','cancelled','refunded','unknown')),
 external_order_id text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (client_id <> provider_id)
);
alter table public.payment_test_intents enable row level security;
revoke all on public.payment_test_intents from public, anon, authenticated;
grant select on public.payment_test_intents to authenticated;
grant all on public.payment_test_intents to service_role;
drop policy if exists payment_test_participants_read on public.payment_test_intents;
create policy payment_test_participants_read on public.payment_test_intents
for select to authenticated using ((select auth.uid()) in (client_id, provider_id));

create or replace function public.prepare_test_payment(target_quote uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := auth.uid();
 request_uuid uuid;
 r public.service_requests%rowtype;
 q public.request_quotes%rowtype;
 result_uuid uuid;
begin
 if actor is null then raise exception 'Entre na sua conta de cliente'; end if;
 select request_id into request_uuid from public.request_quotes where id = target_quote;
 select * into r from public.service_requests
 where id = request_uuid and client_id = actor for update;
 if not found or r.status <> 'requested' then raise exception 'Solicitação indisponível'; end if;
 select * into q from public.request_quotes where id = target_quote for update;
 if not found or q.status <> 'accepted' or q.provider_id <> r.provider_id then
  raise exception 'É necessário um orçamento aceito dessa solicitação'; end if;
 if q.scheduled_date < (now() at time zone 'America/Manaus')::date then
  raise exception 'A data do orçamento passou. Ajuste o atendimento antes do pagamento'; end if;
 if not exists (
  select 1 from public.profiles p where p.id = actor and p.status = 'active'
  and p.account_type in ('client','both')
  and char_length(btrim(coalesce(p.full_name,''))) >= 3
  and regexp_replace(coalesce(p.phone,''),'[^0-9]','','g') ~ '^[0-9]{10,11}$'
  and char_length(btrim(coalesce(p.district,''))) >= 2
  and char_length(btrim(coalesce(p.address_line,''))) >= 3
  and char_length(btrim(coalesce(p.address_number,''))) >= 1
 ) then raise exception 'Complete seu cadastro de cliente antes do pagamento'; end if;
 if not exists (
  select 1 from public.provider_profiles pp join public.profiles p on p.id = pp.id
  where pp.id = r.provider_id and pp.approval_status = 'approved' and p.status = 'active'
 ) then raise exception 'Prestador indisponível'; end if;
 if not exists (
  select 1 from public.mp_provider_connections c
  where c.provider_id = r.provider_id and c.environment = 'test'
  and c.mp_user_id = 3736210841 and c.token_expires_at > now()
 ) then raise exception 'Prestador precisa conectar a conta de teste do Mercado Pago'; end if;
 insert into public.payment_test_intents(quote_id,request_id,client_id,provider_id,amount)
 values(q.id,r.id,actor,r.provider_id,q.amount)
 on conflict (quote_id) do nothing returning id into result_uuid;
 if result_uuid is null then
  select id into result_uuid from public.payment_test_intents
  where quote_id = q.id and client_id = actor and provider_id = r.provider_id
  and amount = q.amount and request_id = r.id;
  if result_uuid is null then raise exception 'Preparação existente não corresponde ao orçamento'; end if;
 end if;
 return result_uuid;
end; $$;
revoke all on function public.prepare_test_payment(uuid) from public, anon, authenticated;
grant execute on function public.prepare_test_payment(uuid) to authenticated;
commit;
