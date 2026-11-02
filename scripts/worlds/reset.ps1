param(
    [string]$DataDir = 'data'
)

$ErrorActionPreference = 'Stop'
$resolvedDataDir = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $DataDir))
$workspace = [System.IO.Path]::GetFullPath((Get-Location).Path)
if (-not $resolvedDataDir.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'DataDir must be inside the RvR workspace.'
}

$paths = @(
    (Join-Path $resolvedDataDir 'world.sqlite'),
    (Join-Path $resolvedDataDir 'world.sqlite-shm'),
    (Join-Path $resolvedDataDir 'world.sqlite-wal')
)
$existing = $paths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
if (-not $existing) {
    Write-Host 'The active RvR world is already empty.'
    exit 0
}

foreach ($path in $existing) {
    Remove-Item -LiteralPath $path -Force
}
Write-Host 'Deleted the active RvR world recording. The next server start will generate a clean world.'
