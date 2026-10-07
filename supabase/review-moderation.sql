-- AJURA: denuncias e moderacao. Execute depois de service-reviews.sql.
begin;
alter table public.service_reviews add column if not exists hidden boolean not null default false;
create table if not exists public.review_reports (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.service_reviews(id),
 reporter_id uuid not null references public.profiles(id),
 reason text not null check(char_length(reason) between 10 and 1000),
 status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(),
 resolved_at timestamptz,
 unique(review_id,reporter_id)
);
create table if not exists public.review_moderation_events (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.service_reviews(id),
 report_id uuid not null references public.review_reports(id),
 administrator_id uuid not null references public.profiles(id),
 decision text not null check(decision in ('hide','restore','dismiss')),
 reason text not null check(char_length(reason) between 10 and 2000),
 previous_hidden boolean not null,
 created_at timestamptz not null default now()
);
create index if not exists review_reports_queue_idx on public.review_reports(status,created_at,id);
create index if not exists review_moderation_history_idx on public.review_moderation_events(review_id,created_at,id);
alter table public.review_reports enable row level security;
alter table public.review_moderation_events enable row level security;
revoke all on public.review_reports,public.review_moderation_events from public,anon,authenticated;

create or replace function public.report_service_review(target_review uuid,report_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.service_reviews%rowtype; result uuid; note text:=btrim(coalesce(report_reason,''));
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Conta ativa necessaria' using errcode='42501'; end if;
 if char_length(note) not between 10 and 1000 then raise exception 'Explique a denuncia em 10 a 1000 caracteres'; end if;
 select * into r from public.service_reviews where id=target_review;
 if not found or r.hidden or not exists(select 1 from public.provider_profiles pp join public.profiles p on p.id=pp.id where pp.id=r.provider_id and p.status='active' and (pp.approval_status='approved' or pp.id=auth.uid())) then raise exception 'Avaliacao indisponivel para denuncia' using errcode='42501'; end if;
 insert into public.review_reports(review_id,reporter_id,reason) values(r.id,auth.uid(),note)
 on conflict(review_id,reporter_id) do nothing returning id into result;
 if result is null then select id into result from public.review_reports where review_id=r.id and reporter_id=auth.uid(); end if;
 return result;
end;$$;

create or replace function public.admin_review_reports(filter_status text default 'open',page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Administrador ativo necessario' using errcode='42501'; end if;
 if filter_status is null or filter_status not in ('open','closed') or page_number is null or page_number not between 0 and 500 then raise exception 'Filtro ou pagina invalida'; end if;
 with items as(select rp.id,rp.review_id,rp.reason,rp.status,rp.created_at,rp.resolved_at,sr.rating,sr.comment,sr.service_title,sr.hidden,pp.display_name
 from public.review_reports rp join public.service_reviews sr on sr.id=rp.review_id join public.provider_profiles pp on pp.id=sr.provider_id where rp.status=filter_status),
 paged as(select * from items order by created_at,id limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from paged x),'[]'::jsonb),'total',(select count(*) from items),'page',page_number) into result;
 return result;
end;$$;

create or replace function public.admin_moderate_review(target_report uuid,action text,moderation_reason text,expected_hidden boolean)
returns void language plpgsql security definer set search_path='' as $$
declare rp public.review_reports%rowtype; sr public.service_reviews%rowtype; note text:=btrim(coalesce(moderation_reason,''));
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Administrador ativo necessario' using errcode='42501'; end if;
 if action is null or action not in ('hide','restore','dismiss') or char_length(note) not between 10 and 2000 then raise exception 'Decisao e justificativa de 10 a 2000 caracteres necessarias'; end if;
 select * into rp from public.review_reports where id=target_report for update;
 if not found then raise exception 'Denuncia nao encontrada'; end if;
 select * into sr from public.service_reviews where id=rp.review_id for update;
 if expected_hidden is null or sr.hidden<>expected_hidden then raise exception 'Avaliacao mudou. Atualize o painel antes de decidir'; end if;
 if action='hide' and sr.hidden or action='restore' and not sr.hidden or action='dismiss' and rp.status<>'open' then raise exception 'Decisao ja aplicada ou estado invalido. Atualize o painel'; end if;
 if action<>'dismiss' then update public.service_reviews set hidden=(action='hide') where id=sr.id; end if;
 update public.review_reports set status='closed',resolved_at=coalesce(resolved_at,now()) where id=rp.id;
 insert into public.review_moderation_events(review_id,report_id,administrator_id,decision,reason,previous_hidden)
 values(sr.id,rp.id,auth.uid(),action,note,sr.hidden);
end;$$;

create or replace function public.admin_review_history(target_review uuid,page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_is_current_user() or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Administrador ativo necessario' using errcode='42501'; end if;
 if page_number is null or page_number not between 0 and 500 then raise exception 'Pagina invalida'; end if;
 with items as(select id,decision,reason,previous_hidden,created_at from public.review_moderation_events where review_id=target_review),
 paged as(select * from items order by created_at desc,id desc limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from paged x),'[]'::jsonb),'total',(select count(*) from items),'page',page_number) into result;
 return result;
end;$$;
create or replace function public.service_review_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; evaluation jsonb;
begin
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 select * into r from public.service_requests where id=target_request;
 select jsonb_build_object('rating',rating,'comment',comment,'created_at',created_at,'hidden',hidden) into evaluation from public.service_reviews where request_id=r.id;
 return jsonb_build_object('review',evaluation,'can_review',r.client_id=auth.uid() and r.status='completed' and r.started_at is not null and r.completed_at is not null and r.execution_quote_id is not null and evaluation is null and exists(select 1 from public.request_quotes q where q.id=r.execution_quote_id and q.request_id=r.id and q.provider_id=r.provider_id and q.status='accepted'));
end;$$;

create or replace function public.provider_review_summary(provider_ids uuid[])
returns table(provider_id uuid,review_count bigint,average_rating numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Conta ativa necessaria' using errcode='42501'; end if;
 if provider_ids is null or cardinality(provider_ids)>100 then raise exception 'Consulte ate 100 prestadores por vez'; end if;
 return query select pp.id,count(sr.id),avg(sr.rating)::numeric
 from public.provider_profiles pp join public.profiles p on p.id=pp.id
 left join public.service_reviews sr on sr.provider_id=pp.id and not sr.hidden
 where pp.id=any(provider_ids) and p.status='active'
 and (pp.approval_status='approved' or pp.id=auth.uid() or public.admin_is_current_user())
 group by pp.id;
end;$$;

create or replace function public.provider_review_list(target_provider uuid,page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') or not exists(select 1 from public.provider_profiles pp join public.profiles p on p.id=pp.id where pp.id=target_provider and p.status='active' and (pp.approval_status='approved' or pp.id=auth.uid() or public.admin_is_current_user())) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 if page_number is null or page_number not between 0 and 500 then raise exception 'Pagina invalida'; end if;
 with all_reviews as(select id,rating,comment,service_title,created_at from public.service_reviews where provider_id=target_provider and not hidden),
 paged as(select * from all_reviews order by created_at desc,id desc limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from paged x),'[]'::jsonb),'total',(select count(*) from all_reviews),'page',page_number) into result;
 return result;
end;$$;
revoke all on function public.report_service_review(uuid,text),public.admin_review_reports(text,integer),public.admin_moderate_review(uuid,text,text,boolean),public.admin_review_history(uuid,integer) from public,anon;
grant execute on function public.report_service_review(uuid,text),public.admin_review_reports(text,integer),public.admin_moderate_review(uuid,text,text,boolean),public.admin_review_history(uuid,integer) to authenticated;
commit;
