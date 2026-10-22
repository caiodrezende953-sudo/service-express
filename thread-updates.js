/* Atualização incremental de uma conversa. Sem reconstruir formulários ou mover o foco. */
(() => {
 'use strict';if(window.AJURA_THREAD_UPDATES)return;
 const C=window.AJURA_CORE,client=window.AJURA_AUTH?.client;if(!C||!client)return;
 const cursor=value=>{if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Identificador impreciso');const s=String(value??'0');if(!/^(0|[1-9][0-9]{0,18})$/.test(s)||BigInt(s)>9223372036854775807n)throw Error('Identificador inválido');return s;};
 const normalizeState=s=>JSON.stringify({status:s?.status,preferred_date:s?.preferred_date||null,active_ticket:s?.active_ticket||null,quotes:(s?.quotes||[]).filter(q=>['pending','accepted'].includes(q.status)).map(q=>({id:String(q.id),status:q.status,scheduled_date:q.scheduled_date||null,amount:Number(q.amount)})).sort((a,b)=>a.id.localeCompare(b.id))});
 function attach(options){
  const {request,actor,central,panel,body,normalHistory,supportHistory,initialMessages=[],initialSupport=[],alive,currentChannel,baseline,onChange,onDenied,onRead}=options;
  let stopped=false,timer=null,task=null,abort=null,epoch=0,failures=0,idle=0,urgent=false,version=null,changed=false,saturated=false,readTask=null,readTimer=null;
  let lastError='',lastReadError='',normal=cursor(initialMessages.at(-1)?.id),support=cursor(initialSupport.at(-1)?.id),ackNormal='0',ackSupport='0';
  const known={normal:new Set(initialMessages.map(m=>cursor(m.id))),support:new Set(initialSupport.map(m=>cursor(m.id)))},counts={normal:0,support:0};
  const roots={normal:normalHistory,support:supportHistory};
  for(const [key,rows] of [['normal',initialMessages],['support',initialSupport]])roots[key]?.querySelectorAll('.ajura-chat-message').forEach((node,i)=>{if(rows[i])node.dataset.messageId=cursor(rows[i].id);});
  const notice=document.createElement('div');notice.className='ajura-thread-notice';notice.setAttribute('aria-label','Atualizações da conversa');notice.innerHTML='<p data-thread-status role="status"></p><div><button type="button" data-thread-normal hidden></button><button type="button" data-thread-support hidden></button><button type="button" data-thread-context hidden>Atualizar pedido</button><button type="button" data-thread-retry hidden>Tentar atualização</button></div>';body.before(notice);
  const status=notice.querySelector('[data-thread-status]'),normalButton=notice.querySelector('[data-thread-normal]'),supportButton=notice.querySelector('[data-thread-support]'),contextButton=notice.querySelector('[data-thread-context]'),retry=notice.querySelector('[data-thread-retry]');
  const permitted=()=>!stopped&&alive()&&!panel.hidden;
  const available=()=>permitted()&&!document.hidden&&window.navigator?.onLine!==false&&!options.paused?.()&&!saturated;
  const nearBottom=()=>body.scrollHeight-body.scrollTop-body.clientHeight<=72;
  function paint(){
   if(!permitted())return;
   const text=saturated?'Histórico extenso nesta sessão. Atualize o pedido para continuar.':window.navigator?.onLine===false?'Sem conexão. Seu rascunho continua nesta página.':document.hidden?'Atualização pausada.':lastError|| (changed?'O pedido ou atendimento mudou. Atualize para conferir antes de agir.':lastReadError||'Atualização automática ativa.');
   const unread=[counts.normal?counts.normal+' nova(s) mensagem(ns) na conversa':'',counts.support?counts.support+' nova(s) resposta(s) da Central':''].filter(Boolean).join('; ');
   const announcement=text+(unread?' '+unread+'.':'');if(status.textContent!==announcement)status.textContent=announcement;
   for(const [key,button] of [['normal',normalButton],['support',supportButton]]){button.hidden=counts[key]===0;button.textContent=(key==='normal'?'Ver mensagens':'Ver respostas da Central')+' ('+counts[key]+')';}
   contextButton.hidden=!changed&&!saturated;retry.hidden=!lastError||saturated;retry.disabled=Boolean(task);
  }
  function clearTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
  function schedule(delay){clearTimer();if(available())timer=setTimeout(()=>{timer=null;void poll();},delay);}
  function channelVisible(key){const root=roots[key];if(!root?.isConnected||currentChannel()!==key||root.closest('[hidden]'))return false;const details=root.closest('details');return !details||details.open===true||details.hasAttribute('open');}
  async function markVisible(){
   if(!available()||central||!nearBottom())return;
   const key=currentChannel();if(!['normal','support'].includes(key)||!channelVisible(key))return;
   counts[key]=0;paint();if(readTask)return;
   const n=key==='normal'?normal:ackNormal,s=key==='support'?support:ackSupport;
   if(n===ackNormal&&s===ackSupport)return;
   const run=epoch;
   readTask=(async()=>{try{const {error}=await client.rpc('messaging_mark_read',{target_request:request.id,through_message:n,through_support:s});if(run!==epoch||!permitted())return;if(error)throw error;ackNormal=n;ackSupport=s;lastReadError='';onRead?.();}catch(error){if(run===epoch&&permitted()){if(['42501','PGRST301','PGRST302'].includes(error?.code)){stop();onDenied?.();return;}lastReadError='A leitura ainda não foi confirmada. Você pode continuar conversando.';}}finally{readTask=null;paint();}})();
   await readTask;
  }
  function append(rows,key){
   const root=roots[key],visible=channelVisible(key),follow=visible&&nearBottom();let added=0;
   if(!root)return 0;
   if(known[key].size+rows.filter(m=>!known[key].has(m.id)).length>1000){saturated=true;return 0;}
   for(const m of rows){if(known[key].has(m.id))continue;
    if(!known[key].size)root.replaceChildren();
    const node=document.createElement('article');node.className='ajura-chat-message '+(m.sender_role==='central'?'is-central':m.sender_id===actor?'is-own':'is-received');node.dataset.messageId=m.id;
    const who=document.createElement('b');who.textContent=m.sender_role==='central'?'Central AJURA':m.sender_id===actor?'Você':m.sender_id===request.client_id?'Cliente':'Prestador';
    const text=document.createElement('p');text.textContent=m.body;const date=document.createElement('small');date.textContent=C.time(m.created_at);node.append(who,text,date);root.append(node);known[key].add(m.id);added++;
    if(m.sender_id!==actor&&(!visible||!follow))counts[key]++;
   }
   if(follow)body.scrollTop=body.scrollHeight;
   return added;
  }
  function validateRows(rows,after){
   if(!Array.isArray(rows)||rows.length>50)throw Error('Lote inválido');let previous=BigInt(after);
   return rows.map(m=>{const id=cursor(m.id);if(BigInt(id)<=previous||typeof m.body!=='string'||m.body.length>2000||typeof m.sender_id!=='string'||typeof m.created_at!=='string')throw Error('Mensagem inválida');previous=BigInt(id);return {...m,id};});
  }
  async function poll(){
   if(!available())return;if(task){urgent=true;return task;}clearTimer();urgent=false;const run=epoch,fromNormal=normal,fromSupport=support;let more=false;
   task=(async()=>{let timeout=null;try{
    const S=window.AJURA_SAFE_ACTIONS,token=S?await S.snapshot():null;if(!permitted()||run!==epoch)return;if(!token||token.id!==actor)throw Object.assign(Error('Sessão alterada'),{code:'42501'});
    let query=client.rpc('messaging_updates',{target_request:request.id,after_message:fromNormal,after_support:fromSupport});
    if(typeof AbortController!=='undefined'&&typeof query.abortSignal==='function'){abort=new AbortController();query=query.abortSignal(abort.signal);timeout=setTimeout(()=>abort?.abort(),15000);}
    const {data,error}=await query;if(run!==epoch||!permitted()||!S.current(token))return;if(error)throw error;
    if(!data||String(data.request_id)!==String(request.id)||typeof data.state_version!=='string'||!data.state||!Array.isArray(data.state.quotes)||typeof data.more_messages!=='boolean'||typeof data.more_support!=='boolean')throw Error('Resposta inválida');
    const rows=validateRows(data.messages,fromNormal),supportRows=validateRows(data.support,fromSupport);
    if(cursor(data.next_message)!==(rows.at(-1)?.id||fromNormal)||cursor(data.next_support)!==(supportRows.at(-1)?.id||fromSupport))throw Error('Cursor inesperado');
    // Valida todo o lote antes de alterar a tela ou avançar qualquer cursor.
    const expected=baseline(),comparable=expected.quotes===null?{...data.state,quotes:[]}:data.state;
    const stateChanged=version===null?normalizeState(comparable)!==normalizeState(expected):data.state_version!==version;
    if(stateChanged){changed=true;onChange?.(data.state);}
    version=data.state_version;
    const added=append(rows,'normal')+append(supportRows,'support');
    if(!saturated){normal=cursor(data.next_message);support=cursor(data.next_support);}
    failures=0;lastError='';idle=added?0:Math.min(12,idle+1);more=data.more_messages||data.more_support;paint();await markVisible();
   }catch(error){if(run!==epoch||!permitted())return;if(['42501','PGRST301','PGRST302'].includes(error?.code)){stop();onDenied?.();return;}failures=Math.min(4,failures+1);lastError='Não foi possível buscar novas respostas. Tentaremos novamente; seu rascunho foi preservado.';paint();}
   finally{if(timeout!==null)clearTimeout(timeout);abort=null;task=null;if(available()){const delay=failures?Math.min(120000,10000*2**failures):urgent||more?1000:idle>=12?30000:currentChannel()?5000:15000;urgent=false;schedule(delay);}paint();}})();
   return task;
  }
  function channelChanged(){idle=0;paint();void markVisible();if(available()&&!task)schedule(1000);}
  function scroll(){if(readTimer!==null)clearTimeout(readTimer);readTimer=setTimeout(()=>{readTimer=null;void markVisible();},150);}
  function pause(){clearTimer();if(readTimer!==null)clearTimeout(readTimer);readTimer=null;epoch++;abort?.abort();paint();}
  function wake(){if(!available())return;urgent=true;paint();void poll();void markVisible();}
  function visibility(){if(document.hidden)pause();else wake();}
  function stop(){if(stopped)return;stopped=true;pause();body.removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);window.removeEventListener?.('offline',pause);window.removeEventListener?.('online',wake);window.removeEventListener?.('pagehide',pause);window.removeEventListener?.('pageshow',wake);notice.remove();}
  normalButton.onclick=()=>{options.navigate('conversation');body.scrollTop=body.scrollHeight;void markVisible();};
  supportButton.onclick=()=>{options.navigate('help');body.scrollTop=body.scrollHeight;void markVisible();};
  contextButton.onclick=()=>options.refreshContext();retry.onclick=()=>{urgent=true;void poll();};
  body.addEventListener('scroll',scroll);document.addEventListener('visibilitychange',visibility);window.addEventListener?.('offline',pause);window.addEventListener?.('online',wake);window.addEventListener?.('pagehide',pause);window.addEventListener?.('pageshow',wake);
  paint();void poll();void markVisible();
  return Object.freeze({stop,pause,refresh(){urgent=true;return poll();},channelChanged});
 }
 window.AJURA_THREAD_UPDATES=Object.freeze({attach});
})();
