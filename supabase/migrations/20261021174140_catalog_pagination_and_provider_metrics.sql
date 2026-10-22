-- AJURA 0.8.0: somente leitura paginada e agregações. Não altera ofertas ou pagamentos.
set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function ajura_internal.search_fold(value text)
returns text language sql immutable parallel safe set search_path='' as $$
 select lower(regexp_replace(normalize(coalesce(value,''),NFD),'[̀-ͯ]','','g'));
$$;
revoke all on function ajura_internal.search_fold(text) from public,anon,authenticated;

-- Fonte privada: mesmo escopo exato da aprovação, sem dados de identificação ou endereço.
create or replace view ajura_internal.catalog_visible_services with(security_invoker=true) as
 select s.id,s.provider_id,s.category,s.subcategory,s.title,s.description,s.pricing_type,s.starting_price,p.display_name,p.bio,
 btrim(regexp_replace(ajura_internal.search_fold(concat_ws(' ',c.area,c.profession,c.specialty,c.service_label,array_to_string(c.aliases,' '))),'[^a-z0-9]+',' ','g')) as activity_text
 from public.provider_services s join public.provider_profiles p on p.id=s.provider_id
 join public.profiles a on a.id=p.id
 join public.service_activity_catalog c on c.category=s.category and c.subcategory=s.subcategory
 where s.active and p.approval_status='approved' and a.status='active' and a.account_type in('provider','both')
 and (not c.regulated or exists(select 1 from public.provider_activity_permissions v where v.provider_id=s.provider_id and v.category=s.category and v.subcategory=s.subcategory and v.status='approved'));
revoke all on ajura_internal.catalog_visible_services from public,anon,authenticated;

create or replace function ajura_internal.catalog_filters()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=(select auth.uid()) and status='active') then raise exception 'Conta ativa necessária' using errcode='42501';end if;
 return jsonb_build_object('pairs',coalesce((select jsonb_agg(to_jsonb(x) order by x.category,x.subcategory) from(select distinct category,subcategory from ajura_internal.catalog_visible_services)x),'[]'::jsonb));
end;$$;

create or replace function ajura_internal.catalog_page(search_text text,selected_category text,selected_subcategory text,selected_district text,min_rating numeric,sort_order text,page_number integer,page_size integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;needle text;words text[];
begin
 if not exists(select 1 from public.profiles where id=(select auth.uid()) and status='active') then raise exception 'Conta ativa necessária' using errcode='42501';end if;
 if page_number is null or page_number not between 0 and 10000 or page_size is null or page_size not between 1 and 24
 or sort_order is null or sort_order not in('name','price','rating') or min_rating is null or min_rating<0 or min_rating>5 or min_rating::text='NaN'
 or char_length(coalesce(search_text,''))>200 or char_length(coalesce(selected_category,''))>160 or char_length(coalesce(selected_subcategory,''))>160 or char_length(coalesce(selected_district,''))>160 then
 raise exception 'Filtros ou página inválidos' using errcode='22023';end if;
 needle:=ajura_internal.search_fold(btrim(coalesce(search_text,'')));
 words:=string_to_array(btrim(regexp_replace(needle,'[^a-z0-9]+',' ','g')),' ');
 with candidates as materialized(
  select s.* from ajura_internal.catalog_visible_services s
  where (coalesce(selected_category,'')='' or s.category=selected_category)
  and(coalesce(selected_subcategory,'')='' or s.subcategory=selected_subcategory)
  and(coalesce(selected_district,'')='' or exists(select 1 from public.provider_service_areas a where a.provider_id=s.provider_id and a.district=selected_district))
  and(needle='' or strpos(ajura_internal.search_fold(concat_ws(' ',s.display_name,s.bio,s.category,s.subcategory,s.title,s.description)),needle)>0
   or not exists(select 1 from unnest(words) w where w<>'' and strpos(s.activity_text,w)=0))
 ), rating as(
  select r.provider_id,count(*) as review_count,avg(r.rating)::numeric as average_rating
  from public.service_reviews r where not r.hidden and r.provider_id in(select distinct provider_id from candidates) group by r.provider_id
 ), filtered as materialized(
  select c.*,coalesce(r.review_count,0) as review_count,r.average_rating,
   case when c.pricing_type='fixed' then c.starting_price else null end as price_order,
   ajura_internal.search_fold(c.title) as title_order
  from candidates c left join rating r on r.provider_id=c.provider_id
  where min_rating=0 or r.average_rating>=min_rating
 ), paged as(
  select f.*,row_number() over(order by
    case when sort_order='rating' then f.average_rating end desc nulls last,
    case when sort_order='price' then f.price_order end asc nulls last,
    f.title_order collate "C",f.id) as ordinal
  from filtered f order by
    case when sort_order='rating' then f.average_rating end desc nulls last,
    case when sort_order='price' then f.price_order end asc nulls last,
    f.title_order collate "C",f.id
  limit page_size offset page_number*page_size
 ) select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.id,'provider_id',p.provider_id,'category',p.category,'subcategory',p.subcategory,'title',p.title,'description',p.description,'pricing_type',p.pricing_type,'starting_price',p.starting_price,
  'provider',jsonb_build_object('display_name',p.display_name),'review_count',p.review_count,'average_rating',p.average_rating,
  'areas',coalesce((select jsonb_agg(a.district order by a.district) from public.provider_service_areas a where a.provider_id=p.provider_id),'[]'::jsonb)) order by p.ordinal) from paged p),'[]'::jsonb),
  'total',(select count(*) from filtered),'provider_total',(select count(distinct provider_id) from filtered),'page',page_number,'page_size',page_size) into result;
 return result;
