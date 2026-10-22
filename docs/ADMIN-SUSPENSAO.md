# Suspensao e nova analise

Executar admin-provider-status.sql no Supabase e instalar o pacote pelo PowerShell na raiz do projeto. Nenhum cadastro existente e alterado pela migracao. O instalador exige o admin.js do pacote admin-organizado para evitar sobrescrever edicoes.

No painel administrativo, cada cadastro permite suspender (pendente, aprovado ou recusado) ou encaminhar suspenso para nova analise. Motivo obrigatorio de 10 a 1000 caracteres. Confirmacao antes de enviar. Erro preserva texto. A retirada da suspensao coloca pendente e limpa approved_at, exigindo aprovacao pelo fluxo anterior.

Banco: RPC autorizado apenas para administrador ativo; bloqueio da linha e validacao da transicao; evento gravado na mesma transacao. Tabela provider_status_events sem acesso direto dos usuarios comuns. Historico unifica aprovacao/recusa anteriores com as novas decisoes de estado. Alteracoes manuais no banco e invalidacoes automaticas nao sao retroativamente auditadas.

Suspensao nao desativa a conta de cliente, nao cancela pedidos, nao cobra, nao estorna, nao apaga arquivos e nao revoga conexao Mercado Pago. O filtro existente de prestadores aprovados deve retirar o suspenso da vitrine; testar com outra sessao e recarregar. Casos de atendimento em andamento exigem tratamento pela Central.

Validacao real: suspender cadastro escolhido, conferir motivo/historico e ausencia na busca, retornar para analise e conferir que nao voltou automaticamente a publico, cliente comum sem acesso administrativo. Pagamentos e codigos de servico permanecem pendentes.
