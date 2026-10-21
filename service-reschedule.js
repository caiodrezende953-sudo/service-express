/* Reagendamento bilateral. A data só muda após confirmação do cliente no servidor. */
(() => {
 'use strict';
 if (window.AJURA_RESCHEDULE) return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE,S=window.AJURA_SAFE_ACTIONS;
 if(!client||!C||!S)return;
 async function attach(request,actor,body,refresh,central=false){
  const section=document.createElement('section');section.className='ajura-order-overview';section.setAttribute('aria-label','Reagendar atendimento');body.append(section);
  let token;
  const alive=()=>section.isConnected&&S.current(token)&&token.id===actor;
  try{
   token=await S.snapshot();if(!alive()){section.remove();return;}
   const {data,error}=await client.rpc('request_schedule_context',{target_request:request.id});if(!alive())return;if(error)throw C.userError(error.message||'Não foi possível confirmar o reagendamento.');
   if(!data.current_date&&!data.history?.length){section.remove();return;}
   const pending=data.pending;
   section.innerHTML=`<h3>Data do atendimento</h3><p>Data combinada: <b>${C.date(data.current_date)}</b></p><p class="hint">Uma nova data precisa do aceite do cliente. Valor, escopo, materiais e local permanecem os mesmos.</p>${pending?`<p>Nova data proposta: <b>${C.date(pending.proposed_date)}</b></p><p>${C.safe(pending.reason)}</p>${!central&&actor===request.client_id?'<div class="ajura-chat-actions"><button type="button" class="primary" data-date-decision="accepted">Aceitar nova data</button><button type="button" class="secondary" data-date-decision="rejected">Manter data anterior</button></div>':'<p>Aguardando o cliente responder à nova data.</p>'}`:''}${!central&&data.can_propose?`<details><summary>${pending?'Propor outra data':'Reagendar atendimento'}</summary><form class="auth-form" data-propose-date><label>Nova data<input name="date" type="date" min="${C.today()}" required></label><label>Motivo do reagendamento<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><button class="primary" type="submit">Enviar data para o cliente</button></form></details>`:''}<p data-schedule-status role="status"></p>${data.history?.length?`<details><summary>Últimos reagendamentos</summary>${data.history.map(h=>`<p>${C.date(h.proposed_date)} · ${C.safe({pending:'Aguardando cliente',accepted:'Aceito',rejected:'Recusado',superseded:'Substituído ou encerrado'}[h.status]||h.status)}<br>${C.safe(h.reason)}</p>`).join('')}</details>`:''}`;
   const report=m=>{if(alive())section.querySelector('[data-schedule-status]').textContent=m;};
   const form=section.querySelector('[data-propose-date]');if(form)C.handleForm(form,async()=>{
    const date=form.elements.date.value,reason=form.elements.reason.value.trim();if(!date||date<C.today()||reason.length<10||reason.length>1000)throw C.userError('Escolha uma data atual ou futura e explique o motivo em 10 a 1000 caracteres.');
    const args={target_request:request.id,new_date:date,schedule_reason:reason};await S.guard(token,form);const attempt=await S.requestKey(`schedule:${request.id}`,actor,args);await S.guard(token,form);
    const {data:receipt,error}=await client.rpc('propose_request_schedule',{...args,submission_key:attempt.key});if(!alive())return;if(error)throw C.userError(error.message||'Não foi possível confirmar o reagendamento.');if(!receipt)throw C.userError('Envio ainda não confirmado. Repita com os mesmos dados.');attempt.clear();await refresh();
   },report);
   let sending=false;const buttons=[...section.querySelectorAll('[data-date-decision]')];buttons.forEach(button=>button.onclick=async()=>{
    if(sending||!window.confirm(button.dataset.dateDecision==='accepted'?'Aceitar a nova data mantendo o mesmo valor e escopo?':'Recusar a nova data e manter o combinado anterior?'))return;
    sending=true;buttons.forEach(b=>b.disabled=true);
    try{await S.guard(token,button);const {data:receipt,error}=await client.rpc('respond_request_schedule',{target_schedule:pending.id,decision:button.dataset.dateDecision});if(!alive())return;if(error)throw C.userError(error.message||'Não foi possível confirmar o reagendamento.');if(!receipt?.status)throw C.userError('Resposta ainda não confirmada. Atualize a conversa.');document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();}
    catch(e){report(e.message||'Não foi possível responder. Atualize a conversa antes de repetir.');}
    finally{sending=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false;});}
   });
  }catch{if(section.isConnected)section.textContent='Reagendamento indisponível. Atualize a conversa para tentar novamente.';}
 }
 window.AJURA_RESCHEDULE=Object.freeze({attach});
})();
