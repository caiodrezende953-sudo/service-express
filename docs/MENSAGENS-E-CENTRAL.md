# AJURA — Mensagens e Central

## Instalar
Extraia a pasta ajura-mensagens-central dentro de C:\service-express.
No SQL Editor, execute TODO o conteúdo de arquivos/supabase/messaging-support.sql. Ele inclui a preparação dos anexos privados e pode ser executado novamente. Não altera pedidos existentes nem cria cobrança.
Depois, no Cursor:
```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-mensagens-central\instalar.ps1
Start-Process chrome.exe "C:\service-express\index.html"
```
O instalador aceita a base anterior publicada ou a atualização de anexos, verifica todos os hashes antes de escrever e cria backup. Em caso de divergência, interrompe sem sobrescrever.

## Uso
Botão Mensagens no canto inferior: abre painel compacto, lista conversas por pedido e mostra contador de mensagens não lidas. Clique no pedido para ler/responder; Orçamento e anexos fica numa seção expansível. Atualizar mantém o rascunho da mensagem normal. Rascunhos ficam apenas na memória da página e são apagados ao sair da conta ou fechar o navegador.
Solicitar atendimento da Central: informe o motivo. Existe apenas um atendimento aberto por pedido; clicar novamente retorna o mesmo atendimento. Cliente e prestador continuam conversando e ambos veem o canal da Central. Não é conversa privada entre denunciante e equipe. Não existe transferência para outro prestador.
Na conta administrativa autorizada: botão Central · atendimentos na navegação superior. Abre fila dos atendimentos mais antigos, mostra contexto e as últimas 200 mensagens entre os participantes, permite resposta e exige resolução textual antes de encerrar. O histórico da Central fica preservado. Um novo atendimento pode ser aberto após encerramento. Encerrar atendimento não cancela pedido nem movimenta dinheiro.
A Central recebe histórico textual. Esta entrega não concede ao administrador acesso aos anexos privados dos pedidos nem aos endereços por esse módulo.

## Verificação real pendente
- Cliente e prestador em sessões distintas: solicitar, abrir painel, trocar mensagem, atualizar e conferir persistência.
- Verificar contador de não lidas no outro participante; abrir a conversa e conferir leitura.
- Enviar orçamento e anexos no painel, abrir a foto pela conta prestador.
- Cliente solicita Central; clicar novamente não cria outro atendimento aberto.
- Admin recebe atendimento, responde e registra resolução. Ambos os participantes veem o histórico da Central.
- Conta terceira não lê conversa/ticket e não entra na fila. Conta comum não pode responder como Central nem encerrar atendimento.
- Testar em celular: fechar, rolar e digitar sem ultrapassar largura da tela.

## Escopo e validação
Contador consultado a cada 60 segundos com página visível e também ao abrir/ler; sem WebSocket, push, som ou envio de e-mail. Atualizar conversa é manual; polling não substitui o rascunho. Fila tem paginação de 20 itens. Conversas mostram as 200 mensagens mais recentes.
Testes de sintaxe, núcleo, estrutura e DOM simulado existentes passaram. Testes novos: painel fechado inicialmente, inbox, conteúdo seguro, IDs de leitura, preservação de rascunho em erro e saída da conta. PostgreSQL local via PGlite: migração repetida, inbox por usuário, contador, leitura monotônica, encaminhamento idempotente, terceiros bloqueados, fila administrativa, resposta, resolução e histórico preservado. Storage/contas reais e visual em navegador ainda precisam de validação no seu Supabase. Não foi feito push nesta sessão.
Os testes anteriores de suspensão e ciclo completo de pedido continuam pendentes. A aprovação do CPF confere dígitos, não titularidade. Pagamentos/códigos ainda não implementados.

## Organização para evolução
messaging.js: painel, inbox, contador e integração com pedido; messaging.css: layout isolado.
requests.js: criação e navegação de pedidos; encaminha conversa ao novo painel quando disponível, mantém fallback anterior.
quotes.js: aceita contêiner explícito, funcionando no painel novo e modal anterior.
request-files.js: anexos independentes, acessados por contêiner.
Banco: support_tickets + support_messages guardam atendimento; request_read_receipts guarda posição de leitura por usuário e pedido. Escrever somente por RPC autorizado. Migrações aditivas, nenhuma chave secreta no frontend.
Próximas evoluções possíveis: Realtime, fila com responsável atribuído, notificações, categoria de atendimento e SLA definido pela operação. Estas funções não são apresentadas como já disponíveis.

## Publicar após instalar e testar
```powershell
git add index.html requests.js quotes.js messaging.js messaging.css request-files.js
git add supabase/messaging-support.sql supabase/request-files.sql
git add tests/messaging.test.cjs tests/request-files.test.cjs docs/MENSAGENS-E-CENTRAL.md
git add .gitignore ajura-update-manifest.json
git commit -m "feat: adicionar mensagens compactas e Central de atendimento"
git push origin feat/mvp-real-cadastros
```
Testes adicionais com dependências do projeto instaladas:
```powershell
node --test tests/messaging.test.cjs tests/request-files.test.cjs
```
Reverter interface: reverter.ps1 -Backup apontando para o backup informado pelo instalador. Não remove tabelas, arquivos ou SQL.
