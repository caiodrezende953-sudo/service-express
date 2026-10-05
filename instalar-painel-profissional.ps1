$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$authPath = Join-Path $root 'auth.js'
$requestsPath = Join-Path $root 'requests.js'
$indexPath = Join-Path $root 'index.html'
$auth = [IO.File]::ReadAllText($authPath)
$requests = [IO.File]::ReadAllText($requestsPath)
$html = [IO.File]::ReadAllText($indexPath)
if (!(Test-Path (Join-Path $root 'professional-dashboard.js'))) { throw 'professional-dashboard.js ausente.' }
if (!$auth.Contains('openProvider: providerView')) {
 if (!$auth.Contains('window.AJURA_AUTH = { client, configured };')) { throw 'Exportacao de auth.js diferente da esperada.' }
 $auth = $auth.Replace('window.AJURA_AUTH = { client, configured };', 'window.AJURA_AUTH = { client, configured, openProvider: providerView };')
}
if (!$auth.Contains('ajura:professional')) {
 $marker = '  async function providerView(message = '''') {'
 if (!$auth.Contains($marker)) { throw 'Funcao providerView nao encontrada.' }
 $auth = $auth.Replace($marker, $marker + "`n    document.dispatchEvent(new Event('ajura:professional'));")
}
if (!$requests.Contains('window.AJURA_REQUESTS =')) {
 if (!$requests.Contains(' async function inbox() {')) { throw 'Funcao inbox nao encontrada.' }
 $requests = $requests.Replace(' async function inbox() {', " window.AJURA_REQUESTS = { inbox, conversation };`n async function inbox() {")
}
if (!$html.Contains('src="professional-dashboard.js"')) {
 if (!$html.Contains('</body>')) { throw 'Fechamento body ausente.' }
 $html = $html.Replace('</body>', '<script src="professional-dashboard.js"></script></body>')
}
Copy-Item $authPath "$authPath.pro-dashboard-backup" -Force
Copy-Item $requestsPath "$requestsPath.pro-dashboard-backup" -Force
Copy-Item $indexPath "$indexPath.pro-dashboard-backup" -Force
[IO.File]::WriteAllText($authPath, $auth, $utf8)
[IO.File]::WriteAllText($requestsPath, $requests, $utf8)
[IO.File]::WriteAllText($indexPath, $html, $utf8)
Write-Host 'Painel profissional instalado. Publique e teste no site.'
