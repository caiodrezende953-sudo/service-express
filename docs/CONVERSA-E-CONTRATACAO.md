# Conversa e contratação dentro da AJURA

Diretriz do usuário em 21/10/2026: oferecer um fluxo unificado por pedido, inspirado na facilidade de comunicação de aplicativos de entrega, para tornar mais conveniente conversar, negociar, contratar e acompanhar o serviço dentro da AJURA. É um requisito do próximo bloco de usabilidade; este documento não declara recursos futuros como implementados.

## Princípio

O pedido deve ser o centro da experiência. Cliente e prestador precisam encontrar no mesmo lugar o combinado, a conversa e a próxima ação. A comissão precisa ser sustentável e transparente. O valor e quem arca com ela ainda dependem da etapa financeira, que permanece por último.

Não há como garantir que ninguém contratará por fora. Serviços presenciais e recorrentes geram contato direto. A retenção deve vir do benefício de permanecer na plataforma, da conveniência e da confiança, sem tornar a contratação mais difícil por meio de bloqueios artificiais.

## Base existente

Há conversa vinculada ao pedido, rascunhos em memória da página, anexos privados, propostas versionadas, resumo do aceite, local protegido, acompanhamento, códigos de início/conclusão, avaliações e atendimento compartilhado com a Central. A consulta de mensagens não lidas ainda usa atualização periódica; não deve ser apresentada como chat em tempo real. Pagamentos e repasses reais não estão ativos.

## Próximo bloco de usabilidade

1. Abrir a conversa diretamente pelo pedido ou pela oferta e explicar o contexto, sem criar solicitações duplicadas.
2. Reunir identificação do serviço, participantes, situação, data e próximo passo em um cabeçalho enxuto; apresentar o orçamento aceito sem obrigar a percorrer o histórico.
3. Destacar uma ação principal por estado e por papel: informar necessidade, enviar proposta, responder proposta, combinar atendimento, iniciar, acompanhar ou concluir.
4. Tornar inequívoco o destino da mensagem: cliente/prestador ou atendimento compartilhado com a Central. Preservar o rascunho de cada canal e a identidade após falha/retorno.
5. Facilitar fotos do problema e explicação de materiais, local e data, com descrição de formatos, limites e recuperação de envio.
6. Diferenciar mensagem em envio, confirmada e não confirmada. Resposta de rede incerta não pode aparecer como enviada nem gerar duplicata ao repetir.
7. Manter a mensagem digitada e permitir recuperação simples após falha. O rascunho atual em memória não sobrevive necessariamente ao fechamento da página; qualquer persistência futura exige decisão de privacidade e escopo por conta/pedido.
8. Dar visibilidade às novas respostas; avaliar a necessidade de atualização em tempo real com controle de custo, sessão, ciclo de vida e acesso por participante.
9. Manter campo e botão de envio utilizáveis com teclado virtual, textos longos e telas estreitas. Garantir fluxo também por teclado e leitor de tela.
10. Facilitar uma nova contratação do mesmo profissional, com novo pedido e novo aceite; não reutilizar silenciosamente escopo, preço, local ou autorização de um pedido antigo.
11. Dar acesso claro à Central com o contexto do pedido, sem exigir que a pessoa reconte todo o combinado e sem divulgar dados além dos participantes autorizados.
12. Antes da operação financeira, esclarecer total, composição das taxas, destinatários e regras reais de cancelamento/disputa. Não prometer seguro, garantia financeira, reembolso ou retenção/liberação de valores sem capacidade operacional, regras e integração efetivamente disponíveis.

## Critérios de aceitação

- Uma pessoa que nunca usou a AJURA consegue identificar onde falar com a outra parte e o que falta para avançar, sem tutorial externo.
- Cliente e prestador completam um ciclo em celular, incluindo falha de rede, sem perder mensagem nem duplicar pedido/proposta.
- Mudança do combinado exige novo aceite rastreável; conversa livre não altera automaticamente o orçamento.
- Sair da conta ou trocar de participante limpa o conteúdo privado e descarta respostas atrasadas.
- O fluxo diferencia contratação, execução e pagamento; a emissão/validação dos códigos atuais não comprova cobrança ou repasse.
- A validação inclui pessoas reais e aparelhos reais. Passar em testes de DOM ou ter mais funcionalidades não prova que o uso ficou fácil.

## Como avaliar sem inventar resultados

Após definir a coleta e a privacidade, acompanhar a passagem de solicitação para primeira resposta, orçamento, aceite e conclusão; observar atrasos, falhas/duplicações e dificuldades relatadas. Tempo de resposta depende também da disponibilidade do profissional. Não atribuir abandono ao contato externo sem evidência.

Parte desta diretriz foi implementada na entrega 0.9.0: veja docs/CONVERSA-UNIFICADA.md para o escopo exato, testes e pendências. Validação com pessoas e aparelhos reais, atualização contínua das respostas e nova contratação continuam pendentes. Não antecipa pagamentos.

Atualização 0.10.0: consulta incremental periódica e avisos implementados; veja docs/RESPOSTAS-ATUALIZADAS.md. Push, conexão instantânea e nova contratação continuam pendentes, assim como a conferência real do fluxo.
