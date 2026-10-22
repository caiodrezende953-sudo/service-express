# Pedidos e próximos passos

Atualização de interface, sem SQL ou mudança automática de estado.

O resumo da conversa usa o pedido e a proposta aceita retornados por request_overview. Mostra solicitação, proposta aceita, execução e conclusão. Cancelamento e recusa são encerramentos separados, sem sugerir que o serviço foi concluído. Uma situação desconhecida pede atualização, sem inventar progresso. A Central recebe orientação de consulta administrativa; não recebe instrução para usar o código do cliente.

Listas e painel profissional só conhecem o estado do pedido: em solicitações abertas, orientam conferir a proposta na conversa sem presumir aceite. O orçamento e o código continuam sendo controlados pelo servidor. Valores de propostas não são dinheiro recebido; pagamentos continuam pendentes.

Orçamentos: consulta trata falhas de rede; aceitar/recusar compartilham bloqueio para impedir ações simultâneas na seção. Formulário de envio usa o bloqueio compartilhado e mantém campos em falhas. Não há idempotência de envio de proposta no servidor nesta entrega: se a resposta se perder, a pessoa deve atualizar a conversa para conferir antes de reenviar. Respostas antigas de uma sessão encerrada não restauram o conteúdo da seção.

Validação local: estados/papéis, aceitação/recusa concorrentes, preservação de formulário, testes gerais e regressões do resumo e códigos. Validação no celular, fluxo completo com contas e acesso direto a anexos continuam pendentes. Nenhuma migração ou cobrança foi executada.
