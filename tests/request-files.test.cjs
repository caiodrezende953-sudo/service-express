const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
function setup(rows=[],queryError=null){
 const {document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const window={};
 window.AJURA_CORE={safe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),handleForm:()=>{}};
 window.AJURA_AUTH={client:{from:()=>({select(){return this},eq(){return this},order(){return this},then(resolve){return Promise.resolve({data:rows,error:queryError}).then(resolve)}})}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../request-files.js'),'utf8'),{window,document,URL,crypto:require('node:crypto').webcrypto});
 return {api:window.AJURA_REQUEST_FILES,root:document.querySelector('#root')};
}
function file(type,bytes,size=bytes.length){return {type,size,slice:()=>({arrayBuffer:async()=>Uint8Array.from(bytes).buffer})};}
test('Tipos e limites de anexos',async()=>{
 const {api}=setup();
 await api.validate(file('image/jpeg',[255,216,255,224]));
 await api.validate(file('image/png',[137,80,78,71,13,10,26,10]));
 await api.validate(file('application/pdf',[37,80,68,70,45]));
 for(const f of [file('image/svg+xml',[1]),file('image/png',[1,2]),file('image/jpeg',[255,216,255],5242881),file('application/pdf',[],0)])await assert.rejects(api.validate(f));
});
test('Prestador e pedido encerrado não recebem formulário de upload',async()=>{
 for(const [actor,status] of [['provider','requested'],['client','cancelled']]){
  const {api,root}=setup();await api.attach({id:'request',client_id:'client',status},actor,root);
  assert.equal(root.querySelector('form'),null);
 }
});
test('Cliente recebe envio; nomes de arquivos são tratados como texto',async()=>{
 const {api,root}=setup([{original_name:'<script>alert(1)</script>.jpg',file_size:1000}]);
 await api.attach({id:'request',client_id:'client',status:'requested'},'client',root);
 assert.ok(root.querySelector('form'));assert.equal(root.querySelector('script'),null);assert.match(root.textContent,/<script>/);
});
test('Cinco anexos bloqueiam novo envio; erro de consulta não libera upload',async()=>{
 const full=setup(Array.from({length:5},()=>({original_name:'Foto',file_size:1})));
 await full.api.attach({id:'request',client_id:'client',status:'requested'},'client',full.root);assert.equal(full.root.querySelector('form'),null);
 const failed=setup([],new Error('RLS'));await failed.api.attach({id:'request',client_id:'client',status:'requested'},'client',failed.root);
 assert.equal(failed.root.querySelector('form'),null);assert.match(failed.root.textContent,/indisponíveis/);
});
