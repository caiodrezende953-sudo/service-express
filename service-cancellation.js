/* Cancelamento durante a execucao: solicitacao, decisao e historico no servidor. */
(() => {
 'use strict';if(window.AJURA_SERVICE_CANCELLATION)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 const labels={pending:'Aguardando analise da Central',approved:'Cancelamento aprovado',rejected:'Cancelamento nao aprovado',superseded:'Solicitacao encerrada por mudanca do pedido'};
 async function attach(request,actor,body,refresh,central=false){
  const section=document.createElement('section');section.className='ajura-order-overview';section.setAttribute('aria-label','Cancelamento durante a execucao');body.append(section);let generation=0;
  async function load(page=0){
   const run=++generation;section.textContent='Consultando solicitacoes de cancelamento…';
   try{
    const {data,error}=await client.rpc('service_cancellation_context',{target_request:request.id,page_number:page});if(run!==generation||!section.isConnected)return;if(error)throw error;
    if(!data.total&&!data.can_request){section.remove();return;}
    const participant=[request.client_id,request.provider_id].includes(actor);
    section.innerHTML=`<h3>Cancelamento durante a execucao</h3><p class="hint">Solicitar analise nao pausa nem cancela automaticamente o pedido. Motivo e decisao ficam visiveis ao cliente, prestador e Central. Esta tela nao faz cobrancas, estornos ou repasses.</p>${data.pending_id?'<p><b>Ha uma solicitacao aguardando analise da Central.</b> Se houver problema com o servico, nao compartilhe o codigo de conclusao antes de conferir o resultado.</p>':''}${!central&&participant&&data.can_request?'<details><summary>Solicitar cancelamento pela Central</summary><form data-cancel-request class="auth-form"><label>Motivo<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><p class="hint">Explique o problema. Nao inclua documentos ou dados pessoais desnecessarios. A equipe precisara ouvir os dois lados.</p><button type="submit" class="secondary">Enviar para analise</button><p data-cancellation-status role="status"></p></form></details>':''}${central&&data.can_decide?'<form data-cancel-decision class="auth-form"><label>Decisao<select name="decision"><option value="continue">Manter pedido em execucao</option><option value="cancel">Aprovar cancelamento</option></select></label><label>Justificativa<textarea name="resolution" minlength="10" maxlength="2000" required></textarea></label><p class="hint">Confira o combinado e as mensagens de ambos os lados. A decisao nao confirma conclusao e nao determina automaticamente valores a pagar ou devolver.</p><button type="submit" class="secondary">Registrar decisao</button><p data-cancellation-status role="status"></p></form>':''}<details><summary>Historico de solicitacoes (${Number(data.total)})</summary>${(data.rows||[]).map(r=>`<article class="service"><b>${C.safe(labels[r.status]||r.status)}</b><p>Solicitado pelo ${r.requested_by===request.client_id?'cliente':'prestador'} · ${C.time(r.created_at)}</p><p class="ajura-review-comment">${C.safe(r.reason)}</p>${r.decided_at?`<p>Encerramento da analise: ${C.time(r.decided_at)}</p><p class="ajura-review-comment">${C.safe(r.decision_reason||'')}</p>`:''}</article>`).join('')||'<p>Nenhuma solicitacao registrada.</p>'}<div class="request-toolbar"><button data-prev ${page===0?'disabled':''}>Anterior</button><span>Pagina ${page+1}</span><button data-next ${(page+1)*20>=data.total?'disabled':''}>Proxima</button></div></details>`;
    section.querySelector('[data-prev]').onclick=()=>load(page-1);section.querySelector('[data-next]').onclick=()=>load(page+1);
    const form=section.querySelector('[data-cancel-request]');if(form){
     const report=m=>{if(form.isConnected)form.querySelector('[data-cancellation-status]').textContent=m;};
     C.handleForm(form,async()=>{
      const reason=form.elements.reason.value.trim();if(reason.length<10||reason.length>1000)return report('Explique em 10 a 1000 caracteres.');
      if(!window.confirm('Solicitar analise de cancelamento? O motivo sera compartilhado com o prestador/cliente e a Central.'))return;
      const {error}=await client.rpc('request_service_cancellation',{target_request:request.id,cancellation_reason:reason});if(!form.isConnected)return;if(error)return report(error.message||'Nao foi possivel encaminhar.');
      document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();
     },report);
    }
    const decision=section.querySelector('[data-cancel-decision]');if(decision){
     const report=m=>{if(decision.isConnected)decision.querySelector('[data-cancellation-status]').textContent=m;};
     C.handleForm(decision,async()=>{
      const resolution=decision.elements.resolution.value.trim(),value=decision.elements.decision.value;if(resolution.length<10||resolution.length>2000)return report('Justifique em 10 a 2000 caracteres.');
      if(!window.confirm(value==='cancel'?'Cancelar este pedido e invalidar os codigos restantes? Nenhuma operacao financeira sera executada.':'Registrar que o pedido permanece em execucao?'))return;
      const {error}=await client.rpc('admin_decide_service_cancellation',{target_cancellation:data.pending_id,decision:value,resolution});if(!decision.isConnected)return;if(error)return report(error.message||'Nao foi possivel decidir.');
      document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();
     },report);
    }
   }catch{if(run===generation&&section.isConnected){section.innerHTML='<h3>Cancelamento durante a execucao</h3><p role="status">Nao foi possivel consultar. Confira service-cancellation.sql ou use a Central de atendimento.</p><button data-retry>Tentar novamente</button>';section.querySelector('[data-retry]').onclick=()=>load(page);}}
  }
  await load();
 }
 window.AJURA_SERVICE_CANCELLATION=Object.freeze({attach});
})();
