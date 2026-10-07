/* Avaliacoes reais: escrita e medias controladas pelo servidor. */
(() => {
 'use strict';if(window.AJURA_REVIEWS)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 function label(stats){return !stats?'Avaliacoes indisponiveis':Number(stats.review_count)>0?`${Number(stats.average_rating).toFixed(1).replace('.',',')} ★ · ${Number(stats.review_count)} ${Number(stats.review_count)===1?'avaliação':'avaliações'}`:'Novo na plataforma';}
 async function summary(ids){const {data,error}=await client.rpc('provider_review_summary',{provider_ids:ids});if(error||!Array.isArray(data))throw new Error('Avaliacoes indisponiveis');return new Map(data.map(row=>[row.provider_id,row]));}
 async function attach(request,actor,body,refresh){
  if(![request.client_id,request.provider_id].includes(actor))return;
  const section=document.createElement('section');section.className='ajura-order-overview';body.append(section);section.textContent='Consultando avaliacao…';
  try{
   const {data,error}=await client.rpc('service_review_context',{target_request:request.id});if(!section.isConnected)return;if(error)throw error;
   const r=data.review;
   section.innerHTML=`<h3>Avaliacao do servico</h3>${r?`<p><b>${Number(r.rating)} de 5 estrelas</b> · ${C.time(r.created_at)}</p><p class="ajura-review-comment">${C.safe(r.comment||'Sem comentario')}</p><p class="hint">${r.hidden?'Esta avaliacao foi ocultada da vitrine pela moderacao e nao entra na media. O registro original foi preservado.':'Este pedido ja foi avaliado.'}</p>`:data.can_review&&actor===request.client_id?`<form data-review-form class="auth-form"><fieldset class="ajura-review-stars"><legend>Sua nota, de 1 a 5</legend>${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" required aria-label="${n} ${n===1?'estrela':'estrelas'}"><span aria-hidden="true">${n} ★</span></label>`).join('')}</fieldset><label>Comentario opcional<textarea name="comment" maxlength="500" placeholder="Como foi o servico?"></textarea></label><p class="hint">A nota e o comentario aparecerao nas avaliacoes do profissional. Nao inclua telefone, endereco, documentos ou outros dados pessoais. Depois de enviar, nao e possivel editar por esta tela.</p><button type="submit" class="primary">Enviar avaliacao</button><p data-review-status role="status"></p></form>`:'<p>Avaliacao disponivel somente ao cliente depois da conclusao registrada do servico.</p>'}`;
   const form=section.querySelector('form');if(form){
    form.querySelectorAll('[name="rating"]').forEach(input=>input.onchange=()=>form.querySelectorAll('.ajura-review-stars label').forEach((l,i)=>l.classList.toggle('is-selected',i<Number(input.value))));
    const report=message=>{if(section.isConnected)form.querySelector('[data-review-status]').textContent=message;};
    C.handleForm(form,async()=>{
     const checked=form.querySelector('[name="rating"]:checked'),stars=Number(checked?.value),note=form.elements.comment.value.trim();
     if(!Number.isInteger(stars)||stars<1||stars>5)return report('Selecione uma nota de 1 a 5.');if(note.length>500)return report('Comentario deve ter ate 500 caracteres.');
     if(!window.confirm('Enviar esta avaliacao? Ela sera publicada no perfil do profissional.'))return;
     const {error}=await client.rpc('submit_service_review',{target_request:request.id,stars,review_comment:note});if(!section.isConnected)return;if(error)return report(error.message||'Nao foi possivel enviar a avaliacao.');
     document.dispatchEvent(new Event('ajura:reviews-changed'));document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();
    },report);
   }
  }catch{if(section.isConnected)section.innerHTML='<h3>Avaliacao do servico</h3><p>Avaliacao indisponivel. Confira service-reviews.sql e atualize a conversa.</p>';}
 }
 async function list(providerId,body,page=0){
  body.textContent='Carregando avaliacoes…';
  try{const {data,error}=await client.rpc('provider_review_list',{target_provider:providerId,page_number:page});if(!body.isConnected)return;if(error)throw error;
   body.innerHTML=`<h3>Avaliacoes reais (${Number(data.total)})</h3>${(data.rows||[]).map(r=>`<article class="service" data-review-id="${C.safe(r.id)}"><b>${Number(r.rating)} de 5 estrelas</b><p>${C.safe(r.service_title)} · ${C.time(r.created_at)}</p><p class="ajura-review-comment">${C.safe(r.comment||'Sem comentario')}</p><details><summary>Denunciar avaliacao</summary><form data-report-form class="auth-form"><label>Motivo<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><p class="hint">Denuncie ofensas, dados pessoais ou conteudo irregular. Discordar da nota nao basta para remove-la. A denuncia nao oculta automaticamente a avaliacao.</p><button type="submit" class="secondary">Enviar denuncia</button><p data-report-status role="status"></p></form></details></article>`).join('')||'<p>Nenhuma avaliacao ainda.</p>'}<div class="request-toolbar"><button data-review-prev ${page===0?'disabled':''}>Anterior</button><span>Pagina ${page+1}</span><button data-review-next ${(page+1)*20>=data.total?'disabled':''}>Proxima</button></div>`;
   body.querySelectorAll('[data-report-form]').forEach(form=>{
    const report=m=>{if(form.isConnected)form.querySelector('[data-report-status]').textContent=m;};
    C.handleForm(form,async()=>{
     const reason=form.elements.reason.value.trim();if(reason.length<10||reason.length>1000)return report('Escreva um motivo de 10 a 1000 caracteres.');
     const {error}=await client.rpc('report_service_review',{target_review:form.closest('[data-review-id]').dataset.reviewId,report_reason:reason});
     if(!form.isConnected)return;if(error)return report(error.message||'Falha ao denunciar.');
     form.innerHTML='<p role="status">Denuncia registrada para analise. Reenvios nao criam outra denuncia desta conta para esta avaliacao.</p>';
    },report);
   });
   body.querySelector('[data-review-prev]').onclick=()=>list(providerId,body,page-1);body.querySelector('[data-review-next]').onclick=()=>list(providerId,body,page+1);
  }catch{if(body.isConnected)body.textContent='Nao foi possivel carregar as avaliacoes. Feche e abra novamente para tentar.';}
 }
 window.AJURA_REVIEWS=Object.freeze({attach,summary,label,list});
})();
