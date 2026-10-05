/* Painel profissional real. Ganhos só poderão ser contabilizados com repasse confirmado. */
(() => {
 'use strict';
 if(window.AJURA_DASHBOARD)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE,main=document.querySelector('main'),nav=document.querySelector('header nav');
 if(!client || !C || !main || !nav)return;
 const {safe,date,money,activeConnection}=C;
 let generation=0,professional=false,lastUser=null;
 const panel=document.createElement('section');panel.id='ajuraProfessionalDashboard';panel.hidden=true;main.prepend(panel);
 const toggle=document.createElement('button');toggle.hidden=true;toggle.id='ajuraModeToggle';toggle.textContent='Área profissional';toggle.setAttribute('aria-pressed','false');nav.append(toggle);
 function customer(){generation++;professional=false;document.body.classList.remove('ajura-professional');panel.hidden=true;panel.innerHTML='';toggle.textContent='Área profissional';toggle.setAttribute('aria-pressed','false');document.title='AJURA · Encontre serviços em Manaus';}
 async function dashboard(){
  const run=++generation;
  try{
   const {data,error}=await client.auth.getSession();if(run!==generation)return;if(error)throw error;
   const session=data.session;if(!session){customer();document.querySelector('#accountButton')?.click();return;}
   const {data:account,error:accountError}=await client.from('profiles').select('account_type,status,full_name').eq('id',session.user.id).single();
   if(run!==generation)return;if(accountError)throw accountError;
   if(!['provider','both'].includes(account.account_type) || account.status!=='active'){customer();toast('Sua conta precisa ter um perfil profissional ativo.');return;}
   professional=true;lastUser=session.user.id;document.body.classList.add('ajura-professional');panel.hidden=false;toggle.textContent='Voltar à área do cliente';toggle.setAttribute('aria-pressed','true');document.title='AJURA · Painel profissional';
   panel.innerHTML='<p role="status">Carregando seu painel profissional…</p>';panel.setAttribute('aria-busy','true');
   const [profile,services,requests,count,connection]=await Promise.all([
    client.from('provider_profiles').select('display_name,approval_status').eq('id',session.user.id).maybeSingle(),
    client.from('provider_services').select('id',{count:'exact',head:true}).eq('provider_id',session.user.id).eq('active',true),
    client.from('service_requests').select('*').eq('provider_id',session.user.id).eq('status','requested').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(12),
    client.from('service_requests').select('id',{count:'exact',head:true}).eq('provider_id',session.user.id).eq('status','requested'),
    client.rpc('mp_my_test_connection')
   ]);
   if(run!==generation || !professional)return;
   const labels={pending:'Em análise',approved:'Aprovado',rejected:'Recusado',suspended:'Suspenso'};
   const status=profile.error?'Indisponível':labels[profile.data?.approval_status] || 'Cadastro não enviado';
   panel.innerHTML=`<div class="ajura-pro-hero"><span class="eyebrow">AJURA · ÁREA PROFISSIONAL</span><h1>Seu trabalho, organizado.</h1><p>${safe(profile.data?.display_name || account.full_name)}, acompanhe seus clientes, propostas e serviços.</p><div class="ajura-pro-actions"><button class="primary" id="ajuraEditProfessional">Gerenciar cadastro e serviços</button><button class="secondary" id="ajuraAllRequests">Ver todas as solicitações</button><button class="secondary" id="ajuraRefreshProfessional">Atualizar painel</button></div></div><section aria-label="Resumo financeiro"><h2>Seus resultados na AJURA</h2><div class="ajura-pro-grid"><article class="ajura-pro-card">Recebido pela plataforma<strong>Nenhum recebimento ainda</strong><small>Pagamentos e repasses reais ainda não estão ativos. Testes não entram nos ganhos.</small></article><article class="ajura-pro-card">Propostas aceitas<strong id="ajuraAcceptedTotal">Consultando…</strong><small>Valor bruto das propostas aceitas em solicitações abertas. Não significa dinheiro recebido.</small></article></div></section><div class="ajura-pro-grid"><article class="ajura-pro-card">Solicitações abertas<strong>${count.error?'Indisponível':safe(count.count??0)}</strong><small>Inclui solicitações com propostas aceitas ainda sem contratação.</small></article><article class="ajura-pro-card">Serviços ativos<strong>${services.error?'Indisponível':safe(services.count??0)}</strong><small>Visíveis na busca quando seu cadastro está aprovado.</small></article><article class="ajura-pro-card">Situação do cadastro<strong>${safe(status)}</strong>${profile.data?.approval_status!=='approved'?'<small>Confira os dados e documentos no cadastro profissional.</small>':''}</article><article class="ajura-pro-card">Mercado Pago<strong>${connection.error?'Indisponível':activeConnection(connection.data)?'Conectado para teste':connection.data?.length?'Conexão expirada':'Não conectado'}</strong><small>Conexão de teste; recebimentos reais ainda não estão disponíveis.</small></article></div><h2>Solicitações recebidas</h2><p class="hint">As 12 solicitações abertas mais recentes. Use Ver todas para consultar o histórico.</p>${requests.error?'<p role="status">Falha ao carregar solicitações. Atualize o painel.</p>':requests.data?.length?requests.data.map(r=>`<article class="ajura-pro-request"><b>${safe(r.district)} · ${date(r.preferred_date)}</b><p>${safe(r.description)}</p><button class="secondary" data-pro-conversation="${safe(r.id)}">Abrir conversa e orçamento</button></article>`).join(''):'<p>Nenhuma solicitação aberta recebida. Confira seus serviços e bairros atendidos.</p>'}`;
   panel.querySelector('#ajuraEditProfessional').onclick=()=>window.AJURA_AUTH.openProvider();
   panel.querySelector('#ajuraAllRequests').onclick=()=>window.AJURA_REQUESTS.inbox({role:'provider',status:'',page:0});
   panel.querySelector('#ajuraRefreshProfessional').onclick=dashboard;
   panel.querySelectorAll('[data-pro-conversation]').forEach(b=>b.onclick=()=>window.AJURA_REQUESTS.conversation(b.dataset.proConversation));
   panel.removeAttribute('aria-busy');
   // Agregação de propostas, sem misturar cobranças de teste ou prometer repasses.
   try{
    const quotes=await C.allRows(()=>client.from('request_quotes').select('amount,service_requests!inner(status)').eq('provider_id',session.user.id).eq('status','accepted').eq('service_requests.status','requested').order('id'));
    if(run!==generation)return;
    panel.querySelector('#ajuraAcceptedTotal').textContent=quotes.truncated?'Indisponível: limite de consulta':money(quotes.rows.reduce((sum,q)=>sum+Number(q.amount),0));
   }catch{if(run===generation)panel.querySelector('#ajuraAcceptedTotal').textContent='Não foi possível consultar';}
  }catch{
   if(run!==generation)return;
   if(professional){panel.removeAttribute('aria-busy');panel.innerHTML='<h2>Painel indisponível</h2><p>Não foi possível carregar seus dados.</p><button class="secondary" id="retryProfessional">Tentar novamente</button>';panel.querySelector('#retryProfessional').onclick=dashboard;}
   else toast('Não foi possível abrir a área profissional. Tente novamente.');
  }
 }
 toggle.onclick=()=>professional?customer():dashboard();
 document.addEventListener('ajura:professional',()=>{if(!professional)dashboard();});
 document.addEventListener('ajura:requests-changed',()=>{if(professional)setTimeout(dashboard,0);});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT' || (lastUser && session?.user.id && session.user.id!==lastUser)){lastUser=null;customer();}
 });
 window.AJURA_DASHBOARD=Object.freeze({open:dashboard,customer});
})();
