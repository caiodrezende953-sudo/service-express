# Cancelamento durante a execucao

Base: avaliacoes/moderacao (be3e350), codigos de servico e messaging-support.sql aplicados. Execute supabase/service-cancellation.sql no SQL Editor depois da instalacao local. Nenhuma operacao financeira e implementada neste bloco.

## Fluxo

1. Cliente ou prestador ativo abre a conversa de um pedido Em execucao e escolhe Solicitar cancelamento pela Central.
2. O motivo (10 a 1000 caracteres) cria/reaproveita um atendimento aberto e registra a solicitacao. Uma solicitacao pendente por pedido. Reenvio por qualquer participante retorna a mesma pendente, sem substituir o motivo ou duplicar o historico.
3. O pedido permanece Em execucao. A solicitacao nao suspende automaticamente o trabalho nem desativa o codigo de conclusao. Se o servico tiver problema, o cliente nao deve compartilhar esse codigo antes de conferir o resultado.
4. Administrador ativo abre Central > atendimento e registra Manter pedido em execucao ou Aprovar cancelamento, com justificativa de 10 a 2000 caracteres. A tela recomenda conferir o combinado e ouvir ambos os lados; nao existe verificacao automatica de que eles foram ouvidos.
5. Aprovar muda o pedido para Cancelada e invalida os codigos restantes. Manter encerra essa analise e conserva o estado Em execucao. Nova solicitacao pode ser aberta depois dessa decisao.
6. O atendimento da Central permanece aberto para esclarecer a decisao. Encerrar atendimento e uma acao separada, bloqueada pelo servidor enquanto houver analise de cancelamento pendente.
7. Se o cliente autorizar a conclusao pelo codigo antes da decisao, o pedido fica Concluido e a solicitacao pendente fica encerrada por mudanca do pedido. Nao se cancela um pedido concluido por esta funcao.

## Historico e privacidade

- Solicitacao, autor, motivo, decisao, administrador e datas sao preservados no banco. Cliente/prestador/administracao autorizada acompanham motivo e decisao no pedido (20 registros por pagina).
- A linha do tempo registra solicitacao, decisao e encerramento por mudanca do pedido. O resumo do combinado permanece intacto.
- Tabela privada com RLS; todas as operacoes passam por RPC autorizado. Administracao so consulta pedidos encaminhados a Central. Terceiros e anonimos nao acessam.
- Motivo e decisao sao compartilhados com os dois participantes, nao uma denuncia confidencial. Evite incluir documentos ou dados pessoais desnecessarios.
- Motivos longos de decisao permanecem inteiros no historico; a mensagem de aviso na Central usa ate 1600 caracteres da justificativa para respeitar o limite da mensagem.
- Suspender um prestador nao cancela pedidos automaticamente. Um cliente ativo pode solicitar analise mesmo nesse caso; o administrador pode cancelar o pedido em execucao. O prestador com perfil ativo ainda acompanha a Central conforme as permissoes existentes.
- Nenhuma cobranca, estorno, multa, repasse ou definicao de pagamento parcial e feita. A futura integracao financeira precisara considerar esse fluxo antes de permitir movimentacoes.
- Cancelado nao recebe formulario de avaliacao; concluido continua seguindo a regra de avaliacao real. Nao existe conclusao forcada pelo administrador.
- Atualize a conversa para ver decisoes feitas em outro navegador. Nao ha notificacao push ou prazo automatico de atendimento neste bloco.

## Instalacao

Extraia ajura-cancelamento-central dentro de C:\service-express e execute instalar.ps1 nessa raiz. O instalador verifica hashes/versoes antes de alterar qualquer arquivo, cria backup local e restaura em falha de copia. Nao executa SQL. Nao sobrescreve versoes locais diferentes silenciosamente.

Abra supabase/service-cancellation.sql, copie todo o arquivo e execute no SQL Editor do projeto AJURA. Reexecutar e permitido; nenhum pedido antigo e cancelado durante a instalacao.

Execute npm.cmd test e node --test tests/service-cancellation.test.cjs tests/service-execution.test.cjs tests/messaging.test.cjs tests/request-overview.test.cjs.

## Verificacao real antes do commit

- Use cliente e prestador DIFERENTES em um pedido que ja iniciou por codigo.
- Solicite cancelamento; confirme que permanece Em execucao e que o outro participante ve a pendencia ao atualizar.
- Na Central como administrador, tente encerrar atendimento sem decidir: deve pedir para analisar o cancelamento.
- Registre Manter pedido em execucao; confira justificativa/historico. Depois solicite novamente e aprove o cancelamento.
- Confirme estado Cancelada, ausencia de novo codigo e de formulario de avaliacao. Codigo anterior nao pode concluir o pedido.
- Em outro pedido, solicite analise e conclua legitimamente por codigo antes da decisao; a solicitacao deve encerrar por mudanca do pedido e o administrador nao pode cancelar esse concluido.

## Validacao no preparo

39 testes em DOM simulado (incluindo 9 novos) e os testes gerais passaram. PostgreSQL local PGlite com tabelas/usuarios de teste e os RPCs reais de mensagens, historico e codigos validou: migracao repetivel, participantes/administrador ativo, privacidade, limites de texto, pedido primeiro nos locks, reaproveitamento da pendencia, bloqueio de encerramento de atendimento, decisao, invalidacao de codigo e conclusao antes da analise. As transicoes de estados foram testadas sequencialmente; nao foi realizado teste de carga ou de concorrencia real em rede. Nenhuma alteracao foi feita no Supabase do usuario durante o preparo.

## Recuperacao

Backup local: ajura-update-backups/cancelamento-<data>. Recuperar arquivos locais nao reverte SQL aplicado ou decisoes ja registradas. Nao use git add .; versione somente arquivos da entrega depois da verificacao real.
