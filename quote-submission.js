/* Chave opaca por conteúdo da tentativa; sem textos ou tokens no armazenamento. */
(() => {
 const memory=new Map();
 async function requestKey(requestId,actor,payload){
  const slot=`ajura-quote-v1:${actor}:${requestId}`;
  const bytes=new TextEncoder().encode(JSON.stringify([payload.total,payload.service_scope.trim(),payload.materials_details.trim(),payload.service_date]));
  const fingerprint=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  let saved=memory.get(slot);try{const raw=window.sessionStorage?.getItem(slot);if(raw)saved=JSON.parse(raw);}catch{}
  const valid=saved?.fingerprint===fingerprint&&/^[0-9a-f-]{36}$/.test(saved?.key||'');
  const entry=valid?saved:{fingerprint,key:crypto.randomUUID()};memory.set(slot,entry);
  try{window.sessionStorage?.setItem(slot,JSON.stringify(entry));}catch{}
  return {key:entry.key,retry:valid,clear(){if(memory.get(slot)?.key!==entry.key)return;memory.delete(slot);try{const current=JSON.parse(window.sessionStorage?.getItem(slot)||'null');if(current?.key===entry.key)window.sessionStorage.removeItem(slot);}catch{}}};
 }
 window.AJURA_QUOTE_SUBMISSION=Object.freeze({requestKey});
})();
