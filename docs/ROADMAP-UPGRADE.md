# Roteiro do upgrade — 45 itens

A auditoria original propôs 15 itens de desempenho, 15 de interface e 15 de uso intuitivo. A entrega 0.5.0 cobre o primeiro bloco de bugs e proteção; a 0.6.0 implementa o bloco visual. A conferência visual em Chrome e celular continua pendente. A 0.7.0 traz a primeira entrega de desempenho no navegador. A 0.8.0 acrescenta paginação, filtros, médias e indicadores no banco, com seis índices. Itens parciais não são considerados concluídos. Pagamentos ficam por último.

| ID | Proposta | Situação |
|---|---|---|
| D01 | Carregar o catálogo detalhado quando necessário | Pendente — blocos seguintes |
| D02 | Separar a demonstração do sistema real | Pendente — blocos seguintes |
| D03 | Paginar a vitrine no servidor | Entregue: 12 ofertas por página, filtros e ordenação globais no servidor, totais e desempate por ID; offset limitado, sem snapshot entre páginas |
| D04 | Buscar apenas os campos de cada tela | Parcial: colunas explícitas em pedidos, mensagens e propostas; revisar os demais módulos no bloco de banco |
| D05 | Indexar a pesquisa de profissões | Entregue índice local de textos e posições, consulta compilada e reutilização dos resultados por pesquisa |
| D06 | Encerrar eventos e observadores de telas fechadas | Parcial: buscas adiadas canceláveis; consolidação e desconexão dos observadores legados ainda pendentes |
| D07 | Compartilhar o contexto de sessão e perfil | Parcial: contexto de ações e deduplicação inicial; migração de todos os módulos fica pendente |
| D08 | Abrir conversas sem uma fila de consultas | Entregue no chat: contexto único, seções independentes em paralelo e orçamento/anexos sob demanda |
| D09 | Agrupar a atualização de mensagens não lidas | Entregue: consultas simultâneas compartilham tentativa, pausa fora da página/rede e espera progressiva após falha |
| D10 | Calcular os indicadores do prestador no banco | Entregue: contagens, fases, soma de propostas aceitas e reputação em uma RPC exclusiva do prestador |
| D11 | Indexar os caminhos mais usados | Entregue nos caminhos desta revisão: seis índices para ofertas, bairros, pedidos, propostas e notas; outros índices dependem de medição |
| D12 | Evitar recalcular autenticação por linha na RLS | Entregue para a policy de propostas auditada; novas RPCs conferem a conta uma vez antes da consulta agregada |
| D13 | Carregar o histórico de mensagens por partes | Pendente — blocos seguintes |
| D14 | Publicar scripts e estilos com versão consistente | Parcial: recursos locais com versão uniforme; dependência externa e publicação verificável pendentes |
| D15 | Reduzir o trabalho repetido nos uploads | Entregue: validação e hash reaproveitados para o mesmo objeto File em memória; autorização e recuperação mantidas |
| G01 | Corrigir a marca e o slogan no rodapé | Implementado na 0.6.0; revisão visual final pendente |
| G02 | Unificar a paleta da marca | Implementado na 0.6.0; revisão visual final pendente |
| G03 | Melhorar a leitura dos botões e avisos | Implementado na 0.6.0; revisão visual final pendente |
| G04 | Alinhar a grade dos filtros | Implementado na 0.6.0; revisão visual final pendente |
| G05 | Padronizar a hierarquia de texto | Implementado na 0.6.0; revisão visual final pendente |
| G06 | Uniformizar espaçamentos e tamanhos de ações | Implementado na 0.6.0; revisão visual final pendente |
| G07 | Alinhar informações e ações nas ofertas | Implementado na 0.6.0; revisão visual final pendente |
| G08 | Dar prioridade aos atendimentos no painel | Implementado na 0.6.0; revisão visual final pendente |
| G09 | Agrupar formulários em seções claras | Implementado na 0.6.0; revisão visual final pendente |
| G10 | Organizar título, fechamento e rolagem dos modais | Implementado na 0.6.0; revisão visual final pendente |
| G11 | Distinguir mensagens enviadas, recebidas e da Central | Implementado na 0.6.0; revisão visual final pendente |
| G12 | Manter o campo de mensagem ao alcance | Implementado na 0.6.0; revisão visual final pendente |
| G13 | Empilhar dados de perfil e resumos em telas estreitas | Implementado na 0.6.0; revisão visual final pendente |
| G14 | Padronizar estados, notas e indicadores | Implementado na 0.6.0; revisão visual final pendente |
| G15 | Dar padrão aos estados de carregamento e falha | Implementado na 0.6.0; revisão visual final pendente |
| U01 | Preservar o caminho e o contexto de navegação | Parcial: retorno do foco e posição inicial do modal; navegação completa pendente |
| U02 | Simplificar a busca e os filtros avançados | Parcial: filtros recolhidos e remoção individual; sugestões de pesquisa pendentes |
| U03 | Permitir ao cliente indicar um serviço ausente | Pendente — blocos seguintes |
| U04 | Salvar o cadastro profissional de forma atômica | Entregue neste bloco |
| U05 | Mostrar o caminho de aprovação do prestador | Pendente — blocos seguintes |
| U06 | Permitir repetir envios sem duplicar registros | Entregue para mensagens, ofertas e solicitações; outros fluxos seguem no roteiro |
| U07 | Limpar o chat imediatamente ao trocar de conta | Entregue no chat |
| U08 | Preservar rascunhos ao voltar às conversas | Entregue em memória da página |
| U09 | Explicar anexos, recuperação e espaço disponível | Pendente — blocos seguintes |
| U10 | Avisar novas respostas e manter o canal correto | Pendente — blocos seguintes |
| U11 | Tornar os códigos claros e recuperáveis na tela | Parcial: preservação na falha; falta o contador visual |
| U12 | Permitir reagendamento com novo aceite | Entregue sem integração financeira |
| U13 | Separar profissão e habilitação sem agrupamentos indevidos | Parcial: autorização por serviço corrigida; refino dos nomes de profissão pendente |
| U14 | Analisar atividades e profissionais pelo nome | Entregue por nome e serviço; histórico detalhado paginado fica pendente |
| U15 | Concluir o aceite de termos e privacidade | Pendente — blocos seguintes |

