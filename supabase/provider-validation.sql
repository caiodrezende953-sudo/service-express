-- AJURA etapa 3: executar uma vez, antes de instalar a interface.
-- Não apaga registros nem muda aprovações existentes.
begin;
create or replace function public.ajura_document_valid(document text)
returns boolean language plpgsql immutable strict set search_path = '' as $$
declare
 d text := upper(regexp_replace(trim(document), '[./[:space:]-]', '', 'g'));
 size integer; i integer; total integer; digit integer; remainder integer;
begin
 if d ~ '^([0-9])\1+$' then return false; end if;
 if d ~ '^[0-9]{11}$' then
  for size in 9..10 loop
   total := 0;
   for i in 1..size loop total := total + (ascii(substr(d,i,1))-48) * (size+2-i); end loop;
   digit := ((total * 10) % 11) % 10;
   if digit <> ascii(substr(d,size+1,1))-48 then return false; end if;
  end loop;
  return true;
 end if;
 if d !~ '^[A-Z0-9]{12}[0-9]{2}$' then return false; end if;
 for size in 12..13 loop
  total := 0;
  for i in 1..size loop total := total + (ascii(substr(d,i,1))-48) * ((size-i)%8+2); end loop;
  remainder := total % 11;
  digit := case when remainder < 2 then 0 else 11-remainder end;
  if digit <> ascii(substr(d,size+1,1))-48 then return false; end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.ajura_document_valid(text) from public;
grant execute on function public.ajura_document_valid(text) to authenticated;
-- Substitui somente a restrição numérica criada na etapa anterior.
alter table public.provider_private_details drop constraint if exists provider_private_details_document_number_check;
alter table public.provider_private_details drop constraint if exists provider_identity_document_valid;
alter table public.provider_private_details add constraint provider_identity_document_valid
 check (public.ajura_document_valid(document_number)) not valid;

create or replace function public.ajura_provider_missing(target_provider uuid)
returns text[] language plpgsql stable security definer set search_path = '' as $$
declare gaps text[] := '{}'::text[];
begin
 if not exists (select 1 from public.profiles p where p.id=target_provider
  and p.status='active' and p.account_type in ('provider','both')) then
  gaps := array_append(gaps,'Conta ativa com perfil prestador ou ambos');
 end if;
 if not exists (select 1 from public.profiles p where p.id=target_provider
  and length(trim(p.full_name)) >= 3 and p.phone ~ '^[0-9]{10,11}$') then
  gaps := array_append(gaps,'Nome e telefone da conta');
 end if;
 if not exists (select 1 from public.provider_profiles p where p.id=target_provider
  and length(trim(p.display_name)) >= 3) then
  gaps := array_append(gaps,'Nome profissional exibido aos clientes');
 end if;
 if not exists (select 1 from public.provider_private_details d where d.provider_id=target_provider
  and public.ajura_document_valid(d.document_number) and length(trim(d.business_name)) >= 3) then
  gaps := array_append(gaps,'CPF/CNPJ válido e nome completo ou razão social');
 end if;
 if not exists (select 1 from public.provider_service_areas a where a.provider_id=target_provider) then
  gaps := array_append(gaps,'Pelo menos um bairro atendido');
 end if;
 if not exists (select 1 from public.provider_services s where s.provider_id=target_provider and s.active) then
  gaps := array_append(gaps,'Pelo menos um serviço ativo');
 end if;
 if exists (select 1 from public.provider_services s left join public.service_taxonomy t
  on t.category=s.category and t.subcategory=s.subcategory
  where s.provider_id=target_provider and s.active and t.category is null) then
  gaps := array_append(gaps,'Corrigir serviços ativos fora do catálogo');
 end if;
 return gaps;
end;
$$;
revoke all on function public.ajura_provider_missing(uuid) from public, anon, authenticated;

create or replace function public.provider_approval_checklist(target_provider uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare gaps text[];
begin
 if auth.uid() is null or target_provider is null or
  (target_provider <> auth.uid() and not public.admin_is_current_user()) then
  raise exception 'Acesso não autorizado' using errcode='42501';
 end if;
 gaps := public.ajura_provider_missing(target_provider);
 return jsonb_build_object('ready', cardinality(gaps)=0, 'missing', to_jsonb(gaps));
end;
$$;
revoke all on function public.provider_approval_checklist(uuid) from public, anon;
grant execute on function public.provider_approval_checklist(uuid) to authenticated;

create or replace function public.ajura_require_complete_provider()
returns trigger language plpgsql security definer set search_path = '' as $$
declare gaps text[];
begin
 if new.approval_status='approved' and (tg_op='INSERT' or old.approval_status is distinct from 'approved') then
  gaps := public.ajura_provider_missing(new.id);
  if cardinality(gaps)>0 then
   raise exception 'Cadastro incompleto: %', array_to_string(gaps,'; ') using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.ajura_require_complete_provider() from public, anon, authenticated;
drop trigger if exists ajura_require_complete_provider on public.provider_profiles;
create trigger ajura_require_complete_provider before insert or update of approval_status on public.provider_profiles
 for each row execute function public.ajura_require_complete_provider();
commit;
-- Diagnóstico sem exibir CPF/CNPJ ou dados pessoais:
select count(*) as cadastros_com_documento_a_corrigir
from public.provider_private_details where not public.ajura_document_valid(document_number);
