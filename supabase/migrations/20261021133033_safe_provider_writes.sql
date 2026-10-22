-- AJURA: escritas atômicas e repetição segura. Compatível com a base f1744bd.
create schema if not exists ajura_internal;
revoke all on schema ajura_internal from public,anon,authenticated;
create table if not exists ajura_internal.write_attempts (
 actor_id uuid not null references public.profiles(id),
 scope text not null,
 submission_key uuid not null,
 payload_hash text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,scope,submission_key)
);
alter table ajura_internal.write_attempts enable row level security;
revoke all on ajura_internal.write_attempts from public,anon,authenticated;

create or replace function ajura_internal.check_write_attempt(action_scope text, attempt_key uuid, payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous ajura_internal.write_attempts%rowtype; fingerprint text;
begin
 if auth.uid() is null or attempt_key is null then raise exception 'Identificador de tentativa necessário' using errcode='22023'; end if;
 fingerprint:=encode(sha256(convert_to(payload::text,'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ajura-write:'||auth.uid()::text||':'||action_scope||':'||attempt_key::text,0));
 select * into previous from ajura_internal.write_attempts a
 where a.actor_id=auth.uid() and a.scope=action_scope and a.submission_key=attempt_key;
 if found then
  if previous.payload_hash<>fingerprint then raise exception 'Esta tentativa já foi usada com outros dados. Confira o resultado antes de alterar o envio' using errcode='22023'; end if;
  return previous.result;
 end if;
 return null;
end; $$;
create or replace function ajura_internal.remember_write_attempt(action_scope text, attempt_key uuid, payload jsonb, response jsonb)
returns void language sql security invoker set search_path='' as $$
 insert into ajura_internal.write_attempts(actor_id,scope,submission_key,payload_hash,result)
 values(auth.uid(),action_scope,attempt_key,encode(sha256(convert_to(payload::text,'UTF8')),'hex'),response);
$$;
revoke all on function ajura_internal.check_write_attempt(text,uuid,jsonb),ajura_internal.remember_write_attempt(text,uuid,jsonb,jsonb) from public,anon,authenticated;

create or replace function public.save_provider_onboarding(profile_data jsonb,served_districts text[],submission_key uuid,expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); previous public.provider_profiles%rowtype; identity_data public.provider_private_details%rowtype;
 existed boolean; display text; biography text; document text; business text; old_districts text[]; chosen text[];
 payload jsonb; response jsonb;
begin
 perform 1 from public.profiles p where p.id=actor and p.status='active' and p.account_type in ('provider','both') for update;
 if not found then raise exception 'Perfil profissional ativo necessário' using errcode='42501'; end if;
 select * into previous from public.provider_profiles where id=actor for update; existed:=found;
 if existed and previous.approval_status='suspended' then raise exception 'Cadastro suspenso. Procure a Central' using errcode='42501'; end if;
 if profile_data is null or jsonb_typeof(profile_data)<>'object' then raise exception 'Confira o cadastro profissional' using errcode='23514'; end if;
 display:=btrim(profile_data->>'display_name');biography:=btrim(coalesce(profile_data->>'bio',''));
 document:=upper(regexp_replace(btrim(profile_data->>'document_number'),'[./[:space:]-]','','g'));
 business:=btrim(profile_data->>'business_name');
 if display is null or char_length(display) not between 3 and 100 or char_length(biography)>1000
 or document is null or not public.ajura_document_valid(document) or business is null or char_length(business) not between 3 and 160 then
  raise exception 'Confira nome, apresentação, CPF/CNPJ e identificação profissional' using errcode='23514';
 end if;
 if served_districts is null or cardinality(served_districts) not between 1 and 64
 or exists(select 1 from unnest(served_districts) d where d is null or char_length(btrim(d)) not between 2 and 80)
 then raise exception 'Selecione de um a 64 bairros válidos' using errcode='23514'; end if;
 select array_agg(distinct btrim(d) order by btrim(d)) into chosen from unnest(served_districts) d;
 payload:=jsonb_build_object('display_name',display,'bio',biography,'document_number',document,'business_name',business,'districts',chosen);
 response:=ajura_internal.check_write_attempt('onboarding',submission_key,payload);if response is not null then return response;end if;
 select * into identity_data from public.provider_private_details where provider_id=actor;
 select coalesce(array_agg(district order by district),'{}'::text[]) into old_districts from public.provider_service_areas where provider_id=actor;
 if existed and previous.display_name=display and previous.bio=biography and identity_data.document_number=document
 and identity_data.business_name=business and old_districts=chosen then
  response:=jsonb_build_object('id',actor,'approval_status',previous.approval_status,'updated_at',previous.updated_at);
  perform ajura_internal.remember_write_attempt('onboarding',submission_key,payload,response);return response;
 end if;
 if existed and previous.updated_at is distinct from expected_updated_at then
  raise exception 'Seu cadastro foi alterado em outra tela. Reabra para conferir os dados antes de salvar' using errcode='40001';
 end if;
 insert into public.provider_profiles(id,display_name,bio) values(actor,display,biography)
 on conflict(id) do update set display_name=excluded.display_name,bio=excluded.bio,updated_at=clock_timestamp()
 where (provider_profiles.display_name,provider_profiles.bio) is distinct from (excluded.display_name,excluded.bio);
 insert into public.provider_private_details(provider_id,document_number,business_name) values(actor,document,business)
 on conflict(provider_id) do update set document_number=excluded.document_number,business_name=excluded.business_name,updated_at=clock_timestamp()
 where (provider_private_details.document_number,provider_private_details.business_name) is distinct from (excluded.document_number,excluded.business_name);
 insert into public.provider_service_areas(provider_id,district) select actor,d from unnest(chosen) d on conflict do nothing;
 delete from public.provider_service_areas where provider_id=actor and not(district=any(chosen));
 update public.provider_profiles set updated_at=clock_timestamp() where id=actor;
 select jsonb_build_object('id',id,'approval_status',approval_status,'updated_at',updated_at) into response from public.provider_profiles where id=actor;
 perform ajura_internal.remember_write_attempt('onboarding',submission_key,payload,response);return response;
end; $$;

-- Não remove registros para conseguir impor unicidade.
do $$ begin
 if exists(select 1 from public.provider_services group by provider_id,category,subcategory having count(*)>1) then
  raise exception 'Existem ofertas repetidas por atividade. Revise os registros antes de aplicar esta migração';
 end if;
end; $$;
create unique index if not exists provider_service_activity_unique on public.provider_services(provider_id,category,subcategory);

create or replace function public.add_provider_services_once(services jsonb,submission_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); response jsonb; item jsonb; existing public.provider_services%rowtype;
 category_name text; sub text; title_text text; description_text text; price_type text; price numeric; saved_id bigint;
 ids jsonb:='[]'::jsonb; added integer:=0; reused integer:=0;
begin
 perform 1 from public.profiles a join public.provider_profiles p on p.id=a.id
 where a.id=actor and a.status='active' and a.account_type in ('provider','both') and p.approval_status<>'suspended' for update of p;
 if not found then raise exception 'Cadastro profissional ativo necessário' using errcode='42501';end if;
 if services is null or jsonb_typeof(services)<>'array' or jsonb_array_length(services) not between 1 and 100 then raise exception 'Selecione de um a cem serviços por envio' using errcode='23514';end if;
 response:=ajura_internal.check_write_attempt('services',submission_key,services);if response is not null then return response;end if;
 if exists(select 1 from jsonb_array_elements(services) x group by x->>'category',x->>'subcategory' having count(*)>1) then raise exception 'A seleção contém a mesma atividade mais de uma vez' using errcode='23514';end if;
 for item in select value from jsonb_array_elements(services) loop
  if jsonb_typeof(item)<>'object' then raise exception 'Serviço inválido' using errcode='23514';end if;
  category_name:=btrim(item->>'category');sub:=btrim(item->>'subcategory');title_text:=btrim(item->>'title');description_text:=btrim(item->>'description');price_type:=item->>'pricing_type';price:=null;
  if category_name is null or sub is null or not exists(select 1 from public.service_activity_catalog c where c.category=category_name and c.subcategory=sub)
  or title_text is null or char_length(title_text) not between 3 and 120 or description_text is null or char_length(description_text) not between 10 and 1000
  or price_type is null or price_type not in ('fixed','quote') then raise exception 'Confira a atividade, descrição e forma de cobrança de cada serviço' using errcode='23514';end if;
  if price_type='fixed' then
   if jsonb_typeof(item->'starting_price') is distinct from 'number' then raise exception 'Informe um preço inicial válido' using errcode='23514';end if;
   price:=(item->>'starting_price')::numeric;
   if price<0 or price>9999999999.99 or price<>round(price,2) then raise exception 'Confira o preço: use até duas casas decimais' using errcode='23514';end if;
  end if;
  select * into existing from public.provider_services s where s.provider_id=actor and s.category=category_name and s.subcategory=sub;
  if found then
   if (existing.description,existing.pricing_type,existing.starting_price) is distinct from (description_text,price_type,price) then raise exception 'Esta atividade já está cadastrada com outros dados. Use Editar escopo e preço' using errcode='23505';end if;
   saved_id:=existing.id;reused:=reused+1;
  else
   insert into public.provider_services(provider_id,category,subcategory,title,description,pricing_type,starting_price)
   values(actor,category_name,sub,title_text,description_text,price_type,price) returning id into saved_id;added:=added+1;
  end if;
  ids:=ids||jsonb_build_array(saved_id);
 end loop;
 response:=jsonb_build_object('service_ids',ids,'inserted_count',added,'reused_count',reused);
 perform ajura_internal.remember_write_attempt('services',submission_key,services,response);return response;
end; $$;

create or replace function public.send_request_message_once(target_request uuid,message_text text,submission_key uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r public.service_requests%rowtype; payload jsonb; response jsonb; result_id bigint; note text:=btrim(message_text);
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and status='active') then raise exception 'Conta ativa necessária' using errcode='42501';end if;
 select * into r from public.service_requests where id=target_request and actor in(client_id,provider_id) for update;
 if not found then raise exception 'Conversa indisponível' using errcode='42501';end if;
 if note is null or char_length(note) not between 1 and 2000 then raise exception 'Escreva uma mensagem de até 2000 caracteres' using errcode='23514';end if;
 payload:=jsonb_build_object('request',target_request,'body',note);response:=ajura_internal.check_write_attempt('message',submission_key,payload);if response is not null then return (response->>'id')::bigint;end if;
 if r.status not in('requested','in_progress') then raise exception 'Pedido encerrado. Use a Central para solicitar ajuda';end if;
 insert into public.request_messages(request_id,sender_id,body) values(r.id,actor,note) returning id into result_id;
 perform ajura_internal.remember_write_attempt('message',submission_key,payload,jsonb_build_object('id',result_id));return result_id;
end; $$;
create or replace function public.send_support_message_once(target_ticket uuid,message_text text,submission_key uuid)
returns bigint language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); request_uuid uuid; ticket public.support_tickets%rowtype; payload jsonb; response jsonb; result_id bigint; note text:=btrim(message_text); is_admin boolean;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and status='active') then raise exception 'Conta ativa necessária' using errcode='42501';end if;
 select request_id into request_uuid from public.support_tickets where id=target_ticket;
 perform 1 from public.service_requests where id=request_uuid for update;
 select * into ticket from public.support_tickets where id=target_ticket for update;
 is_admin:=public.admin_is_current_user();
 if ticket.id is null or (not is_admin and not public.ajura_message_participant(request_uuid)) then raise exception 'Atendimento indisponível' using errcode='42501';end if;
 if note is null or char_length(note) not between 1 and 2000 then raise exception 'Escreva uma mensagem de até 2000 caracteres' using errcode='23514';end if;
 payload:=jsonb_build_object('ticket',target_ticket,'body',note);response:=ajura_internal.check_write_attempt('support-message',submission_key,payload);if response is not null then return (response->>'id')::bigint;end if;
 if ticket.status<>'open' then raise exception 'Atendimento encerrado';end if;
 insert into public.support_messages(ticket_id,sender_id,sender_role,body) values(ticket.id,actor,case when is_admin then 'central' else 'participant' end,note) returning id into result_id;
 perform ajura_internal.remember_write_attempt('support-message',submission_key,payload,jsonb_build_object('id',result_id));return result_id;
end; $$;
revoke all on function public.save_provider_onboarding(jsonb,text[],uuid,timestamptz),public.add_provider_services_once(jsonb,uuid),public.send_request_message_once(uuid,text,uuid),public.send_support_message_once(uuid,text,uuid) from public,anon;
grant execute on function public.save_provider_onboarding(jsonb,text[],uuid,timestamptz),public.add_provider_services_once(jsonb,uuid),public.send_request_message_once(uuid,text,uuid),public.send_support_message_once(uuid,text,uuid) to authenticated;
alter policy quote_participants_read on public.request_quotes using(exists(select 1 from public.service_requests r where r.id=request_id and (select auth.uid()) in(r.client_id,r.provider_id)));
