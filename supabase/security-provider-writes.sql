create or replace function public.provider_resubmit()
returns text language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.status='active' and p.account_type in ('provider','both')) then
 raise exception 'Perfil profissional ativo necessario' using errcode='42501'; end if;
 update public.provider_profiles set approval_status='pending',review_note=null,approved_at=null,updated_at=now()
 where id=auth.uid() and approval_status='rejected';
 if not found then raise exception 'Nao ha cadastro recusado para reenviar'; end if;
 return 'pending';
end;$$;
revoke execute on function public.provider_resubmit() from public,anon;
grant execute on function public.provider_resubmit() to authenticated;
alter policy provider_profile_insert_own on public.provider_profiles with check (id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')));
alter policy provider_profile_update_own on public.provider_profiles using (id=(select auth.uid()) and approval_status<>'suspended' and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both'))) with check (id=(select auth.uid()) and approval_status<>'suspended' and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')));
alter policy provider_services_insert_own on public.provider_services with check (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended'));
alter policy provider_services_update_own on public.provider_services using (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended')) with check (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended'));
alter policy provider_services_delete_own on public.provider_services using (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended'));
alter policy provider_areas_insert_own on public.provider_service_areas with check (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended'));
alter policy provider_areas_delete_own on public.provider_service_areas using (provider_id=(select auth.uid()) and exists(select 1 from public.profiles a where a.id=(select auth.uid()) and a.status='active' and a.account_type in ('provider','both')) and exists(select 1 from public.provider_profiles pp where pp.id=(select auth.uid()) and pp.approval_status<>'suspended'));

