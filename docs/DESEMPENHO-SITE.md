# Desempenho no site — AJURA 0.7.0

Esta é a primeira entrega do bloco de desempenho, sobre a versão visual 0.6.0 instalada e validada localmente pelo usuário. As 15 ações abaixo não representam a conclusão dos 15 itens D01–D15 do roteiro original: várias dependem de banco e migrações, e seguem explicitamente pendentes em ROADMAP-UPGRADE.md.

Nenhum SQL, dependência paga ou serviço novo é necessário. Não modifica Supabase remoto, autenticação, RLS, critérios de aprovação, endereço privado, cobrança, comissão ou repasse. Pagamentos continuam por último. O instalador compara os arquivos com a base 0.6.0 antes de escrever.

## Alterações desta entrega

| ID | Área | Alteração |
|---|---|---|
| P01 | Texto das atividades | Área, profissão, especialidade, serviço e sinônimos são normalizados uma vez ao carregar. |
| P02 | Consulta compilada | As palavras da consulta são preparadas uma vez por busca, preservando a correspondência existente. |
| P03 | Resultado reutilizado | O cadastro usa a mesma lista filtrada ao montar profissão, especialidade e serviços. |
| P04 | Digitação agrupada | O cadastro aguarda 180 ms de pausa antes de refazer a pesquisa. |
| P05 | Posição indexada | Selecionar uma atividade evita procurar sua posição percorrendo a lista inteira. |
| P06 | Busca das ofertas | O texto pesquisável é montado uma vez por oferta ao carregar a vitrine. |
| P07 | Catálogo válido | Pares categoria/serviço usam um conjunto para validação, em vez de percorrer todas as categorias por oferta. |
| P08 | Busca descartável | Buscas adiadas antigas podem ser canceladas ao fechar o cadastro, atualizar a vitrine ou limpar filtros. |
| P09 | Menos colunas | Lista de pedidos, painel, histórico alternativo e propostas pedem os campos usados pela tela, mantendo os filtros de acesso. |
| P10 | Contexto único | A conversa usa o pedido já retornado por support_context e elimina a consulta adicional à tabela de solicitações. |
| P11 | Seções paralelas | Resumo, local, reagendamento, cancelamento, códigos e avaliações carregam de forma independente, com erro isolado por seção. |
| P12 | Detalhes sob demanda | Orçamento e anexos são consultados ao abrir seus detalhes, uma vez por abertura da conversa. |
| P13 | Atualização adaptativa | Mensagens não lidas passam de 60 s para 120/240/300 s após falhas; voltam a 60 s no sucesso. A tarefa pausa sem rede, fora da página e com aba oculta. |
| P14 | Validação reutilizada | O cabeçalho do mesmo objeto File é validado uma vez; anexos usam a validação comum quando disponível. |
| P15 | Hash reutilizado | Repetir o mesmo objeto File no mesmo contexto evita reler todo o arquivo para gerar a chave. Outra seleção ou tipo de documento recebe a conferência adequada. |

## O que foi medido

`npm.cmd run measure:performance` compara o algoritmo anterior e o novo com os mesmos dados e exige resultados idênticos em seis consultas.

| Medida local | Antes | Depois |
|---|---:|---:|
| Atividades | 858 | 858 |
| Consultas comparadas | 6 | 6 |
| Normalizações durante essas buscas | 10.296 | 6 |
| Construção inicial do índice | Não havia | 858 normalizações |

O índice acrescenta trabalho e memória no carregamento inicial para reduzir as buscas seguintes. O teste não representa latência, consumo real de memória ou velocidade de um aparelho. Não foi feita medição de rede real nem revisão em navegador nesta entrega.

Testes de comportamento verificam consulta compilada sem ampliar especialidades, mesmo resultado dos sinônimos, recuperação de upload sem duplicação, cancelamento da busca, seções paralelas, isolamento de falha, detalhes sob demanda, pausa e espera progressiva das mensagens. São 130 testes locais, 13 testes PostgreSQL isolados e sintaxe de 33 scripts. O banco isolado não acessa o Supabase real.

## Cuidados preservados

- Nenhum cache novo em localStorage ou sessionStorage. Textos das atividades são catálogo; validações e hashes usam referências fracas ao objeto File, em memória. O conteúdo completo não é armazenado no cache.
- O motor de upload continua conferindo a sessão antes das ações e mantém a recuperação após respostas perdidas. Cache de validação não autoriza upload nem substitui a conferência do servidor.
- A conversa só renderiza o contexto quando o pedido devolvido corresponde ao solicitado e o participante corresponde à sessão; a Central continua dependendo da autorização da RPC. As respostas atrasadas continuam sendo descartadas após trocar de conta ou fechar a tela.
- Falha no registro de leitura não elimina as mensagens nem o rascunho. Pode manter uma contagem antiga até a próxima confirmação.
- Cada seção da conversa mantém sua autorização e consulta ao servidor. O carregamento paralelo não converte erro em sucesso e não inventa preço, endereço, aprovação ou pagamento.
- Orçamento e anexos permanecem acessíveis em “Orçamento e anexos”. Após enviar, aceitar ou atualizar, reabra os detalhes na conversa atualizada.

