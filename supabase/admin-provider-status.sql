-- AJURA: suspensao e encaminhamento para nova analise. Sem alteracao retroativa.
begin;
create table if not exists public.provider_status_events (
 id bigint generated always as identity primary key,
 provider_id uuid not null references public.provider_profiles(id),
 admin_id uuid not null references public.profiles(id),
 previous_status text not null,
 decision text not null check(decision in ('suspended','pending')),
 note text not null check(char_length(btrim(note)) between 10 and 1000),
 created_at timestamptz not null default now()
);
alter table public.provider_status_events enable row level security;
revoke all on public.provider_status_events from public,anon,authenticated;
revoke all on sequence public.provider_status_events_id_seq from public,anon,authenticated;

create or replace function public.admin_change_provider_status(target_provider uuid, decision text, reason text)
returns text language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessario' using errcode='42501'; end if;
 if decision is null or decision not in ('suspended','pending') or char_length(btrim(coalesce(reason,''))) not between 10 and 1000 then raise exception 'Informe decisao e motivo de 10 a 1000 caracteres'; end if;
 select approval_status into previous from public.provider_profiles where id=target_provider for update;
 if not found then raise exception 'Prestador nao encontrado'; end if;
 if (decision='suspended' and previous not in ('pending','approved','rejected')) or (decision='pending' and previous<>'suspended') then raise exception 'Estado mudou ou transicao nao permitida. Atualize o painel'; end if;
 update public.provider_profiles set approval_status=decision,review_note=btrim(reason),approved_at=null,updated_at=now() where id=target_provider;
 insert into public.provider_status_events(provider_id,admin_id,previous_status,decision,note) values(target_provider,auth.uid(),previous,decision,btrim(reason));
 return decision;
end;$$;
revoke all on function public.admin_change_provider_status(uuid,text,text) from public,anon;
grant execute on function public.admin_change_provider_status(uuid,text,text) to authenticated;

create or replace function public.admin_provider_history(target_provider uuid, page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Acesso administrativo necessario' using errcode='42501'; end if;
 if page_number is null or page_number not between 0 and 500 then raise exception 'Pagina invalida'; end if;
 if not exists(select 1 from public.provider_profiles where id=target_provider) then raise exception 'Prestador nao encontrado'; end if;
 with events as (
 select 'review:'||e.id as event_key,e.id,e.decision,e.note,e.created_at,p.full_name as administrator,null::text as previous_status
 from public.provider_approval_events e left join public.profiles p on p.id=e.admin_id where e.provider_id=target_provider
 union all
 select 'status:'||e.id,e.id,e.decision,e.note,e.created_at,p.full_name,e.previous_status
 from public.provider_status_events e left join public.profiles p on p.id=e.admin_id where e.provider_id=target_provider
 ), paged as(select * from events order by created_at desc,event_key desc limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.event_key desc) from paged x),'[]'::jsonb),'total',(select count(*) from events),'page',page_number) into result;
 return result;
end;$$;
revoke all on function public.admin_provider_history(uuid,integer) from public,anon;
grant execute on function public.admin_provider_history(uuid,integer) to authenticated;
commit;
