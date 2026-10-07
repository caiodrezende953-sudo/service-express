# AJURA — resumo e histórico do pedido

## Dependência e instalação
Requer o pacote ajura-mensagens-central já instalado e messaging-support.sql executado. Não instala banco/autenticação novamente.
Extraia ajura-pedido-resumo dentro de C:\service-express. Execute TODO arquivos/supabase/request-overview.sql no SQL Editor do Supabase. A migração cria eventos, captura registros anteriores e instala triggers. É repetível, não altera estados atuais nem cria cobranças.
No Cursor:
```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-pedido-resumo\instalar.ps1
Start-Process chrome.exe "C:\service-express\index.html"
```
Instalador com verificação de hashes antes de escrever, backup automático e interrupção em arquivos divergentes. Não executa SQL.

## Entrega
Resumo do combinado dentro da conversa: valor, escopo, materiais, data da proposta e aceite registrado. Antes do aceite, explica o que falta sem inventar valor ou atendimento confirmado. Cancelamento/recusa tem precedência na situação exibida; o aceite antigo permanece no histórico.
Registro do orçamento aceito guarda os campos daquela versão. Não é substituído silenciosamente por alteração posterior do registro atual. Proposta aceita continua sem cobrança, contratação ou liberação do endereço.
Histórico, com paginação de 20 eventos, registra solicitação, propostas, aceite/recusa/substituição, anexos, abertura/encerramento de Central e mudanças futuras de estado. Mais recentes primeiro. Não inclui cada mensagem, pois elas permanecem na conversa.
Registros antigos: usa datas existentes. Quando não há data original de cancelamento/recusa, informa estado observado na ativação. Não fabrica histórico perdido nem atribui datas de atendimento inexistentes.
Cancelar/recusar volta a estar disponível no painel compacto. Usa close_service_request existente; somente o participante correspondente de pedido aberto pode agir. Encerrar Central continua sendo uma ação distinta de encerrar pedido.

## Organização
request-overview.js monta resumo, linha do tempo e ações do pedido. request-overview.css isola apresentação. messaging.js só integra o módulo, com fallback de erro sem impedir a conversa.
request_events recebe eventos por triggers no servidor, sem escrita direta por contas de aplicativo. RPC request_overview exige participante ativo ou administrador ativo com atendimento vinculado ao pedido. Histórico não expõe endereço.
Migração breve bloqueia escrita nas tabelas envolvidas durante captura inicial; não requer remover ou recriar pedidos. Novos estados de pagamento/execução serão incluídos em uma migração futura própria, após definir contrato e integração de pagamento.

## Revisão conjunta deste bloco
Use cliente e prestador distintos, ambos ativos e prestador aprovado.
1. Criar pedido e conferir evento Solicitação enviada.
2. Trocar mensagens nas duas sessões e conferir não lidas/leitura.
3. Enviar foto/PDF pelo cliente e abrir pelo prestador.
4. Prestador envia orçamento; cliente aceita. Resumo deve corresponder exatamente a preço, escopo, materiais e data da proposta aceita.
5. Reabrir a conversa e recarregar o site; conferir persistência.
6. Abrir Central; admin responde e encerra com resolução. Ambos veem histórico textual; Central não tem acesso a anexos privados por esse módulo.
7. Em OUTRO pedido de teste, cancelar/recusar. Estado e evento devem ser atualizados; mensagens antigas permanecem.
8. Conta terceira não consulta pedido, histórico nem atendimento. Perfil cliente não acessa área profissional.
9. Em celular, abrir/fechar painel, digitar, abrir resumo/anexos, rolar histórico e trocar páginas.
Os testes anteriores de suspensão e o ciclo completo ainda precisam de validação real. Não excluir pedidos nem usar SQL para simular serviço concluído ou pagamento aprovado.

## Verificação realizada
Sintaxe e 16 testes locais: núcleo, estrutura, DOM simulado existente e módulos de anexos, mensagens e resumo passaram. PostgreSQL local via PGlite: migração repetida, sem eventos duplicados, snapshot do aceite preservado, mudança de estado com histórico, escrita direta bloqueada, terceiros bloqueados e Central restrita a pedidos encaminhados. Não executado no seu Supabase nesta sessão; teste visual e fluxo real estão pendentes.

## Publicação depois da revisão
```powershell
git add index.html messaging.js request-overview.js request-overview.css supabase/request-overview.sql
git add tests/request-overview.test.cjs docs/RESUMO-E-HISTORICO.md .gitignore ajura-update-manifest.json
git commit -m "feat: adicionar resumo do combinado e historico dos pedidos"
git push origin feat/mvp-real-cadastros
```
Se os arquivos do pacote anterior ainda não foram publicados, inclua-os conforme docs/MENSAGENS-E-CENTRAL.md no mesmo commit revisado. Evite git add . para não incluir arquivos locais antigos.
Teste do módulo com dependências do projeto instaladas:
```powershell
node --test tests/request-overview.test.cjs
```
reverter.ps1 -Backup reverte apenas interface, preservando banco e histórico. Cópia de segurança e política de retenção do banco são assuntos operacionais separados.
