/* AJURA: utilitários compartilhados. Sem dados pessoais persistidos no navegador. */
(() => {
 'use strict';
 const statuses = Object.freeze({requested:'Aberta',in_progress:'Em execucao',completed:'Concluido',cancelled:'Cancelada',declined:'Recusada pelo profissional'});
 const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const date = value => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : 'Data não informada'; };
 const time = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Data indisponível' : d.toLocaleString('pt-BR',{timeZone:'America/Manaus'}); };
 const money = value => { if(value === null || value === undefined || !Number.isFinite(Number(value))) return 'Indisponível'; return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); };
 const missingProfile = p => {
  const fields = [];
  if ((p?.full_name || '').trim().length < 3) fields.push('Nome completo');
  if (!/^\d{10,11}$/.test((p?.phone || '').replace(/\D/g,''))) fields.push('Celular com DDD');
  if ((p?.district || '').trim().length < 2) fields.push('Bairro');
  if ((p?.address_line || '').trim().length < 3) fields.push('Rua ou avenida');
  if (!(p?.address_number || '').trim()) fields.push('Número do endereço (ou S/N)');
  return fields;
 };
 const activeConnection = rows => Boolean(rows?.length && new Date(rows[0].token_expires_at).getTime() > Date.now());
 const debounce = (fn, delay=180) => {let timer; return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay);};};
 // Impede dois envios simultâneos do mesmo formulário; sempre libera em falha.
 function handleForm(form, handler, report) {
  if (!form) return;
  form.onsubmit = async event => {
   event.preventDefault(); if (form.dataset.busy === 'true') return;
   const button = event.submitter || form.querySelector('button[type="submit"],button.primary');
   form.dataset.busy='true'; form.setAttribute('aria-busy','true');
   if(button) button.disabled=true;
   try { await handler(event); }
   catch { if(form.isConnected) report('Falha de conexão. Confira o resultado antes de repetir o envio.'); }
   finally {delete form.dataset.busy;form.removeAttribute('aria-busy');if(button?.isConnected) button.disabled=false;}
  };
 }
 function counter(textarea) {
  if(!textarea || textarea.dataset.counter) return;
  textarea.dataset.counter='true';const el=document.createElement('small');el.className='hint field-counter';
  textarea.after(el); const update=()=>el.textContent=`${textarea.value.length} / ${textarea.maxLength} caracteres`;
  textarea.addEventListener('input',update);update();
 }
 async function allRows(factory, pageSize=500, maxRows=10000) {
  const rows=[];
  for(let start=0;start<maxRows;start+=pageSize){
   const {data,error}=await factory().range(start,start+pageSize-1);
   if(error) throw error;
   rows.push(...(data||[]));if(!data || data.length<pageSize)return {rows,truncated:false};
  }
  return {rows,truncated:true};
 }
 window.AJURA_CORE=Object.freeze({safe,today,date,time,money,statuses,missingProfile,activeConnection,debounce,handleForm,counter,allRows,version:'2026.10.05.1'});
})();

/* Dígitos verificadores: não substitui conferência de identidade. */
(() => {
  const normalize = value => String(value ?? '').trim().toUpperCase().replace(/[.\/\-\s]/g, '');
  function valid(value) {
    const doc = normalize(value);
    if (/^([0-9])\1+$/.test(doc)) return false;
    if (/^[0-9]{11}$/.test(doc)) {
      for (let size = 9; size <= 10; size++) {
        let sum = 0;
        for (let i = 0; i < size; i++) sum += Number(doc[i]) * (size + 1 - i);
        const digit = (sum * 10 % 11) % 10;
        if (digit !== Number(doc[size])) return false;
      }
      return true;
    }
    if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(doc)) return false;
    for (let size = 12; size <= 13; size++) {
      let sum = 0;
      for (let i = 0; i < size; i++) sum += (doc.charCodeAt(i) - 48) * ((size - 1 - i) % 8 + 2);
      const remainder = sum % 11;
      if ((remainder < 2 ? 0 : 11 - remainder) !== Number(doc[size])) return false;
    }
    return true;
  }
  window.AJURA_DOCUMENT = Object.freeze({ normalize, valid });
})();
