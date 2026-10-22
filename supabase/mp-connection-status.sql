begin;
create or replace function public.mp_my_test_connection()
returns table (mp_user_id bigint, connected_at timestamptz, token_expires_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select c.mp_user_id, c.connected_at, c.token_expires_at
  from public.mp_provider_connections c
  where c.provider_id = (select auth.uid())
    and c.environment = 'test';
$$;
revoke all on function public.mp_my_test_connection() from public, anon;
grant execute on function public.mp_my_test_connection() to authenticated;
commit;
