CREATE OR REPLACE FUNCTION public.provider_approval_checklist(target_provider uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare gaps text[];
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active') then raise exception 'Conta ativa necessaria' using errcode='42501'; end if;
 if auth.uid() is null or target_provider is null or
  (target_provider <> auth.uid() and not public.admin_is_current_user()) then
  raise exception 'Acesso não autorizado' using errcode='42501';
 end if;
 gaps := public.ajura_provider_missing(target_provider);
 return jsonb_build_object('ready', cardinality(gaps)=0, 'missing', to_jsonb(gaps));
end;
$function$;

CREATE OR REPLACE FUNCTION public.mp_my_test_connection()
 RETURNS TABLE(mp_user_id bigint, connected_at timestamp with time zone, token_expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.mp_user_id, c.connected_at, c.token_expires_at
  from public.mp_provider_connections c
  where c.provider_id = (select auth.uid())
    and c.environment = 'test'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active' and p.account_type in ('provider','both'));
$function$;

revoke execute on function public.provider_approval_checklist(uuid) from public,anon;
grant execute on function public.provider_approval_checklist(uuid) to authenticated;
revoke execute on function public.mp_my_test_connection() from public,anon;
grant execute on function public.mp_my_test_connection() to authenticated;

