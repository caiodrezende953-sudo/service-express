const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
function setup(options={}){
 const {document}=parseHTML('<html><body><main><p class="ajura-chat-scope">Descrição da conversa</p></main></body></html>');
 const calls=[],window={confirm:()=>true};
 const data={request:{id:'r',status:options.status||'requested',district:'Tarumã'},accepted_quote:options.quote===false?null:{amount:100,scope:'<img src=x onerror=alert(1)>',materials:'Produtos do prestador',scheduled_date:'2026-10-10',accepted_at:'2026-10-06T15:00:00Z'},events:[{id:1,event_type:'state_observed',payload:{status:'cancelled'},occurred_at:'2026-10-06T15:00:00Z'}],total:21};
 window.AJURA_AUTH={client:{rpc:async(name,args)=>{calls.push([name,args]);if(options.fail===name)return {error:{message:'Falha simulada'}};return {data};}}};
 window.AJURA_CORE={safe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),date:s=>s,time:()=> '06/10/2026 11:00',money:v=>'R$ '+v,statuses:{requested:'Aberta',cancelled:'Cancelada pelo cliente',declined:'Recusada pelo profissional'}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../request-overview.js'),'utf8'),{window,document,Event:function(){}});
 return {api:window.AJURA_REQUEST_OVERVIEW,root:document.querySelector('main'),calls,data};
}
const request={id:'r',client_id:'client',provider_id:'provider'};
test('Resumo do aceite vem do servidor e não executa HTML',async()=>{const s=setup();await s.api.attach(request,'client',s.root,async()=>{});assert.match(s.root.textContent,/R\$ 100/);assert.equal(s.root.querySelector('img'),null);assert.match(s.root.textContent,/<img/);assert.match(s.root.textContent,/aguardando inicio por codigo/);assert.ok(s.root.querySelector('[data-close-order]'));});
test('Sem aceite não inventa preço e em pedido encerrado não oferece cancelar',async()=>{const s=setup({quote:false,status:'cancelled'});await s.api.attach(request,'client',s.root,async()=>{});assert.match(s.root.textContent,/será preenchido/);assert.equal(s.root.querySelector('[data-close-order]'),null);assert.doesNotMatch(s.root.textContent,/R\$/);});
test('Central consulta resumo sem ação de cancelar pedido',async()=>{const s=setup();await s.api.attach(request,'admin',s.root,async()=>{});assert.equal(s.root.querySelector('[data-close-order]'),null);});
test('Histórico legado informa a falta da data original; página seguinte consulta servidor',async()=>{const s=setup();await s.api.attach(request,'client',s.root,async()=>{});assert.match(s.root.textContent,/não a data de cancelamento/);await s.root.querySelector('[data-timeline-next]').onclick();assert.equal(s.calls.at(-1)[1].page_number,1);});
test('Falha no resumo preserva o restante da conversa',async()=>{const s=setup({fail:'request_overview'});await s.api.attach(request,'client',s.root,async()=>{});assert.match(s.root.textContent,/Resumo indisponível/);assert.match(s.root.textContent,/Descrição da conversa/);assert.ok(s.root.querySelector('[data-overview-retry]'));});
