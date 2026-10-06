/* Codigos privados do cliente. Sem armazenamento no navegador ou movimentacao financeira. */
(() => {
 'use strict';if(window.AJURA_SERVICE_EXECUTION)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 async function attach(request,actor,body,refresh){
  if(![request.client_id,request.provider_id].includes(actor))return;
  const section=document.createElement('section');section.className='ajura-order-overview';section.setAttribute('aria-label','Inicio e conclusao do servico');body.append(section);
  section.textContent='Conferindo andamento…';
  try{
   const {data,error}=await client.rpc('service_execution_context',{target_request:request.id});
   if(!section.isConnected)return;if(error)throw error;
   const isClient=actor===request.client_id,phase=data.phase;
   section.innerHTML=`<h3>Andamento do servico</h3><p><b>${C.safe(C.statuses[data.status]||data.status)}</b></p><p class="hint">Piloto sem pagamento integrado: estes codigos registram apenas inicio e conclusao. Nao cobram nem liberam dinheiro.</p>${data.started_at?`<p>Inicio: ${C.time(data.started_at)}</p>`:''}${data.completed_at?`<p>Conclusao: ${C.time(data.completed_at)}</p>`:''}${phase?`<p>${phase==='start'?'Codigo de inicio':'Codigo de conclusao'}</p>${isClient?`<p>${phase==='start'?'Compartilhe apenas quando o profissional estiver presente e voce autorizar o inicio.':'Compartilhe apenas depois de conferir o servico concluido. Se houver problema, use a Central.'}</p><button type="button" class="primary" data-issue-code>Gerar codigo de ${phase==='start'?'inicio':'conclusao'}</button><div data-issued-code aria-live="polite"></div><p class="hint">Seis numeros, validade de 15 minutos. Gerar outro invalida o anterior. Aguarde 60 segundos entre geracoes.</p>`:`<form data-confirm-code class="auth-form"><label>Codigo informado pelo cliente<input name="code" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off" required></label><button type="submit" class="primary">${phase==='start'?'Confirmar inicio':'Confirmar conclusao'}</button></form><p class="hint">Cinco erros bloqueiam tentativas por 15 minutos. O cliente precisara gerar outro codigo depois desse prazo.</p>`}${data.locked_until?`<p>Ultimo bloqueio registrado ate: ${C.time(data.locked_until)}</p>`:''}`:data.status==='requested'?'<p>O cliente precisa aceitar um orcamento antes de iniciar.</p>':'<p>Nenhum codigo pendente para este pedido.</p>'}<p data-execution-status role="status"></p>`;
   const report=message=>{if(section.isConnected)section.querySelector('[data-execution-status]').textContent=message;};
   const button=section.querySelector('[data-issue-code]');if(button)button.onclick=async()=>{
    if(button.disabled||!window.confirm(phase==='start'?'Gerar codigo para autorizar o inicio deste servico?':'Gerar codigo para confirmar que o servico foi concluido?'))return;
    button.disabled=true;section.querySelector('[data-issued-code]').textContent='';
    try{
     const {data:issued,error}=await client.rpc('issue_service_code',{target_request:request.id});
     if(!section.isConnected)return;if(error)throw error;
     if(!issued||!/^\d{6}$/.test(issued.code)||issued.phase!==phase)throw new Error('Resposta inesperada. Atualize a conversa.');
     const out=section.querySelector('[data-issued-code]');
     const code=document.createElement('strong');code.style.fontSize='1.6rem';code.style.letterSpacing='.25em';code.textContent=issued.code;out.append(code);
     const date=document.createElement('p');date.textContent='Valido ate: '+C.time(issued.expires_at);out.append(date);report('Codigo exibido somente para voce. Ao fechar a conversa ele desaparece da tela.');
    }catch(e){report(e.message||'Falha de conexao. Um codigo pode ter sido gerado; aguarde 60 segundos antes de tentar novamente.');}
    finally{if(button.isConnected)button.disabled=false;}
   };
   const form=section.querySelector('[data-confirm-code]');if(form)C.handleForm(form,async()=>{
    const value=form.elements.code.value.trim();if(!/^\d{6}$/.test(value))throw new Error('Informe os seis numeros do codigo.');
    const {data:result,error}=await client.rpc('confirm_service_code',{target_request:request.id,confirmation_code:value});
    if(!section.isConnected)return;if(error)throw error;
    if(result?.ok!==true){report((result?.message||'Nao foi possivel confirmar.')+(Number.isInteger(result?.remaining_attempts)?` Tentativas restantes: ${result.remaining_attempts}.`:''));return;}
    form.elements.code.value='';document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();
   },report);
  }catch{if(section.isConnected)section.textContent='Andamento indisponivel. Confira a migracao service-codes.sql e atualize a conversa.';}
 }
 window.AJURA_SERVICE_EXECUTION=Object.freeze({attach});
})();
