/* Estado de envio em memória; nunca grava arquivos, documentos ou tokens no localStorage. */
(() => {
 'use strict';
 const types={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'},validations=new WeakMap();
 async function validateContent(file){if(!file||!types[file.type]||file.size<1||file.size>5242880)throw Error('Use JPG, PNG ou PDF de até 5 MB.');const b=new Uint8Array(await file.slice(0,8).arrayBuffer());const ok=file.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:file.type==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v):[37,80,68,70,45].every((v,i)=>b[i]===v);if(!ok)throw Error('O conteúdo não corresponde ao tipo do arquivo.');}

 async function validate(file){if(!file||typeof file!=='object')throw Error('Selecione um arquivo.');let task=validations.get(file);if(!task){task=validateContent(file).catch(error=>{validations.delete(file);throw error;});validations.set(file,task);}await task;}
 async function key(file,scope){const b=new Uint8Array(await file.arrayBuffer()),prefix=new TextEncoder().encode(scope+'\0'),all=new Uint8Array(prefix.length+b.length);all.set(prefix);all.set(b,prefix.length);const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',all))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}.${types[file.type]}`;}
 function engine({client,bucket,owner,prefix,table,register,guard}){
  const pending=new Map(),fingerprints=new WeakMap();
  async function send(file,kind=''){
   await guard();await validate(file);await guard();let byKind=fingerprints.get(file);if(!byKind){byKind=new Map();fingerprints.set(file,byKind);}let fingerprint=byKind.get(kind);if(!fingerprint){fingerprint=key(file,bucket+':'+prefix+':'+kind).catch(error=>{byKind.delete(kind);throw error;});byKind.set(kind,fingerprint);}const name=await fingerprint;await guard();const path=prefix+'/'+name;
   let job=pending.get(path);if(!job){job={uploaded:false,done:false,busy:false};pending.set(path,job);}if(job.busy)throw Error('Este arquivo já está sendo enviado.');if(job.done)return {path,reused:true};job.busy=true;
   const lookup=async()=>{const r=await client.from(table).select('object_path').eq('object_path',path).maybeSingle();if(r.error)throw Error('Não foi possível conferir o envio anterior. Tente novamente.');return !!r.data;};
   try{
    await guard();if(await lookup()){job.done=true;return {path,reused:true};}
    if(!job.uploaded){
     await guard();const probe=await client.storage.from(bucket).createSignedUrl(path,1);
     if(!probe.error&&probe.data?.signedUrl)job.uploaded=true;
     else if(probe.error&&!/not found|does not exist/i.test(probe.error.message||''))throw Error('Não foi possível conferir o arquivo. Tente novamente.');
     if(!job.uploaded){await guard();const up=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(up.error&&!(/duplicate|already exists/i.test(up.error.message||'')||String(up.error.statusCode)==='409'))throw Error('Falha no envio. Mantenha o arquivo selecionado e tente novamente.');job.uploaded=true;}
    }
    await guard();try{const record=await register(path,file,kind);if(record?.error)throw record.error;}catch{await guard();if(!await lookup())throw Error('O arquivo pode ter chegado, mas o registro não foi confirmado. Tente novamente com o mesmo arquivo.');}
    await guard();job.done=true;return {path,reused:false};
   }finally{job.busy=false;}
  }
  return Object.freeze({send});
 }
 window.AJURA_UPLOAD_FLOW=Object.freeze({engine,validate});
})();
