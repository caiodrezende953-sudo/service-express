$indexPath = Join-Path $PSScriptRoot 'index.html'
$content = [System.IO.File]::ReadAllText($indexPath)
if (-not $content.Contains('src="quotes.js"')) {
    $content = $content.Replace('</body>', '<script src="quotes.js"></script></body>')
}
[System.IO.File]::WriteAllText($indexPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Orcamentos instalados. Execute request-quotes.sql no Supabase.'
