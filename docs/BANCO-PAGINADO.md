# AJURA 0.8.0 — vitrine e indicadores no banco

Base: commit `0e9899a116c65c95facb5b39e8f04ef5406614d0`, branch `feat/mvp-real-cadastros`, versão local 0.7.0.

**A migração já foi aplicada diretamente ao projeto AJURA autorizado. Não execute SQL manualmente.** O instalador altera somente arquivos locais e cria backup. Não exige plano pago, dependências novas ou serviço adicional. Pagamentos continuam por último.

## O que muda

- A vitrine busca 12 ofertas por página no servidor. Total de serviços e de profissionais consideram o conjunto filtrado completo, não apenas os cartões da página.
- Busca por texto, sinônimos, categoria, serviço, bairro, nota e ordenação são executados no servidor. Nota mínima e ordenação por reputação usam a média exata; arredondamento continua apenas na exibição.
- Categorias e subserviços disponíveis são consultados separadamente, para não sumirem quando suas ofertas estiverem em outra página. O cadastro do prestador continua oferecendo todo o catálogo de atividades.
- Os filtros avançados continuam recolhidos; mudar um filtro retorna à primeira página. O campo de pesquisa permanece o mesmo durante a consulta, preservando a digitação. Respostas antigas não substituem a consulta atual.
- A ordenação usa título sem distinção de caixa/acento e ID para desempatar. Preço sob orçamento fica depois dos preços definidos; prestadores sem nota ficam depois dos avaliados na ordenação por nota.
- O painel recebe contagens, fases dos pedidos, total bruto de propostas aceitas ainda abertas e reputação em uma consulta agregada exclusiva do prestador. Não baixa todas as propostas para somar no navegador.
- Seis índices atendem aos filtros e aos caminhos de listagem e agregação identificados nesta revisão.

“Serviços ativos” conta os serviços ativados no cadastro. A publicação também depende de conta ativa, aprovação do prestador e habilitação do serviço quando regulamentado. Proposta aceita continua sem significar valor recebido. Nenhuma cobrança, comissão, captura ou transferência foi implementada nesta entrega.

## Situação encontrada na base real

Verificação em 21/10/2026: 14 serviços preservados, dos quais 2 aptos à vitrine, 7 inativos e 5 aguardando habilitação específica. Não houve ativação de serviços nem concessão automática de habilitações. A página real retornou 2 ofertas de 1 profissional; o tamanho máximo configurado é 12.

Não haverá uma segunda página enquanto o filtro tiver até 12 ofertas elegíveis. A paginação foi exercitada com 31 ofertas sintéticas em três páginas, além do teste de índice com 3.000 pedidos. Nenhum desses registros de teste foi criado no Supabase real.

## Instalar os arquivos locais

