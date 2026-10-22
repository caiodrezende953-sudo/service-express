# AJURA 0.10.0 — novas respostas sem interromper a conversa

Base: commit 9aeead211952271653aecfffdf7394c2f784c424, versão 0.9.0. A consulta incremental foi aplicada no Supabase em 22/10/2026, migração 20261022144804_messaging_incremental_updates. Não execute SQL manualmente. O instalador atualiza somente arquivos locais.

## Experiência

A conversa aberta busca mensagens novas e acrescenta os itens ao histórico existente. Campo, foco, seleção de texto, orçamento em edição e aba escolhida não são reconstruídos pela atualização automática. O envio confirmado também atualiza o histórico sem remontar o compositor.

- Quando a pessoa está no final da conversa visível, acompanha as mensagens novas no final.
- Se estiver lendo mensagens antigas ou em outra seção, a rolagem é preservada e surge Ver mensagens ou Ver respostas da Central. O aviso também é anunciado pelo leitor de tela.
- Ao voltar de Orçamento ou Detalhes, a posição de leitura anterior da aba é preservada. O botão Ver mensagens leva explicitamente ao final.
- As mensagens do atendimento não são marcadas como lidas enquanto somente a conversa normal está aberta. O modo administrativo não grava leitura em nome dos participantes.
- Mudança de proposta, situação ou atendimento mostra Atualizar pedido. O sistema preserva os campos e bloqueia ações antigas dos módulos até conferir o contexto. Não aceita orçamento nem altera o combinado automaticamente. Se o pedido encerrar, o formulário antigo de conversa perde a ação de envio; o rascunho permanece.
- O destino entre conversa e Central continua explícito. Não há indicador de digitação, push, som nem envio de e-mail nesta entrega.

## Atualização e consumo

É consulta periódica, não conexão instantânea por WebSocket. Há uma consulta de atualização por vez:

- Aproximadamente 5 segundos com a conversa ou Ajuda em uso; 15 segundos nas outras seções.
- Depois de 12 consultas sem novas mensagens, a espera passa a 30 segundos. Trocar de seção ou receber/enviar mensagens retoma a frequência curta.
- Lotes pendentes continuam em cerca de 1 segundo por página, até alcançar o final.
- Falhas esperam 20, 40, 80 e até 120 segundos; a recuperação conserva o cursor confirmado.
- A atualização para ao fechar o painel, voltar à lista, ocultar a página, perder a rede ou sair/trocar de conta. Respostas atrasadas são descartadas.
- No cliente Supabase com suporte a AbortSignal, cada consulta incremental tem abortamento solicitado após 15 segundos. Em um cliente sem essa capacidade, uma requisição pendente não é sobreposta por outra.

No caso ativo contínuo, 5 segundos equivalem a até cerca de 720 consultas de atualização por hora/painel, além do contador global e dos recibos necessários. A pausa e a frequência adaptativa reduzem esse trabalho. Esta entrega não contrata plano pago, mas não garante capacidade ou custo zero para qualquer número de usuários. Medir uso real antes de ampliar a operação; avaliar Realtime quando o piloto justificar.

Só são buscadas mensagens após os cursores recebidos: até 50 de cada canal por consulta, com IDs bigint como texto. O contexto completo, anexos e orçamentos não são consultados novamente a cada ciclo. Uma assinatura pequena avisa alterações do estado.

## Proteção e limites

A nova função pública é SECURITY INVOKER, sem execução por anon/PUBLIC. A implementação privilegiada fica no esquema interno, com search_path vazio e verificação explícita de conta ativa e participação; a Central precisa ser administradora ativa e ter atendimento vinculado ao pedido. Os cursores são validados e pertencem ao pedido consultado.

A consulta não grava leitura, mensagem, proposta ou pedido. O recibo é uma operação separada, somente para o canal visível no final da rolagem. Confirmação de envio pelo servidor não significa que o destinatário leu.

A ordenação incremental usa IDs dos fluxos oficiais de envio, que serializam escritas pelo pedido/atendimento. Inserções manuais fora desses fluxos com IDs anteriores ao cursor não são uma operação suportada pelo atualizador.

