/* Vitrine real: filtros, médias e paginação no servidor. Sem varrer a base no navegador. */
(() => {
 'use strict';if(window.AJURA_CATALOG)return;
 const client=window.AJURA_AUTH?.client,C=window.AJURA_CORE;if(!client||!C)return;
 document.querySelectorAll('#realCatalog').forEach(node=>node.remove());
 const root=document.createElement('section');root.id='realCatalog';root.className='real-catalog';root.setAttribute('aria-label','Profissionais aprovados');document.querySelector('#catalog')?.before(root);if(!root.isConnected)return;
 const {safe,money}=C,PAGE_SIZE=12;
 let offers=[],generation=0,currentUser=null,ratings=new Map(),facets=null,total=0,providerTotal=0,filtersOpen=false,searchUpdate=null;
 const state={query:'',district:'',category:'',sub:'',sort:'name',rating:0,page:0};
 function subOptions(){const select=root.querySelector('#realSubcategory');select.innerHTML='<option value="">Todos os serviços</option>'+[...new Set([...(facets||[]).filter(o=>o.category===state.category).map(o=>o.subcategory),...(state.sub?[state.sub]:[])])].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');select.disabled=!state.category;select.value=state.sub;}
 function populate(){root.querySelector('#realCategory').innerHTML='<option value="">Todas as categorias</option>'+[...new Set([...(facets||[]).map(x=>x.category),...(state.category?[state.category]:[])])].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');root.querySelector('#realCategory').value=state.category;subOptions();}
 function chips(){
  const filterLabels={query:'Busca',category:'Categoria',sub:'Serviço',district:'Bairro',rating:'Nota',sort:'Ordenação'};
  const active=Object.entries(state).filter(([key,value])=>key!=='page'&&value&&!(key==='sort'&&value==='name'));
  root.querySelector('#realActiveFilters').innerHTML=active.map(([key,value])=>`<button type="button" data-clear-filter="${key}" aria-label="${safe('Remover filtro '+filterLabels[key]+': '+(key==='rating'?value+' estrelas ou mais':key==='sort'?{price:'Menor preço',rating:'Melhor avaliação'}[value]:value))}">${safe(filterLabels[key])}: ${safe(key==='rating'?value+' ★':key==='sort'?{price:'Menor preço',rating:'Melhor avaliação'}[value]:value)} <span aria-hidden="true">×</span></button>`).join('');
  root.querySelector('[data-filter-count]').textContent=active.filter(([k])=>k!=='query').length?' · '+active.filter(([k])=>k!=='query').length:'';
  root.querySelector('#clearRealFilters').hidden=!active.length;
  root.querySelectorAll('[data-clear-filter]').forEach(button=>button.onclick=()=>{
   searchUpdate?.cancel?.();state.query=root.querySelector('#realSearch').value;const key=button.dataset.clearFilter;state[key]=key==='rating'?0:key==='sort'?'name':'';
   const controls={query:'realSearch',category:'realCategory',sub:'realSubcategory',district:'realDistrict',rating:'realRating',sort:'realSort'};
   root.querySelector('#'+controls[key]).value=String(state[key]);if(key==='category'){state.sub='';subOptions();}state.page=0;load();(root.querySelector('[data-clear-filter]')||root.querySelector('#realFiltersPanel>summary')).focus();
  });
 }
 function draw(){
  const list=offers;
  root.querySelector('#realCount').textContent=`${total} serviços de ${providerTotal} profissionais · ${offers.length} nesta página`;
  chips();root.querySelector('#realCards').innerHTML=list.map(o=>{
   const rating=ratings.get(o.provider_id),reviewLabel=window.AJURA_REVIEWS?.label(rating)||'Avaliações indisponíveis';
   const initials=o.provider.display_name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
   return `<article class="card offer-card"><div class="card-body"><span class="eyebrow">${safe(o.category)}</span><h3>${safe(o.title)}</h3><div class="offer-person"><span class="avatar" aria-hidden="true">${safe(initials)}</span><div><b>${safe(o.provider.display_name)}</b><small>${safe(o.subcategory)}</small></div></div><span class="ajura-reputation ${Number(rating?.average_rating)>0?'':'is-new'}">${safe(reviewLabel)}</span>${o.description.length>180?`<details><summary>O que está incluído</summary><p class="request-description">${safe(o.description)}</p></details>`:`<p class="request-description">${safe(o.description)}</p>`}<details><summary>Avaliações reais</summary><button class="secondary" type="button" data-provider-reviews="${safe(o.provider_id)}">Consultar avaliações</button><div data-provider-review-list></div></details><details><summary>Bairros atendidos (${o.areas.length})</summary><p>${o.areas.map(safe).join(' · ')||'Não informados'}</p></details><div class="offer-price"><strong>${o.pricing_type==='quote'?'Sob orçamento':`A partir de ${money(o.starting_price)}`}</strong>${o.provider_id===currentUser?'<p class="hint">Este serviço é seu. Gerencie na área profissional.</p>':`<button class="primary" type="button" data-request-service="${safe(o.id)}" ${o.areas.length?'':'disabled'}>Solicitar serviço</button>`}<p class="hint">Confira o orçamento na conversa antes de contratar.</p></div></div></article>`;
  }).join('')||((facets?.length||state.query||state.category||state.sub||state.district||state.rating)?'<div class="empty"><h3>Nenhum serviço encontrado</h3><p>Tente outro bairro ou remova um filtro. Novos profissionais aparecem após aprovação.</p><button type="button" class="secondary" data-empty-clear>Limpar filtros</button></div>':'<div class="empty"><h3>Ainda não há ofertas disponíveis</h3><p>Os serviços aparecem após a aprovação dos profissionais. Você pode atualizar para conferir novas ofertas.</p><button type="button" class="secondary" data-empty-refresh>Atualizar ofertas</button></div>');
  root.querySelector('[data-empty-refresh]')?.addEventListener('click',()=>load(true));root.querySelector('[data-empty-clear]')?.addEventListener('click',()=>root.querySelector('#clearRealFilters').onclick());
  root.querySelectorAll('[data-provider-reviews]').forEach(b=>b.onclick=()=>window.AJURA_REVIEWS?.list(b.dataset.providerReviews,b.parentElement.querySelector('[data-provider-review-list]')));
  root.querySelector('#realPage').textContent=`Página ${state.page+1} de ${Math.max(1,Math.ceil(total/PAGE_SIZE))}`;
  root.querySelector('#realPrev').disabled=state.page===0;root.querySelector('#realNext').disabled=(state.page+1)*PAGE_SIZE>=total;
 }
 function shell(){
  searchUpdate?.cancel?.();
  root.innerHTML=`<div class="section-head"><div><span class="eyebrow">AJURA · SERVIÇOS EM MANAUS</span><h2>Encontre quem resolve</h2></div><button type="button" class="secondary" id="refreshRealCatalog">Atualizar ofertas</button></div><p class="hint">Profissionais aprovados. Solicitar inicia uma conversa e não gera cobrança.</p><div class="real-searchbar"><label>Que serviço você procura?<input id="realSearch" type="search" placeholder="Ex.: conserto de panela, fotografia, eletricista" value="${safe(state.query)}" maxlength="200"></label></div><details class="real-filter-panel" id="realFiltersPanel" ${filtersOpen?'open':''}><summary><span><span aria-hidden="true">•••</span> Filtros e ordenação<span data-filter-count></span></span></summary><div class="filters"><label>Categoria<select id="realCategory"><option value="">Todas as categorias</option></select></label><label>Serviço<select id="realSubcategory" disabled><option value="">Todos os serviços</option></select></label><label>Bairro<select id="realDistrict"><option value="">Todos os bairros</option></select></label><label>Nota mínima<select id="realRating"><option value="0">Todas as notas</option><option value="3">3 estrelas ou mais</option><option value="4">4 estrelas ou mais</option><option value="4.8">4,8 estrelas ou mais</option></select></label><label>Ordenar<select id="realSort"><option value="name">Nome do serviço</option><option value="price">Menor preço inicial</option><option value="rating">Melhor avaliação</option></select></label></div></details><div id="realActiveFilters" class="real-active-filters" aria-label="Filtros selecionados"></div><div class="real-resultsbar"><p id="realCount" role="status">Carregando ofertas…</p><button type="button" class="link-button" id="clearRealFilters" hidden>Limpar filtros</button></div><div id="realCards" class="grid"><div class="ajura-state-view ajura-loading"><p>Conferindo profissionais e serviços…</p></div></div><div class="request-toolbar real-pagination" role="group" aria-label="Páginas das ofertas"><button type="button" class="secondary" id="realPrev" disabled>Anterior</button><span id="realPage" role="status"></span><button type="button" class="secondary" id="realNext" disabled>Próxima</button></div>`;
  root.querySelector('#realDistrict').innerHTML+=(typeof BAIRROS_MANAUS!=='undefined'?BAIRROS_MANAUS:[]).map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');root.querySelector('#realDistrict').value=state.district;
  root.querySelector('#realFiltersPanel').ontoggle=e=>{filtersOpen=e.target.open;};
  root.querySelector('#refreshRealCatalog').onclick=()=>load(true);
  searchUpdate=C.debounce(value=>{state.query=value;state.page=0;load();});root.querySelector('#realSearch').oninput=e=>searchUpdate(e.target.value);
  root.querySelector('#realCategory').onchange=e=>{state.category=e.target.value;state.sub='';subOptions();state.page=0;load();};
  root.querySelector('#realSubcategory').onchange=e=>{state.sub=e.target.value;state.page=0;load();};
  root.querySelector('#realDistrict').onchange=e=>{state.district=e.target.value;state.page=0;load();};
  root.querySelector('#realRating').value=String(state.rating);root.querySelector('#realRating').onchange=e=>{state.rating=Number(e.target.value);state.page=0;load();};
  root.querySelector('#realSort').value=state.sort;root.querySelector('#realSort').onchange=e=>{state.sort=e.target.value;state.page=0;load();};
  root.querySelector('#clearRealFilters').onclick=()=>{searchUpdate?.cancel?.();Object.assign(state,{query:'',district:'',category:'',sub:'',sort:'name',rating:0,page:0});root.querySelector('#realSearch').value='';root.querySelector('#realCategory').value='';root.querySelector('#realDistrict').value='';root.querySelector('#realSort').value='name';root.querySelector('#realRating').value='0';subOptions();state.page=0;load();};
  root.querySelector('#realPrev').onclick=()=>{if(state.page>0){state.page--;load();}};root.querySelector('#realNext').onclick=()=>{if((state.page+1)*PAGE_SIZE<total){state.page++;load();}};
 }
 function login(){searchUpdate?.cancel?.();root.innerHTML='<div class="ajura-state-view"><span class="eyebrow">PILOTO AJURA</span><h2>Encontre serviços em Manaus</h2><p>Entre na sua conta para consultar os profissionais aprovados, enviar solicitações e acompanhar seus atendimentos.</p><button type="button" class="primary" id="catalogLogin">Entrar ou criar conta</button></div>';root.querySelector('#catalogLogin').onclick=()=>document.querySelector('#accountButton')?.click();}
 async function load(refreshFacets=false){
  refreshFacets=refreshFacets===true;
  const input=root.querySelector('#realSearch');if(input)state.query=input.value;
  searchUpdate?.cancel?.();const run=++generation;if(!root.querySelector('#realCards'))shell();
  root.setAttribute('aria-busy','true');const refresh=root.querySelector('#refreshRealCatalog');refresh.disabled=true;refresh.textContent='Atualizando…';chips();
  root.querySelector('#realCount').textContent='Carregando ofertas…';root.querySelector('#realCards').innerHTML='<div class="ajura-state-view ajura-loading"><p>Conferindo profissionais e serviços…</p></div>';
  root.querySelector('#realPrev').disabled=true;root.querySelector('#realNext').disabled=true;
  try{
   const {data,error}=await client.auth.getSession();if(run!==generation)return;if(error)throw error;const actor=data.session?.user.id;
   if(!actor){currentUser=null;offers=[];ratings.clear();facets=null;login();return;}
   if(currentUser!==actor){currentUser=actor;facets=null;}const needFacets=facets===null||refreshFacets;
   const args={search_text:state.query,selected_category:state.category,selected_subcategory:state.sub,selected_district:state.district,min_rating:state.rating,sort_order:state.sort,page_number:state.page,page_size:PAGE_SIZE};
   const [page,filters]=await Promise.all([client.rpc('catalog_page',args),needFacets?client.rpc('catalog_filters'):Promise.resolve(null)]);
   if(run!==generation||currentUser!==actor)return;if(page.error)throw page.error;
   const result=page.data;
   if(!result||!Array.isArray(result.rows)||result.rows.length>PAGE_SIZE||!Number.isSafeInteger(result.total)||Number(result.total)<0||!Number.isSafeInteger(result.provider_total)||Number(result.provider_total)<0||result.provider_total>result.total||result.page!==state.page||result.page_size!==PAGE_SIZE)throw Error('invalid page');
   if(needFacets){if(filters.error||!Array.isArray(filters.data?.pairs))throw Error('invalid filters');facets=filters.data.pairs;populate();}
   total=Number(result.total);providerTotal=Number(result.provider_total);
   if(state.page>0&&state.page*PAGE_SIZE>=total){state.page=Math.max(0,Math.ceil(total/PAGE_SIZE)-1);return load();}
   offers=result.rows;ratings=new Map(offers.map(row=>[row.provider_id,{provider_id:row.provider_id,review_count:row.review_count,average_rating:row.average_rating}]));draw();
  }catch{if(run===generation){offers=[];ratings.clear();root.querySelector('#realCount').textContent='Ofertas indisponíveis no momento.';root.querySelector('#realPage').textContent='';root.querySelector('#realCards').innerHTML='<div class="ajura-state-view"><h3>Não conseguimos carregar as ofertas</h3><p>Confira sua conexão e tente novamente. Seus filtros foram mantidos.</p><button class="primary" type="button" data-catalog-retry>Tentar novamente</button></div>';root.querySelector('[data-catalog-retry]').onclick=()=>load(true);}}
  finally{if(run===generation){root.removeAttribute('aria-busy');if(refresh.isConnected){refresh.disabled=false;refresh.textContent='Atualizar ofertas';}}}
 }
 window.AJURA_CATALOG=Object.freeze({refresh:()=>load(true)});document.addEventListener('ajura:reviews-changed',()=>load());void load();
 client.auth.onAuthStateChange((event,next)=>{if(['SIGNED_IN','SIGNED_OUT'].includes(event)){const id=next?.user?.id||null;if(event==='SIGNED_OUT'||id!==currentUser){generation++;searchUpdate?.cancel?.();offers=[];ratings.clear();facets=null;currentUser=null;root.replaceChildren();}setTimeout(()=>load(true),0);}});
})();