Extraia a pasta `ajura-banco-paginado` dentro de `C:\service-express`, mantendo a branch atual.

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-banco-paginado\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes locais falharam." }
npm.cmd run test:sql
if ($LASTEXITCODE -ne 0) { throw "Testes do banco isolado falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Verificação de sintaxe falhou." }
Start-Process chrome.exe "C:\service-express\index.html"
```

Use Ctrl+F5. O instalador interrompe antes de escrever se algum arquivo da base tiver conteúdo desconhecido. Não force a substituição; preserve a edição para comparar. `-SomenteConferir` permite conferir sem instalar.

## Conferência no navegador

1. Como cliente, confira o total e “Página 1 de 1” na base atual, os bairros e as duas ofertas elegíveis.
2. Pesquise por serviço e por sinônimo, mude bairro e nota; confira o resultado vazio e a limpeza dos filtros. O cadastro profissional deve manter as atividades que ainda não possuem ofertas.
3. Com mais de 12 ofertas aprovadas no futuro, confira Anterior/Próxima e os mesmos filtros. A troca de filtros deve retornar à primeira página.
4. No painel do prestador, confira serviços ativos, fases dos pedidos, reputação e total de propostas aceitas. Falha deve aparecer como indisponível, sem fabricar zero ou ganho.
5. Saia durante uma consulta e confira que os cartões ou totais antigos não reaparecem em outra conta. Teste também no celular.

Não houve revisão visual em navegador real nesta entrega. Os testes locais usam DOM simulado; a validação de SQL usa PostgreSQL isolado. As consultas de leitura também foram conferidas no Supabase real com os papéis de sessão apropriados.

## Migração e acesso

Arquivo: `supabase/migrations/20261021174140_catalog_pagination_and_provider_metrics.sql`.

As RPCs públicas `catalog_page`, `catalog_filters` e `my_provider_metrics` são SECURITY INVOKER. A agregação de avaliações privadas ocorre em rotinas SECURITY DEFINER no schema não exposto `ajura_internal`, com conta ativa exigida e escopo explícito. O acesso à fonte privada foi revogado para os clientes; sua view usa `security_invoker=true`. A consulta de indicadores usa somente a identidade autenticada e não aceita ID de outro prestador.

A vitrine exige serviço ativo, conta do prestador ativa com papel apropriado, cadastro aprovado e autorização exata para atividade regulamentada. Não retorna CPF/CNPJ, telefone, endereço, documentos, comentários de avaliações nem observações administrativas. Médias desconsideram avaliações ocultas.

A migração é aditiva: cria consultas, uma fonte privada e índices. Não modifica políticas antigas, cadastros, ofertas, estados de pedido, propostas ou pagamentos. As páginas aceitam de 1 a 24 linhas na API; o site usa 12. Página e filtros são limitados no servidor.

## Limites de desempenho

A paginação usa offset com limite de página, não cursor. Contagem exata, busca por substring/sinônimo e média global ainda processam o conjunto correspondente no banco. Isso reduz transferência e trabalho do navegador, mas não promete tempo constante para uma base arbitrariamente grande. Índices de pesquisa textual e cursor devem ser avaliados com volume e planos reais.

O ID desempata títulos/notas/preços iguais em uma base estável. Cada página usa a situação atual do banco; novas ofertas ou alterações entre cliques podem deslocar resultados. Atualizar a vitrine recupera o estado mais recente. Não existe snapshot compartilhado entre páginas.

## Versionar

Depois da conferência local:

```powershell
cd C:\service-express
if ((git branch --show-current).Trim() -ne "feat/mvp-real-cadastros") { throw "Confira a branch." }
$arquivosAjura = (Get-Content .\ajura-banco-paginado\manifest.json -Raw | ConvertFrom-Json).files.path
foreach ($arquivoAjura in $arquivosAjura) {
  git add -- $arquivoAjura
  if ($LASTEXITCODE -ne 0) { throw "Falha ao preparar $arquivoAjura" }
}
git diff --cached --stat
git commit -m "feat: paginar vitrine e agregar indicadores no banco"
if ($LASTEXITCODE -ne 0) { throw "Commit interrompido." }
git push origin feat/mvp-real-cadastros
if ($LASTEXITCODE -ne 0) { throw "Push interrompido." }
git status --short --branch
```

O pacote não faz commit/push nem altera o GitHub Pages. A publicação depende da configuração existente.

## Reverter o site

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-banco-paginado\reverter.ps1 -Backup "C:\service-express\ajura-update-backups\CAMINHO-EXIBIDO-PELO-INSTALADOR"
```

Volta os arquivos locais à 0.7.0 e recusa substituir edições posteriores. Execute `npm.cmd ci` e Ctrl+F5 depois. A migração aditiva permanece no Supabase e é compatível com o site anterior. Não execute comandos para apagar índices ou rotinas. Se houver publicação posterior, a reversão do código também precisa ser versionada para chegar ao site publicado.

As demais pendências do roteiro — catálogo sob demanda, motor demonstrativo isolado, contexto de sessão, observadores, histórico de mensagens paginado e publicação verificável — continuam registradas no ROADMAP-UPGRADE.md.
