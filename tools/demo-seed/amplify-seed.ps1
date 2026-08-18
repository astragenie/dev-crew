param(
    [string]$ApiBase = $env:ASTRARUNNER_API,
    [string]$AppToken = $env:ASTRARUNNER_APP_TOKEN,
    [string]$StreamDir = (Join-Path $PSScriptRoot "_webhook-seed"),
    [int[]]$SliceOffsets = @(20, 40, 60),
    [int[]]$DayOffsets = @(-7, -14, -21)
)

# Amplifies the static seed fixtures into N rounds by mutating
# sliceId / featId / waveId / decId / specId with an integer offset and
# shifting timestamps by N days. Direct field mutation (recursion-free)
# for PSCustomObject reliability.

if ([string]::IsNullOrWhiteSpace($ApiBase)) { Write-Error "ASTRARUNNER_API not set"; exit 1 }
if ([string]::IsNullOrWhiteSpace($AppToken)) { Write-Error "ASTRARUNNER_APP_TOKEN not set"; exit 1 }
if ($SliceOffsets.Count -ne $DayOffsets.Count) { Write-Error "SliceOffsets count must equal DayOffsets count"; exit 1 }

$endpoint = "$ApiBase/api/v2/ingest/loop-events"
$streamFull = (Resolve-Path $StreamDir).Path
$headers = @{ Authorization = "Bearer $AppToken"; "Content-Type" = "application/json" }

function Mutate-Line {
    param([string]$line, [int]$offset, [int]$dayOffset)
    if ([string]::IsNullOrWhiteSpace($line)) { return $null }
    # Regex mutate on raw JSON string — bulletproof across nested shapes.
    $s = $line
    $s = [regex]::Replace($s, 'SLICE-DEMO-(\d+)', { param($m) "SLICE-DEMO-{0:D2}" -f ([int]$m.Groups[1].Value + $offset) })
    $s = [regex]::Replace($s, 'FEAT-DEMO-(\d+)', { param($m) "FEAT-DEMO-{0:D3}" -f ([int]$m.Groups[1].Value + $offset) })
    $s = [regex]::Replace($s, 'WAVE-DEMO-(\d+)', { param($m) "WAVE-DEMO-{0:D2}" -f ([int]$m.Groups[1].Value + $offset) })
    $s = [regex]::Replace($s, 'DEC-DEMO-(\d+)', { param($m) "DEC-DEMO-{0:D3}" -f ([int]$m.Groups[1].Value + $offset) })
    $s = [regex]::Replace($s, 'SPEC-DEMO-(\d+)', { param($m) "SPEC-DEMO-{0:D3}" -f ([int]$m.Groups[1].Value + $offset) })
    # Shift ALL ISO-8601 UTC timestamps by $dayOffset days.
    $s = [regex]::Replace($s, '"(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)Z"', {
        param($m)
        try {
            $dt = [DateTimeOffset]::Parse(($m.Groups[1].Value + 'T' + $m.Groups[2].Value + 'Z'))
            $shifted = $dt.AddDays($dayOffset).ToString("yyyy-MM-ddTHH:mm:ssZ")
            "`"$shifted`""
        } catch { $m.Value }
    })
    return $s
}

$totalPosted = 0
$totalFailed = 0

for ($r = 0; $r -lt $SliceOffsets.Count; $r++) {
    $sliceOffset = $SliceOffsets[$r]
    $dayOffset = $DayOffsets[$r]
    Write-Host ""
    Write-Host "=== Round $($r+1)/$($SliceOffsets.Count): id-offset=+$sliceOffset, day-offset=$dayOffset ==="

    Get-ChildItem -Path $streamFull -Filter "*.jsonl" -File | Sort-Object Name | ForEach-Object {
        $file = $_
        $okCount = 0
        $failCount = 0
        foreach ($line in (Get-Content -Path $file.FullName)) {
            $body = Mutate-Line -line $line -offset $sliceOffset -dayOffset $dayOffset
            if ($null -eq $body) { continue }
            try {
                $null = Invoke-RestMethod -Method POST -Uri $endpoint -Headers $headers -Body $body
                $okCount++
                $totalPosted++
            } catch {
                $failCount++
                $totalFailed++
            }
        }
        Write-Host ("  {0,-40} ok={1,-3} fail={2}" -f $file.Name, $okCount, $failCount)
    }
}

Write-Host ""
Write-Host "Done. Envelopes posted: $totalPosted. Failed: $totalFailed across $($SliceOffsets.Count) rounds."
if ($totalFailed -gt 0) { exit 2 }
