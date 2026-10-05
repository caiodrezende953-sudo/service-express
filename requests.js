/* Solicitações reais e conversa entre participantes. */
(() => {
 const client = window.AJURA_AUTH?.client;
 if (!client) return;
 const safe = value => esc(String(value ?? ''));
 const labels = { requested: 'Aguardando combinação', cancelled: 'Cancelada', declined: 'Recusada' };
 async function actor() { const { data: { session } } = await client.auth.getSession(); return session?.user.id; }
 async function create(serviceId) {
  const id = await actor(); if (!id) return $('#accountButton').click();
  const { data: profile, error: profileError } = await client.from('profiles')
   .select('full_name, phone, district, address_line, address_number, account_type, status').eq('id', id).single();
  if (profileError) return toast('Não foi possível conferir seu cadastro. Tente novamente.');
  if (profile.status !== 'active' || !['client', 'both'].includes(profile.account_type))
   return toast('É necessário um perfil de cliente ativo para solicitar serviços.');
  const missing = [];
  if ((profile.full_name || '').trim().length < 3) missing.push('Nome completo');
  if (!/^[0-9]{10,11}$/.test((profile.phone || '').replace(/[^0-9]/g, ''))) missing.push('Celular com DDD');
  if ((profile.district || '').trim().length < 2) missing.push('Bairro');
  if ((profile.address_line || '').trim().length < 3) missing.push('Rua ou avenida');
  if (!(profile.address_number || '').trim()) missing.push('Número do endereço (ou S/N)');
  if (missing.length) {
   modal(`<h2>Complete seu cadastro</h2><p>Antes de solicitar um serviço, preencha:</p><ul>${missing.map(field => `<li>${safe(field)}</li>`).join('')}</ul><p class="hint">Seu endereço não será incluído na conversa inicial.</p><button class="primary" id="completeRequestProfile">Abrir minha conta</button>`);
   $('#completeRequestProfile').onclick = () => $('#accountButton').click();
   return;
  }
  const { data: service, error } = await client.from('provider_services').select('id, provider_id, title').eq('id', serviceId).single();
  if (error) return toast('Serviço indisponível. Atualize a busca.');
  const { data: areas, error: areaError } = await client.from('provider_service_areas').select('district').eq('provider_id', service.provider_id).order('district');
  if (areaError) return toast('Não foi possível carregar os bairros.');
  modal(`<span class="eyebrow">SOLICITAÇÃO DE SERVIÇO</span><h2>${safe(service.title)}</h2><p>Conte o que precisa. O profissional poderá conversar com você antes de combinar o atendimento.</p><form id="realRequestForm" class="auth-form"><label>Bairro<select name="district" required><option value="">Selecione</option>${(areas || []).map(a => `<option>${safe(a.district)}</option>`).join('')}</select></label><label>O que precisa ser feito?<textarea name="description" required minlength="10" maxlength="2000"></textarea></label><label>Data desejada<input name="date" type="date" required></label><p class="hint">A data é uma preferência. Esta solicitação não confirma atendimento e não gera cobrança. Não informe seu endereço completo nesta conversa inicial.</p><button class="primary">Enviar solicitação</button><p id="requestError" role="status"></p></form>`);
  $('#realRequestForm').onsubmit = async event => {
   event.preventDefault(); const form = event.target, button = event.submitter; button.disabled = true;
   const { data, error } = await client.rpc('create_service_request', { target_service: service.id, target_district: form.elements.district.value, details: form.elements.description.value.trim(), desired_date: form.elements.date.value });
   if (error) { $('#requestError').textContent = error.message; button.disabled = false; return; }
   await conversation(data);
  };
 }
 async function inbox() {
  const id = await actor(); if (!id) return $('#accountButton').click();
  const { data, error } = await client.from('service_requests').select('*').order('created_at', { ascending: false }).limit(100);
  modal(`<span class="eyebrow">AJURA · CONVERSAS REAIS</span><h2>Minhas solicitações</h2><p class="hint">Solicitações e conversas, sem contratação ou cobrança nesta etapa. Exibindo até 100 solicitações recentes.</p>${error ? `<p>${safe(error.message)}</p>` : (data || []).map(r => `<article class="service"><b>${r.client_id === id ? 'Você solicitou' : 'Solicitação recebida'} · ${safe(r.district)}</b><p>${safe(r.description)}</p><p>${safe(r.preferred_date)} · ${safe(labels[r.status])}</p><button type="button" class="secondary" data-conversation="${safe(r.id)}">Abrir conversa</button></article>`).join('') || '<p>Nenhuma solicitação ainda.</p>'}`);
  $('#modalBody').querySelectorAll('[data-conversation]').forEach(b => b.onclick = () => conversation(b.dataset.conversation));
 }
 async function conversation(requestId) {
  const id = await actor();
  const { data: r, error } = await client.from('service_requests').select('*').eq('id', requestId).single();
  if (error) return toast('Não foi possível abrir esta solicitação.');
  const { data: messages, error: messageError } = await client.from('request_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200);
  modal(`<span class="eyebrow">CONVERSA DO SERVIÇO</span><h2>${safe(r.district)} · ${safe(labels[r.status])}</h2><p>${safe(r.description)}</p><p>Data desejada: ${safe(r.preferred_date)}</p><p class="hint">O orçamento pode ser combinado aqui; pagamento e contratação ainda não estão disponíveis. A conversa não confirma contratação. Use Atualizar para ver novas mensagens.</p><button class="secondary" id="refreshConversation">Atualizar conversa</button><div aria-label="Mensagens">${messageError ? '<p>Falha ao carregar mensagens.</p>' : [...(messages || [])].reverse().map(m => `<article class="service"><b>${m.sender_id === id ? 'Você' : r.client_id === m.sender_id ? 'Cliente' : 'Prestador'}</b><p style="white-space:pre-wrap">${safe(m.body)}</p><small>${safe(new Date(m.created_at).toLocaleString('pt-BR'))}</small></article>`).join('') || '<p>Inicie a conversa.</p>'}</div>${r.status === 'requested' ? '<form id="sendRealMessage" class="auth-form"><label>Mensagem<textarea name="body" required maxlength="2000"></textarea></label><button class="primary">Enviar</button><p id="messageError" role="status"></p></form><button class="secondary" id="closeRealRequest">'+(r.client_id === id ? 'Cancelar solicitação' : 'Recusar solicitação')+'</button>' : ''}<button class="link-button" id="requestsBack">Voltar às solicitações</button>`);
  if (window.AJURA_QUOTES) await window.AJURA_QUOTES.attach(r, id);
  $('#requestsBack').onclick = inbox;
  $('#refreshConversation').onclick = () => conversation(requestId);
  if (r.status !== 'requested') return;
  $('#sendRealMessage').onsubmit = async event => {
   event.preventDefault(); const button = event.submitter; button.disabled = true;
   const { error } = await client.rpc('send_request_message', { target_request: requestId, message_text: event.target.elements.body.value.trim() });
   if (error) { $('#messageError').textContent = error.message; button.disabled = false; return; }
   conversation(requestId);
  };
  $('#closeRealRequest').onclick = async () => {
   if (!window.confirm('Encerrar esta solicitação?')) return;
   const { error } = await client.rpc('close_service_request', { target_request: requestId, decision: r.client_id === id ? 'cancelled' : 'declined' });
   if (error) return toast(error.message);
   conversation(requestId);
  };
 }
 document.addEventListener('click', event => {
  const button = event.target.closest('[data-request-service]');
  if (button) create(button.dataset.requestService);
 });
 const nav = document.querySelector('header nav');
 if (nav) { const button = document.createElement('button'); button.textContent = 'Solicitações e conversas'; button.onclick = inbox; nav.append(button); }
})();
