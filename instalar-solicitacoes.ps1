$indexPath = Join-Path $PSScriptRoot 'index.html'
$content = [System.IO.File]::ReadAllText($indexPath)
foreach ($moduleName in @('real-catalog.js', 'requests.js')) {
    if (-not $content.Contains('src="' + $moduleName + '"')) {
        $content = $content.Replace('</body>', '<script src="' + $moduleName + '"></script></body>')
    }
}
[System.IO.File]::WriteAllText($indexPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Solicitacoes instaladas. Execute service-requests.sql no Supabase.'
