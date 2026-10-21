# Primeiro bloco — bugs e proteção de dados

Base: `feat/mvp-real-cadastros`, commit `f1744bdf116ebfc92c52efb294663d7b3490cfd5`. Data: 21/10/2026, Manaus. Esta entrega inicia o roteiro aprovado; não conclui as 45 melhorias.

## Comportamentos corrigidos

1. Troca direta de conta limpa mensagens, formulários privados, contagens e rascunhos da conta anterior. Respostas antigas são descartadas.
2. Voltar à lista, atualizar e fechar o chat preservam rascunhos na mesma conta e na mesma sessão da página. Recarregar a página descarta o texto privado.
3. Mensagens normais e à Central usam chave de tentativa e recibo do servidor. Repetir uma tentativa não cria outra mensagem.
4. Solicitações mantêm uma chave de repetição por conteúdo; mudanças, na mesma tela, em envio ainda não confirmado exigem conferir o pedido primeiro.
5. Cadastro profissional salva nome, apresentação, identificação e bairros em uma transação. Uma falha desfaz tudo.
6. Salvar um cadastro inalterado mantém a aprovação; dados alterados continuam exigindo a análise prevista nas regras existentes. Cadastros suspensos não são reativados.
7. Cadastro modificado em outra tela exige recarregar, evitando substituir silenciosamente uma versão nova.
8. Lote de serviços é atômico. Uma oferta por prestador/categoria/subserviço evita duplicatas; mudanças de escopo/preço usam a edição existente.
9. Aprovação regulamentada fica ligada ao serviço exato, com decisão, fonte e data. Aprovações genéricas antigas não são ampliadas automaticamente.
10. Administração escolhe prestador pelo nome, serviço cadastrado e decisão explícita, com confirmação da evidência. Histórico mostra as últimas 20 decisões.
11. Reagendamento depende do cliente, preserva o valor, escopo, materiais e endereço. Aceitar cria outra versão da proposta e invalida códigos antigos; começar ou encerrar o pedido encerra reagendamentos pendentes.
12. Falha ao gerar outro código mantém o código que estava na tela. Ele pode ter sido invalidado caso a resposta de uma nova emissão se perca; a regra de validade do servidor prevalece.
13. Contagem de mensagens evita consultas simultâneas e ignora retorno de outra conta. Seções desconectadas de orçamento/anexos deixam de se acumular nas referências dos módulos.
14. O rodapé preserva o nome AJURA; apenas a legenda identificada é atualizada.
15. Documentação e manifesto passam a refletir a versão real. Instalador confere todos os arquivos antes de copiar, preserva edições desconhecidas, cria backup e permite reversão local.

## Instalar no Windows

Extraia a pasta `ajura-bugs-protecao` do ZIP dentro de `C:\service-express`, mantendo os demais arquivos.

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-bugs-protecao\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida. Não publique." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes locais falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Sintaxe inválida." }
npm.cmd run test:sql
if ($LASTEXITCODE -ne 0) { throw "Regressões SQL falharam." }
```

Para conferir sem alterar: acrescente `-SomenteConferir` ao comando do instalador. Se houver versão diferente, não force a substituição. Os hashes aceitam CRLF/LF e BOM UTF-8, mas não ignoram edições de conteúdo. Repetir a instalação já concluída não cria outro backup.

Nenhum dado do navegador é apagado. O instalador não acessa o banco, não envia arquivos ao GitHub e preserva os antigos pacotes, o arquivo local `LEIA-ME-arquivos-prestador.txt` e a edição de `instalar-painel-profissional.ps1`.

## Reverter os arquivos locais

Use o caminho de backup informado ao instalar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-bugs-protecao\reverter.ps1 -Backup "C:\service-express\ajura-update-backups\bugs-protecao-DATA"
```

A reversão confere os arquivos antes de restaurar; uma edição posterior impede a substituição. Ela não desfaz SQL nem remove registros do Supabase. As migrações são compatíveis com o frontend anterior; o RPC antigo de habilitação genérica passa a pedir a interface atual para não conceder permissões amplas.

## Revisar e publicar

Primeiro verifique com duas contas diferentes: rascunho ao voltar/fechar, troca de usuário, salvar profissional sem alteração, repetir envio, solicitar uma nova data e aceitá-la como cliente. Confira também em celular real. É necessário um cliente distinto do prestador, pois ninguém pode contratar a si mesmo.

```powershell
git status --short --branch
git diff --stat
$ajuraFiles = (Get-Content .\ajura-bugs-protecao\manifest.json -Raw | ConvertFrom-Json).files.path
git add -- $ajuraFiles
git diff --cached --stat
git commit -m "fix: proteger cadastros conversas e habilitacoes da AJURA"
if ($LASTEXITCODE -ne 0) { throw "Commit interrompido." }
git push origin feat/mvp-real-cadastros
```

Leia o diff antes de publicar, inclusive se já havia outros arquivos preparados no índice do Git. As alterações aparecem no site público somente após o fluxo de publicação do GitHub Pages.

Veja também `VALIDACAO-BUGS-PROTECAO.md` para evidências, limitações e avisos do advisor.

## Limites desta entrega

Não altera pagamento ou comissão; não substitui análise de habilitação no conselho competente; não cria termos jurídicos definitivos. A regra global de aprovação do prestador permanece conservadora. Contagem de mensagens ainda usa intervalo de 60 segundos, sem Realtime. Otimizações maiores, layout completo, composição fixa no chat, modais e catálogo sob demanda ficam para os blocos seguintes.
