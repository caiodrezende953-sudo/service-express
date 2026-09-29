/* Autenticação real da AJURA. Requer supabase-config.js e supabase/schema.sql. */
(() => {
  const config = window.AJURA_SUPABASE || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(config.url || '') && Boolean(config.anonKey);
  const client = configured && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
  let session = null;

  const clean = value => String(value || '').trim();
  const authMessage = error => {
    const text = error?.message || 'Não foi possível concluir. Tente novamente.';
    if (/invalid login credentials/i.test(text)) return 'E-mail ou senha incorretos.';
    if (/already registered|already been registered/i.test(text)) return 'Este e-mail já está cadastrado.';
    if (/password/i.test(text) && /characters/i.test(text)) return 'A senha precisa ter pelo menos 8 caracteres.';
    return text;
  };
  const redirectUrl = () => location.protocol === 'http:' || location.protocol === 'https:'
    ? `${location.origin}${location.pathname}`
    : undefined;
  const districts = () => (typeof BAIRROS_MANAUS !== 'undefined' ? BAIRROS_MANAUS : []).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');

  function setupRequired() {
    modal('<span class="eyebrow">CONFIGURAÇÃO NECESSÁRIA</span><h2>Cadastro real ainda não conectado</h2><p>As telas e as regras do banco já estão preparadas, mas o projeto Supabase ainda precisa ser criado e conectado.</p><p class="hint">Não informe senha enquanto esta configuração estiver pendente.</p>');
  }

  function loginView(message = '') {
    if (!client) return setupRequired();
    modal(`<span class="eyebrow">ACESSO AJURA</span><h2>Entrar</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<form id="loginForm" class="auth-form"><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Senha<input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="72"></label><button class="primary" type="submit">Entrar</button></form><div class="auth-actions"><button class="secondary" type="button" id="openSignup">Criar conta</button><button class="link-button" type="button" id="openRecovery">Esqueci minha senha</button></div>`);
    $('#openSignup').onclick = () => signupView();
    $('#openRecovery').onclick = () => recoveryView();
    $('#loginForm').onsubmit = async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      const data = new FormData(event.target);
      const { error } = await client.auth.signInWithPassword({ email: clean(data.get('email')).toLowerCase(), password: String(data.get('password') || '') });
      button.disabled = false;
      if (error) return loginView(authMessage(error));
      $('#modal').close();
      toast('Acesso realizado.');
    };
  }

  function signupView(message = '') {
    if (!client) return setupRequired();
    modal(`<span class="eyebrow">CADASTRO REAL · TESTE FECHADO</span><h2>Criar conta</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<form id="signupForm" class="auth-form"><label>Nome completo<input name="full_name" autocomplete="name" required minlength="3" maxlength="100"></label><label>Celular com DDD<input name="phone" type="tel" autocomplete="tel" required maxlength="20" placeholder="(92) 99999-9999"></label><label>Bairro<select name="district" required><option value="">Selecione</option>${districts()}</select></label><fieldset><legend>Como pretende usar a AJURA?</legend><label class="check"><input type="radio" name="account_type" value="client" required>Quero contratar serviços</label><label class="check"><input type="radio" name="account_type" value="provider" required>Quero prestar serviços</label><label class="check"><input type="radio" name="account_type" value="both" required>Quero contratar e prestar serviços</label></fieldset><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Senha<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72"></label><p class="hint">Cadastro restrito aos testes internos. Termos de Uso e Política de Privacidade precisam ser publicados antes da abertura ao público.</p><button class="primary" type="submit">Criar conta de teste</button></form><button class="link-button" type="button" id="backLogin">Já tenho conta</button>`);
    $('#backLogin').onclick = () => loginView();
    $('#signupForm').onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const phone = clean(data.get('phone')).replace(/\D/g, '');
      if (phone.length < 10 || phone.length > 11) return signupView('Informe um celular válido com DDD.');
      const button = event.submitter;
      button.disabled = true;
      const metadata = {
        full_name: clean(data.get('full_name')),
        phone,
        district: clean(data.get('district')),
        account_type: clean(data.get('account_type'))
      };
      const options = { data: metadata };
      const target = redirectUrl();
      if (target) options.emailRedirectTo = target;
      const { data: result, error } = await client.auth.signUp({
        email: clean(data.get('email')).toLowerCase(),
        password: String(data.get('password') || ''),
        options
      });
      button.disabled = false;
      if (error) return signupView(authMessage(error));
      if (!result.session) return loginView('Cadastro recebido. Confirme o e-mail antes de entrar.');
      $('#modal').close();
      toast('Conta criada.');
    };
  }

  function recoveryView(message = '') {
    if (!client) return setupRequired();
    modal(`<span class="eyebrow">RECUPERAR ACESSO</span><h2>Redefinir senha</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<form id="recoveryForm" class="auth-form"><label>E-mail cadastrado<input name="email" type="email" autocomplete="email" required maxlength="254"></label><button class="primary" type="submit">Enviar link seguro</button></form><button class="link-button" type="button" id="backLogin">Voltar</button>`);
    $('#backLogin').onclick = () => loginView();
    $('#recoveryForm').onsubmit = async event => {
      event.preventDefault();
      const options = {};
      const target = redirectUrl();
      if (target) options.redirectTo = target;
      const { error } = await client.auth.resetPasswordForEmail(clean(new FormData(event.target).get('email')).toLowerCase(), options);
      if (error) return recoveryView(authMessage(error));
      loginView('Se o e-mail existir, enviaremos as instruções de recuperação.');
    };
  }

  async function accountView() {
    if (!client) return setupRequired();
    if (!session) return loginView();
    const { data, error } = await client.from('profiles').select('full_name, phone, district, account_type, status').eq('id', session.user.id).single();
    if (error) return modal(`<h2>Minha conta</h2><p class="auth-message">${esc(authMessage(error))}</p><button class="secondary" id="logoutButton">Sair</button>`);
    const labels = { client: 'Cliente', provider: 'Prestador', both: 'Cliente e prestador' };
    modal(`<span class="eyebrow">CONTA REAL</span><h2>${esc(data.full_name)}</h2><dl class="profile-data"><div><dt>E-mail</dt><dd>${esc(session.user.email)}</dd></div><div><dt>Celular</dt><dd>${esc(data.phone)}</dd></div><div><dt>Bairro</dt><dd>${esc(data.district)}</dd></div><div><dt>Perfil</dt><dd>${esc(labels[data.account_type] || data.account_type)}</dd></div><div><dt>Situação</dt><dd>${esc(data.status)}</dd></div></dl>${data.account_type !== 'client' ? '<button class="primary" id="realProviderButton">Meu cadastro profissional</button>' : '<p class="hint">Para prestar serviços, solicite a alteração do tipo de conta durante o piloto.</p>'}<p class="hint">Pedidos, pagamentos e avaliações da demonstração ainda não usam esta conta.</p><button class="secondary" id="logoutButton">Sair</button>`);
    if (data.account_type !== 'client') $('#realProviderButton').onclick = providerView;
    $('#logoutButton').onclick = async () => { await client.auth.signOut(); $('#modal').close(); };
  }

  async function providerView(message = '') {
    if (!session) return loginView();
    const id = session.user.id;
    const [{ data: profile, error: profileError }, { data: areas, error: areasError }, { data: services, error: servicesError }] = await Promise.all([
      client.from('provider_profiles').select('display_name, bio, approval_status').eq('id', id).maybeSingle(),
      client.from('provider_service_areas').select('district').eq('provider_id', id).order('district'),
      client.from('provider_services').select('id, category, subcategory, title, description, pricing_type, starting_price').eq('provider_id', id).order('id')
    ]);
    if (profileError || areasError || servicesError) return modal(`<h2>Cadastro profissional</h2><p class="auth-message">${esc(authMessage(profileError || areasError || servicesError))}</p>`);
    const selected = new Set((areas || []).map(area => area.district));
    const status = { pending: 'Aguardando análise', approved: 'Aprovado', rejected: 'Recusado', suspended: 'Suspenso' };
    modal(`<span class="eyebrow">CADASTRO PROFISSIONAL REAL</span><h2>Meu perfil profissional</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<p>Situação: <b>${esc(profile ? status[profile.approval_status] || profile.approval_status : 'Ainda não enviado')}</b></p><p class="hint">O cadastro não aparece para clientes antes da aprovação. A vitrine atual ainda é demonstrativa.</p><form id="realProviderForm" class="auth-form"><label>Nome profissional<input name="display_name" required minlength="3" maxlength="100" value="${esc(profile?.display_name || '')}"></label><label>Apresentação<textarea name="bio" maxlength="1000">${esc(profile?.bio || '')}</textarea></label><fieldset><legend>Bairros atendidos</legend><div class="area-list">${(typeof BAIRROS_MANAUS !== 'undefined' ? BAIRROS_MANAUS : []).map(name => `<label class="check"><input type="checkbox" name="district" value="${esc(name)}" ${selected.has(name) ? 'checked' : ''}>${esc(name)}</label>`).join('')}</div></fieldset><button class="primary">Salvar cadastro</button></form><h3>Meus serviços reais</h3>${(services || []).map(service => `<article class="service"><b>${esc(service.title)}</b><p>${esc(service.category)} · ${esc(service.subcategory)}</p><p>${esc(service.description)}</p><small>${service.pricing_type === 'quote' ? 'Sob orçamento' : `A partir de R$ ${Number(service.starting_price).toFixed(2).replace('.', ',')}`}</small></article>`).join('') || '<p>Nenhum serviço cadastrado.</p>'}${profile ? '<button class="secondary" id="realAddService">Adicionar serviço</button>' : '<p class="hint">Salve o perfil antes de adicionar serviços.</p>'}<button class="link-button" id="backAccount">Voltar para minha conta</button>`);
    $('#backAccount').onclick = accountView;
    if (profile) $('#realAddService').onclick = () => serviceView();
    $('#realProviderForm').onsubmit = async event => {
      event.preventDefault();
      const form = event.target, data = new FormData(form), chosen = data.getAll('district');
      if (!chosen.length) return providerView('Selecione ao menos um bairro.');
      const button = event.submitter;
      button.disabled = true;
      const payload = { id, display_name: clean(data.get('display_name')), bio: clean(data.get('bio')) };
      const { error } = profile
        ? await client.from('provider_profiles').update({ display_name: payload.display_name, bio: payload.bio }).eq('id', id)
        : await client.from('provider_profiles').insert(payload);
      if (error) return providerView(authMessage(error));
      const old = [...selected];
      const add = chosen.filter(district => !selected.has(district));
      const remove = old.filter(district => !chosen.includes(district));
      if (add.length) {
        const result = await client.from('provider_service_areas').insert(add.map(district => ({ provider_id: id, district })));
        if (result.error) return providerView('Perfil salvo, mas alguns bairros não foram adicionados: ' + authMessage(result.error));
      }
      if (remove.length) {
        const result = await client.from('provider_service_areas').delete().eq('provider_id', id).in('district', remove);
        if (result.error) return providerView('Perfil salvo, mas alguns bairros não foram removidos: ' + authMessage(result.error));
      }
      providerView('Cadastro salvo. A aprovação continua sob análise da equipe.');
    };
  }

  function serviceView(message = '') {
    if (!session) return loginView();
    const catalog = typeof SERVICE_CATALOG !== 'undefined' ? SERVICE_CATALOG : [];
    if (!catalog.length) return modal('<h2>Adicionar serviço</h2><p class="auth-message">O catálogo não carregou. Atualize a página e tente novamente.</p>');
    const groups = [...new Set(catalog.map(item => item.group))];
    modal(`<span class="eyebrow">SERVIÇO REAL</span><h2>Adicionar serviço</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<p class="hint">Selecione um serviço da lista para que ele apareça nas buscas. Descreva apenas o escopo do seu atendimento no campo abaixo.</p><form id="realServiceForm" class="auth-form"><label>Área de serviços<select name="group" id="realGroup" required><option value="">Selecione uma área</option>${groups.map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('')}</select></label><label>Categoria<select name="category" id="realCategory" required><option value="">Selecione uma categoria</option>${catalog.map(item => `<option value="${esc(item.category)}">${esc(item.category)}</option>`).join('')}</select></label><label>Serviço<select name="subcategory" id="realSubcategory" required><option value="">Selecione um serviço</option>${catalog.flatMap(item => item.subs.map(name => `<option value="${esc(name)}">${esc(item.category)} · ${esc(name)}</option>`)).join('')}</select></label><label>O que está incluído<textarea name="description" required minlength="10" maxlength="1000" placeholder="Ex.: avaliação no endereço do cliente; materiais cobrados à parte."></textarea></label><label>Como cobrar?<select name="pricing_type" id="realPricing"><option value="quote">Sob orçamento</option><option value="fixed">Preço inicial</option></select></label><label>Preço inicial em reais<input name="starting_price" id="realPrice" type="number" min="0" step="0.01" placeholder="Somente para preço inicial" disabled></label><button class="primary">Salvar serviço</button></form><button class="link-button" id="backProvider">Voltar</button>`);
    const group = $('#realGroup'), category = $('#realCategory'), subcategory = $('#realSubcategory'), priceInput = $('#realPrice');
    group.onchange = () => {
      const categories = catalog.filter(item => item.group === group.value);
      category.innerHTML = '<option value="">Selecione uma categoria</option>' + categories.map(item => `<option value="${esc(item.category)}">${esc(item.category)}</option>`).join('');
      subcategory.innerHTML = '<option value="">Selecione uma categoria</option>';
    };
    category.onchange = () => {
      const item = catalog.find(item => item.group === group.value && item.category === category.value);
      subcategory.innerHTML = '<option value="">Selecione um serviço</option>' + (item?.subs || []).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
    };
    group.addEventListener('input', group.onchange);
    category.addEventListener('input', category.onchange);
    $('#realPricing').onchange = event => {
      priceInput.disabled = event.target.value !== 'fixed';
      priceInput.required = event.target.value === 'fixed';
      if (priceInput.disabled) priceInput.value = '';
    };
    $('#backProvider').onclick = () => providerView();
    $('#realServiceForm').onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(event.target), type = clean(data.get('pricing_type'));
      const item = catalog.find(entry => entry.group === data.get('group') && entry.category === data.get('category'));
      const selectedService = clean(data.get('subcategory'));
      if (!item || !item.subs.includes(selectedService)) return serviceView('Selecione um serviço válido do catálogo.');
      const price = type === 'fixed' ? Number(data.get('starting_price')) : null;
      if (type === 'fixed' && (!clean(data.get('starting_price')) || !Number.isFinite(price) || price < 0)) return serviceView('Informe um preço inicial válido.');
      event.submitter.disabled = true;
      const { error } = await client.from('provider_services').insert({ provider_id: session.user.id, category: item.category, subcategory: selectedService, title: selectedService.length >= 3 ? selectedService : `Serviço de ${selectedService}`, description: clean(data.get('description')), pricing_type: type, starting_price: price });
      if (error) return serviceView(authMessage(error));
      providerView('Serviço salvo. Ele só ficará público após a aprovação do perfil.');
    };
  }

  function applySession(nextSession) {
    session = nextSession;
    const button = $('#accountButton');
    if (!button) return;
    button.textContent = session ? 'Minha conta' : 'Entrar ou cadastrar';
    button.onclick = accountView;
  }

  const accountButton = $('#accountButton');
  if (accountButton) {
    accountButton.textContent = configured ? 'Entrar ou cadastrar' : 'Configurar cadastro';
    accountButton.onclick = configured ? accountView : setupRequired;
  }
  if (client) {
    client.auth.getSession().then(({ data }) => applySession(data.session));
    client.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
  }
  window.AJURA_AUTH = { client, configured };
  if (client) {
    const script = document.createElement('script');
    script.src = 'real-catalog.js';
    document.body.append(script);
  }
})();
