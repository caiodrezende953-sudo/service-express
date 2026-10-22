$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'auth.js'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$text = [IO.File]::ReadAllText($path)
$old = "if (data.account_type !== 'client') `$('#realProviderButton').onclick = providerView;"
$new = @'
if (data.account_type !== 'client') $('#realProviderButton').onclick = () => {
      document.querySelector('#modal')?.close();
      document.dispatchEvent(new Event('ajura:professional'));
    };
'@
if ($text.Contains($old)) {
 Copy-Item $path "$path.open-dashboard-backup" -Force
 $text = $text.Replace($old, $new.Trim())
 [IO.File]::WriteAllText($path, $text, $utf8)
 Write-Host 'Meu perfil profissional agora abre o painel.'
} elseif ($text.Contains($new.Trim())) {
 Write-Host 'A alteracao ja esta instalada.'
} else {
 throw 'Trecho esperado nao encontrado em auth.js. Nenhum arquivo foi alterado.'
}
