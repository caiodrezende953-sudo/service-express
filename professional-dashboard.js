/* Painel profissional com dados reais. O modo visual não altera permissões. */
(() => {
 const client = window.AJURA_AUTH?.client;
 const main = document.querySelector('main');
 const nav = document.querySelector('header nav');
 if (!client || !main || !nav) return;
 const safe = value => esc(String(value ?? ''));
 let generation = 0;
 let professional = false;
 const panel = document.createElement('section');
 panel.id = 'ajuraProfessionalDashboard';
 panel.hidden = true;
 main.prepend(panel);
 const toggle = document.createElement('button');
 toggle.id = 'ajuraModeToggle'; toggle.textContent = 'Área profissional';
 nav.append(toggle);
 const style = document.createElement('style');
 style.textContent = `body.ajura-professional main > :not(#ajuraProfessionalDashboard){display:none!important}body.ajura-professional header nav > :not(#accountButton):not(#ajuraModeToggle){display:none!important}.ajura-pro-hero{padding:32px;border-radius:24px;background:#fff0e9;margin:24px 0}.ajura-pro-hero h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:12px 0}.ajura-pro-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px;margin:20px 0}.ajura-pro-card{border:1px solid #e4ded9;border-radius:18px;padding:22px;background:white}.ajura-pro-card strong{display:block;font-size:24px;margin:10px 0}.ajura-pro-actions{display:flex;gap:12px;flex-wrap:wrap}.ajura-pro-request{border:1px solid #e4ded9;border-radius:16px;padding:18px;margin:12px 0;background:white}.ajura-pro-request p{white-space:pre-wrap;overflow-wrap:anywhere}`;
 document.head.append(style);
 function customer() {
  generation++; professional = false;
  document.body.classList.remove('ajura-professional'); panel.hidden = true;
  toggle.textContent = 'Área profissional';
 }
 async function dashboard() {
  const run = ++generation;
  const { data: { session } } = await client.auth.getSession();
  if (run !== generation) return;
  if (!session) { customer(); document.querySelector('#accountButton')?.click(); return; }
  const { data: account, error: accountError } = await client.from('profiles').select('account_type,status,full_name').eq('id',session.user.id).single();
  if (run !== generation) return;
  if (accountError) { toast('Não foi possível conferir o perfil.'); return; }
  if (!['provider','both'].includes(account.account_type) || account.status !== 'active') {
   customer(); toast('Sua conta precisa ter um perfil profissional ativo.'); return;
  }
  professional = true;
  document.body.classList.add('ajura-professional'); panel.hidden = false;
  toggle.textContent = 'Voltar à área do cliente';
  panel.innerHTML = '<p role="status">Carregando seu painel profissional…</p>';
  const results = await Promise.all([
   client.from('provider_profiles').select('display_name,approval_status').eq('id',session.user.id).maybeSingle(),
   client.from('provider_services').select('id', {count:'exact',head:true}).eq('provider_id',session.user.id).eq('active',true),
   client.from('service_requests').select('*').eq('provider_id',session.user.id).eq('status','requested').order('created_at',{ascending:false}).limit(12),
   client.from('service_requests').select('id',{count:'exact',head:true}).eq('provider_id',session.user.id).eq('status','requested'),
   client.rpc('mp_my_test_connection')
  ]);
  if (run !== generation || !professional) return;
  const [profile,services,requests,count,connection] = results;
  const statuses = {pending:'Em análise',approved:'Aprovado',rejected:'Recusado',suspended:'Suspenso'};
  const status = profile.error ? 'Não foi possível consultar' : statuses[profile.data?.approval_status] || 'Cadastro não enviado';
  panel.innerHTML = `<div class="ajura-pro-hero"><span class="eyebrow">AJURA · ÁREA PROFISSIONAL</span><h1>Seu trabalho, organizado.</h1><p>${safe(profile.data?.display_name || account.full_name)}, acompanhe quem precisa dos seus serviços e prepare suas propostas.</p><div class="ajura-pro-actions"><button class="primary" id="ajuraEditProfessional">Gerenciar cadastro e serviços</button><button class="secondary" id="ajuraRefreshProfessional">Atualizar painel</button></div></div><div class="ajura-pro-grid"><article class="ajura-pro-card">Solicitações abertas<strong>${count.error ? 'Indisponível' : safe(count.count ?? 0)}</strong><small>Solicitações recebidas ainda abertas; podem conter propostas já aceitas.</small></article><article class="ajura-pro-card">Serviços ativos<strong>${services.error ? 'Indisponível' : safe(services.count ?? 0)}</strong><small>Sua oferta aparece na busca após aprovação.</small></article><article class="ajura-pro-card">Situação do cadastro<strong>${safe(status)}</strong></article><article class="ajura-pro-card">Mercado Pago<strong>${connection.error ? 'Indisponível' : connection.data?.length ? (new Date(connection.data[0].token_expires_at) > new Date() ? 'Conectado para teste' : 'Conexão expirada') : 'Não conectado'}</strong><small>Conexão de teste. Recebimentos reais ainda não estão disponíveis.</small></article></div><h2>Solicitações recebidas</h2><p class="hint">Até 12 solicitações abertas mais recentes. Abra a conversa para responder ou enviar orçamento.</p>${requests.error ? '<p role="status">Não foi possível carregar as solicitações. Atualize o painel.</p>' : requests.data?.length ? requests.data.map(r=>`<article class="ajura-pro-request"><b>${safe(r.district)} · ${safe(r.preferred_date)}</b><p>${safe(r.description)}</p><button class="secondary" data-pro-conversation="${safe(r.id)}">Abrir conversa e orçamento</button></article>`).join('') : '<p>Nenhuma solicitação aberta recebida. Confira seus serviços e bairros atendidos.</p>'}`;
  panel.querySelector('#ajuraEditProfessional').onclick = () => window.AJURA_AUTH.openProvider();
  panel.querySelector('#ajuraRefreshProfessional').onclick = dashboard;
  panel.querySelectorAll('[data-pro-conversation]').forEach(b=>b.onclick=()=>window.AJURA_REQUESTS?.conversation(b.dataset.proConversation));
 }
 toggle.onclick = () => professional ? customer() : dashboard();
 document.addEventListener('ajura:professional', () => { if (!professional) dashboard(); });
 client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') customer(); });
})();
