/* Orçamentos versionados, com aceite exclusivo do cliente. Sem pagamento. */
(() => {
 const client = window.AJURA_AUTH?.client;
 if (!client) return;
 const safe = value => window.AJURA_CORE.safe(value);
 const money = window.AJURA_CORE.money;
 let revision=0,lastActor=null;
 const drafts=new Map(),sections=new Set();client.auth?.onAuthStateChange((event,next)=>{const id=next?.user?.id||null;if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&lastActor&&id!==lastActor)){lastActor=id;revision++;drafts.clear();for(const s of sections)if(s.isConnected)s.textContent='Sessão encerrada.';sections.clear();}});
 function remember(container){
  for(const form of container.querySelectorAll('[data-quote-draft]'))if(form.dataset.submitted!=='true'){
   const values={};for(const name of ['amount','scope','materials','date'])values[name]=form.elements[name]?.value||'';
   drafts.set(form.dataset.quoteDraft,values);
  }
 }
 const labels = { pending: 'Aguardando resposta', accepted: 'Aceito — aguardando inicio', rejected: 'Recusado', superseded: 'Substituído por nova proposta' };
 async function attach(request, userId, container = document, options={}) {
  const anchor = container.querySelector('#refreshConversation');
  if (!anchor) return;
  const section = document.createElement('section'); section.className = 'request-quotes';
  anchor.before(section);
  lastActor=userId;for(const previous of sections)if(!previous.isConnected)sections.delete(previous);sections.add(section);const version=revision,alive=()=>section.isConnected&&version===revision&&section.closest('dialog')?.open!==false;
  let response;try{response=await client.from('request_quotes').select('id,request_id,provider_id,amount,scope,materials,scheduled_date,status,created_at').eq('request_id', request.id).order('created_at', { ascending: false }).limit(50);}catch{if(alive()){section.textContent='Não foi possível carregar os orçamentos. Atualize a conversa.';options.onState?.(null);}return;}
  const {data:quotes,error}=response;
  if (!alive()) return;
  if (error||!Array.isArray(quotes)) { section.textContent = 'Orçamentos indisponíveis. Atualize a conversa e tente novamente.'; options.onState?.(null);return; }
  options.onState?.(quotes);
  const accepted = (quotes || []).some(q => q.status === 'accepted');
  section.innerHTML = `<h3>Orçamento do serviço</h3><p class="hint">O valor é o total proposto. Comissão e pagamento ainda não estão ativos. Aceitar registra sua concordancia com a proposta e autoriza o prestador aprovado a consultar o endereco confirmado deste pedido. Nao cria cobranca; o inicio depende do codigo do cliente.</p>${(quotes || []).map(q => `<article class="service"><b>${safe(money(q.amount))} · ${safe(q.status==='accepted'&&request.status!=='requested'?'Proposta aceita':labels[q.status]||'Situação indisponível')}</b><p><strong>O que será feito</strong></p><p style="white-space:pre-wrap">${safe(q.scope)}</p><p><strong>Materiais e responsabilidades</strong></p><p style="white-space:pre-wrap">${safe(q.materials)}</p><p>Data: ${window.AJURA_CORE.date(q.scheduled_date)}</p>${!options.unified && q.status === 'accepted' && userId === request.client_id && request.status === 'requested' ? `<button type="button" class="secondary" data-prepare-payment="${safe(q.id)}">Preparar pagamento de teste</button><p class="hint">Valida e registra o valor do orçamento no servidor. Não cria cobrança nem confirma contratação.</p>` : ''}${q.status === 'pending' && userId === request.client_id && request.status === 'requested' ? `<button type="button" class="primary" data-quote="${safe(q.id)}" data-decision="accepted">Aceitar proposta</button><button type="button" class="secondary" data-quote="${safe(q.id)}" data-decision="rejected">Recusar proposta</button>` : ''}</article>`).join('') || '<p>O prestador ainda não enviou orçamento.</p>'}${request.status === 'requested' && userId === request.provider_id && !accepted ? `<details data-quote-editor ${options.unified?'open':''}><summary>Enviar ou atualizar orçamento</summary><form class="auth-form" id="sendQuoteForm"><label>Valor total em reais<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required></label><label>O que está incluído no serviço?<textarea name="scope" required minlength="10" maxlength="2000"></textarea></label><label>Quem fornece os materiais e o que está incluído?<textarea name="materials" required minlength="3" maxlength="1000" placeholder="Ex.: produtos e ferramentas fornecidos pelo prestador"></textarea></label><label>Data proposta<input name="date" type="date" required></label><p class="hint">Uma nova proposta substitui a anterior que estiver aguardando resposta. As versões ficam no histórico.</p><button class="primary">Enviar orçamento</button></form></details>` : ''}<p class="quote-message" role="status"></p>`;
  const S=window.AJURA_SAFE_ACTIONS;
  async function guard(node){if(!S)throw Error('Atualize a página para carregar o envio protegido.');const token=await S.snapshot();if(!alive()||token.id!==userId)throw Error('Sessão alterada. Reabra o pedido.');await S.guard(token,node);return token;}
  const report = message => {if(alive())section.querySelector('.quote-message').textContent = message;};
  let deciding=false;
  section.querySelectorAll('[data-prepare-payment]').forEach(button => button.onclick = async () => {
   if(button.disabled)return;
   button.disabled = true;
   try {
    const { data, error } = await client.rpc('prepare_test_payment', { target_quote: button.dataset.preparePayment });
    if (!alive()) return;
    if (error) { report(error.message); button.disabled = false; return; }
    if (!data) { report('Não foi possível confirmar a preparação. Tente novamente.'); button.disabled = false; return; }
    button.textContent = 'Preparação confirmada';
    report('Pagamento de teste preparado no servidor. Nenhuma cobrança foi criada.');
   } catch {
    report('Falha de conexão. Você pode tentar novamente: a preparação não será duplicada.');
    button.disabled = false;
   }
  });
  section.querySelectorAll('[data-quote]').forEach(button => button.onclick = async () => {
   if(deciding||button.disabled||!alive())return;
   if(button.dataset.decision==='accepted'&&!window.confirm('Aceitar esta proposta e autorizar a consulta ao local confirmado? Nenhuma cobrança será criada.'))return;
   deciding=true;const buttons=section.querySelectorAll('[data-quote]');buttons.forEach(b=>b.disabled=true);let confirmed=false;
   try{const token=await guard(section);const {error}=await client.rpc('respond_request_quote',{target_quote:button.dataset.quote,decision:button.dataset.decision});if(!alive()||!S.current(token))return;if(error)throw error;confirmed=true;document.dispatchEvent(new Event('ajura:requests-changed'));container.querySelector('#refreshConversation')?.click();}
   catch{report('Não foi possível confirmar a resposta. Atualize a conversa para conferir o resultado antes de tentar novamente.');}
   finally{deciding=false;if(!confirmed&&alive())buttons.forEach(b=>b.disabled=false);}
  });
  const form = section.querySelector('#sendQuoteForm');
  if(form){
   form.dataset.quoteDraft=userId+':'+request.id;const saved=drafts.get(form.dataset.quoteDraft);
   if(saved)for(const name of ['amount','scope','materials','date'])form.elements[name].value=saved[name]||'';
   form.addEventListener('input',()=>remember(section));
  }
  if(form)window.AJURA_CORE.handleForm(form,async()=>{
   if(!alive())return;
   const inputValues=Object.fromEntries(['amount','scope','materials','date'].map(name=>[name,form.elements[name].value]));
   const total=Number(inputValues.amount),scope=inputValues.scope.trim(),materials=inputValues.materials.trim();
   if(!Number.isFinite(total)||total<=0||total>1000000||scope.length<10||materials.length<3){report('Confira valor, descrição e materiais antes de enviar.');return;}
   try{
    if(!window.AJURA_QUOTE_SUBMISSION){report('Atualize a página para carregar o envio protegido.');return;}
    const token=await guard(form);
    const payload={target_request:request.id,total,service_scope:scope,materials_details:materials,service_date:inputValues.date};
    const attempt=await window.AJURA_QUOTE_SUBMISSION.requestKey(request.id,userId,payload);
    if(!alive())return;await S.guard(token,form);
    const {data:quoteId,error}=await client.rpc('send_request_quote_once',{...payload,submission_key:attempt.key});
    if(!alive()||!S.current(token))return;if(error)throw error;if(!quoteId)throw Error('Resposta não confirmada');
    attempt.clear();
    if(Object.keys(inputValues).some(name=>form.elements[name].value!==inputValues[name]))remember(section);
    else{drafts.delete(userId+':'+request.id);form.dataset.submitted='true';}document.dispatchEvent(new Event('ajura:requests-changed'));container.querySelector('#refreshConversation')?.click();
   }
   catch{report('Não foi possível confirmar o envio. Seus campos foram preservados. Reenvie os mesmos dados para recuperar a tentativa sem criar outra proposta.');}
  },report);

 }
 window.AJURA_QUOTES = { attach,remember,forget(){drafts.clear();} };
})();
