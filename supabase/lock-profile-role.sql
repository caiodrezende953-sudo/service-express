-- AJURA: impede troca de papel pelo navegador em projetos já criados.
-- Execute uma vez no SQL Editor após schema.sql.
begin;

revoke update (account_type) on table public.profiles from authenticated;
grant update (full_name, phone, district, updated_at) on table public.profiles to authenticated;

do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'account_type', 'UPDATE') then
    raise exception 'A conta autenticada ainda pode alterar account_type';
  end if;
end;
$$;

commit;
