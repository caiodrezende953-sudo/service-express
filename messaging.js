/* Caixa de mensagens e Central. Decisoes de cancelamento somente pelo modulo autorizado. */
(() => {
 'use strict'; if(window.AJURA_MESSAGING)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 const drafts=new Map(),sendStates=new Map();let generation=0,page=0,selected=null,adminMode=false,lastFocus=null;
 let threadLive=null;const stopThread=()=>{threadLive?.stop();threadLive=null;};
 let lastActor=null,identityKnown=false,identityRevision=0,badgeTask=null,badgeTimer=null,badgeFailures=0,pagePaused=false;
 const stopBadge=()=>{if(badgeTimer!==null)clearTimeout(badgeTimer);badgeTimer=null;};
 function scheduleBadge(){stopBadge();if(!lastActor||document.hidden||pagePaused||window.navigator?.onLine===false)return;badgeTimer=setTimeout(()=>{badgeTimer=null;void badge();},Math.min(300000,60000*2**badgeFailures));}
 const launch=document.createElement('button');launch.className='ajura-chat-launch';launch.type='button';launch.setAttribute('aria-controls','ajuraChat');launch.setAttribute('aria-expanded','false');launch.textContent='Mensagens';
 const panel=document.createElement('aside');panel.id='ajuraChat';panel.className='ajura-chat';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Mensagens AJURA');
 document.body.append(launch,panel);
 const draftKey=(actor,id,channel)=>`${actor}:${id}:${channel}`;
 function rememberDrafts(){
  if(!selected||!lastActor)return;
  window.AJURA_QUOTES?.remember?.(panel);
  for(const [selector,field,channel] of [['[data-chat-compose]','body','normal'],['[data-support-compose]','body','support'],['[data-support-open]','reason','reason'],['[data-support-resolve]','resolution','resolution']]){
   const f=panel.querySelector(selector);if(f?.elements[field])drafts.set(draftKey(lastActor,selected,channel),f.elements[field].value);
  }
 }
 function close(){rememberDrafts();stopThread();generation++;panel.hidden=true;panel.replaceChildren();selected=null;launch.setAttribute('aria-expanded','false');lastFocus?.focus();}
 function adoptActor(id,force=false){
  if(identityKnown&&id===lastActor&&!force)return;
  const changed=identityKnown||force;identityKnown=true;
  if(changed){
   stopThread();identityRevision++;generation++;roleGeneration++;badgeTask=null;stopBadge();badgeFailures=0;drafts.clear();sendStates.clear();selected=null;adminMode=false;
   panel.hidden=true;panel.replaceChildren();launch.setAttribute('aria-expanded','false');launch.textContent='Mensagens';launch.setAttribute('aria-label','Mensagens');clearCentralButtons();
  }
  lastActor=id;
 }
 function frame(title){
  if(panel.hidden)lastFocus=document.activeElement;
  panel.hidden=false;launch.setAttribute('aria-expanded','true');
  panel.innerHTML=`<div class="ajura-chat-head"><h2>${C.safe(title)}</h2><button type="button" aria-label="Fechar mensagens" data-chat-close>×</button></div><div class="ajura-chat-body"></div><div class="ajura-chat-composer" hidden></div>`;
  panel.querySelector('[data-chat-close]').onclick=close;panel.querySelector('[data-chat-close]').focus();return panel.querySelector('.ajura-chat-body');
 }
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});
 async function user(){const revision=identityRevision;const {data,error}=await client.auth.getSession();if(error)throw error;if(revision!==identityRevision)throw Error('Sessão alterada. Abra novamente.');const id=data?.session?.user?.id||null;adoptActor(id);return id;}
 const userError=message=>C.userError?C.userError(message):new Error(message);
 async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw userError(error.message||'Não foi possível confirmar a operação.');return data;}
 async function badge(){
  if(document.hidden||pagePaused||window.navigator?.onLine===false){stopBadge();return;}if(badgeTask)return badgeTask;
  const revision=identityRevision;
  const task=(async()=>{try{const actor=await user();if(!actor)return;const n=await rpc('messaging_unread_count');if(revision!==identityRevision||actor!==lastActor)return;badgeFailures=0;launch.textContent=Number(n)>0?`Mensagens (${n})`:'Mensagens';launch.setAttribute('aria-label',Number(n)>0?`Mensagens, ${n} não lidas`:'Mensagens');}catch{if(revision===identityRevision){badgeFailures=Math.min(3,badgeFailures+1);launch.textContent='Mensagens';launch.setAttribute('aria-label','Mensagens');}}})();
  badgeTask=task;try{await task;}finally{if(badgeTask===task){badgeTask=null;scheduleBadge();}}
 }
 function errorView(body,error,retry){if(body.isConnected)body.innerHTML=`<p role="status">${C.safe(error.message||'Falha de conexão.')}</p><button type="button" data-retry>Tentar novamente</button>`;body.querySelector('[data-retry]')?.addEventListener('click',retry);}
 async function inbox(nextPage=0,central=false){
  rememberDrafts();stopThread();const run=++generation;page=nextPage;adminMode=central;selected=null;const body=frame(central?'Central AJURA':'Mensagens');body.textContent='Carregando…';
  try{
   const actor=await user();if(run!==generation||!body.isConnected)return;
   if(!actor){body.innerHTML='<p>Entre na sua conta para conversar.</p><button type="button" data-login>Entrar</button>';body.querySelector('[data-login]').onclick=()=>{close();document.querySelector('#accountButton')?.click();};return;}
   const rows=await rpc(central?'admin_support_queue':'messaging_inbox',{page_number:page});if(run!==generation||!body.isConnected)return;
   body.innerHTML=`${central?'<p>Atendimentos abertos, do mais antigo ao mais recente.</p>':''}${rows.length?rows.map(r=>`<button type="button" class="ajura-chat-item" data-chat-request="${C.safe(central?r.request_id:r.id)}"><b>${C.safe(central?'Atendimento · '+r.district:r.partner||'Conversa do pedido')}</b><span>${C.safe(central?r.reason:r.preview)}</span><small>${C.safe(r.district)}${Number(r.unread)>0?' · '+r.unread+' não lidas':''}</small></button>`).join(''):'<p>Nenhuma conversa neste momento.</p>'}<div class="ajura-chat-actions"><button type="button" data-prev ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1}</span><button type="button" data-next ${rows.length<20?'disabled':''}>Próxima</button><button type="button" data-refresh>Atualizar</button></div>`;
   body.querySelectorAll('[data-chat-request]').forEach(b=>b.onclick=()=>openRequest(b.dataset.chatRequest,central));
   body.querySelector('[data-prev]').onclick=()=>inbox(page-1,central);body.querySelector('[data-next]').onclick=()=>inbox(page+1,central);body.querySelector('[data-refresh]').onclick=()=>inbox(page,central);
  }catch(error){if(run===generation)errorView(body,error,()=>inbox(nextPage,central));}
 }
 function messageList(rows,actor,request){return rows.map(m=>`<article class="ajura-chat-message ${m.sender_role==='central'?'is-central':m.sender_id===actor?'is-own':'is-received'}"><b>${m.sender_role==='central'?'Central AJURA':m.sender_id===actor?'Você':m.sender_id===request.client_id?'Cliente':'Prestador'}</b><p>${C.safe(m.body)}</p><small>${C.time(m.created_at)}</small></article>`).join('')||'<p>Nenhuma mensagem.</p>';}
 function dockComposer(body,actor,id,central,unified=false){
  const slot=panel.querySelector('.ajura-chat-composer');if(!slot)return;
  const entries=[['normal','Cliente e prestador','[data-chat-compose]'],['support','Central AJURA','[data-support-compose]']].map(([key,label,selector])=>({key,label,form:body.querySelector(selector)})).filter(x=>x.form);
  if(!entries.length){slot.hidden=true;return;}
  slot.hidden=false;
  const controls=document.createElement('div');controls.className='ajura-channel-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Destino da mensagem');
  const context=document.createElement('p');context.className='ajura-composer-context';context.setAttribute('aria-live','polite');
  slot.append(controls,context);
  const key=draftKey(actor,id,'channel');let active=central?'support':drafts.get(key)||'normal';if(!entries.some(x=>x.key===active))active=entries[0].key;
  function choose(next){active=next;drafts.set(key,next);for(const entry of entries){entry.form.hidden=entry.key!==next;entry.button?.setAttribute('aria-pressed',String(entry.key===next));}context.textContent=next==='support'?'Atendimento compartilhado com a Central e os participantes.':'Conversa entre cliente e prestador.';}
  for(const entry of entries){
   entry.form.id='ajuraChatCompose'+(entry.key==='normal'?'Normal':'Support');
   const submit=entry.form.querySelector('button[type="submit"]');submit.textContent='Enviar';submit.setAttribute('aria-label','Enviar mensagem para '+entry.label);
   entry.form.elements.body.rows=2;C.counter(entry.form.elements.body);
   if(entries.length>1){const button=document.createElement('button');button.type='button';button.textContent=entry.label;button.setAttribute('aria-controls',entry.form.id);button.onclick=()=>choose(entry.key);entry.button=button;controls.append(button);}
   slot.append(entry.form);
  }
  if(entries.length===1||unified)controls.hidden=true;choose(active);
  return {show(channel){slot.hidden=false;choose(channel);},hide(){slot.hidden=true;}};
 }
 async function openRequest(id,central=false,initialView='conversation'){
  // Preserve rascunho quando a pessoa clica em atualizar ou muda a conversa.
  rememberDrafts();stopThread();
  const run=++generation;selected=id;adminMode=central;
  document.querySelector('#modal')?.close();const body=frame(central?'Atendimento da Central':'Conversa do serviço');body.textContent='Carregando…';
  try{
   const actor=await user();if(run!==generation||!body.isConnected)return;if(!actor)return inbox();
   const context=await rpc('support_context',{target_request:id});
   const request=context.request,messages=context.history||[];
   if(!request||String(request.id)!==String(id)||(!central&&![request.client_id,request.provider_id].includes(actor)))throw userError('Acesso ao pedido não confirmado. Reabra a conversa.');
   if(run!==generation||!body.isConnected)return;
   const tickets=context.tickets||[],active=tickets.find(t=>t.status==='open'),support=context.messages||[];
   body.innerHTML=`<div class="ajura-chat-actions"><button type="button" data-back>← Conversas</button><button type="button" data-chat-refresh>Atualizar</button></div><p><b>${C.safe(request.district)}</b> · ${C.safe(C.statuses[request.status]||request.status)}</p><p class="ajura-chat-scope">${C.safe(request.description)}</p><small>Data desejada: ${C.date(request.preferred_date)}</small><p class="hint">Conversa vinculada ao pedido. Orçamento aceito ainda não confirma cobrança.</p><details ${central?'':'open'}><summary>Conversa entre cliente e prestador</summary><div class="ajura-chat-history">${messageList(messages,actor,request)}</div></details>${!central&&['requested','in_progress'].includes(request.status)?'<form data-chat-compose class="auth-form"><label>Mensagem ao cliente/prestador<textarea name="body" maxlength="2000" required></textarea></label><button class="primary" type="submit">Enviar mensagem</button><p data-message-status role="status"></p></form>':''}<section class="ajura-chat-support"><h3>Central AJURA</h3>${tickets.length?`<p>${active?'Atendimento aberto. Aguarde a resposta da equipe.':'Atendimentos encerrados.'}</p><div class="ajura-chat-history">${messageList(support,actor,request)}</div>`:'<p>Precisa de ajuda com este pedido?</p>'}${active?'<form data-support-compose class="auth-form"><label>Mensagem à Central e aos participantes<textarea name="body" maxlength="2000" required></textarea></label><button class="primary" type="submit">Enviar à Central</button><p data-support-status role="status"></p></form>':!central?'<details><summary>Solicitar atendimento da Central</summary><form data-support-open class="auth-form"><label>Explique o problema<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><p class="hint">A Central recebe o pedido de ajuda. Cliente e prestador podem acompanhar o motivo e as mensagens do atendimento.</p><button class="primary" type="submit">Encaminhar à Central</button><p data-support-status role="status"></p></form></details>':''}${central&&active?'<details><summary>Encerrar atendimento</summary><form data-support-resolve class="auth-form"><label>Resolução<textarea name="resolution" minlength="10" maxlength="2000" required></textarea></label><button class="secondary" type="submit">Registrar resolução e encerrar</button><p data-support-status role="status"></p></form></details>':''}</section>`;
   const scrollPositions=new Map();let viewInitialized=false;
   let currentView=['conversation','quote','details','help'].includes(initialView)?initialView:'conversation',workspace=null,composer=null;
   if(!central){
    const toolbar=body.querySelector('.ajura-chat-actions');
    const head=panel.querySelector('.ajura-chat-head'),back=toolbar.querySelector('[data-back]'),reload=toolbar.querySelector('[data-chat-refresh]');
    back.textContent='←';back.setAttribute('aria-label','Voltar às conversas');back.title='Voltar às conversas';
    reload.setAttribute('aria-label','Atualizar pedido e mensagens');reload.title='Atualizar pedido e mensagens';reload.className='ajura-chat-reload';
    head.prepend(back);head.querySelector('[data-chat-close]').before(reload);toolbar.remove();
    const conversation=body.querySelector('details'),normalForm=body.querySelector('[data-chat-compose]'),supportSection=body.querySelector('.ajura-chat-support');
    const contextNodes=[...body.children].filter(node=>node!==toolbar&&node!==conversation&&node!==normalForm&&node!==supportSection);
    workspace=document.createElement('div');workspace.className='ajura-order-workspace';workspace.innerHTML='<div class="ajura-order-tabs" role="tablist" aria-label="Seções do pedido"></div><div data-order-view="conversation"></div><div data-order-view="quote"></div><div data-order-view="details"></div><div data-order-view="help"></div>';
    body.append(workspace);
    const tabs=workspace.querySelector('[role="tablist"]');
    // Navegação fora da rolagem mantém seções e destino da mensagem visíveis.
    body.before(tabs);
    for(const [key,label] of [['conversation','Conversa'],['quote','Orçamento'],['details','Detalhes'],['help','Ajuda']]){
     const button=document.createElement('button');button.type='button';button.id='ajura-order-tab-'+key;button.dataset.orderTab=key;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls','ajura-order-view-'+key);tabs.append(button);
     const view=workspace.querySelector('[data-order-view="'+key+'"]');view.id='ajura-order-view-'+key;view.setAttribute('role','tabpanel');view.setAttribute('aria-labelledby',button.id);view.tabIndex=0;
     button.onclick=()=>navigate(key);
     button.onkeydown=event=>{const keys=['conversation','quote','details','help'],i=keys.indexOf(key);let next;if(event.key==='ArrowRight')next=(i+1)%4;else if(event.key==='ArrowLeft')next=(i+3)%4;else if(event.key==='Home')next=0;else if(event.key==='End')next=3;else return;event.preventDefault();navigate(keys[next]);tabs.querySelector('[data-order-tab="'+keys[next]+'"]').focus();};
    }
    workspace.querySelector('[data-order-view="conversation"]').append(conversation);conversation.open=true;
    const photos=document.createElement('button');photos.type='button';photos.className='secondary';photos.dataset.chatAttachments='';photos.textContent='Fotos e anexos do pedido';photos.onclick=()=>{navigate('details',true);const files=workspace.querySelector('.ajura-chat-extras')?.parentElement;if(files){files.open=true;files.scrollIntoView?.({block:'start'});}};conversation.before(photos);
    conversation.querySelector('summary').textContent='Mensagens do pedido';
    if(normalForm)workspace.querySelector('[data-order-view="conversation"]').append(normalForm);
    const detailView=workspace.querySelector('[data-order-view="details"]');detailView.append(...contextNodes);
    workspace.querySelector('[data-order-view="help"]').append(supportSection);
    const bar=document.createElement('section');bar.className='ajura-order-bar';bar.setAttribute('aria-label','Combinado e próxima ação');bar.innerHTML='<p data-order-summary role="status">Conferindo o combinado…</p><button type="button" class="primary" data-order-next disabled>Conferindo próximo passo…</button>';tabs.before(bar);
    workspace.bar=bar;
   }
   function navigate(view,focus=false){
    if(!workspace)return;if(viewInitialized)scrollPositions.set(currentView,body.scrollTop);currentView=view;
    panel.querySelectorAll('[data-order-tab]').forEach(tab=>{const active=tab.dataset.orderTab===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    workspace.querySelectorAll('[data-order-view]').forEach(node=>node.hidden=node.dataset.orderView!==view);
    if(view==='conversation'&&form)composer?.show('normal');else if(view==='help'&&supportForm)composer?.show('support');else composer?.hide();
    if(view==='details')loadFiles?.();
    body.scrollTop=scrollPositions.get(view)??(['conversation','help'].includes(view)?body.scrollHeight:0);viewInitialized=true;
    if(view==='conversation'&&focus)form?.elements.body.focus();
    threadLive?.channelChanged();
    if(focus&&view!=='conversation')workspace.querySelector('[data-order-view="'+view+'"]')?.focus();
   }
   panel.querySelector('[data-back]').onclick=()=>inbox(page,central);panel.querySelector('[data-chat-refresh]').onclick=()=>openRequest(id,central,currentView);
   const form=body.querySelector('[data-chat-compose]');
   const S=window.AJURA_SAFE_ACTIONS;
   const alive=()=>run===generation&&body.isConnected&&actor===lastActor;
   async function protect(form){
    if(!S)throw userError('Atualize a página para carregar o envio protegido.');
    const token=await S.snapshot();if(!alive()||token.id!==actor)throw userError('Sessão alterada. Reabra a conversa.');
    await S.guard(token,form);return token;
   }
   async function sendOnce(form,name,scope,args,channel){
    if(!args.message_text||args.message_text.length>2000)throw userError('Escreva uma mensagem de 1 a 2000 caracteres.');
    const status=form.querySelector('[role="status"]');
    if(status)status.textContent='Enviando… Aguarde a confirmação.';
    const token=await protect(form),attempt=await S.requestKey(scope,actor,args);
    await S.guard(token,form);if(!alive())return;
    const receipt=await rpc(name,{...args,submission_key:attempt.key});
    if(!alive()||!S.current(token))return;if(!receipt)throw userError('Envio ainda não confirmado. Tente novamente com o mesmo texto.');
    attempt.clear();
    // Uma mensagem nova digitada durante o envio não pertence à tentativa confirmada.
    if(form.elements.body.value.trim()===args.message_text){drafts.delete(draftKey(actor,id,channel));form.elements.body.value='';}
    else drafts.set(draftKey(actor,id,channel),form.elements.body.value);
    sendStates.set(draftKey(actor,id,channel),'Mensagem confirmada pela AJURA. Isso não confirma a leitura pelo destinatário.');
    if(threadLive){if(status)status.textContent=sendStates.get(draftKey(actor,id,channel));form.elements.body.dispatchEvent(new Event('input'));await threadLive.refresh();}
    else await openRequest(id,central,channel==='support'?'help':'conversation');await badge();
   }
   if(form){
    form.elements.body.value=drafts.get(draftKey(actor,id,'normal'))||'';C.counter(form.elements.body);
    form.elements.body.oninput=()=>drafts.set(draftKey(actor,id,'normal'),form.elements.body.value);
    C.handleForm(form,()=>sendOnce(form,'send_request_message_once',`message:${id}`,{target_request:id,message_text:form.elements.body.value.trim()},'normal'),m=>{if(alive()&&form.isConnected){const note='Envio não confirmado. Seu texto foi preservado. '+m+' Reenvie o mesmo texto para recuperar a tentativa sem duplicar.';form.querySelector('[data-message-status]').textContent=note;sendStates.set(draftKey(actor,id,'normal'),note);}});
   }
   const supportForm=body.querySelector('[data-support-compose]');
   if(supportForm){
    supportForm.elements.body.value=drafts.get(draftKey(actor,id,'support'))||'';
    supportForm.elements.body.oninput=()=>drafts.set(draftKey(actor,id,'support'),supportForm.elements.body.value);
    C.handleForm(supportForm,()=>sendOnce(supportForm,'send_support_message_once',`support-message:${active.id}`,{target_ticket:active.id,message_text:supportForm.elements.body.value.trim()},'support'),m=>{if(alive()&&supportForm.isConnected){const note='Envio não confirmado. Seu texto foi preservado. '+m+' Reenvie o mesmo texto para recuperar a tentativa sem duplicar.';supportForm.querySelector('[data-support-status]').textContent=note;sendStates.set(draftKey(actor,id,'support'),note);}});
   }
   const open=body.querySelector('[data-support-open]');if(open)C.handleForm(open,async()=>{const token=await protect(open);await rpc('open_support_ticket',{target_request:id,explanation:open.elements.reason.value.trim()});if(!alive()||!S.current(token))return;drafts.delete(draftKey(actor,id,'reason'));await openRequest(id,central,'help');},m=>{if(open.isConnected)open.querySelector('[data-support-status]').textContent=m;});
   const resolve=body.querySelector('[data-support-resolve]');if(resolve)C.handleForm(resolve,async()=>{const token=await protect(resolve),note=resolve.elements.resolution.value.trim();if(note.length<10||note.length>2000){resolve.querySelector('[data-support-status]').textContent='Informe a resolucao em 10 a 2000 caracteres.';return;}const {error}=await client.rpc('resolve_support_ticket',{target_ticket:active.id,resolution:note});if(!alive()||!S.current(token)||!resolve.isConnected)return;if(error){resolve.querySelector('[data-support-status]').textContent=error.message||'Nao foi possivel encerrar.';return;}drafts.delete(draftKey(actor,id,'resolution'));await inbox(page,true);},m=>{if(resolve.isConnected)resolve.querySelector('[data-support-status]').textContent=m;});
   for(const [f,field,channel] of [[open,'reason','reason'],[resolve,'resolution','resolution']])if(f){f.elements[field].value=drafts.get(draftKey(actor,id,channel))||'';f.elements[field].oninput=()=>drafts.set(draftKey(actor,id,channel),f.elements[field].value);}
   composer=dockComposer(body,actor,id,central,!central);
   for(const [f,channel] of [[form,'normal'],[supportForm,'support']])if(f){const status=f.querySelector('[role="status"]');if(status)status.textContent=sendStates.get(draftKey(actor,id,channel))||'';}
   const jobs=[],refresh=()=>openRequest(id,central,currentView);
   let loadFiles=null,overviewData=null,overviewFailed=false,quoteRows=null;
   function updateBar(){
    if(!workspace||!alive())return;
    const label=workspace.bar.querySelector('[data-order-summary]'),button=workspace.bar.querySelector('[data-order-next]');
    if(!overviewData){if(!overviewFailed)return;label.textContent='Combinado indisponível. A conversa continua disponível.';button.disabled=false;button.textContent='Conferir detalhes';button.onclick=()=>navigate('details',true);return;}
    const r={...request,...overviewData.request},q=overviewData.accepted_quote,role=actor===request.client_id?'client':'provider';
    const state=window.AJURA_ORDER_WORKFLOW?.state(r,actor,Boolean(q));
    label.textContent=(state?.title||C.statuses[r.status]||'Pedido')+' · '+request.district+(q?' · '+C.money(q.amount)+' · '+C.date(q.scheduled_date):'');
    let target='details',text='Ver andamento';
    if(r.status==='requested'&&!q){if(quoteRows===null){text='Conferir orçamento';target='quote';}else if(quoteRows.some(row=>row.status==='pending')){text=role==='client'?'Revisar proposta':'Ver proposta enviada';target='quote';}else{text=role==='provider'?'Enviar orçamento':'Conversar com o prestador';target=role==='provider'?'quote':'conversation';}}
    else if(r.status==='requested')text='Ver início do serviço';
    else if(r.status==='completed')text=role==='client'?'Ver conclusão e avaliação':'Ver conclusão';
    else if(['cancelled','declined'].includes(r.status))text='Ver histórico';
    button.disabled=false;button.textContent=text;button.onclick=()=>{navigate(target,true);if(target==='details'){const name=r.status==='completed'?'AJURA_REVIEWS':['cancelled','declined'].includes(r.status)?'AJURA_REQUEST_OVERVIEW':'AJURA_SERVICE_EXECUTION';workspace.querySelector('[data-chat-module="'+name+'"]')?.scrollIntoView?.({block:'start'});}};
   }
   // Os módulos independentes começam juntos, cada um em seu próprio contêiner.
   function attachModule(name,normalOnly=false){
    const module=window[name];if(!module||normalOnly&&central||!alive())return;
    const host=document.createElement('div');host.dataset.chatModule=name;
    if(workspace)workspace.querySelector('[data-order-view="details"]').append(host);else if(name==='AJURA_REQUEST_OVERVIEW')body.querySelector('.ajura-chat-scope').after(host);else body.append(host);
    jobs.push(Promise.resolve().then(()=>{if(alive()&&host.isConnected)return module.attach(request,actor,host,refresh,central,{unified:!central,onSummary:data=>{if(alive()){overviewData=data;updateBar();}},onUnavailable:()=>{overviewFailed=true;updateBar();}});}).catch(()=>{if(alive()&&host.isConnected){host.textContent='Esta seção não carregou. Atualize a conversa para tentar novamente.';if(name==='AJURA_REQUEST_OVERVIEW'){overviewFailed=true;updateBar();}}}));
   }
   for(const name of ['AJURA_REQUEST_OVERVIEW','AJURA_LOCATION','AJURA_RESCHEDULE','AJURA_SERVICE_CANCELLATION'])attachModule(name);
   attachModule('AJURA_SERVICE_EXECUTION',true);attachModule('AJURA_REVIEWS',true);
   if(!central){
    // A leitura depende somente das mensagens visíveis, não da consulta dos módulos.
    const last=messages.at(-1)?.id||0,lastSupport=support.at(-1)?.id||0;
    if(!document.hidden&&!window.AJURA_THREAD_UPDATES)jobs.push(rpc('messaging_mark_read',{target_request:id,through_message:last,through_support:lastSupport}).catch(()=>{if(alive()){const note=document.createElement('p');note.className='hint';note.textContent='A leitura ainda não foi confirmada. Você pode continuar a conversa.';body.append(note);}}));
    const quoteRoot=workspace.querySelector('[data-order-view="quote"]');
    quoteRoot.innerHTML='<button type="button" id="refreshConversation" hidden></button>';
    quoteRoot.querySelector('#refreshConversation').onclick=refresh;
    if(window.AJURA_QUOTES)jobs.push(Promise.resolve().then(()=>{if(alive())return window.AJURA_QUOTES.attach(request,actor,quoteRoot,{unified:true,onState:rows=>{if(alive()){quoteRows=rows;updateBar();}}});}).catch(()=>{if(alive()){const note=document.createElement('p');note.textContent='Orçamento indisponível. Atualize a conversa para tentar novamente.';quoteRoot.append(note);}}));
    else quoteRoot.append(document.createTextNode('Orçamento indisponível. Atualize a página.'));
    const extras=document.createElement('details');extras.innerHTML='<summary>Fotos e anexos</summary><div class="ajura-chat-extras"></div>';workspace.querySelector('[data-order-view="details"]').append(extras);
    let extrasStarted=false;
    loadFiles=async()=>{
     if(extrasStarted||!alive())return;extrasStarted=true;
     try{if(window.AJURA_REQUEST_FILES)await window.AJURA_REQUEST_FILES.attach(request,actor,extras.querySelector('.ajura-chat-extras'));}
     catch{if(alive())extras.querySelector('.ajura-chat-extras').textContent='Anexos indisponíveis. Atualize a conversa para tentar novamente.';}
    };
    extras.ontoggle=()=>{if(extras.open)return loadFiles();};
    navigate(currentView);

   }
   if(workspace&&!window.AJURA_REQUEST_OVERVIEW){overviewFailed=true;updateBar();}
   await Promise.allSettled(jobs);
   if(alive()&&window.AJURA_THREAD_UPDATES){
    const normalHistory=body.querySelector('details .ajura-chat-history');
    const supportSection=body.querySelector('.ajura-chat-support');
    let supportHistory=supportSection.querySelector('.ajura-chat-history');
    if(!supportHistory){supportHistory=document.createElement('div');supportHistory.className='ajura-chat-history';supportSection.querySelector('h3').after(supportHistory);}
    try{threadLive=window.AJURA_THREAD_UPDATES.attach({request,actor,central,panel,body,normalHistory,supportHistory,initialMessages:messages,initialSupport:support,alive,
     currentChannel:()=>central?'support':currentView==='conversation'?'normal':currentView==='help'?'support':null,
     baseline:()=>({status:request.status,preferred_date:request.preferred_date,quotes:quoteRows,active_ticket:active?.id||null}),
     navigate:view=>navigate(view),refreshContext:refresh,paused:()=>pagePaused,onRead:()=>void badge(),
     onChange:state=>{
      // Campos ficam preservados, mas ações antigas exigem conferir o estado novo.
      body.querySelectorAll('[data-chat-module] button,.request-quotes button').forEach(b=>b.disabled=true);
      body.querySelectorAll('[data-issued-code]').forEach(node=>node.replaceChildren());
      if(!['requested','in_progress'].includes(state.status)){const submit=form?.querySelector('[type="submit"]');if(submit)submit.disabled=true;}
      if(state.active_ticket!==active?.id){const submit=supportForm?.querySelector('[type="submit"]');if(submit)submit.disabled=true;}
     },onDenied:()=>{close();drafts.clear();sendStates.clear();window.AJURA_QUOTES?.forget?.();}
    });}catch{const note=document.createElement('p');note.setAttribute('role','status');note.textContent='Atualização automática indisponível. Use Atualizar no cabeçalho; seu rascunho foi preservado.';body.append(note);}
   }
   if(alive()&&!central)await badge();
  }catch(error){if(run===generation)errorView(body,error,()=>openRequest(id,central));}
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
 client.auth.onAuthStateChange((event,next)=>{if(event==='SIGNED_OUT')adoptActor(null,true);else if(next?.user?.id)adoptActor(next.user.id);if(event!=='SIGNED_OUT')setTimeout(()=>{badge();refreshRole();},0);});
 document.addEventListener('ajura:requests-changed',badge);document.addEventListener('visibilitychange',()=>{stopBadge();if(!document.hidden)badge();});
 window.addEventListener?.('offline',stopBadge);window.addEventListener?.('online',()=>badge());
 window.addEventListener?.('pagehide',()=>{pagePaused=true;stopBadge();});window.addEventListener?.('pageshow',()=>{pagePaused=false;badge();});
 badge();refreshRole();
 window.AJURA_MESSAGING=Object.freeze({openRequest,inbox,close,refreshUnread:badge,refreshThread:()=>threadLive?.refresh()});
})();
