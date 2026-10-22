# Administracao: cadastros e decisoes

Instalar pelo PowerShell na raiz do projeto; executar admin-dashboard.sql no SQL Editor. A migracao adiciona apenas duas consultas autorizadas para administradores ativos. Nao concede contas administrativas nem altera cadastros ou politicas existentes.

Painel: contagens globais, filtro por estado, busca literal por nome, paginas de 20, historico paginado de aprovacoes/recusas existentes, atalho para revisao e Central. A aprovacao preserva a verificacao de requisitos e o fluxo anterior.

Limites: historico mostra somente provider_approval_events. Nao inventa datas de suspensao ou mudancas anteriores feitas diretamente no banco. Suspender/reativar pela interface e auditoria completa sao blocos futuros. Nao oferece acesso geral a conversas nem a anexos de pedidos. Nenhuma integracao de pagamento ou codigo de servico foi alterada.

Validar: administrador ativo abre painel; cliente nao acessa RPC; filtro com nome e caracteres especiais; historico sem executar HTML; revisar pendente exige checklist; Central abre fila; fechar sessao encerra painel.
