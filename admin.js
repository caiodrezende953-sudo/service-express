/* Área administrativa do piloto. Toda autorização é conferida no banco. */
(() => {
  const client = window.AJURA_AUTH?.client;
  if (!client) return;
  const safe = value => esc(String(value ?? ''));

  async function open(message = '') {
    const { data, error } = await client.rpc('admin_pending_providers');
    if (error) return modal(`<h2>Análise de prestadores</h2><p class="auth-message">${safe(error.message)}</p>`);
    const rows = data || [];
    modal(`<span class="eyebrow">ADMINISTRAÇÃO AJURA</span><h2>Prestadores aguardando análise</h2>${message ? `<p class="auth-message">${safe(message)}</p>` : ''}<p class="hint">Confira escopo, preços e bairros antes da decisão. Rejeitar não apaga o cadastro.</p>${rows.length ? rows.map(row => {
      const services = Array.isArray(row.services) ? row.services : [];
      const areas = Array.isArray(row.areas) ? row.areas : [];
      return `<article class="service admin-review" data-provider-id="${safe(row.provider_id)}"><h3>${safe(row.display_name)}</h3><p>${safe(row.bio)}</p><p><b>Bairros:</b> ${areas.length ? areas.map(safe).join(' · ') : 'Nenhum'}</p><button type="button" class="secondary" data-view-files>Conferir identificação e arquivos</button><div class="admin-files"></div><h4>Serviços</h4>${services.length ? services.map(service => `<div class="admin-review-service"><b>${safe(service.category)} · ${safe(service.subcategory)}</b><p>${safe(service.description)}</p><small>${service.active ? 'Ativo' : 'Desativado'} · ${service.pricing_type === 'quote' ? 'Sob orçamento' : `A partir de R$ ${Number(service.starting_price).toFixed(2).replace('.', ',')}`}</small></div>`).join('') : '<p>Nenhum serviço</p>'}<div class="provider-service-actions"><button type="button" class="primary" data-admin-decision="approved" ${!areas.length || !services.some(service => service.active) ? 'disabled' : ''}>Aprovar</button><button type="button" class="secondary" data-admin-decision="rejected">Recusar</button></div></article>`;
    }).join('') : '<p class="empty">Nenhum prestador aguardando análise.</p>'}<button type="button" class="link-button" id="adminBack">Voltar para minha conta</button>`);
    $('#adminBack').onclick = () => $('#accountButton').click();
    $('#modalBody').querySelectorAll('[data-view-files]').forEach(button => {
      button.onclick = async () => {
        const article = button.closest('[data-provider-id]');
        const target = article.querySelector('.admin-files');
        const { data: identity, error } = await client.from('provider_private_details').select('business_name, document_number').eq('provider_id', article.dataset.providerId).maybeSingle();
        target.innerHTML = error ? '<p>Não foi possível carregar a identificação.</p>' : `<p>${safe(identity?.business_name || 'Identificação não preenchida')} · ${safe(identity?.document_number || '')}</p>`;
        const files = document.createElement('div'); target.append(files);
        if (window.AJURA_FILES) await window.AJURA_FILES.list(article.dataset.providerId, files);
        else files.textContent = 'Módulo de arquivos não carregado.';
      };
    });

    $('#modalBody').querySelectorAll('[data-admin-decision]').forEach(button => {
      button.onclick = async () => {
        const id = button.closest('[data-provider-id]')?.dataset.providerId;
        const decision = button.dataset.adminDecision;
        const name = button.closest('.admin-review')?.querySelector('h3')?.textContent || 'este prestador';
        if (!id) return;
        let reason = null;
        if (decision === 'rejected') {
          reason = window.prompt(`Explique a ${name} o que precisa ser corrigido:`);
          if (reason === null) return;
          if (reason.trim().length < 10) return open('Escreva um motivo de recusa com pelo menos 10 caracteres.');
        }
        if (!window.confirm(`${decision === 'approved' ? 'Aprovar' : 'Recusar'} ${name}?`)) return;
        button.disabled = true;
        const result = await client.rpc('admin_decide_provider', { target_provider: id, decision, reason });
        if (result.error) return open(result.error.message);
        open(`${name}: ${decision === 'approved' ? 'aprovado' : 'recusado'}.`);
      };
    });
  }

  window.AJURA_ADMIN = { open };
})();
