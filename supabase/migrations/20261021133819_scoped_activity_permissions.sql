-- Aprovação vinculada à atividade exata. Nenhuma habilitação antiga é ampliada.
create table if not exists public.provider_activity_permissions (
 provider_id uuid not null references public.provider_profiles(id),
 category text not null, subcategory text not null,
 status text not null check(status in('approved','rejected')),
 registration text not null check(char_length(btrim(registration)) between 3 and 160),
 evidence_note text not null check(char_length(btrim(evidence_note)) between 10 and 1000),
 reviewer uuid not null references public.profiles(id), reviewed_at timestamptz not null default now(),
 primary key(provider_id,category,subcategory),
 foreign key(category,subcategory) references public.service_activity_catalog(category,subcategory)
);
alter table public.provider_activity_permissions enable row level security;
revoke all on public.provider_activity_permissions from public,anon,authenticated;
grant select on public.provider_activity_permissions to authenticated;
drop policy if exists scoped_activity_owner_admin on public.provider_activity_permissions;
create policy scoped_activity_owner_admin on public.provider_activity_permissions for select to authenticated
using(public.admin_is_current_user() or(provider_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and status='active')));
create table if not exists ajura_internal.activity_permission_events (
 id bigint generated always as identity primary key,
 provider_id uuid not null references public.provider_profiles(id),
 category text not null,subcategory text not null,profession text not null,specialty text not null,
 status text not null check(status in('approved','rejected')),registration text not null,evidence_note text not null,
 reviewer uuid not null references public.profiles(id),reviewed_at timestamptz not null default now()
);
alter table ajura_internal.activity_permission_events enable row level security;
revoke all on ajura_internal.activity_permission_events from public,anon,authenticated;
create index if not exists activity_permission_history on ajura_internal.activity_permission_events(provider_id,reviewed_at desc,id desc);
create index if not exists activity_permission_catalog_fk on public.provider_activity_permissions(category,subcategory);
create index if not exists activity_permission_reviewer_fk on public.provider_activity_permissions(reviewer);
create index if not exists activity_event_reviewer_fk on ajura_internal.activity_permission_events(reviewer);

create or replace function public.ajura_activity_allowed(target_provider uuid,target_category text,target_subcategory text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=(select auth.uid()) and status='active')
 and exists(select 1 from public.service_activity_catalog c where c.category=target_category and c.subcategory=target_subcategory
 and(not c.regulated or exists(select 1 from public.provider_activity_permissions v where v.provider_id=target_provider
 and v.category=c.category and v.subcategory=c.subcategory and v.status='approved')));
