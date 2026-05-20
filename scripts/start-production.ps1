$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logsDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$outLog = Join-Path $logsDir "next-start.out.log"
$errLog = Join-Path $logsDir "next-start.err.log"

if (Test-Path $outLog) { Remove-Item -LiteralPath $outLog -Force }
if (Test-Path $errLog) { Remove-Item -LiteralPath $errLog -Force }

$node = "C:\Users\USER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$args = ".\node_modules\next\dist\bin\next start -p 3000 -H 0.0.0.0"

Start-Process -FilePath $node -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog

Write-Host "Production server started on http://localhost:3000"
Write-Host "Logs:"
Write-Host "  $outLog"
Write-Host "  $errLog"
