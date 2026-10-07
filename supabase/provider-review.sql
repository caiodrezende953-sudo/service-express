-- AJURA: invalida a aprovação quando o cadastro aprovado é alterado.
-- Execute antes de aprovar qualquer prestador. Não modifica linhas existentes.

create or replace function public.provider_profile_recheck()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.approval_status = 'approved' and
    (new.display_name is distinct from old.display_name or new.bio is distinct from old.bio) then
    new.approval_status := 'pending';
    new.approved_at := null;
  end if;
  return new;
end;
$$;

create trigger provider_profile_recheck_trigger
before update on public.provider_profiles
for each row execute function public.provider_profile_recheck();

create or replace function public.provider_catalog_recheck()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  affected_provider uuid;
begin
  if tg_op = 'DELETE' then affected_provider := old.provider_id;
  else affected_provider := new.provider_id;
  end if;
  update public.provider_profiles
  set approval_status = 'pending', approved_at = null, updated_at = now()
  where id = affected_provider
    and approval_status = 'approved';
  if tg_op = 'DELETE' then return old;
  else return new;
  end if;
end;
$$;

create trigger provider_service_recheck_trigger
after insert or update or delete on public.provider_services
for each row execute function public.provider_catalog_recheck();

create trigger provider_area_recheck_trigger
after insert or delete on public.provider_service_areas
for each row execute function public.provider_catalog_recheck();

-- Consulta administrativa (execute separadamente para selecionar a pessoa certa):
-- select p.id, a.full_name, p.display_name, p.approval_status, p.created_at,
--   (select count(*) from public.provider_services s where s.provider_id = p.id) as services,
--   (select count(*) from public.provider_service_areas d where d.provider_id = p.id) as districts
-- from public.provider_profiles p join public.profiles a on a.id = p.id
-- order by p.created_at desc;

-- Aprovação manual: substitua o UUID apenas após conferir o cadastro.
-- update public.provider_profiles p
-- set approval_status = 'approved', approved_at = now(), updated_at = now()
-- where p.id = 'COLE_UUID_AQUI'::uuid and p.approval_status = 'pending'
--   and exists (select 1 from public.provider_services s where s.provider_id = p.id and s.active)
--   and exists (select 1 from public.provider_service_areas d where d.provider_id = p.id)
-- returning id, display_name, approval_status;
