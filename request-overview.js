/* Resumo vindo do servidor e linha do tempo independente da conversa. */
(() => {
 'use strict';if(window.AJURA_REQUEST_OVERVIEW)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 const labels={review_submitted:'Avaliacao enviada',request_created:'Solicitação enviada',request_status:'Situação alterada',quote_created:'Orçamento enviado',quote_status:'Resposta ao orçamento',support_opened:'Atendimento da Central aberto',support_resolved:'Atendimento da Central encerrado',file_added:'Anexo enviado',state_observed:'Situação registrada ao ativar o histórico'};
 const quoteLabels={accepted:'Proposta aceita pelo cliente',rejected:'Proposta recusada pelo cliente',superseded:'Proposta substituída',pending:'Aguardando resposta'};
 function describe(event){
  const p=event.payload||{};
  if(event.event_type==='quote_status')return quoteLabels[p.status]||labels.quote_status;
  if(event.event_type==='request_status')return C.statuses[p.status]||labels.request_status;
  return labels[event.event_type]||'Atualização do pedido';
 }
 async function attach(request,actor,body,refresh){
  const section=document.createElement('section');section.className='ajura-order-overview';section.setAttribute('aria-label','Resumo e histórico do pedido');
  const anchor=body.querySelector('.ajura-chat-scope');if(anchor)anchor.after(section);else body.prepend(section);
  let generation=0;
  async function load(page=0){
   const run=++generation,open=section.querySelector('details')?.open||false;
   if(!section.isConnected)return;section.innerHTML='<p role="status">Carregando resumo do pedido…</p>';
   try{
    const {data,error}=await client.rpc('request_overview',{target_request:request.id,page_number:page});if(error)throw error;
    if(run!==generation||!section.isConnected)return;
    const q=data.accepted_quote,r=data.request,events=data.events||[];
    const closed=['cancelled','declined','completed'].includes(r.status);
    section.innerHTML=`<h3>Resumo do combinado</h3><p><strong>${closed||r.status==='in_progress'?C.safe(C.statuses[r.status]):q?'Proposta aceita — atendimento ainda não confirmado':'Aguardando orçamento e aceite'}</strong></p>${q?`<dl><dt>Valor total proposto</dt><dd>${C.safe(C.money(q.amount))}</dd><dt>Data combinada na proposta</dt><dd>${C.date(q.scheduled_date)}</dd><dt>O que está incluído</dt><dd>${C.safe(q.scope)}</dd><dt>Materiais e responsabilidades</dt><dd>${C.safe(q.materials)}</dd><dt>Aceite registrado</dt><dd>${q.legacy_unknown_time?'Data original não disponível':C.time(q.accepted_at)}</dd></dl>`:'<p>O resumo será preenchido quando o cliente aceitar uma proposta. A descrição inicial não substitui o orçamento.</p>'}<p class="hint">Bairro: ${C.safe(r.district)}. Nenhuma cobrança ou liberação de pagamento é feita por esta tela.${closed&&q?' O aceite permanece no histórico; esta solicitação foi encerrada.':''}</p>${r.status==='requested'&&[request.client_id,request.provider_id].includes(actor)?`<button type="button" class="secondary" data-close-order>${actor===request.client_id?'Cancelar solicitação':'Recusar solicitação'}</button><p data-order-status role="status"></p>`:''}<details ${open?'open':''}><summary>Histórico do pedido (${data.total})</summary><p class="hint">Mais recentes primeiro. Mensagens ficam na conversa.</p><ol class="ajura-order-timeline">${events.map(e=>`<li><b>${C.safe(describe(e))}</b><small>${e.payload?.legacy_unknown_time?'Data original não disponível; registrado na ativação':C.time(e.occurred_at)}</small>${e.event_type==='state_observed'?'<p>A data exibida é a conferência do estado antigo, não a data de cancelamento ou recusa.</p>':''}${e.event_type==='quote_created'?`<p>${C.safe(C.money(e.payload?.amount))}</p>`:''}</li>`).join('')||'<li>Nenhum evento registrado.</li>'}</ol><div class="ajura-chat-actions"><button type="button" data-timeline-prev ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1}</span><button type="button" data-timeline-next ${(page+1)*20>=data.total?'disabled':''}>Próxima</button></div></details>`;
    section.querySelector('[data-timeline-prev]').onclick=()=>load(page-1);section.querySelector('[data-timeline-next]').onclick=()=>load(page+1);
    const close=section.querySelector('[data-close-order]');if(close)close.onclick=async()=>{
     if(close.disabled||!window.confirm('Encerrar esta solicitação? O histórico será preservado.'))return;close.disabled=true;
     const report=section.querySelector('[data-order-status]');
     try{const {error}=await client.rpc('close_service_request',{target_request:request.id,decision:actor===request.client_id?'cancelled':'declined'});if(error)throw error;document.dispatchEvent(new Event('ajura:requests-changed'));if(section.isConnected)await refresh();}
     catch(error){if(report.isConnected)report.textContent=error.message||'Falha de conexão. Atualize para conferir o resultado.';}
     finally{if(close.isConnected)close.disabled=false;}
    };
   }catch{if(run===generation&&section.isConnected){section.innerHTML='<h3>Resumo do combinado</h3><p role="status">Resumo indisponível. A conversa continua funcionando.</p><button type="button" data-overview-retry>Tentar novamente</button>';section.querySelector('[data-overview-retry]').onclick=()=>load(page);}}
  }
  await load();
 }
 window.AJURA_REQUEST_OVERVIEW=Object.freeze({attach,describe});
})();
