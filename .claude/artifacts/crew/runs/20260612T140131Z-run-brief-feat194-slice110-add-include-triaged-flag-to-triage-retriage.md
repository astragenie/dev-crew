---
feature: FEAT-194
status: active
---
# Run Brief: FEAT194 SLICE110: Add --include-triaged flag to triage + retriage (FEAT-194)

- Created: 2026-06-12T14:01:31.919Z
- Tier: full
- Goal: -
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/backlog-list-ids.mts`: `listPendingFeatureIds(repo
  - opts?: { includeTriaged?: boolean })`. Default false.
- `src/scripts/loop.mts::runBacklogListPendingIds`: read `--include-triaged` flag.
- FLAG_SPEC adds `"--include-triaged"`.
- `commands/triage.md` + `commands/retriage.md` + `skills/triage/SKILL.md` document the flag.
- Tests: new + appended.
- Out Of Scope:
  - - Renaming the CLI subcommand.
- Selective re-score by id.
- Planned Files: -
- Next Step: Begin implementation

