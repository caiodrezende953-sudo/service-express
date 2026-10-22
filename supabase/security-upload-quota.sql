create schema if not exists ajura_internal;
grant usage on schema ajura_internal to authenticated;
create or replace function ajura_internal.upload_within_quota(target_bucket text, target_path text)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); scope_prefix text; quota integer; used bigint;
begin
 if actor is null or split_part(target_path,'/',1)<>actor::text
 or target_bucket not in ('provider-verification','request-attachments')
 or not exists(select 1 from public.profiles where id=actor and status='active') then return false; end if;
 if target_bucket='provider-verification' then scope_prefix:=actor::text||'/';quota:=10;
 else
  if split_part(target_path,'/',2) !~ '^[0-9a-f-]{36}$' then return false; end if;
  scope_prefix:=actor::text||'/'||split_part(target_path,'/',2)||'/';quota:=5;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ajura-upload:'||target_bucket||':'||scope_prefix,0));
 select count(*) into used from storage.objects o where o.bucket_id=target_bucket and left(o.name,length(scope_prefix))=scope_prefix;
 return used<quota;
end;$$;
revoke all on function ajura_internal.upload_within_quota(text,text) from public,anon;
grant execute on function ajura_internal.upload_within_quota(text,text) to authenticated;
drop policy if exists ajura_upload_quota on storage.objects;
create policy ajura_upload_quota on storage.objects as restrictive for insert to authenticated
with check (bucket_id not in ('provider-verification','request-attachments')
 or ajura_internal.upload_within_quota(bucket_id,name));
