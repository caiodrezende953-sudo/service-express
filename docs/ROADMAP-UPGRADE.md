# Roteiro do upgrade — 45 itens

A auditoria original propôs 15 itens de desempenho, 15 de interface e 15 de uso intuitivo. A entrega 0.5.0 cobre o primeiro bloco de bugs e proteção. Itens parciais não são considerados concluídos. Pagamentos ficam por último.

| ID | Proposta | Situação |
|---|---|---|
| D01 | Carregar o catálogo detalhado quando necessário | Pendente — blocos seguintes |
| D02 | Separar a demonstração do sistema real | Pendente — blocos seguintes |
| D03 | Paginar a vitrine no servidor | Pendente — blocos seguintes |
| D04 | Buscar apenas os campos de cada tela | Pendente — blocos seguintes |
| D05 | Indexar a pesquisa de profissões | Pendente — blocos seguintes |
| D06 | Encerrar eventos e observadores de telas fechadas | Parcial: referências desconectadas de orçamento/anexos removidas; observadores continuam pendentes |
| D07 | Compartilhar o contexto de sessão e perfil | Parcial: contexto de ações e deduplicação inicial; migração de todos os módulos fica pendente |
| D08 | Abrir conversas sem uma fila de consultas | Pendente — blocos seguintes |
| D09 | Agrupar a atualização de mensagens não lidas | Parcial: deduplicação e descarte por conta; espera progressiva pendente |
| D10 | Calcular os indicadores do prestador no banco | Pendente — blocos seguintes |
| D11 | Indexar os caminhos mais usados | Pendente — blocos seguintes |
| D12 | Evitar recalcular autenticação por linha na RLS | Entregue para a policy de propostas identificada na auditoria |
| D13 | Carregar o histórico de mensagens por partes | Pendente — blocos seguintes |
| D14 | Publicar scripts e estilos com versão consistente | Pendente — blocos seguintes |
| D15 | Reduzir o trabalho repetido nos uploads | Pendente — blocos seguintes |
| G01 | Corrigir a marca e o slogan no rodapé | Parcial: nome no rodapé corrigido; revisão global da identidade pendente |
| G02 | Unificar a paleta da marca | Pendente — blocos seguintes |
| G03 | Melhorar a leitura dos botões e avisos | Pendente — blocos seguintes |
| G04 | Alinhar a grade dos filtros | Pendente — blocos seguintes |
| G05 | Padronizar a hierarquia de texto | Pendente — blocos seguintes |
| G06 | Uniformizar espaçamentos e tamanhos de ações | Pendente — blocos seguintes |
| G07 | Alinhar informações e ações nas ofertas | Pendente — blocos seguintes |
| G08 | Dar prioridade aos atendimentos no painel | Pendente — blocos seguintes |
| G09 | Agrupar formulários em seções claras | Pendente — blocos seguintes |
| G10 | Organizar título, fechamento e rolagem dos modais | Pendente — blocos seguintes |
| G11 | Distinguir mensagens enviadas, recebidas e da Central | Pendente — blocos seguintes |
| G12 | Manter o campo de mensagem ao alcance | Pendente — blocos seguintes |
| G13 | Empilhar dados de perfil e resumos em telas estreitas | Pendente — blocos seguintes |
| G14 | Padronizar estados, notas e indicadores | Pendente — blocos seguintes |
| G15 | Dar padrão aos estados de carregamento e falha | Pendente — blocos seguintes |
| U01 | Preservar o caminho e o contexto de navegação | Pendente — blocos seguintes |
| U02 | Simplificar a busca e os filtros avançados | Pendente — blocos seguintes |
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
