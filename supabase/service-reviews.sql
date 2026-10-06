-- AJURA: avaliacoes reais por pedido concluido. Nenhum dado ficticio importado.
begin;
create table if not exists public.service_reviews (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references public.service_requests(id),
 client_id uuid not null references public.profiles(id),
 provider_id uuid not null references public.provider_profiles(id),
 rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment)<=500),
 service_title text not null,
 created_at timestamptz not null default now(),
 check(client_id<>provider_id)
);
create index if not exists service_reviews_provider_idx on public.service_reviews(provider_id,created_at,id);
alter table public.service_reviews enable row level security;
revoke all on public.service_reviews from public,anon,authenticated;

create or replace function public.service_review_context(target_request uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.service_requests%rowtype; evaluation jsonb;
begin
 if not public.ajura_message_participant(target_request) then raise exception 'Acesso nao autorizado' using errcode='42501'; end if;
 select * into r from public.service_requests where id=target_request;
 select jsonb_build_object('rating',rating,'comment',comment,'created_at',created_at) into evaluation from public.service_reviews where request_id=r.id;
 return jsonb_build_object('review',evaluation,'can_review',r.client_id=auth.uid() and r.status='completed' and r.started_at is not null and r.completed_at is not null and r.execution_quote_id is not null and evaluation is null and exists(select 1 from public.request_quotes q where q.id=r.execution_quote_id and q.request_id=r.id and q.provider_id=r.provider_id and q.status='accepted'));
end;$$;

create or replace function public.submit_service_review(target_request uuid, stars integer, review_comment text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype; old_review public.service_reviews%rowtype; new_id uuid; title text; note text:=btrim(coalesce(review_comment,''));
begin
 select * into r from public.service_requests where id=target_request and client_id=auth.uid() for update;
 if not found or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and account_type in ('client','both')) then raise exception 'Cliente desse pedido necessario' using errcode='42501'; end if;
 if stars is null or stars not between 1 and 5 or char_length(note)>500 then raise exception 'Informe nota de 1 a 5 e comentario de ate 500 caracteres'; end if;
 if r.status<>'completed' or r.started_at is null or r.completed_at is null or r.execution_quote_id is null or not exists(select 1 from public.request_quotes q where q.id=r.execution_quote_id and q.request_id=r.id and q.provider_id=r.provider_id and q.status='accepted') then raise exception 'Avaliacao somente apos conclusao registrada do servico'; end if;
 select * into old_review from public.service_reviews where request_id=r.id;
 if found then
  if old_review.rating=stars and old_review.comment=note then return old_review.id; end if;
  raise exception 'Este pedido ja foi avaliado';
 end if;
 select s.title into title from public.provider_services s where s.id=r.service_id;
 insert into public.service_reviews(request_id,client_id,provider_id,rating,comment,service_title)
 values(r.id,r.client_id,r.provider_id,stars,note,coalesce(title,'Servico contratado')) returning id into new_id;
 insert into public.request_events(request_id,actor_id,event_type,payload,occurred_at,source_key)
 values(r.id,auth.uid(),'review_submitted',jsonb_build_object('review_id',new_id,'rating',stars),now(),'review:'||new_id);
 return new_id;
end;$$;

create or replace function public.provider_review_summary(provider_ids uuid[])
returns table(provider_id uuid,review_count bigint,average_rating numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Conta ativa necessaria' using errcode='42501'; end if;
 if provider_ids is null or cardinality(provider_ids)>100 then raise exception 'Consulte ate 100 prestadores por vez'; end if;
 return query select pp.id,count(sr.id),avg(sr.rating)::numeric
 from public.provider_profiles pp join public.profiles p on p.id=pp.id
 left join public.service_reviews sr on sr.provider_id=pp.id
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
 with all_reviews as(select id,rating,comment,service_title,created_at from public.service_reviews where provider_id=target_provider),
 paged as(select * from all_reviews order by created_at desc,id desc limit 20 offset page_number*20)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from paged x),'[]'::jsonb),'total',(select count(*) from all_reviews),'page',page_number) into result;
 return result;
end;$$;
revoke all on function public.service_review_context(uuid),public.submit_service_review(uuid,integer,text),public.provider_review_summary(uuid[]),public.provider_review_list(uuid,integer) from public,anon;
grant execute on function public.service_review_context(uuid),public.submit_service_review(uuid,integer,text),public.provider_review_summary(uuid[]),public.provider_review_list(uuid,integer) to authenticated;
commit;
