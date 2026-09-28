# Service Express

Protótipo local para encontrar profissionais de serviço em Manaus. Não há servidor, instalação nem cobrança real.

## Como abrir

1. Baixe ou clone esta pasta.
2. Abra `index.html` no navegador, direto pelo arquivo (`file://`).
3. Mantenha `index.html`, `style.css`, `app.js`, `v2.js`, `bairros.js`, `ui.js` e `ui.css` na mesma pasta.

Não é preciso instalar dependências nem subir um servidor.

## O que o protótipo faz

- Catálogo de profissionais fictícios, com categorias, subserviços e modalidades de atendimento.
- Filtros por busca, bairro, nota mínima, ordenação e modalidade.
- Lista dos bairros oficiais da área urbana de Manaus no filtro, nas sugestões e no cadastro de área atendida. O prestador pode pesquisar bairros, selecionar vários ou marcar que atende toda a cidade. A cobertura já salva não é ampliada sozinha.
- Pedido demonstrativo, com aceite, códigos de início e conclusão e cancelamento.
- Modos Cliente e Prestador na mesma tela, para simular os dois lados. Em Meu perfil, escolha o personagem de prestador correspondente ao pedido.
- Sugestões e alterações de catálogo gravadas só neste navegador.
- Avaliação de 1 a 5 estrelas em pedido concluído, uma por pedido, com comentário opcional. A média mostrada combina a base fictícia original com as notas novas. O prestador consulta as avaliações e não as altera.

## Limites

Profissionais, preços, reputação inicial e pedidos são fictícios. A taxa de 10% é só ilustrativa. Não há login, pagamento, repasse, agenda real nem área administrativa.

A troca entre Cliente e Prestador não é autenticação. Códigos, pedidos, sugestões, catálogo e avaliações ficam no `localStorage` deste navegador e não formam um controle de acesso.

Fotos têm apenas prévia: não são enviadas nem salvas. Orçamentos diferentes do escopo ficam pendentes. Não há envio de proposta financeira.

As chaves locais são `sx-demo-v1` (pedidos), `sx-catalog-v2` (catálogo), `sx-suggestions-v2` (sugestões) e `sx-reviews-v1` (avaliações). Limpar o armazenamento do navegador apaga essa demonstração.

## Interface v0.3

Busca e bairro em destaque, seis grupos de categorias, filtros removíveis e um cartão por oferta com preço correspondente. Pedidos separados em andamento, concluídos e cancelados, com próxima ação indicada. Menu do prestador com atalhos de catálogo, área atendida e avaliações.

A camada ui.js/ui.css não migra nem grava dados locais. Os formulários de contratação permanecem na versão atual; o assistente em etapas e a negociação de orçamento serão mudanças posteriores.

### Validação

Execute `node tests/interface.cjs` para verificar a lógica de filtros, preço por oferta e reputação. Sintaxe dos scripts validada com `node --check`. A inspeção visual e o fluxo completo no navegador ainda estão pendentes: a instalação do Chromium falhou no ambiente de desenvolvimento. Abra index.html no Chrome e confira desktop, celular, troca de perfil, abas de pedidos e avaliação após conclusão.


## Catálogo ampliado

O catálogo demonstrativo reúne 63 categorias e 325 subserviços em 12 grupos: casa e manutenção, tecnologia, limpeza e cuidados, automotivo, pequenos consertos, beleza e bem-estar, pets, educação, mídia e criatividade, eventos, empresas e serviços especializados.

O filtro “Tipo de serviço” distingue essenciais e urgentes, outros serviços e atividades reguladas ou especializadas. Essa classificação serve para organizar a descoberta; não substitui definição legal. Saúde, engenharia, arquitetura, direito, contabilidade, gás, energia solar, veterinária e segurança do trabalho exigirão verificação de habilitação na versão real.

Serviços sem profissional disponível permanecem visíveis. O cliente pode registrar interesse, mas isso não promete atendimento. O catálogo fica centralizado em `catalogo.js` e pode crescer sem misturar a taxonomia com os dados fictícios dos profissionais.

Validação: `node tests/catalogo.cjs` verifica quantidade mínima, duplicidades, grupos, serviços preservados e ordem de carregamento. A interface ainda deve ser conferida no Chrome em desktop e celular.

## Pagamentos e recebimentos

A aba Pagamentos no modo Cliente mostra o valor do profissional, a taxa ilustrativa e o total. É possível registrar localmente uma simulação de Pix ou cartão, sem QR Code e sem solicitar dados financeiros. No modo Prestador, a mesma aba aparece como Recebimentos e mostra o valor previsto e o estado demonstrativo do repasse.

Os registros usam `sx-payments-v1`. Não existe cobrança, retenção, estorno ou repasse real.
