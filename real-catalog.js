/* Vitrine real: carregamento paginado e controles disponíveis mesmo sem ofertas. */
(() => {
 'use strict';
 if(window.AJURA_CATALOG){
  document.querySelectorAll('#realCatalog').forEach((node,index)=>{if(index>0)node.remove();});
  return;
 }
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;
 if(!client || !C)return;
 document.querySelectorAll('#realCatalog').forEach(node=>node.remove());
 const root=document.createElement('section');root.id='realCatalog';root.className='real-catalog';root.setAttribute('aria-label','Profissionais aprovados');
 document.querySelector('#catalog')?.before(root);if(!root.isConnected)return;
 const {safe,money,allRows}=C,catalog=typeof SERVICE_CATALOG!=='undefined'?SERVICE_CATALOG:[];
 let offers=[],generation=0,currentUser=null,truncated=false;
 const state={query:'',district:'',category:'',sub:'',sort:'name'};
 function subOptions(){const select=root.querySelector('#realSubcategory');select.innerHTML='<option value="">Todos os serviços</option>'+[...new Set(offers.filter(o=>o.category===state.category).map(o=>o.subcategory))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');select.disabled=!state.category;select.value=state.sub;}
 function draw(){
  const query=normalize(state.query);
  const list=offers.filter(o=>(!state.district || o.areas.includes(state.district)) && (!state.category || o.category===state.category) && (!state.sub || o.subcategory===state.sub) && (!query || normalize([o.provider.display_name,o.provider.bio,o.category,o.subcategory,o.title,o.description].join(' ')).includes(query)));
  list.sort(state.sort==='price'?(a,b)=>(a.pricing_type==='fixed'?Number(a.starting_price):Infinity)-(b.pricing_type==='fixed'?Number(b.starting_price):Infinity)||a.title.localeCompare(b.title,'pt-BR'):(a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  root.querySelector('#realCount').textContent=`${list.length} serviços de ${new Set(list.map(o=>o.provider_id)).size} profissionais${truncated?' · Limite de carregamento atingido; resultados podem estar incompletos.':''}`;
  root.querySelector('#realCards').innerHTML=list.map(o=>`<article class="card offer-card"><div class="card-body"><span class="eyebrow">${safe(o.category)}</span><h3>${safe(o.title)}</h3><p class="request-description">${safe(o.description)}</p><p><b>${safe(o.provider.display_name)}</b> · ${safe(o.subcategory)}</p><details><summary>Bairros atendidos (${o.areas.length})</summary><p>${o.areas.map(safe).join(' · ') || 'Não informados'}</p></details><p><strong>${o.pricing_type==='quote'?'Sob orçamento':`A partir de ${money(o.starting_price)}`}</strong></p>${o.provider_id===currentUser?'<p class="hint">Este serviço é seu. Gerencie na área profissional.</p>':`<button class="primary" type="button" data-request-service="${safe(o.id)}" ${o.areas.length?'':'disabled'}>Solicitar serviço</button>`}<p class="hint">Converse e confira o orçamento antes de contratar.</p></div></article>`).join('') || '<div class="empty"><h3>Nenhum serviço encontrado</h3><p>Tente outro bairro ou limpe os filtros. Novos profissionais aparecem após aprovação.</p></div>';
 }
 function shell(){
  root.innerHTML=`<div class="section-head"><div><span class="eyebrow">AJURA · SERVIÇOS EM MANAUS</span><h2>Encontre quem resolve</h2></div><button class="secondary" id="refreshRealCatalog">Atualizar ofertas</button></div><p class="hint">Profissionais aprovados. A solicitação inicia uma conversa; não gera cobrança.</p><div class="filters"><label class="search">Buscar serviço ou profissional<input id="realSearch" type="search" placeholder="Ex.: conserto de panela, fotografia, eletricista" value="${safe(state.query)}"></label><label>Categoria<select id="realCategory"><option value="">Todas as categorias</option></select></label><label>Serviço<select id="realSubcategory" disabled><option value="">Todos os serviços</option></select></label><label>Bairro<select id="realDistrict"><option value="">Todos os bairros</option></select></label><label>Ordenar<select id="realSort"><option value="name">Nome do serviço</option><option value="price">Menor preço inicial</option></select></label></div><div class="request-toolbar"><p id="realCount" role="status">Carregando ofertas…</p><button class="link-button" id="clearRealFilters">Limpar filtros</button></div><div id="realCards" class="grid"></div>`;
  root.querySelector('#refreshRealCatalog').onclick=load;
  root.querySelector('#realSearch').oninput=C.debounce(e=>{state.query=e.target.value;draw();});
  root.querySelector('#realCategory').onchange=e=>{state.category=e.target.value;state.sub='';subOptions();draw();};
  root.querySelector('#realSubcategory').onchange=e=>{state.sub=e.target.value;draw();};
  root.querySelector('#realDistrict').onchange=e=>{state.district=e.target.value;draw();};
  root.querySelector('#realSort').value=state.sort;root.querySelector('#realSort').onchange=e=>{state.sort=e.target.value;draw();};
  root.querySelector('#clearRealFilters').onclick=()=>{Object.assign(state,{query:'',district:'',category:'',sub:'',sort:'name'});root.querySelector('#realSearch').value='';root.querySelector('#realCategory').value='';root.querySelector('#realDistrict').value='';root.querySelector('#realSort').value='name';subOptions();draw();};
 }
 async function load(){
  const run=++generation;shell();root.setAttribute('aria-busy','true');
  try{
   const {data,error}=await client.auth.getSession();if(run!==generation)return;if(error)throw error;
   currentUser=data.session?.user.id;
   if(!currentUser){offers=[];root.innerHTML='<h2>Encontre serviços em Manaus</h2><p>Entre na sua conta para consultar os profissionais aprovados durante o piloto.</p><button class="primary" id="catalogLogin">Entrar ou criar conta</button>';root.querySelector('#catalogLogin').onclick=()=>document.querySelector('#accountButton')?.click();return;}
   const profiles=await allRows(()=>client.from('provider_profiles').select('id,display_name,bio').eq('approval_status','approved').order('id'));
   if(run!==generation)return;
   const map=new Map(profiles.rows.map(p=>[p.id,p])),ids=[...map.keys()];let services=[],areas=[];truncated=profiles.truncated;
   for(let start=0;start<ids.length;start+=100){
    const batch=ids.slice(start,start+100);
    const [ss,aa]=await Promise.all([
     allRows(()=>client.from('provider_services').select('id,provider_id,category,subcategory,title,description,pricing_type,starting_price').in('provider_id',batch).eq('active',true).order('id')),
     allRows(()=>client.from('provider_service_areas').select('provider_id,district').in('provider_id',batch).order('provider_id').order('district'))
    ]);
    if(run!==generation)return;services.push(...ss.rows);areas.push(...aa.rows);truncated ||= ss.truncated || aa.truncated;
   }
   const areaMap=new Map();for(const a of areas){if(!areaMap.has(a.provider_id))areaMap.set(a.provider_id,new Set());areaMap.get(a.provider_id).add(a.district);}
   offers=services.filter(s=>map.has(s.provider_id) && catalog.some(c=>c.category===s.category && c.subs.includes(s.subcategory))).map(s=>({...s,provider:map.get(s.provider_id),areas:[...(areaMap.get(s.provider_id)||[])].sort((a,b)=>a.localeCompare(b,'pt-BR'))}));
   root.querySelector('#realCategory').innerHTML+=[...new Set(offers.map(o=>o.category))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');
   // Mostra bairros oficiais mesmo sem oferta, para o cliente saber onde a cobertura falta.
   root.querySelector('#realDistrict').innerHTML+=(typeof BAIRROS_MANAUS!=='undefined'?BAIRROS_MANAUS:[]).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');
   root.querySelector('#realCategory').value=state.category;if(root.querySelector('#realCategory').value!==state.category){state.category='';state.sub='';}
   root.querySelector('#realDistrict').value=state.district;subOptions();draw();
  }catch{if(run===generation){offers=[];root.querySelector('#realCount').textContent='Não foi possível carregar as ofertas. Clique em Atualizar ofertas para tentar novamente.';}}
  finally{if(run===generation)root.removeAttribute('aria-busy');}
 }
 window.AJURA_CATALOG=Object.freeze({refresh:load});
 void load();
 client.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(load,0);});
})();
