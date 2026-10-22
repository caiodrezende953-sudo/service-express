const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const setupMessaging=require('./helpers/messaging.cjs');
const tick=()=>new Promise(setImmediate);
async function until(predicate){for(let i=0;i<40&&!predicate();i++)await tick();assert(predicate(),'A operação não terminou');}
function setup(options={}){
 const quotes=options.quotes||[],state={request:{id:'request',status:options.status||'requested',district:'Tarumã'},accepted_quote:options.accepted||null,events:[],total:0};
 let respond=0,sends=0;
 const s=setupMessaging({...options,realCore:true,rpc:async(name,args)=>{
  if(options.rpc){const custom=await options.rpc(name,args);if(custom!==undefined)return custom;}
  if(name==='request_overview')return options.overviewFail?{error:{message:'offline'}}:{data:state};
  if(name==='respond_request_quote'){respond++;state.accepted_quote={...quotes[0],accepted_at:'2026-10-22T14:00:00Z'};quotes[0].status='accepted';return {data:null};}
  if(name==='send_request_message_once'){sends++;return {data:91};}
 }});
 s.context.request.status=state.request.status;
 s.client.from=()=>({select(){return this},eq(){return this},order(){return this},limit:async()=>({data:quotes})});
 s.window.confirm=()=>true;s.ctx.Event=s.document.defaultView.Event;
 for(const f of ['core.js','order-workflow.js','quote-submission.js','quotes.js','request-overview.js'])vm.runInContext(fs.readFileSync(f,'utf8'),s.ctx,{filename:f});
 return {...s,state,quotes,respond:()=>respond,sends:()=>sends,tab:key=>s.document.querySelector('[data-order-tab="'+key+'"]'),view:key=>s.document.querySelector('[data-order-view="'+key+'"]'),bar:()=>s.document.querySelector('.ajura-order-bar')};
}
const proposal=()=>({id:'quote-1',request_id:'request',provider_id:'provider',status:'pending',amount:150,scope:'Trocar tomada e testar circuito',materials:'Cliente fornece a tomada',scheduled_date:'2026-10-23'});
test('Prestador encontra envio de orçamento pela ação principal; abas preservam formulário e rascunho até fechar',async()=>{
 const s=setup({actor:'provider'});await s.api.openRequest('request');const cta=s.bar().querySelector('button');assert.equal(cta.textContent,'Enviar orçamento');cta.onclick();assert.equal(s.view('quote').hidden,false);const form=s.view('quote').querySelector('form');assert.equal(form.closest('details').hasAttribute('open'),true);form.elements.scope.value='Verificar e substituir a tomada';form.elements.amount.value='150';s.tab('conversation').onclick();assert.equal(s.view('quote').hidden,true);assert.equal(s.document.querySelector('.ajura-chat-composer').hidden,false);s.tab('quote').onclick();assert.equal(s.view('quote').querySelector('form'),form);assert.equal(s.document.querySelector('.ajura-chat-composer').hidden,true);s.api.close();await s.api.openRequest('request');assert.equal(s.view('quote').querySelector('form').elements.scope.value,'Verificar e substituir a tomada');s.changeActor('client');await s.api.openRequest('request');assert.equal(s.view('quote').querySelector('form'),null);
});
test('Cliente revisa e aceita dentro da conversa; resumo confirmado mostra valor e data sem criar pedido ou cobrança',async()=>{
 const s=setup({quotes:[proposal()]});await s.api.openRequest('request');assert.equal(s.bar().querySelector('button').textContent,'Revisar proposta');s.bar().querySelector('button').onclick();assert.equal(s.view('quote').hidden,false);await s.view('quote').querySelector('[data-decision=accepted]').onclick();await until(()=>s.bar()?.textContent.includes('Ver início do serviço'));assert.equal(s.respond(),1);assert.match(s.bar().textContent,/150/);assert.match(s.bar().textContent,/23\/10\/2026/);assert.equal(s.tab('quote').getAttribute('aria-selected'),'true');assert.equal(s.document.querySelector('[data-prepare-payment]'),null);assert(!s.calls.some(([n])=>/create.*request|payment|issue_service_code/.test(n)));
});
test('Combinado aceito e texto malicioso ficam seguros; pedido concluído não oferece nova proposta ou aceite',async()=>{
 const q=proposal();q.status='accepted';q.scope='<img src=x onerror=alert(1)>';const s=setup({status:'completed',accepted:q,quotes:[q]});await s.api.openRequest('request');assert.match(s.bar().textContent,/Serviço concluído/);assert.equal(s.document.querySelector('img'),null);assert.match(s.view('details').textContent,/<img/);assert.equal(s.document.querySelector('[data-quote]'),null);assert.equal(s.document.querySelector('#sendQuoteForm'),null);assert.equal(s.document.querySelector('[data-chat-compose]'),null);
});
test('Ajuda muda o destinatário visível e mantém os dois rascunhos sem recriar formulários',async()=>{
 const s=setup();s.context.tickets=[{id:'ticket',status:'open'}];await s.api.openRequest('request');const normal=s.document.querySelector('[data-chat-compose]'),help=s.document.querySelector('[data-support-compose]');normal.elements.body.value='Mensagem ao prestador';s.tab('help').onclick();help.elements.body.value='Mensagem para atendimento';assert.equal(normal.hidden,true);assert.equal(help.hidden,false);assert.match(s.document.querySelector('.ajura-composer-context').textContent,/compartilhado/);s.tab('quote').onclick();assert.equal(s.document.querySelector('.ajura-chat-composer').hidden,true);s.tab('conversation').onclick();assert.equal(normal.hidden,false);assert.equal(normal.elements.body.value,'Mensagem ao prestador');assert.equal(help.elements.body.value,'Mensagem para atendimento');
});
test('Confirmação de envio preserva texto novo digitado durante a requisição e não afirma leitura',async()=>{
 let resolve;const s=setup({rpc:name=>name==='send_request_message_once'?new Promise(r=>resolve=r):undefined});await s.api.openRequest('request');const form=s.document.querySelector('[data-chat-compose]');form.elements.body.value='Primeira mensagem';const sending=form.onsubmit({preventDefault(){}});await until(()=>resolve);assert.match(form.querySelector('[role=status]').textContent,/Enviando/);form.elements.body.value='Segunda mensagem em rascunho';await form.onsubmit({preventDefault(){}});assert.equal(s.calls.filter(([n])=>n==='send_request_message_once').length,1);resolve({data:88});await sending;const current=s.document.querySelector('[data-chat-compose]');assert.equal(current.elements.body.value,'Segunda mensagem em rascunho');assert.match(current.querySelector('[role=status]').textContent,/Mensagem confirmada/);assert.match(current.querySelector('[role=status]').textContent,/não confirma a leitura/);
});
test('Resposta vazia não confirma mensagem; repetição usa a mesma tentativa e falha mantém texto',async()=>{
 let confirmed=false;const s=setup({rpc:name=>name==='send_request_message_once'?{data:confirmed?99:null}:undefined});await s.api.openRequest('request');let form=s.document.querySelector('[data-chat-compose]');form.elements.body.value='Ainda preciso de resposta';await form.onsubmit({preventDefault(){}});assert.match(form.querySelector('[role=status]').textContent,/Envio não confirmado/);s.tab('quote').onclick();s.tab('conversation').onclick();confirmed=true;await form.onsubmit({preventDefault(){}});const calls=s.calls.filter(([n])=>n==='send_request_message_once');assert.equal(calls.length,2);assert.equal(calls[0][1].submission_key,calls[1][1].submission_key);assert.equal(s.document.querySelector('[data-chat-compose]').elements.body.value,'');
});
test('Resumo indisponível não inventa combinado; orçamento e conversa continuam disponíveis',async()=>{
 const s=setup({overviewFail:true,quotes:[proposal()]});await s.api.openRequest('request');assert.match(s.bar().textContent,/Combinado indisponível/);assert.doesNotMatch(s.bar().textContent,/150/);s.tab('quote').onclick();assert(s.view('quote').querySelector('[data-decision=accepted]'));s.tab('conversation').onclick();assert(s.document.querySelector('[data-chat-compose]'));
});
test('Sair durante o resumo descarta resposta tardia e remove bar, abas e rascunhos',async()=>{
 let resolve;const s=setup({rpc:name=>name==='request_overview'?new Promise(r=>resolve=r):undefined});const pending=s.api.openRequest('request');await until(()=>resolve);s.auth.forEach(fn=>fn('SIGNED_OUT'));resolve({data:s.state});await pending;assert.equal(s.document.querySelector('#ajuraChat').textContent,'');assert.equal(s.bar(),null);assert.equal(s.document.querySelector('[data-order-tab]'),null);
});
test('Abas têm navegação por teclado e fotos abrem os detalhes sem duplicar a consulta',async()=>{
 const s=setup();let files=0;s.window.AJURA_REQUEST_FILES={attach:async()=>files++};await s.api.openRequest('request');s.tab('conversation').onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(s.tab('quote').getAttribute('aria-selected'),'true');assert.equal(s.tab('quote').getAttribute('tabindex'),'0');assert.equal(s.tab('conversation').getAttribute('tabindex'),'-1');s.tab('quote').onkeydown({key:'End',preventDefault(){}});assert.equal(s.tab('help').getAttribute('aria-selected'),'true');s.tab('conversation').onclick();s.document.querySelector('[data-chat-attachments]').onclick();await tick();assert.equal(s.view('details').hidden,false);assert.equal(files,1);s.tab('conversation').onclick();s.document.querySelector('[data-chat-attachments]').onclick();await tick();assert.equal(files,1);
});
test('CSS do fluxo unificado tem sintaxe válida e mantém abas e compositor fora da rolagem principal',()=>{
 const css=fs.readFileSync('conversation.css','utf8');require('css-tree').parse(css);assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-height:500px\)/);
});
test('Nova edição do orçamento durante o envio fica em rascunho após a confirmação da versão anterior',async()=>{
 let resolve;const s=setup({actor:'provider',rpc:name=>name==='send_request_quote_once'?new Promise(r=>resolve=r):undefined});await s.api.openRequest('request');s.tab('quote').onclick();const form=s.view('quote').querySelector('form');form.elements.amount.value='200';form.elements.scope.value='Trocar tomada e conferir proteção';form.elements.materials.value='Tomada fornecida pelo cliente';form.elements.date.value='2026-10-23';const sending=form.onsubmit({preventDefault(){}});await until(()=>resolve);form.elements.scope.value='Rascunho de outra versão do orçamento';form.elements.date.value='2026-10-24';resolve({data:'quote-2'});await sending;await until(()=>s.view('quote')?.querySelector('form')&&s.view('quote').querySelector('form')!==form);const current=s.view('quote').querySelector('form');assert.equal(current.elements.scope.value,'Rascunho de outra versão do orçamento');assert.equal(current.elements.date.value,'2026-10-24');const payload=s.calls.find(([name])=>name==='send_request_quote_once')[1];assert.equal(payload.service_scope,'Trocar tomada e conferir proteção');assert.equal(payload.service_date,'2026-10-23');
});
test('Troca de conta antes de responder orçamento bloqueia a escrita e remove o pedido da tela',async()=>{
 const s=setup({quotes:[proposal()]});await s.api.openRequest('request');const button=s.view('quote').querySelector('[data-decision=accepted]');const response=button.onclick();s.changeActor('provider');await response;assert.equal(s.respond(),0);assert.equal(s.document.querySelector('#ajuraChat').hidden,true);assert.equal(s.bar(),null);
});
test('Atendimento administrativo mantém modo próprio sem orçamento ou canal privado de envio',async()=>{
 const s=setup({actor:'admin',admin:true});s.context.tickets=[{id:'ticket',status:'open'}];await s.api.openRequest('request',true);assert.equal(s.bar(),null);assert.equal(s.tab('quote'),null);assert.equal(s.document.querySelector('[data-chat-compose]'),null);assert(s.document.querySelector('[data-support-compose]'));assert.equal(s.document.querySelector('[data-quote]'),null);
});
