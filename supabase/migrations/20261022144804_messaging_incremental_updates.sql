-- Consulta incremental somente de leitura. Não muda mensagens, pedidos ou recibos.
set lock_timeout='5s';
set statement_timeout='30s';
create index if not exists ajura_support_request_idx on public.support_tickets(request_id,id);
create or replace function ajura_internal.messaging_updates(target_request uuid,after_message text,after_support text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid:=(select auth.uid()); normal_cursor bigint; support_cursor bigint;
 r public.service_requests%rowtype; a jsonb; b jsonb; normal_more boolean; support_more boolean;
 state jsonb; active_ticket uuid; quotes jsonb;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and status='active') then
  raise exception 'Conta ativa necessária' using errcode='42501';
 end if;
 select * into r from public.service_requests where id=target_request;
 if r.id is null or (actor not in(r.client_id,r.provider_id) and not
  (public.admin_is_current_user() and exists(select 1 from public.support_tickets where request_id=target_request))) then
  raise exception 'Conversa indisponível' using errcode='42501';
 end if;
 if after_message is null or after_support is null or after_message!~'^[0-9]{1,19}$' or after_support!~'^[0-9]{1,19}$' then
  raise exception 'Cursor inválido' using errcode='22023';
 end if;
 if after_message::numeric>9223372036854775807 or after_support::numeric>9223372036854775807 then
  raise exception 'Cursor inválido' using errcode='22023';
 end if;
 normal_cursor:=after_message::bigint; support_cursor:=after_support::bigint;
 if normal_cursor>0 and not exists(select 1 from public.request_messages where request_id=r.id and id=normal_cursor) then
  raise exception 'Cursor de outra conversa' using errcode='22023';
 end if;
 if support_cursor>0 and not exists(select 1 from public.support_messages m join public.support_tickets t on t.id=m.ticket_id where t.request_id=r.id and m.id=support_cursor) then
  raise exception 'Cursor de outro atendimento' using errcode='22023';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id::text,'sender_id',x.sender_id,'body',x.body,'created_at',x.created_at) order by x.id) filter(where x.pos<=50),'[]'::jsonb),count(*)>50 into a,normal_more
 from (select m.*,row_number() over(order by m.id) pos from
  (select id,sender_id,body,created_at from public.request_messages where request_id=r.id and id>normal_cursor order by id limit 51)m)x;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id::text,'ticket_id',x.ticket_id,'sender_id',x.sender_id,'sender_role',x.sender_role,'body',x.body,'created_at',x.created_at) order by x.id) filter(where x.pos<=50),'[]'::jsonb),count(*)>50 into b,support_more
 from (select m.*,row_number() over(order by m.id) pos from
  (select m.id,m.ticket_id,m.sender_id,m.sender_role,m.body,m.created_at from public.support_tickets t join public.support_messages m on m.ticket_id=t.id where t.request_id=r.id and m.id>support_cursor order by m.id limit 51)m)x;
 select id into active_ticket from public.support_tickets where request_id=r.id and status='open';
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'status',q.status,'scheduled_date',q.scheduled_date,'amount',q.amount) order by q.id),'[]'::jsonb) into quotes
 from public.request_quotes q where q.request_id=r.id and q.status in('pending','accepted');
 state:=jsonb_build_object('status',r.status,'preferred_date',r.preferred_date,'quotes',quotes,'active_ticket',active_ticket);
 return jsonb_build_object('request_id',r.id,'state',state,'state_version',md5(state::text),
  'messages',a,'support',b,'more_messages',normal_more,'more_support',support_more,
  'next_message',coalesce(a->-1->>'id',normal_cursor::text),'next_support',coalesce(b->-1->>'id',support_cursor::text));
end; $$;
revoke all on function ajura_internal.messaging_updates(uuid,text,text) from public,anon,authenticated;
grant usage on schema ajura_internal to authenticated;
grant execute on function ajura_internal.messaging_updates(uuid,text,text) to authenticated;
create or replace function public.messaging_updates(target_request uuid,after_message text default '0',after_support text default '0')
returns jsonb language sql stable security invoker set search_path='' as $$
 select ajura_internal.messaging_updates(target_request,after_message,after_support);
$$;
revoke all on function public.messaging_updates(uuid,text,text) from public,anon;
grant execute on function public.messaging_updates(uuid,text,text) to authenticated;
reset lock_timeout;
reset statement_timeout;
notify pgrst,'reload schema';
