# Validação do primeiro bloco — 21/10/2026

Esta entrega foi preparada sobre o commit f1744bdf116ebfc92c52efb294663d7b3490cfd5. O projeto autorizado no Supabase é wmgungulnwingtcwebuy.

## Verificado automaticamente

- `npm test`: 112 verificações locais aprovadas em DOM simulado e testes de funções JavaScript.
- `npm run check`: sintaxe dos 32 scripts do aplicativo aprovada.
- `npm run test:sql`: 13 cenários aprovados em PostgreSQL isolado (PGlite), com funções, transações, RLS e grants. Inclui rollback após falha tardia, repetição, conflito entre versões, mensagens da Central, aprovação por serviço, revogação, reagendamento, invalidar código antigo e manter a cota de arquivos.
- Instalador executado em PowerShell 7.4.13 no Linux: conferência sem escrita; instalação e repetição; preservação de arquivo local fora do pacote; conflito antes de copiar; CRLF/BOM; falha simulada no meio da cópia com restauração; pacote adulterado; caminho fora da pasta; reversão protegida contra edição posterior. Estes são cenários do pacote, separados das 125 verificações de aplicativo/banco.

## Banco autorizado

| Versão remota | Migração |
|---|---|
| 20261021133033 | safe_provider_writes |
| 20261021133819 | scoped_activity_permissions |
| 20261021134711 | request_rescheduling |

As três migrações estão no histórico remoto e seus nomes/versões coincidem com os arquivos locais. Nenhuma conta, pedido ou documento real foi criado para testar. Não havia pedidos, aprovações regulamentadas antigas ou duplicatas de oferta na conferência anterior à migração.

A conferência posterior confirmou RLS nas quatro novas tabelas. Anônimos não recebem SELECT nelas nem EXECUTE nos novos RPCs. Somente a tabela de permissões permite SELECT autenticado, sujeito à policy de titular ativo ou administrador. Tentativas, histórico interno e propostas de reagendamento usam funções autorizadas em vez de acesso direto. Auxiliares novos não têm EXECUTE para clientes. Os RPCs novos usam search_path vazio e verificam identidade, papel e titularidade no servidor.

## Avisos que permanecem no advisor

O resultado não é uma certificação de segurança. Persistem avisos que precisam ser acompanhados:

- [Funções SECURITY DEFINER executáveis por usuários autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable): 55 ocorrências, incluindo as APIs transacionais desta entrega. As novas funções são intencionalmente acessíveis a usuários autenticados e fazem a autorização internamente; não se deve conceder acesso direto às tabelas privadas para remover o aviso. A revisão individual das funções antigas continua no roteiro.
- [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): 19 informações, incluindo tabelas privadas acessadas exclusivamente por funções autorizadas. A ausência de policy nesses casos nega acesso direto; não justifica criar uma policy permissiva.
- [Proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): continua desativada. Este pacote não muda o plano contratado. As regras de senha já existentes continuam em vigor.
- [Chaves estrangeiras sem índice de apoio](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys): 34 informações remanescentes; a priorização com medição fica no bloco de desempenho. Não foram removidos os índices marcados como sem uso num piloto ainda sem pedidos.
- [Policies permissivas múltiplas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies): um aviso em provider_private_details. Não foi alterado o acesso administrativo existente para tentar zerar o painel.

O aviso de RLS InitPlan da policy de propostas deixou de aparecer na consulta posterior.

## Ainda precisa de validação prática

A instalação não foi executada na máquina Windows do usuário. Windows PowerShell 5.1, autenticação JWT real, envio de e-mail, upload pela API de Storage, duas contas em dispositivos separados e navegação com teclado de celular real são verificações distintas. Os testes SQL simulam Auth e Storage e não substituem esses fluxos.

O frontend foi preparado em pacote; não houve commit, push ou publicação automática do site. As instruções estão em BUGS-E-PROTECAO.md. Pagamentos reais continuam por último.
