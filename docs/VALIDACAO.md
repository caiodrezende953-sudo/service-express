# Validação da revisão

## Executada
- node --check: todos os arquivos JavaScript alterados.
- tests/core.test.cjs: escaping de HTML, datas e timezone, valor ausente, validação de cadastro, expiração, paginação acima de 1.000 registros e propagação de falha de consulta.
- tests/structure.test.cjs: ordem/carga de scripts, módulos únicos e dependências.
- tests/dom.test.cjs em LinkeDOM: troca de área, consulta de propostas, formulário profissional, lista por papel, falha de rede sem perda de texto, filtros, data/bairro, preparação de teste, expiração e saída após erro.
- Integridade do pacote pelo manifesto.

## Não executada
O Chromium de teste não estava disponível. A tentativa de instalação retornou um arquivo de download inválido. tests/browser.test.cjs foi preparado com fixtures, mas não executou. Não há teste de sessão real, RLS ou pagamento real nesta entrega. O PowerShell não está disponível aqui; o instalador foi revisado, mas precisa ser executado no Windows.

## Roteiro manual obrigatório antes de pagamento
1. Publicar, atualizar e entrar nas contas separadas de cliente e prestador.
2. Conferir uma única vitrine e uma única consulta de administração.
3. Buscar por categoria/subserviço/bairro; limpar e atualizar; testar bairro sem oferta.
4. Solicitar sem login, com perfil incompleto e depois completo.
5. Selecionar data futura e confirmar bairro; serviço próprio não deve permitir contratação.
6. Abrir solicitações enviadas/recebidas, alternar situação e páginas.
7. Enviar mensagem vazia; simular rede offline durante envio e confirmar que texto permanece e botão é liberado.
8. Fechar uma janela enquanto carrega e confirmar que ela não reabre sozinha.
9. Prestador enviar proposta; cliente aceitar; preparar pagamento de teste sem cobrança.
10. Abrir painel profissional; conferir proposta aceita separada de recebimento e ver todas as solicitações.
11. Voltar à área do cliente; sair e entrar como outro usuário; nenhum dado da conta anterior deve permanecer no painel.
12. Testar 390px, teclado Tab, Esc, foco e campos; conferir console.

## Reproduzir os testes básicos
Na raiz do projeto: npm install e npm test. Também é possível executar node tests/core.test.cjs sem dependências.
Para o teste de navegador com fixtures: instalar Playwright em um ambiente de desenvolvimento, instalar seu Chromium e executar node tests/browser.test.cjs. Este teste usa dados simulados em memória e não faz cobranças.
