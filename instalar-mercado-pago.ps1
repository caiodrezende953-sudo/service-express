$ErrorActionPreference = 'Stop'
$ajuraRoot = $PSScriptRoot
$ajuraIndex = Join-Path $ajuraRoot 'index.html'
$ajuraModule = Join-Path $ajuraRoot 'mp-connect.js'
if (!(Test-Path $ajuraIndex) -or !(Test-Path $ajuraModule)) { throw 'Coloque este instalador e mp-connect.js na pasta do projeto, junto de index.html.' }
$ajuraHtml = [IO.File]::ReadAllText($ajuraIndex)
if ($ajuraHtml -notmatch '<script[^>]+src=["'']mp-connect\.js(?:\?[^"'']*)?["'']') {
  if ($ajuraHtml -notmatch '</body>') { throw 'Nao foi encontrado </body> em index.html.' }
  Copy-Item $ajuraIndex ($ajuraIndex + '.mp-backup')
  $ajuraHtml = $ajuraHtml -replace '</body>', "<script src=`"mp-connect.js`"></script>`r`n</body>"
  [IO.File]::WriteAllText($ajuraIndex, $ajuraHtml, (New-Object Text.UTF8Encoding($false)))
}
Write-Host 'Botao instalado. Abra o site por HTTPS para testar a autorizacao.'
