# Denuncias e moderacao de avaliacoes

Requer a entrega de avaliacoes reais (45dd84d) e service-reviews.sql aplicado. Execute supabase/review-moderation.sql depois de instalar. O instalador nao executa SQL e nao altera dados remotos.

## Funcionamento

- Contas ativas podem denunciar avaliacoes visiveis de prestadores aprovados; o proprio prestador tambem pode denunciar as suas quando seu cadastro nao estiver aprovado.
- Motivo de 10 a 1000 caracteres. Uma denuncia por conta/avaliacao, inclusive depois de encerrada. Reenvio retorna o registro anterior e nao substitui o motivo original.
- Denuncia nao oculta automaticamente. O motivo fica restrito a administracao; identidade do denunciante nao e publicada nem entregue ao prestador por estes RPCs.
- Administrador ativo consulta abertas/encerradas (20 por pagina) e historico (20 por pagina), oculta, restaura ou encerra sem alterar. Justificativa de 10 a 2000 caracteres; uma nota baixa nao basta para remover.
- Ocultar/ restaurar muda somente a visibilidade da avaliacao. Original, nota, pedido e autor permanecem no banco; historico registra administrador, decisao, justificativa, estado anterior e data.
- A nota ocultada sai da media e da contagem publica. Restaurar a inclui novamente. Sem notas visiveis, aparece Novo na plataforma.
- Cada decisao encerra a denuncia selecionada. Outras denuncias da mesma avaliacao ficam para analise separada. Pode restaurar usando a denuncia encerrada; se o estado observado mudar, o servidor exige atualizar o painel.
- Cliente e prestador continuam vendo o original no pedido com aviso de ocultacao. Nao surge outro formulario de avaliacao.
- Outros navegadores precisam atualizar a vitrine para consultar a nova media. Nao ha notificacao automatica nem promessa de prazo de atendimento.
- Este fluxo trata avaliacoes; nao cancela pedidos, altera pagamentos ou decide disputas financeiras. Nao apaga historico.

## Instalacao e verificacao

1. Execute o instalador na raiz C:\service-express; ele verifica versoes e cria backup antes de copiar.
2. Abra supabase/review-moderation.sql e execute todo o arquivo no SQL Editor do projeto AJURA. Reexecutar e permitido.
3. Execute npm.cmd test e node --test tests/review-moderation.test.cjs tests/service-reviews.test.cjs.
4. Na vitrine, abra as avaliacoes de um prestador real e denuncie uma avaliacao com motivo; confirme que a nota continua visivel.
5. Na administracao, abra Moderacao de avaliacoes; oculte com motivo. Atualize a vitrine e confira a contagem/media; no pedido, confirme que o original permanece com aviso.
6. Consulte Encerradas, restaure, confira a media e o historico. Uma conta comum nao deve acessar o painel.
7. Somente depois dessa verificacao, commit/push dos arquivos deste pacote. Nao use git add . para incluir pastas de instalacao/backups.

## Validacao executada no preparo

26 testes de DOM simulado (moderacao, avaliacoes, codigos, mensagens e resumo) e testes gerais passaram. PostgreSQL local (PGlite), com usuarios/tabelas de teste, validou migracao reexecutavel, permissoes, denuncia idempotente, administrador ativo, motivos obrigatorios, ocultacao/media, restauracao/auditoria e rejeicao de estado desatualizado. Esses testes nao substituem testar no Supabase e no navegador reais. Nenhuma alteracao foi executada no Supabase do usuario durante o preparo.

## Recuperacao

O instalador salva os arquivos locais anteriores em ajura-update-backups/moderacao-<data>. Se houver falha de copia, restaura os anteriores e remove arquivos novos copiados nessa tentativa. Restaurar arquivos locais nao reverte uma migracao SQL ja executada nem as decisoes registradas no banco.
