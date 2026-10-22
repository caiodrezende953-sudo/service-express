/* Moderacao: permissoes, estados e auditoria verificados pelo servidor. */
(() => {
 'use strict';
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C||window.AJURA_REVIEW_MODERATION)return;
 const labels={hide:'Ocultar avaliacao',restore:'Restaurar avaliacao',dismiss:'Encerrar sem alterar a avaliacao'};
 let generation=0;
 async function open(filter='open',page=0){
  const run=++generation;modal('<h2>Moderacao de avaliacoes</h2><section data-review-moderation>Carregando denuncias…</section>');
  const section=document.querySelector('[data-review-moderation]');
  try{
   const {data,error}=await client.rpc('admin_review_reports',{filter_status:filter,page_number:page});
   if(run!==generation||!section.isConnected)return;if(error)throw error;
   section.innerHTML=`<p>Uma nota baixa nao justifica remocao. Analise o conteudo e registre o motivo. Ocultar preserva o original e retira a nota da media.</p><div class="request-toolbar"><button data-back>Voltar a administracao</button><button data-open>Abertas</button><button data-closed>Encerradas</button></div><h3>${filter==='open'?'Denuncias abertas':'Denuncias encerradas'} (${Number(data.total)})</h3>${(data.rows||[]).map(r=>`<article class="service"><h3>${C.safe(r.display_name)}</h3><p>${Number(r.rating)} de 5 · ${C.safe(r.service_title)}</p><p class="ajura-review-comment">${C.safe(r.comment||'Sem comentario')}</p><p><b>${r.hidden?'Ocultada':'Visivel'}</b> · Denuncia: ${C.time(r.created_at)}</p><p class="ajura-review-comment">Motivo da denuncia: ${C.safe(r.reason)}</p><button data-history="${C.safe(r.review_id)}">Historico de moderacao</button><div data-history-body></div><form class="auth-form" data-moderate data-report="${C.safe(r.id)}" data-hidden="${r.hidden?'true':'false'}"><label>Decisao<select name="action"><option value="${r.hidden?'restore':'hide'}">${r.hidden?labels.restore:labels.hide}</option>${r.status==='open'?`<option value="dismiss">${labels.dismiss}</option>`:''}</select></label><label>Justificativa<textarea name="reason" minlength="10" maxlength="2000" required></textarea></label><button type="submit" class="secondary">Registrar decisao</button><p data-result role="status"></p></form></article>`).join('')||'<p>Nenhuma denuncia neste filtro.</p>'}<div class="request-toolbar"><button data-prev ${page===0?'disabled':''}>Anterior</button><span>Pagina ${page+1}</span><button data-next ${(page+1)*20>=data.total?'disabled':''}>Proxima</button></div>`;
   section.querySelector('[data-back]').onclick=()=>{generation++;window.AJURA_ADMIN.open();};
   section.querySelector('[data-open]').onclick=()=>open('open',0);section.querySelector('[data-closed]').onclick=()=>open('closed',0);
   section.querySelector('[data-prev]').onclick=()=>open(filter,page-1);section.querySelector('[data-next]').onclick=()=>open(filter,page+1);
   section.querySelectorAll('[data-history]').forEach(b=>{b.onclick=()=>history(b.dataset.history,b.parentElement.querySelector('[data-history-body]'));});
   section.querySelectorAll('[data-moderate]').forEach(form=>{
    const report=m=>{if(form.isConnected)form.querySelector('[data-result]').textContent=m;};
    C.handleForm(form,async()=>{
     const note=form.elements.reason.value.trim();if(note.length<10||note.length>2000)return report('Justifique em 10 a 2000 caracteres.');
     const action=form.elements.action.value;if(!window.confirm(`${labels[action]}? A decisao ficara no historico.`))return;
     const {error}=await client.rpc('admin_moderate_review',{target_report:form.dataset.report,action,moderation_reason:note,expected_hidden:form.dataset.hidden==='true'});
     if(run!==generation||!form.isConnected)return;if(error)return report(error.message||'Nao foi possivel registrar a decisao.');
     document.dispatchEvent(new Event('ajura:reviews-changed'));document.dispatchEvent(new Event('ajura:requests-changed'));await open(filter,page);
    },report);
   });
  }catch{if(run===generation&&section.isConnected)section.textContent='Nao foi possivel consultar. Confira a conta administrativa e a execucao de review-moderation.sql.';}
 }
 async function history(id,body,page=0){
  const marker=document.createElement('p');marker.textContent='Carregando historico…';body.replaceChildren(marker);
  try{const {data,error}=await client.rpc('admin_review_history',{target_review:id,page_number:page});if(!marker.isConnected)return;if(error)throw error;
   body.innerHTML=`<p>${Number(data.total)} decisao(oes) registradas</p>${(data.rows||[]).map(r=>`<p><b>${C.safe(labels[r.decision]||r.decision)}</b> · ${C.time(r.created_at)}<br>Antes: ${r.previous_hidden?'ocultada':'visivel'}<br>${C.safe(r.reason)}</p>`).join('')||'<p>Nenhuma decisao registrada.</p>'}<button data-prev ${page===0?'disabled':''}>Anterior</button><span> Pagina ${page+1} </span><button data-next ${(page+1)*20>=data.total?'disabled':''}>Proxima</button>`;
   body.querySelector('[data-prev]').onclick=()=>history(id,body,page-1);body.querySelector('[data-next]').onclick=()=>history(id,body,page+1);
  }catch{if(marker.isConnected)body.textContent='Historico indisponivel. Tente novamente.';}
 }
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){generation++;const section=document.querySelector('[data-review-moderation]');if(section){section.textContent='Sessao encerrada.';document.querySelector('#modal')?.close();}}});
 window.AJURA_REVIEW_MODERATION=Object.freeze({open});
})();
