-- Resumo somente de leitura. Usa RLS e a identidade da sessão.
create or replace function public.my_request_summary(p_role text default 'client')
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
 if p_role is null or p_role not in ('client','provider') or not exists (
 select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'
 and (p.account_type='both' or p.account_type=p_role)) then
 raise exception 'Perfil ativo necessário para esta área.' using errcode='42501';
 end if;
 with own as (
 select r.status, exists(select 1 from public.request_quotes q where q.request_id=r.id and q.status='accepted') as accepted
 from public.service_requests r where
 (p_role='client' and r.client_id=(select auth.uid())) or
 (p_role='provider' and r.provider_id=(select auth.uid()))
 ) select jsonb_build_object(
 'awaiting_quote',count(*) filter(where status='requested' and not accepted),
 'awaiting_start',count(*) filter(where status='requested' and accepted),
 'in_progress',count(*) filter(where status='in_progress'),
 'completed',count(*) filter(where status='completed'),
 'closed',count(*) filter(where status in ('cancelled','declined')),
 'total',count(*)) into result from own;
 return result;
end; $$;
revoke all on function public.my_request_summary(text) from public,anon;
grant execute on function public.my_request_summary(text) to authenticated;
