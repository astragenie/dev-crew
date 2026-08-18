# Seed the AstraRunner v2 ingest endpoint with the envelope files stored
# under .claude/artifacts/loop/_webhook-seed/. Every line is a complete
# {kind, emittedAt, payload, ...} envelope POSTed to /api/v2/ingest/loop-events.
#
# Usage:
#   $env:ASTRARUNNER_API = "http://localhost:5137"
#   $env:ASTRARUNNER_APP_TOKEN = "<peppered app token>"
#   pwsh ./scripts/seed-ingest.ps1
#
# The app token is bound (tenant, app) — issue one via the dashboard
# Settings page or the admin bootstrap CLI before running this seed.

param(
    [string]$ApiBase = $env:ASTRARUNNER_API,
    [string]$AppToken = $env:ASTRARUNNER_APP_TOKEN,
    [string]$StreamDir = (Join-Path $PSScriptRoot "_webhook-seed")
)

if ([string]::IsNullOrWhiteSpace($ApiBase)) {
    Write-Error "ASTRARUNNER_API not set (e.g. http://localhost:5137)"
    exit 1
}
if ([string]::IsNullOrWhiteSpace($AppToken)) {
    Write-Error "ASTRARUNNER_APP_TOKEN not set"
    exit 1
}

$endpoint = "$ApiBase/api/v2/ingest/loop-events"
$streamFull = (Resolve-Path $StreamDir).Path
$headers = @{ Authorization = "Bearer $AppToken"; "Content-Type" = "application/json" }

Write-Host "Seeding $endpoint from $streamFull"

$total = 0
$failed = 0
Get-ChildItem -Path $streamFull -Filter "*.jsonl" -File | Sort-Object Name | ForEach-Object {
    $file = $_
    Write-Host ""
    Write-Host "== $($file.Name) =="
    $lineNo = 0
    foreach ($line in (Get-Content -Path $file.FullName)) {
        $lineNo++
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try {
            $null = Invoke-RestMethod -Method POST -Uri $endpoint -Headers $headers -Body $line
            $total++
            Write-Host "  line $lineNo OK"
        } catch {
            $failed++
            Write-Warning "  line $lineNo FAILED: $($_.Exception.Message)"
        }
    }
}

Write-Host ""
Write-Host "Done. Envelopes posted: $total. Failed: $failed."
if ($failed -gt 0) { exit 2 }
