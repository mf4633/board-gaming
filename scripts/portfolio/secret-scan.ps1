# secret-scan.ps1
# Dedicated secret scan for App Factory hygiene (per review recommendation)
# Scans for potential secrets in source, excludes known guards and non-source.
# Usage: .\secret-scan.ps1 [-Path .] [-ExcludePatterns @('node_modules','target','build')]

param(
    [string]$Path = ".",
    [string[]]$ExcludePatterns = @('node_modules','target','build','.git','__pycache__','dist','android/app/build','gradle'),
    [string[]]$SecretPatterns = @(
        'storePassword\s*=',
        'keyPassword\s*=',
        'ca-app-pub-3940256099942544',  # Google test IDs
        'AIza[0-9A-Za-z\-_]{35}',       # Google API keys (example)
        '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
        'password\s*=\s*["''][^"'']+["'']',
        'secret\s*=\s*["''][^"'']+["'']',
        'token\s*=\s*["''][^"'']+["'']'
    )
)

Write-Host "App Factory Secret Scan (hygiene check)" -ForegroundColor Cyan
Write-Host "Scanning: $Path (excluding: $($ExcludePatterns -join ', '))" -ForegroundColor Gray

$results = @()
$files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $full = $_.FullName
        -not ($ExcludePatterns | ForEach-Object { $full -like "*$_*" } | Where-Object { $_ })
    }

foreach ($pattern in $SecretPatterns) {
    $matches = Select-String -Path $files.FullName -Pattern $pattern -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
        # Skip known good guards
        if ($m.Line -match 'Do NOT embed|placeholder|test ID|HYGIENE NOTE|example|TODO') { continue }
        $results += [PSCustomObject]@{
            File = $m.Path
            Line = $m.LineNumber
            Match = $m.Line.Trim()
            Pattern = $pattern
        }
    }
}

if ($results.Count -eq 0) {
    Write-Host "✅ 0 real leaks found (only guards/prose hit test patterns)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Potential issues found: $($results.Count)" -ForegroundColor Red
    $results | Format-Table -AutoSize
}

# Return count for CI (0 = good)
exit $results.Count
