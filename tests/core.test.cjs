const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx={window:{},Intl,Date,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync('core.js','utf8'),ctx);const C=ctx.window.AJURA_CORE;
(async()=>{
 assert.equal(C.safe('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
 assert.equal(C.date('2026-10-05'),'05/10/2026');assert.match(C.today(),/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(C.money(null),'Indisponível');assert.equal(C.missingProfile({}).length,5);
 assert.equal(C.missingProfile({full_name:'Caio',phone:'(92) 99999-9999',district:'Tarumã',address_line:'Rua A',address_number:'S/N'}).length,0);
 assert.equal(C.activeConnection([{token_expires_at:'2000-01-01'}]),false);assert.equal(C.activeConnection([{token_expires_at:'2099-01-01'}]),true);
 const source=Array.from({length:1101},(_,id)=>({id}));let calls=0;
 const result=await C.allRows(()=>({range:async(a,b)=>{calls++;return {data:source.slice(a,b+1)};}}));assert.equal(result.rows.length,1101);assert.equal(calls,3);assert.equal(result.truncated,false);
 const capped=await C.allRows(()=>({range:async(a,b)=>({data:source.slice(a,b+1)})}),500,1000);assert.equal(capped.truncated,true);
 let failed=false;try{await C.allRows(()=>({range:async()=>({error:new Error('offline')})}));}catch{failed=true;}assert(failed);
 console.log('PASS: escape, datas Manaus, valores ausentes, perfil, expiração, paginação e falha de consulta.');
})();
