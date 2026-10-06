# Local do atendimento por pedido

Base esperada: cancelamento pela Central (100ef20) e paleta do chat instalada. Este pacote nao modifica messaging.css.

## Funcionamento

- O cliente escolhe No endereco informado ou Remoto / online. No presencial, confirma rua, numero (ou S/N), complemento e referencia. Campos comecam com os dados do proprio perfil, podem ser ajustados para outro local e exigem confirmacao explicita.
- O bairro continua limitado aos bairros atendidos pelo prestador. Confira se ele corresponde ao endereco; nao existe consulta de CEP, mapa ou validacao geografica automatica.
- O local confirmado fica numa tabela privada separada do pedido publico aos participantes. Alterar o perfil depois nao muda essa copia.
- Antes do aceite, somente o cliente consulta o endereco completo. O prestador recebe bairro e modo de atendimento. Aceitar a proposta autoriza consulta ao endereco pelo prestador aprovado daquele pedido; o aviso de aceite deixa essa autorizacao explicita. Isso nao cria cobranca. O inicio continua dependendo do codigo do cliente.
- O prestador precisa estar ativo e aprovado. Suspensao ou cancelamento/recusa do pedido bloqueia novas consultas ao endereco. Isso nao apaga o que a pessoa ja viu, anotou ou capturou.
- Depois da conclusao, o prestador ainda ativo/aprovado pode consultar o local daquele pedido. O cliente ativo conserva acesso ao seu proprio historico, inclusive em cancelados.
- A Central so pode consultar pedidos encaminhados a atendimento e recebe endereco apenas depois da autorizacao de aceite. Administrador ativo nao recebe acesso irrestrito a enderecos de todos os clientes por este RPC.
- Remoto / online nao grava nem devolve endereco fisico do atendimento. O bairro permanece como referencia regional para busca/cobertura. O cadastro completo do cliente ainda e exigido pela regra existente do piloto, mesmo em pedidos remotos.
- Enderecos nao entram nos eventos de linha do tempo; historico registra apenas confirmacao/autorizacao e o modo de atendimento.
- Repetir o envio do formulario depois de uma falha usa a mesma chave e retorna o pedido criado anteriormente, sem duplicar. A chave fica na memoria do formulario; fechar/reabrir gera outra tentativa. Confira Minhas solicitacoes se a resposta se perder antes de criar outro formulario.

## Pedidos antigos

A migracao nao copia o endereco atual do perfil para pedidos antigos. Em pedidos abertos ou em execucao sem local, o cliente ve um formulario na conversa e confirma o local correto. Se o orcamento ja foi aceito, a tela avisa que essa confirmacao libera o endereco ao prestador aprovado imediatamente.

Pedido antigo sem local nao pode receber novo aceite nem comecar por codigo ate essa confirmacao. Pedidos ja em execucao nao sao reiniciados ou interrompidos. Conclusoes antigas nao sao preenchidas artificialmente.

O local confirmado nao pode ser substituido por esta tela. Antes do inicio, se houver erro, cancele e crie outro pedido com o local correto. Durante a execucao, procure a Central para orientar a resolucao; este pacote nao da ao administrador um editor de enderecos nem altera unilateralmente o combinado.

## Instalacao

1. Extraia ajura-endereco-pedido dentro de C:\service-express e execute instalar.ps1 na raiz. O instalador valida os arquivos/versoes antes de copiar e cria backup local. Nao executa SQL.
2. Abra supabase/request-location.sql e execute TODO o arquivo no SQL Editor do projeto AJURA. Reexecutar e permitido; nao se alteram pedidos antigos durante a ativacao.
3. Execute npm.cmd test e node --test tests/service-location.test.cjs tests/service-execution.test.cjs tests/messaging.test.cjs tests/request-overview.test.cjs.
4. Teste com cliente e prestador diferentes. Antes do aceite, confira que o prestador nao recebe endereco. Depois do aceite, atualize e confirme a liberacao.
5. Edite o endereco do perfil do cliente e confira que o pedido conserva a copia anterior. Teste um pedido remoto e outro legado sem local.
6. Publique os arquivos da entrega juntos. Depois do SQL, a interface antiga nao consegue enviar novas solicitacoes pelo RPC antigo, cujo acesso foi revogado. Atualize a pagina depois da publicacao. Nao deixe a migracao aplicada com a interface publica antiga indefinidamente.

## Validacao no preparo

50 testes de DOM simulado, incluindo 8 novos de local do atendimento, e os testes gerais passaram. PostgreSQL local PGlite com usuarios/tabelas de teste e os RPCs reais de solicitacao, orcamento, mensagens, historico, codigos e cancelamento validou migracao repetivel, permissoes, endereco protegido antes do aceite, liberacao depois do aceite, legado sem copia automatica, bloqueio de inicio sem local, imutabilidade pela API, remoto sem endereco, idempotencia, rollback de envio invalido, suspensao/cancelamento e historico sem endereco. A validacao local nao substitui a verificacao no Supabase e navegador reais. Nenhuma alteracao foi executada no banco do usuario durante o preparo.

## Recuperacao

Backup em ajura-update-backups/endereco-<data>. Falha de copia restaura arquivos anteriores/remova arquivos novos daquela tentativa. Restaurar arquivos locais nao reverte SQL aplicado nem locais ja registrados no banco. Nao use git add . para incluir instaladores/backups.