$$;
-- O RPC antigo não pode continuar concedendo um grupo inteiro por engano.
create or replace function public.admin_review_activity(target_provider uuid,target_profession text,target_specialty text,decision text,registration_text text,evidence text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.admin_is_current_user() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 raise exception 'Atualize a interface: a habilitação deve identificar o serviço exato, não um grupo inteiro' using errcode='23514';
end; $$;
create or replace function public.admin_review_service_activity(target_provider uuid,target_category text,target_subcategory text,decision text,registration_text text,evidence text,expected_reviewed_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare c public.service_activity_catalog%rowtype; previous public.provider_activity_permissions%rowtype; target_status text;
begin
 if not public.admin_is_current_user() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 if decision is null or decision not in('approved','rejected') or registration_text is null or char_length(btrim(registration_text)) not between 3 and 160
 or evidence is null or char_length(btrim(evidence)) not between 10 and 1000 then raise exception 'Confira decisão, registro e evidência' using errcode='23514';end if;
 select approval_status into target_status from public.provider_profiles where id=target_provider for update;
 if not found then raise exception 'Prestador não encontrado';end if;
 if decision='approved' and(target_status='suspended' or not exists(select 1 from public.profiles where id=target_provider and status='active' and account_type in('provider','both'))) then raise exception 'Não é possível aprovar habilitação de prestador suspenso ou sem conta ativa' using errcode='42501';end if;
 select * into c from public.service_activity_catalog where category=target_category and subcategory=target_subcategory and regulated;
 if not found or not exists(select 1 from public.provider_services where provider_id=target_provider and category=target_category and subcategory=target_subcategory) then raise exception 'Serviço regulamentado não cadastrado para este prestador' using errcode='23514';end if;
 select * into previous from public.provider_activity_permissions where provider_id=target_provider and category=target_category and subcategory=target_subcategory;
 if previous.reviewed_at is distinct from expected_reviewed_at then raise exception 'A habilitação mudou. Atualize a tela antes de decidir' using errcode='40001';end if;
 insert into public.provider_activity_permissions(provider_id,category,subcategory,status,registration,evidence_note,reviewer)
 values(target_provider,target_category,target_subcategory,decision,btrim(registration_text),btrim(evidence),auth.uid())
 on conflict(provider_id,category,subcategory) do update set status=excluded.status,registration=excluded.registration,evidence_note=excluded.evidence_note,reviewer=excluded.reviewer,reviewed_at=clock_timestamp();
 insert into ajura_internal.activity_permission_events(provider_id,category,subcategory,profession,specialty,status,registration,evidence_note,reviewer)
 values(target_provider,c.category,c.subcategory,c.profession,c.specialty,decision,btrim(registration_text),btrim(evidence),auth.uid());
end; $$;
create or replace function public.admin_activity_provider(target_provider uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_is_current_user() then raise exception 'Acesso não autorizado' using errcode='42501';end if;
 select jsonb_build_object('id',p.id,'display_name',p.display_name,'approval_status',p.approval_status,
 'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'category',s.category,'subcategory',s.subcategory,'profession',c.profession,'specialty',c.specialty,'regulated',c.regulated,'active',s.active,'permission_status',v.status,'registration',v.registration,'evidence_note',v.evidence_note,'reviewed_at',v.reviewed_at) order by s.category,s.subcategory)
 from public.provider_services s join public.service_activity_catalog c on c.category=s.category and c.subcategory=s.subcategory
 left join public.provider_activity_permissions v on v.provider_id=s.provider_id and v.category=s.category and v.subcategory=s.subcategory where s.provider_id=p.id),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(to_jsonb(e) order by e.reviewed_at desc,e.id desc) from(select id,category,subcategory,status,registration,evidence_note,reviewed_at from ajura_internal.activity_permission_events where provider_id=p.id order by reviewed_at desc,id desc limit 20)e),'[]'::jsonb))
 into result from public.provider_profiles p where p.id=target_provider;
 if result is null then raise exception 'Prestador não encontrado';end if;return result;
end; $$;

-- Revogação impede novo início/conclusão; a Central trata o caso sem forçar estados.
create or replace function public.ajura_execution_activity_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in('in_progress','completed') and new.status is distinct from old.status
 and not exists(select 1 from public.provider_services s where s.id=new.service_id and public.ajura_activity_allowed(s.provider_id,s.category,s.subcategory)) then
  raise exception 'A habilitação deste serviço precisa ser conferida. Procure a Central' using errcode='42501';
 end if;return new;
end; $$;
drop trigger if exists ajura_execution_activity_guard on public.service_requests;
create trigger ajura_execution_activity_guard before update of status on public.service_requests for each row execute function public.ajura_execution_activity_guard();
revoke all on function public.ajura_execution_activity_guard() from public,anon,authenticated;
revoke all on function public.ajura_activity_allowed(uuid,text,text),public.admin_review_activity(uuid,text,text,text,text,text),public.admin_review_service_activity(uuid,text,text,text,text,text,timestamptz),public.admin_activity_provider(uuid) from public,anon;
grant execute on function public.ajura_activity_allowed(uuid,text,text),public.admin_review_activity(uuid,text,text,text,text,text),public.admin_review_service_activity(uuid,text,text,text,text,text,timestamptz),public.admin_activity_provider(uuid) to authenticated;

create or replace function ajura_internal.guard_code_permission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.service_requests r join public.provider_services s on s.id=r.service_id
 where r.id=new.request_id and public.ajura_activity_allowed(r.provider_id,s.category,s.subcategory)) then
  raise exception 'A habilitação deste serviço precisa ser conferida antes de emitir códigos. Procure a Central' using errcode='42501';
 end if;return new;
end; $$;
revoke all on function ajura_internal.guard_code_permission() from public,anon,authenticated;
drop trigger if exists ajura_code_permission on public.service_confirmation_codes;
create trigger ajura_code_permission before insert or update of salt,code_hash on public.service_confirmation_codes for each row execute function ajura_internal.guard_code_permission();
