/* Orçamentos versionados, com aceite exclusivo do cliente. Sem pagamento. */
(() => {
 const client = window.AJURA_AUTH?.client;
 if (!client) return;
 const safe = value => esc(String(value ?? ''));
 const money = window.AJURA_CORE.money;
 const labels = { pending: 'Aguardando resposta', accepted: 'Aceito — contratação ainda não confirmada', rejected: 'Recusado', superseded: 'Substituído por nova proposta' };
 async function attach(request, userId) {
  const anchor = document.querySelector('#refreshConversation');
  if (!anchor) return;
  const section = document.createElement('section'); section.className = 'request-quotes';
  anchor.before(section);
  const { data: quotes, error } = await client.from('request_quotes').select('*').eq('request_id', request.id).order('created_at', { ascending: false }).limit(50);
  if (!section.isConnected) return;
  if (error) { section.textContent = 'Orçamentos indisponíveis. Confira se request-quotes.sql foi executado.'; return; }
  const accepted = (quotes || []).some(q => q.status === 'accepted');
  section.innerHTML = `<h3>Orçamento do serviço</h3><p class="hint">O valor é o total proposto. Comissão e pagamento ainda não estão ativos. Aceitar registra sua concordância com a proposta, sem cobrar ou liberar o endereço.</p>${(quotes || []).map(q => `<article class="service"><b>${safe(money(q.amount))} · ${safe(labels[q.status])}</b><p><strong>O que será feito</strong></p><p style="white-space:pre-wrap">${safe(q.scope)}</p><p><strong>Materiais e responsabilidades</strong></p><p style="white-space:pre-wrap">${safe(q.materials)}</p><p>Data: ${window.AJURA_CORE.date(q.scheduled_date)}</p>${q.status === 'accepted' && userId === request.client_id && request.status === 'requested' ? `<button type="button" class="secondary" data-prepare-payment="${safe(q.id)}">Preparar pagamento de teste</button><p class="hint">Valida e registra o valor do orçamento no servidor. Não cria cobrança nem confirma contratação.</p>` : ''}${q.status === 'pending' && userId === request.client_id && request.status === 'requested' ? `<button type="button" class="primary" data-quote="${safe(q.id)}" data-decision="accepted">Aceitar proposta</button><button type="button" class="secondary" data-quote="${safe(q.id)}" data-decision="rejected">Recusar proposta</button>` : ''}</article>`).join('') || '<p>O prestador ainda não enviou orçamento.</p>'}${request.status === 'requested' && userId === request.provider_id && !accepted ? `<details><summary>Enviar ou atualizar orçamento</summary><form class="auth-form" id="sendQuoteForm"><label>Valor total em reais<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required></label><label>O que está incluído no serviço?<textarea name="scope" required minlength="10" maxlength="2000"></textarea></label><label>Quem fornece os materiais e o que está incluído?<textarea name="materials" required minlength="3" maxlength="1000" placeholder="Ex.: produtos e ferramentas fornecidos pelo prestador"></textarea></label><label>Data proposta<input name="date" type="date" required></label><p class="hint">Uma nova proposta substitui a anterior que estiver aguardando resposta. As versões ficam no histórico.</p><button class="primary">Enviar orçamento</button></form></details>` : ''}<p class="quote-message" role="status"></p>`;
  const report = message => section.querySelector('.quote-message').textContent = message;
  section.querySelectorAll('[data-prepare-payment]').forEach(button => button.onclick = async () => {
   button.disabled = true;
   try {
    const { data, error } = await client.rpc('prepare_test_payment', { target_quote: button.dataset.preparePayment });
    if (!section.isConnected) return;
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
   if (button.dataset.decision === 'accepted' && !window.confirm('Registrar aceite desta proposta? Ainda não haverá cobrança nem confirmação de contratação.')) return;
   button.disabled = true;
   try {
    const { error } = await client.rpc('respond_request_quote', { target_quote: button.dataset.quote, decision: button.dataset.decision });
    if (!section.isConnected) return;
    if (error) { report(error.message); button.disabled = false; return; }
    document.querySelector('#refreshConversation')?.click();
   } catch { report('Falha de conexão. Atualize a conversa para conferir o resultado.'); button.disabled = false; }
  });
  const form = section.querySelector('#sendQuoteForm');
  if (form) form.onsubmit = async event => {
   event.preventDefault(); const button = event.submitter; button.disabled = true;
   try {
    const { error } = await client.rpc('send_request_quote', { target_request: request.id, total: Number(form.elements.amount.value), service_scope: form.elements.scope.value.trim(), materials_details: form.elements.materials.value.trim(), service_date: form.elements.date.value });
    if (!section.isConnected) return;
    if (error) { report(error.message); button.disabled = false; return; }
    document.querySelector('#refreshConversation')?.click();
   } catch { report('Falha de conexão. Atualize a conversa para conferir o resultado.'); button.disabled = false; }
  };
 }
 window.AJURA_QUOTES = { attach };
})();
