(() => {
  'use strict';
  const client = window.AJURA_AUTH?.client;
  if (!client) return;
  const install = () => {
    const form = document.querySelector('#realProviderForm');
    if (!form || document.querySelector('#ajuraMpConnection')) return;
    const section = document.createElement('section');
    section.id = 'ajuraMpConnection';
    section.innerHTML = '<h3>Conectar Mercado Pago — teste</h3><p class="hint">Autorize a conexão da conta de vendedor de teste. Esta etapa não cria cobranças nem ativa pagamentos reais.</p><p role="status" class="hint"></p><button type="button" class="secondary" disabled>Conectar conta de teste</button>';
    form.after(section);
    const status = section.querySelector('[role="status"]');
    const button = section.querySelector('button');
    const load = async () => {
      try {
        const { data, error } = await client.rpc('mp_my_test_connection');
        if (error) throw new Error('Não foi possível consultar a conexão. Confira se executou o SQL desta etapa.');
        if (!section.isConnected) return;
        if (data?.length) {
          status.textContent = 'Conta de teste conectada. Pagamentos ainda não estão ativos.';
          button.textContent = 'Conta conectada';
          return;
        }
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error('Entre novamente na AJURA.');
        const { data: provider, error: providerError } = await client.from('provider_profiles').select('approval_status').eq('id', sessionData.session.user.id).maybeSingle();
        if (providerError) throw new Error('Não foi possível consultar seu cadastro.');
        if (provider?.approval_status !== 'approved') {
          status.textContent = 'A conexão estará disponível depois da aprovação do seu cadastro.';
          return;
        }
        status.textContent = 'Use somente o vendedor de teste configurado para esta integração.';
        button.disabled = false;
      } catch (error) { status.textContent = error.message; }
    };
    button.onclick = async () => {
      button.disabled = true;
      status.textContent = 'Preparando autorização…';
      try {
        const { data, error } = await client.functions.invoke('ajura-mp-connect', { body: {} });
        if (error) {
          let message = 'Não foi possível conectar. Confira a sessão, a aprovação e a publicação da função.';
          try { const body = await error.context?.json(); if (typeof body?.erro === 'string') message = body.erro; } catch {}
          throw new Error(message);
        }
        if (data?.erro) throw new Error(data.erro);
        const url = new URL(data?.authorization_url);
        if (url.origin !== 'https://auth.mercadopago.com' || url.pathname !== '/authorization') throw new Error('Endereço de autorização inválido.');
        window.location.assign(url.href);
      } catch (error) {
        status.textContent = error.message || 'Falha ao iniciar autorização.';
        button.disabled = false;
      }
    };
    void load();
  };
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();
})();
