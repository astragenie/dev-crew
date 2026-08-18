# demo-seed — AstraRunner v2 ingest seeder

Version-controlled copy of the demo seeder previously living only in the
untracked `C:\work\mega\v2-loop` scratch repo. Seeds the AstraRunner v2 ingest
endpoint (`POST /api/v2/ingest/loop-events`) with synthetic loop telemetry so the
dashboard / M1–M7 jsonl-mirror cutover can be exercised without a live loop run.

## Contents

- `_webhook-seed/*.jsonl` — static envelope fixtures (auto-dispatch, backlog-state,
  decisions, grades, halt-badges, learnings, slice-events, tool-calls, wave-events).
  Each line is a complete `{kind, emittedAt, payload, ...}` envelope.
- `seed-ingest.ps1` — POST every fixture envelope once (single pass).
- `amplify-seed.ps1` — POST N mutated rounds (offsets sliceId/featId/… + shifts
  timestamps by day-offsets) to synthesize volume/history.

## Usage

```powershell
$env:ASTRARUNNER_API = "http://localhost:5137"
$env:ASTRARUNNER_APP_TOKEN = "<peppered app token>"   # issue via dashboard Settings / admin bootstrap CLI

# single pass
pwsh ./tools/demo-seed/seed-ingest.ps1

# amplified history (default: 3 rounds at id-offset 20/40/60, day-offset -7/-14/-21)
pwsh ./tools/demo-seed/amplify-seed.ps1
```

The app token is bound to (tenant, app) — issue one before seeding.

`$StreamDir` defaults to the sibling `_webhook-seed/` folder; override the param to
point at a different fixture set.
