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
      return `<article class="service admin-review" data-provider-id="${safe(row.provider_id)}"><h3>${safe(row.display_name)}</h3><p>${safe(row.bio)}</p><p><b>Bairros:</b> ${areas.length ? areas.map(safe).join(' · ') : 'Nenhum'}</p><button type="button" class="secondary" data-view-files>Conferir requisitos, identificação e arquivos</button><div class="admin-files"></div><h4>Serviços</h4>${services.length ? services.map(service => `<div class="admin-review-service"><b>${safe(service.category)} · ${safe(service.subcategory)}</b><p>${safe(service.description)}</p><small>${service.active ? 'Ativo' : 'Desativado'} · ${service.pricing_type === 'quote' ? 'Sob orçamento' : `A partir de R$ ${Number(service.starting_price).toFixed(2).replace('.', ',')}`}</small></div>`).join('') : '<p>Nenhum serviço</p>'}<div class="provider-service-actions"><button type="button" class="primary" data-admin-decision="approved" disabled>Aprovar</button><button type="button" class="secondary" data-admin-decision="rejected">Recusar</button></div></article>`;
    }).join('') : '<p class="empty">Nenhum prestador aguardando análise.</p>'}<button type="button" class="link-button" id="adminBack">Voltar para minha conta</button>`);
    $('#adminBack').onclick = () => $('#accountButton').click();
    $('#modalBody').querySelectorAll('[data-view-files]').forEach(button => {
      button.onclick = async () => {
        const article = button.closest('[data-provider-id]');
        const target = article.querySelector('.admin-files');
        const approve = article.querySelector('[data-admin-decision="approved"]');
        approve.disabled = true;
        target.textContent = 'Conferindo requisitos…';
        let check;
        try { check = await client.rpc('provider_approval_checklist', { target_provider: article.dataset.providerId }); }
        catch { target.textContent = 'Falha na conexão. Tente novamente.'; return; }
        if (!target.isConnected) return;
        if (check.error) { target.textContent = 'Não foi possível conferir os requisitos. Confira a migração provider-validation.sql.'; return; }
        const gaps = check.data?.missing || [];
        const summary = gaps.length ? `<p><b>Cadastro incompleto</b></p><ul>${gaps.map(item => `<li>${safe(item)}</li>`).join('')}</ul>` : '<p>Requisitos completos. Confira identidade, arquivos e escopo antes de aprovar.</p>';
        approve.disabled = check.data?.ready !== true;
        const { data: identity, error } = await client.from('provider_private_details').select('business_name, document_number').eq('provider_id', article.dataset.providerId).maybeSingle();
        target.innerHTML = summary + (error ? '<p>Não foi possível carregar a identificação.</p>' : `<p>${safe(identity?.business_name || 'Identificação não preenchida')} · ${safe(identity?.document_number || '')}</p>`);
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

/* Console de consulta. Decisoes preservam o fluxo de requisitos existente. */
(() => {
 'use strict';
 const api=window.AJURA_ADMIN,client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;
 if(!api||!client||!C)return;
 const review=api.open,labels={pending:'Pendentes',approved:'Aprovados',rejected:'Recusados',suspended:'Suspensos'};
 let generation=0;
 async function open(filter='all',search='',page=0){
  const run=++generation;
  modal('<h2>Administracao AJURA</h2><p role="status">Carregando cadastros…</p>');
  const root=document.querySelector('#modalBody');root.dataset.adminDashboard='true';
  try{
   const {data,error}=await client.rpc('admin_provider_dashboard',{filter_status:filter,search_text:search,page_number:page});
   if(run!==generation||!root.isConnected)return;
   if(error)throw error;
   root.innerHTML=`<span class="eyebrow">ADMINISTRACAO AJURA</span><h2>Cadastros de prestadores</h2><p>${Object.entries(labels).map(([key,label])=>`${label}: <b>${Number(data.counts?.[key]||0)}</b>`).join(' · ')}</p><div class="provider-service-actions"><button class="primary" data-review>Revisar pendentes</button><button class="secondary" data-review-moderation>Moderacao de avaliacoes</button><button class="secondary" data-central>Central de atendimento</button></div><form data-filters class="auth-form"><label>Estado<select name="status"><option value="all">Todos</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${key===filter?'selected':''}>${label}</option>`).join('')}</select></label><label>Nome do prestador<input name="search" maxlength="160" value="${C.safe(search)}"></label><button type="submit" class="secondary">Filtrar</button></form><p>${Number(data.total)} cadastro(s) encontrados.</p><div data-list>${(data.rows||[]).map(row=>`<article class="service" data-admin-provider="${C.safe(row.id)}"><h3>${C.safe(row.display_name)}</h3><p>${C.safe(labels[row.approval_status]||row.approval_status)} · Cadastro: ${C.time(row.created_at)}</p>${row.review_note?`<p>Motivo registrado: ${C.safe(row.review_note)}</p>`:''}<button class="secondary" data-history="${C.safe(row.id)}">Historico de decisoes</button><div data-history-body></div><details><summary>${row.approval_status==='suspended'?'Encaminhar para nova analise':'Suspender prestador'}</summary><form data-provider-status class="auth-form" data-provider="${C.safe(row.id)}" data-decision="${row.approval_status==='suspended'?'pending':'suspended'}"><label>Motivo<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><p class="hint">${row.approval_status==='suspended'?'O cadastro voltara a pendente e exigira nova aprovacao.':'A suspensao retira o prestador da vitrine. Pedidos existentes nao sao cancelados automaticamente.'}</p><button class="secondary" type="submit">${row.approval_status==='suspended'?'Enviar para analise':'Confirmar suspensao'}</button><p data-status-result role="status"></p></form></details></article>`).join('')||'<p>Nenhum cadastro nesse filtro.</p>'}</div><div class="provider-service-actions"><button data-prev ${page===0?'disabled':''}>Anterior</button><span>Pagina ${page+1}</span><button data-next ${(page+1)*20>=data.total?'disabled':''}>Proxima</button></div><p data-status role="status"></p>`;
   root.querySelector('[data-filters]').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;open(f.elements.status.value,f.elements.search.value.trim(),0);};
   root.querySelector('[data-prev]').onclick=()=>open(filter,search,page-1);
   root.querySelector('[data-next]').onclick=()=>open(filter,search,page+1);
   root.querySelector('[data-review]').onclick=async()=>{generation++;await review();const body=document.querySelector('#modalBody');const b=document.createElement('button');b.className='secondary';b.textContent='Voltar ao painel administrativo';b.onclick=()=>open(filter,search,page);body.prepend(b);};
   root.querySelector('[data-review-moderation]').onclick=()=>{generation++;if(window.AJURA_REVIEW_MODERATION)window.AJURA_REVIEW_MODERATION.open();else root.querySelector('[data-status]').textContent='Modulo de moderacao indisponivel.';};
   root.querySelector('[data-central]').onclick=()=>{if(window.AJURA_MESSAGING){document.querySelector('#modal').close();window.AJURA_MESSAGING.inbox(0,true);}else root.querySelector('[data-status]').textContent='Modulo da Central indisponivel.';};
   root.querySelectorAll('[data-provider-status]').forEach(form=>{
    C.handleForm(form,async()=>{
     const reason=form.elements.reason.value.trim();
     if(reason.length<10||reason.length>1000)throw new Error('Escreva um motivo de 10 a 1000 caracteres.');
     if(!window.confirm(form.dataset.decision==='suspended'?'Suspender este prestador?':'Retornar este cadastro para nova analise?'))return;
     const {error}=await client.rpc('admin_change_provider_status',{target_provider:form.dataset.provider,decision:form.dataset.decision,reason});
     if(error)throw new Error(error.message||'Nao foi possivel alterar o estado.');
     document.dispatchEvent(new Event('ajura:requests-changed'));
     await open(filter,search,page);
    },message=>{form.querySelector('[data-status-result]').textContent=message;});
   });
   root.querySelectorAll('[data-history]').forEach(b=>{b.onclick=()=>history(b.dataset.history,b.parentElement.querySelector('[data-history-body]'));});
  }catch{if(run===generation)root.innerHTML='<h2>Administracao</h2><p role="alert">Nao foi possivel consultar. Confira a sessao administrativa e execute admin-dashboard.sql.</p>';}
 }
 async function history(id,target,page=0){
  target.textContent='Carregando historico…';
  try{
   const {data,error}=await client.rpc('admin_provider_history',{target_provider:id,page_number:page});
   if(!target.isConnected)return;if(error)throw error;
   target.innerHTML=`<p>Decisoes registradas: ${Number(data.total)}</p>${(data.rows||[]).map(e=>`<p><b>${C.safe(labels[e.decision]||e.decision)}</b> · ${C.time(e.created_at)}<br>Responsavel: ${C.safe(e.administrator||'Sem nome cadastrado')}<br>${e.previous_status?`Estado anterior: ${C.safe(labels[e.previous_status]||e.previous_status)}<br>`:''}${C.safe(e.note||'Sem observacao')}</p>`).join('')||'<p>Nenhuma decisao registrada. Mudancas feitas por outros mecanismos podem nao constar deste historico.</p>'}<button data-hprev ${page===0?'disabled':''}>Anterior</button><span> Pagina ${page+1} </span><button data-hnext ${(page+1)*20>=data.total?'disabled':''}>Proxima</button>`;
   target.querySelector('[data-hprev]').onclick=()=>history(id,target,page-1);target.querySelector('[data-hnext]').onclick=()=>history(id,target,page+1);
  }catch{target.textContent='Falha ao consultar historico. Clique novamente para tentar.';}
 }
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;const root=document.querySelector('#modalBody');if(root?.dataset.adminDashboard){root.textContent='Sessao encerrada.';document.querySelector('#modal')?.close();}}});
 api.open=()=>open();
})();
