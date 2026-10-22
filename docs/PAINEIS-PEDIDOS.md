# Painéis de pedidos

Resumo real por papel: aguardando proposta, aguardando início, execução, conclusão e encerramento. Contagens abrangem o histórico inteiro e não apenas a página. Pedido solicitado com proposta aceita conta como aguardando início; sem aceite, aguardando proposta (inclui propostas ainda aguardando resposta). Cancelados e recusados ficam em encerrados.

O painel profissional inclui pedidos em execução na lista de 12 recentes. Conversa preserva confirmação de local, códigos, avaliações e Central existentes. Cancelamento em análise continua em execução até decisão; consulte a Central na conversa.

A função my_request_summary é SECURITY INVOKER, utiliza RLS, exige perfil ativo do papel selecionado e não retorna endereço ou identificação de terceiros. Nenhum pedido é alterado. SQL aplicado diretamente no projeto AJURA pelo conector; cópia neste pacote serve para versionamento, não é necessário executar manualmente.

Propostas aceitas continuam com seu indicador financeiro original (somente solicitações abertas). Não são ganhos. Pagamentos permanecem para a última etapa.

Testes de DOM e SQL não substituem a revisão com duas contas reais. Testar cliente, profissional e conta com ambos; sair durante carregamento; serviço iniciado permanecer no painel; conferir resumo e filtros.

## Validação da entrega
Migração order_panel_summary aplicada e permissões verificadas no projeto remoto: SECURITY INVOKER, execução negada a anon e permitida a authenticated. Testes locais SQL de contagem e isolamento passaram, assim como testes gerais e 43 testes dos módulos relacionados. Não houve teste visual em navegador com contas reais nesta entrega.

O verificador de segurança não apontou a nova função. Há avisos anteriores ainda para revisão: funções de gatilho com permissão de execução pública, RPCs SECURITY DEFINER existentes e proteção contra senhas vazadas desativada. Tabelas internas sem políticas permanecem fechadas por RLS; não criar políticas públicas apenas para remover o aviso.
Referências: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
