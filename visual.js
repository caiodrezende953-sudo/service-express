/* Sem consultas ou armazenamento: contexto acessível dos diálogos da AJURA. */
(() => {
 'use strict';if(window.AJURA_VISUAL)return;
 const dialog=document.querySelector('#modal'),body=document.querySelector('#modalBody');if(!dialog||!body)return;
 function decorate(){
  const heading=body.querySelector('h2');
  if(heading){if(!heading.id)heading.id='ajuraModalTitle';dialog.setAttribute('aria-labelledby',heading.id);dialog.removeAttribute('aria-label');}
  else {dialog.removeAttribute('aria-labelledby');dialog.setAttribute('aria-label','AJURA');}
  dialog.dataset.size=body.querySelector('#activitySearch,[data-activity-admin],#requestList')?'wide':'normal';
  const context=document.querySelector('#ajuraModalContext');if(context)context.textContent=document.body.classList.contains('ajura-professional')?'AJURA · ÁREA PROFISSIONAL':'AJURA · MINHA CONTA E SERVIÇOS';
 }
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;Promise.resolve().then(()=>{queued=false;decorate();});};
 new MutationObserver(schedule).observe(body,{childList:true,subtree:true});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});decorate();
 document.addEventListener('ajura:professional',schedule);
 window.AJURA_VISUAL=Object.freeze({decorate});
})();
