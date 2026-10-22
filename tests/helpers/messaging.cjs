const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
function setup(options={}){
 const {document,HTMLElement}=parseHTML('<html><body><header><nav></nav></header><button id="accountButton">Conta</button><dialog id="modal"></dialog></body></html>');
 Object.defineProperty(HTMLElement.prototype,'elements',{configurable:true,get(){return new Proxy({}, {get:(_,key)=>this.querySelector(`[name="${key}"]`)});}});
 document.querySelector('#modal').close=()=>{};
 const calls=[],auth=[],windowEvents=new Map(),window={navigator:{onLine:true},addEventListener:(name,fn)=>windowEvents.set(name,fn)};let actor=options.actor===undefined?'client':options.actor;
 const req={id:'request',client_id:'client',provider_id:'provider',district:'Tarumã',status:'requested',description:'Consertar equipamento',preferred_date:'2026-10-10'};
 const context={request:req,tickets:[],messages:[],history:[{id:1,sender_id:'provider',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-06T13:00:00Z'}]};
 const client={auth:{getSession:async()=>({data:{session:actor?{user:{id:actor}}:null}}),onAuthStateChange:fn=>auth.push(fn)},from:()=>({select(){return this},eq(){return this},single:async()=>({data:req})}),rpc:async(name,args)=>{calls.push([name,args]);if(options.rpc){const custom=await options.rpc(name,args);if(custom!==undefined)return custom;}if(options.fail===name)return {error:{message:'Erro de conexão'}};return {data:name==='support_context'?context:name==='messaging_inbox'?[{id:'request',district:'Tarumã',partner:'Prestador',preview:'Olá',unread:2}]:name==='messaging_unread_count'?2:name==='admin_is_current_user'?Boolean(options.admin):name==='admin_support_queue'?[]:name.endsWith('_message_once')?77:null};}};
 window.AJURA_AUTH={client};window.AJURA_CORE={safe:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),statuses:{requested:'Aberta'},time:()=> '10:00',date:s=>s,counter:()=>{},handleForm:(f,fn,report)=>{f.onsubmit=async e=>{e?.preventDefault();try{await fn()}catch(error){report(error.message)}};}};
 const ctx={window,document,setTimeout:options.setTimeout||(()=>{}),clearTimeout:options.clearTimeout||(()=>{}),setInterval:()=>{}};require('./safety.cjs')(ctx,window);if(options.realCore)vm.runInContext(fs.readFileSync(path.join(__dirname,'../../core.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../messaging.js'),'utf8'),ctx);
 return {window,document,calls,auth,context,windowEvents,ctx,client,api:window.AJURA_MESSAGING,changeActor(id){actor=id;auth.forEach(fn=>fn('SIGNED_IN',{user:{id}}));}};
}

module.exports=setup;