A abertura inicial mantém o limite existente de 200 mensagens por canal. A sessão pode acrescentar novas respostas até 1.000 itens por canal; ao atingir o limite, pede atualização explícita em vez de remover o trecho que a pessoa lê. Histórico completo paginado e reações a edição/exclusão de mensagens não fazem parte desta entrega. Rascunhos ficam em memória e podem ser perdidos ao recarregar/fechar a página.

O resumo e os módulos de execução mudam somente quando a pessoa confirma Atualizar pedido ou usa uma ação local já existente. Isso evita substituir campos preenchidos, arquivos selecionados ou códigos exibidos durante uma atualização remota.

## Validação

- 171 testes locais aprovados, incluindo 12 cenários do atualizador e 3 de integração com a caixa unificada.
- 29 testes SQL em PostgreSQL isolado, incluindo 6 cenários novos: paginação dos dois canais, acesso, cursores, assinatura de estado, ausência de escrita/leitura privada e precisão bigint.
- Sintaxe dos 34 scripts aprovada. O CSS é verificado pela suíte existente.
- Supabase real: migração registrada, índice presente, wrapper invoker, função interna com search_path vazio, execução anônima negada e pedido inexistente negado a usuário ativo.
- Contagens antes/depois: 2 perfis, zero pedidos, mensagens, mensagens da Central e orçamentos. Não foram criados dados de teste na base real.
- Como a base real não tinha pedidos, a troca entre duas contas continua pendente. Testes simulados não substituem essa conferência nem o teste visual em Chrome/celular/Windows PowerShell 5.1.

Os avisos de segurança preexistentes permaneceram: 19 tabelas com RLS sem políticas, 55 funções públicas privilegiadas executáveis por authenticated e proteção contra senhas vazadas desativada. O advisor não acrescentou achado para messaging_updates. Isso não certifica que toda a base está livre de pendências. Referências para a revisão existente: [funções e privilégios](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Instalação local

Extraia ajura-respostas-atualizadas em C:\service-express e execute o instalar.ps1 do pacote. Ele confere os arquivos da versão-base antes de escrever, cria backup, interrompe em conflito e permite reversão protegida. Não reinstale pacotes antigos depois deste.

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-respostas-atualizadas\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes locais falharam." }
npm.cmd run test:sql
if ($LASTEXITCODE -ne 0) { throw "Testes SQL falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Verificação de sintaxe falhou." }
Start-Process chrome.exe "C:\service-express\index.html"
```

Recarregue com Ctrl+F5. Antes de versionar, use somente publish_paths de manifest.json; preserve os arquivos antigos fora da entrega. Push para a branch não comprova publicação no GitHub Pages.

## Teste manual com duas contas

1. Use perfis diferentes para cliente e prestador aprovado. Crie um pedido e abra a conversa nos dois navegadores/dispositivos.
2. Envie uma mensagem de cada lado. A outra conta deve recebê-la sem clicar em Atualizar; aguarde o intervalo periódico.
3. Digite um rascunho e mantenha o orçamento em elaboração enquanto a outra conta envia. Confira o texto, o foco e a seleção de campos.
4. Role para uma mensagem antiga e receba outra. A tela não deve saltar; Ver mensagens deve levar ao final.
5. Abra Ajuda e confira o destino. Uma mensagem da Central recebida enquanto você está na conversa normal deve permanecer não lida até abrir o atendimento e chegar ao final.
6. Envie uma nova proposta pela outra conta. O aviso deve pedir para conferir o pedido sem aceitar nem substituir os campos atuais.
7. Fique offline e volte à rede. Confira preservação de rascunho, recuperação, ausência de mensagens duplicadas e de consultas sobrepostas no painel Network.
8. Oculte a aba e feche o painel: não devem continuar consultas incrementais. Ao trocar de conta, nenhum dado da anterior pode reaparecer.
9. Confira celular com teclado aberto, mensagens longas, teclado físico e leitor de tela. Observe também a ergonomia dos avisos quando o espaço fica reduzido.

## Reversão e próximas entregas

Use reverter.ps1 com o caminho do backup exibido para restaurar os arquivos locais. A função e o índice aditivos podem permanecer no banco; não remova objetos SQL para reverter a interface.

Conferência do piloto, refinamentos de acesso e recuperação continuam no roteiro. Pagamentos ficam após os blocos atuais. Comprovante PDF, envio/acesso por e-mail e busca de pedidos permanecem após a validação financeira.