end;$$;

create or replace function ajura_internal.my_provider_metrics()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());result jsonb;
begin
 if not exists(select 1 from public.profiles where id=actor and status='active' and account_type in('provider','both')) then raise exception 'Perfil profissional ativo necessário' using errcode='42501';end if;
 with own_requests as materialized(
  select r.id,r.status,exists(select 1 from public.request_quotes q where q.request_id=r.id and q.provider_id=actor and q.status='accepted') as accepted from public.service_requests r where r.provider_id=actor
 ), phases as(
  select count(*) filter(where status='requested' and not accepted) as awaiting_quote,count(*) filter(where status='requested' and accepted) as awaiting_start,
   count(*) filter(where status='in_progress') as in_progress,count(*) filter(where status='completed') as completed,
   count(*) filter(where status in('cancelled','declined')) as closed,count(*) as total,count(*) filter(where status='requested') as requested_count from own_requests
 ), quotes as(
  select coalesce(sum(q.amount),0) as accepted_total,count(*) as accepted_count from public.request_quotes q join own_requests r on r.id=q.request_id and r.status='requested' where q.provider_id=actor and q.status='accepted'
 ), reviews as(
  select count(*) as review_count,avg(r.rating)::numeric as average_rating from public.service_reviews r where r.provider_id=actor and not r.hidden
 )select jsonb_build_object('active_services',(select count(*) from public.provider_services where provider_id=actor and active),
 'requested_count',p.requested_count,'request_summary',to_jsonb(p)-'requested_count',
 'accepted_total',q.accepted_total,'accepted_count',q.accepted_count,
 'review_summary',jsonb_build_object('provider_id',actor,'review_count',r.review_count,'average_rating',r.average_rating)) into result from phases p cross join quotes q cross join reviews r;
 return result;
end;$$;

-- A API pública é invoker; somente as rotinas privadas de leitura agregada elevam privilégios.
create or replace function public.catalog_filters()
returns jsonb language sql stable security invoker set search_path='' as $$select ajura_internal.catalog_filters();$$;
create or replace function public.catalog_page(search_text text default '',selected_category text default '',selected_subcategory text default '',selected_district text default '',min_rating numeric default 0,sort_order text default 'name',page_number integer default 0,page_size integer default 12)
returns jsonb language sql stable security invoker set search_path='' as $$select ajura_internal.catalog_page(search_text,selected_category,selected_subcategory,selected_district,min_rating,sort_order,page_number,page_size);$$;
create or replace function public.my_provider_metrics()
returns jsonb language sql stable security invoker set search_path='' as $$select ajura_internal.my_provider_metrics();$$;
revoke all on function ajura_internal.catalog_filters(),ajura_internal.catalog_page(text,text,text,text,numeric,text,integer,integer),ajura_internal.my_provider_metrics(),public.catalog_filters(),public.catalog_page(text,text,text,text,numeric,text,integer,integer),public.my_provider_metrics() from public,anon;
grant usage on schema ajura_internal to authenticated;
grant execute on function ajura_internal.catalog_filters(),ajura_internal.catalog_page(text,text,text,text,numeric,text,integer,integer),ajura_internal.my_provider_metrics(),public.catalog_filters(),public.catalog_page(text,text,text,text,numeric,text,integer,integer),public.my_provider_metrics() to authenticated;

-- Não duplica as chaves existentes; atende filtros, listas por dono e agregações.
create index if not exists ajura_services_active_category_idx on public.provider_services(category,subcategory,id) where active;
create index if not exists ajura_areas_district_provider_idx on public.provider_service_areas(district,provider_id);
create index if not exists ajura_requests_provider_recent_idx on public.service_requests(provider_id,created_at desc,id desc);
create index if not exists ajura_requests_client_recent_idx on public.service_requests(client_id,created_at desc,id desc);
create index if not exists ajura_quotes_provider_accepted_idx on public.request_quotes(provider_id,request_id) include(amount) where status='accepted';
create index if not exists ajura_reviews_visible_provider_idx on public.service_reviews(provider_id) include(rating) where not hidden;
notify pgrst,'reload schema';
reset lock_timeout;
reset statement_timeout;
