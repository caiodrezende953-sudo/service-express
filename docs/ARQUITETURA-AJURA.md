# Arquitetura e responsabilidades

## Entrada
index.html carrega bairros/catalogo, motor antigo (app/v2/ui), SDK Supabase e configuração pública, core, auth, anexos/admin, catálogo real, solicitações, orçamentos, conexão MP, painel e acabamento comum.

core.js deve existir antes de módulos reais. workspace.css é carregado depois dos estilos anteriores. workspace.js é o último script.

## Módulos reais
- auth.js: sessão, cadastro, recuperação, perfil do cliente e cadastro profissional. Expõe AJURA_AUTH.client e openProvider.
- real-catalog.js: ofertas aprovadas, filtros locais e paginação de consultas. Expõe AJURA_CATALOG.refresh.
- requests.js: criar solicitação, listar por participante e abrir conversa. Expõe AJURA_REQUESTS.create/inbox/conversation.
- quotes.js: envio/aceite de orçamento e preparação do pagamento de teste.
- professional-dashboard.js: resumo do profissional, propostas e solicitações recebidas. Expõe AJURA_DASHBOARD.open/customer.
- mp-connect.js: consulta de conexão e início de OAuth; não recebe credenciais privadas.
- provider-files.js/admin.js: anexos e revisão. Regras efetivas continuam no Supabase.
- workspace.js: apresentação, acessibilidade e recuperação de falhas de formulário.

## Eventos
ajura:professional abre a apresentação profissional após conferir conta ativa e papel provider/both.
ajura:profile-saved permite retomar a solicitação na mesma página.
ajura:requests-changed atualiza o resumo profissional.

## Dados futuros
Acrescentar dado persistente exige primeiro contrato de campo/estado, migração compatível, RLS/RPC, depois formulário e visualização. Não colocar estado financeiro como livre edição em profiles, localStorage ou parâmetros do botão.

## Limites de crescimento
Catálogo é paginado para carregar até 10.000 registros por consulta/lote; se atingir o limite a interface avisa. Para crescimento além do piloto, buscar/ordenar/paginar ofertas no servidor em vez de baixar toda a vitrine.
