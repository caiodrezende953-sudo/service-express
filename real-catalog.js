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
 let offers=[],generation=0,currentUser=null,truncated=false,ratingsReady=false,ratings=new Map();
 let filtersOpen=false,searchUpdate=null;
 const allowed=new Set(catalog.flatMap(c=>c.subs.map(sub=>c.category+'\0'+sub)));
 const state={query:'',district:'',category:'',sub:'',sort:'name',rating:0};
 function subOptions(){const select=root.querySelector('#realSubcategory');select.innerHTML='<option value="">Todos os serviços</option>'+[...new Set(offers.filter(o=>o.category===state.category).map(o=>o.subcategory))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');select.disabled=!state.category;select.value=state.sub;}
 function draw(){
  if(!root.querySelector('#realCards')||!root.querySelector('#realCount'))return;
  const query=normalize(state.query),activityMatch=window.AJURA_ACTIVITIES?.compile?.(query);
  const list=offers.filter(o=>(!state.district || o.areas.includes(state.district)) && (!state.category || o.category===state.category) && (!state.sub || o.subcategory===state.sub) && (!state.rating || (ratings.has(o.provider_id)&&Number(ratings.get(o.provider_id).average_rating)>=state.rating)) && (!query || (o.searchText.includes(query) || (o.activity && (activityMatch?activityMatch(o.activity):window.AJURA_ACTIVITIES.matches(o.activity,query))))));
  list.sort(state.sort==='rating'?(a,b)=>(Number(ratings.get(b.provider_id)?.average_rating)||0)-(Number(ratings.get(a.provider_id)?.average_rating)||0)||a.title.localeCompare(b.title,'pt-BR'):state.sort==='price'?(a,b)=>(a.pricing_type==='fixed'?Number(a.starting_price):Infinity)-(b.pricing_type==='fixed'?Number(b.starting_price):Infinity)||a.title.localeCompare(b.title,'pt-BR'):(a,b)=>a.title.localeCompare(b.title,'pt-BR'));
  root.querySelector('#realCount').textContent=`${list.length} serviços de ${new Set(list.map(o=>o.provider_id)).size} profissionais${truncated?' · Limite de carregamento atingido; resultados podem estar incompletos.':''}`;
  const filterLabels={query:'Busca',category:'Categoria',sub:'Serviço',district:'Bairro',rating:'Nota',sort:'Ordenação'};
  const active=Object.entries(state).filter(([key,value])=>value&&!(key==='sort'&&value==='name'));
  root.querySelector('#realActiveFilters').innerHTML=active.map(([key,value])=>`<button type="button" data-clear-filter="${key}" aria-label="${safe('Remover filtro '+filterLabels[key]+': '+(key==='rating'?value+' estrelas ou mais':key==='sort'?{price:'Menor preço',rating:'Melhor avaliação'}[value]:value))}">${safe(filterLabels[key])}: ${safe(key==='rating'?value+' ★':key==='sort'?{price:'Menor preço',rating:'Melhor avaliação'}[value]:value)} <span aria-hidden="true">×</span></button>`).join('');
  root.querySelector('[data-filter-count]').textContent=active.filter(([k])=>k!=='query').length?' · '+active.filter(([k])=>k!=='query').length:'';
  root.querySelector('#clearRealFilters').hidden=!active.length;
  root.querySelectorAll('[data-clear-filter]').forEach(button=>button.onclick=()=>{
   searchUpdate?.cancel?.();state.query=root.querySelector('#realSearch').value;const key=button.dataset.clearFilter;state[key]=key==='rating'?0:key==='sort'?'name':'';
   const controls={query:'realSearch',category:'realCategory',sub:'realSubcategory',district:'realDistrict',rating:'realRating',sort:'realSort'};
   root.querySelector('#'+controls[key]).value=String(state[key]);if(key==='category'){state.sub='';subOptions();}draw();(root.querySelector('[data-clear-filter]')||root.querySelector('#realFiltersPanel>summary')).focus();
  });
  root.querySelector('#realCards').innerHTML=list.map(o=>{
   const rating=ratings.get(o.provider_id),reviewLabel=window.AJURA_REVIEWS?.label(rating)||'Avaliações indisponíveis';
   const initials=o.provider.display_name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
   return `<article class="card offer-card"><div class="card-body"><span class="eyebrow">${safe(o.category)}</span><h3>${safe(o.title)}</h3><div class="offer-person"><span class="avatar" aria-hidden="true">${safe(initials)}</span><div><b>${safe(o.provider.display_name)}</b><small>${safe(o.subcategory)}</small></div></div><span class="ajura-reputation ${Number(rating?.average_rating)>0?'':'is-new'}">${safe(reviewLabel)}</span>${o.description.length>180?`<details><summary>O que está incluído</summary><p class="request-description">${safe(o.description)}</p></details>`:`<p class="request-description">${safe(o.description)}</p>`}<details><summary>Avaliações reais</summary><button class="secondary" type="button" data-provider-reviews="${safe(o.provider_id)}">Consultar avaliações</button><div data-provider-review-list></div></details><details><summary>Bairros atendidos (${o.areas.length})</summary><p>${o.areas.map(safe).join(' · ')||'Não informados'}</p></details><div class="offer-price"><strong>${o.pricing_type==='quote'?'Sob orçamento':`A partir de ${money(o.starting_price)}`}</strong>${o.provider_id===currentUser?'<p class="hint">Este serviço é seu. Gerencie na área profissional.</p>':`<button class="primary" type="button" data-request-service="${safe(o.id)}" ${o.areas.length?'':'disabled'}>Solicitar serviço</button>`}<p class="hint">Confira o orçamento na conversa antes de contratar.</p></div></div></article>`;
  }).join('')||(offers.length?'<div class="empty"><h3>Nenhum serviço encontrado</h3><p>Tente outro bairro ou remova um filtro. Novos profissionais aparecem após aprovação.</p><button type="button" class="secondary" data-empty-clear>Limpar filtros</button></div>':'<div class="empty"><h3>Ainda não há ofertas disponíveis</h3><p>Os serviços aparecem após a aprovação dos profissionais. Você pode atualizar para conferir novas ofertas.</p><button type="button" class="secondary" data-empty-refresh>Atualizar ofertas</button></div>');
  root.querySelector('[data-empty-refresh]')?.addEventListener('click',load);
  root.querySelector('[data-empty-clear]')?.addEventListener('click',()=>root.querySelector('#clearRealFilters').onclick());
  root.querySelectorAll('[data-provider-reviews]').forEach(b=>b.onclick=()=>window.AJURA_REVIEWS?.list(b.dataset.providerReviews,b.parentElement.querySelector('[data-provider-review-list]')));
 }
 function shell(){
  searchUpdate?.cancel?.();
  root.innerHTML=`<div class="section-head"><div><span class="eyebrow">AJURA · SERVIÇOS EM MANAUS</span><h2>Encontre quem resolve</h2></div><button type="button" class="secondary" id="refreshRealCatalog">Atualizar ofertas</button></div><p class="hint">Profissionais aprovados. Solicitar inicia uma conversa e não gera cobrança.</p><div class="real-searchbar"><label>Que serviço você procura?<input id="realSearch" type="search" placeholder="Ex.: conserto de panela, fotografia, eletricista" value="${safe(state.query)}"></label></div><details class="real-filter-panel" id="realFiltersPanel" ${filtersOpen?'open':''}><summary><span><span aria-hidden="true">•••</span> Filtros e ordenação<span data-filter-count></span></span></summary><div class="filters"><label>Categoria<select id="realCategory"><option value="">Todas as categorias</option></select></label><label>Serviço<select id="realSubcategory" disabled><option value="">Todos os serviços</option></select></label><label>Bairro<select id="realDistrict"><option value="">Todos os bairros</option></select></label><label>Nota mínima<select id="realRating"><option value="0">Todas as notas</option><option value="3">3 estrelas ou mais</option><option value="4">4 estrelas ou mais</option><option value="4.8">4,8 estrelas ou mais</option></select></label><label>Ordenar<select id="realSort"><option value="name">Nome do serviço</option><option value="price">Menor preço inicial</option><option value="rating">Melhor avaliação</option></select></label></div></details><div id="realActiveFilters" class="real-active-filters" aria-label="Filtros selecionados"></div><div class="real-resultsbar"><p id="realCount" role="status">Carregando ofertas…</p><button type="button" class="link-button" id="clearRealFilters" hidden>Limpar filtros</button></div><div id="realCards" class="grid"><div class="ajura-state-view ajura-loading"><p>Conferindo profissionais e serviços…</p></div></div>`;
  root.querySelector('#realFiltersPanel').ontoggle=e=>{filtersOpen=e.target.open;};
  root.querySelector('#refreshRealCatalog').onclick=load;
  searchUpdate=C.debounce(value=>{state.query=value;draw();});root.querySelector('#realSearch').oninput=e=>searchUpdate(e.target.value);
  root.querySelector('#realCategory').onchange=e=>{state.category=e.target.value;state.sub='';subOptions();draw();};
  root.querySelector('#realSubcategory').onchange=e=>{state.sub=e.target.value;draw();};
  root.querySelector('#realDistrict').onchange=e=>{state.district=e.target.value;draw();};
  root.querySelector('#realRating').value=String(state.rating);root.querySelector('#realRating').onchange=e=>{state.rating=Number(e.target.value);draw();};
  root.querySelector('#realSort').value=state.sort;root.querySelector('#realSort').onchange=e=>{state.sort=e.target.value;draw();};
  root.querySelector('#clearRealFilters').onclick=()=>{searchUpdate?.cancel?.();Object.assign(state,{query:'',district:'',category:'',sub:'',sort:'name',rating:0});root.querySelector('#realSearch').value='';root.querySelector('#realCategory').value='';root.querySelector('#realDistrict').value='';root.querySelector('#realSort').value='name';root.querySelector('#realRating').value='0';subOptions();draw();};
 }
 async function load(){
  const currentSearch=root.querySelector('#realSearch');if(currentSearch)state.query=currentSearch.value;
  const run=++generation;ratings=new Map();ratingsReady=false;shell();root.querySelector('#realRating').disabled=true;root.setAttribute('aria-busy','true');const refresh=root.querySelector('#refreshRealCatalog');refresh.disabled=true;refresh.textContent='Atualizando…';
  try{
   const {data,error}=await client.auth.getSession();if(run!==generation)return;if(error)throw error;
   currentUser=data.session?.user.id;
   if(!currentUser){offers=[];root.innerHTML='<div class="ajura-state-view"><span class="eyebrow">PILOTO AJURA</span><h2>Encontre serviços em Manaus</h2><p>Entre na sua conta para consultar os profissionais aprovados, enviar solicitações e acompanhar seus atendimentos.</p><button type="button" class="primary" id="catalogLogin">Entrar ou criar conta</button></div>';root.querySelector('#catalogLogin').onclick=()=>document.querySelector('#accountButton')?.click();return;}
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
   try{if(!window.AJURA_REVIEWS)throw new Error('reviews');for(let start=0;start<ids.length;start+=100){const result=await window.AJURA_REVIEWS.summary(ids.slice(start,start+100));if(run!==generation)return;for(const [id,row] of result)ratings.set(id,row);}ratingsReady=true;}catch{if(run!==generation)return;ratings.clear();state.rating=0;if(state.sort==='rating')state.sort='name';root.querySelector('#realRating').value='0';root.querySelector('#realSort').value=state.sort;}
   root.querySelector('#realRating').disabled=!ratingsReady;root.querySelector('#realSort option[value="rating"]').disabled=!ratingsReady;
   const areaMap=new Map();for(const a of areas){if(!areaMap.has(a.provider_id))areaMap.set(a.provider_id,new Set());areaMap.get(a.provider_id).add(a.district);}
   offers=services.filter(s=>map.has(s.provider_id) && allowed.has(s.category+'\0'+s.subcategory)).map(s=>({...s,provider:map.get(s.provider_id),searchText:normalize([map.get(s.provider_id).display_name,map.get(s.provider_id).bio,s.category,s.subcategory,s.title,s.description].join(' ')),activity:window.AJURA_ACTIVITIES?.get(s.category,s.subcategory),areas:[...(areaMap.get(s.provider_id)||[])].sort((a,b)=>a.localeCompare(b,'pt-BR'))}));
   root.querySelector('#realCategory').innerHTML+=[...new Set(offers.map(o=>o.category))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');
   // Mostra bairros oficiais mesmo sem oferta, para o cliente saber onde a cobertura falta.
   root.querySelector('#realDistrict').innerHTML+=(typeof BAIRROS_MANAUS!=='undefined'?BAIRROS_MANAUS:[]).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');
   root.querySelector('#realCategory').value=state.category;if(root.querySelector('#realCategory').value!==state.category){state.category='';state.sub='';}
   root.querySelector('#realDistrict').value=state.district;subOptions();draw();
  }catch{if(run===generation){offers=[];root.querySelector('#realCount').textContent='Ofertas indisponíveis no momento.';root.querySelector('#realCards').innerHTML='<div class="ajura-state-view"><h3>Não conseguimos carregar as ofertas</h3><p>Confira sua conexão e tente novamente. Seus filtros foram mantidos.</p><button class="primary" type="button" data-catalog-retry>Tentar novamente</button></div>';root.querySelector('[data-catalog-retry]').onclick=load;}}
  finally{if(run===generation){root.removeAttribute('aria-busy');const refresh=root.querySelector('#refreshRealCatalog');if(refresh){refresh.disabled=false;refresh.textContent='Atualizar ofertas';}}}
 }
 window.AJURA_CATALOG=Object.freeze({refresh:load});
 document.addEventListener('ajura:reviews-changed',load);
 void load();
 client.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(load,0);});
})();
