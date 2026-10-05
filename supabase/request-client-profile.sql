-- AJURA: exige cadastro completo em novas solicitações. Não altera pedidos existentes.
begin;
create or replace function public.require_request_client_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or new.client_id is distinct from auth.uid() then
  raise exception 'Entre na sua conta de cliente para solicitar um serviço';
 end if;
 if not exists (
  select 1 from public.profiles p
  where p.id = new.client_id and p.status = 'active'
  and p.account_type in ('client', 'both')
  and char_length(btrim(coalesce(p.full_name, ''))) >= 3
  and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') ~ '^[0-9]{10,11}$'
  and char_length(btrim(coalesce(p.district, ''))) >= 2
  and char_length(btrim(coalesce(p.address_line, ''))) >= 3
  and char_length(btrim(coalesce(p.address_number, ''))) >= 1
 ) then
  raise exception 'Complete seu cadastro de cliente: nome, celular com DDD, bairro, rua e número';
 end if;
 return new;
end; $$;
revoke all on function public.require_request_client_profile() from public, anon, authenticated;
drop trigger if exists require_request_client_profile on public.service_requests;
create trigger require_request_client_profile
before insert on public.service_requests
for each row execute function public.require_request_client_profile();
commit;
