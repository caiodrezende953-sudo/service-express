-- Correção para a migração já executada. Não remove dados.
-- Impede que o próprio prestador altere status ou data de aprovação.
revoke insert, update on table public.provider_profiles from authenticated;
grant insert (id, display_name, bio) on table public.provider_profiles to authenticated;
grant update (display_name, bio, updated_at) on table public.provider_profiles to authenticated;
