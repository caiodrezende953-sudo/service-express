const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
async function bootstrap(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.actor',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant select,insert,delete on storage.objects to authenticated;
 create table public.mp_provider_connections(provider_id uuid,environment text,mp_user_id bigint,connected_at timestamptz,token_expires_at timestamptz);
 `);
 const files=['schema','client-profile','provider-review','service-taxonomy','admin-review','provider-onboarding','provider-files','provider-validation','fix-provider-approval','admin-dashboard','admin-provider-status','service-requests','request-client-profile','request-quotes','request-files','messaging-support','request-overview','service-codes','service-reviews','review-moderation','service-cancellation','request-location','payment-test-base','mp-connection-status','order-panel-summary','security-active-access','security-private-files','security-provider-writes','security-private-rpc','security-upload-quota','quote-idempotency','activity-catalog'];
 for(const file of files){try{await db.exec(read('supabase/'+file+'.sql'));}catch(e){throw Error(file+': '+e.message,{cause:e});}}
 return db;
}
async function upgrades(db){
 for(const file of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
  try{await db.exec(read('supabase/migrations/'+file));}catch(e){throw Error(file+': '+e.message,{cause:e});}
 }
}
const ids={client:'00000000-0000-0000-0000-000000000001',provider:'00000000-0000-0000-0000-000000000002',admin:'00000000-0000-0000-0000-000000000003',third:'00000000-0000-0000-0000-000000000004'};
async function fixtures(db){
 for(const [role,id] of Object.entries(ids))await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{full_name:role+' Teste',phone:'92999999999',district:'Tarumã',account_type:role==='provider'?'both':'client'}]);
 await db.query("update public.profiles set address_line='Rua de teste',address_number='S/N'");
 await db.query('insert into public.platform_admins(user_id) values($1)',[ids.admin]);
}
async function actor(db,id,role='authenticated'){
 await db.exec('reset role');await db.query("select set_config('app.actor',$1,false)",[id||'']);await db.exec('set role '+role);
}
module.exports={bootstrap,upgrades,fixtures,actor,ids,read};
