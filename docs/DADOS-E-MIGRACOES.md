# Contratos atuais de dados e migrações

| Entidade | Fonte de verdade | Uso |
| --- | --- | --- |
| Identidade da sessão | Supabase Auth | id da conta; senha não é lida pelo aplicativo |
| Cliente | profiles | nome, telefone, bairro, endereço, papel, status |
| Aprovação profissional | provider_profiles.approval_status | pending, approved, rejected, suspended |
| Identificação privada | provider_private_details | documento e nome/razão social |
| Oferta | provider_services | categoria/subcategoria atuais são rótulos do catálogo; active e preço |
| Cobertura | provider_service_areas | provider_id e district |
| Solicitação | service_requests | client_id, provider_id, serviço, descrição, preferred_date; requested, declined, cancelled |
| Conversa | request_messages | mensagens dos participantes |
| Orçamento | request_quotes | amount, scope, materials, scheduled_date; pending, accepted, rejected, superseded |
| Conexão MP | mp_provider_connections | credenciais cifradas protegidas; frontend consulta apenas RPC de status |
| Preparação de teste | payment_test_intents | valor copiado do orçamento; não é prova de pagamento |
| Consentimentos | profile_consents | tabela existente; fluxo de aceite na interface ainda pendente |

## Registro de migrações informado na conversa

1. schema.sql: autenticação/perfis/base.
2. client-profile.sql: endereço e tabela de consentimentos.
3. provider-onboarding.sql e provider-files.sql: identificação e anexos.
4. service-requests.sql e request-quotes.sql: solicitações/conversas/orçamentos.
5. SQL OAuth aplicado no painel e mp-connection-status.sql: tentativas e conexão.
6. request-client-profile.sql: usuário relatou sucesso em 05/10/2026.
7. payment-test-base.sql: usuário relatou sucesso em 05/10/2026.
8. Esta atualização: somente frontend; nenhum SQL novo.

O registro acima reflete o relato do usuário, não uma inspeção do banco ao vivo. Não reexecutar todos os scripts para limpar o SQL Editor. Run executa; Save guarda o texto de uma consulta. Funções e políticas efetivas só são verificadas consultando o banco.

## Próximas inserções

Antes de importar novos serviços, criar IDs estáveis de categoria/subserviço e mapear rótulos existentes. Validar duplicatas, bairro oficial, preço positivo, formato de documento e origem do registro. Fazer prévia de importação com contagem de novos/alterados/rejeitados; aplicar transação após revisão. Manter dados privados fora da vitrine.
