# Mirrorbite Worker - secrets bulk inject + deploy (Day 6 morning)
#
# Prereq:
#   - .env.local (project root) filled with GEMINI_API_KEY / ANTHROPIC_API_KEY
#   - wrangler login done (first-time only: npx wrangler login)
#
# Usage:
#   cd C:/workspace/apps/mirrorbite
#   powershell -ExecutionPolicy Bypass -File scripts/setup-worker-secrets.ps1
#
# What it does:
#   1. Parse .env.local for 4 values
#   2. wrangler secret put x 4 in mirrorbite-worker/
#   3. wrangler deploy
#   4. After deploy, prompt user to paste URL into .env.local

param(
    [string]$EnvFile = "$PSScriptRoot/../.env.local",
    [string]$WorkerDir = "$PSScriptRoot/../../mirrorbite-worker"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
    Write-Host ".env.local not found: $EnvFile" -ForegroundColor Red
    Write-Host "Edit .env.local first to fill GEMINI_API_KEY / ANTHROPIC_API_KEY" -ForegroundColor Yellow
    exit 1
}

# Parse .env.local
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$' -and -not $_.StartsWith('#')) {
        $envVars[$matches[1]] = $matches[2].Trim()
    }
}

$required = @('MB_CLIENT_SECRET', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'ALLOWED_ORIGINS')
foreach ($key in $required) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Host ".env.local $key is empty" -ForegroundColor Red
        Write-Host "Fill the value first and re-run" -ForegroundColor Yellow
        exit 1
    }
}

if (-not (Test-Path $WorkerDir)) {
    Write-Host "Worker directory not found: $WorkerDir" -ForegroundColor Red
    exit 1
}

Push-Location $WorkerDir
try {
    Write-Host "==> Injecting 4 Worker secrets" -ForegroundColor Cyan

    foreach ($key in $required) {
        Write-Host "  - $key" -NoNewline
        $envVars[$key] | & npx wrangler secret put $key
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL]" -ForegroundColor Red
            exit 1
        }
        Write-Host "  [OK]" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "==> Deploying Worker" -ForegroundColor Cyan
    & npx wrangler deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "deploy failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==> Deploy succeeded" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Copy the URL above (e.g. https://mirrorbite-vision-proxy.<account>.workers.dev)"
    Write-Host "  2. Paste into .env.local as EXPO_PUBLIC_VISION_API_URL"
    Write-Host "     (append /api/vision at the end)"
    Write-Host "  3. Verify with: curl -I https://<URL>/api/health   (expect 200)"
    Write-Host "  4. Verify auth: curl -X POST without secret header (expect 403)"
}
finally {
    Pop-Location
}
