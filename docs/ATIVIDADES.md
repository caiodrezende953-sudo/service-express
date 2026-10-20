# Profissões, especialidades e serviços

## Instalação
A migração supabase/activity-catalog.sql ainda NÃO foi aplicada remotamente: o Supabase apresentou timeout de conexão. Executar uma vez antes de usar esta interface. Ela sincroniza os pares válidos, preservando os anteriores, e cria tabelas e políticas adicionais. O instalador local não executa SQL.

## Cadastro
Profissão → especialidade/atuação → serviços, com seleção múltipla entre profissões e descrição/preço próprios por serviço. Metadados em activities-data.js, pares persistidos em provider_services compatíveis com pedidos existentes. Medicina e outras áreas recebem serviços explícitos por especialidade; pares legados mantidos. Mapeamentos iniciais precisam de curadoria: não são uma lista oficial ou exaustiva de títulos.

## Busca
Sinônimos sem diferença de acento ou caixa no cadastro e na vitrine: endócrino, gastro, faxineira, dentista etc. O apelido de uma especialidade não deve corresponder a todas as ofertas da profissão. A vitrine mantém apenas ofertas existentes e aprovadas; não cria profissionais.

## Sugestões
O prestador envia profissão, especialidade e serviço ausentes. Sugestões ficam no banco, privadas para o autor ativo e administração. Duplicatas exatas impedidas. Administração acessa por Minha conta → Atividades e habilitações. Aceitar registra a análise, mas não publica nem altera automaticamente o catálogo. Essa inclusão exige atualização revisada da taxonomia e interface. Lista administrativa limitada às últimas 50 sugestões nesta entrega.

## Habilitação
Nas categorias marcadas como regulamentadas, a oferta depende de aprovação do perfil E conferência administrativa por profissão/especialidade. Isso também afeta ofertas antigas dessas categorias: continuam cadastradas, mas deixam de aparecer para terceiros e de receber novos pedidos até a revisão. Pedidos existentes não são cancelados. O servidor bloqueia novos pedidos sem essa revisão, inclusive por chamada direta.

O administrador deve conferir registro/conselho/UF, fonte consultada, data e escopo, e registrar sua decisão. Não há consulta automática a conselhos nem validação jurídica de requisitos. Aprovação de Medicina não libera suas especialidades automaticamente. Revogar atualiza o estado e mantém histórico. Não marcar como aprovado apenas porque o prestador enviou um número.

## Limites de validação
Testes locais verificam separação, sinônimos, preservação de pares e controles SQL em base isolada. Testes de integração no projeto real e validação com contas permanecem pendentes enquanto o banco estiver indisponível. Sem pagamentos nesta entrega.
