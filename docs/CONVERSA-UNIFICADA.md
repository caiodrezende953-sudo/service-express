# AJURA 0.9.0 — conversa e contratação unificadas

Base: commit 152c39cc49cc1fcd95cf3387790b2a1ccf492600, versão 0.8.0. Esta entrega altera o site e os testes locais. Não altera tabelas, permissões, serviços cadastrados ou estados dos pedidos. Não há SQL para executar.

## O que muda

- Quatro abas na mesma caixa: Conversa, Orçamento, Detalhes e Ajuda. As abas e o resumo do combinado ficam fora da rolagem das mensagens.
- O orçamento é consultado ao abrir o pedido, em paralelo com os outros módulos. O cliente encontra a proposta e o aceite sem abrir uma nova janela. O prestador encontra o formulário aberto na aba Orçamento.
- A barra superior usa o resumo do servidor: valor e data da proposta aceita, situação e uma ação para acessar orçamento, início, conclusão ou histórico. Sem aceite, não inventa preço combinado. Falha no resumo é exibida como indisponibilidade.
- Em Detalhes ficam escopo inicial, combinado aceito, materiais, histórico, local, reagendamento, cancelamento, códigos e avaliação, respeitando os papéis e módulos existentes.
- Fotos e anexos têm acesso direto a partir da conversa; a consulta dos arquivos continua sob demanda e ocorre uma vez por abertura do pedido.
- Ajuda mantém o atendimento compartilhado com a Central e os participantes. O destino da mensagem aparece junto do campo; a Central administrativa mantém seu modo próprio.
- Trocar de aba preserva os campos e formulários. Fechar/reabrir na mesma página preserva mensagens e orçamento em memória; sair ou trocar de conta limpa os rascunhos. Fechar/recarregar a página pode perder esse conteúdo.
- O envio informa andamento, confirmação pelo servidor ou ausência de confirmação. Não afirma que o destinatário leu. Repetir o mesmo texto conserva a tentativa protegida existente.
- Digitar outra mensagem ou editar outro orçamento durante o envio não apaga a nova edição quando a versão anterior é confirmada.
- Responder e enviar orçamento conferem a sessão antes da operação e descartam respostas antigas. A autorização efetiva continua no servidor.
- O fluxo unificado não oferece o botão legado de preparação de pagamento de teste. Nenhuma cobrança ou repasse é criada.

A proposta aceita continua definida pelo servidor. Conversar ou mudar de aba não aceita proposta, altera escopo nem inicia serviço. Os códigos continuam registrando execução, sem efeito financeiro.

## Instalar e conferir

Extraia ajura-conversa-unificada em C:\service-express. No terminal dessa pasta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-conversa-unificada\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes locais falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Verificação de sintaxe falhou." }
Start-Process chrome.exe "C:\service-express\index.html"
```

A instalação confere os hashes antes de escrever, preserva arquivos fora da entrega e cria backup. Se houver edição diferente da base, interrompe em vez de sobrescrever. Não rode os instaladores antigos depois desta entrega.

## Evidência e limites

- 156 testes locais aprovados, incluindo 13 novos cenários de integração do fluxo unificado.
- Sintaxe dos 33 scripts do aplicativo aprovada; CSS novo analisado por parser.
- Testes locais usam DOM simulado e respostas controladas. Não provam entrega de e-mail, pagamentos, tempo real, qualidade visual em aparelho nem autorização real no banco.
- O roteiro automatizado de navegador foi atualizado para as novas abas, mas não foi executado nesta entrega. Sua dependência Playwright e navegador são validações separadas.
- A consulta periódica do contador de não lidas permanece. O histórico aberto atualiza ao reabrir, ao enviar com sucesso ou pelo botão Atualizar. Atualização contínua da conversa, notificações push e contratação recorrente continuam pendentes.
- A consulta de propostas mantém o limite existente de 50 versões mais recentes; o resumo aceito vem do RPC independente. Paginação integral das versões e atualização sem reconstruir o painel ficam para outra entrega.

## Conferência manual obrigatória para encerrar o bloco

Use duas contas diferentes, cliente e prestador aprovado; não é permitido contratar a si mesmo.

1. Abra uma solicitação existente sem proposta. O prestador encontra Enviar orçamento e envia escopo, materiais, data e valor.
2. Atualize no cliente. Revisar proposta abre Orçamento; o aceite autorizado atualiza o resumo sem nova solicitação.
3. Confira valor/data e acesse o início em Detalhes. Verifique que preço, materiais e descrição aparecem sem precisar ler mensagens antigas.
4. Escreva uma mensagem, passe por Orçamento e Ajuda e volte. O rascunho deve continuar no canal certo. O campo fica oculto em Orçamento/Detalhes para evitar enviar ao destino errado.
5. Simule falta de rede após abrir o pedido. O texto deve ser preservado e o envio não pode aparecer como confirmado. Ao repetir, confira a ausência de duplicação no histórico real.
6. Envie e digite outra mensagem enquanto aguarda. O novo rascunho deve sobreviver à confirmação anterior.
7. Abra Ajuda e confira que cliente, prestador e Central podem acompanhar o atendimento autorizado. Um cliente não recebe ações administrativas.
8. Saia com uma consulta pendente. O painel deve fechar e a próxima conta não deve receber dados da anterior.
9. No celular, confira 360/390 px, teclado virtual aberto, texto longo e orientação horizontal. Por teclado, use Tab, setas nas abas, Home/End e Escape. Valide com leitor de tela.
10. Observe uma pessoa usando sem instrução. Se não encontrar proposta, destinatário ou próximo passo, registre a dificuldade para correção; os testes locais não substituem essa observação.

## Versionar após conferir

Na branch feat/mvp-real-cadastros, prepare somente manifest.json.publish_paths do pacote, confira git diff --cached --stat e faça commit/push. Não use git add . para incluir instaladores e arquivos antigos sem revisão. O push para a branch não garante publicação no GitHub Pages.

## Reverter

Use reverter.ps1 -Raiz C:\service-express -Backup CAMINHO_DO_BACKUP exibido pela instalação. A reversão confere edições posteriores antes de restaurar. Não há alteração de banco para desfazer.

## Próximas entregas

Conferência em duas contas e aparelhos, indicação de novas respostas dentro do pedido e simplificação adicional conforme uso observado. Pagamentos vêm após os blocos atuais. PDF de conclusão, envio/acesso por e-mail e busca de pedidos ficam após validar pagamentos, conforme decisão do usuário. Não prometer garantia financeira, seguro ou reembolso antes de definir e implementar essas operações.
