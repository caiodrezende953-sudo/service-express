# Supabase da AJURA — operação do piloto

O projeto existente usa `wmgungulnwingtcwebuy`. O arquivo público `supabase-config.js` contém apenas URL e chave publicável. Senha do banco, service_role, tokens OAuth e segredos das Edge Functions ficam fora do frontend.

## Migrações deste bloco

As três migrações em `supabase/migrations/` foram aplicadas diretamente ao projeto autorizado. **Não cole os SQL novamente no Editor.** Não execute indiscriminadamente os arquivos históricos na raiz de `supabase/`: eles registram versões sucessivas e alguns recriam regras antigas.

1. `safe_provider_writes`: cadastro profissional transacional; unicidade de oferta por prestador/atividade; tentativas opacas e mensagens com recibo.
2. `scoped_activity_permissions`: habilitação por categoria/subserviço e histórico privado da decisão; restrição de emissão e confirmação de códigos quando faltar habilitação.
3. `request_rescheduling`: proposta de nova data, aceite exclusivo do cliente e preservação do combinado original até esse aceite.

As tentativas persistidas no servidor contêm hash, identificador e recibo, sem duplicar CPF, endereço, texto da mensagem ou código. O navegador guarda apenas identificadores opacos por sessão; rascunhos de conversa ficam em memória. Ao trocar de conta, a interface descarta o contexto anterior.

## Verificações

`npm.cmd run test:sql` usa PGlite em memória, com `auth.uid` e Storage simulados para exercitar funções, transações, grants e RLS. Não testa entrega de e-mails, OAuth, sessão JWT real ou upload de verdade.

A sequência de `tests/sql/bootstrap.cjs` reconstrói os contratos necessários às regressões. Ela **não é** um instalador completo de produção: a configuração externa de Auth, Storage e as funções de integração precisam de documentação e versionamento próprios. Essa pendência continua no roteiro; nenhuma credencial deve ser copiada para o repositório.

O histórico anterior a este bloco ainda usa arquivos SQL legados e não está inteiramente espelhado na pasta de migrações. Não use `supabase db push` para reconciliar essa base sem antes completar essa etapa.

Antes de novas alterações: consultar o histórico remoto, criar migração incremental, validar isoladamente, aplicar uma vez e conferir permissões/advisors. Não executar SQL antigo para desfazer uma migração. Uma correção posterior deve preservar os dados criados desde a atualização.

## Limitações e custos

Plano gratuito preservado. Nenhuma cobrança, recurso pago ou branch de banco foi criada neste bloco. As tabelas adicionais ocupam espaço no mesmo projeto; cotas e crescimento continuam precisando de acompanhamento. A integração de pagamento de teste permanece desativada para cobranças reais.
