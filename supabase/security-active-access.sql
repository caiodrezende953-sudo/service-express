-- Já aplicado no Supabase. Cópia para versionamento; não executar manualmente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.provider_catalog_recheck() from public, anon, authenticated;
create or replace function public.admin_is_current_user()
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.platform_admins a join public.profiles p on p.id=a.user_id where a.user_id=(select auth.uid()) and p.status='active');
$$;
revoke execute on function public.admin_is_current_user() from public,anon;
grant execute on function public.admin_is_current_user() to authenticated;
alter policy request_participants_read on public.service_requests
using (((select auth.uid())=client_id or (select auth.uid())=provider_id)
and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'));
alter policy payment_test_participants_read on public.payment_test_intents
using (((select auth.uid())=client_id or (select auth.uid())=provider_id)
and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active'));
