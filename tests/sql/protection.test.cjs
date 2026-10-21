const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {bootstrap,upgrades,fixtures,actor,ids}=require('./bootstrap.cjs');
let db;
before(async()=>{db=await bootstrap();await upgrades(db);await fixtures(db);});
after(async()=>{await db?.close();});
const one=async(sql,args=[]) => (await db.query(sql,args)).rows[0];
const call=async(name,args)=> (await one('select public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') as value',args)).value;
async function rejected(fn,pattern){await db.exec('savepoint expected_error');try{await assert.rejects(fn,pattern);}finally{await db.exec('rollback to savepoint expected_error;release savepoint expected_error');}}
function check(name,fn){test(name,async()=>{await db.exec('begin');try{await fn();}finally{await db.exec('reset role;rollback');}});}
const identity={display_name:'Profissional de teste',bio:'Apresentação de teste',document_number:'52998224725',business_name:'Cadastro de teste'};
const offer=(row)=>({category:row.category,subcategory:row.subcategory,title:row.subcategory,description:'Serviço de teste completo',pricing_type:'quote',starting_price:null});
async function provider(regulated=false){
 await actor(db,ids.provider);
 const profile=await call('save_provider_onboarding',[identity,['Tarumã'],randomUUID(),null]);
 const row=await one('select category,subcategory from public.service_activity_catalog where regulated=$1 order by category,subcategory limit 1',[regulated]);
 const added=await call('add_provider_services_once',[[offer(row)],randomUUID()]);
 await db.exec('reset role');await db.query("update public.provider_profiles set approval_status='approved',approved_at=now() where id=$1",[ids.provider]);
 return {...row,service_id:added.service_ids[0],profile};
}
async function request(){const p=await provider();await actor(db,ids.client);const id=await call('create_service_request_with_location',[p.service_id,'Tarumã','Solicitação de teste completo','2099-01-01','on_site','Rua de teste','12',null,null,randomUUID()]);await actor(db,ids.provider);const q=await call('send_request_quote',[id,100,'Limpeza completa combinada','Produtos do profissional','2099-01-01']);await actor(db,ids.client);await call('respond_request_quote',[q,'accepted']);return {id,quote:q,...p};}
check('Cadastro atômico: falha tardia desfaz perfil, documento e bairros',async()=>{
 await db.exec(`create function public.test_area_failure() returns trigger language plpgsql as $$begin raise exception 'falha de teste depois da identidade';end$$;create trigger test_area_failure before insert on public.provider_service_areas for each row execute function public.test_area_failure();`);
 await actor(db,ids.provider);await rejected(()=>call('save_provider_onboarding',[identity,['Tarumã'],randomUUID(),null]),/falha de teste/);
 await db.exec('reset role');assert.equal((await one('select count(*)::int as n from public.provider_profiles')).n,0);assert.equal((await one('select count(*)::int as n from public.provider_private_details')).n,0);
});
check('Repetição e salvamento sem alteração preservam aprovação; conflito impede sobrescrita',async()=>{
 const p=await provider(),key=randomUUID();await actor(db,ids.provider);const first=await call('save_provider_onboarding',[identity,['Tarumã'],key,p.profile.updated_at]);const repeat=await call('save_provider_onboarding',[identity,['Tarumã'],key,null]);assert.deepEqual(first,repeat);assert.equal(first.approval_status,'approved');
 await rejected(()=>call('save_provider_onboarding',[{...identity,bio:'Outra apresentação'},['Tarumã'],randomUUID(),null]),/outra tela/);
 const changed=await call('save_provider_onboarding',[{...identity,bio:'Outra apresentação'},['Tarumã','Flores'],randomUUID(),first.updated_at]);assert.equal(changed.approval_status,'pending');
 await rejected(()=>call('save_provider_onboarding',[{...identity,bio:'Dados diferentes'},['Tarumã'],key,null]),/outra|usada|dados/).catch(e=>{throw e;});
});
check('Cliente e conta suspensa não escrevem cadastro profissional',async()=>{
 await actor(db,ids.client);await rejected(()=>call('save_provider_onboarding',[identity,['Tarumã'],randomUUID(),null]),/profissional/);
 await provider();await db.exec('reset role');await db.query("update public.provider_profiles set approval_status='suspended' where id=$1",[ids.provider]);await actor(db,ids.provider);await rejected(()=>call('save_provider_onboarding',[identity,['Tarumã'],randomUUID(),null]),/suspenso/);
});
check('Lote de serviços é atômico e não duplica após repetição ou nova chave',async()=>{
 const p=await provider();await actor(db,ids.provider);const row=await one('select category,subcategory from public.service_activity_catalog where not regulated and subcategory<>$1 order by category,subcategory limit 1',[p.subcategory]);const items=[offer(row)],key=randomUUID();const first=await call('add_provider_services_once',[items,key]);assert.deepEqual(await call('add_provider_services_once',[items,key]),first);assert.equal((await call('add_provider_services_once',[items,randomUUID()])).reused_count,1);
 await rejected(()=>call('add_provider_services_once',[[offer(row),{...offer(row),subcategory:'inexistente'}],randomUUID()]),/Confira/);
 assert.equal((await one('select count(*)::int as n from public.provider_services where provider_id=$1',[ids.provider])).n,2);
 await rejected(()=>call('add_provider_services_once',[[{...offer(row),description:'Outro escopo informado'}],randomUUID()]),/Editar/);
});
check('Mensagens repetidas devolvem o recibo; terceiros e alteração da mesma tentativa são bloqueados',async()=>{
 const r=await request(),key=randomUUID();const id=await call('send_request_message_once',[r.id,'Mensagem de teste',key]);assert.equal(await call('send_request_message_once',[r.id,'Mensagem de teste',key]),id);
 await rejected(()=>call('send_request_message_once',[r.id,'Mensagem diferente',key]),/outros dados/);assert.equal((await one('select count(*)::int as n from public.request_messages where request_id=$1',[r.id])).n,1);
 await actor(db,ids.third);await rejected(()=>call('send_request_message_once',[r.id,'Acesso indevido',randomUUID()]),/indisponível/);
 await rejected(()=>db.query('select * from ajura_internal.write_attempts'),/permission denied/);
});
check('Mensagem à Central repete o recibo e somente participantes ou administradores enviam',async()=>{
 const r=await request(),ticket=await call('open_support_ticket',[r.id,'Preciso de ajuda neste atendimento']),key=randomUUID();const first=await call('send_support_message_once',[ticket,'Mensagem de teste à Central',key]);assert.equal(await call('send_support_message_once',[ticket,'Mensagem de teste à Central',key]),first);await actor(db,ids.third);await rejected(()=>call('send_support_message_once',[ticket,'Sem autorização',randomUUID()]),/indisponível/);await actor(db,ids.admin);const reply=await call('send_support_message_once',[ticket,'Resposta da equipe da Central',randomUUID()]);await db.exec('reset role');assert.equal((await one('select sender_role from public.support_messages where id=$1',[reply])).sender_role,'central');
});
check('Permissão de atividade é exata, auditada e sem ampliação por profissão genérica',async()=>{
 await provider(true);await db.exec('reset role');const rows=(await db.query("select category,subcategory from public.service_activity_catalog where regulated and profession='Profissional de reabilitação' order by category,subcategory limit 2")).rows;assert.equal(rows.length,2);await actor(db,ids.provider);await call('add_provider_services_once',[rows.map(offer),randomUUID()]);
 await actor(db,ids.admin);await call('admin_review_service_activity',[ids.provider,rows[0].category,rows[0].subcategory,'approved','Registro teste','Evidência conferida em ambiente de teste',null]);
 assert.equal(await call('ajura_activity_allowed',[ids.provider,rows[0].category,rows[0].subcategory]),true);assert.equal(await call('ajura_activity_allowed',[ids.provider,rows[1].category,rows[1].subcategory]),false);
 await rejected(()=>call('admin_review_activity',[ids.provider,'Profissional de reabilitação','Atuação geral','approved','Teste','Evidência teste']),/serviço exato/);
 const state=await call('admin_activity_provider',[ids.provider]);assert.equal(state.history.length,1);await rejected(()=>call('admin_review_service_activity',[ids.provider,rows[0].category,rows[0].subcategory,'rejected','Registro teste','Revisão administrativa de teste',null]),/mudou/);
 await actor(db,ids.client);await rejected(()=>call('admin_activity_provider',[ids.provider]),/autorizado/);
});
check('Reagendamento depende do cliente e preserva valor, escopo e endereço',async()=>{
 const r=await request();await actor(db,ids.provider);const key=randomUUID(),s=await call('propose_request_schedule',[r.id,'2099-02-01','Ajuste de disponibilidade informado',key]);assert.equal(await call('propose_request_schedule',[r.id,'2099-02-01','Ajuste de disponibilidade informado',key]),s);
 await rejected(()=>call('respond_request_schedule',[s,'accepted']),/Cliente/);await actor(db,ids.client);assert.equal((await one('select scheduled_date::text as date from public.request_quotes where id=$1',[r.quote])).date,'2099-01-01');
 const reply=await call('respond_request_schedule',[s,'accepted']);assert.deepEqual(await call('respond_request_schedule',[s,'accepted']),reply);
 const q=await one('select amount,scope,materials,scheduled_date::text as date from public.request_quotes where id=$1',[reply.quote_id]);assert.equal(Number(q.amount),100);assert.equal(q.scope,'Limpeza completa combinada');assert.equal(q.date,'2099-02-01');assert.equal((await call('request_location_context',[r.id])).address.line,'Rua de teste');
 await db.exec('reset role');assert.equal((await one("select count(*)::int as n from public.request_quotes where request_id=$1 and status='accepted'",[r.id])).n,1);
});
check('Recusa do reagendamento preserva a proposta aceita e terceiros não consultam',async()=>{
 const r=await request();await actor(db,ids.provider);const s=await call('propose_request_schedule',[r.id,'2099-02-01','Ajuste de disponibilidade informado',randomUUID()]);await actor(db,ids.third);await rejected(()=>call('request_schedule_context',[r.id]),/autorizado/);await actor(db,ids.client);await call('respond_request_schedule',[s,'rejected']);assert.equal((await one('select status from public.request_quotes where id=$1',[r.quote])).status,'accepted');
});
check('Início invalida reagendamento pendente e troca de data invalida código antigo',async()=>{
 const r=await request();const code=await call('issue_service_code',[r.id]);await actor(db,ids.provider);const s=await call('propose_request_schedule',[r.id,'2099-02-01','Ajuste de disponibilidade informado',randomUUID()]);await actor(db,ids.client);await call('respond_request_schedule',[s,'accepted']);await actor(db,ids.provider);assert.equal((await call('confirm_service_code',[r.id,code.code])).ok,false);
 await db.exec('reset role');await db.query("update public.service_confirmation_codes set issued_at=now()-interval '61 seconds' where request_id=$1",[r.id]);await actor(db,ids.client);const next=await call('issue_service_code',[r.id]);await actor(db,ids.provider);const pending=await call('propose_request_schedule',[r.id,'2099-03-01','Outra necessidade de reagendamento',randomUUID()]);assert.equal((await call('confirm_service_code',[r.id,next.code])).ok,true);await actor(db,ids.client);assert.equal((await call('request_schedule_context',[r.id])).pending,null);await rejected(()=>call('respond_request_schedule',[pending,'accepted']),/mudou/);
});
check('Nova função pública exige sessão; dados e auxiliares privados ficam sem acesso direto',async()=>{
 await actor(db,null,'anon');await rejected(()=>call('save_provider_onboarding',[identity,['Tarumã'],randomUUID(),null]),/permission denied/);await rejected(()=>db.query('select * from public.provider_activity_permissions'),/permission denied/);
 await actor(db,ids.client);await rejected(()=>db.query('select ajura_internal.check_write_attempt($1,$2,$3)',['scope',randomUUID(),{}]),/permission denied/);await rejected(()=>db.query('select * from public.request_schedule_proposals'),/permission denied/);
});
check('Proteção nova preserva uploads autorizados e o limite de dez arquivos',async()=>{
 await provider();await actor(db,ids.provider);for(let i=0;i<10;i++)await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['provider-verification',ids.provider+'/'+randomUUID()+'.jpg',{size:12}]);await rejected(()=>db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['provider-verification',ids.provider+'/'+randomUUID()+'.jpg',{size:12}]),/row-level security/);
});
check('Revogar habilitação bloqueia emissão e início com código já emitido',async()=>{
 const p=await provider(true);await actor(db,ids.admin);await call('admin_review_service_activity',[ids.provider,p.category,p.subcategory,'approved','Registro teste','Fonte e escopo conferidos em teste',null]);await actor(db,ids.client);const id=await call('create_service_request_with_location',[p.service_id,'Tarumã','Solicitação regulamentada de teste','2099-01-01','on_site','Rua de teste','12',null,null,randomUUID()]);await actor(db,ids.provider);const q=await call('send_request_quote',[id,100,'Escopo regulamentado conferido','Material de teste','2099-01-01']);await actor(db,ids.client);await call('respond_request_quote',[q,'accepted']);const issued=await call('issue_service_code',[id]);await db.exec('reset role');const version=(await one('select reviewed_at from public.provider_activity_permissions where provider_id=$1',[ids.provider])).reviewed_at;await db.query("update public.service_confirmation_codes set issued_at=now()-interval '61 seconds' where request_id=$1",[id]);await actor(db,ids.admin);await call('admin_review_service_activity',[ids.provider,p.category,p.subcategory,'rejected','Registro teste','Habilitação revogada no teste',version]);await actor(db,ids.client);await rejected(()=>call('issue_service_code',[id]),/habilitação/);await actor(db,ids.provider);await rejected(()=>call('confirm_service_code',[id,issued.code]),/habilitação/);assert.equal((await one('select status from public.service_requests where id=$1',[id])).status,'requested');
});
