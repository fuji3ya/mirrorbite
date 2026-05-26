# Mirrorbite Legal Site - Cloudflare Pages deploy (Day 6 evening)
#
# Prereq:
#   - wrangler login done
#
# Usage:
#   cd C:/workspace/apps/mirrorbite
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-legal.ps1

param(
    [string]$LegalDir = "$PSScriptRoot/../legal"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $LegalDir)) {
    Write-Host "Legal directory not found: $LegalDir" -ForegroundColor Red
    exit 1
}

Push-Location $LegalDir
try {
    Write-Host "==> Deploying to Cloudflare Pages" -ForegroundColor Cyan

    # Pre-flight: sweep placeholder strings
    $stale = Select-String -Path *.html -Pattern "TODO|FIXME|lorem|example\.com|placeholder" -CaseSensitive:$false -SimpleMatch:$false
    if ($stale) {
        Write-Host "Placeholder strings still present:" -ForegroundColor Red
        $stale | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber):$($_.Line)" }
        Write-Host "Aborting deploy" -ForegroundColor Red
        exit 1
    }

    & npx wrangler pages deploy . `
        --project-name=mirrorbite-legal `
        --branch=main `
        --commit-dirty=true
    if ($LASTEXITCODE -ne 0) {
        Write-Host "deploy failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "==> Deploy succeeded" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Cloudflare dashboard -> Pages -> mirrorbite-legal -> Custom domains"
    Write-Host "  2. Add Custom Domain: starving-effort.com"
    Write-Host "  3. _redirects handles /mirrorbite/* path mapping automatically"
    Write-Host ""
    Write-Host "Verify (all should return 200):"
    Write-Host "  curl -I https://starving-effort.com/mirrorbite/privacy"
    Write-Host "  curl -I https://starving-effort.com/mirrorbite/terms"
    Write-Host "  curl -I https://starving-effort.com/mirrorbite/support"
    Write-Host "  curl -I https://starving-effort.com/mirrorbite/"
}
finally {
    Pop-Location
}
