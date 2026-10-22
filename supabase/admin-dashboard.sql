-- AJURA: consultas administrativas. Nao altera cadastros nem concede administradores.
begin;
create or replace function public.admin_provider_dashboard(filter_status text default 'all', search_text text default '', page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then
  raise exception 'Acesso administrativo necessario' using errcode='42501';
 end if;
 if filter_status is null or filter_status not in ('all','pending','approved','rejected','suspended') or page_number is null or page_number not between 0 and 500 or char_length(coalesce(search_text,''))>160 then raise exception 'Filtro invalido'; end if;
 with matching as (
 select p.id,p.display_name,p.approval_status,p.review_note,p.created_at
 from public.provider_profiles p
 where (filter_status='all' or p.approval_status=filter_status)
 and (coalesce(btrim(search_text),'')='' or strpos(lower(p.display_name),lower(btrim(search_text)))>0)
 ), paged as(select * from matching order by created_at desc,id limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from paged x),'[]'::jsonb),'total',(select count(*) from matching),'page',page_number,
 'counts',(select jsonb_object_agg(approval_status,n) from (select approval_status,count(*) n from public.provider_profiles group by approval_status) x)) into result;
 return result;
end;$$;
create or replace function public.admin_provider_history(target_provider uuid, page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessario' using errcode='42501'; end if;
 if page_number is null or page_number not between 0 and 500 then raise exception 'Pagina invalida'; end if;
 if not exists(select 1 from public.provider_profiles where id=target_provider) then raise exception 'Prestador nao encontrado'; end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from (
 select e.id,e.decision,e.note,e.created_at,p.full_name as administrator
 from public.provider_approval_events e left join public.profiles p on p.id=e.admin_id
 where e.provider_id=target_provider order by e.created_at desc,e.id desc limit 20 offset page_number*20
 ) x),'[]'::jsonb),'total',(select count(*) from public.provider_approval_events where provider_id=target_provider),'page',page_number);
end;$$;
revoke all on function public.admin_provider_dashboard(text,text,integer) from public,anon;
revoke all on function public.admin_provider_history(uuid,integer) from public,anon;
grant execute on function public.admin_provider_dashboard(text,text,integer) to authenticated;
grant execute on function public.admin_provider_history(uuid,integer) to authenticated;
commit;
