/* Solicitações reais: paginação, separação por papel e proteção contra respostas antigas. */
(() => {
 'use strict';
 if(window.AJURA_REQUESTS) return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;
 if(!client || !C)return;
 const {safe,date,time,statuses,missingProfile,handleForm,counter}=C;
 let generation=0, pendingService=null, listState={role:'client',status:'',page:0};
 async function actor(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?.user.id;}
 function login(serviceId){pendingService=serviceId || pendingService;document.querySelector('#accountButton')?.click();}
 function show(html){modal(html);return document.querySelector('#modalBody');}
 document.querySelector('#modal')?.addEventListener('close',()=>generation++);
 async function create(serviceId){
  const run=++generation;
  try {
   const id=await actor();if(run!==generation)return;if(!id)return login(serviceId);
   const {data:profile,error:profileError}=await client.from('profiles').select('full_name,phone,district,address_line,address_number,address_complement,address_reference,account_type,status').eq('id',id).single();
   if(run!==generation)return;if(profileError)return toast('Não foi possível conferir seu cadastro. Tente novamente.');
   if(profile.status!=='active' || !['client','both'].includes(profile.account_type))return toast('É necessário um perfil de cliente ativo para solicitar serviços.');
   const missing=missingProfile(profile);
   if(missing.length){
    pendingService=serviceId;
    const body=show(`<h2>Complete seu cadastro</h2><p>Antes de solicitar um serviço, preencha:</p><ul>${missing.map(f=>`<li>${safe(f)}</li>`).join('')}</ul><p class="hint">Seu endereço não será incluído na conversa inicial. Ao salvar, você poderá continuar esta solicitação.</p><button class="primary" id="completeRequestProfile">Abrir minha conta</button>`);
    body.querySelector('#completeRequestProfile').onclick=()=>document.querySelector('#accountButton')?.click();return;
   }
   const {data:service,error}=await client.from('provider_services').select('id,provider_id,title').eq('id',serviceId).single();
   if(run!==generation)return;if(error)return toast('Serviço indisponível. Atualize a busca.');
   if(service.provider_id===id)return toast('Você não pode solicitar seu próprio serviço.');
   const {data:areas,error:areaError}=await client.from('provider_service_areas').select('district').eq('provider_id',service.provider_id).order('district');
   if(run!==generation)return;if(areaError)return toast('Não foi possível carregar os bairros.');
   if(!areas?.length)return toast('Este profissional ainda não informou bairros atendidos.');
   if(!window.AJURA_LOCATION)return toast('Modulo do local indisponivel. Atualize a pagina.');
   pendingService=null;
   const body=show(`<span class="eyebrow">SOLICITAÇÃO DE SERVIÇO</span><h2>${safe(service.title)}</h2><p>Informe o que precisa para o profissional preparar uma proposta.</p><form id="realRequestForm" class="auth-form"><label>Bairro<select name="district" required><option value="">Selecione</option>${areas.map(a=>`<option value="${safe(a.district)}" ${a.district===profile.district?'selected':''}>${safe(a.district)}</option>`).join('')}</select></label>${window.AJURA_LOCATION.markup(profile,'newRequestLocation')}<label>O que precisa ser feito?<textarea name="description" required minlength="10" maxlength="2000" placeholder="Ex.: trocar duas tomadas; informe o problema e os materiais disponíveis."></textarea></label><label>Data desejada<input name="date" type="date" min="${C.today()}" required></label><p class="hint">Você poderá adicionar fotos e PDFs na conversa após enviar. Esta solicitação não confirma atendimento e não gera cobrança. Não informe seu endereço completo nesta conversa inicial.</p><button class="primary" type="submit">Enviar solicitação</button><p id="requestError" role="status"></p></form>`);
   const form=body.querySelector('#realRequestForm'),report=t=>{if(form.isConnected)form.querySelector('#requestError').textContent=t;};
   window.AJURA_LOCATION.bind(form);let submissionKey=null;
   counter(form.elements.description);
   handleForm(form,async()=>{
    const description=form.elements.description.value.trim();if(description.length<10)return report('Descreva o serviço com pelo menos 10 caracteres.');
    let location;try{location=window.AJURA_LOCATION.read(form);submissionKey=submissionKey||window.AJURA_LOCATION.submissionKey();}catch(e){return report(e.message);}
    const {data,error}=await client.rpc('create_service_request_with_location',{target_service:service.id,target_district:form.elements.district.value,details:description,desired_date:form.elements.date.value,...location,submission_key:submissionKey});
    if(!form.isConnected)return;
    if(error)return report(error.message);
    document.dispatchEvent(new Event('ajura:requests-changed'));await conversation(data);
   },report);
  }catch{if(run===generation)toast('Falha ao abrir a solicitação. Tente novamente.');}
 }
 async function inbox(options={}){
  if(options && !options.type)listState={...listState,...options};
  const run=++generation;
  try {
   const id=await actor();if(run!==generation)return;if(!id)return login();
   const body=show(`<span class="eyebrow">AJURA · SOLICITAÇÕES</span><h2>Minhas solicitações</h2><div id="requestSummary" role="status">Consultando resumo…</div><div class="request-toolbar"><label>Visualizar<select id="requestRole"><option value="client">Serviços que solicitei</option><option value="provider">Solicitações que recebi</option></select></label><label>Situação<select id="requestStatus"><option value="">Todas</option>${Object.entries(statuses).map(([k,v])=>`<option value="${k}">${safe(v)}</option>`).join('')}</select></label></div><p id="requestListStatus" role="status">Carregando…</p><div id="requestList"></div><div class="request-toolbar"><button id="requestPrev" class="secondary">Anterior</button><span id="requestPage"></span><button id="requestNext" class="secondary">Próxima</button></div>`);
   body.querySelector('#requestRole').value=listState.role;
   body.querySelector('#requestStatus').value=listState.status;
   body.querySelector('#requestRole').onchange=e=>inbox({role:e.target.value,page:0});
   body.querySelector('#requestStatus').onchange=e=>inbox({status:e.target.value,page:0});
   client.rpc('my_request_summary',{p_role:listState.role}).then(({data,error})=>{
    if(run!==generation || !body.isConnected)return;
    const target=body.querySelector('#requestSummary');
    target.textContent=error || !data || typeof data!=='object'?'Resumo indisponível. A lista abaixo continua disponível.':`Aguardando proposta: ${Number(data.awaiting_quote)} · Aguardando início: ${Number(data.awaiting_start)} · Em execução: ${Number(data.in_progress)} · Concluídos: ${Number(data.completed)} · Encerrados: ${Number(data.closed)}`;
   }).catch(()=>{if(run===generation && body.isConnected)body.querySelector('#requestSummary').textContent='Não foi possível consultar o resumo.';});
   let query=client.from('service_requests').select('*',{count:'exact'}).eq(listState.role==='provider'?'provider_id':'client_id',id).order('created_at',{ascending:false}).order('id',{ascending:false});
   if(listState.status)query=query.eq('status',listState.status);
   const {data,error,count:total}=await query.range(listState.page*20,listState.page*20+19);
   if(run!==generation || !body.isConnected)return;
   body.querySelector('#requestListStatus').textContent=error?'Não foi possível carregar. Troque o filtro para tentar novamente.':`${total ?? data?.length ?? 0} solicitações encontradas`;
   body.querySelector('#requestList').innerHTML=error?'':data?.map(r=>`<article class="service"><b>${safe(r.district)} · ${safe(statuses[r.status] || r.status)}</b><p class="request-description">${safe(r.description)}</p><p>Data desejada: ${date(r.preferred_date)}</p><button class="secondary" data-conversation="${safe(r.id)}">${r.status==='in_progress'?'Acompanhar execução':r.status==='completed'?'Ver conclusão e avaliação':r.status==='requested'?'Ver proposta e próximos passos':'Ver histórico'}</button></article>`).join('') || '<p>Nenhuma solicitação neste filtro.</p>';
   body.querySelectorAll('[data-conversation]').forEach(b=>b.onclick=()=>conversation(b.dataset.conversation));
   body.querySelector('#requestPage').textContent=`Página ${listState.page+1}`;
   body.querySelector('#requestPrev').disabled=listState.page===0 || Boolean(error);
   body.querySelector('#requestNext').disabled=Boolean(error) || (listState.page+1)*20 >= (total ?? 0);
   body.querySelector('#requestPrev').onclick=()=>inbox({page:Math.max(0,listState.page-1)});
   body.querySelector('#requestNext').onclick=()=>inbox({page:listState.page+1});
  }catch{if(run===generation)toast('Falha ao consultar solicitações. Tente novamente.');}
 }
 async function conversation(requestId){
  if(window.AJURA_MESSAGING)return window.AJURA_MESSAGING.openRequest(requestId);
  const run=++generation;
  try {
   const id=await actor();if(run!==generation)return;if(!id)return login();
   const {data:r,error}=await client.from('service_requests').select('*').eq('id',requestId).single();
   if(run!==generation)return;if(error)return toast('Não foi possível abrir esta solicitação.');
   listState.role=r.client_id===id?'client':'provider';
   const {data:messages,error:messageError}=await client.from('request_messages').select('*').eq('request_id',requestId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200);
   if(run!==generation)return;
   const body=show(`<span class="eyebrow">CONVERSA DO SERVIÇO</span><h2>${safe(r.district)} · ${safe(statuses[r.status] || r.status)}</h2><p class="request-description">${safe(r.description)}</p><p>Data desejada: ${date(r.preferred_date)}</p><p class="hint">Combine o escopo por aqui. Aceitar a proposta autoriza a consulta ao local confirmado; nao cria cobranca. O inicio depende do codigo do cliente.</p><button class="secondary" id="refreshConversation">Atualizar conversa</button><div aria-label="Mensagens">${messageError?'<p>Falha ao carregar mensagens. Atualize a conversa.</p>':messages?.length?[...messages].reverse().map(m=>`<article class="service"><b>${m.sender_id===id?'Você':r.client_id===m.sender_id?'Cliente':'Profissional'}</b><p class="request-description">${safe(m.body)}</p><small>${time(m.created_at)}</small></article>`).join(''):'<p>Inicie a conversa.</p>'}</div>${messages?.length===200?'<p class="hint">Exibindo as 200 mensagens mais recentes.</p>':''}${r.status==='requested'?`<form id="sendRealMessage" class="auth-form"><label>Mensagem<textarea name="body" required maxlength="2000"></textarea></label><button class="primary" type="submit">Enviar</button><p id="messageError" role="status"></p></form><button class="secondary" id="closeRealRequest">${r.client_id===id?'Cancelar solicitação':'Recusar solicitação'}</button>`:''}<button class="link-button" id="requestsBack">Voltar às solicitações</button>`);
   body.querySelector('#requestsBack').onclick=()=>inbox();
   body.querySelector('#refreshConversation').onclick=()=>conversation(requestId);
   if(r.status==='requested'){
    const form=body.querySelector('#sendRealMessage'),report=t=>{if(form.isConnected)form.querySelector('#messageError').textContent=t;};counter(form.elements.body);
    handleForm(form,async()=>{
     const message=form.elements.body.value.trim();if(!message)return report('Escreva uma mensagem antes de enviar.');
     const {error}=await client.rpc('send_request_message',{target_request:requestId,message_text:message});
     if(!form.isConnected)return;if(error)return report(error.message);await conversation(requestId);
    },report);
    const close=body.querySelector('#closeRealRequest');
    close.onclick=async()=>{
     if(close.disabled || !confirm('Encerrar esta solicitação?'))return;close.disabled=true;
     try{const {error}=await client.rpc('close_service_request',{target_request:requestId,decision:r.client_id===id?'cancelled':'declined'});if(error)toast(error.message);else{document.dispatchEvent(new Event('ajura:requests-changed'));await conversation(requestId);}}
     catch{toast('Falha de conexão. Atualize a conversa para conferir o resultado.');}
     finally{if(close.isConnected)close.disabled=false;}
    };
   }
   if(window.AJURA_LOCATION)await window.AJURA_LOCATION.attach(r,id,body,()=>conversation(requestId));
   if(run!==generation||!body.isConnected)return;
   if(window.AJURA_QUOTES)await window.AJURA_QUOTES.attach(r,id);
   if(run===generation && body.isConnected && window.AJURA_REQUEST_FILES)await window.AJURA_REQUEST_FILES.attach(r,id,body);
  }catch{if(run===generation)toast('Falha ao abrir a conversa. Tente novamente.');}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-request-service]');if(b)create(b.dataset.requestService);});
 const nav=document.querySelector('header nav');
 if(nav){const b=document.createElement('button');b.id='realRequestsButton';b.textContent='Minhas solicitações';b.onclick=()=>inbox({role:document.body.classList.contains('ajura-professional')?'provider':'client',page:0});nav.append(b);}
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){pendingService=null;generation++;}if(event==='SIGNED_IN' && pendingService){const service=pendingService;setTimeout(()=>create(service),0);}});
 document.addEventListener('ajura:profile-saved',()=>{if(pendingService){const service=pendingService;setTimeout(()=>create(service),0);}});
 window.AJURA_REQUESTS=Object.freeze({create,inbox,conversation});
})();
