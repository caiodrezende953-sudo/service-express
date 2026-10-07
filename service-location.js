/* Local privado do pedido: exibicao somente conforme autorizacao do servidor. */
(() => {
 'use strict';if(window.AJURA_LOCATION)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 function markup(profile={},prefix='requestLocation',alreadyAccepted=false){
  return `<fieldset><legend>Local do atendimento</legend><label>Como sera realizado?<select name="service_mode"><option value="on_site">No endereco informado</option><option value="remote">Remoto / online</option></select></label><div data-location-fields><label>Rua ou avenida<input name="location_line" minlength="3" maxlength="160" required value="${C.safe(profile.address_line||'')}"></label><label>Numero<input name="location_number" maxlength="20" required value="${C.safe(profile.address_number||'')}" placeholder="Numero ou S/N"></label><label>Complemento (opcional)<input name="location_complement" maxlength="100" value="${C.safe(profile.address_complement||'')}"></label><label>Ponto de referencia (opcional)<textarea name="location_reference" maxlength="300">${C.safe(profile.address_reference||'')}</textarea></label></div><label class="check"><input type="checkbox" name="location_confirmed" id="${C.safe(prefix)}" required>Confirmo o local ou atendimento remoto deste pedido.</label><p class="hint">Confira tambem o bairro selecionado. Uma copia do local ficara vinculada ao pedido; editar seu perfil nao altera essa copia. ${alreadyAccepted?'Como a proposta ja foi aceita, confirmar libera o endereco ao prestador aprovado desse pedido.':'O endereco completo so sera liberado ao prestador aprovado desse pedido depois que voce aceitar a proposta.'} Nao sera possivel trocar o local por esta tela depois de enviar; em caso de erro, procure a Central.</p></fieldset>`;
 }
 function bind(form){
  const mode=form.elements.service_mode,fields=form.querySelector('[data-location-fields]');
  function update(){const onsite=mode.value==='on_site';fields.hidden=!onsite;fields.querySelectorAll('input,textarea').forEach(el=>{el.disabled=!onsite;el.required=onsite&&['location_line','location_number'].includes(el.name);});form.elements.location_confirmed.checked=false;}
  mode.onchange=update;update();
 }
 function read(form){
  const mode=form.elements.service_mode.value;if(!['on_site','remote'].includes(mode))throw new Error('Escolha atendimento no local ou remoto.');
  if(!form.elements.location_confirmed.checked)throw new Error('Confirme o local ou atendimento remoto deste pedido.');
  const value=n=>form.elements[n].value.trim();
  if(mode==='on_site'&&(value('location_line').length<3||value('location_line').length>160||!value('location_number')||value('location_number').length>20||value('location_complement').length>100||value('location_reference').length>300))throw new Error('Confira rua, numero, complemento e referencia.');
  return {service_mode:mode,location_line:mode==='on_site'?value('location_line'):null,location_number:mode==='on_site'?value('location_number'):null,location_complement:mode==='on_site'?value('location_complement'):null,location_reference:mode==='on_site'?value('location_reference'):null};
 }
 function submissionKey(){
  if(window.crypto?.randomUUID)return window.crypto.randomUUID();
  if(window.crypto?.getRandomValues){const bytes=window.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const s=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
  throw new Error('Atualize o navegador para enviar a solicitacao com seguranca.');
 }
 async function attach(request,actor,body,refresh){
  const section=document.createElement('section');section.className='ajura-order-overview';section.setAttribute('aria-label','Local do atendimento');body.append(section);section.textContent='Consultando local do atendimento…';
  try{
   const {data,error}=await client.rpc('request_location_context',{target_request:request.id});if(!section.isConnected)return;if(error||!data)throw error||new Error('Resposta invalida');
   const a=data.address;
   section.innerHTML=`<h3>Local do atendimento</h3><p>Bairro: ${C.safe(data.district)}</p>${!data.confirmed?'<p>Este pedido ainda nao tem local confirmado. Nenhum endereco foi copiado automaticamente do perfil.</p>':data.service_mode==='remote'?'<p><b>Atendimento remoto / online</b></p><p>Nenhum endereco fisico foi registrado para este pedido.</p>':a?`<p class="ajura-review-comment"><b>${C.safe(a.line)}, ${C.safe(a.number)}</b>${a.complement?`<br>${C.safe(a.complement)}`:''}${a.reference?`<br>Referencia: ${C.safe(a.reference)}`:''}</p><p class="hint">Local confirmado em ${C.time(data.confirmed_at)}. Esta copia nao muda quando o perfil e editado.</p>`:'<p>Endereco completo protegido. A consulta depende do aceite, do estado do pedido e da autorizacao do prestador.</p>'}`;
   if(data.can_confirm&&actor===request.client_id){
    const {data:profile,error:profileError}=await client.from('profiles').select('address_line,address_number,address_complement,address_reference').eq('id',actor).single();if(!section.isConnected)return;if(profileError)throw profileError;
    const accepted=request.status==='in_progress'||Boolean(data.quote_accepted);
    section.insertAdjacentHTML('beforeend',`<form data-confirm-location class="auth-form">${markup(profile,'legacyLocation',accepted)}<button type="submit" class="primary">Confirmar local deste pedido</button><p data-location-status role="status"></p></form>`);
    const form=section.querySelector('form');bind(form);const report=m=>{if(form.isConnected)form.querySelector('[data-location-status]').textContent=m;};
    C.handleForm(form,async()=>{
     let values;try{values=read(form);}catch(e){return report(e.message);}
     if(!window.confirm(accepted?'Confirmar o local e liberar o endereco ao prestador aprovado deste pedido?':'Confirmar este local? Ele ficara vinculado ao pedido.'))return;
     const {error}=await client.rpc('confirm_request_location',{target_request:request.id,...values});if(!form.isConnected)return;if(error)return report(error.message||'Nao foi possivel confirmar.');
     document.dispatchEvent(new Event('ajura:requests-changed'));await refresh();
    },report);
   }
  }catch{if(section.isConnected)section.innerHTML='<h3>Local do atendimento</h3><p role="status">Local indisponivel. Confira request-location.sql e atualize a conversa.</p>';}
 }
 window.AJURA_LOCATION=Object.freeze({markup,bind,read,submissionKey,attach});
})();
