# Orçamentos sem duplicação na repetição

## Banco
Já aplicado diretamente no projeto AJURA. Não executar novamente supabase/quote-idempotency.sql. O arquivo consolida as migrações protect_quote_submission_retries e reuse_identical_pending_quotes_for_legacy_clients para versionamento. Nenhum pedido ou orçamento existente foi apagado.

A nova função send_request_quote_once recebe chave UUID e bloqueia a tentativa no servidor. Repetir a chave e os mesmos dados retorna o orçamento original, mesmo que o pedido tenha sido encerrado depois. A conta ainda precisa ser prestador ativo e aprovado. Usar a mesma chave com dados diferentes é rejeitado; chave nova pode criar uma nova versão sob as regras já existentes. A substituição da proposta anterior e o registro da tentativa ocorrem na mesma transação.

A função antiga permanece compatível e agora reutiliza uma proposta idêntica que ainda está pendente. O novo fluxo é mais forte: preserva a identidade da tentativa mesmo após mudança de estado. Tabela interna com RLS e sem leitura/gravação direta por clientes. Não altera aceite, valores, pagamentos ou repasses.

## Navegador
Chave e hash dos dados são guardados em sessionStorage, separados por conta/pedido. Textos, valores, datas e tokens não são guardados por este módulo. Uma repetição com os mesmos dados mantém a chave; após recarregar na mesma aba, é preciso preencher os mesmos campos para recuperar a tentativa. Se o armazenamento estiver indisponível, a chave é mantida só em memória.

Confirmar sucesso limpa a tentativa, permitindo uma nova versão deliberada. Alterar os dados gera outra chave e representa outra versão; para recuperar um envio de resultado incerto, mantenha os mesmos dados. A chave da aba não é compartilhada entre dispositivos. A função antiga também reaproveita conteúdos idênticos pendentes, mas não identifica tentativas antigas já substituídas.

## Verificação
Testes SQL em base isolada: repetição, conflito de dados, novas versões, histórico, rejeição de terceiros/conta bloqueada/anon e repetição depois do encerramento. Foi verificada no projeto real a instalação, RLS, ausência de leitura direta e permissões da função. Não foram criados orçamentos de teste no banco real. Concorrência verdadeira entre conexões distintas permanece pendente; a implementação usa bloqueio transacional e chave primária. Testes de frontend verificam reaproveitamento de chave, armazenamento mínimo e regressões.

Os avisos genéricos de funções SECURITY DEFINER autenticadas permanecem no advisor; esta função confere usuário, papel e aprovação e fixa search_path. A tabela interna sem políticas de leitura é intencional. Proteção de senhas vazadas permanece pendente conforme o plano gratuito.
