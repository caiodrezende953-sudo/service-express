/* Acabamento comum: navegação real, acessibilidade e recuperação de falhas. */
(() => {
 'use strict';
 const C=window.AJURA_CORE;if(!C)return;
 const skip=document.createElement('a');skip.className='skip-link';skip.href='#mainContent';skip.textContent='Ir para o conteúdo';document.body.prepend(skip);
 const main=document.querySelector('main');if(main){main.id='mainContent';main.tabIndex=-1;}
 const notice=document.querySelector('.notice');if(notice)notice.textContent='PILOTO AJURA · Cadastros e solicitações reais · Pagamentos em preparação';
 const how=document.querySelector('footer span');if(how)how.textContent='Profissionais perto. Serviço resolvido. · Piloto em Manaus';
 const explore=document.querySelector('#explore');if(explore){explore.onclick=()=>{window.AJURA_DASHBOARD?.customer();document.querySelector('#realCatalog')?.scrollIntoView({behavior:'smooth'});};}
 const network=document.createElement('div');network.id='networkStatus';network.setAttribute('role','status');network.hidden=navigator.onLine;network.textContent='Você está sem conexão. Dados e envios precisam de internet; confira o resultado antes de repetir uma ação.';document.querySelector('header')?.after(network);
 window.addEventListener('offline',()=>network.hidden=false);window.addEventListener('online',()=>{network.hidden=true;window.AJURA_CATALOG?.refresh();});
 let returnFocus=null;const originalModal=window.modal;
 if(typeof originalModal==='function')window.modal=function(html){returnFocus=document.activeElement;originalModal(html);const body=document.querySelector('#modalBody');setTimeout(()=>{if(body?.isConnected)body.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus();},0);};
 document.querySelector('#modal')?.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
 const wrapped=new WeakMap();
 function decorate(){
  document.querySelectorAll('#modalBody textarea[maxlength]').forEach(C.counter);
  document.querySelectorAll('#modalBody input[type="date"]').forEach(el=>el.min=C.today());
  document.querySelectorAll('#modalBody input[name="phone"]').forEach(el=>{el.inputMode='tel';el.autocomplete='tel';});
  document.querySelectorAll('#modalBody form').forEach(form=>{
   if(['realRequestForm','sendRealMessage'].includes(form.id) || !form.onsubmit || wrapped.get(form)===form.onsubmit)return;
   const original=form.onsubmit;
   const handler=async event=>{
    event.preventDefault();if(form.dataset.submitting==='true')return;
    form.dataset.submitting='true';form.setAttribute('aria-busy','true');
    try{await original.call(form,event);}
    catch{
     if(form.isConnected){let report=form.querySelector('.form-transport-error');if(!report){report=document.createElement('p');report.className='form-transport-error';report.setAttribute('role','alert');form.append(report);}report.textContent='Falha de conexão. Seus campos foram mantidos. Confira se a ação foi concluída antes de tentar novamente.';}
    }finally{delete form.dataset.submitting;form.removeAttribute('aria-busy');if(form.isConnected){const b=event.submitter || form.querySelector('button.primary');if(b)b.disabled=false;}}
   };
   form.onsubmit=handler;wrapped.set(form,handler);
  });
 }
 new MutationObserver(decorate).observe(document.querySelector('#modalBody'),{childList:true,subtree:true});decorate();
 // Exemplos fictícios discretos; a vitrine de profissionais continua sendo real.
 if(!document.querySelector('#demoExamples')){
  const examples=document.createElement('details');examples.id='demoExamples';examples.className='demo-examples';
  examples.innerHTML='<summary>Conheça exemplos de serviços do catálogo</summary><p class="hint">Exemplos demonstrativos. Não representam profissionais cadastrados nem ofertas disponíveis.</p><div class="demo-example-grid"><article><b>Troca de tomada</b><p>Exemplo de elétrica residencial.</p></article><article><b>Reparo de vazamento</b><p>Exemplo de manutenção hidráulica.</p></article><article><b>Fotografia de produtos</b><p>Exemplo de fotografia e mídia.</p></article></div>';
  document.querySelector('#realCatalog')?.after(examples);
 }
 const client=window.AJURA_AUTH?.client;let roleRun=0;
 async function updateRole(){
  const run=++roleRun,toggle=document.querySelector('#ajuraModeToggle');if(!toggle || !client)return;
  try{const {data}=await client.auth.getSession();if(!data.session){if(run===roleRun)toggle.hidden=true;return;}
   const {data:profile,error}=await client.from('profiles').select('account_type,status').eq('id',data.session.user.id).single();
   if(run===roleRun)toggle.hidden=Boolean(error || profile?.status!=='active' || !['provider','both'].includes(profile.account_type));
  }catch{if(run===roleRun)toggle.hidden=true;}
 }
 if(client){client.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT','INITIAL_SESSION'].includes(event)){const toggle=document.querySelector('#ajuraModeToggle');if(toggle)toggle.hidden=true;setTimeout(updateRole,0);}});void updateRole();}
})();