Pendências de base: versionar e documentar toda a configuração externa/Edge Functions, testar restauração completa, consolidar os instaladores legados e validar os fluxos com contas reais e celular. Os testes locais não demonstram que essas verificações já ocorreram.

Diretriz do próximo bloco de usabilidade: docs/CONVERSA-E-CONTRATACAO.md — pedido como centro da conversa e do combinado, benefícios reais para permanecer na plataforma e pagamentos por último.

## Entregas finais após validar pagamentos — decisão de 21/10/2026

- Comprovante de conclusão em PDF disponível no pedido para cliente e prestador, a partir do orçamento aceito e dos eventos confirmados pelo servidor.
- Notificação e envio/acesso ao comprovante por e-mail para as duas partes, com controle de falhas e duplicação; integração de e-mail e limites de custo a definir.
- Busca de pedidos e refinamento da consulta ao histórico. Campos, filtros e permissões serão definidos nesse bloco; cada participante acessa somente os pedidos autorizados.

Essas entregas estão pendentes e ficam depois da confirmação do bloco de pagamentos. Não entram na implementação atual. O documento deve distinguir conclusão do serviço, pagamento e repasse; não incluir códigos secretos nem documentos pessoais completos e não se apresentar como nota fiscal, laudo ou garantia de qualidade.

Entrega 0.9.0: docs/CONVERSA-UNIFICADA.md. Abas por pedido, resumo fixo do aceite, ação contextual, rascunho de orçamento e confirmação de envio implementados; conferência real com duas contas, celular e leitor de tela pendente. Novas respostas na conversa aberta ainda dependem de atualização; notificações/tempo real e nova contratação não foram implementados neste bloco.
