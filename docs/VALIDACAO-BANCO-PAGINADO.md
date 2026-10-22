# Evidências da entrega 0.8.0 — 21/10/2026

## Escopo validado

- 143 testes locais em DOM simulado, sem navegador real.
- 23 testes PostgreSQL isolados: 13 regressões anteriores e 10 novos casos do catálogo/indicadores.
- Sintaxe de 33 scripts.
- 31 ofertas sintéticas, páginas de 12/12/7, IDs sem repetição e totais globais; busca e facetas independentes da página.
- Média 4,75 não passa em 4,8, embora arredonde para 4,8 na tela; notas ocultas não entram na média.
- Ofertas pendentes, contas bloqueadas e atividades sem habilitação exata ficam fora da vitrine.
- Indicadores não podem ser consultados como cliente nem para outro prestador. Somam somente propostas aceitas de pedidos ainda abertos.
- Plano de uma consulta de 12 pedidos recentes sobre 3.000 pedidos sintéticos escolheu `ajura_requests_provider_recent_idx`, sem forçar o planejador.
- Falhas e respostas atrasadas preservam filtros, impedem ações com página inválida e não repõem conteúdo após sair.
- Instalador, integridade, conflito, repetição e reversão exercitados com PowerShell 7.4.13/Linux. Conferência em Windows e Chrome continua separada.

## Supabase real

Projeto `wmgungulnwingtcwebuy` / AJURA. Migração registrada como `20261021174140_catalog_pagination_and_provider_metrics`.

As verificações com role authenticated e claims de perfis existentes confirmaram catálogo e indicadores. role anon foi recusada; sessão sem conta ativa também. Não foram criadas contas ou linhas sintéticas no projeto real.

| Contagem de negócio | Antes | Depois |
|---|---:|---:|
| Serviços | 14 | 14 |
| Solicitações | 0 | 0 |
| Propostas | 0 | 0 |
| Avaliações | 0 | 0 |

Há 2 ofertas elegíveis, 7 serviços inativos e 5 aguardando habilitação específica. Os seis novos índices foram confirmados no catálogo do PostgreSQL.

## Advisors antes e depois

Nenhum aviso novo de segurança foi introduzido pelas rotinas desta entrega. Os avisos anteriores não foram tratados como resolvidos:

| Verificação | Antes | Depois | Observação |
|---|---:|---:|---|
| Chaves estrangeiras sem índice | 34 | 30 | Quatro caminhos adicionais cobertos |
| Índices sem uso registrado | 16 | 18 | Base pequena; não é evidência suficiente para remover índices |
| Políticas permissivas sobrepostas | 1 | 1 | Anterior, fora desta migração |
| SECURITY DEFINER pública executável por autenticados | 55 | 55 | Anterior; novas RPCs públicas são invoker |
| RLS sem policy | 19 | 19 | Tabelas internas acessadas por rotinas controladas; não se abriu acesso direto |
| Proteção contra senhas vazadas desabilitada | 1 | 1 | Configuração anterior de Auth, preservada |

Referências de diagnóstico: [índices de FK](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [policies sobrepostas](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), [funções definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Documentação usada: [RPC](https://supabase.com/docs/reference/javascript/rpc), [funções](https://supabase.com/docs/guides/database/functions), [otimização](https://supabase.com/docs/guides/database/query-optimization). Os testes e o diagnóstico não constituem garantia de ausência de vulnerabilidades nem medição de desempenho em produção com grande volume.