## Instalar

Extraia a pasta `ajura-desempenho-site` em `C:\service-express`. O instalador mantém backup e recusa conteúdo local desconhecido, sem forçar substituições. Não altere a branch nem execute novamente os instaladores antigos.

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-desempenho-site\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Verificação de sintaxe falhou." }
npm.cmd run measure:performance
if ($LASTEXITCODE -ne 0) { throw "Medição local falhou." }
Start-Process chrome.exe "C:\service-express\index.html"
```

Use Ctrl+F5 após abrir. Opcionalmente, faça a conferência sem instalar com `-SomenteConferir` no instalador.

## Conferência no Chrome com contas reais

1. Pesquise faxineira, endócrino e um serviço cotidiano no cadastro. Mude de profissão preservando as escolhas e o texto dos serviços selecionados.
2. Na vitrine, digite e limpe rapidamente a busca, remova um filtro de nota e atualize antes de terminar a digitação. Confira que não retorna um filtro antigo.
3. Abra uma conversa e confira que mensagens e campo para digitar aparecem enquanto as outras seções carregam. Uma falha de seção deve ficar restrita à própria seção.
4. Abra “Orçamento e anexos”, envie uma proposta/anexo e confira a atualização sem duplicar. O primeiro carregamento dos detalhes agora acontece ao expandi-los.
5. Teste rede indisponível: texto e rascunhos devem permanecer; a atualização das não lidas só volta com a rede/página ativa. Refaça uma consulta que falhou.
6. Saia e entre em outra conta durante um carregamento e confira que nenhum conteúdo privado reaparece. Confira o celular e o teclado virtual.

Não houve acesso direto ao seu Chrome. As conferências reais acima permanecem necessárias.

## Versionar as duas entregas

O último log recebido confirma instalação e testes da 0.6.0, mas não confirma commit/push. Por isso o manifesto deste pacote inclui `publish_paths`, união dos caminhos das duas entregas. Ele prepara somente arquivos do upgrade e deixa instaladores legados, backups e outros arquivos locais fora do commit.

Depois da conferência:

```powershell
cd C:\service-express
if ((git branch --show-current).Trim() -ne "feat/mvp-real-cadastros") { throw "Confira a branch antes de publicar." }
$caminhosAjura = (Get-Content .\ajura-desempenho-site\manifest.json -Raw | ConvertFrom-Json).publish_paths
foreach ($caminhoAjura in $caminhosAjura) {
  git add -- $caminhoAjura
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível preparar $caminhoAjura" }
}
git diff --cached --stat
git commit -m "feat: organizar interface e reduzir trabalho repetido no site"
if ($LASTEXITCODE -ne 0) { throw "Commit interrompido." }
git push origin feat/mvp-real-cadastros
if ($LASTEXITCODE -ne 0) { throw "Push interrompido." }
git status --short --branch
```

Enviar à branch não confirma a publicação no GitHub Pages; depende da configuração de publicação existente. O pacote não faz commit, push ou publicação automaticamente.

## Reverter

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-desempenho-site\reverter.ps1 -Backup "C:\service-express\ajura-update-backups\CAMINHO-EXIBIDO-PELO-INSTALADOR"
```

A reversão recusa substituir edições posteriores e retorna os arquivos à 0.6.0. Execute `npm.cmd ci` depois e recarregue com Ctrl+F5. Nenhuma reversão de banco é necessária. O instalador e a reversão foram exercitados em PowerShell 7.4.13/Linux; o usuário já executou a infraestrutura equivalente no Windows no pacote 0.6.0.

## Próximas partes do bloco

Continuam pendentes: catálogo detalhado sob demanda, isolamento do motor demonstrativo, paginação da vitrine no servidor, consolidação dos observadores e contexto de sessão, agregações dos indicadores no banco, índices baseados nos caminhos de consulta, paginação do histórico das mensagens e publicação verificável. Não trocar a etiqueta de versão por uma falsa conclusão dessas tarefas.

Documentação de API conferida: [seleção de campos](https://supabase.com/docs/reference/javascript/select), [eventos de autenticação](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) e [changelog](https://supabase.com/changelog.md). Não foram introduzidas APIs novas de autenticação nem novas permissões nesta entrega.
