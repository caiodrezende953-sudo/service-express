-- AJURA: aprovação administrativa do piloto.
-- Execute depois de provider-review.sql e service-taxonomy.sql.
-- Este arquivo não concede acesso administrativo a nenhuma conta.
alter table public.provider_profiles add column review_note text;

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from anon, authenticated;

create table public.provider_approval_events (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  admin_id uuid not null references public.platform_admins(user_id),
  decision text not null check (decision in ('approved', 'rejected')),
  note text,
  created_at timestamptz not null default now()
);
alter table public.provider_approval_events enable row level security;
revoke all on table public.provider_approval_events from anon, authenticated;

create or replace function public.admin_is_current_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

create or replace function public.admin_pending_providers()
returns table (
  provider_id uuid,
  display_name text,
  bio text,
  created_at timestamptz,
  areas jsonb,
  services jsonb
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.admin_is_current_user() then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  return query
  select p.id, p.display_name, p.bio, p.created_at,
    coalesce((select jsonb_agg(a.district order by a.district)
      from public.provider_service_areas a where a.provider_id = p.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'category', s.category, 'subcategory', s.subcategory,
      'title', s.title, 'description', s.description,
      'pricing_type', s.pricing_type, 'starting_price', s.starting_price,
      'active', s.active
    ) order by s.id)
      from public.provider_services s where s.provider_id = p.id), '[]'::jsonb)
  from public.provider_profiles p
  where p.approval_status = 'pending'
  order by p.created_at;
end;
$$;

create or replace function public.admin_decide_provider(target_provider uuid, decision text, reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  previous_status text;
begin
  if not public.admin_is_current_user() then
    raise exception 'Acesso administrativo necessário' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Decisão inválida';
  end if;
  if decision = 'rejected' and length(trim(coalesce(reason, ''))) < 10 then
    raise exception 'Explique a recusa em pelo menos 10 caracteres';
  end if;

  select p.approval_status into previous_status
  from public.provider_profiles p where p.id = target_provider for update;
  if not found or previous_status <> 'pending' then
    raise exception 'Cadastro pendente não encontrado';
  end if;

  if decision = 'approved' then
    if not exists (
      select 1 from public.profiles p where p.id = target_provider
        and p.status = 'active' and p.account_type in ('provider', 'both')
    ) or not exists (
      select 1 from public.provider_service_areas a where a.provider_id = target_provider
    ) or not exists (
      select 1 from public.provider_services s
      where s.provider_id = target_provider and s.active
    ) or exists (
      select 1 from public.provider_services s
      left join public.service_taxonomy t
        on t.category = s.category and t.subcategory = s.subcategory
      where s.provider_id = target_provider and s.active and t.category is null
    ) then
      raise exception 'Cadastro sem conta ativa, bairro ou serviço válido';
    end if;
  end if;

  update public.provider_profiles
  set approval_status = decision,
      approved_at = case when decision = 'approved' then now() else null end,
      review_note = case when decision = 'rejected' then trim(reason) else null end,
      updated_at = now()
  where id = target_provider;

  insert into public.provider_approval_events (provider_id, admin_id, decision, note)
  values (target_provider, auth.uid(), decision, case when decision = 'rejected' then trim(reason) else null end);
  return decision;
end;
$$;

create or replace function public.provider_resubmit()
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta' using errcode = '42501';
  end if;
  update public.provider_profiles
  set approval_status = 'pending', review_note = null, approved_at = null, updated_at = now()
  where id = auth.uid() and approval_status = 'rejected';
  if not found then
    raise exception 'Não há cadastro recusado para reenviar';
  end if;
  return 'pending';
end;
$$;

revoke all on function public.admin_is_current_user() from public, anon;
revoke all on function public.admin_pending_providers() from public, anon;
revoke all on function public.admin_decide_provider(uuid, text, text) from public, anon;
revoke all on function public.provider_resubmit() from public, anon;
grant execute on function public.admin_is_current_user() to authenticated;
grant execute on function public.admin_pending_providers() to authenticated;
grant execute on function public.admin_decide_provider(uuid, text, text) to authenticated;
grant execute on function public.provider_resubmit() to authenticated;

-- Configure a primeira conta administradora separadamente e só após conferir o UUID:
-- insert into public.platform_admins (user_id) values ('UUID_DA_SUA_CONTA'::uuid);
