# Mirrorbite EAS Secrets bulk inject (Day 6 afternoon)
#
# Prereq:
#   - .env.local fully filled (Worker URL + RC API key + MB_CLIENT_SECRET)
#   - npx eas login done
#   - npx eas init done (projectId in app.json)
#
# Usage:
#   cd C:/workspace/apps/mirrorbite
#   powershell -ExecutionPolicy Bypass -File scripts/setup-eas-secrets.ps1
#
# What it does:
#   Parse .env.local and run eas secret:create for 3 keys (project scope)

param(
    [string]$EnvFile = "$PSScriptRoot/../.env.local"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
    Write-Host ".env.local not found: $EnvFile" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$' -and -not $_.StartsWith('#')) {
        $envVars[$matches[1]] = $matches[2].Trim()
    }
}

$secrets = @(
    @{ Name = 'EXPO_PUBLIC_VISION_API_URL';   Source = 'EXPO_PUBLIC_VISION_API_URL' },
    @{ Name = 'EXPO_PUBLIC_MB_CLIENT_SECRET'; Source = 'MB_CLIENT_SECRET' },
    @{ Name = 'EXPO_PUBLIC_RC_API_KEY_IOS';   Source = 'EXPO_PUBLIC_RC_API_KEY_IOS' }
)

foreach ($s in $secrets) {
    $val = $envVars[$s.Source]
    if ([string]::IsNullOrWhiteSpace($val)) {
        Write-Host ".env.local $($s.Source) is empty" -ForegroundColor Red
        Write-Host "  Confirm Worker deployed (URL filled) and RC API key obtained" -ForegroundColor Yellow
        exit 1
    }
}

Push-Location "$PSScriptRoot/.."
try {
    Write-Host "==> Injecting 3 EAS Secrets" -ForegroundColor Cyan

    foreach ($s in $secrets) {
        $val = $envVars[$s.Source]
        Write-Host "  - $($s.Name)" -NoNewline
        & npx eas secret:create --scope project --name $s.Name --value $val --type string --force
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL]" -ForegroundColor Red
            exit 1
        }
        Write-Host "  [OK]" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "==> All EAS Secrets injected" -ForegroundColor Green

    Write-Host ""
    Write-Host "==> Listing current secrets (npx eas secret:list)"
    & npx eas secret:list

    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. npx eas build --profile preview --platform ios  (Day 6 test build)"
    Write-Host "  2. Verify in Simulator or TestFlight"
    Write-Host "  3. Day 7 morning: fill APPLE_TEAM_ID in .env.local + eas.json"
    Write-Host "  4. npx eas build --profile production --platform ios"
}
finally {
    Pop-Location
}
