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
    $('#openSignup').onclick = signupView;
    $('#openRecovery').onclick = recoveryView;
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
    modal(`<span class="eyebrow">CONTA REAL</span><h2>${esc(data.full_name)}</h2><dl class="profile-data"><div><dt>E-mail</dt><dd>${esc(session.user.email)}</dd></div><div><dt>Celular</dt><dd>${esc(data.phone)}</dd></div><div><dt>Bairro</dt><dd>${esc(data.district)}</dd></div><div><dt>Perfil</dt><dd>${esc(labels[data.account_type] || data.account_type)}</dd></div><div><dt>Situação</dt><dd>${esc(data.status)}</dd></div></dl><p class="hint">Edição do perfil e cadastro profissional entram na próxima etapa.</p><button class="secondary" id="logoutButton">Sair</button>`);
    $('#logoutButton').onclick = async () => { await client.auth.signOut(); $('#modal').close(); };
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
})();
