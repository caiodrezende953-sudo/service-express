/* Caixa de mensagens e Central. Sem alteração automática de pedidos ou pagamentos. */
(() => {
 'use strict'; if(window.AJURA_MESSAGING)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 const drafts=new Map();let generation=0,page=0,selected=null,adminMode=false,lastFocus=null;
 const launch=document.createElement('button');launch.className='ajura-chat-launch';launch.type='button';launch.setAttribute('aria-controls','ajuraChat');launch.setAttribute('aria-expanded','false');launch.textContent='Mensagens';
 const panel=document.createElement('aside');panel.id='ajuraChat';panel.className='ajura-chat';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Mensagens AJURA');
 document.body.append(launch,panel);
 function close(){generation++;panel.hidden=true;launch.setAttribute('aria-expanded','false');lastFocus?.focus();}
 function frame(title){
  if(panel.hidden)lastFocus=document.activeElement;
  panel.hidden=false;launch.setAttribute('aria-expanded','true');
  panel.innerHTML=`<div class="ajura-chat-head"><h2>${C.safe(title)}</h2><button type="button" aria-label="Fechar mensagens" data-chat-close>×</button></div><div class="ajura-chat-body"></div>`;
  panel.querySelector('[data-chat-close]').onclick=close;panel.querySelector('[data-chat-close]').focus();return panel.querySelector('.ajura-chat-body');
 }
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
 async function user(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?.user.id;}
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw new Error(error.message);return data;}
 async function badge(){
  if(document.hidden)return;
  try{if(!await user()){launch.textContent='Mensagens';return;}const n=await rpc('messaging_unread_count');launch.textContent=Number(n)>0?`Mensagens (${n})`:'Mensagens';launch.setAttribute('aria-label',Number(n)>0?`Mensagens, ${n} não lidas`:'Mensagens');}
  catch{launch.textContent='Mensagens';}
 }
 function errorView(body,error){if(body.isConnected)body.innerHTML=`<p role="status">${C.safe(error.message||'Falha de conexão.')}</p><button type="button" data-retry>Tentar novamente</button>`;body.querySelector('[data-retry]')?.addEventListener('click',()=>inbox());}
 async function inbox(nextPage=0,central=false){
  const run=++generation;page=nextPage;adminMode=central;selected=null;const body=frame(central?'Central AJURA':'Mensagens');body.textContent='Carregando…';
  try{
   if(!await user()){body.innerHTML='<p>Entre na sua conta para conversar.</p><button type="button" data-login>Entrar</button>';body.querySelector('[data-login]').onclick=()=>{close();document.querySelector('#accountButton')?.click();};return;}
   const rows=await rpc(central?'admin_support_queue':'messaging_inbox',{page_number:page});if(run!==generation||!body.isConnected)return;
   body.innerHTML=`${central?'<p>Atendimentos abertos, do mais antigo ao mais recente.</p>':''}${rows.length?rows.map(r=>`<button type="button" class="ajura-chat-item" data-chat-request="${C.safe(central?r.request_id:r.id)}"><b>${C.safe(central?'Atendimento · '+r.district:r.partner||'Conversa do pedido')}</b><span>${C.safe(central?r.reason:r.preview)}</span><small>${C.safe(r.district)}${Number(r.unread)>0?' · '+r.unread+' não lidas':''}</small></button>`).join(''):'<p>Nenhuma conversa neste momento.</p>'}<div class="ajura-chat-actions"><button type="button" data-prev ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1}</span><button type="button" data-next ${rows.length<20?'disabled':''}>Próxima</button><button type="button" data-refresh>Atualizar</button></div>`;
   body.querySelectorAll('[data-chat-request]').forEach(b=>b.onclick=()=>openRequest(b.dataset.chatRequest,central));
   body.querySelector('[data-prev]').onclick=()=>inbox(page-1,central);body.querySelector('[data-next]').onclick=()=>inbox(page+1,central);body.querySelector('[data-refresh]').onclick=()=>inbox(page,central);
  }catch(error){if(run===generation)errorView(body,error);}
 }
 function messageList(rows,actor,request){return rows.map(m=>`<article class="ajura-chat-message"><b>${m.sender_role==='central'?'Central AJURA':m.sender_id===actor?'Você':m.sender_id===request.client_id?'Cliente':'Prestador'}</b><p>${C.safe(m.body)}</p><small>${C.time(m.created_at)}</small></article>`).join('')||'<p>Nenhuma mensagem.</p>';}
 async function openRequest(id,central=false){
  // Preserve rascunho quando a pessoa clica em atualizar ou muda a conversa.
  const old=panel.querySelector('[data-chat-compose]');if(old&&selected)drafts.set(`${selected}:${adminMode?'central':'normal'}`,old.elements.body.value);
  const run=++generation;selected=id;adminMode=central;
  document.querySelector('#modal')?.close();const body=frame(central?'Atendimento da Central':'Conversa do serviço');body.textContent='Carregando…';
  try{
   const actor=await user();if(!actor)return inbox();
   const context=await rpc('support_context',{target_request:id});
   let request=context.request,messages=context.history||[];
   if(!central){const result=await client.from('service_requests').select('*').eq('id',id).single();if(result.error)throw result.error;request=result.data;}
   if(run!==generation||!body.isConnected)return;
   const tickets=context.tickets||[],active=tickets.find(t=>t.status==='open'),support=context.messages||[];
   body.innerHTML=`<div class="ajura-chat-actions"><button type="button" data-back>← Conversas</button><button type="button" data-chat-refresh>Atualizar</button></div><p><b>${C.safe(request.district)}</b> · ${C.safe(C.statuses[request.status]||request.status)}</p><p class="ajura-chat-scope">${C.safe(request.description)}</p><small>Data desejada: ${C.date(request.preferred_date)}</small><p class="hint">Conversa vinculada ao pedido. Orçamento aceito ainda não confirma cobrança.</p><details ${central?'':'open'}><summary>Conversa entre cliente e prestador</summary><div class="ajura-chat-history">${messageList(messages,actor,request)}</div></details>${!central&&['requested','in_progress'].includes(request.status)?'<form data-chat-compose class="auth-form"><label>Mensagem ao cliente/prestador<textarea name="body" maxlength="2000" required></textarea></label><button class="primary" type="submit">Enviar mensagem</button><p data-message-status role="status"></p></form>':''}<section class="ajura-chat-support"><h3>Central AJURA</h3>${tickets.length?`<p>${active?'Atendimento aberto. Aguarde a resposta da equipe.':'Atendimentos encerrados.'}</p><div class="ajura-chat-history">${messageList(support,actor,request)}</div>`:'<p>Precisa de ajuda com este pedido?</p>'}${active?'<form data-support-compose class="auth-form"><label>Mensagem à Central e aos participantes<textarea name="body" maxlength="2000" required></textarea></label><button class="primary" type="submit">Enviar à Central</button><p data-support-status role="status"></p></form>':!central?'<details><summary>Solicitar atendimento da Central</summary><form data-support-open class="auth-form"><label>Explique o problema<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><p class="hint">Encaminha apenas à Central AJURA. Cliente e prestador podem acompanhar as mensagens do atendimento.</p><button class="primary" type="submit">Encaminhar à Central</button><p data-support-status role="status"></p></form></details>':''}${central&&active?'<details><summary>Encerrar atendimento</summary><form data-support-resolve class="auth-form"><label>Resolução<textarea name="resolution" minlength="10" maxlength="2000" required></textarea></label><button class="secondary" type="submit">Registrar resolução e encerrar</button><p data-support-status role="status"></p></form></details>':''}</section>`;
   body.querySelector('[data-back]').onclick=()=>inbox(page,central);body.querySelector('[data-chat-refresh]').onclick=()=>openRequest(id,central);
   const form=body.querySelector('[data-chat-compose]');
   if(form){form.elements.body.value=drafts.get(`${id}:normal`)||'';C.counter(form.elements.body);C.handleForm(form,async()=>{await rpc('send_request_message',{target_request:id,message_text:form.elements.body.value.trim()});drafts.delete(`${id}:normal`);form.elements.body.value='';await openRequest(id,central);await badge();},m=>{if(form.isConnected)form.querySelector('[data-message-status]').textContent=m;});}
   const supportForm=body.querySelector('[data-support-compose]');
   if(supportForm){supportForm.elements.body.value=drafts.get(`${id}:support`)||'';C.handleForm(supportForm,async()=>{await rpc('send_support_message',{target_ticket:active.id,message_text:supportForm.elements.body.value.trim()});supportForm.elements.body.value='';drafts.delete(`${id}:support`);await openRequest(id,central);},m=>{if(supportForm.isConnected)supportForm.querySelector('[data-support-status]').textContent=m;});supportForm.elements.body.oninput=()=>drafts.set(`${id}:support`,supportForm.elements.body.value);}
   const open=body.querySelector('[data-support-open]');if(open)C.handleForm(open,async()=>{await rpc('open_support_ticket',{target_request:id,explanation:open.elements.reason.value.trim()});await openRequest(id,central);},m=>{if(open.isConnected)open.querySelector('[data-support-status]').textContent=m;});
   const resolve=body.querySelector('[data-support-resolve]');if(resolve)C.handleForm(resolve,async()=>{await rpc('resolve_support_ticket',{target_ticket:active.id,resolution:resolve.elements.resolution.value.trim()});await inbox(page,true);},m=>{if(resolve.isConnected)resolve.querySelector('[data-support-status]').textContent=m;});
   if(window.AJURA_REQUEST_OVERVIEW)await window.AJURA_REQUEST_OVERVIEW.attach(request,actor,body,()=>openRequest(id,central));
   if(run!==generation||!body.isConnected)return;
   if(!central){
    // Marca somente as mensagens carregadas, sem limpar mensagens que chegam depois.
    const last=messages.at(-1)?.id||0,lastSupport=support.at(-1)?.id||0;
    if(!document.hidden)await rpc('messaging_mark_read',{target_request:id,through_message:last,through_support:lastSupport});
    if(run!==generation||!body.isConnected)return;
    if(!central&&window.AJURA_SERVICE_EXECUTION)await window.AJURA_SERVICE_EXECUTION.attach(request,actor,body,()=>openRequest(id,central));
   if(run!==generation||!body.isConnected)return;
   const extras=document.createElement('details');extras.innerHTML='<summary>Orçamento e anexos</summary><div class="ajura-chat-extras"><button type="button" id="refreshConversation" hidden></button></div>';body.append(extras);
    // Orçamento usa um contêiner explícito para não depender da janela modal antiga.
    const extrasRoot=extras.querySelector('.ajura-chat-extras');
    extrasRoot.querySelector('#refreshConversation').onclick=()=>openRequest(id,central);
    if(window.AJURA_QUOTES)await window.AJURA_QUOTES.attach(request,actor,extrasRoot);
    if(run===generation&&body.isConnected&&window.AJURA_REQUEST_FILES)await window.AJURA_REQUEST_FILES.attach(request,actor,extras.querySelector('.ajura-chat-extras'));
    await badge();
   }
  }catch(error){if(run===generation)errorView(body,error);}
 }
 let roleGeneration=0;
 function clearCentralButtons(){document.querySelectorAll('[id="centralQueueButton"]').forEach(button=>button.remove());}
 async function refreshRole(){
  const roleRun=++roleGeneration;clearCentralButtons();
  try{if(!await user())return;const allowed=await rpc('admin_is_current_user');if(roleRun!==roleGeneration||!allowed)return;
   clearCentralButtons();
   const nav=document.querySelector('header nav');if(nav){const b=document.createElement('button');b.id='centralQueueButton';b.textContent='Central · atendimentos';b.onclick=()=>inbox(0,true);nav.append(b);}
  }catch{}
 }
 launch.onclick=()=>panel.hidden?inbox():close();
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){roleGeneration++;drafts.clear();close();selected=null;panel.innerHTML='';launch.textContent='Mensagens';clearCentralButtons();}else setTimeout(()=>{badge();refreshRole();},0);});
 document.addEventListener('ajura:requests-changed',badge);document.addEventListener('visibilitychange',()=>{if(!document.hidden)badge();});
 setInterval(()=>{if(!document.hidden)badge();},60000);badge();refreshRole();
 window.AJURA_MESSAGING=Object.freeze({openRequest,inbox,close,refreshUnread:badge});
})();
