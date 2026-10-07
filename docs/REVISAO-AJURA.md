# Revisão AJURA — 05/10/2026

Base: arquivos publicados no GitHub Pages, consultados em 05/10/2026. Esta entrega altera o frontend. Não altera tabelas, regras RLS, credenciais, pagamentos ou dados locais.

## 10 melhorias de uso implementadas

1. Navegação principal com fluxos reais; pedidos, pagamentos e sugestões demonstrativos deixam de ser atalhos públicos.
2. Busca real com botão de limpar filtros e atualizar ofertas.
3. Ordenação por nome ou menor preço inicial; serviços sob orçamento ficam após preços definidos na ordenação por preço.
4. Bairros oficiais disponíveis mesmo quando ainda não há oferta, com estado vazio explicativo.
5. Bairros atendidos recolhidos em cada cartão, reduzindo excesso de texto.
6. Lista de solicitações com filtros de papel (enviadas/recebidas) e situação.
7. Histórico de solicitações paginado, em grupos de 20, com total e controles anterior/próxima.
8. Data mínima no formulário, bairro do cliente pré-selecionado quando atendido e contadores de caracteres.
9. Painel profissional com propostas aceitas separado de recebimentos; acesso a todas as solicitações.
10. Acessibilidade e uso em celular: link para conteúdo, foco ao abrir/fechar janela, áreas de toque, layout responsivo e aviso de falta de internet.

Complemento: o serviço escolhido fica apenas na memória da página durante login/complementação do perfil. Recarregar a página descarta essa referência. Nenhum endereço ou conversa é colocado no localStorage por esta entrega.

## 10 correções de problemas identificados no código

1. real-catalog.js era carregado pelo HTML e novamente por auth.js: removido o segundo carregamento e adicionada proteção de inicialização.
2. admin.js era carregado pelo HTML e novamente por auth.js: removido o segundo carregamento.
3. providerView recebia evento do clique como mensagem: tipo da mensagem normalizado.
4. Ao falhar a consulta do perfil, o botão Sair aparecia sem handler: handler implementado.
5. Sair fechava a janela mesmo com erro do Supabase: agora a falha é apresentada e a janela permanece.
6. Mercado Pago considerava qualquer registro conectado, inclusive expirado: validade verificada; renovação continua pendente.
7. Solicitações/conversas tinham envios sem recuperação de exceção, podendo travar botões: try/finally e prevenção de envio concorrente.
8. Resposta tardia de consulta podia reabrir uma conversa já fechada ou substituir outra: identificação da consulta vigente e invalidação ao fechar.
9. Ações de orçamento podiam atualizar outra janela depois de navegação: checagem de seção conectada antes de aplicar o resultado.
10. A cobertura era limitada a 1.000 linhas, podendo omitir bairros/profissionais silenciosamente: busca paginada, IDs em lotes e aviso de limite. Consultas de cobertura têm ordenação estável.

Complementos corrigidos: cadastro do cliente conserva valores digitados quando o banco recusa a atualização; data do serviço aparece no formato brasileiro; formulários não enviam mensagens só com espaços; o próprio serviço não mostra botão de contratação; atualização da sessão da mesma conta não força saída do painel; a pesquisa demonstrativa deslocada para fora do catálogo também é escondida.

## 10 melhorias de organização entregues

1. core.js centraliza validação de perfil, datas de Manaus, moeda, escaping e validade de conexão.
2. workspace.css reúne estilos do painel, celular e componentes comuns; remove CSS criado dentro do painel em tempo de execução.
3. index.html concentra o carregamento dos módulos em uma ordem explícita, sem carregamento duplicado por auth.js.
4. APIs pequenas de módulos (AJURA_REQUESTS, AJURA_CATALOG, AJURA_DASHBOARD) separam responsabilidades sem recriar permissões.
5. Eventos de perfil e solicitações conectam telas sem duplicar consultas dentro de cada botão.
6. Versão nos URLs de assets e manifesto com hashes identificam a entrega e ajudam a evitar cache antigo.
7. Instalador verifica todos os arquivos antes de substituir, aceita diferenças LF/CRLF e faz backup da atualização inteira.
8. Procedimento de reversão restaura apenas os arquivos desta atualização; não mexe no Supabase.
9. Arquitetura, dicionário de dados e registro de migrações documentam onde inserir dados futuros e o que já depende do servidor.
10. Verificações reproduzíveis e roteiro manual acompanham o pacote; regras de gitignore separam backups e pacotes do código publicado.

## O que não está concluído

- Ganhos reais: dependem de pagamento confirmado, estorno e repasse reconciliados no servidor. A tela não soma dinheiro de teste nem transforma orçamento em receita.
- Comissão, split, retenção até token final, webhook, renovação/revogação OAuth e conciliação de pagamentos.
- Regras reais de início/conclusão, disputas, cancelamento após pagamento e avaliação ligada à conclusão real.
- Termos e privacidade publicados, registro de consentimento na interface e validação documental suficiente para abrir o piloto ao público.
- Migrações de CPF/CNPJ com validação de dígitos e cobertura/catálogo normalizados no banco. Não aplicar restrições novas sem revisar cadastros existentes.
- Auditoria das políticas efetivas do Supabase: os arquivos do frontend não provam o estado das políticas no projeto.
- Remoção definitiva do motor demonstrativo: ele ainda fornece utilitários ao frontend atual; o histórico local não foi apagado. Esta entrega retira seus fluxos da apresentação pública.

## Priorização seguinte

P0: testar esta atualização nas duas contas e confirmar que não há perda de acesso, solicitações ou orçamento.
P0: validar a compatibilidade de Orders com o split desejado antes de implementar comissão; criar cobrança apenas em ambiente de teste.
P1: finalizar backend de cobrança idempotente, webhook validado, consulta independente de status e renovação OAuth.
P1: definir estados da contratação e cancelamento com tratamento financeiro antes dos códigos de início/conclusão.
P2: catálogo com IDs estáveis, migração dos rótulos existentes e importação administrativa validada.
P2: separar completamente demonstração do app real e migrar para módulos com dependências explícitas.

## Evidência e limites

As verificações executadas nesta entrega são registradas em VALIDACAO.md. Bugs listados foram identificados por leitura dos arquivos; nem todos foram reproduzidos em sessão real. O navegador de teste não pôde ser instalado neste ambiente. Não há afirmação de teste integrado com contas ou banco reais.
