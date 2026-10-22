# Interface e organização visual — AJURA 0.6.0

Base: commit `0858fc8a590441e91a50db8e6072c4b311318dfc`, branch `feat/mvp-real-cadastros`. Este pacote implementa os 15 itens visuais do roteiro. **A revisão visual final em Chrome e celular permanece pendente.**

Não exige SQL. Não modifica banco, credenciais, regras de acesso, estados de pedido, cobrança, comissão ou repasse. Pagamentos permanecem por último. Os dados e a precisão das médias são preservados. O catálogo demonstrativo continua identificado como exemplo.

## Alterações

| ID | Área | Alteração |
|---|---|---|
| G01 | Marca e rodapé | Proporções menores para símbolo, nome e slogan; rodapé acompanha a largura disponível. |
| G02 | Paleta AJURA | Laranja e roxo aplicados à vitrine, filtros, formulários, painel e chat por tokens comuns. |
| G03 | Leitura e contraste | Texto escuro no botão laranja; pares declarados de texto/fundo verificados em 4,5:1 ou mais. |
| G04 | Filtros alinhados | Busca principal visível, filtros avançados recolhidos e grade adaptável; opções ativas podem ser removidas uma a uma. |
| G05 | Hierarquia de texto | Escala comum de títulos, descrições, rótulos, observações e valores. |
| G06 | Espaçamentos e ações | Campos com texto de 16 px, ações principais de pelo menos 44 px e espaçamento consistente. |
| G07 | Ofertas organizadas | Identificação, reputação, descrição, detalhes, preço e botão em seções previsíveis; ações ao pé do cartão. |
| G08 | Rotina profissional primeiro | Atendimentos e próximos passos precedem indicadores e resumo financeiro; cálculos financeiros preservados. |
| G09 | Cadastro por seções | Edição do cliente separa contato e endereço; grupos de campos recebem bordas, legendas e espaçamento comuns. |
| G10 | Diálogos | Título acessível atualizado, botão de fechar fora da rolagem e largura maior para listas extensas; preservação do foco de origem. |
| G11 | Mensagens distintas | Mensagens próprias, recebidas e da Central têm apresentação diferente, além de identificação por texto. |
| G12 | Campo de mensagem próximo | Composição fora da área rolável do histórico; destinos visíveis e rascunhos separados para conversa e Central. |
| G13 | Telas estreitas | Cartões, filtros, informações do perfil e painel se empilham por largura; chat acompanha a altura útil informada pelo navegador. |
| G14 | Estados e reputação | Indicadores com texto e cor para situação do cadastro e pedidos; média real e precisão dos filtros mantidas. |
| G15 | Carregamento e falhas | Vitrine diferencia carregamento, ausência de ofertas, ausência de correspondências e falha com nova tentativa. |

## Instalação e validação

Extraia a pasta `ajura-interface-visual` do ZIP dentro de `C:\service-express`. O instalador confere o conteúdo esperado antes de escrever, aceita diferenças de CRLF/BOM, cria backup dos arquivos alterados e interrompe se houver uma edição desconhecida. Não inclui nem modifica o instalador profissional que já estava editado localmente.

```powershell
cd C:\service-express
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-interface-visual\instalar.ps1 -SomenteConferir
if ($LASTEXITCODE -ne 0) { throw "Conferência interrompida." }
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-interface-visual\instalar.ps1
if ($LASTEXITCODE -ne 0) { throw "Instalação interrompida." }
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw "Dependências não instaladas." }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Testes falharam." }
npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Sintaxe inválida." }
Start-Process chrome.exe "C:\service-express\index.html"
```

Recarregue com Ctrl+F5. Abra também `ajura-interface-visual/PREVIA.html`: é uma ilustração isolada, com dados sintéticos, sem login e sem gravação, para comparar a apresentação de cliente, prestador e conversa. Ela não substitui o aplicativo nem a validação com contas reais.

## Conferência antes de publicar

- Em 390, 768 e 1280 px: confira ausência de corte lateral, textos longos, botões, teclado virtual e cinco estrelas na mesma linha.
- Como cliente: abra e recolha filtros, remova opções ativas, confira nenhuma oferta/nenhuma correspondência/erro de conexão e abra uma solicitação.
- Como prestador: confirme atendimentos antes dos resultados financeiros, botão de gerenciar cadastro e retorno à área do cliente. Cliente sem papel profissional continua sem acesso.
- Abra um formulário longo: título e fechar devem permanecer disponíveis; Tab, Shift+Tab e Escape devem funcionar; confira o retorno ao botão de origem.
- No chat: confira conversa e Central, destinatário indicado, rascunho de cada canal, envio e resposta; role o histórico com teclado aberto. Os participantes continuam acompanhando o atendimento compartilhado.
- Saia da conta e confira que informações privadas desaparecem. Recarregue e confirme os dados reais preservados.

## Evidência e limites

119 testes locais passam, incluindo DOM simulado, sintaxe de CSS e oito pares declarados de contraste. A sintaxe dos scripts e a suíte PostgreSQL isolada são verificadas separadamente. Esses testes não medem posicionamento calculado, leitor de tela, toque nem teclado virtual real.

A abertura local para revisão visual foi bloqueada pela política do navegador desta sessão. Não houve conferência visual real nem teste no Windows PowerShell 5.1. O instalador e a reversão foram exercitados em PowerShell 7.4.13 no Linux; a confirmação final no ambiente Windows continua necessária.

A camada `visual.css` é carregada por último e mantém compatibilidade com os estilos anteriores. A consolidação dos estilos legados e a otimização de consultas ficam para o bloco de desempenho. Não há promessa de melhoria de tempo de carregamento neste bloco.

## Publicar na mesma branch

Depois da conferência local:

```powershell
cd C:\service-express
if ((git branch --show-current).Trim() -ne "feat/mvp-real-cadastros") { throw "Confira a branch antes de publicar." }
$arquivosAjura = (Get-Content .\ajura-interface-visual\manifest.json -Raw | ConvertFrom-Json).files.path
foreach ($arquivoAjura in $arquivosAjura) {
  git add -- $arquivoAjura
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível preparar $arquivoAjura" }
}
git diff --cached --stat
git commit -m "feat: organizar interface visual da AJURA"
if ($LASTEXITCODE -ne 0) { throw "Commit interrompido." }
git push origin feat/mvp-real-cadastros
if ($LASTEXITCODE -ne 0) { throw "Push interrompido." }
git status --short --branch
```

Enviar à branch não garante atualizar o GitHub Pages: depende da configuração de publicação existente. Este pacote não altera essa configuração nem publica automaticamente.

## Reverter

Use o caminho de backup exibido pelo instalador:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ajura-interface-visual\reverter.ps1 -Backup "C:\service-express\ajura-update-backups\CAMINHO-EXIBIDO"
```

A reversão recusa substituir arquivos editados depois da instalação. Após reverter, execute `npm.cmd ci` e recarregue com Ctrl+F5. Nenhuma reversão de banco é necessária.
