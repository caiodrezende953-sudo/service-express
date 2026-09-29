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

  function newPasswordView(message = '') {
    if (!client) return setupRequired();
    modal(`<span class="eyebrow">RECUPERAR ACESSO</span><h2>Crie uma nova senha</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<form id="newPasswordForm" class="auth-form"><label>Nova senha<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72"></label><label>Confirme a nova senha<input name="confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="72"></label><button class="primary" type="submit">Salvar nova senha</button></form>`);
    $('#newPasswordForm').onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const password = String(data.get('password') || '');
      if (password !== String(data.get('confirmation') || '')) return newPasswordView('As senhas não coincidem.');
      const button = event.submitter;
      button.disabled = true;
      const { error } = await client.auth.updateUser({ password });
      if (error) return newPasswordView(authMessage(error));
      await client.auth.signOut();
      loginView('Senha alterada. Entre com a nova senha.');
    };
  }

  async function accountView() {
    if (!client) return setupRequired();
    if (!session) return loginView();
    const { data, error } = await client.from('profiles').select('full_name, phone, district, address_line, address_number, address_complement, address_reference, account_type, status').eq('id', session.user.id).single();
    if (error) return modal(`<h2>Minha conta</h2><p class="auth-message">${esc(authMessage(error))}</p><button class="secondary" id="logoutButton">Sair</button>`);
    const { data: isAdmin } = await client.rpc('admin_is_current_user');
    const labels = { client: 'Cliente', provider: 'Prestador', both: 'Cliente e prestador' };
    modal(`<span class="eyebrow">CONTA REAL</span><h2>${esc(data.full_name)}</h2><dl class="profile-data"><div><dt>E-mail</dt><dd>${esc(session.user.email)}</dd></div><div><dt>Celular</dt><dd>${esc(data.phone)}</dd></div><div><dt>Bairro</dt><dd>${esc(data.district)}</dd></div><div><dt>Endereço</dt><dd>${esc(data.address_line || 'Ainda não informado')}${data.address_number ? `, ${esc(data.address_number)}` : ''}${data.address_complement ? ` · ${esc(data.address_complement)}` : ''}</dd></div><div><dt>Perfil</dt><dd>${esc(labels[data.account_type] || data.account_type)}</dd></div><div><dt>Situação</dt><dd>${esc(data.status)}</dd></div></dl><button class="primary" id="editClientButton">Editar meus dados</button>${data.account_type !== 'client' ? '<button class="primary" id="realProviderButton">Meu cadastro profissional</button>' : '<p class="hint">Para prestar serviços, solicite a alteração do tipo de conta durante o piloto.</p>'}${isAdmin === true ? '<button class="secondary" id="adminReviewButton">Analisar prestadores</button>' : ''}<p class="hint">O endereço completo fica protegido e será usado em um pedido somente após a contratação.</p><button class="secondary" id="logoutButton">Sair</button>`);
    $('#editClientButton').onclick = () => editClientView(data);
    if (data.account_type !== 'client') $('#realProviderButton').onclick = providerView;
    if (isAdmin === true) $('#adminReviewButton').onclick = () => window.AJURA_ADMIN?.open();
    $('#logoutButton').onclick = async () => { await client.auth.signOut(); $('#modal').close(); };
  }

  function editClientView(data, message = '') {
    modal(`<span class="eyebrow">CADASTRO DO CLIENTE</span><h2>Meus dados</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<form id="clientProfileForm" class="auth-form"><label>Nome completo<input name="full_name" required minlength="3" maxlength="100" value="${esc(data.full_name)}"></label><label>Celular com DDD<input name="phone" type="tel" required maxlength="20" value="${esc(data.phone)}"></label><label>Bairro<select name="district" required><option value="">Selecione</option>${districts().replace(`value=\"${esc(data.district)}\"`, `value=\"${esc(data.district)}\" selected`)}</select></label><label>Rua ou avenida<input name="address_line" required minlength="3" maxlength="160" value="${esc(data.address_line || '')}"></label><label>Número<input name="address_number" required maxlength="20" value="${esc(data.address_number || '')}"></label><label>Complemento <span class="hint">(opcional)</span><input name="address_complement" maxlength="100" value="${esc(data.address_complement || '')}"></label><label>Ponto de referência <span class="hint">(opcional)</span><textarea name="address_reference" maxlength="300">${esc(data.address_reference || '')}</textarea></label><p class="hint">O endereço completo não aparece na vitrine. Ele será liberado ao prestador somente quando existir um pedido contratado.</p><button class="primary">Salvar meus dados</button></form><button class="link-button" id="backAccount">Voltar</button>`);
    $('#backAccount').onclick = accountView;
    $('#clientProfileForm').onsubmit = async event => {
      event.preventDefault();
      const form = event.target, values = new FormData(form), phone = clean(values.get('phone')).replace(/\D/g, '');
      if (phone.length < 10 || phone.length > 11) return editClientView(data, 'Informe um celular válido com DDD.');
      const button = event.submitter;
      button.disabled = true;
      const payload = { full_name: clean(values.get('full_name')), phone, district: clean(values.get('district')), address_line: clean(values.get('address_line')), address_number: clean(values.get('address_number')), address_complement: clean(values.get('address_complement')), address_reference: clean(values.get('address_reference')) };
      const { error } = await client.from('profiles').update(payload).eq('id', session.user.id);
      if (error) return editClientView(data, authMessage(error));
      accountView();
    };
  }

  async function providerView(message = '') {
    if (!session) return loginView();
    const id = session.user.id;
    const [{ data: profile, error: profileError }, { data: areas, error: areasError }, { data: services, error: servicesError }] = await Promise.all([
      client.from('provider_profiles').select('display_name, bio, approval_status').eq('id', id).maybeSingle(),
      client.from('provider_service_areas').select('district').eq('provider_id', id).order('district'),
      client.from('provider_services').select('id, category, subcategory, title, description, pricing_type, starting_price, active').eq('provider_id', id).order('id')
    ]);
    if (profileError || areasError || servicesError) return modal(`<h2>Cadastro profissional</h2><p class="auth-message">${esc(authMessage(profileError || areasError || servicesError))}</p>`);
    const selected = new Set((areas || []).map(area => area.district));
    const status = { pending: 'Aguardando análise', approved: 'Aprovado', rejected: 'Recusado', suspended: 'Suspenso' };
    modal(`<span class="eyebrow">CADASTRO PROFISSIONAL REAL</span><h2>Meu perfil profissional</h2>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<p>Situação: <b>${esc(profile ? status[profile.approval_status] || profile.approval_status : 'Ainda não enviado')}</b></p><p class="hint">O cadastro não aparece para clientes antes da aprovação. A vitrine atual ainda é demonstrativa.</p><form id="realProviderForm" class="auth-form"><label>Nome profissional<input name="display_name" required minlength="3" maxlength="100" value="${esc(profile?.display_name || '')}"></label><label>Apresentação<textarea name="bio" maxlength="1000">${esc(profile?.bio || '')}</textarea></label><fieldset><legend>Bairros atendidos</legend><div class="area-list">${(typeof BAIRROS_MANAUS !== 'undefined' ? BAIRROS_MANAUS : []).map(name => `<label class="check"><input type="checkbox" name="district" value="${esc(name)}" ${selected.has(name) ? 'checked' : ''}>${esc(name)}</label>`).join('')}</div></fieldset><button class="primary">Salvar cadastro</button></form><h3>Meus serviços reais</h3>${(services || []).map(service => `<article class="service"><b>${esc(service.title)}</b><p>${esc(service.category)} · ${esc(service.subcategory)}</p><p>${esc(service.description)}</p><small>${service.pricing_type === 'quote' ? 'Sob orçamento' : `A partir de R$ ${Number(service.starting_price).toFixed(2).replace('.', ',')}`}</small></article>`).join('') || '<p>Nenhum serviço cadastrado.</p>'}${profile ? '<button class="secondary" id="realAddService">Adicionar serviço</button>' : '<p class="hint">Salve o perfil antes de adicionar serviços.</p>'}<button class="link-button" id="backAccount">Voltar para minha conta</button>`);
    $('#backAccount').onclick = accountView;
    if (profile) $('#realAddService').onclick = () => multiServiceView(services || []);
    if (profile?.approval_status === 'rejected') {
      const { data: review } = await client.from('provider_profiles').select('review_note').eq('id', id).single();
      const notice = document.createElement('div');
      notice.className = 'auth-message';
      const explanation = document.createElement('p');
      explanation.textContent = `Motivo da recusa: ${review?.review_note || 'Entre em contato com a equipe.'}`;
      const resubmit = document.createElement('button');
      resubmit.type = 'button';
      resubmit.className = 'secondary';
      resubmit.textContent = 'Reenviar para análise';
      resubmit.onclick = async () => {
        resubmit.disabled = true;
        const { error } = await client.rpc('provider_resubmit');
        providerView(error ? authMessage(error) : 'Cadastro reenviado para análise.');
      };
      notice.append(explanation, resubmit);
      $('#realProviderForm').before(notice);
    }
    $('#modalBody').querySelectorAll('article.service').forEach((article, index) => {
      const service = services[index];
      if (!service) return;
      const actions = document.createElement('div');
      actions.className = 'provider-service-actions';
      const status = document.createElement('p');
      status.className = 'hint';
      status.textContent = service.active ? 'Oferta ativa' : 'Oferta desativada — não aparece na busca';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'secondary';
      edit.textContent = 'Editar escopo e preço';
      edit.onclick = () => editRealService(service);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'secondary';
      toggle.textContent = service.active ? 'Desativar' : 'Reativar';
      toggle.onclick = async () => {
        toggle.disabled = true;
        const { error } = await client.from('provider_services').update({ active: !service.active }).eq('id', service.id).eq('provider_id', id);
        if (error) return providerView(authMessage(error));
        providerView(service.active ? 'Serviço desativado.' : 'Serviço reativado.');
      };
      actions.append(status, edit, toggle);
      article.append(actions);
    });
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

  function editRealService(service, message = '') {
    if (!session) return loginView();
    modal(`<span class="eyebrow">SERVIÇO REAL</span><h2>Editar ${esc(service.subcategory)}</h2><p>${esc(service.category)} · ${esc(service.title)}</p>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<p class="hint">Mudanças em serviço aprovado devolvem o perfil para análise.</p><form id="editRealServiceForm" class="auth-form"><label>O que está incluído<textarea name="description" required minlength="10" maxlength="1000">${esc(service.description)}</textarea></label><label>Como cobrar?<select name="pricing_type" id="editPricing"><option value="quote" ${service.pricing_type === 'quote' ? 'selected' : ''}>Sob orçamento</option><option value="fixed" ${service.pricing_type === 'fixed' ? 'selected' : ''}>Preço inicial</option></select></label><label>Preço inicial em reais<input name="starting_price" id="editPrice" type="number" min="0" step="0.01" value="${service.starting_price == null ? '' : esc(service.starting_price)}" ${service.pricing_type === 'fixed' ? 'required' : 'disabled'}></label><button class="primary">Salvar alterações</button></form><button type="button" class="link-button" id="backProvider">Voltar</button>`);
    const pricing = $('#editPricing'), priceInput = $('#editPrice');
    pricing.onchange = () => {
      priceInput.disabled = pricing.value !== 'fixed';
      priceInput.required = pricing.value === 'fixed';
      if (priceInput.disabled) priceInput.value = '';
    };
    $('#backProvider').onclick = () => providerView();
    $('#editRealServiceForm').onsubmit = async event => {
      event.preventDefault();
      const data = new FormData(event.target);
      const description = clean(data.get('description'));
      const type = clean(data.get('pricing_type'));
      const rawPrice = clean(data.get('starting_price'));
      const price = type === 'fixed' ? Number(rawPrice) : null;
      if (description.length < 10 || (type === 'fixed' && (!rawPrice || !Number.isFinite(price) || price < 0))) return editRealService(service, 'Confira a descrição e o preço.');
      const button = event.submitter;
      button.disabled = true;
      const { error } = await client.from('provider_services').update({ description, pricing_type: type, starting_price: price }).eq('id', service.id).eq('provider_id', session.user.id);
      if (error) return editRealService(service, authMessage(error));
      providerView('Serviço atualizado. Confira a situação da aprovação.');
    };
  }

  function multiServiceView(existingServices = []) {
    if (!session) return loginView();
    const catalog = typeof SERVICE_CATALOG !== 'undefined' ? SERVICE_CATALOG : [];
    if (!catalog.length) return modal('<h2>Adicionar serviços</h2><p class="auth-message">O catálogo não carregou. Atualize a página.</p>');
    const groups = [...new Set(catalog.map(item => item.group))];
    const saved = new Set(existingServices.map(service => `${service.category}\u0000${service.subcategory}`));
    const selected = new Map();
    modal(`<span class="eyebrow">CADASTRO REAL</span><h2>Adicionar vários serviços</h2><p class="hint">Marque os serviços de uma categoria, depois escolha outra categoria. A seleção fica guardada até você salvar.</p><form id="realMultiServiceForm" class="auth-form"><label>Área de serviços<select id="multiGroup"><option value="">Todas as áreas</option>${groups.map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('')}</select></label><label>Categoria<select id="multiCategory"><option value="">Selecione uma categoria</option>${catalog.map(item => `<option value="${esc(item.category)}">${esc(item.category)}</option>`).join('')}</select></label><fieldset><legend>Serviços da categoria</legend><div id="multiChoices" class="area-list"><p class="hint">Escolha uma categoria.</p></div></fieldset><h3 id="multiCount">Nenhum serviço selecionado</h3><div id="multiCards"></div><p id="multiError" class="auth-message" hidden></p><button class="primary" type="submit">Salvar serviços selecionados</button></form><button class="link-button" id="multiBack" type="button">Voltar</button>`);
    const group = $('#multiGroup'), category = $('#multiCategory'), choices = $('#multiChoices'), cards = $('#multiCards');
    const showChoices = () => {
      const index = catalog.findIndex(item => item.category === category.value);
      const item = catalog[index];
      choices.innerHTML = item ? item.subs.map((name, subIndex) => {
        const key = `${index}:${subIndex}`;
        const exists = saved.has(`${item.category}\u0000${name}`);
        return `<label class="check"><input type="checkbox" data-choice="${key}" ${selected.has(key) ? 'checked' : ''} ${exists ? 'disabled' : ''}>${esc(name)}${exists ? ' · já cadastrado' : ''}</label>`;
      }).join('') : '<p class="hint">Escolha uma categoria.</p>';
    };
    const showSelected = () => {
      $('#multiCount').textContent = `${selected.size} ${selected.size === 1 ? 'serviço selecionado' : 'serviços selecionados'}`;
      cards.innerHTML = [...selected].map(([key, value]) => `<article class="service" data-selected="${key}"><b>${esc(value.category)} · ${esc(value.subcategory)}</b><button type="button" class="link-button" data-remove="${key}">Remover</button><label>O que está incluído<textarea data-field="description" required minlength="10" maxlength="1000" placeholder="Descreva este serviço especificamente">${esc(value.description)}</textarea></label><label>Como cobrar?<select data-field="pricing_type"><option value="quote" ${value.pricing_type === 'quote' ? 'selected' : ''}>Sob orçamento</option><option value="fixed" ${value.pricing_type === 'fixed' ? 'selected' : ''}>Preço inicial</option></select></label><label>Preço inicial em reais<input data-field="starting_price" type="number" min="0" step="0.01" value="${esc(value.starting_price)}" ${value.pricing_type === 'fixed' ? 'required' : 'disabled'}></label></article>`).join('');
    };
    group.onchange = () => {
      category.innerHTML = '<option value="">Selecione uma categoria</option>' + catalog.filter(item => !group.value || item.group === group.value).map(item => `<option value="${esc(item.category)}">${esc(item.category)}</option>`).join('');
      showChoices();
    };
    category.onchange = showChoices;
    group.addEventListener('input', group.onchange);
    category.addEventListener('input', showChoices);
    choices.onchange = event => {
      const key = event.target.dataset.choice;
      if (!key) return;
      const [i, j] = key.split(':').map(Number), item = catalog[i], name = item?.subs[j];
      if (!name || saved.has(`${item.category}\u0000${name}`)) return;
      if (event.target.checked) selected.set(key, { category: item.category, subcategory: name, description: '', pricing_type: 'quote', starting_price: '' });
      else selected.delete(key);
      showSelected();
    };
    const saveField = event => {
      const key = event.target.closest('[data-selected]')?.dataset.selected;
      const field = event.target.dataset.field;
      if (!key || !field || !selected.has(key)) return;
      const item = selected.get(key);
      item[field] = event.target.value;
      if (field === 'pricing_type') {
        const price = event.target.closest('[data-selected]').querySelector('[data-field="starting_price"]');
        price.disabled = item.pricing_type !== 'fixed';
        price.required = item.pricing_type === 'fixed';
        if (price.disabled) { price.value = ''; item.starting_price = ''; }
      }
    };
    cards.addEventListener('input', saveField);
    cards.addEventListener('change', saveField);
    cards.onclick = event => {
      const key = event.target.closest('[data-remove]')?.dataset.remove;
      if (!key) return;
      selected.delete(key);
      const checkbox = choices.querySelector(`[data-choice="${key}"]`);
      if (checkbox) checkbox.checked = false;
      showSelected();
    };
    $('#multiBack').onclick = () => providerView();
    $('#realMultiServiceForm').onsubmit = async event => {
      event.preventDefault();
      const errorBox = $('#multiError');
      if (!selected.size) { errorBox.textContent = 'Selecione pelo menos um serviço.'; errorBox.hidden = false; return; }
      const values = [...selected.values()];
      const invalid = values.some(value => !catalog.some(item => item.category === value.category && item.subs.includes(value.subcategory)) || clean(value.description).length < 10 || (value.pricing_type === 'fixed' && (!clean(value.starting_price) || !Number.isFinite(Number(value.starting_price)) || Number(value.starting_price) < 0)));
      if (invalid) { errorBox.textContent = 'Confira a descrição e o preço de cada serviço.'; errorBox.hidden = false; return; }
      const payload = values.map(value => ({ provider_id: session.user.id, category: value.category, subcategory: value.subcategory, title: value.subcategory.length >= 3 ? value.subcategory : `Serviço de ${value.subcategory}`, description: clean(value.description), pricing_type: value.pricing_type, starting_price: value.pricing_type === 'fixed' ? Number(value.starting_price) : null }));
      const button = event.submitter;
      button.disabled = true;
      const { error } = await client.from('provider_services').insert(payload);
      if (error) { button.disabled = false; errorBox.textContent = authMessage(error); errorBox.hidden = false; return; }
      providerView(`${payload.length} ${payload.length === 1 ? 'serviço salvo' : 'serviços salvos'}. O cadastro continua sujeito à análise.`);
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
    client.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setTimeout(() => newPasswordView(), 0);
    });
  }
  window.AJURA_AUTH = { client, configured };
  if (client) {
    const script = document.createElement('script');
    script.src = 'real-catalog.js';
    document.body.append(script);
    const adminScript = document.createElement('script');
    adminScript.src = 'admin.js';
    document.body.append(adminScript);
  }
})();
