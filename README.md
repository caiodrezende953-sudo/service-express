# Service Express

Protótipo local para encontrar profissionais de serviço em Manaus. Não há servidor, instalação nem cobrança real.

## Como abrir

1. Baixe ou clone esta pasta.
2. Abra `index.html` no navegador, direto pelo arquivo (`file://`).
3. Mantenha `index.html`, `style.css`, `app.js`, `v2.js` e `bairros.js` na mesma pasta.

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
