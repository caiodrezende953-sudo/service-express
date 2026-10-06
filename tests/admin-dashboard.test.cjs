const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
function setup(fail=false){
 const {document}=parseHTML('<html><body><dialog id="modal"><div id="modalBody"></div></dialog></body></html>');document.querySelector('#modal').close=()=>{};
 const calls=[],auth=[],window={};
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.AJURA_CORE={safe,time:()=> '06/10/2026'};
 window.AJURA_AUTH={client:{auth:{onAuthStateChange:f=>auth.push(f)},rpc:async(name,args)=>{calls.push([name,args]);return fail?{error:{message:'denied'}}:{data:name==='admin_provider_history'?{rows:[{decision:'approved',note:'<img src=x>',administrator:'Admin'}],total:1}:{rows:[{id:'provider',display_name:'<script>Nome</script>',approval_status:'approved'}],counts:{approved:1},total:1}};}}};
 const context={window,document,esc:safe,$:q=>document.querySelector(q),modal:html=>document.querySelector('#modalBody').innerHTML=html};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8'),context);
 return {window,document,calls,auth};
}
test('Painel mostra contagem, escapa nomes e consulta historico',async()=>{const s=setup();await s.window.AJURA_ADMIN.open();const root=s.document.querySelector('#modalBody');assert.match(root.textContent,/Aprovados: 1/);assert.equal(root.querySelector('script'),null);await root.querySelector('[data-history]').onclick();assert.equal(root.querySelector('img'),null);assert.match(root.textContent,/Sem nome|Admin/);assert.equal(s.calls[1][0],'admin_provider_history');});
test('Erro de autorizacao nao revela cadastros',async()=>{const s=setup(true);await s.window.AJURA_ADMIN.open();assert.equal(s.document.querySelector('[data-history]'),null);assert.match(s.document.querySelector('#modalBody').textContent,/Nao foi possivel/);});
test('Saida da conta remove informacoes administrativas',async()=>{const s=setup();await s.window.AJURA_ADMIN.open();s.auth[0]('SIGNED_OUT');assert.equal(s.document.querySelector('[data-history]'),null);assert.match(s.document.querySelector('#modalBody').textContent,/Sessao encerrada/);});
