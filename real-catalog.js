/* Vitrine real, separada da demonstração. Somente prestadores aprovados. */
(() => {
  const root = document.createElement('section');
  root.id = 'realCatalog';
  root.className = 'real-catalog';
  root.setAttribute('aria-label', 'Profissionais reais aprovados');
  document.querySelector('#catalog')?.before(root);
  const client = window.AJURA_AUTH?.client;
  if (!root.isConnected || !client) return;
  let offers = [];
  let request = 0;
  const safe = value => esc(String(value ?? ''));
  const catalog = typeof SERVICE_CATALOG !== 'undefined' ? SERVICE_CATALOG : [];

  function draw() {
    const query = normalize(root.querySelector('#realSearch')?.value || '');
    const district = root.querySelector('#realDistrict')?.value || '';
    const category = root.querySelector('#realCategory')?.value || '';
    const subcategory = root.querySelector('#realSubcategory')?.value || '';
    const matches = offers.filter(offer =>
      (!district || offer.areas.includes(district)) &&
      (!category || offer.category === category) &&
      (!subcategory || offer.subcategory === subcategory) &&
      (!query || normalize([offer.provider.display_name, offer.provider.bio, offer.category, offer.subcategory, offer.title, offer.description].join(' ')).includes(query))
    );
    const providers = new Set(matches.map(offer => offer.provider_id)).size;
    root.querySelector('#realCount').textContent = `${matches.length} ${matches.length === 1 ? 'serviço real' : 'serviços reais'} de ${providers} ${providers === 1 ? 'profissional aprovado' : 'profissionais aprovados'}`;
    root.querySelector('#realCards').innerHTML = matches.map(offer => `<article class="card offer-card"><div class="card-body"><span class="eyebrow">PRESTADOR APROVADO · ${safe(offer.category)}</span><h3>${safe(offer.title)}</h3><p>${safe(offer.description)}</p><p><b>${safe(offer.provider.display_name)}</b> · ${safe(offer.subcategory)}</p><p class="coverage">Atende ${offer.areas.map(safe).join(' · ')}</p><p><strong>${offer.pricing_type === 'quote' ? 'Sob orçamento' : `A partir de R$ ${Number(offer.starting_price).toFixed(2).replace('.', ',')}`}</strong></p><p class="hint">Solicitação pelo site ainda não disponível. Nenhuma avaliação real registrada.</p></div></article>`).join('') || '<div class="empty">Nenhuma oferta real atende esta busca no momento.</div>';
  }

  async function load() {
    const token = ++request;
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (token !== request) return;
    if (sessionError || !session) {
      offers = [];
      root.innerHTML = '<div class="section-head"><div><span class="eyebrow">PILOTO AJURA</span><h2>Profissionais reais</h2></div></div><p>Entre na sua conta para consultar profissionais aprovados.</p>';
      return;
    }
    root.innerHTML = '<div class="section-head"><div><span class="eyebrow">PILOTO AJURA · DADOS REAIS</span><h2>Profissionais aprovados</h2></div></div><p class="hint">Somente cadastros aprovados aparecem aqui. Pedidos e pagamentos reais ainda não estão ativos.</p><div class="filters"><label class="search">Buscar serviço ou profissional<input id="realSearch" type="search" placeholder="Ex.: limpeza de ar-condicionado"></label><label>Categoria<select id="realCategory"><option value="">Todas as categorias</option></select></label><label>Serviço<select id="realSubcategory" disabled><option value="">Todos os serviços</option></select></label><label>Bairro do atendimento<select id="realDistrict"><option value="">Todos os bairros</option></select></label></div><p id="realCount" class="hint">Carregando ofertas reais…</p><div id="realCards" class="grid"></div>';
    const { data: providers, error: providerError } = await client.from('provider_profiles').select('id, display_name, bio, approval_status').eq('approval_status', 'approved').order('display_name').limit(500);
    if (token !== request) return;
    if (providerError) { root.querySelector('#realCount').textContent = `Falha ao carregar: ${providerError.message}`; return; }
    const ids = (providers || []).map(provider => provider.id);
    if (!ids.length) { offers = []; draw(); return; }
    const [servicesResult, areasResult] = await Promise.all([
      client.from('provider_services').select('id, provider_id, category, subcategory, title, description, pricing_type, starting_price').in('provider_id', ids).eq('active', true).limit(1000),
      client.from('provider_service_areas').select('provider_id, district').in('provider_id', ids).limit(1000)
    ]);
    if (token !== request) return;
    if (servicesResult.error || areasResult.error) { root.querySelector('#realCount').textContent = `Falha ao carregar: ${(servicesResult.error || areasResult.error).message}`; return; }
    const providerMap = new Map(providers.map(provider => [provider.id, provider]));
    const areaMap = new Map();
    for (const area of areasResult.data || []) areaMap.set(area.provider_id, [...(areaMap.get(area.provider_id) || []), area.district]);
    offers = (servicesResult.data || []).filter(service => providerMap.has(service.provider_id) && catalog.some(item => item.category === service.category && item.subs.includes(service.subcategory))).map(service => ({ ...service, provider: providerMap.get(service.provider_id), areas: areaMap.get(service.provider_id) || [] }));
    root.querySelector('#realCategory').innerHTML += [...new Set(offers.map(offer => offer.category))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(category => `<option value="${safe(category)}">${safe(category)}</option>`).join('');
    root.querySelector('#realDistrict').innerHTML += [...new Set(offers.flatMap(offer => offer.areas))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(district => `<option value="${safe(district)}">${safe(district)}</option>`).join('');
    root.querySelector('#realSearch').oninput = draw;
    root.querySelector('#realDistrict').onchange = draw;
    root.querySelector('#realCategory').onchange = event => {
      const sub = root.querySelector('#realSubcategory');
      sub.innerHTML = '<option value="">Todos os serviços</option>' + [...new Set(offers.filter(offer => offer.category === event.target.value).map(offer => offer.subcategory))].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(value => `<option value="${safe(value)}">${safe(value)}</option>`).join('');
      sub.disabled = !event.target.value;
      draw();
    };
    root.querySelector('#realSubcategory').onchange = draw;
    draw();
  }

  load();
  client.auth.onAuthStateChange(() => { setTimeout(load, 0); });
})();
