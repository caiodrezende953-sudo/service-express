$indexPath = Join-Path $PSScriptRoot 'index.html'
$content = [System.IO.File]::ReadAllText($indexPath)
foreach ($moduleName in @('provider-files.js', 'admin.js', 'real-catalog.js')) {
    if (-not $content.Contains('src="' + $moduleName + '"')) {
        $content = $content.Replace('</body>', '<script src="' + $moduleName + '"></script></body>')
    }
}
[System.IO.File]::WriteAllText($indexPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Modulos adicionados. Execute provider-files.sql no Supabase.'
