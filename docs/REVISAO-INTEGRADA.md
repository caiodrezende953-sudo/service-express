# Revisão integrada — AJURA

Consulta em 20/10/2026. Código de referência: commit 8077657, branch feat/mvp-real-cadastros. Esta entrega altera a validação e a documentação, não os fluxos do aplicativo nem os dados do banco.

## Resultado técnico

- 26 arquivos de testes locais executados; 99 verificações reportadas pelo Node, todas aprovadas após corrigir uma simulação administrativa desatualizada.
- Sintaxe dos 30 scripts do aplicativo conferida.
- O teste administrativo antigo não fornecia handleForm ao simular AJURA_CORE; passou a carregar o utilitário real. Não foi necessário alterar o painel administrativo para essa correção.
- npm test passa a executar todos os arquivos *.test.cjs locais, exceto browser.test.cjs, mais os três testes legados catalogo.cjs, menu-servicos.cjs e pagamentos.cjs. Os testes de pagamentos legados verificam apenas a interface demonstrativa; não são integração financeira.
- npm run check confere a sintaxe de todos os arquivos JavaScript da raiz. npm run test:quick mantém a antiga sequência de três testes. npm run test:browser é separado e depende de Playwright e navegador instalado; não foi executado nesta revisão. Nenhum teste de navegador foi marcado artificialmente como aprovado ou ignorado dentro da suíte local.
- Dependências e versão do pacote não foram alteradas; package-lock.json permanece válido. Não precisa instalar pacotes adicionais para a suíte local já existente.

## Banco conectado

Projeto wmgungulnwingtcwebuy; a configuração do frontend no commit conferido aponta para esse mesmo projeto.

| Conferência | Resultado observado |
| --- | --- |
| Tabelas comuns no schema public sem RLS | 0 |
| Entradas estruturadas no catálogo | 858 |
| Buckets de documentos e anexos | Ambos privados |
| Contas ativas | 1 cliente e 1 conta com os dois perfis |
| Cadastro profissional aprovado | 1 |
| Pedidos persistidos | 0 |
| Anexos de pedidos registrados | 0 |

RLS habilitada não prova, sozinha, que todas as políticas estão corretas. A consulta de configuração não substitui testes de acesso por papel. Não foram criados pedidos, contas ou arquivos nem alteradas aprovações durante esta revisão.

## Pendências antes de considerar o fluxo real validado

| Prioridade | Verificação | Estado |
| --- | --- | --- |
| Alta | Pedido persistido, orçamento, aceite e códigos no fluxo completo | Pendente; não há pedidos neste banco |
| Alta | Participantes acessam anexos e terceiro não administrador é bloqueado em acesso direto | Pendente; não há anexos de pedidos registrados |
| Alta | Confirmação de e-mail, recuperação real e troca entre contas | Revalidar após a atualização de acesso |
| Alta | Aprovação e revogação de habilitação por profissão/especialidade | Testada em base isolada; validação integrada pendente |
| Alta | Duas conexões reais repetindo a mesma tentativa de orçamento | Pendente; bloqueio transacional conferido em código e repetição sequencial testada |
| Média | Chrome Android e Safari iOS: teclado, zoom, rotação e rolagem | Pendente; testes de DOM/CSS não renderizam a interface |
| Média | Curadoria dos títulos e especialidades e critérios documentais de cada área regulamentada | Necessária; o catálogo não é uma relação oficial de habilitações |
| Posterior | Pagamentos, comissões, repasses e disputas financeiras | Fora das entregas concluídas |

## Primeiro ensaio integrado

1. Usar uma conta Cliente no Chrome e o prestador aprovado em uma sessão independente. A mesma pessoa não pode contratar a própria oferta.
2. Escolher um serviço já disponível e abrir uma solicitação com descrição identificável como teste; conferir que aparece nos dois lados e persiste após recarregar.
3. Enviar uma imagem sem dados pessoais, abrir pelo prestador e confirmar registro no banco. Registrar horário e resultado, sem compartilhar senha ou token.
4. Enviar proposta, aceitar pelo cliente e conferir escopo, preço e local. Os códigos não movimentam dinheiro nesta fase.
5. Testar a conclusão/avaliação em ambiente de teste separado ou com serviço realmente concluído; não publicar histórico fictício de reputação na vitrine real.
6. Para isolamento, usar uma terceira conta sem privilégios administrativos e fora do pedido. A ausência do pedido na tela é só uma parte do teste: também é preciso negar a emissão de um novo link de arquivo por acesso direto. Um link temporário legitimamente emitido pode funcionar até expirar.

Registrar cada item como aprovado, falhou ou não executado. A aprovação dos testes locais não muda essas pendências para concluídas.
