# Uploads e recuperação de falhas

Sem migração SQL. Mantém políticas, limites de 10 documentos de verificação e 5 anexos por pedido, com até 5 MB por arquivo.

## Comportamento
O cliente verifica extensão/MIME/tamanho e assinatura inicial de JPG, PNG e PDF (isso não é antivírus). O identificador do objeto é derivado do conteúdo e contexto usando SHA-256 truncado a 128 bits no formato compatível com as políticas existentes. Arquivos iguais no mesmo contexto reutilizam o envio. O mesmo conteúdo em pedidos distintos ou tipos de documento distintos tem contextos separados. Arquivos antigos com nomes aleatórios permanecem intactos e não são deduplicados retroativamente.

Antes de enviar, consulta se o registro já existe e se há objeto pendente no caminho. Em falha de confirmação, mantém o objeto e a seleção em vez de remover automaticamente. Uma nova tentativa com o mesmo conteúdo recupera o registro pendente, inclusive após reabrir a página e selecionar o arquivo de novo. Arquivos não são salvos em localStorage. Fechar a página perde a seleção local, não o arquivo já recebido pelo servidor.

Cliques repetidos no mesmo formulário e envios simultâneos do mesmo conteúdo na instância são bloqueados. A unicidade do caminho e os registros do servidor complementam essa proteção. A seleção de anexos é preservada em falhas parciais e os já confirmados são reaproveitados. 

Não há remoção automática de arquivos órfãos. Eles continuam contando nas quotas do piloto. Arquivos pendentes com nomes do fluxo antigo não são recuperados por hash automaticamente; essa revisão permanece administrativa.

## Sessão e privacidade
As respostas só atualizam a tela que iniciou a operação. Mudança de usuário ou saída da conta invalida operações visuais pendentes; o fluxo confere o usuário antes de enviar e registrar. Uma requisição já recebida pelo servidor pode terminar mesmo após fechar a tela — não existe cancelamento retroativo garantido. Links são temporários, HTTPS e do domínio configurado do Supabase. Links já emitidos podem funcionar até expirar.

## Validação
Testes locais cobrem perda da resposta de upload, perda da resposta de registro, recuperação após recriar o fluxo, concorrência, sessão inválida e conteúdo inválido. Também foram executados testes do módulo de anexos, DOM e estrutura. Isso não substitui validação real com contas distintas nem teste de acesso direto aos arquivos. Não altera ou publica pagamentos.
